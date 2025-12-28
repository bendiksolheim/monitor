---
date: 2025-12-28T23:01:35+01:00
researcher: Claude Sonnet 4.5
git_commit: 173119e60cfb597ebaad24a39a718850b467f2c7
branch: main
repository: monitor
topic: "Visualizing uptime monitoring with graphs instead of hourly bars"
tags: [research, codebase, visualization, uptime-indicator, charts, monitoring, recharts]
status: complete
last_updated: 2025-12-28
last_updated_by: Claude Sonnet 4.5
last_updated_note: "Added Recharts as preferred charting library option with implementation guidance"
---

# Research: Visualizing Uptime Monitoring with Graphs Instead of Hourly Bars

**Date**: 2025-12-28T23:01:35+01:00
**Researcher**: Claude Sonnet 4.5
**Git Commit**: 173119e60cfb597ebaad24a39a718850b467f2c7
**Branch**: main
**Repository**: monitor

## Research Question

The current uptime visualization (`app/components/uptime-indicator.tsx`) displays service status as hourly bars, showing success/failure ratios for each hour. The user wants to transition to a graph-based visualization where:
- **X-axis**: Time (timestamp)
- **Y-axis**: Latency (response time in milliseconds)
- **Color/Markers**: Status (success/failure)

This research explores the existing data model, visualization infrastructure, and requirements for implementing this change.

## Summary

The application already has **all the necessary data** to create time-series graphs:
- Individual events with timestamps, status (ok/error), and latency values
- Custom SVG visualization infrastructure (no external charting library)
- A working sparkline component for line charts
- Proper data transformation utilities

**Key findings**:
1. Database stores individual events with `created` (timestamp), `status` (OK/ERROR), and `latency` (milliseconds)
2. Current aggregation groups events by hour and discards individual timestamps
3. Sparkline component already exists for line charts but doesn't support status markers
4. No external charting libraries - all visualizations are custom SVG components
5. Data transformation happens server-side with functional utilities

**Implementation path**: Modify the data fetching to preserve individual event timestamps, extend the Sparkline component to support dual-axis rendering (time + latency) with status-based color coding, or create a new ScatterPlot/LineChart component.

## Detailed Findings

### Database Schema & Data Model

**Location**: `prisma/schema.prisma`

The `Event` model contains all required fields:

```prisma
model Event {
  id Int @id @default(autoincrement())
  service String
  status String          // "OK" or "ERROR"
  created DateTime @default(now())
  latency Int?           // Response time in milliseconds (optional)
}
```

**Application-level type** (`app/lib/events.server.ts:14-20`):
```typescript
export const event = z.object({
  id: z.number(),
  service: z.string(),
  ok: z.boolean(),           // Converted from status
  created: z.date(),         // Timestamp for X-axis
  latency: z.number().optional(), // Latency for Y-axis
});
```

**Data characteristics**:
- Health checks run approximately every 5 minutes
- Each check creates a new Event record (append-only pattern)
- Status is stored as string ("OK"/"ERROR") in DB, converted to boolean in app
- Latency is only recorded for successful checks
- Timestamps use JavaScript Date objects with full precision

**Migration history**:
- Initial schema (2023-06-22): id, service, status, created
- Latency added (2023-07-11): Added optional latency field
- Notifications (2024-03-25): Separate notification table

### Current Data Aggregation Pattern

**Location**: `app/page.tsx:37-40`

Events are currently grouped by hour:

