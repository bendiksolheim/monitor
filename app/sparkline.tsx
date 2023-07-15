import { last, max, range, zip } from "./util/arrays";

type Props = {
  values: Array<number | null>;
};

export function Sparkline(props: Props): JSX.Element {
  const yValues = props.values;
  const xValues = range(yValues.length);
  const width = xValues.length;
  const height = (max(yValues) ?? 0) / 0.75;
  const pairs = zip(xValues, yValues);
  const paths = pairs.reduce(
    (paths, value) => {
      const current = paths[paths.length - 1];
      if (typeof current[current.length - 1][1] === typeof value[1]) {
        current.push(value);
      } else {
        paths.push([value]);
      }
      return paths;
    },
    [[pairs[0]]]
  );
  const typedPaths: Array<Path> = paths.map((path) => {
    if (path[0][1] !== null) {
      return {
        key: "operational",
        values: path.map((p) => [p[0], p[1] ?? 0]),
      };
    } else {
      return {
        key: "error",
        from: path[0][0] - 1,
        to: path[path.length - 1][0] + 1,
      };
    }
  });

  const svgPaths = typedPaths.flatMap((path) => {
    switch (path.key) {
      case "operational":
        return makeOperationalPath(path, height);
      case "error":
        return makeErrorPath(path, height);
    }
  });

  const viewBox = `0 0 ${width} ${height}`;
  return (
    <svg
      height="180px"
      width="750px"
      viewBox={viewBox}
      preserveAspectRatio="none"
    >
      {svgPaths.map((path) => (
        <path
          key={path.id}
          d={path.path}
          stroke={path.stroke}
          fill={path.fill}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function makeOperationalPath(
  path: OperationalPath,
  height: number
): Array<SvgPath> {
  const values = path.values.map(([x, y]) => [x, height - y]);
  const pathStart = "M";
  const pathLine = values.map((value) => `${value[0]} ${value[1]}`).join(" L ");
  return [
    {
      id: path.values[0][0] + "-fill",
      path: `${pathStart} ${pathLine} L ${
        values[values.length - 1][0]
      } ${height} L ${values[0][0]} ${height} Z`,
      fill: "lightgreen",
      stroke: "transparent",
    },
    {
      id: path.values[0][0] + "-line",
      path: `${pathStart} ${pathLine}`,
      fill: "transparent",
      stroke: "green",
    },
  ];
}

function makeErrorPath(path: ErrorPath, height: number): Array<SvgPath> {
  const { from, to } = path;
  return [
    {
      id: String(from + 1),
      path: `M ${from} 0 L ${from} ${height} L ${to} ${height} L ${to} 0 Z`,
      stroke: "transparent",
      fill: "pink",
    },
  ];
}

type SvgPath = {
  id: string;
  path: string;
  stroke: string;
  fill: string;
};

type OperationalPath = {
  key: "operational";
  values: Array<[number, number]>;
};

type ErrorPath = {
  key: "error";
  from: number;
  to: number;
};

type Path = OperationalPath | ErrorPath;
