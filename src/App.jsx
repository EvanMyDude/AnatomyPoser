import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";

/* =========================================================================
   KINEMATICS  (rig-parameterized; verified in a Node harness before shipping)
   Angles in DEGREES. SVG coords: +x right, +y down. "Up" = -90 deg.
   Two rigs, each with REAL in-plane ROM for its plane:
     CORONAL  = front view.  SAGITTAL = side view (facing +x), single-sided.
   ========================================================================= */
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const PELVIS_FRAME = -90;
const ANCHOR = { x: 210, y: 372 };

const CORONAL_BONES = [
  { id: "pelvis",  parent: null,      len: 0,   nW: -90, rom: [0, 0],     ik: false },
  { id: "spineLo", parent: "pelvis",  len: 64,  nW: -90, rom: [-30, 30],  ik: true },
  { id: "spineUp", parent: "spineLo", len: 58,  nW: -90, rom: [-20, 20],  ik: true },
  { id: "neck",    parent: "spineUp", len: 28,  nW: -90, rom: [-45, 45],  ik: true },
  { id: "head",    parent: "neck",    len: 30,  nW: -90, rom: [0, 0],     ik: false },
  { id: "clavL",   parent: "spineUp", len: 60,  nW: 202, rom: [0, 0],     ik: false },
  { id: "uarmL",   parent: "clavL",   len: 86,  nW: 93,  rom: [-50, 180], ik: true },
  { id: "farmL",   parent: "uarmL",   len: 72,  nW: 93,  rom: [-145, 5],  ik: true },
  { id: "handL",   parent: "farmL",   len: 38,  nW: 93,  rom: [-20, 30],  ik: true },
  { id: "clavR",   parent: "spineUp", len: 60,  nW: -22, rom: [0, 0],     ik: false },
  { id: "uarmR",   parent: "clavR",   len: 86,  nW: 87,  rom: [-180, 50], ik: true },
  { id: "farmR",   parent: "uarmR",   len: 72,  nW: 87,  rom: [-5, 145],  ik: true },
  { id: "handR",   parent: "farmR",   len: 38,  nW: 87,  rom: [-30, 20],  ik: true },
  { id: "hipL",    parent: "pelvis",  len: 34,  nW: 150, rom: [0, 0],     ik: false },
  { id: "thighL",  parent: "hipL",    len: 104, nW: 91,  rom: [-30, 45],  ik: true },
  { id: "shinL",   parent: "thighL",  len: 96,  nW: 91,  rom: [-135, 0],  ik: true },
  { id: "footL",   parent: "shinL",   len: 30,  nW: 155, rom: [0, 0],     ik: true },
  { id: "hipR",    parent: "pelvis",  len: 34,  nW: 30,  rom: [0, 0],     ik: false },
  { id: "thighR",  parent: "hipR",    len: 104, nW: 89,  rom: [-45, 30],  ik: true },
  { id: "shinR",   parent: "thighR",  len: 96,  nW: 89,  rom: [0, 135],   ik: true },
  { id: "footR",   parent: "shinR",   len: 30,  nW: 25,  rom: [0, 0],     ik: true },
];
const SAGITTAL_BONES = [
  { id: "pelvis",  parent: null,      len: 0,   nW: -90, rom: [0, 0],     ik: false },
  { id: "spineLo", parent: "pelvis",  len: 64,  nW: -90, rom: [-20, 45],  ik: true },
  { id: "spineUp", parent: "spineLo", len: 58,  nW: -90, rom: [-10, 30],  ik: true },
  { id: "neck",    parent: "spineUp", len: 28,  nW: -90, rom: [-60, 50],  ik: true },
  { id: "head",    parent: "neck",    len: 30,  nW: -90, rom: [0, 0],     ik: false },
  { id: "clavL",   parent: "spineUp", len: 23,  nW: -70, rom: [0, 0],     ik: false },
  { id: "uarmL",   parent: "clavL",   len: 86,  nW: 90,  rom: [-180, 60], ik: true },
  { id: "farmL",   parent: "uarmL",   len: 72,  nW: 90,  rom: [-145, 5],  ik: true },
  { id: "handL",   parent: "farmL",   len: 38,  nW: 90,  rom: [-80, 70],  ik: true },
  { id: "hipL",    parent: "pelvis",  len: 8,   nW: 90,  rom: [0, 0],     ik: false },
  { id: "thighL",  parent: "hipL",    len: 104, nW: 90,  rom: [-120, 20], ik: true },
  { id: "shinL",   parent: "thighL",  len: 96,  nW: 90,  rom: [0, 135],   ik: true },
  { id: "footL",   parent: "shinL",   len: 30,  nW: 0,   rom: [-20, 45],  ik: true },
];

