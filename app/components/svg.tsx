import { ReactNode } from "react";
import { PropsWithChildren } from "react";

export function Svg(props: PropsWithChildren<{}>): ReactNode {
  const svgWidth = 420;
  const svgHeight = 70;
  const viewBox = `0 0 ${svgWidth} ${svgHeight}`;
  return (
    <svg width={`${svgWidth}px`} height={`${svgHeight}px`} viewBox={viewBox}>
      {props.children}
    </svg>
  );
}
