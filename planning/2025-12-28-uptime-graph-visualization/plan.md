# Uptime Graph Visualization Implementation Plan

## Overview

Replace the current hourly bar visualization (`UptimeIndicator`) with a Recharts-based time-series graph that displays latency over time with status-based color coding. The new visualization will show individual monitoring events as scatter points (green for success, red for failure) connected by a trend line, providing better insight into service performance and temporal patterns.

## Current State Analysis

**Data Model** (`prisma/schema.prisma`):
- Database already stores individual events with `created` (timestamp), `status` (OK/ERROR), and `latency` (milliseconds)
- No schema changes required - all necessary data exists

**Current Implementation** (`app/components/uptime-indicator.tsx:12-70`):
- Displays hourly bars with gradient fills showing success/failure ratio
- Uses custom SVG rendering (14px × 55px rectangles)
- Limited interactivity (basic tooltips only)

**Data Flow** (`app/page.tsx:37-40`):
- Events are grouped by hour: `group(eventsForService, (event) => ...)`
- Individual timestamps are discarded in transformation
- Props passed to Service component: `Record<PropertyKey, Array<Event>>`

**Integration Point** (`app/components/service.tsx:51-58`):
- `Status` function transforms events to `Record<Hour, boolean[]>`
- Renders `UptimeIndicator` with aggregated data
- Lives inside `Card` component with uptime percentage and average latency

**Tech Stack**:
- Next.js 16.0.10 (App Router, Server Components)
- React 19.2.3
- TypeScript 5.9.3
- TailwindCSS 4.1.18
- DaisyUI 5.5.14
- No existing charting libraries

### Key Discoveries:
- `app/page.tsx:27-30` - Events already fetched with `orderBy: { created: 'asc' }` preserving chronological order
- `app/lib/events.server.ts:4-10` - Event type uses Zod schema with `ok: z.boolean()` and `latency: z.number().optional()`
- `app/util/record.ts` - Has `mapValues` utility for transforming record values
- Database stores ~288 events per service (24 hours × 12 checks/hour at 5-minute intervals)

## Desired End State

**New Visualization**:
- Time-series graph with X-axis showing timestamps (HH:MM format)
- Y-axis showing latency in milliseconds
- Green scatter dots for successful checks
- Red scatter dots for failed checks (positioned at Y=0)
- Green line connecting successful events to show trend
- Interactive tooltips showing timestamp, latency, and status
- Responsive sizing via ResponsiveContainer

**Verification**:
- Run `pnpm dev` and navigate to dashboard
- Each service card displays a graph instead of hourly bars
- Hovering over data points shows detailed tooltip
- Graph is responsive across screen sizes
- Failed requests appear as red dots at bottom (Y=0)
- TypeScript compilation succeeds without errors

## What We're NOT Doing

- **NOT** keeping the old hourly bar visualization (complete replacement)
- **NOT** adding zoom/brush functionality (out of scope for initial implementation)
- **NOT** making charts downloadable/exportable (future enhancement)
- **NOT** adding configurable time windows (stays at 24 hours)
- **NOT** implementing logarithmic Y-axis (linear scale sufficient)
- **NOT** adding reference lines for latency thresholds (optional future feature)
- **NOT** changing the database schema or data collection logic
- **NOT** modifying the health check job intervals

## Implementation Approach

Use **Recharts** library (v3.2.1+) with a `ComposedChart` combining:
- `Scatter` component for individual event markers with status-based colors
- `Line` component to connect successful events and show latency trend
- Custom `Tooltip` component using DaisyUI styling for consistency

This approach:
- Leverages battle-tested charting library (165 code snippets, high reputation)
- Provides accessibility (ARIA support) and interactivity out-of-the-box
- Integrates seamlessly with existing CSS variables and DaisyUI components
- Requires minimal data transformation (events already sorted by timestamp)

---

## Phase 1: Install Recharts and Setup Types

### Overview
Install the Recharts dependency and set up TypeScript types for the new chart component.

### Changes Required:

#### 1. Add Recharts Dependency
**File**: `package.json`
**Changes**: Add Recharts to dependencies section