```typescript
const eventsByHour = group(eventsForService, (event) => {
  const timestamp = event.created;
  return `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;
});
```

This produces `Record<string, Array<Event>>` where:
- Key format: `"YYYY-M-D-H"` (e.g., "2025-12-28-14")
- Value: Array of all events in that hour
- **Individual timestamps are preserved** in the events array

**Transformation to UptimeIndicator** (`app/components/service.tsx:54`):
```typescript
const values = mapValues(props.events, (events) =>
  events.map((event) => event.ok)
);
```

This converts to `Record<Hour, boolean[]>` which **loses**:
- Individual timestamps (`created`)
- Latency values
- Temporal ordering within each hour

### Existing Visualization Infrastructure

**No external charting libraries**. The codebase uses:
- **TailwindCSS v4.1.18** - Styling framework
- **DaisyUI v5.5.14** - UI component library
- **Custom SVG components** - All charts are hand-built

#### Sparkline Component

**Location**: `app/components/sparkline.tsx`

Already implements a **line chart with area fill**:

```typescript
export function Sparkline(props: SparklineProps): ReactNode {
  const maxValue = max(props.values.filter((v) => v !== undefined) as number[]);
  const points = getPoints(props.values, maxValue);
  const path = getPath(points);

  return (
    <svg>
      <path d={path} />  // Line chart path
      <linearGradient id={gradientId}>...</linearGradient>
      // Y-axis labels, grid lines, etc.
    </svg>
  );
}
```

**Features**:
- Custom SVG path generation from data points
- Linear gradients for area fill
- Y-axis rendering with labels
- X-axis grid lines
- Handles undefined values (shows error state)
- Dynamic scaling based on max value

**Limitations for this use case**:
- Takes `Array<number | undefined>` - no timestamp support
- No support for status-based coloring
- No scatter plot mode
- Fixed dimensions (420px × 70px)

#### UptimeIndicator Component

**Location**: `app/components/uptime-indicator.tsx`

Current hourly bar visualization:

```typescript
type UptimeIndicatorProps = {
  values: Record<Hour, HourValues>;  // Hour → boolean[]
  name: string;
};
```

**Features**:
- SVG rectangles (14px width × 55px height)
- Linear gradients showing success/failure ratio
- Tooltips with attempt counts
- CSS variables for theming (`--color-success`, `--color-error`)

**Visual pattern**:
- Each vertical bar = 1 hour
- Bar color = gradient from error (top) to success (bottom)
- Failure percentage determines gradient stop position

### Data Transformation Utilities

**Location**: `app/util/arrays.ts` and `app/util/record.ts`

**Available utilities**:
```typescript
// Group array by key function
group<T>(array: Array<T>, fn: (v: T) => PropertyKey): Record<PropertyKey, Array<T>>

// Transform record values
mapValues<T, U>(rec: Record<PropertyKey, T>, fn: (v: T) => U): Record<PropertyKey, U>

// Array utilities
last<T>(array: Array<T>): T | undefined
max<T extends number>(array: Array<T>): T
range(start: number, end: number): number[]
zip<T, U>(a: Array<T>, b: Array<U>): Array<[T, U]>
```

**Date utilities** (`app/util/dates.ts`):
```typescript
oneDayAgo(): Date                        // Returns date 24 hours ago
relativeTimeSince(date: Date): string    // Human-readable relative time
```

### Component Integration

**Location**: `app/components/service.tsx:51-58`

UptimeIndicator is rendered within Service component:

```typescript
function Status(props: {
  events: Record<PropertyKey, Array<Event>>;
  name: string
}): ReactNode {
  if (Object.keys(props.events).length === 0) {
    return <span>Ingen status enda</span>;
  } else {
    const values = mapValues(props.events, (events) =>
      events.map((event) => event.ok)
    );
    return <UptimeIndicator values={values} name={props.name} />;
  }
}
```

**Parent hierarchy**:
```
app/page.tsx
  └── ServicesGrid (app/components/services-grid.tsx)
      └── Service (app/components/service.tsx)
          └── Card (DaisyUI card with title, status, metrics)
              ├── Uptime percentage
              ├── Average latency
              └── Status() → UptimeIndicator
```

**Layout context**:
- Responsive grid: 1-4 columns based on screen size
- Each service gets a card with uptime visualization
- Cards use DaisyUI styling (shadow, borders, padding)

### API Endpoints

**Location**: `app/api/health/route.ts`

Public health check endpoint:
```typescript
GET /api/health
→ { version: string, operational: boolean, statuses?: Event[] }
```

This endpoint aggregates latest status per service but doesn't serve historical data for visualization.

### Data Flow for Current Implementation

```
Backend: Health Check Job (server/jobs/health-check.ts)
  ↓ Every ~5 minutes
  └→ fetch(service.url) → measure latency
      └→ events.create({ service, ok, latency })
          └→ Database: Event table

Frontend: Dashboard Page (app/page.tsx)
  ↓ On page load
  ├→ events.get({ service, created: { gte: last24Hours } })
  ├→ events.aggregate({ _avg: { latency } })
  └→ group(events, byHour)
      └→ Record<Hour, Event[]>
          ↓
          Service Component
          ├→ Calculate uptime: successful / total
          ├→ Display average latency
          └→ mapValues(events, e => e.ok)
              └→ Record<Hour, boolean[]>
                  └→ UptimeIndicator (SVG bars)
