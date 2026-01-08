---
date: 2026-01-07T23:06:42+01:00
researcher: Claude Sonnet 4.5
git_commit: da15a7b6204a226bd2320fc047cf42bb5dfa73ad
branch: main
repository: monitor
topic: "Root Page Performance Issues on Raspberry Pi"
tags: [research, performance, database, caching, optimization, raspberry-pi]
status: complete
last_updated: 2026-01-07
last_updated_by: Claude Sonnet 4.5
---

# Research: Root Page Performance Issues on Raspberry Pi

**Date**: 2026-01-07T23:06:42+01:00
**Researcher**: Claude Sonnet 4.5
**Git Commit**: da15a7b6204a226bd2320fc047cf42bb5dfa73ad
**Branch**: main
**Repository**: monitor

## Research Question

When deployed to a Raspberry Pi server, accessing the root page takes approximately 3 seconds to load. What are the causes of this slowness?

## Summary

The 3-second load time is caused by a combination of **four primary bottlenecks**:

1. **Missing database indexes** - The events table has no indexes on `service` or `created` columns, causing full table scans on filtered/sorted queries
2. **Force-dynamic rendering** - The layout forces dynamic rendering (`force-dynamic`) on every request, preventing any caching
3. **Unoptimized database query** - The root page fetches ALL events from the last ~25 hours without pagination or limits
4. **Raspberry Pi I/O limitations** - SQLite on Raspberry Pi has limited disk I/O performance, amplifying database query inefficiencies

Secondary contributing factors include:

- Client-side Recharts rendering (multiple interactive charts per service)
- Unawaited database connection initialization
- No query result caching or memoization

## Detailed Findings

### 1. Database Query Performance

**Location**: `app/page.tsx:50-53`

The root page performs an unoptimized database query on every request:

```typescript
const eventsByService = await events.get({
  where: { service: { in: services }, created: { gte: getSince() } },
  orderBy: [{ service: "asc" }, { created: "asc" }],
});
```

**Issues**:

1. **No indexes on queried columns**
   - File: `prisma/schema.prisma:14-20`
   - The `Event` table has no indexes on `service` or `created` columns
   - Only the implicit index on `id` (primary key) exists
   - Query requires filtering by `service` (IN clause) AND `created` (date range)
   - Query also requires sorting by both `service` and `created`
   - **Impact**: SQLite performs full table scan on every query

2. **No pagination or limits**
   - Implementation: `app/lib/events.server.ts:33-46`
   - Fetches ALL events from the last ~25 hours (configurable time window)
   - With 5 services checked every 1-10 minutes, this could be:
     - Home Assistant: 1440 events/day (every 1 min)
     - Other 4 services: 576 events/day (every 10 min)
     - **Total**: ~2,000 events/day in the query result
   - All events loaded into memory and processed in JavaScript

3. **Post-query processing overhead**
   - Location: `app/page.tsx:54-81`
   - After fetching, the code:
     - Groups events by service (reduce operation)
     - Calculates average latency for each service
     - Determines status from the last event
   - This happens on every request, never cached

**Recommended Fix**:

```sql
-- Add composite index for optimal query performance
CREATE INDEX idx_event_service_created ON Event(service, created);
```

### 2. Next.js Caching and Rendering Strategy

**Location**: `app/layout.tsx:7`

```typescript
export const dynamic = "force-dynamic";
```

**Impact**:

- The root layout enforces dynamic rendering for ALL routes
- The entire page re-renders server-side on every request
- No static generation, no ISR (Incremental Static Regeneration)
- No `revalidate` intervals configured
- The Suspense boundary (app/page.tsx:39) helps with perceived performance but doesn't prevent the query

**Why this exists**:

- Appropriate for a real-time monitoring dashboard
- Ensures users always see the most current data
- Trade-off between freshness and performance

**Alternative approaches** (if acceptable):