function rigOf(bones) {
  const byId = Object.fromEntries(bones.map(b => [b.id, b]));
  const neutralLocalOf = (id) => {
    const b = byId[id];
    if (b.parent == null) return 0;
    const pW = b.parent === "pelvis" ? PELVIS_FRAME : byId[b.parent].nW;
    return b.nW - pW;
  };
  const boundsOf = (id) => { const nl = neutralLocalOf(id), r = byId[id].rom; return [nl + r[0], nl + r[1]]; };
  const neutralAngles = () => { const a = {}; for (const b of bones) a[b.id] = neutralLocalOf(b.id); return a; };
  const fk = (angles) => {
    const pos = {}, dir = {};
    pos.pelvis = { ...ANCHOR }; dir.pelvis = PELVIS_FRAME;
    for (const b of bones) {
      if (b.parent == null) continue;
      const wd = dir[b.parent] + angles[b.id]; dir[b.id] = wd;
      const r = wd * D2R;
      pos[b.id] = { x: pos[b.parent].x + b.len * Math.cos(r), y: pos[b.parent].y + b.len * Math.sin(r) };
    }
    return { pos, dir };
  };
  return { bones, byId, neutralLocalOf, boundsOf, neutralAngles, fk };
}
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function solveCCD(rig, angles, chain, effectorId, target, iters = 10) {
  const a = { ...angles };
  for (let it = 0; it < iters; it++) {
    for (let i = chain.length - 1; i >= 0; i--) {
      const jid = chain[i];
      const { pos } = rig.fk(a);
      const jp = pos[jid], ep = pos[effectorId];
      const v1x = ep.x - jp.x, v1y = ep.y - jp.y, v2x = target.x - jp.x, v2y = target.y - jp.y;
      if (v1x * v1x + v1y * v1y < 1e-6 || v2x * v2x + v2y * v2y < 1e-6) continue;
      const d = Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y) * R2D;
      const [lo, hi] = rig.boundsOf(jid);
      a[jid] = clamp(a[jid] + d, lo, hi);
    }
  }
  return a;
}
// single-joint incremental rotate (isolate): rotates ONLY boneId, clamped.
function aimJoint(rig, angles, boneId, target) {
  const a = { ...angles };
  const { pos } = rig.fk(a);
  const b = rig.byId[boneId];
  const P = pos[b.parent], E = pos[boneId];
  const v1x = E.x - P.x, v1y = E.y - P.y, v2x = target.x - P.x, v2y = target.y - P.y;
  if (v1x * v1x + v1y * v1y < 1e-6 || v2x * v2x + v2y * v2y < 1e-6) return a;
  const delta = Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y) * R2D;
  const [lo, hi] = rig.boundsOf(boneId);
  a[boneId] = clamp(a[boneId] + delta, lo, hi);
  return a;
}

const RIGS = { coronal: rigOf(CORONAL_BONES), sagittal: rigOf(SAGITTAL_BONES) };
const CHAINS = {
  coronal: {
    head:  { chain: ["spineLo", "spineUp", "neck"], effector: "head",  label: "Head / spine" },
    handL: { chain: ["uarmL", "farmL", "handL"],    effector: "handL", label: "Left hand" },
    handR: { chain: ["uarmR", "farmR", "handR"],    effector: "handR", label: "Right hand" },
    footL: { chain: ["thighL", "shinL", "footL"],   effector: "footL", label: "Left foot" },
    footR: { chain: ["thighR", "shinR", "footR"],   effector: "footR", label: "Right foot" },
  },
  sagittal: {
    head:  { chain: ["spineLo", "spineUp", "neck"], effector: "head",  label: "Head / spine" },
    handL: { chain: ["uarmL", "farmL", "handL"],    effector: "handL", label: "Hand" },
    footL: { chain: ["thighL", "shinL", "footL"],   effector: "footL", label: "Foot" },
  },
};

/* =========================================================================
   LABELS
   ========================================================================= */
const BONE_NAME = {
  head: "Cranium", neck: "Cervical vertebrae", spineUp: "Thoracic vertebrae",
  spineLo: "Lumbar vertebrae", clavL: "Clavicle", clavR: "Clavicle",
  uarmL: "Humerus", uarmR: "Humerus", farmL: "Radius & ulna", farmR: "Radius & ulna",
  handL: "Carpals & metacarpals", handR: "Carpals & metacarpals",
  hipL: "Ilium (pelvis)", hipR: "Ilium (pelvis)", thighL: "Femur", thighR: "Femur",
  shinL: "Tibia & fibula", shinR: "Tibia & fibula",
  footL: "Tarsals & metatarsals", footR: "Tarsals & metatarsals",
};
const typeOf = (id) => {
  if (id.startsWith("uarm")) return "shoulder";
  if (id.startsWith("farm")) return "elbow";
  if (id.startsWith("hand")) return "wrist";
  if (id.startsWith("thigh")) return "hip";
  if (id.startsWith("shin")) return "knee";
  if (id.startsWith("foot")) return "ankle";
  return id; // neck, spineLo, spineUp
};
const TYPE_NAME = {
  neck: "Neck", spineLo: "Spine (lower)", spineUp: "Spine (upper)",
  shoulder: "Shoulder", elbow: "Elbow", wrist: "Wrist", hip: "Hip", knee: "Knee", ankle: "Ankle",
};
const sideOf = (id) => (id.endsWith("L") && typeOf(id) !== id ? " (L)" : id.endsWith("R") ? " (R)" : "");
const jointLabel = (id, plane) => TYPE_NAME[typeOf(id)] + (plane === "coronal" ? sideOf(id) : "");
const NOTE = {
  coronal: {
    neck: "lateral flexion", spineLo: "lateral flexion", spineUp: "lateral flexion",
    shoulder: "abduction / adduction", elbow: "flexion",
    wrist: "radial / ulnar deviation", hip: "abduction / adduction",
    knee: "flexion", ankle: "fixed — motion is sagittal",
  },
  sagittal: {
    neck: "flexion / extension", spineLo: "flexion / extension", spineUp: "flexion / extension",
    shoulder: "flexion / extension", elbow: "flexion (no hyperext.)",
    wrist: "flexion / extension", hip: "flexion / extension",
    knee: "flexion", ankle: "dorsi / plantarflexion",
  },
};
const noteFor = (id, plane) => NOTE[plane][typeOf(id)];

