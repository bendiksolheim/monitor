import { ReactNode } from "react";
import { Svg } from "./svg";

type Hour = number;
type HourValues = Array<boolean>;

type UptimeIndicatorProps = {
  values: Record<Hour, HourValues>;
  name: string;
};

export function UptimeIndicator(props: UptimeIndicatorProps): ReactNode {
  const squares = Object.entries(props.values).map((entry, i) => {
    const hour = entry[0];
    const events = entry[1];
    const failure = events.filter((e) => !e);
    const indicatorWidth = 14;
    const indicatorHeight = 55;
    const gap = 3;
    const failurePercentage = (failure.length / events.length) * 100;

    const id = safeId(`${props.name}-${hour}`);

    if (failure.length > 0) {
      return (
        <g key={id}>
          <title>
            {`${hour}\n${events.length - failure.length} successful attempts\n${
              failure.length
            } failed attempts}`}
          </title>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--mantine-color-red-5)" />
              <stop
                offset={`${failurePercentage}%`}
                stopColor="var(--mantine-color-red-5)"
              />
              <stop
                offset={`${failurePercentage}%`}
                stopColor="var(--mantine-color-green-5)"
              />
              <stop offset="100%" stopColor="var(--mantine-color-green-5)" />
            </linearGradient>
          </defs>
          <rect
            key={i}
            x={i * (indicatorWidth + gap)}
            width={indicatorWidth}
            height={indicatorHeight}
            fill={`url(#${id})`}
            rx={indicatorWidth / 2}
          />
        </g>
      );
    } else {
      return (
        <g key={id}>
          <title>
            {`${hour}\n${events.length - failure.length} successful attempts\n${
              failure.length
            } failed attempts}`}
          </title>
          <rect
            x={i * (indicatorWidth + gap)}
            width={indicatorWidth}
            height={indicatorHeight}
            fill="var(--mantine-color-green-5)"
            rx={indicatorWidth / 2}
          />
        </g>
      );
    }
  });
  return <Svg>{squares}</Svg>;
}

function safeId(id: string): string {
  return id.replace(/\s/g, "-");
}
