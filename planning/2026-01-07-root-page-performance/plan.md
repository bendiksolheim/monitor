# Root Page Performance Optimization Implementation Plan

## Overview

This plan addresses the 3-second load time issue on the root monitoring page when deployed to a Raspberry Pi with USB SSD storage. We will implement four high-impact optimizations that target database query performance, connection initialization, query efficiency, and response caching while maintaining the full 24-hour monitoring window and real-time data visualization.

## Current State Analysis

The root page (`/`) currently takes approximately 3 seconds to load on Raspberry Pi due to:

1. **Missing database indexes** - The Event table has no indexes on `service` or `created` columns, causing full table scans
2. **Unawaited database connection** - `client.$connect()` is called but not awaited, potentially causing initialization delays
3. **JavaScript-side aggregation** - Average latency is calculated in JavaScript after fetching all events
4. **No caching** - Every request triggers fresh database queries and recalculation of metrics
5. **Force-dynamic rendering** - The layout forces dynamic rendering on every request

### Key Discoveries:

- Database schema at `prisma/schema.prisma:14-20` has no indexes beyond the implicit `id` primary key
- Query at `app/page.tsx:50-53` fetches ~2,000 events per request (Home Assistant: 1,380/day + 4 services: 138/day each)
- Connection initialization at `app/lib/db.server.ts:20` uses fire-and-forget `client.$connect()`
- Data processing at `app/page.tsx:74-81` calculates averages in JavaScript reduce/map operations
- USB SSD storage provides decent I/O (~100-200 MB/s) but amplifies inefficiencies

## Desired End State

After implementing this plan, the root page should:

1. **Load in <1 second** on Raspberry Pi with warm cache
2. **Load in <1.5 seconds** on cache miss with optimized queries
3. **Maintain full 24-hour monitoring window** with all data points in charts
4. **Serve cached responses** for 30-60 seconds (configurable)
5. **Use database indexes** for all filtered/sorted queries

### Verification:

- Deploy to Raspberry Pi
- Measure page load time with browser DevTools Network tab
- First request (cache miss): <1.5s
- Subsequent requests (cache hit): <1s
- All charts display full 24-hour data

## What We're NOT Doing

To keep this plan focused and avoid over-engineering:

- **NOT migrating to PostgreSQL** - SQLite with proper indexes should be sufficient
- **NOT implementing pagination** - Full dataset is needed for comprehensive monitoring charts
- **NOT removing force-dynamic** - Real-time monitoring requires fresh data; caching provides the optimization
- **NOT downsampling chart data** - Charts need full granularity for accurate monitoring
- **NOT changing the time window** - 24-hour monitoring is a core requirement
- **NOT adding Redis or external caching** - Next.js `unstable_cache()` is sufficient for this use case
- **NOT optimizing client-side rendering** - Server-side query performance is the primary bottleneck

## Implementation Approach

We'll implement optimizations in order of impact and dependency:

1. **Phase 1: Database Indexes** - Foundation for all query performance improvements
2. **Phase 2: Connection Optimization** - Ensures reliable database initialization
3. **Phase 3: Database Aggregation** - Reduces data transfer and JavaScript processing
4. **Phase 4: Query Caching** - Dramatically reduces repeated query execution

Each phase is independently deployable and testable, with clear success criteria for automated verification.

---

## Phase 1: Database Indexes

### Overview

Add a composite index on `(service, created)` to the Event table to eliminate full table scans and optimize the filtered, sorted query used by the root page.

### Changes Required:

#### 1. Create Prisma Migration

**File**: `prisma/schema.prisma`

**Changes**: Add index definition to the Event model

```prisma
model Event {
  id      Int      @id @default(autoincrement())
  service String
  status  String
  created DateTime @default(now())
  latency Int?

  @@index([service, created], name: "idx_event_service_created")
}
```

**Rationale**:

- Composite index `(service, created)` matches the query pattern in `app/page.tsx:50-53`
- Query filters by `service IN (...)` and `created >= getSince()`
- Query orders by `service ASC, created ASC`
- This index covers both the WHERE clause and ORDER BY clause

