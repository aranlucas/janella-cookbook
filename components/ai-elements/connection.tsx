import type { ConnectionLineComponent } from "@xyflow/react";

const HALF = 0.5;

export const Connection: ConnectionLineComponent = ({ fromX, fromY, toX, toY }) => (
  <g>
    <path
      d={`M${fromX},${fromY} C ${fromX + (toX - fromX) * HALF},${fromY} ${fromX + (toX - fromX) * HALF},${toY} ${toX},${toY}`}
      fill="none"
      stroke="var(--color-ring)"
      strokeDasharray="5"
      style={{ animation: "dashdraw 0.5s linear infinite" }}
      strokeWidth={1}
    />
    <circle cx={toX} cy={toY} fill="#fff" r={3} stroke="var(--color-ring)" strokeWidth={1} />
  </g>
);