// muscles: cor + optional sag placement {t,off,len,wid}. Rendered only if the
// plane placement exists AND the bone is in the active rig.
const MUSCLES = [
  { id: "scmL", bone: "neck", name: "Sternocleidomastoid", cor: { t: .5, off: -9, len: 26, wid: 8 }, sag: { t: .5, off: 7, len: 22, wid: 7 } },
  { id: "scmR", bone: "neck", name: "Sternocleidomastoid", cor: { t: .5, off: 9, len: 26, wid: 8 } },
  { id: "pecL", bone: "spineUp", name: "Pectoralis major", cor: { t: .25, off: -26, len: 40, wid: 26 }, sag: { t: .28, off: 20, len: 34, wid: 22 } },
  { id: "pecR", bone: "spineUp", name: "Pectoralis major", cor: { t: .25, off: 26, len: 40, wid: 26 } },
  { id: "abs", bone: "spineLo", name: "Rectus abdominis", cor: { t: .5, off: 0, len: 56, wid: 30 }, sag: { t: .5, off: 15, len: 34, wid: 24 } },
  { id: "oblL", bone: "spineLo", name: "External oblique", cor: { t: .45, off: -26, len: 40, wid: 16 }, sag: { t: .5, off: 22, len: 34, wid: 16 } },
  { id: "oblR", bone: "spineLo", name: "External oblique", cor: { t: .45, off: 26, len: 40, wid: 16 } },
  { id: "deltL", bone: "uarmL", name: "Deltoid", cor: { t: .14, off: 0, len: 34, wid: 26 }, sag: { t: .14, off: 0, len: 32, wid: 26 } },
  { id: "deltR", bone: "uarmR", name: "Deltoid", cor: { t: .14, off: 0, len: 34, wid: 26 } },
  { id: "bicL", bone: "uarmL", name: "Biceps brachii", cor: { t: .55, off: 0, len: 44, wid: 18 }, sag: { t: .55, off: -9, len: 44, wid: 16 } },
  { id: "bicR", bone: "uarmR", name: "Biceps brachii", cor: { t: .55, off: 0, len: 44, wid: 18 } },
  { id: "brL", bone: "farmL", name: "Brachioradialis", cor: { t: .45, off: 0, len: 40, wid: 16 }, sag: { t: .45, off: -6, len: 40, wid: 14 } },
  { id: "brR", bone: "farmR", name: "Brachioradialis", cor: { t: .45, off: 0, len: 40, wid: 16 } },
  { id: "quadL", bone: "thighL", name: "Quadriceps femoris", cor: { t: .5, off: 0, len: 66, wid: 26 }, sag: { t: .5, off: -9, len: 60, wid: 24 } },
  { id: "quadR", bone: "thighR", name: "Quadriceps femoris", cor: { t: .5, off: 0, len: 66, wid: 26 } },
  { id: "tibL", bone: "shinL", name: "Tibialis anterior", cor: { t: .45, off: -6, len: 52, wid: 14 }, sag: { t: .45, off: -7, len: 50, wid: 14 } },
  { id: "tibR", bone: "shinR", name: "Tibialis anterior", cor: { t: .45, off: 6, len: 52, wid: 14 } },
];

/* =========================================================================
   THEME
   ========================================================================= */
const C = {
  bg: "#0f1417", panel: "#151b1f", panel2: "#1b2329", line: "#2a353c",
  ink: "#e8ede9", sub: "#8a9aa2", faint: "#5c6b72",
  bone: "#e9e4d6", boneEdge: "#b8b09a", muscle: "#a6485a", muscleEdge: "#7d3444",
  accent: "#38d0c8", accentDim: "#1e6f6b", warn: "#e8b04b", handle: "#38d0c8",
};

/* =========================================================================
   COMPONENT
   ========================================================================= */
