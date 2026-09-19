import React from "react";
import { relForMovement } from "../rig/describe.js";

const Empty = () => (
  <div className="ap-card is-empty">
    Nothing selected. <b>Tap a joint dot</b> on the figure or a row below to read its angle. Drag a <b>ring</b> to pose a whole limb.
  </div>
);

/**
 * The selected joint: big reading with the movement name, ROM bar, slider and
 * numeric entry. In measure mode it also shows the norm comparison and the
 * record button.
 */
export default function JointCard({ desc, otherDesc, rig, plane, mode, side, onRel, onReset, onSwitchPlane, onRecord, onPoseToNorm, onSide }) {
  if (!desc) return <Empty />;
  const d = desc;
  const move = d.movement ? d.movement.replace(/ [LR]$/, "") : null;
  const span = d.relHi - d.relLo || 1;
  const pct = (v) => `${((v - d.relLo) / span) * 100}%`;
  const bandColor = d.band ? `var(--band-${d.band.id})` : undefined;
  const normLeft = d.movement && d.clinical ? (d.rel >= 0 ? pct(0) : pct(Math.max(d.relLo, -d.norm))) : null;
  const normWidth = d.movement && d.clinical ? `${(Math.min(d.norm, d.rel >= 0 ? d.relHi : -d.relLo) / span) * 100}%` : null;
  const isSag = plane === "sagittal";
  const sideLabel = d.side || (isSag && rig.byId[d.id] && d.id.match(/[LR]$/) ? side : null);

  return (
    <div className="ap-card" aria-live="polite">
      <div className="ap-card-head">
        <span className="ap-card-name">{d.label}{isSag && sideLabel ? ` (${sideLabel})` : ""}</span>
        <span className="ap-card-plane">{d.note}</span>
      </div>
      <div className="ap-reading">
        <span className={"ap-reading-deg" + (d.locked ? " is-locked" : d.atLimit ? " is-limit" : "")}>{d.locked ? "—" : `${Math.round(d.degrees)}°`}</span>
        <span className={"ap-reading-move" + (move ? "" : " is-neutral")}>{d.locked ? "fixed in this plane" : move || "neutral"}</span>
        {d.atLimit && <span className="ap-tag">at limit</span>}
      </div>

      {!d.locked && (
        <>
          {d.movement && (
            <div className="ap-norm-line">
              {d.clinical
                ? <><span>Normal {move}: <b>{d.norm}°</b></span>
                    <span className="ap-band" style={{ "--band-color": bandColor }}>{Math.round(d.pct * 100)}% of normal{d.deficit > 0 ? `, ${Math.round(d.deficit)}° short` : ""}</span></>
                : <span>{move} is measured in the {plane === "coronal" ? "side" : "front"} view; this angle is for posing only.</span>}
            </div>
          )}
          <div className="ap-rom">
            <div className="ap-rom-track" />
            {normLeft != null && <div className="ap-rom-norm" style={{ left: normLeft, width: normWidth }} />}
            {d.relLo < 0 && d.relHi > 0 && <div className="ap-rom-neutral" style={{ left: pct(0) }} />}
            <input type="range" className={"ap-slider" + (d.atLimit ? " is-limit" : "")} min={Math.round(d.relLo)} max={Math.round(d.relHi)} step={1}
              value={Math.round(d.rel)} aria-label={`${d.label} angle`} aria-valuetext={d.movement ? `${Math.round(d.degrees)} degrees ${move}` : "neutral"}
              onChange={(e) => onRel(+e.target.value)} />
          </div>
          <div className="ap-lims">
            <span>{rig.byId[d.id].motion.neg.replace(/ [LR]$/, "")} {Math.abs(Math.round(d.relLo))}°</span>
            <span>{rig.byId[d.id].motion.pos.replace(/ [LR]$/, "")} {Math.round(d.relHi)}°</span>
          </div>
          <div className="ap-field-row">
            <label htmlFor="ap-deg">Set</label>
            <input id="ap-deg" className="ap-num" type="number" inputMode="numeric" step={1}
              value={Math.round(d.degrees)} min={0} max={mode === "measure" ? 200 : Math.max(-d.relLo, d.relHi)}
              onChange={(e) => {
                const v = +e.target.value; if (!Number.isFinite(v)) return;
                const mv = d.movement || rig.byId[d.id].motion.pos;
                onRel(relForMovement(rig, d.id, mv, Math.abs(v)));
              }} />
            <span className="ap-note">° {d.movement ? move : rig.byId[d.id].motion.pos.replace(/ [LR]$/, "")}</span>
            {mode === "measure" && d.clinical && <button type="button" className="ap-btn is-small" onClick={onPoseToNorm}>Pose to normal</button>}
            <button type="button" className="ap-btn is-small" onClick={onReset}>Reset</button>
          </div>
          {mode === "measure" && isSag && sideLabel && (
            <div className="ap-field-row">
              <label>Measuring side</label>
              <div className="ap-seg" role="group" aria-label="Measuring side" style={{ flex: "0 0 auto" }}>
                {["L", "R"].map((s) => <button key={s} type="button" aria-pressed={side === s} onClick={() => onSide(s)}>{s === "L" ? "Left" : "Right"}</button>)}
              </div>
            </div>
          )}
          {mode === "measure" && d.movement && d.clinical && (
            <div className="ap-field-row">
              <button type="button" className="ap-btn is-primary" onClick={onRecord}>Record {Math.round(d.degrees)}° {move}{sideLabel ? ` (${sideLabel})` : ""}</button>
            </div>
          )}
        </>
      )}
      {otherDesc && !otherDesc.locked && (
        <div className="ap-other-plane">
          {plane === "coronal" ? "Side" : "Front"} view: {otherDesc.movement ? `${Math.round(otherDesc.degrees)}° ${otherDesc.movement.replace(/ [LR]$/, "")}` : "neutral"}.{" "}
          <button type="button" onClick={onSwitchPlane}>Switch</button>
        </div>
      )}
    </div>
  );
}