```bash
pnpm add recharts
```

Expected addition to `package.json`:
```json
"dependencies": {
  "@breejs/ts-worker": "^2.0.0",
  "@prisma/client": "^5.22.0",
  "@tabler/icons-react": "^3.36.0",
  "bree": "^9.2.6",
  "cross-env": "^10.1.0",
  "next": "^16.0.10",
  "picocolors": "^1.1.1",
  "react": "^19.2.3",
  "react-dom": "^19.2.3",
  "recharts": "^2.15.0",
  "zod": "^3.25.76",
  "zod-validation-error": "^3.5.4"
}
```

**Note**: Recharts 2.15+ supports React 19. If version conflicts occur, use `--legacy-peer-deps` flag.

#### 2. Create Chart Data Type
**File**: `app/components/uptime-chart.tsx` (new file)
**Changes**: Create new component with types

```tsx
import { ReactNode } from "react";
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { type Event } from "../lib/events.server";

type UptimeChartProps = {
  events: Array<Event>;
  name: string;
};

type ChartDataPoint = {
  time: number;        // Unix timestamp in milliseconds
  latency: number;     // Latency in ms (0 for failed requests)
  ok: boolean;         // Success/failure status
  created: Date;       // Original timestamp for tooltip
};

export function UptimeChart(props: UptimeChartProps): ReactNode {
  // TODO: Implementation in Phase 2
  return <div>UptimeChart Placeholder</div>;
}
```

### Success Criteria:

#### Automated Verification:
- [x] Recharts installed successfully: `pnpm install` completes without errors
- [x] TypeScript compilation passes: `pnpm tsc --noEmit`
- [x] No dependency conflicts in `pnpm-lock.yaml`
- [x] New file exists: `app/components/uptime-chart.tsx`

#### Manual Verification:
- [x] Check `node_modules/recharts` directory exists
- [x] Verify Recharts version is compatible with React 19 (2.15.0+)

---

## Phase 2: Implement UptimeChart Component

### Overview
Build the core chart component with data transformation, axis configuration, and basic scatter/line rendering.

### Changes Required:

#### 1. Complete UptimeChart Implementation
**File**: `app/components/uptime-chart.tsx`
**Changes**: Implement full chart component with ComposedChart

