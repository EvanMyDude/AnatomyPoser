import React, { memo } from "react";
import { seg, boneWidth, fingerPolylines, VIEW } from "./geometry.js";

/** Visible skeleton: bone segments, head, fingers, joint keypoints. No hit-testing here. */
function BoneLayer({ rig, pos, dir, plane, focus, selectedJointId, fingerCurl }) {
  const isOn = (kind, id) => (focus && focus.kind === kind && focus.id === id) || (kind === "bone" && selectedJointId === id);
  return (
    <g>
      {rig.bones.map((b) => {
        if (b.parent == null || b.len === 0) return null;
        const s = seg(rig, pos, dir, b.id), on = isOn("bone", b.id);
        const w = boneWidth(b.id);
        return (
          <g key={b.id}>
            <line x1={s.ax} y1={s.ay} x2={s.bx} y2={s.by} stroke={on ? "var(--accent)" : "var(--bone)"}
              strokeWidth={w + (on ? 3 : 0)} strokeLinecap="round" opacity={on ? 1 : 0.96} />
            <line x1={s.ax} y1={s.ay} x2={s.bx} y2={s.by} stroke={on ? "var(--accent)" : "var(--bone-edge)"}
              strokeWidth={0.8} strokeLinecap="round" opacity={0.5} />
          </g>
        );
      })}
      <circle cx={pos.head.x} cy={pos.head.y} r={VIEW.headR} fill="var(--bg)"
        stroke={isOn("bone", "head") ? "var(--accent)" : "var(--bone)"} strokeWidth={isOn("bone", "head") ? 6 : 4} />
      {plane === "sagittal" && (
        <path d={`M ${pos.head.x + 24} ${pos.head.y - 5} l 8 6 l -8 6 z`} fill="var(--bone)" opacity={0.85} />
      )}
      {rig.ikBones.map((b) => (
        <circle key={"k" + b.id} cx={pos[b.id].x} cy={pos[b.id].y} r={3} fill="var(--bg)" stroke="var(--bone-edge)" strokeWidth={1.4} />
      ))}
      {["handL", "handR"].map((h) => rig.byId[h] && fingerPolylines(pos, dir, h, fingerCurl).map((pts, i) => (
        <polyline key={h + i} points={pts} fill="none" stroke="var(--bone)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      )))}
    </g>
  );
}
export default memo(BoneLayer);
