import React, { memo } from "react";
import { seg, boneWidth, VIEW } from "./geometry.js";

/**
 * Transparent hit targets, drawn above the visuals. Bones (drag = rotate the
 * bone's own joint, click = select bone), the head, and muscles (drag = rotate
 * the bone they sit on, click = select muscle). Marked data-hit so exports can
 * strip them.
 */
function HitLayer({ rig, pos, dir, placed, showBones, showMuscles, hitExtra, hitMin, onBoneDown, onMuscleDown, onHover }) {
  return (
    <g data-hit="1">
      {showBones && rig.bones.map((b) => {
        if (b.parent == null || b.len === 0) return null;
        const s = seg(rig, pos, dir, b.id);
        return (
          <line key={"hit" + b.id} x1={s.ax} y1={s.ay} x2={s.bx} y2={s.by} stroke="transparent"
            strokeWidth={Math.max(boneWidth(b.id) + hitExtra, hitMin)} strokeLinecap="round"
            className={"ap-hit" + (b.ik ? " is-grab" : "")}
            onPointerEnter={() => onHover({ kind: "bone", id: b.id })} onPointerLeave={() => onHover(null)}
            onPointerDown={(e) => onBoneDown(b.id, e)} />
        );
      })}
      {showBones && (
        <circle cx={pos.head.x} cy={pos.head.y} r={VIEW.headR + 2} fill="transparent" className="ap-hit is-grab"
          onPointerEnter={() => onHover({ kind: "bone", id: "head" })} onPointerLeave={() => onHover(null)}
          onPointerDown={(e) => onBoneDown("head", e)} />
      )}
      {showMuscles && placed.map(({ m, pl }) => (
        <ellipse key={"mh" + m.id} cx={pl.cx} cy={pl.cy} rx={pl.rx} ry={pl.ry}
          transform={`rotate(${pl.ang} ${pl.cx} ${pl.cy})`} fill="transparent"
          className={"ap-hit" + (rig.byId[m.bone].ik ? " is-grab" : "")}
          onPointerEnter={() => onHover({ kind: "muscle", id: m.id })} onPointerLeave={() => onHover(null)}
          onPointerDown={(e) => onMuscleDown(m, e)} />
      ))}
    </g>
  );
}
export default memo(HitLayer);