#### 2. Generate Migration

**Command**:

```bash
prisma migrate dev --name add_event_service_created_index
```

This will:

- Create a new migration file in `prisma/migrations/YYYYMMDDhhmmss_add_event_service_created_index/migration.sql`
- Apply the migration to the development database
- Regenerate the Prisma client

**Expected Migration SQL**:

```sql
-- CreateIndex
CREATE INDEX "idx_event_service_created" ON "Event"("service", "created");
```

#### 3. Production Deployment

The existing deployment process already handles migrations:

```json
// package.json already has:
"migrate": "prisma migrate deploy",
"start": "pnpm run migrate && pnpm run start:server"
```

On deployment, `pnpm run start` will automatically apply the new migration.

### Success Criteria:

#### Automated Verification:

- [x] Migration file created: `ls prisma/migrations/*_add_event_service_created_index/migration.sql`
- [x] Migration applies cleanly in development: `prisma migrate deploy`
- [x] Prisma client regenerates successfully: `prisma generate`
- [x] Index exists in database: `sqlite3 prisma/dev.db "SELECT * FROM sqlite_master WHERE type='index' AND name='idx_event_service_created';"`
- [x] Application starts without errors: `pnpm run dev` (should not crash)

#### Manual Verification:

- [ ] Query performance improved: Use SQLite EXPLAIN QUERY PLAN to verify index usage
- [ ] Root page loads faster on Raspberry Pi (measure before/after with DevTools)
- [ ] No regressions: All existing functionality still works
- [ ] Events are still created and displayed correctly

---

## Phase 2: Prisma Connection Optimization

### Overview

Fix the unawaited `client.$connect()` call to ensure the database connection is properly established before queries execute, preventing potential race conditions and initialization delays.

### Changes Required:

#### 1. Database Connection Module

**File**: `app/lib/db.server.ts`

**Changes**: Make `getClient()` async and await the connection

**Before** (lines 9-23):

```typescript
function getClient(): PrismaClient {
  const { DATABASE_URL } = process.env;

  const client = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

  client.$connect();

  return client;
}
```

**After**:

```typescript
async function getClient(): Promise<PrismaClient> {
  const { DATABASE_URL } = process.env;

  const client = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

  await client.$connect();

  return client;
}
```

#### 2. Update prisma() Function

**File**: `app/lib/db.server.ts`

**Changes**: Make `prisma()` async to support awaited connection

**Before** (lines 25-40):

```typescript
export function prisma(): PrismaClient {
  if (_prisma) {
    return _prisma;
  }

  if (process.env.NODE_ENV === "production") {
    _prisma = getClient();
  } else {
    if (!global.__db__) {
      global.__db__ = getClient();
    }
    _prisma = global.__db__;
  }

  return _prisma;
}
```

**After**:

```typescript
export async function prisma(): Promise<PrismaClient> {
  if (_prisma) {
    return _prisma;
  }

  if (process.env.NODE_ENV === "production") {
    _prisma = await getClient();
  } else {
    if (!global.__db__) {
      global.__db__ = await getClient();
    }
    _prisma = global.__db__;
  }

  return _prisma;
}
```

#### 3. Update All Call Sites

Since `prisma()` is now async, all call sites must await it. However, examining the codebase shows that `prisma()` is only called within async functions that are already awaiting the query results:

**File**: `app/lib/events.server.ts`

**Before** (examples):

```typescript
const create = (ev: NewEvent): Promise<Event> =>
  prisma()
    .event.create({...})

const get = (criteria: ...): Promise<Array<Event>> =>
  prisma()
    .event.findMany(criteria)
```

**After**:

```typescript
const create = async (ev: NewEvent): Promise<Event> => {
  const db = await prisma();
  return db.event
    .create({
      data: {
        service: ev.service,
        status: ev.ok ? "OK" : "ERROR",
        latency: ev.latency ?? null,
      },
    })
    .then((ev: PrismaEvent) => ({
      ...ev,
      ok: ev.status === "OK",
      latency: ev.latency ?? undefined,
    }));
};

const get = async (
  criteria: Parameters<ReturnType<typeof prisma>["event"]["findMany"]>[0],
): Promise<Array<Event>> => {
  const db = await prisma();
  return db.event.findMany(criteria).then((events) =>
    events.map(
      (ev): Event => ({
        ...ev,
        ok: ev.status === "OK",
        latency: ev.latency ?? undefined,
      }),
    ),
  );
};
```

Apply the same pattern to:

- `all()` - line 48
- `remove()` - line 61
- `latestStatus()` - line 65
- `aggregate()` - line 85

**File**: `app/lib/notifications.server.ts`

Update all functions to await `prisma()`:

- `single()` function
- `create()` function

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compilation passes: `pnpm tsc --noEmit`
- [x] Application builds successfully: `pnpm run build`
- [ ] Development server starts: `pnpm run dev`
- [ ] All tests pass: `pnpm test`
- [ ] Background jobs execute without errors: Check logs after starting dev server

#### Manual Verification:

- [ ] Root page loads successfully without connection errors
- [ ] Events are created by background health check jobs
- [ ] No "connection not ready" or similar errors in server logs
- [ ] First page load after server start is reliable (no race conditions)

---

## Phase 3: Database Aggregation

### Overview

Move the average latency calculation from JavaScript to the database layer using Prisma's aggregation capabilities, reducing data transfer and processing overhead.

### Changes Required:

#### 1. Add Aggregation Helper Function

**File**: `app/lib/events.server.ts`

**Changes**: Add a new function to calculate average latency per service using database aggregation

Add this new function after the existing `aggregate` function (around line 89):

```typescript
const averageLatencyByService = async (
  services: string[],
  since: Date,
): Promise<Record<string, number>> => {
  const db = await prisma();

  // Get average latency per service using raw SQL for better performance
  const results = await db.$queryRaw<
    Array<{ service: string; avg_latency: number | null }>
  >`
    SELECT service, AVG(latency) as avg_latency
    FROM Event
    WHERE service IN (${Prisma.join(services)})
      AND created >= ${since}
      AND latency IS NOT NULL
    GROUP BY service
  `;

  // Convert to a dictionary for easy lookup
  return results.reduce(
    (acc, row) => {
      acc[row.service] = row.avg_latency ?? 0;
      return acc;
    },
    {} as Record<string, number>,
  );
};

export default {
  create,
  get,
  all,
  remove,
  latestStatus,
  aggregate,
  averageLatencyByService,
};
```

**Note**: Add `import { Prisma } from "@prisma/client";` at the top of the file.

#### 2. Update getServices() to Use Aggregation

**File**: `app/page.tsx`

**Changes**: Replace JavaScript average calculation with database aggregation

**Before** (lines 46-92):

```typescript
async function getServices(
  status: (typeof statuses)[number],
): Promise<Array<ServiceProps>> {
  const services = getConfig()
    .services.map((service) => service.service)
    .sort();
  const eventsByService = await events.get({
    where: { service: { in: services }, created: { gte: getSince() } },
    orderBy: [{ service: "asc" }, { created: "asc" }],
  });
  const groupedServices = eventsByService.reduce(
    (acc, event) => {
      if (!acc[event.service]) {
        acc[event.service] = {
          name: event.service,
          events: [],
          averageLatency: 0,
          status: "unknown",
        };
      }

      acc[event.service].events.push(event);
      return acc;
    },
    {} as Record<
      string,
      {
        name: string;
        events: Array<Event>;
        averageLatency: number;
        status: ServiceStatus;
      }
    >,
  );

  Object.keys(groupedServices).forEach((service) => {
    const latencies = groupedServices[service].events
      .map((event) => event.latency)
      .filter((l): l is number => l !== null && l !== undefined);
    const averageLatency =
      latencies.reduce((acc, latency) => acc + latency, 0) / latencies.length;
    groupedServices[service].averageLatency = averageLatency;
    groupedServices[service].status = serviceStatus(
      last(groupedServices[service].events),
    );
  });

  return Object.values(groupedServices).filter((service) => {
    switch (status) {
      case "all":
        return true;
      case "failing":
        return service.status === "failing";
      case "unknown":
        return service.status === "unknown";
    }
  });
}
```

