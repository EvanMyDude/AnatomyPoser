import React from "react";
import { VIEW } from "./geometry.js";

/** Floating name chip over the hovered/selected bone or muscle. */
export default function LabelChip({ at, text, viewBox }) {
  if (!at || !text) return null;
  const w = text.length * 6.6 + 16;
  const vb = viewBox || VIEW;
  const bx = Math.min(Math.max(at.x - w / 2, vb.x + 6), vb.x + vb.w - w - 6), by = Math.max(at.y - 26, vb.y + 14);
  return (
    <g pointerEvents="none">
      <rect x={bx} y={by - 12} width={w} height={18} rx={3} fill="#0b1013" stroke="var(--accent)" strokeWidth={1} opacity={0.96} />
      <text x={bx + w / 2} y={by + 1} className="ap-chip-text">{text}</text>
    </g>
  );
}
