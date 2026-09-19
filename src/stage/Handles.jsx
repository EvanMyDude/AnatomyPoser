import React, { memo } from "react";

/**
 * Always-on posing affordances:
 *  - effector handles (head, hands, feet): drag = IK on the chain, double-click = reset chain
 *  - joint dots at every ik pivot: drag = rotate that joint only, click = select,
 *    double-click = reset, keyboard = nudge (role="slider")
 */
function Handles({ rig, pos, chains, descs, activeEffector, activeJoint, selectedJointId, sizes, onlyJoint,
                   onHandleDown, onHandleDouble, onJointDown, onJointDouble, onJointKey }) {
  return (
    <g data-hit="1">
      {rig.ikBones.map((b) => {
        const p = rig.jointPos(pos, b.id);
        const d = descs[b.id];
        const sel = selectedJointId === b.id, act = activeJoint === b.id;
        if (d.locked || (onlyJoint && b.id !== onlyJoint)) return null;
        return (
          <g key={"j" + b.id} className="ap-joint-dot" tabIndex={0} role="slider"
            aria-label={`${d.label}, ${d.note}`} aria-valuemin={Math.round(d.relLo)} aria-valuemax={Math.round(d.relHi)}
            aria-valuenow={Math.round(d.rel)} aria-valuetext={d.movement ? `${Math.round(d.degrees)} degrees ${d.movement}` : "neutral"}
            onPointerDown={(e) => onJointDown(b.id, e)} onDoubleClick={() => onJointDouble(b.id)} onKeyDown={(e) => onJointKey(b.id, e)}>
            <circle cx={p.x} cy={p.y} r={sizes.jointHit} fill="transparent" />
            <circle className="ap-joint-ring" cx={p.x} cy={p.y} r={sel || act ? 6 : 3.5} fill={act ? "var(--accent)" : "var(--bg)"}
              stroke={sel || act ? "var(--accent)" : "var(--faint)"} strokeWidth={sel || act ? 2 : 1.4} opacity={0.95} />
          </g>
        );
      })}
      {Object.entries(chains).map(([h, c]) => {
        const id = c.effector, active = activeEffector === h, p = pos[id];
        return (
          <g key={h} role="button" aria-label={`Drag to pose ${c.label.toLowerCase()}`} tabIndex={-1}>
            <circle cx={p.x} cy={p.y} r={sizes.handleHit} fill="transparent" style={{ cursor: active ? "grabbing" : "grab" }}
              onPointerDown={(e) => onHandleDown(h, e)} onDoubleClick={() => onHandleDouble(h)} />
            <circle cx={p.x} cy={p.y} r={active ? sizes.handleActive : sizes.handle} fill={active ? "var(--accent)" : "none"}
              stroke="var(--accent)" strokeWidth={2} pointerEvents="none" opacity={0.95} />
            <circle cx={p.x} cy={p.y} r={2} fill="var(--accent)" pointerEvents="none" />
          </g>
        );
      })}
    </g>
  );
}
export default memo(Handles);
