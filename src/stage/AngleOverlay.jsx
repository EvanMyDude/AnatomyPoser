import React from "react";
import { D2R } from "../rig/kinematics.js";

const pt = (c, r, deg) => ({ x: c.x + Math.cos(deg * D2R) * r, y: c.y + Math.sin(deg * D2R) * r });
const arcPath = (c, r, a0, a1) => {
  const p0 = pt(c, r, a0), p1 = pt(c, r, a1);
  const sweep = a1 - a0;
  const large = Math.abs(sweep) > 180 ? 1 : 0, dirFlag = sweep > 0 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} ${dirFlag} ${p1.x} ${p1.y}`;
};

/**
 * Goniometer drawn at the selected joint: the neutral ray, the current ray,
 * the swept arc, and (when the movement has a norm in this plane) a faint arc
 * out to the normal end range.
 */
export default function AngleOverlay({ g, desc }) {
  if (!g || !desc || desc.locked) return null;
  const { pivot, neutralDeg, currentDeg, rel, radius } = g;
  const r = Math.max(22, radius);
  const sign = rel >= 0 ? 1 : -1;
  const normDeg = desc.clinical && desc.norm ? neutralDeg + sign * desc.norm : null;
  const rayLen = r + 14;
  const n = pt(pivot, rayLen, neutralDeg), c = pt(pivot, rayLen, currentDeg);
  const mid = pt(pivot, r + 22, neutralDeg + rel / 2);
  const showNorm = normDeg != null && Math.abs(rel) > 0.5 && Math.abs(desc.norm) > Math.abs(rel) + 0.5;
  return (
    <g pointerEvents="none">
      {showNorm && <path d={arcPath(pivot, r, currentDeg, normDeg)} fill="none" stroke="var(--norm)" strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />}
      {Math.abs(rel) > 0.5 && <path d={arcPath(pivot, r, neutralDeg, currentDeg)} fill="none" stroke="var(--accent)" strokeWidth={2} opacity={0.9} />}
      <line x1={pivot.x} y1={pivot.y} x2={n.x} y2={n.y} stroke="var(--norm)" strokeWidth={1} strokeDasharray="3 3" opacity={0.8} />
      <line x1={pivot.x} y1={pivot.y} x2={c.x} y2={c.y} stroke="var(--accent)" strokeWidth={1.5} opacity={0.9} />
      <circle cx={pivot.x} cy={pivot.y} r={2.5} fill="var(--accent)" />
      {Math.abs(rel) > 0.5 && (
        <text x={mid.x} y={mid.y + 4} textAnchor="middle" className="ap-gonio-text">{Math.round(Math.abs(rel))}°</text>
      )}
      {showNorm && (() => { const q = pt(pivot, r + 10, normDeg); return <text x={q.x} y={q.y + 3} textAnchor="middle" className="ap-gonio-sub">{desc.norm}°</text>; })()}
    </g>
  );
}
