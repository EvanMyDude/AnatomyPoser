import React, { useCallback, useEffect, useState } from "react";
import { Seg, Tabs } from "./ui.jsx";
import JointCard from "./JointCard.jsx";
import RegionGroup from "./RegionGroup.jsx";
import MeasureSheet from "./MeasureSheet.jsx";
import LearnTab from "./LearnTab.jsx";
import QuizTab from "./QuizTab.jsx";
import { exportPng, exportSvg } from "../utils/exportStage.js";
import { PRESETS } from "../data/presets.js";
import { REGIONS } from "../rig/rigs.js";
import { relForMovement } from "../rig/describe.js";
import { SOURCES } from "../data/norms.js";

export default function Panel({ state, dispatch, rig, otherRig, descs, otherDescs, selectedJointId, canUndo, canRedo, sheet, onHover, svgRef, quiz }) {
  const { plane, tab, side, layer, fingerCurl, selected } = state;
  const [toast, setToast] = useState(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);

  const desc = selectedJointId ? descs[selectedJointId] : null;
  const otherId = selectedJointId && otherRig.byId[selectedJointId] ? selectedJointId : selectedJointId && otherRig.byId[selectedJointId.replace(/R$/, "L")] ? selectedJointId.replace(/R$/, "L") : null;
  const otherDesc = otherId ? otherDescs[otherId] : null;

  const onRel = useCallback((rel) => dispatch({ type: "SET_JOINT_REL", id: selectedJointId, rel }), [dispatch, selectedJointId]);
  const onSelect = useCallback((id) => dispatch({ type: "SELECT", selected: { kind: "joint", id } }), [dispatch]);
  const copyLink = useCallback(async () => {
    try { await navigator.clipboard.writeText(window.location.href); setToast("Link copied"); }
    catch { window.prompt("Copy this link", window.location.href); }
  }, []);
  const record = useCallback(() => {
    if (!desc || !desc.movement) return;
    const s = desc.side || (desc.id.match(/[LR]$/) ? side : null);
    sheet.record({ j: desc.type, s, m: desc.movement, d: desc.degrees });
    setToast(`Recorded ${Math.round(desc.degrees)}° ${desc.movement.replace(/ [LR]$/, "")}`);
  }, [desc, side, sheet]);
  const poseToNorm = useCallback(() => {
    if (!desc || !desc.movement) return;
    dispatch({ type: "SET_JOINT_REL", id: desc.id, rel: relForMovement(rig, desc.id, desc.movement, desc.norm) });
  }, [desc, dispatch, rig]);
  const applyPreset = useCallback((p) => {
    dispatch({ type: "DRAG_BEGIN", drag: { kind: "preset", id: p.id } });
    const next = { ...rig.neutralAngles() };
    for (const [id, rel] of Object.entries(p[plane] || {})) if (next[id] != null) next[id] += rel;
    dispatch({ type: "SET_ANGLES", angles: next });
    dispatch({ type: "DRAG_END" });
  }, [dispatch, rig, plane]);

  const card = (
    <JointCard desc={desc} otherDesc={otherDesc} rig={rig} plane={plane} mode={tab} side={side}
      onRel={onRel} onReset={() => dispatch({ type: "RESET_JOINT", id: selectedJointId })}
      onSwitchPlane={() => dispatch({ type: "SET_PLANE", plane: plane === "coronal" ? "sagittal" : "coronal" })}
      onRecord={record} onPoseToNorm={poseToNorm} onSide={(s) => dispatch({ type: "SET_SIDE", side: s })} />
  );

  return (
    <aside className="ap-panel">
      <div>
        <h1 className="ap-title">Anatomy Poser</h1>
        <p className="ap-subtitle">Joint range of motion against AAOS normal values</p>
      </div>
      <div className="ap-toolbar">
        <Seg label="View" value={plane} onChange={(p) => dispatch({ type: "SET_PLANE", plane: p })} options={[["coronal", "Front"], ["sagittal", "Side"]]} />
        <Seg label="Layer" value={layer} onChange={(l) => dispatch({ type: "SET_LAYER", layer: l })} options={[["bones", "Bones"], ["muscles", "Muscles"], ["both", "Both"], ["activation", "Working"]]} />
      </div>
      <div className="ap-actions">
        <button type="button" className="ap-btn" disabled={!canUndo} onClick={() => dispatch({ type: "UNDO" })} title="Undo (⌘Z)">Undo</button>
        <button type="button" className="ap-btn" disabled={!canRedo} onClick={() => dispatch({ type: "REDO" })} title="Redo (⇧⌘Z)">Redo</button>
        <button type="button" className="ap-btn" onClick={() => dispatch({ type: "RESET_PLANE" })}>Reset pose</button>
        <button type="button" className="ap-btn" onClick={copyLink}>Share</button>
      </div>
      <Tabs tabs={[["pose", "Pose"], ["measure", "Measure"], ["learn", "Learn"], ["quiz", "Quiz"]]} value={tab} onChange={(t) => dispatch({ type: "SET_TAB", tab: t })} />

      {tab === "pose" && (
        <>
          {card}
          <div className="ap-presets">
            {PRESETS.map((p) => <button key={p.id} type="button" className="ap-btn" onClick={() => applyPreset(p)}>{p.label}</button>)}
          </div>
          <div className="ap-regions">
            {REGIONS[plane].map((r) => <RegionGroup key={r.id} region={r} descs={descs} selectedJointId={selectedJointId} onSelect={onSelect} onHover={onHover} />)}
            <div className="ap-region">
              <div className="ap-finger">
                <div className="ap-finger-top"><span>Finger curl</span><span>{fingerCurl}°</span></div>
                <input type="range" className="ap-slider" min={0} max={90} value={fingerCurl} aria-label="Finger curl"
                  onChange={(e) => dispatch({ type: "SET_FINGER", value: +e.target.value, at: Date.now() })} />
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "measure" && (
        <>
          {card}
          <MeasureSheet rows={sheet.rows} onRemove={sheet.remove} onClear={sheet.clear} onCopyLink={copyLink} onPrint={() => window.print()} />
          <div className="ap-sheet-actions">
            <button type="button" className="ap-btn" onClick={() => svgRef.current && exportPng(svgRef.current).then(() => setToast("PNG saved")).catch(() => setToast("Export failed"))}>Save PNG</button>
            <button type="button" className="ap-btn" onClick={() => { if (svgRef.current) { exportSvg(svgRef.current); setToast("SVG saved"); } }}>Save SVG</button>
          </div>
        </>
      )}

      {tab === "quiz" && (
        <QuizTab descs={descs} dispatch={dispatch} progress={quiz.progress} recordResult={quiz.record}
          finishSession={quiz.finishSession} setInteraction={quiz.setInteraction} setQuizPick={quiz.setQuizPick} />
      )}

      {tab === "learn" && (
        <LearnTab plane={plane} selected={selected} desc={desc} onHover={onHover}
          onSelectMuscle={(key) => dispatch({ type: "SELECT", selected: { kind: "muscle", id: key } })} />
      )}

      <div className="ap-foot">
        Normal values follow the AAOS Neutral Zero method ({SOURCES.DAVIS.split(",")[0]} et al.). Each view shows the motion measured in that plane. Teaching model, not clinical data.
        <br />Keys: <span className="ap-kbd">←</span> <span className="ap-kbd">→</span> nudge 1°, <span className="ap-kbd">Shift</span> 5°, <span className="ap-kbd">0</span> neutral, <span className="ap-kbd">[</span> <span className="ap-kbd">]</span> next joint, <span className="ap-kbd">⌘Z</span> undo.
      </div>
      {toast && <div className="ap-toast" role="status" aria-live="polite">{toast}</div>}
    </aside>
  );
}
