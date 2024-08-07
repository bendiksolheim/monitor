import { max, range, zip } from "~/util/arrays";
import { Svg } from "./svg";

type Props = {
  values: Array<number | undefined>;
};

export function Sparkline(props: Props): JSX.Element {
  const svgWidth = 420;
  const svgHeight = 150;
  const graphWidth = 710;
  const graphHeight = 120;
  const yValues = props.values;
  const xValues = range(graphWidth, graphWidth / yValues.length);
  const maxValue = max(yValues) ?? 0;
  const pairs: Array<Point> = zip(xValues, yValues).map(([x, y]) => ({
    x,
    y: ((y ?? 0) / maxValue) * graphHeight,
  }));
  const paths = pairs.reduce(
    (paths, value) => {
      const current = paths[paths.length - 1];
      if (typeof current[current.length - 1].y === typeof value.y) {
        current.push(value);
      } else {
        paths.push([value]);
      }
      return paths;
    },
    [[pairs[0]]]
  );
  const svgPaths = paths.flatMap((path: Point[]) => {
    if (path[0].y === undefined || isNaN(path[0].y)) {
      const from = path[0].x - 1;
      const to = path[path.length - 1].x + 1;
      return (
        <ErrorPath key={path[0].x} from={from} to={to} height={graphHeight} />
      );
    } else {
      const p = path.map((p) => ({ x: p.x, y: p.y ?? 0 }));
      return <OperationalPath key={path[0].x} path={p} height={graphHeight} />;
    }
  });

  return (
    <Svg>
      <defs>
        <linearGradient id="sparkline-bg" gradientTransform="rotate(90)">
          <stop offset="0%" stopColor="var(--mantine-color-green-3)" />
          <stop offset="50%" stopColor="var(--mantine-color-green-3)" />
          <stop
            offset="100%"
            stopColor="var(--mantine-color-green-3)"
            stopOpacity={0}
          />
        </linearGradient>
      </defs>
      <g x="0" y="0" transform="translate(40, 20)">
        {svgPaths}
        <YAxis height={graphHeight} />
        <XAxis width={graphWidth} height={graphHeight} />
        <GridLines
          height={graphHeight}
          width={graphWidth}
          maxValue={maxValue}
        />
      </g>
      <YValues maxValue={maxValue} height={graphHeight} />
    </Svg>
  );
}

function YValues({
  maxValue,
  height,
}: {
  maxValue: number;
  height: number;
}): JSX.Element {
  let heights = range(height, height / 5)
    .concat(height)
    .reverse()
    .map((height) => height + 15);
  let values = range(maxValue, maxValue / 5)
    .concat(maxValue)
    .map((value) => Math.ceil(value));
  let points = zip(heights, values);
  return (
    <>
      {points.map((point) => (
        <text
          key={point[0]}
          x="32"
          y={`${point[0]}`}
          dominantBaseline="hanging"
          fontSize="0.8rem"
          textAnchor="end"
        >
          {point[1]}
        </text>
      ))}
    </>
  );
}

function YAxis({ height }: { height: number }): JSX.Element {
  return <path d={`M 0 0 L 0 ${height}`} stroke="black" strokeWidth={1} />;
}

function XAxis({
  width,
  height,
}: {
  width: number;
  height: number;
}): JSX.Element {
  return (
    <path
      d={`M 0 ${height} L ${width} ${height}`}
      stroke="black"
      strokeWidth={1}
    />
  );
}

function GridLines({
  height,
  width,
}: {
  maxValue: number;
  height: number;
  width: number;
}): JSX.Element {
  let values = range(height, height / 5);
  return (
    <>
      {values.map((value) => (
        <path
          key={value}
          d={`M 0 ${value} L ${width} ${value}`}
          strokeDasharray="3"
          stroke="black"
          strokeWidth="1"
          strokeOpacity="0.3"
        />
      ))}
    </>
  );
}

function OperationalPath(props: {
  path: Array<Point>;
  height: number;
}): JSX.Element {
  const values = props.path.map((p) => [p.x, props.height - (p.y ?? 0)]);
  const pathStart = "M";
  const pathLine = values.map((value) => `${value[0]} ${value[1]}`).join(" L ");
  const path = `${pathStart} ${pathLine} L ${values[values.length - 1][0]} ${
    props.height
  } L ${values[0][0]} ${props.height} Z`;
  return (
    <>
      <path d={path} fill="url(#sparkline-bg)" />
      <path
        d={`${pathStart} ${pathLine}`}
        stroke="var(--mantine-color-green-7)"
        strokeWidth="1.5"
        fill="transparent"
      />
    </>
  );
}

function ErrorPath(props: {
  from: number;
  to: number;
  height: number;
}): JSX.Element {
  const path = `M ${props.from} 0 L ${props.from} ${props.height} L ${props.to} ${props.height} L ${props.to} 0 Z`;
  return <path d={path} fill="pink" strokeWidth="1" />;
}

type Point = {
  x: number;
  y: number | undefined;
};