**After**:

```typescript
async function getServices(
  status: (typeof statuses)[number],
): Promise<Array<ServiceProps>> {
  const services = getConfig()
    .services.map((service) => service.service)
    .sort();

  const since = getSince();

  // Fetch events and average latencies in parallel
  const [eventsByService, avgLatencies] = await Promise.all([
    events.get({
      where: { service: { in: services }, created: { gte: since } },
      orderBy: [{ service: "asc" }, { created: "asc" }],
    }),
    events.averageLatencyByService(services, since),
  ]);

  const groupedServices = eventsByService.reduce(
    (acc, event) => {
      if (!acc[event.service]) {
        acc[event.service] = {
          name: event.service,
          events: [],
          averageLatency: avgLatencies[event.service] ?? 0,
          status: "unknown",
        };
      }

      acc[event.service].events.push(event);
      return acc;
    },
    {} as Record<
      string,
      {
        name: string;
        events: Array<Event>;
        averageLatency: number;
        status: ServiceStatus;
      }
    >,
  );

  // Only need to determine status (latency already calculated by database)
  Object.keys(groupedServices).forEach((service) => {
    groupedServices[service].status = serviceStatus(
      last(groupedServices[service].events),
    );
  });

  return Object.values(groupedServices).filter((service) => {
    switch (status) {
      case "all":
        return true;
      case "failing":
        return service.status === "failing";
      case "unknown":
        return service.status === "unknown";
    }
  });
}
```

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compilation passes: `pnpm tsc --noEmit`
- [x] Application builds successfully: `pnpm run build`
- [ ] Development server starts: `pnpm run dev`
- [ ] Tests pass: `pnpm test`

#### Manual Verification:

- [ ] Root page displays correct average latency values (compare before/after)
- [ ] Services with no latency data show 0 or handle gracefully
- [ ] Average latency matches previous JavaScript calculation (spot-check a few services)
- [ ] Page load time improves on Raspberry Pi

---

## Phase 4: Query Result Caching

### Overview

Implement Next.js `unstable_cache()` to cache the `getServices()` result for 30-60 seconds, dramatically reducing database load and improving response times for cached requests.

### Changes Required:

#### 1. Create Cached Version of getServices()

**File**: `app/page.tsx`

**Changes**: Wrap the data-fetching logic with `unstable_cache()`

Add import at the top:

```typescript
import { unstable_cache } from "next/cache";
```

Modify the `getServices()` function to use caching:

**Before** (line 46):

```typescript
async function getServices(
  status: (typeof statuses)[number],
): Promise<Array<ServiceProps>> {
  // ... implementation
}
```

**After**:

```typescript
// Cache TTL in seconds (configurable via environment variable)
const CACHE_TTL = parseInt(process.env.SERVICES_CACHE_TTL || "60", 10);

// Cached version of getServicesData
const getCachedServicesData = unstable_cache(
  async () => {
    const services = getConfig()
      .services.map((service) => service.service)
      .sort();

    const since = getSince();

    // Fetch events and average latencies in parallel
    const [eventsByService, avgLatencies] = await Promise.all([
      events.get({
        where: { service: { in: services }, created: { gte: since } },
        orderBy: [{ service: "asc" }, { created: "asc" }],
      }),
      events.averageLatencyByService(services, since),
    ]);

    const groupedServices = eventsByService.reduce(
      (acc, event) => {
        if (!acc[event.service]) {
          acc[event.service] = {
            name: event.service,
            events: [],
            averageLatency: avgLatencies[event.service] ?? 0,
            status: "unknown" as ServiceStatus,
          };
        }

        acc[event.service].events.push(event);
        return acc;
      },
      {} as Record<
        string,
        {
          name: string;
          events: Array<Event>;
          averageLatency: number;
          status: ServiceStatus;
        }
      >,
    );

    // Determine status from last event
    Object.keys(groupedServices).forEach((service) => {
      groupedServices[service].status = serviceStatus(
        last(groupedServices[service].events),
      );
    });

    return Object.values(groupedServices);
  },
  ["services-data"], // Cache key
  {
    revalidate: CACHE_TTL, // Revalidate every 60 seconds (or configured value)
    tags: ["services"], // Cache tag for manual invalidation if needed
  },
);

async function getServices(
  status: (typeof statuses)[number],
): Promise<Array<ServiceProps>> {
  const allServices = await getCachedServicesData();

  // Filter by status (filtering happens after cache to maximize cache hits)
  return allServices.filter((service) => {
    switch (status) {
      case "all":
        return true;
      case "failing":
        return service.status === "failing";
      case "unknown":
        return service.status === "unknown";
    }
  });
}
```

