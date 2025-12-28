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
  TooltipProps,
} from "recharts";
import { type Event } from "../lib/events.server";

type UptimeChartProps = {
  events: Array<Event>;
  name: string;
};

type ChartDataPoint = {
  time: number; // Unix timestamp in milliseconds
  latency: number; // Latency in ms (0 for failed requests)
  ok: boolean; // Success/failure status
  created: Date; // Original timestamp for tooltip
};

// Custom tooltip component with DaisyUI styling
function CustomTooltip({ active, payload }: any): ReactNode {
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
          <span className={data.ok ? "text-success font-medium" : "text-error font-medium"}>
            {data.ok ? "Success" : "Failed"}
          </span>
        </p>
        {data.latency > 0 && (
          <p>
            <span className="text-base-content/70">Latency: </span>
            <span className="font-medium">{data.latency}ms</span>
          </p>
        )}
        {!data.ok && <p className="text-xs text-error/70 italic">No latency data</p>}
      </div>
    </div>
  );
}

// Custom dot shape for scatter plot

const customDot = (props: any) => {
  const { cx, cy, payload } = props;
  const fill = payload.ok ? "var(--color-success)" : "var(--color-error)";

  return <circle cx={cx} cy={cy} r={2} fill={fill} />;
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
      ok: e.ok,
      created: e.created,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-45 text-sm text-base-content/50 border border-dashed border-base-300 rounded">
        Ingen data enda
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        {/* Grid */}
        <CartesianGrid strokeDasharray="3 3" stroke="var(--base-300)" opacity={0.5} />

        {/* X-Axis: Hidden */}
        <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} hide={true} />

        {/* Y-Axis: Hidden */}
        <YAxis hide={true} />

        {/* Tooltip - custom with DaisyUI styling */}
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: "var(--base-300)", strokeWidth: 1 }}
        />

        {/* Line connecting successful requests */}
        <Line
          data={successfulEvents}
          type="linear"
          dataKey="latency"
          stroke="var(--color-success)"
          strokeWidth={1}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />

        {/* Scatter plot for all events */}
        <Scatter data={chartData} dataKey="latency" isAnimationActive={false} shape={customDot} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
