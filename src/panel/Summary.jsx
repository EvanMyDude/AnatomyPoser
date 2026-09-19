import React from "react";
import { SOURCES } from "../data/norms.js";
import BoneLayer from "../stage/BoneLayer.jsx";
import { VIEW } from "../stage/geometry.js";

/** Print-only layout: figure at its current pose plus the measurement sheet. */
export default function Summary({ rig, pos, dir, plane, fingerCurl, rows }) {
  return (
    <div className="ap-summary">
      <h1>Range of motion summary</h1>
      <div className="meta">{new Date().toLocaleDateString()} · {plane === "coronal" ? "front view" : "side view"} · teaching model, not a clinical record</div>
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} style={{ "--bone": "#333", "--bone-edge": "#333", "--bg": "#fff", "--accent": "#0a7", "--faint": "#999" }}>
        <BoneLayer rig={rig} pos={pos} dir={dir} plane={plane} focus={null} selectedJointId={null} fingerCurl={fingerCurl} />
      </svg>
      <table>
        <thead><tr><th>Joint</th><th>Movement</th><th className="num">Measured</th><th className="num">Normal</th><th>% of normal</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.j}|${r.s}|${r.m}`}>
              <td>{r.label}{r.s ? ` (${r.s})` : ""}</td><td>{r.m.replace(/ [LR]$/, "")}</td>
              <td className="num">{r.d}°</td><td className="num">{r.norm != null ? `${r.norm}°` : "—"}</td>
              <td>{r.band ? `${Math.round(r.pct * 100)}% (${r.band.label.toLowerCase()})` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sources">Normal values: {SOURCES.AAOS}; {SOURCES.DAVIS}. Generated with Anatomy Poser.</div>
    </div>
  );
}
