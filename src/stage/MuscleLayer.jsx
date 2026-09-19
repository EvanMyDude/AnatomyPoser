import React, { memo } from "react";

/** Visible muscle ellipses. `placed` comes from placeMuscles(); hit-testing is in HitLayer. */
function MuscleLayer({ placed, focus, dim }) {
  return (
    <g opacity={dim ? 0.9 : 1} pointerEvents="none">
      {placed.map(({ m, pl }) => {
        const on = focus && focus.kind === "muscle" && focus.id === m.id;
        return (
          <ellipse key={m.id} cx={pl.cx} cy={pl.cy} rx={pl.rx} ry={pl.ry}
            transform={`rotate(${pl.ang} ${pl.cx} ${pl.cy})`}
            fill={on ? "var(--accent)" : "var(--muscle)"} stroke={on ? "#fff" : "var(--muscle-edge)"}
            strokeWidth={on ? 2 : 1} opacity={on ? 0.95 : 0.82} />
        );
      })}
    </g>
  );
}
export default memo(MuscleLayer);