#### 2. Add Environment Variable Configuration

**File**: `.env.example` (create if doesn't exist)

Add documentation for the cache TTL:

```bash
# Cache TTL for services data in seconds (default: 60)
# Lower values provide fresher data but more database load
# Higher values improve performance but data may be stale
SERVICES_CACHE_TTL=60
```

**File**: `README.md` or deployment documentation

Add a note about the caching behavior and how to configure it.

#### 3. Optional: Add Cache Invalidation Endpoint

**File**: `app/api/revalidate/route.ts` (create new file)

For manual cache invalidation if needed:

```typescript
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  // Simple token-based auth (use environment variable for token)
  if (authHeader !== `Bearer ${process.env.REVALIDATE_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    revalidateTag("services");
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ error: "Error revalidating" }, { status: 500 });
  }
}
```

Add to `.env.example`:

```bash
# Secret token for cache revalidation endpoint (optional)
REVALIDATE_TOKEN=your-secret-token-here
```

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compilation passes: `pnpm tsc --noEmit`
- [x] Application builds successfully: `pnpm run build`
- [ ] Development server starts: `pnpm run dev`
- [ ] Tests pass: `pnpm test`
- [x] Environment variable is documented: Check `.env.example` exists

#### Manual Verification:

- [ ] First page load triggers database queries (check server logs or DevTools)
- [ ] Second page load within 60s serves cached response (much faster)
- [ ] After 60s, cache expires and new data is fetched
- [ ] Different status filters (all/failing/unknown) share the same cache
- [ ] Page load time on Raspberry Pi with warm cache is <1 second
- [ ] Page load time on cache miss is <1.5 seconds
- [ ] Data freshness is acceptable (max 60 seconds stale)
- [ ] Optional: Revalidation endpoint works if implemented (`curl -X POST -H "Authorization: Bearer TOKEN" http://localhost:3000/api/revalidate`)

---

## Testing Strategy

### Unit Tests

No new unit tests are required for database indexes, but consider adding tests for:

**File**: `app/lib/events.server.test.ts` (create if doesn't exist)

```typescript
import { describe, it, expect } from "vitest";
import events from "./events.server";

describe("events.averageLatencyByService", () => {
  it("should calculate average latency per service", async () => {
    // Test implementation
  });

  it("should handle services with no latency data", async () => {
    // Test implementation
  });
});
```

### Integration Tests

**File**: `test/integration/root-page.test.ts` (create if doesn't exist)

```typescript
import { describe, it, expect } from "vitest";

describe("Root Page Performance", () => {
  it("should load within acceptable time", async () => {
    const start = Date.now();
    // Fetch root page
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000); // 2 second threshold
  });

  it("should use database indexes for queries", async () => {
    // Use EXPLAIN QUERY PLAN to verify index usage
  });
});
```

### Manual Testing Steps

After deploying each phase to Raspberry Pi:

1. **Clear any existing cache**:

   ```bash
   rm -rf .next/cache
   ```

2. **Restart the application**:

   ```bash
   pnpm run start
   ```

3. **Measure page load time (cache miss)**:
   - Open browser DevTools (Network tab)
   - Navigate to root page
   - Record "DOMContentLoaded" and "Load" times
   - Target: <1.5 seconds

4. **Measure page load time (cache hit)**:
   - Refresh the page within 60 seconds
   - Record times again
   - Target: <1 second (Phase 4 only)

5. **Verify data accuracy**:
   - Spot-check average latency values against raw events
   - Verify service statuses are correct
   - Ensure all charts display properly

6. **Monitor resource usage**:

   ```bash
   # Check CPU and memory usage during page load
   htop
   ```

7. **Check database query performance**:
   ```bash
   # Enable SQLite query logging if needed
   sqlite3 prisma/prod.db ".timer on"
   # Then run a sample query manually
   ```

## Performance Considerations

### Expected Performance Improvements

Based on the research findings and optimizations:

| Scenario              | Current | After Phase 1 | After Phase 4 | Improvement |
| --------------------- | ------- | ------------- | ------------- | ----------- |
| Cache miss (cold)     | 3000ms  | ~1500ms       | ~1200ms       | 60% faster  |
| Cache hit (warm)      | N/A     | N/A           | ~800ms        | 73% faster  |
| Database query        | ~2000ms | ~400ms        | ~400ms        | 80% faster  |
| JavaScript processing | ~500ms  | ~300ms        | ~300ms        | 40% faster  |

### Database Index Size

The composite index will add minimal storage overhead:

- Each index entry: ~20 bytes (service string + timestamp + pointer)
- With 5-10k events: ~100-200 KB total
- Negligible impact on USB SSD

### Cache Memory Usage

The cached services data will consume:

- ~2,000 events × ~100 bytes = ~200 KB per cache entry
- Single cache entry (revalidated every 60s)
- Minimal memory impact

### Monitoring

After deployment, monitor:

1. **Page load time trends**:
   - Use browser DevTools to track over time
   - Set up monitoring if desired (e.g., Sentry, custom logging)

2. **Cache hit rate**:
   - Add logging to track cache hits vs misses
   - Adjust `SERVICES_CACHE_TTL` if needed

3. **Database query performance**:
   - Monitor query execution time in logs
   - Consider adding Prisma query logging in production if needed

## Migration Notes

### Backwards Compatibility

All phases maintain full backwards compatibility:

- Database schema changes are additive (indexes only)
- No data migration required
- API contracts unchanged
- UI behavior unchanged

### Rollback Plan

If issues arise after deployment:

1. **Phase 1 (Indexes)**:
   - Rollback: `DROP INDEX idx_event_service_created;`
   - Safe to remove indexes without data loss

2. **Phase 2 (Connection)**:
   - Rollback: Revert `app/lib/db.server.ts` and `app/lib/events.server.ts`
   - Redeploy previous version

3. **Phase 3 (Aggregation)**:
   - Rollback: Revert `app/page.tsx` and `app/lib/events.server.ts`
   - JavaScript calculation still works

4. **Phase 4 (Caching)**:
   - Rollback: Revert `app/page.tsx`
   - Remove `unstable_cache()` wrapper
   - Or set `SERVICES_CACHE_TTL=0` to effectively disable caching

### Deployment Sequence

For zero-downtime deployment:

1. Deploy Phase 1 (indexes) first
2. Wait for migration to complete
3. Deploy Phases 2-4 together (code changes only)
4. Monitor logs and performance
5. Adjust `SERVICES_CACHE_TTL` if needed based on data freshness requirements

## References

- Related research: `planning/2026-01-07-root-page-performance/research.md`
- Database schema: `prisma/schema.prisma:14-20`
- Root page implementation: `app/page.tsx:46-93`
- Events service: `app/lib/events.server.ts:33-46`
- Database connection: `app/lib/db.server.ts:20`
- Next.js caching docs: https://nextjs.org/docs/app/api-reference/functions/unstable_cache
- Prisma indexing docs: https://www.prisma.io/docs/concepts/components/prisma-schema/indexes