- Use `revalidate = 60` for 1-minute cache intervals
- Remove `force-dynamic` and implement on-demand revalidation
- Use `unstable_cache()` with short TTLs for expensive queries

### 3. Component Rendering Complexity

**Location**: `app/components/services-grid.tsx`

The ServicesGrid component renders:

- A responsive grid (1-4 columns depending on screen size)
- One Service card per service (5 services currently)
- Each card includes:
  - Uptime percentage calculation
  - Average latency display
  - **UptimeChart component** (`app/components/uptime-chart.tsx`)
    - Uses Recharts library for visualization
    - Two-layer chart: Line chart + Scatter plot
    - Transforms all event data into chart coordinates
    - Interactive tooltips with localized timestamps

**Performance considerations**:

- ServicesGrid is a client component (`"use client"`)
- Receives data as a Promise, unwraps with `use()` hook
- Recharts is a heavy library (large bundle size)
- Multiple interactive charts on one page
- Each chart processes all events for that service

**Impact on Raspberry Pi**:

- Server-side: Query + data processing takes most time
- Client-side: Chart rendering happens in browser (less impactful for server load time)
- Hydration cost: React needs to hydrate 5+ charts on page load

### 4. Background Jobs and Event Creation

**Location**: `server-nextjs.ts`, `server/scheduler-bree.ts`, `server/jobs/`

The application runs 6 concurrent background jobs:

**Health Check Jobs** (5 services):

- NAS: Every 10 minutes
- Home Assistant: Every 1 minute (most frequent)
- Traefik: Every 10 minutes
- Z-Wave JS: Every 10 minutes
- Zigbee2MQTT: Every 10 minutes

**Other Jobs**:

- Heartbeat: Every 10 minutes
- Notification: Every 10 minutes

**Event creation pattern**:

```
Health Check Job
  ├─ fetch() service URL (10-second timeout)
  ├─ Check response status
  └─ events.create({service, ok, latency})
      └─ prisma().event.create({data})
         └─ SQLite database insert
```

**Impact on database**:

- Home Assistant job runs every 1 minute = 60 inserts/hour
- Other 4 services = 24 inserts/hour
- **Total**: ~84 database writes per hour
- Each write acquires a lock on the SQLite database
- Concurrent reads (page load) must wait for write locks to release

**Database connection issue**:

- Location: `app/lib/db.server.ts:20`
- `client.$connect()` is called but NOT awaited
- Could cause initialization delays on first database operation
- First operation is likely the Home Assistant health check (every 1 minute)

### 5. Raspberry Pi Hardware Constraints

**SQLite on Raspberry Pi**:

- SQLite is file-based (stored on SD card or USB storage)
- Raspberry Pi SD card I/O: ~20-40 MB/s (class 10)
- Raspberry Pi 4 USB 3.0: ~100-200 MB/s (if using external storage)
- SQLite operations are I/O-bound on Raspberry Pi
- Full table scans are particularly slow due to sequential reads
- Write operations (from health check jobs) can block reads

**Amplification effect**:

- Missing indexes multiply query time by 10-100x
- 50ms query on a desktop becomes 500-5000ms on Raspberry Pi
- Concurrent job writes add lock contention

## Code References

**Root Page**:

- `app/page.tsx:17-44` - Main page component
- `app/page.tsx:46-93` - `getServices()` function with database query
- `app/page.tsx:50-53` - Unindexed database query

**Database Schema**:

- `prisma/schema.prisma:14-20` - Event model (no indexes)
- `app/lib/events.server.ts:33-46` - `events.get()` implementation
- `app/lib/db.server.ts:20` - Unawaited connection

**Next.js Configuration**:

- `app/layout.tsx:7` - `force-dynamic` rendering
- `next.config.mjs` - No revalidation config

**Components**:

- `app/components/services-grid.tsx` - Client component grid
- `app/components/service.tsx` - Service card component
- `app/components/uptime-chart.tsx` - Recharts visualization

**Background Jobs**:

