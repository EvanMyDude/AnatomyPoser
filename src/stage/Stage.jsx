import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fitViewBox, goniometer } from "../rig/kinematics.js";
import { MUSCLES } from "../data/muscles.js";
import { BONE_NAME } from "../data/labels.js";
import { placeMuscles, seg, VIEW } from "./geometry.js";
import BoneLayer from "./BoneLayer.jsx";
import MuscleLayer from "./MuscleLayer.jsx";
import HitLayer from "./HitLayer.jsx";
import Handles from "./Handles.jsx";
import AngleOverlay from "./AngleOverlay.jsx";
import LabelChip from "./LabelChip.jsx";
import { useDragInteraction } from "../hooks/useDragInteraction.js";

const PLANE_TAG = { coronal: "Front view (coronal plane)", sagittal: "Side view (sagittal plane), facing right" };

export default function Stage({ rig, plane, angles, pos, dir, descs, layer, selected, selectedJointId, chains, fingerCurl, dispatch, isNarrow }) {
  const svgRef = useRef(null);
  const posRef = useRef(pos), anglesRef = useRef(angles);
  useLayoutEffect(() => { posRef.current = pos; anglesRef.current = angles; }, [pos, angles]);
  const [hover, setHover] = useState(null);

  const showBones = layer !== "muscles", showMuscles = layer !== "bones";
  const placed = useMemo(() => (showMuscles ? placeMuscles(rig, pos, dir, plane, MUSCLES) : []), [rig, pos, dir, plane, showMuscles]);
  const vb = useMemo(() => fitViewBox(pos, VIEW, 30), [pos]);
  const sizes = useMemo(() => (isNarrow
    ? { handleHit: 24, handle: 10, handleActive: 13, jointHit: 22, hitExtra: 18, hitMin: 30 }
    : { handleHit: 14, handle: 7, handleActive: 9, jointHit: 12, hitExtra: 10, hitMin: 18 }), [isNarrow]);

  const { active, onHandleDown, onJointDown, onBoneDown, onMuscleDown } =
    useDragInteraction({ svgRef, rig, chains, posRef, anglesRef, dispatch, isNarrow });

  const onHover = useCallback((f) => setHover(f), []);
  const onJointDouble = useCallback((id) => dispatch({ type: "RESET_JOINT", id }), [dispatch]);
  const onHandleDouble = useCallback((h) => dispatch({ type: "RESET_CHAIN", ids: chains[h].chain }), [dispatch, chains]);
  const onJointKey = useCallback((id, e) => {
    const step = e.shiftKey ? 5 : 1;
    const nudge = (d) => { e.preventDefault(); e.stopPropagation(); dispatch({ type: "NUDGE", id, delta: d, at: Date.now() }); };
    if (e.key === "ArrowRight" || e.key === "ArrowUp") nudge(step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") nudge(-step);
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dispatch({ type: "SELECT", selected: { kind: "joint", id } }); }
  }, [dispatch]);
  const onBackground = useCallback((e) => { if (e.target === svgRef.current) dispatch({ type: "SELECT", selected: null }); }, [dispatch]);

  // The chip follows the hover; selection is shown by highlight only (stage-local hover, panel shows selection).
  const focus = hover || (selected && selected.kind !== "joint" ? selected : null);
  const chip = useMemo(() => {
    if (!focus) return null;
    if (focus.kind === "muscle") { const p = placed.find((x) => x.m.id === focus.id); return p ? { at: { x: p.pl.cx, y: p.pl.cy }, text: p.m.name } : null; }
    if (focus.id === "head") return { at: pos.head, text: BONE_NAME.head };
    if (!rig.byId[focus.id]) return null;
    const s = seg(rig, pos, dir, focus.id);
    return { at: { x: (s.ax + s.bx) / 2, y: (s.ay + s.by) / 2 }, text: BONE_NAME[focus.id] || focus.id };
  }, [focus, placed, pos, dir, rig]);

  const gonio = useMemo(() => (selectedJointId ? goniometer(rig, angles, pos, dir, selectedJointId) : null), [rig, angles, pos, dir, selectedJointId]);
  const activeJoint = active && active.kind === "joint" ? active.id : null;
  const activeEffector = active && active.kind === "ik" ? active.id : null;

  return (
    <div className="ap-stage">
      <svg ref={svgRef} className="ap-svg" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} role="img"
        aria-label={`Articulated figure, ${PLANE_TAG[plane]}`} onPointerDown={onBackground}>
        <defs>
          <radialGradient id="vign" cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor="#182026" /><stop offset="100%" stopColor="#0f1417" />
          </radialGradient>
        </defs>
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#vign)" />
        <line x1={VIEW.midX} y1={vb.y + 16} x2={VIEW.midX} y2={vb.y + vb.h - 16} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 6" opacity="0.7" />
        <line x1={24} y1={VIEW.groundY} x2={396} y2={VIEW.groundY} stroke="var(--line)" strokeWidth="1" opacity="0.7" />
        <text x={vb.x + 30} y={vb.y + 30} className="ap-plane-tag">{PLANE_TAG[plane]}</text>

        {showMuscles && <MuscleLayer placed={placed} focus={focus} dim={layer === "both"} />}
        {showBones && <BoneLayer rig={rig} pos={pos} dir={dir} plane={plane} focus={focus && focus.kind === "bone" ? focus : null}
          selectedJointId={selectedJointId} fingerCurl={fingerCurl} />}
        <HitLayer rig={rig} pos={pos} dir={dir} placed={placed} showBones={showBones} showMuscles={showMuscles}
          hitExtra={sizes.hitExtra} hitMin={sizes.hitMin} onBoneDown={onBoneDown} onMuscleDown={onMuscleDown} onHover={onHover} />
        <AngleOverlay g={gonio} desc={selectedJointId ? descs[selectedJointId] : null} />
        <LabelChip at={chip && chip.at} text={chip && chip.text} viewBox={vb} />
        <Handles rig={rig} pos={pos} chains={chains} descs={descs} activeEffector={activeEffector} activeJoint={activeJoint}
          selectedJointId={selectedJointId} sizes={sizes} onHandleDown={onHandleDown} onHandleDouble={onHandleDouble}
          onJointDown={onJointDown} onJointDouble={onJointDouble} onJointKey={onJointKey} />
      </svg>
      <div className="ap-stage-hint">
        Drag a <b>ring</b> to pose a limb, or drag a <b>joint dot</b> or bone to turn one joint. Hold <span className="ap-kbd">Shift</span> to snap to 5°. Double-click to reset.
      </div>
    </div>
  );
}
