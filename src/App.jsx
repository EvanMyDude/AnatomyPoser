import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { RIGS, CHAINS } from "./rig/rigs.js";
import { D2R, clamp, solveCCD, aimJoint } from "./rig/kinematics.js";
import { describePose, jointLabel } from "./rig/describe.js";
import { BONE_NAME } from "./data/labels.js";
import { MUSCLES } from "./data/muscles.js";
import { C, S, CSS } from "./theme.js";

/* =========================================================================
   COMPONENT
   Kinematics, bone tables, norms, labels, muscles and theme live in ./rig,
   ./data and ./theme.js. This file is the (still monolithic) view.
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
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const rig = RIGS[plane];
  const angles = anglesByView[plane];
  const { pos, dir } = useMemo(() => rig.fk(angles), [rig, angles]);
  const descs = useMemo(() => describePose(rig, angles, plane), [rig, angles, plane]);
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
  const isoBones = rig.ikBones;

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
                {focus.kind === "joint" && <span style={S.selNote}>· {descs[focus.id].note}</span>}</>
            : <span style={S.selHint}>{mode === "isolate" ? "Grab a bone to select a joint." : "Hover or tap a bone or muscle."}</span>}
        </div>

        {/* focus-joint live readout */}
        <div style={{ ...S.readout, opacity: focusJointId ? 1 : 0.4 }}>
          {focusJointId ? (() => {
            const d = descs[focusJointId];
            return <>
              <div style={S.readHead}>{d.label} · {d.note}</div>
              <div style={S.readBig}>
                <span style={{ color: d.locked ? C.faint : d.atLimit ? C.warn : C.ink }}>
                  {d.locked ? "—" : `${d.rel >= 0 ? "+" : ""}${d.rel.toFixed(0)}°`}
                </span>
                {d.atLimit && <span style={S.limitTag}>AT LIMIT</span>}
              </div>
              {d.locked
                ? <div style={S.lockRow}>fixed in {plane} plane</div>
                : <>
                    <div style={S.bar}><div style={S.barFill} />
                      <div style={{ ...S.barMark, left: `${d.frac * 100}%`, background: d.atLimit ? C.warn : C.accent }} /></div>
                    <div style={S.jlims}><span>min {d.relLo.toFixed(0)}°</span><span>max {d.relHi.toFixed(0)}°</span></div>
                  </>}
            </>;
          })() : <div style={S.readHead}>{mode === "isolate" ? "Select a joint to inspect it" : "Drag a handle to inspect its chain"}</div>}
        </div>

        {/* joint table */}
        <div style={S.tableWrap}>
          <div style={S.tableHead}><span>JOINT — {plane}</span><span>ANGLE</span></div>
          <div style={{ ...S.tableBody, ...(isNarrow ? { maxHeight: 280 } : {}) }} className="scroll">
            {isoBones.map((b) => {
              const { rel, relLo, relHi, atLimit, locked } = descs[b.id];
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
                  <div style={S.jnote}>{descs[b.id].note}</div>
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