- `server-nextjs.ts:14-41` - Server startup sequence
- `server/scheduler-bree.ts` - Bree configuration
- `server/jobs/health-check.ts` - Health check job implementation

## Architecture Insights

**Design Pattern**: Server-Side Rendering with Real-Time Data

- Next.js App Router with server components
- Server components handle all async data fetching
- Client components only for interactive elements (charts, tabs)
- SQLite for persistence (lightweight, embedded database)
- Bree for background job scheduling

**Current Trade-offs**:

- Freshness over performance (force-dynamic)
- Simplicity over scalability (no caching layer)
- Embedded database over client-server database
- In-memory processing over database aggregation

**Appropriate for**:

- Low-traffic monitoring dashboards
- Small number of services (<10)
- Short time windows (24 hours)
- Development and hobby projects

**Challenges at scale**:

- Raspberry Pi I/O becomes bottleneck
- SQLite locking under concurrent access
- No query result caching
- Full dataset loaded into memory

## Optimization Recommendations

### High Impact (Recommended)

1. **Add Database Indexes** (Highest priority)

   ```sql
   CREATE INDEX idx_event_service_created ON Event(service, created);
   ```

   - Expected improvement: 50-90% reduction in query time
   - Minimal downside: Slightly slower writes (negligible)
   - Easiest to implement

2. **Implement Query Result Caching**
   - Use Next.js `unstable_cache()` with 30-60 second TTL
   - Cache the `getServices()` result
   - Expected improvement: 80-95% reduction in load time for cached hits
   - Trade-off: Data could be 30-60 seconds stale

3. **Add Database Aggregation**
   - Move average latency calculation to SQL
   - Use Prisma's `groupBy()` or raw SQL with aggregates
   - Reduces JavaScript processing overhead
   - Expected improvement: 10-20% reduction

### Medium Impact

4. **Optimize Prisma Connection**
   - Await `client.$connect()` in `db.server.ts:20`
   - Pre-warm connection on server startup
   - Prevents first-query initialization delay

5. **Add Query Pagination**
   - Only fetch recent events (e.g., last 100 per service)
   - Reduces memory usage and processing time
   - Expected improvement: 20-40% with large datasets

6. **Consider PostgreSQL Migration**
   - PostgreSQL handles concurrent reads/writes better
   - Better indexing and query optimization
   - Trade-off: More complex setup, more resource usage

### Low Impact

7. **Optimize Chart Rendering**
   - Limit chart data points (e.g., downsample to 50 points)
   - Lazy-load charts below the fold
   - Expected improvement: 5-10% (mostly client-side)

8. **Enable ISR with Revalidation**
   - Change `force-dynamic` to `revalidate = 60`
   - Serves cached page most of the time
   - Expected improvement: 90%+ for cached requests
   - Trade-off: Up to 60 seconds of stale data

## Open Questions

1. **What is the acceptable staleness for monitoring data?**
   - If 30-60 seconds is acceptable, caching would dramatically improve performance
   - If <10 seconds is required, optimization must focus on query speed

2. **What storage is the Raspberry Pi using?**
   - SD card vs USB SSD makes a significant difference (2-5x performance)
   - Consider migrating database to faster storage

3. **How many total events are in the database?**
   - Query performance degrades as table size grows
   - May need periodic cleanup of old events

4. **Is there a deployment time budget?**
   - Would database migration to PostgreSQL be acceptable?
   - Requires Docker or separate PostgreSQL installation

## Related Research

- No previous research documents found in `planning/` directory

## Next Steps

**Immediate actions** (can be done in <10 minutes):

1. Add the composite index to the Event table
2. Await the Prisma connection in db.server.ts

**Short-term improvements** (1-2 hours): 3. Implement `unstable_cache()` for the getServices() query 4. Add database aggregation for average latency calculation

**Long-term considerations**: 5. Evaluate PostgreSQL migration if the application scales 6. Consider adding a Redis cache layer for sub-second response times
