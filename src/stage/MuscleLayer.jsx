import React, { memo } from "react";

const mix = (t) => `color-mix(in srgb, var(--accent) ${Math.round(t * 100)}%, var(--muscle))`;

/**
 * Visible muscle ellipses. `placed` = placeInstances() output. `activation`
 * maps instance keys to 0..1; working muscles warm toward the accent and glow.
 * In the activation layer, idle muscles are dimmed so the working set reads.
 */
function MuscleLayer({ placed, focus, activation, mode }) {
  const emphasize = mode === "activation";
  return (
    <g pointerEvents="none">
      <defs>
        <filter id="ap-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {placed.map(({ inst, pl }) => {
        const on = focus && focus.kind === "muscle" && focus.id === inst.key;
        const a = activation ? activation[inst.key] || 0 : 0;
        const post = inst.depth === "post" && inst.plane === "coronal";
        const fill = on ? "var(--accent)" : a > 0 ? mix(Math.min(1, 0.25 + a * 0.75)) : "var(--muscle)";
        const opacity = on ? 0.95 : emphasize ? (a > 0 ? 0.6 + a * 0.4 : 0.22) : post ? 0.55 : 0.82;
        return (
          <ellipse key={inst.key} cx={pl.cx} cy={pl.cy} rx={pl.rx} ry={pl.ry}
            transform={`rotate(${pl.ang} ${pl.cx} ${pl.cy})`}
            fill={post && !on && a === 0 ? "none" : fill} stroke={on ? "#fff" : a > 0 ? "var(--accent)" : "var(--muscle-edge)"}
            strokeWidth={on ? 2 : a > 0 ? 1.5 : 1} strokeDasharray={post ? "4 3" : undefined} opacity={opacity}
            filter={a > 0.15 ? "url(#ap-glow)" : undefined} />
        );
      })}
    </g>
  );
}
export default memo(MuscleLayer);