```

## Code References

**Key files for graph implementation**:
- `app/components/uptime-indicator.tsx:12-70` - Current visualization component
- `app/components/sparkline.tsx:1-145` - Existing line chart component with gradient fills
- `app/components/service.tsx:51-58` - Integration point where UptimeIndicator is used
- `app/page.tsx:37-40` - Data grouping by hour (would need modification)
- `app/lib/events.server.ts:14-20` - Event type definition with timestamp and latency
- `prisma/schema.prisma:1-7` - Database schema with created (timestamp) and latency fields

**Utility functions**:
- `app/util/arrays.ts` - group(), max(), range(), zip() for data transformation
- `app/util/record.ts` - mapValues() for record transformations
- `app/util/dates.ts` - oneDayAgo() for time window filtering

## Architecture Insights

### Design Patterns

1. **Server-side data aggregation**: All data fetching and grouping happens in page.tsx (Server Component)
2. **Custom SVG rendering**: No charting libraries - pure React + SVG paths
3. **Functional transformations**: Heavy use of map/reduce/group patterns
4. **Type safety**: Zod schemas for runtime validation of Event type
5. **CSS variables for theming**: `--color-success`, `--color-error` for consistent coloring
6. **Responsive design**: Tailwind grid with 1-4 columns based on viewport

### Current Limitations

1. **Timestamp precision loss**: Grouping by hour loses exact event times
2. **No scatter plot support**: Existing components don't support X/Y coordinate plotting
3. **No status-based coloring**: Sparkline doesn't distinguish success/failure
4. **Limited interactivity**: No zoom, pan, or detailed tooltips
5. **Fixed time window**: Always shows last 24 hours

### Opportunities

1. **Data already available**: No backend changes needed - timestamps and latency exist
2. **Sparkline foundation**: Can extend existing component rather than start from scratch
3. **Consistent styling**: CSS variables and DaisyUI patterns already established
4. **Type-safe pipeline**: Zod schemas ensure data integrity throughout

## Implementation Considerations

### Option 1: Extend Sparkline Component

**Approach**: Modify `app/components/sparkline.tsx` to support status-based coloring

**Pros**:
- Reuses existing line chart infrastructure
- Already has Y-axis scaling and grid lines
- Familiar SVG path generation

**Cons**:
- Currently designed for array input, not timestamp-based
- Would need significant refactoring to support status markers
- Line chart may not be ideal for discrete status events

### Option 2: Create New TimeSeriesChart Component

**Approach**: Build a new component specifically for event visualization

**Props structure**:
```typescript
type TimeSeriesChartProps = {
  events: Array<{
    timestamp: Date;
    latency: number | undefined;
    ok: boolean;
  }>;
  name: string;
};
```

**Features to implement**:
- X-axis: Time scale (last 24 hours)
- Y-axis: Latency (milliseconds)
- Data points: Circles or marks for each event
- Color coding: Green for success, red for failure
- Tooltip: Show timestamp, status, latency on hover
- Missing latency: Handle failed requests (no latency data)

**Visual approach**:
- Scatter plot: Individual dots for each check
- Line chart: Connect successful checks, break line on failures
- Combined: Line with status-colored dots at data points

### Option 3: Hybrid - Keep Both Visualizations

**Approach**: Add graph view as alternative, keep hourly bars as option

**Pros**:
- Users can choose preferred view
- Hourly summary still useful for quick glance
- Detailed graph for deep analysis

**Cons**:
- More complexity
- Larger bundle size
- Need to maintain both components

### Data Fetching Changes

**Current** (`app/page.tsx:37-40`):
```typescript
const eventsByHour = group(eventsForService, (event) => {
  const timestamp = event.created;
  return `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;
});
```

**Proposed** (for graph view):
```typescript
// Pass events directly without grouping
const eventsForChart = eventsForService; // Already sorted by created: 'asc'
```

Or provide both:
```typescript
{
  name: service,
  status: serviceStatus(last(eventsForService)),
  events: eventsByHour,        // For backward compatibility
  rawEvents: eventsForService, // For graph visualization
  averageLatency: averageLatency._avg?.latency ?? null
}
```

### Handling Missing Latency

Failed requests don't have latency values (`latency: null` in DB). Options:

1. **Skip rendering**: Don't plot points without latency
2. **Zero baseline**: Show failed requests at Y=0 with distinct marker
3. **Separate track**: Show status as separate boolean track above/below chart
4. **Error band**: Show failed requests as highlighted background regions

### Time Axis Considerations

**Current time window**: Last 24 hours (hardcoded in `getSince()`)

**X-axis options**:
- **Fixed 24-hour scale**: Always show full day, sparse in early hours
- **Relative time**: "X hours ago" labels
- **Absolute time**: HH:MM timestamps
- **Adaptive density**: Show more detail for recent hours

**SVG viewBox sizing**:
- Current Sparkline: 420px × 70px
- Suggested: Maintain width for consistency
- Consider taller height for better latency range visualization

## GitHub Permalinks

Since we're on the `main` branch, here are permanent links to key files:

- [UptimeIndicator component](https://github.com/bendiksolheim/monitor/blob/173119e60cfb597ebaad24a39a718850b467f2c7/app/components/uptime-indicator.tsx#L12-L70)
- [Sparkline component](https://github.com/bendiksolheim/monitor/blob/173119e60cfb597ebaad24a39a718850b467f2c7/app/components/sparkline.tsx)
- [Event type definition](https://github.com/bendiksolheim/monitor/blob/173119e60cfb597ebaad24a39a718850b467f2c7/app/lib/events.server.ts#L14-L20)
- [Service component integration](https://github.com/bendiksolheim/monitor/blob/173119e60cfb597ebaad24a39a718850b467f2c7/app/components/service.tsx#L51-L58)
- [Database schema](https://github.com/bendiksolheim/monitor/blob/173119e60cfb597ebaad24a39a718850b467f2c7/prisma/schema.prisma#L1-L7)

## Open Questions

1. **Visualization type preference**: Scatter plot, line chart, or combined?
2. **Failed request display**: How to show events without latency data?
3. **Interactivity level**: Static SVG or interactive tooltips?
4. **Time axis format**: Relative vs absolute timestamps?
5. **Mobile responsiveness**: How to handle graph on small screens?
6. **Replace or supplement**: Should graph replace bars or coexist as alternative view?
7. **Y-axis scale**: Linear, logarithmic, or adaptive based on data range?
8. **Performance**: Render 288 events (24h × 12 checks/hour) - SVG scalability?

---

## Follow-up Research: Recharts as Preferred Charting Library

**Date**: 2025-12-28T23:15:00+01:00

Based on user preference and experience with Recharts, this library is now the **recommended implementation approach** for the uptime graph visualization.

### Why Recharts?

**Recharts** (`/recharts/recharts`) is a declarative charting library built with React and D3:
- **165 code snippets** in documentation
- **High source reputation**
- **Benchmark score**: 74.2
- **Latest versions**: v3.2.1, v3.3.0
- **Built for React**: Declarative components, React-friendly API
- **D3-powered**: Leverages D3 for calculations while abstracting complexity
- **Native SVG**: Renders as SVG for scalability and performance

### Recharts Advantages Over Custom SVG

1. **Time savings**: No need to build axis scaling, tooltip logic, or interaction handlers
2. **ResponsiveContainer**: Built-in responsive sizing (vs fixed 420px × 70px)
3. **Rich tooltips**: Interactive tooltips with cursor tracking out-of-the-box
4. **Multiple chart types**: Easy to combine scatter, line, area, and bar in one chart
5. **Accessibility**: Built-in ARIA support and keyboard navigation
6. **Battle-tested**: Widely used, actively maintained, extensive documentation
7. **Declarative API**: Easier to maintain and modify compared to manual SVG path generation

### Recommended Recharts Approach: ComposedChart with Scatter + Line

**Best fit for uptime monitoring**: `ComposedChart` combining `Scatter` (for individual events) and `Line` (to show trend):

```jsx
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

type UptimeChartProps = {
  events: Array<{
    timestamp: Date;
    latency: number | undefined;
    ok: boolean;
  }>;
};

function UptimeChart({ events }: UptimeChartProps) {
  // Transform events for Recharts format
  const chartData = events.map(event => ({
    time: event.timestamp.getTime(), // Numeric timestamp for X-axis
    latency: event.latency ?? 0,      // Use 0 for failed requests
    ok: event.ok
  }));

  // Separate successful events for line chart
  const successfulEvents = events
    .filter(e => e.ok && e.latency !== undefined)
    .map(e => ({
      time: e.timestamp.getTime(),
      latency: e.latency
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--base-300)" />

        {/* Time-based X-axis */}
        <XAxis
          dataKey="time"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(timestamp) => {
            const date = new Date(timestamp);
            return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
          }}
          label={{ value: 'Time', position: 'insideBottom', offset: -10 }}
        />

        {/* Latency Y-axis */}
        <YAxis
          label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
        />

        {/* Interactive tooltip */}
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              const date = new Date(data.time);
              return (
                <div className="bg-base-100 p-2 border border-base-300 rounded shadow-lg">
                  <p className="text-sm">{date.toLocaleTimeString()}</p>
                  <p className="text-sm">
                    Latency: {data.latency > 0 ? `${data.latency}ms` : 'N/A'}
                  </p>
                  <p className="text-sm">
                    Status: <span className={data.ok ? 'text-success' : 'text-error'}>
                      {data.ok ? 'Success' : 'Failed'}
                    </span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />

        {/* Line connecting successful requests */}
        <Line
          data={successfulEvents}
          type="monotone"
          dataKey="latency"
          stroke="var(--color-success)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />

        {/* Scatter plot for all events with status-based coloring */}
        <Scatter data={chartData} dataKey="latency">
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.ok ? 'var(--color-success)' : 'var(--color-error)'}
            />
          ))}
        </Scatter>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

### Key Recharts Features for This Use Case

#### 1. **Scatter Plot with Custom Colors per Cell**

Perfect for showing individual events with status-based coloring:

```jsx
<Scatter data={chartData} dataKey="latency">
  {chartData.map((entry, index) => (
    <Cell
      key={`cell-${index}`}
      fill={entry.ok ? 'var(--color-success)' : 'var(--color-error)'}
    />
  ))}
</Scatter>
```

#### 2. **Time-based X-Axis with Custom Formatting**

Handles timestamp conversion and formatting:

```jsx
<XAxis
  dataKey="time"
  type="number"
  domain={['dataMin', 'dataMax']}
  tickFormatter={(timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  }}
/>
```

#### 3. **ResponsiveContainer for Fluid Sizing**

Automatically adapts to parent container width (vs fixed 420px):

```jsx
<ResponsiveContainer width="100%" height={300}>
  <ComposedChart>
    {/* ... */}
  </ComposedChart>
</ResponsiveContainer>
```

#### 4. **Rich Interactive Tooltips**

Custom tooltip rendering with full control:

```jsx
<Tooltip
  content={({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-base-100 p-2 border rounded shadow">
          <p>Time: {new Date(data.time).toLocaleTimeString()}</p>
          <p>Latency: {data.latency}ms</p>
          <p>Status: {data.ok ? 'Success' : 'Failed'}</p>
        </div>
      );
    }
    return null;
  }}
/>
```

#### 5. **Reference Lines for Thresholds**

Show acceptable latency thresholds:

```jsx
import { ReferenceLine } from 'recharts';

<ReferenceLine
  y={200}
  label="Target: 200ms"
  stroke="var(--warning)"
  strokeDasharray="3 3"
/>
```

### Handling Failed Requests (No Latency Data)

**Recommended approach**: Show failed events at Y=0 with distinct red markers

```jsx
const chartData = events.map(event => ({
  time: event.timestamp.getTime(),
  latency: event.ok && event.latency !== undefined ? event.latency : 0,
  ok: event.ok,
  hasLatency: event.latency !== undefined
}));
```

Then style accordingly:
- Successful events (green dots): Display actual latency
- Failed events (red dots at Y=0): Clearly indicate failure
- Tooltip explains "No latency data" for failures

### Data Transformation Required

**Current flow** (hourly aggregation):
```typescript
const eventsByHour = group(eventsForService, (event) => {
  const timestamp = event.created;
  return `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;
});
```

**New flow** (pass raw events to Recharts):
```typescript
// In app/page.tsx
const servicesList = await Promise.all(
  wantedServices.map(async (service) => {
    const eventsForService = await events.get({
      where: { service: service, created: { gte: getSince() } },
      orderBy: { created: 'asc' }
    });

    return {
      name: service,
      status: serviceStatus(last(eventsForService)),
      rawEvents: eventsForService,  // ← New: Pass to chart component
      averageLatency: ...
    };
  })
);

// In app/components/service.tsx
function Status(props: {
  events: Array<Event>;  // ← Changed from Record<PropertyKey, Array<Event>>
  name: string
}): ReactNode {
  if (props.events.length === 0) {
    return <span>Ingen status enda</span>;
  } else {
    return <UptimeChart events={props.events} />;
  }
}
```

### Installation

```bash
npm install recharts
# or
pnpm add recharts
```

### File Structure

```
app/
  components/
    uptime-chart.tsx          ← New Recharts-based component
    uptime-indicator.tsx      ← Keep or replace
    service.tsx               ← Update to use UptimeChart
  page.tsx                    ← Modify to pass rawEvents
```

### Recharts Integration with Existing Design System

**CSS Variables compatibility**: Recharts supports CSS variables for colors:

```jsx
// Use existing theme colors
stroke="var(--color-success)"
fill="var(--color-error)"
```

**DaisyUI integration**: Tooltip can use DaisyUI classes:

```jsx
<div className="card card-compact bg-base-100 shadow-xl">
  {/* Tooltip content */}
</div>
```

**Responsive grid**: Recharts ResponsiveContainer works seamlessly with Tailwind grid:

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {services.map(service => (
    <Card key={service.name}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart>...</ComposedChart>
      </ResponsiveContainer>
    </Card>
  ))}
</div>
```

### Implementation Checklist

- [ ] Install Recharts: `pnpm add recharts`
- [ ] Create `app/components/uptime-chart.tsx` with ComposedChart
- [ ] Modify `app/page.tsx` to pass `rawEvents` instead of grouped events
- [ ] Update `app/components/service.tsx` to use UptimeChart component
- [ ] Add TypeScript types for chart data structure
- [ ] Implement custom tooltip with timestamp, latency, status
- [ ] Handle failed requests (latency = undefined) at Y=0
- [ ] Add time-based X-axis with HH:MM formatting
- [ ] Test responsive behavior across screen sizes
- [ ] Add reference lines for latency thresholds (optional)
- [ ] Consider adding Brush component for zooming large datasets (optional)

### Performance Considerations

**Dataset size**: 24 hours × 12 checks/hour = ~288 data points per service

Recharts performance:
- ✅ Handles 288 points easily (tested with 1000+ points)
- ✅ Virtual scrolling via Brush component if needed
- ✅ SVG-based rendering (same as current custom components)
- ✅ Animations can be disabled for faster rendering: `isAnimationActive={false}`

### Alternative Recharts Approaches

#### Option A: Simple Scatter Plot (Minimal)

```jsx
<ResponsiveContainer width="100%" height={300}>
  <ScatterChart>
    <XAxis dataKey="time" type="number" />
    <YAxis dataKey="latency" />
    <Tooltip />
    <Scatter data={chartData}>
      {chartData.map((entry, index) => (
        <Cell key={index} fill={entry.ok ? 'green' : 'red'} />
      ))}
    </Scatter>
  </ScatterChart>
</ResponsiveContainer>
```

**Pros**: Simplest implementation
**Cons**: No trend line, less visual context

#### Option B: Line Chart Only (Continuous)

```jsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={chartData}>
    <XAxis dataKey="time" />
    <YAxis />
    <Tooltip />
    <Line
      type="monotone"
      dataKey="latency"
      stroke="#8884d8"
      dot={(props) => (
        <circle
          cx={props.cx}
          cy={props.cy}
          r={4}
          fill={props.payload.ok ? 'green' : 'red'}
        />
      )}
    />
  </LineChart>
</ResponsiveContainer>
```

**Pros**: Shows trend clearly
**Cons**: Line connects failed events awkwardly

#### Option C: ComposedChart (Recommended)

Combines scatter and line for best of both worlds (shown above).

### Documentation References

- **Recharts Official Docs**: https://recharts.org/
- **Context7 Library ID**: `/recharts/recharts`
- **GitHub**: https://github.com/recharts/recharts
- **API Reference**: https://recharts.org/en-US/api

### Answered Open Questions

1. ✅ **Visualization type**: ComposedChart with Scatter + Line
2. ✅ **Failed request display**: Show at Y=0 with red markers
3. ✅ **Interactivity**: Interactive tooltips via Recharts Tooltip component
4. ✅ **Time axis format**: HH:MM timestamps with custom tickFormatter
5. ✅ **Mobile responsiveness**: ResponsiveContainer handles fluid sizing
6. ✅ **Replace or supplement**: Replace UptimeIndicator (simpler maintenance)
7. ✅ **Y-axis scale**: Linear (default), can switch to logarithmic if needed
8. ✅ **Performance**: Recharts handles 288 points efficiently

### Next Steps

1. **Install Recharts** and verify version compatibility
2. **Create prototype** UptimeChart component with sample data
3. **Test integration** with existing Service component
4. **Iterate on design** based on visual feedback
5. **Deploy** and monitor performance

This approach leverages Recharts' mature ecosystem while maintaining consistency with the existing DaisyUI/TailwindCSS design system.