```tsx
import { ReactNode } from "react";
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { type Event } from "../lib/events.server";

type UptimeChartProps = {
  events: Array<Event>;
  name: string;
};

type ChartDataPoint = {
  time: number;
  latency: number;
  ok: boolean;
  created: Date;
};

export function UptimeChart(props: UptimeChartProps): ReactNode {
  const { events, name } = props;

  // Transform events to chart data format
  const chartData: ChartDataPoint[] = events.map((event) => ({
    time: event.created.getTime(),
    latency: event.ok && event.latency !== undefined ? event.latency : 0,
    ok: event.ok,
    created: event.created,
  }));

  // Filter only successful events with latency for trend line
  const successfulEvents = events
    .filter((e) => e.ok && e.latency !== undefined)
    .map((e) => ({
      time: e.created.getTime(),
      latency: e.latency!,
    }));

  // Format timestamp for X-axis labels
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-base-content/50">
        Ingen data enda
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        {/* Grid */}
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--base-300)"
          opacity={0.5}
        />

        {/* X-Axis: Time */}
        <XAxis
          dataKey="time"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={formatTime}
          tick={{ fontSize: 12, fill: "var(--base-content)" }}
          stroke="var(--base-300)"
        />

        {/* Y-Axis: Latency */}
        <YAxis
          tick={{ fontSize: 12, fill: "var(--base-content)" }}
          stroke="var(--base-300)"
          label={{
            value: "ms",
            position: "insideLeft",
            style: { fontSize: 12, fill: "var(--base-content)" },
          }}
        />

        {/* Tooltip - basic for now, enhanced in Phase 3 */}
        <Tooltip />

        {/* Line connecting successful requests */}
        <Line
          data={successfulEvents}
          type="monotone"
          dataKey="latency"
          stroke="var(--color-success)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />

        {/* Scatter plot for all events */}
        <Scatter data={chartData} dataKey="latency" isAnimationActive={false}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.ok ? "var(--color-success)" : "var(--color-error)"}
            />
          ))}
        </Scatter>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `pnpm tsc --noEmit`
- [x] No linting errors: verify code follows project conventions
- [x] Component exports correctly (can be imported)

#### Manual Verification:
- [x] Component renders without errors when passed empty events array
- [x] Component renders chart when passed sample events
- [x] Chart displays X-axis with time labels (HH:MM format)
- [x] Chart displays Y-axis with latency values
- [x] Grid lines are visible and properly styled

---

## Phase 3: Update Data Flow in page.tsx

### Overview
Modify the main page component to pass raw events array instead of grouped events to enable time-series visualization.

### Changes Required:

#### 1. Update Service Data Structure
**File**: `app/page.tsx`
**Changes**: Modify lines 37-46 to pass raw events

**Before**:
```typescript
const eventsByHour = group(eventsForService, (event) => {
  const timestamp = event.created;
  return `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;
});

return {
  name: service,
  status: serviceStatus(last(eventsForService)),
  events: eventsByHour,
  averageLatency: averageLatency._avg?.latency ?? null
};
```

**After**:
```typescript
return {
  name: service,
  status: serviceStatus(last(eventsForService)),
  events: eventsForService,  // Pass raw events directly
  averageLatency: averageLatency._avg?.latency ?? null
};
```

**Remove unused import**:
```typescript
// Remove 'group' from imports on line 7
import { last } from './util/arrays';
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `pnpm tsc --noEmit`
- [x] No unused variable warnings for `group` import
- [ ] Data structure matches ServiceProps type

#### Manual Verification:
- [ ] Page loads without errors
- [ ] Events are passed as array to Service component
- [ ] No console errors related to data transformation

---

## Phase 4: Integrate UptimeChart in Service Component

### Overview
Replace UptimeIndicator with UptimeChart in the Service component and update prop types.

### Changes Required:

#### 1. Update Service Component Props and Rendering
**File**: `app/components/service.tsx`
**Changes**: Update type and replace UptimeIndicator with UptimeChart

**Update imports (line 1-8)**:
```typescript
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { type Event } from "../lib/events.server";
import { UptimeChart } from "./uptime-chart";  // Changed from UptimeIndicator
import { ReactNode } from "react";
import { SuccessChip } from "./success-chip";
import { ErrorChip } from "./error-chip";
```

**Update ServiceProps type (line 12-17)**:
```typescript
type ServiceProps = {
  name: string;
  events: Array<Event>;  // Changed from Record<PropertyKey, Array<Event>>
  status: ServiceStatus;
  averageLatency: number | null;
};
```

**Update Service function (line 19-23)**:
```typescript
export function Service(props: ServiceProps): ReactNode {
  const { name, events, status, averageLatency } = props;
  const allEvents: Array<Event> = events;  // Already an array now
  const uptime = allEvents.filter((e) => e.ok).length / allEvents.length;
  const uptimePercentage = maxTwoDecimals(uptime * 100);
```

**Update Status function (line 51-58)**:
```typescript
function Status(props: { events: Array<Event>; name: string }): ReactNode {
  if (props.events.length === 0) {
    return <span className="text-sm text-base-content/50">Ingen status enda</span>;
  } else {
    return <UptimeChart events={props.events} name={props.name} />;
  }
}
```

**Remove unused imports**:
```typescript
// Remove mapValues import (no longer needed)
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `pnpm tsc --noEmit`
- [x] No type errors on ServiceProps
- [x] No unused variable warnings for removed utilities

#### Manual Verification:
- [x] Service cards render with new UptimeChart
- [x] No console errors when rendering services
- [x] Uptime percentage still calculates correctly
- [x] "Ingen status enda" message shows for services with no events

---

## Phase 5: Implement Custom Tooltip with DaisyUI Styling

### Overview
Create a custom tooltip component that displays detailed event information using DaisyUI classes for design consistency.

### Changes Required:

#### 1. Add Custom Tooltip Component
**File**: `app/components/uptime-chart.tsx`
**Changes**: Add custom tooltip renderer before UptimeChart component

```tsx
import { TooltipProps } from "recharts";

// Add this before the UptimeChart component
function CustomTooltip({
  active,
  payload,
}: TooltipProps<number, string>): ReactNode {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload as ChartDataPoint;

  return (
    <div className="bg-base-100 p-3 border border-base-300 rounded-lg shadow-lg">
      <p className="text-xs font-medium mb-1">
        {data.created.toLocaleTimeString("nb-NO", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </p>
      <div className="text-xs space-y-1">
        <p>
          <span className="text-base-content/70">Status: </span>
          <span
            className={data.ok ? "text-success font-medium" : "text-error font-medium"}
          >
            {data.ok ? "Success" : "Failed"}
          </span>
        </p>
        {data.latency > 0 && (
          <p>
            <span className="text-base-content/70">Latency: </span>
            <span className="font-medium">{data.latency}ms</span>
          </p>
        )}
        {!data.ok && (
          <p className="text-xs text-error/70 italic">No latency data</p>
        )}
      </div>
    </div>
  );
}
```

#### 2. Update Tooltip in UptimeChart
**File**: `app/components/uptime-chart.tsx`
**Changes**: Replace basic Tooltip with custom implementation

**Replace**:
```tsx
<Tooltip />
```

**With**:
```tsx
<Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--base-300)", strokeWidth: 1 }} />
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `pnpm tsc --noEmit`
- [x] Tooltip component type-checks correctly with Recharts types

#### Manual Verification:
- [x] Hovering over data points shows styled tooltip
- [x] Tooltip displays timestamp in HH:MM:SS format
- [x] Success events show green "Success" text and latency value
- [x] Failed events show red "Failed" text and "No latency data" message
- [x] Tooltip uses DaisyUI classes (bg-base-100, border-base-300, etc.)
- [x] Tooltip has proper shadow and rounded corners
- [x] Cursor line appears when hovering over chart

---

## Phase 6: Visual Polish and Responsive Behavior

### Overview
Fine-tune visual design, ensure responsive behavior across screen sizes, and optimize chart height for card layout.

### Changes Required:

#### 1. Adjust Chart Height for Card Layout
**File**: `app/components/uptime-chart.tsx`
**Changes**: Update ResponsiveContainer height

**Current**:
```tsx
<ResponsiveContainer width="100%" height={200}>
```

**Updated** (for better visibility):
```tsx
<ResponsiveContainer width="100%" height={180}>
```

**Rationale**: 180px provides good balance between data visibility and card compactness. Test with actual data to confirm.

#### 2. Enhance Empty State
**File**: `app/components/uptime-chart.tsx`
**Changes**: Improve empty state styling

```tsx
if (chartData.length === 0) {
  return (
    <div className="flex items-center justify-center h-[180px] text-sm text-base-content/50 border border-dashed border-base-300 rounded">
      Ingen data enda
    </div>
  );
}
```

#### 3. Adjust Scatter Dot Size
**File**: `app/components/uptime-chart.tsx`
**Changes**: Add shape configuration to Scatter for better visibility

```tsx
<Scatter
  data={chartData}
  dataKey="latency"
  isAnimationActive={false}
  shape="circle"
  r={4}  // Dot radius in pixels
>
  {chartData.map((entry, index) => (
    <Cell
      key={`cell-${index}`}
      fill={entry.ok ? "var(--color-success)" : "var(--color-error)"}
    />
  ))}
</Scatter>
```

#### 4. Optimize X-Axis Tick Density
**File**: `app/components/uptime-chart.tsx`
**Changes**: Reduce tick count for better readability on small screens

```tsx
<XAxis
  dataKey="time"
  type="number"
  domain={["dataMin", "dataMax"]}
  tickFormatter={formatTime}
  tick={{ fontSize: 12, fill: "var(--base-content)" }}
  stroke="var(--base-300)"
  tickCount={6}  // Limit to ~6 ticks for 24-hour period
  minTickGap={50}  // Minimum spacing between ticks
/>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `pnpm tsc --noEmit`
- [x] No warnings about unused props

#### Manual Verification:
- [x] Chart displays clearly on desktop (1920px width)
- [x] Chart remains readable on tablet (768px width)
- [x] Chart works on mobile (375px width)
- [x] X-axis labels don't overlap on any screen size
- [x] Scatter dots are visible but not too large (4px radius)
- [x] Empty state has dashed border and centered text
- [x] Chart fits well within Service card without overflow
- [x] ResponsiveContainer adapts to card width in grid (1-4 columns)

---

## Phase 7: Cleanup and Final Testing

### Overview
Remove old UptimeIndicator component, verify all imports, and perform comprehensive testing.

### Changes Required:

#### 1. Delete Old Component
**File**: `app/components/uptime-indicator.tsx`
**Changes**: Delete entire file (no longer used)

```bash
rm app/components/uptime-indicator.tsx
```

#### 2. Remove Unused Utilities
**File**: Check if `app/util/record.ts` is still used
**Changes**: If `mapValues` is not used elsewhere, consider removing or leaving for future use

```bash
# Search for other uses of mapValues
grep -r "mapValues" app/
```

**Decision**: Keep `app/util/record.ts` even if unused - it's a generic utility that might be useful later.

#### 3. Verify All Imports
**Files to check**:
- `app/page.tsx` - Ensure no unused imports
- `app/components/service.tsx` - Verify clean imports
- `app/components/uptime-chart.tsx` - Check all Recharts imports used

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `pnpm tsc --noEmit`
- [x] No unused variable warnings: `pnpm tsc --noEmit 2>&1 | grep "unused"`
- [x] Build succeeds: `pnpm build`
- [x] No import errors in build output
- [x] File `app/components/uptime-indicator.tsx` does not exist

#### Manual Verification:
- [x] Dashboard loads successfully with `pnpm dev`
- [x] All service cards display UptimeChart correctly
- [x] Charts show proper data for all services
- [x] Filtering (All/Failing/Unknown) still works correctly
- [x] No console errors or warnings
- [x] Average latency still displays correctly in cards
- [x] Uptime percentage still calculates correctly
- [x] Service status indicators (SuccessChip/ErrorChip) still work
- [x] Responsive grid layout (1-4 columns) still functions
- [x] Charts remain responsive when resizing browser window
- [x] Test with services that have:
  - All successful events
  - All failed events
  - Mix of success and failures
  - No events (empty state)
- [x] Verify failed events appear as red dots at Y=0
- [x] Verify successful events show actual latency values
- [x] Tooltips work for both success and failed events
- [x] Time axis shows correct 24-hour window
- [x] Latency values display in milliseconds

---

## Testing Strategy

### Unit Tests (Optional - Not Required for MVP)

No unit tests required for initial implementation. The component is primarily visual and best verified through manual testing. Future consideration:
- Test data transformation logic (`chartData` mapping)
- Test `formatTime` function for edge cases
- Mock Recharts components for shallow rendering tests

### Integration Tests

**Manual testing approach** (no automated integration tests):

1. **Service with Full 24h Data**:
   - Navigate to dashboard
   - Find service with consistent monitoring
   - Verify chart shows ~288 data points
   - Verify X-axis spans full 24 hours
   - Verify Y-axis scales appropriately

2. **Service with Recent Failures**:
   - Identify or create service with recent failures
   - Verify red dots appear at Y=0
   - Verify failed event tooltips show "No latency data"
   - Verify trend line breaks at failures

3. **Service with No Data**:
   - Add new service with no events yet
   - Verify empty state message displays
   - Verify no chart rendering errors

4. **Responsive Behavior**:
   - Test on desktop (1920px): 4-column grid
   - Test on laptop (1280px): 3-column grid
   - Test on tablet (768px): 2-column grid
   - Test on mobile (375px): 1-column layout
   - Verify charts resize properly in all layouts

### Manual Testing Steps

1. **Initial Setup**:
   ```bash
   pnpm install
   pnpm dev
   ```

2. **Navigate to Dashboard**:
   - Open http://localhost:3000
   - Wait for services to load

3. **Verify Each Service Card**:
   - [ ] Chart renders without errors
   - [ ] X-axis shows time labels (e.g., "14:30", "16:00")
   - [ ] Y-axis shows latency in ms
   - [ ] Green dots for successful checks
   - [ ] Red dots (if any) at Y=0 for failures
   - [ ] Green line connects successful events

4. **Test Tooltip Interaction**:
   - [ ] Hover over green dot → tooltip shows timestamp, "Success", latency
   - [ ] Hover over red dot → tooltip shows timestamp, "Failed", "No latency data"
   - [ ] Cursor line follows mouse horizontally
   - [ ] Tooltip disappears when mouse leaves chart

5. **Test Filtering**:
   - [ ] Click "Failing" tab → only failing services shown
   - [ ] Click "Unknown" tab → only unknown services shown
   - [ ] Click "All" tab → all services shown
   - [ ] Charts still render correctly after filtering

6. **Test Edge Cases**:
   - [ ] Service with zero events → "Ingen data enda" message
   - [ ] Service with only 1-2 events → chart renders without errors
   - [ ] Service with all failures → all dots red at Y=0, no trend line
   - [ ] Service with all successes → all dots green, continuous trend line

7. **Performance Check**:
   - [ ] Dashboard loads in < 2 seconds
   - [ ] No lag when hovering over charts
   - [ ] No memory leaks (check DevTools Performance tab)
   - [ ] Smooth scrolling with multiple service cards

## Performance Considerations

**Dataset Size**:
- Typical: ~288 events per service (24 hours × 12 checks/hour)
- Maximum on dashboard: 288 × number of services

**Recharts Performance**:
- ✅ Handles 288 points per chart efficiently (SVG rendering)
- ✅ Animations disabled (`isAnimationActive={false}`) for faster render
- ✅ ResponsiveContainer uses efficient resize observer

**Optimizations Applied**:
- No animations on chart components (instant rendering)
- Scatter dots use fixed radius (no dynamic sizing)
- Tooltip only renders on hover (not always mounted)
- Server-side data fetching (no client-side loading state)

**Potential Future Optimizations** (not in this plan):
- Virtual scrolling for services list if count > 50
- Chart data memoization with `useMemo` if re-renders become issue
- Lazy loading charts below fold with Intersection Observer

## Migration Notes

**Breaking Changes**:
- `ServiceProps.events` type changes from `Record<PropertyKey, Array<Event>>` to `Array<Event>`
- Component `UptimeIndicator` is removed and replaced by `UptimeChart`
- No user-facing changes - visualization updates but data remains same

**Rollback Strategy**:
If issues arise post-deployment:
1. Revert commit(s) for this feature
2. Run `pnpm install` to restore old dependencies
3. Restart development server or rebuild production

**No Database Migration Required**:
- No schema changes
- No data transformation needed
- Existing events work as-is

**Backwards Compatibility**:
- Not applicable - this is a complete UI replacement
- Old component deleted, no parallel support

## References

- **Related Research**: `planning/2025-12-28-uptime-graph-visualization/research.md`
- **Recharts Documentation**: https://recharts.org/en-US/api
- **Recharts ComposedChart**: https://recharts.org/en-US/api/ComposedChart
- **Context7 Recharts Guide**: `/recharts/recharts` library documentation

**Similar Patterns in Codebase**:
- `app/components/sparkline.tsx` - Existing custom SVG line chart (reference for gradient approach)
- `app/components/service.tsx:19-48` - Card layout integration pattern
- `app/util/dates.ts` - Time formatting utilities

**Key Code References**:
- Event type definition: `app/lib/events.server.ts:4-10`
- Current data fetching: `app/page.tsx:27-30`
- Service card structure: `app/components/service.tsx:28-48`
- CSS variables: Check DaisyUI theme for `--color-success`, `--color-error`, `--base-*`