export default function AnatomyPoser() {
  const [plane, setPlane] = useState("coronal");
  const [mode, setMode] = useState("pose"); // pose | isolate
  const [layer, setLayer] = useState("both"); // bones | muscles | both
  const [anglesByView, setAnglesByView] = useState(() => ({
    coronal: RIGS.coronal.neutralAngles(),
    sagittal: RIGS.sagittal.neutralAngles(),
  }));
  const [fingerCurl, setFingerCurl] = useState(0);
  const [hovered, setHovered] = useState(null);   // {kind,id,name}
  const [selected, setSelected] = useState(null);
  const [isoJoint, setIsoJoint] = useState(null); // bone id
  const [dragHandle, setDragHandle] = useState(null);
  const [isoDrag, setIsoDrag] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const on = () => setIsNarrow(mq.matches);
    on(); mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on); };
  }, []);

  const rig = RIGS[plane];
  const angles = anglesByView[plane];
  const { pos, dir } = useMemo(() => rig.fk(angles), [rig, angles]);
  const focus = hovered || selected;
  const showBones = layer === "bones" || layer === "both";
  const showMuscles = layer === "muscles" || layer === "both";
  // larger hit targets on touch / narrow screens
  const HANDLE_HIT = isNarrow ? 24 : 14;
  const HANDLE_R = isNarrow ? 10 : 7;
  const HANDLE_R_ACTIVE = isNarrow ? 13 : 9;
  const hitExtra = isNarrow ? 18 : 10;
  const hitMin = isNarrow ? 30 : 18;

  const setAngles = useCallback((updater) => {
    setAnglesByView((prev) => ({ ...prev, [plane]: updater(prev[plane]) }));
  }, [plane]);

  // set a joint's angle from its inspector slider (value is relative to neutral)
  const setJointRel = useCallback((id, relVal) => {
    const nl = rig.neutralLocalOf(id);
    const [lo, hi] = rig.boundsOf(id);
    setAngles((prev) => ({ ...prev, [id]: clamp(nl + relVal, lo, hi) }));
    setSelected({ kind: "joint", id, name: jointLabel(id, plane) });
  }, [rig, setAngles, plane]);

  const toSvg = useCallback((cx, cy) => {
    const svg = svgRef.current; if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    const m = svg.getScreenCTM(); if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const capture = (e) => svgRef.current?.setPointerCapture?.(e.pointerId);

  // ---- pose-mode handle drag (CCD) ----
  const onHandleDown = (h) => (e) => {
    e.stopPropagation(); capture(e); setDragHandle(h);
  };
  // ---- isolate-mode joint grab (single-joint rotate) ----
  const grabJoint = (boneId, e) => {
    if (!rig.byId[boneId] || !rig.byId[boneId].ik) return false;
    e.stopPropagation(); capture(e);
    setHovered(null);
    setIsoJoint(boneId);
    setSelected({ kind: "joint", id: boneId, name: jointLabel(boneId, plane) });
    setIsoDrag(true);
    return true;
  };
  const onBoneDown = (b) => (e) => {
    if (mode === "isolate") { grabJoint(b.id, e); return; }
    if (showBones) {
      e.stopPropagation();
      setSelected({ kind: "bone", id: b.id, name: BONE_NAME[b.id] });
    }
  };
  const onMove = (e) => {
    if (dragHandle) {
      const t = toSvg(e.clientX, e.clientY); if (!t) return;
      const { chain, effector } = CHAINS[plane][dragHandle];
      setAngles((prev) => solveCCD(rig, prev, chain, effector, t, 10));
    } else if (isoDrag && isoJoint) {
      const t = toSvg(e.clientX, e.clientY); if (!t) return;
      setAngles((prev) => aimJoint(rig, prev, isoJoint, t));
    }
  };
  const endDrag = () => { setDragHandle(null); setIsoDrag(false); };

  const switchPlane = (p) => {
    if (p === plane) return;
    setPlane(p); setSelected(null); setHovered(null); setIsoJoint(null); setDragHandle(null); setIsoDrag(false);
  };
  const switchMode = (m) => {
    setMode(m); setDragHandle(null); setIsoDrag(false);
    if (m === "pose") setIsoJoint(null);
  };
  const reset = () => {
    setAngles(() => rig.neutralAngles());
    setFingerCurl(0);
  };

  const activeChain = dragHandle ? CHAINS[plane][dragHandle].chain : [];
  const focusJointId = isoJoint || (dragHandle ? activeChain[activeChain.length - 1] : null);

  // ---- geometry helpers ----
  const seg = (id) => { const b = rig.byId[id], a = pos[b.parent], c = pos[id]; return { ax: a.x, ay: a.y, bx: c.x, by: c.y, ang: dir[id] }; };
  const musclePlace = (m) => {
    const p = plane === "sagittal" ? m.sag : m.cor;
    const s = seg(m.bone);
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const cx = s.ax + dx * p.t, cy = s.ay + dy * p.t;
    const pr = (s.ang + 90) * D2R;
    return { cx: cx + Math.cos(pr) * p.off, cy: cy + Math.sin(pr) * p.off, ang: s.ang, p };
  };
  const isFocus = (kind, id) => focus && focus.kind === kind && focus.id === id;
  const hoverBone = (id) => ({
    onPointerEnter: () => showBones && setHovered({ kind: "bone", id, name: BONE_NAME[id] }),
    onPointerLeave: () => setHovered(null),
  });

  const boneWidth = (id) =>
    id.startsWith("spine") ? 11 : id === "neck" ? 9 :
    (id.startsWith("thigh") || id.startsWith("shin")) ? 11 :
    (id.startsWith("uarm") || id.startsWith("farm")) ? 8.5 : 7;

  const renderFingers = (handId) => {
    if (!rig.byId[handId]) return null;
    const base = pos[handId], baseAng = dir[handId], curlR = fingerCurl * D2R;
    return [-18, -6, 6, 18].map((off, i) => {
      const a0 = (baseAng + off) * D2R, l1 = 12, l2 = 11;
      const j = { x: base.x + Math.cos(a0) * l1, y: base.y + Math.sin(a0) * l1 };
      const a1 = a0 + curlR;
      const tip = { x: j.x + Math.cos(a1) * l2, y: j.y + Math.sin(a1) * l2 };
      return <polyline key={i} points={`${base.x},${base.y} ${j.x},${j.y} ${tip.x},${tip.y}`}
        fill="none" stroke={C.bone} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />;
    });
  };

  const poseHandles = mode === "pose" ? Object.keys(CHAINS[plane]) : [];
  const isoBones = rig.bones.filter(b => b.ik);

  return (
    <div style={{ ...S.root, flexDirection: isNarrow ? "column" : "row" }}>
      <style>{CSS}</style>

      {/* ---------------- stage ---------------- */}
      <div style={{ ...S.stage, ...(isNarrow
          ? { padding: "10px 10px 4px", minHeight: 0 }
          /* Wide layout: pin the stage to the viewport so the figure stays in view
             while the (taller) joint panel scrolls with the page. */
          : { position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh", minHeight: 0 }) }}>
        <svg ref={svgRef} viewBox="0 0 420 640"
          style={{ ...S.svg, ...(isNarrow
            ? { height: "56vh", width: "auto", maxWidth: "100%", maxHeight: "56vh" }
            : { height: "min(700px, calc(100vh - 72px))", width: "auto", maxWidth: "100%" }) }}
          onPointerMove={onMove} onPointerUp={endDrag} onPointerLeave={endDrag}
          onPointerDown={() => setSelected(null)}>
          <defs>
            <radialGradient id="vign" cx="50%" cy="42%" r="72%">
              <stop offset="0%" stopColor="#182026" /><stop offset="100%" stopColor={C.bg} />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="420" height="640" fill="url(#vign)" />
          <line x1="210" y1="16" x2="210" y2="624" stroke={C.line} strokeWidth="1" strokeDasharray="2 6" opacity="0.7" />
          <line x1="24" y1="612" x2="396" y2="612" stroke={C.line} strokeWidth="1" opacity="0.7" />
          <text x="30" y="30" style={S.planeTag}>{plane === "coronal" ? "CORONAL · front view" : "SAGITTAL · side view (facing →)"}</text>

          {/* MUSCLES (visual only; hit-testing is a separate top layer) */}
          {showMuscles && (
            <g opacity={layer === "both" ? 0.9 : 1} pointerEvents="none">
              {MUSCLES.map((m) => {
                if (!rig.byId[m.bone]) return null;
                if (plane === "sagittal" && !m.sag) return null;
                const pl = musclePlace(m), on = isFocus("muscle", m.id);
                return <ellipse key={m.id} cx={pl.cx} cy={pl.cy} rx={pl.p.len / 2} ry={pl.p.wid / 2}
                  transform={`rotate(${pl.ang} ${pl.cx} ${pl.cy})`}
                  fill={on ? C.accent : C.muscle} stroke={on ? "#fff" : C.muscleEdge}
                  strokeWidth={on ? 2 : 1} opacity={on ? 0.95 : 0.82} />;
              })}
            </g>
          )}

          {/* BONES (visible) */}
          {showBones && (
            <g>
              {rig.bones.map((b) => {
                if (b.parent == null || b.len === 0) return null;
                const s = seg(b.id), on = isFocus("bone", b.id) || (mode === "isolate" && isoJoint === b.id);
                const w = boneWidth(b.id);
                return (
                  <g key={b.id}>
                    <line x1={s.ax} y1={s.ay} x2={s.bx} y2={s.by} stroke={on ? C.accent : C.bone}
                      strokeWidth={w + (on ? 3 : 0)} strokeLinecap="round" opacity={on ? 1 : 0.96} />
                    <line x1={s.ax} y1={s.ay} x2={s.bx} y2={s.by} stroke={on ? C.accent : C.boneEdge}
                      strokeWidth={0.8} strokeLinecap="round" opacity={0.5} />
                  </g>
                );
              })}
              {(() => { const on = isFocus("bone", "head");
                return <circle cx={pos.head.x} cy={pos.head.y} r={26} fill={C.bg}
                  stroke={on ? C.accent : C.bone} strokeWidth={on ? 6 : 4}
                  style={{ cursor: "pointer" }} {...hoverBone("head")}
                  onPointerDown={(e) => { e.stopPropagation(); if (showBones) setSelected({ kind: "bone", id: "head", name: BONE_NAME.head }); }} />; })()}
              {plane === "sagittal" && (
                <path d={`M ${pos.head.x + 24} ${pos.head.y - 5} l 8 6 l -8 6 z`} fill={C.bone} opacity={0.85} pointerEvents="none" />
              )}
              {isoBones.map(b => (
                <circle key={"k" + b.id} cx={pos[b.id].x} cy={pos[b.id].y} r={3} fill={C.bg}
                  stroke={C.boneEdge} strokeWidth={1.4} pointerEvents="none" />
              ))}
              {renderFingers("handL")}
              {renderFingers("handR")}
            </g>
          )}

          {/* ik-bone hit lines (grab in isolate; label in bone view). Below muscle hits. */}
          {rig.bones.map((b) => {
            if (b.parent == null || b.len === 0) return null;
            const need = b.ik ? (showBones || mode === "isolate") : showBones;
            if (!need) return null;
            const s = seg(b.id);
            const grab = mode === "isolate" && b.ik;
            return <line key={"hit" + b.id} x1={s.ax} y1={s.ay} x2={s.bx} y2={s.by}
              stroke="transparent" strokeWidth={Math.max(boneWidth(b.id) + hitExtra, hitMin)} strokeLinecap="round"
              style={{ cursor: grab ? "grab" : "pointer" }} {...hoverBone(b.id)} onPointerDown={onBoneDown(b)} />;
          })}

          {/* muscle hit layer: transparent, ON TOP of bone hits so the whole
              ellipse is reliably hoverable/tappable. Matches the visual exactly. */}
          {showMuscles && MUSCLES.map((m) => {
            if (!rig.byId[m.bone]) return null;
            if (plane === "sagittal" && !m.sag) return null;
            const pl = musclePlace(m);
            const canGrab = mode === "isolate" && rig.byId[m.bone].ik;
            return <ellipse key={"mh" + m.id} cx={pl.cx} cy={pl.cy} rx={pl.p.len / 2} ry={pl.p.wid / 2}
              transform={`rotate(${pl.ang} ${pl.cx} ${pl.cy})`} fill="transparent"
              style={{ cursor: canGrab ? "grab" : "pointer" }}
              onPointerEnter={() => setHovered({ kind: "muscle", id: m.id, name: m.name })}
              onPointerLeave={() => setHovered(null)}
              onPointerDown={(e) => {
                if (mode === "isolate" && grabJoint(m.bone, e)) return;
                e.stopPropagation(); setSelected({ kind: "muscle", id: m.id, name: m.name });
              }} />;
          })}

          {/* isolate: pivot dots + active pivot ring */}
          {mode === "isolate" && (
            <g pointerEvents="none">
              {isoBones.map(b => (
                <circle key={"pv" + b.id} cx={pos[rig.byId[b.id].parent].x} cy={pos[rig.byId[b.id].parent].y}
                  r={isoJoint === b.id ? 6 : 3.5} fill="none"
                  stroke={isoJoint === b.id ? C.accent : C.faint} strokeWidth={isoJoint === b.id ? 2 : 1.4} />
              ))}
            </g>
          )}

          {/* label chip */}
          {focus && (() => {
            let lx, ly;
            if (focus.kind === "muscle") { const m = MUSCLES.find(x => x.id === focus.id); const p = musclePlace(m); lx = p.cx; ly = p.cy; }
            else if (focus.id === "head") { lx = pos.head.x; ly = pos.head.y; }
            else { const s = seg(focus.id); lx = (s.ax + s.bx) / 2; ly = (s.ay + s.by) / 2; }
            const w = focus.name.length * 6.6 + 16;
            const bx = Math.min(Math.max(lx - w / 2, 6), 420 - w - 6), by = Math.max(ly - 26, 14);
            return <g pointerEvents="none">
              <rect x={bx} y={by - 12} width={w} height={18} rx={3} fill="#0b1013" stroke={C.accent} strokeWidth={1} opacity={0.96} />
              <text x={bx + w / 2} y={by + 1} style={S.chipText}>{focus.name}</text>
            </g>;
          })()}

          {/* pose handles */}
          {poseHandles.map((h) => {
            const id = CHAINS[plane][h].effector, active = dragHandle === h;
            return <g key={h}>
              <circle cx={pos[id].x} cy={pos[id].y} r={HANDLE_HIT} fill="transparent" style={{ cursor: "grab" }} onPointerDown={onHandleDown(h)} />
              <circle cx={pos[id].x} cy={pos[id].y} r={active ? HANDLE_R_ACTIVE : HANDLE_R} fill={active ? C.accent : "none"} stroke={C.handle} strokeWidth={2} pointerEvents="none" opacity={0.95} />
              <circle cx={pos[id].x} cy={pos[id].y} r={2} fill={C.handle} pointerEvents="none" />
            </g>;
          })}
        </svg>

        <div style={S.stageHint}>
          {mode === "pose"
            ? <>Drag the <span style={{ color: C.accent }}>◉</span> handles. Each joint stops at its {plane} limit.</>
            : <>Grab a <b style={{ color: C.ink }}>bone segment</b> and drag — only that joint rotates, clamped to its ROM.</>}
        </div>
      </div>

      {/* ---------------- panel ---------------- */}
      <aside style={{ ...S.panel, ...(isNarrow ? { flex: "1 1 auto", width: "100%", borderLeft: "none", borderTop: `1px solid ${C.line}` } : {}) }}>
        <div style={S.head}>
          <div style={S.kicker}>ANATOMY · RANGE OF MOTION</div>
          <h1 style={S.title}>Articulated figure</h1>
        </div>

        <Row label="Plane">
          <Seg options={[["coronal", "Coronal"], ["sagittal", "Sagittal"]]} value={plane} onChange={switchPlane} />
        </Row>
        <Row label="Mode">
          <Seg options={[["pose", "Pose"], ["isolate", "Isolate"]]} value={mode} onChange={switchMode} />
        </Row>
        <Row label="Layer">
          <Seg options={[["bones", "Bones"], ["muscles", "Muscles"], ["both", "Both"]]} value={layer} onChange={setLayer} />
        </Row>

        <button className="reset" onClick={reset}>Reset {plane} to neutral</button>

        <div style={S.selBox}>
          {focus
            ? <><span style={S.selKind}>{focus.kind === "muscle" ? "MUSCLE" : focus.kind === "joint" ? "JOINT" : "BONE"}</span>
                <span style={S.selName}>{focus.name}</span>
                {focus.kind === "joint" && <span style={S.selNote}>· {noteFor(focus.id, plane)}</span>}</>
            : <span style={S.selHint}>{mode === "isolate" ? "Grab a bone to select a joint." : "Hover or tap a bone or muscle."}</span>}
        </div>

        {/* focus-joint live readout */}
        <div style={{ ...S.readout, opacity: focusJointId ? 1 : 0.4 }}>
          {focusJointId ? (() => {
            const [lo, hi] = rig.boundsOf(focusJointId), v = angles[focusJointId], nl = rig.neutralLocalOf(focusJointId);
            const rel = v - nl, relLo = lo - nl, relHi = hi - nl;
            const atLimit = Math.abs(v - lo) < 0.6 || Math.abs(v - hi) < 0.6;
            const frac = clamp((v - lo) / (hi - lo || 1), 0, 1);
            return <>
              <div style={S.readHead}>{jointLabel(focusJointId, plane)} · {noteFor(focusJointId, plane)}</div>
              <div style={S.readBig}>
                <span style={{ color: atLimit ? C.warn : C.ink }}>{rel >= 0 ? "+" : ""}{rel.toFixed(0)}°</span>
                {atLimit && <span style={S.limitTag}>AT LIMIT</span>}
              </div>
              <div style={S.bar}><div style={S.barFill} />
                <div style={{ ...S.barMark, left: `${frac * 100}%`, background: atLimit ? C.warn : C.accent }} /></div>
              <div style={S.jlims}><span>min {relLo.toFixed(0)}°</span><span>max {relHi.toFixed(0)}°</span></div>
            </>;
          })() : <div style={S.readHead}>{mode === "isolate" ? "Select a joint to inspect it" : "Drag a handle to inspect its chain"}</div>}
        </div>

        {/* joint table */}
        <div style={S.tableWrap}>
          <div style={S.tableHead}><span>JOINT — {plane}</span><span>ANGLE</span></div>
          <div style={{ ...S.tableBody, ...(isNarrow ? { maxHeight: 280 } : {}) }} className="scroll">
            {isoBones.map((b) => {
              const [lo, hi] = rig.boundsOf(b.id), v = angles[b.id], nl = rig.neutralLocalOf(b.id);
              const rel = v - nl, relLo = lo - nl, relHi = hi - nl;
              const atLimit = Math.abs(v - lo) < 0.6 || Math.abs(v - hi) < 0.6;
              const locked = Math.abs(hi - lo) < 0.6;
              const active = isoJoint === b.id || activeChain.includes(b.id);
              return (
                <div key={b.id} style={{ ...S.jrow, background: active ? C.panel2 : "transparent",
                  outline: active ? `1px solid ${C.accentDim}` : "none" }}
                  onPointerEnter={() => setHovered({ kind: "joint", id: b.id, name: jointLabel(b.id, plane) })}
                  onPointerLeave={() => setHovered(null)}>
                  <div style={S.jtop}>
                    <span style={S.jname}>{jointLabel(b.id, plane)}</span>
                    <span style={{ ...S.jang, color: locked ? C.faint : atLimit ? C.warn : C.ink }}>
                      {locked ? "—" : `${rel >= 0 ? "+" : ""}${rel.toFixed(0)}°`}
                    </span>
                  </div>
                  <div style={S.jnote}>{noteFor(b.id, plane)}</div>
                  {locked
                    ? <div style={S.lockRow}>fixed in {plane} plane</div>
                    : <>
                        <div style={S.sliderWrap}>
                          <div style={S.track} />
                          {relLo < 0 && relHi > 0 &&
                            <div style={{ ...S.neutralTick, left: `${((0 - relLo) / (relHi - relLo)) * 100}%` }} />}
                          <input type="range" min={Math.round(relLo)} max={Math.round(relHi)} step={1}
                            value={Math.round(rel)} className="jslider" data-lim={atLimit ? "1" : "0"}
                            aria-label={`${jointLabel(b.id, plane)} angle`}
                            onChange={(e) => setJointRel(b.id, +e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()} />
                        </div>
                        <div style={S.jlims}><span>{relLo.toFixed(0)}°</span><span>{relHi.toFixed(0)}°</span></div>
                      </>}
                </div>
              );
            })}
          </div>
        </div>

        {/* finger curl */}
        <div style={S.finger}>
          <div style={S.fingerTop}><span style={S.jname}>Finger curl (MCP)</span><span style={S.jang}>{fingerCurl.toFixed(0)}°</span></div>
          <input type="range" min={0} max={90} value={fingerCurl} onChange={(e) => setFingerCurl(+e.target.value)} className="slider" />
          <div style={S.jlims}><span>0°</span><span>90°</span></div>
        </div>

        <div style={S.foot}>
          ROM = approximate AAOS/AMA-style norms, each shown in its own plane
          (coronal = frontal-plane motion, sagittal = side-plane motion). Teaching
          model, not clinical data. Sagittal is a single-sided profile.
        </div>
      </aside>
    </div>
  );
}

/* ---- small UI helpers ---- */
function Row({ label, children }) {
  return <div style={S.ctrlRow}><span style={S.ctrlLabel}>{label}</span>{children}</div>;
}
function Seg({ options, value, onChange }) {
  return <div style={S.seg}>
    {options.map(([v, lbl]) => (
      <button key={v} className="segbtn" data-on={value === v} onClick={() => onChange(v)}>{lbl}</button>
    ))}
  </div>;
}

/* =========================================================================
   STYLES
   ========================================================================= */
const S = {
  root: { display: "flex", flexWrap: "wrap", minHeight: 560, height: "100%", background: C.bg, color: C.ink,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" },
  stage: { flex: "1 1 380px", minWidth: 300, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: 16, position: "relative" },
  svg: { width: "100%", maxWidth: 460, height: "auto", touchAction: "none", userSelect: "none", display: "block" },
  stageHint: { marginTop: 8, fontSize: 12, color: C.faint, textAlign: "center", maxWidth: 390 },
  planeTag: { fill: C.faint, fontSize: 9, letterSpacing: 1.4, fontFamily: "ui-monospace, Menlo, monospace" },
  chipText: { fill: C.ink, fontSize: 11, textAnchor: "middle", fontWeight: 600, fontFamily: "system-ui, sans-serif" },

  panel: { flex: "0 0 336px", width: 336, maxWidth: "100%", background: C.panel, borderLeft: `1px solid ${C.line}`,
    padding: 18, display: "flex", flexDirection: "column", gap: 11, boxSizing: "border-box" },
  head: { display: "flex", flexDirection: "column", gap: 2 },
  kicker: { fontSize: 10, letterSpacing: 2, color: C.accent, fontFamily: "ui-monospace, Menlo, monospace" },
  title: { margin: 0, fontSize: 22, fontWeight: 650, letterSpacing: -0.3 },

  ctrlRow: { display: "flex", alignItems: "center", gap: 10 },
  ctrlLabel: { fontSize: 10, letterSpacing: 1.4, color: C.faint, width: 42, flexShrink: 0,
    fontFamily: "ui-monospace, Menlo, monospace" },
  seg: { display: "flex", gap: 4, background: C.panel2, padding: 4, borderRadius: 8, flex: 1 },

  selBox: { display: "flex", alignItems: "baseline", gap: 7, minHeight: 22, padding: "6px 10px",
    background: C.panel2, borderRadius: 8, border: `1px solid ${C.line}`, flexWrap: "wrap" },
  selKind: { fontSize: 9, letterSpacing: 1.5, color: C.accent, fontFamily: "ui-monospace, Menlo, monospace" },
  selName: { fontSize: 14, fontWeight: 600 }, selNote: { fontSize: 11, color: C.sub },
  selHint: { fontSize: 12, color: C.faint },

  readout: { background: C.panel2, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.line}`, transition: "opacity .15s" },
  readHead: { fontSize: 11, color: C.sub, fontFamily: "ui-monospace, Menlo, monospace" },
  readBig: { display: "flex", alignItems: "center", gap: 8, fontSize: 26, fontWeight: 700, margin: "2px 0 6px",
    fontFamily: "ui-monospace, Menlo, monospace" },
  limitTag: { fontSize: 9, letterSpacing: 1, color: C.warn, border: `1px solid ${C.warn}`, borderRadius: 3, padding: "1px 5px" },

  tableWrap: { display: "flex", flexDirection: "column", minHeight: 90, flex: "1 1 auto" },
  tableHead: { display: "flex", justifyContent: "space-between", fontSize: 9, letterSpacing: 1.2, color: C.faint,
    padding: "0 2px 6px", fontFamily: "ui-monospace, Menlo, monospace", textTransform: "uppercase" },
  tableBody: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, paddingRight: 2 },
  jrow: { padding: "6px 8px", borderRadius: 6 },
  jtop: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  jname: { fontSize: 13, fontWeight: 600 },
  jang: { fontSize: 13, fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 600 },
  jnote: { fontSize: 10.5, color: C.faint, marginTop: 1 },
  bar: { position: "relative", height: 4, background: "#0c1114", borderRadius: 3, marginTop: 6, border: `1px solid ${C.line}` },
  barFill: { position: "absolute", inset: 0, background: C.accentDim, opacity: 0.25, borderRadius: 3 },
  barMark: { position: "absolute", top: -3, width: 3, height: 8, borderRadius: 2, transform: "translateX(-50%)" },
  sliderWrap: { position: "relative", height: 18, marginTop: 6, display: "flex", alignItems: "center" },
  track: { position: "absolute", left: 0, right: 0, top: "50%", height: 4, transform: "translateY(-50%)",
    background: "#0c1114", border: `1px solid ${C.line}`, borderRadius: 3, pointerEvents: "none" },
  neutralTick: { position: "absolute", top: 2, width: 2, height: 14, transform: "translateX(-50%)",
    background: C.sub, opacity: 0.55, borderRadius: 1, pointerEvents: "none" },
  lockRow: { fontSize: 10.5, color: C.faint, fontStyle: "italic", marginTop: 6, fontFamily: "ui-monospace, Menlo, monospace" },
  jlims: { display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.faint, marginTop: 3,
    fontFamily: "ui-monospace, Menlo, monospace" },

  finger: { background: C.panel2, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.line}` },
  fingerTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 },
  foot: { fontSize: 10.5, color: C.faint, lineHeight: 1.5, borderTop: `1px solid ${C.line}`, paddingTop: 10 },
};

const CSS = `
  .segbtn { flex:1; border:none; background:transparent; color:${C.sub}; font-size:12.5px; padding:7px 4px;
    border-radius:5px; cursor:pointer; font-weight:600; font-family:inherit; }
  .segbtn[data-on="true"] { background:${C.accent}; color:#08110f; }
  .segbtn:focus-visible { outline:2px solid ${C.accent}; outline-offset:1px; }
  .reset { border:1px solid ${C.line}; background:${C.panel2}; color:${C.ink}; font-size:13px; padding:9px;
    border-radius:8px; cursor:pointer; font-weight:600; font-family:inherit; }
  .reset:hover { border-color:${C.accent}; color:${C.accent}; }
  .reset:focus-visible { outline:2px solid ${C.accent}; outline-offset:1px; }
  .scroll::-webkit-scrollbar { width:8px; }
  .scroll::-webkit-scrollbar-thumb { background:${C.line}; border-radius:4px; }
  .slider { width:100%; -webkit-appearance:none; height:4px; border-radius:3px; background:${C.accentDim}; outline:none; }
  .slider::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:${C.accent}; cursor:pointer; border:2px solid ${C.panel}; }
  .slider::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:${C.accent}; cursor:pointer; border:2px solid ${C.panel}; }
  .jslider { position:relative; width:100%; margin:0; -webkit-appearance:none; appearance:none; background:transparent; height:18px; cursor:pointer; z-index:1; }
  .jslider:focus-visible { outline:2px solid ${C.accent}; outline-offset:2px; border-radius:4px; }
  .jslider::-webkit-slider-runnable-track { height:4px; background:transparent; }
  .jslider::-moz-range-track { height:4px; background:transparent; }
  .jslider::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; margin-top:-5px; border-radius:50%; background:${C.accent}; border:2px solid ${C.panel}; cursor:pointer; }
  .jslider::-moz-range-thumb { width:12px; height:12px; border-radius:50%; background:${C.accent}; border:2px solid ${C.panel}; cursor:pointer; }
  .jslider[data-lim="1"]::-webkit-slider-thumb { background:${C.warn}; }
  .jslider[data-lim="1"]::-moz-range-thumb { background:${C.warn}; }
  @media (prefers-reduced-motion: reduce) { * { transition:none !important; } }
  @media (max-width: 720px) {
    .segbtn { padding:11px 4px; font-size:14px; }
    .reset { padding:13px; font-size:14px; }
    .slider { height:6px; }
    .slider::-webkit-slider-thumb { width:22px; height:22px; }
    .slider::-moz-range-thumb { width:20px; height:20px; }
    .jslider { height:26px; }
    .jslider::-webkit-slider-thumb { width:20px; height:20px; margin-top:-8px; }
    .jslider::-moz-range-thumb { width:18px; height:18px; }
  }
`;
