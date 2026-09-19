import React from "react";
import { MUSCLE_CATALOG, agonistsFor, muscleInstances } from "../data/muscles.js";
import { jointInfo } from "../data/joints.js";
import { NORMS } from "../data/norms.js";
import { TYPE_NAME } from "../data/labels.js";

const MOVE = (m) => m.replace(/ [LR]$/, "");

function MuscleCard({ muscle, side, onHover }) {
  return (
    <div className="ap-card ap-learn" onPointerLeave={() => onHover(null)}>
      <div className="ap-card-head">
        <span className="ap-card-name">{muscle.name}{side ? ` (${side})` : ""}</span>
        <span className="ap-card-plane">{muscle.group}</span>
      </div>
      <p className="ap-why">{muscle.why}</p>
      <dl className="ap-facts">
        <dt>Origin</dt><dd>{muscle.origin}</dd>
        <dt>Insertion</dt><dd>{muscle.insertion}</dd>
        {muscle.innervation && <><dt>Nerve</dt><dd>{muscle.innervation}</dd></>}
        <dt>Actions</dt>
        <dd>
          <ul className="ap-actions-list">
            {muscle.actions.map((a, i) => {
              const n = (NORMS[a.joint] || {})[a.movement];
              return <li key={i}><b>{TYPE_NAME[a.joint] || a.joint}</b> {MOVE(a.movement)}{a.sameSide ? " (same side)" : ""}{n && n.norm != null ? <span className="ap-asym"> · normal {n.norm}°</span> : null}{a.role === "assist" ? <span className="ap-asym"> · assists</span> : null}</li>;
            })}
          </ul>
        </dd>
      </dl>
    </div>
  );
}

function JointLearnCard({ desc, plane, onHover, onSelectMuscle }) {
  const info = jointInfo(desc.type);
  const norms = NORMS[desc.type] || {};
  const movements = Object.keys(norms);
  return (
    <div className="ap-card ap-learn">
      <div className="ap-card-head">
        <span className="ap-card-name">{info ? info.name : desc.label}</span>
        <span className="ap-card-plane">{info ? info.kind : ""}</span>
      </div>
      <dl className="ap-facts">
        <dt>Normal range</dt>
        <dd>
          <ul className="ap-actions-list">
            {movements.map((m) => {
              const n = norms[m];
              const here = n.plane === plane;
              const active = desc.movement === m;
              return <li key={m} className={active ? "is-active" : ""}><b>{MOVE(m)}</b> {n.norm}°{n.plane == null ? <span className="ap-asym"> · not shown in 2D</span> : here ? null : <span className="ap-asym"> · {n.plane === "coronal" ? "front" : "side"} view</span>}{active ? <span className="ap-asym"> · now {Math.round(desc.degrees)}°</span> : null}</li>;
            })}
          </ul>
        </dd>
        {desc.movement && (
          <>
            <dt>Muscles that {MOVE(desc.movement).replace(/ion$/, "e").replace(/lateral flexe/, "side-bend")} it</dt>
            <dd>
              <ul className="ap-agonists">
                {agonistsFor(desc.type, desc.movement).map(({ muscle, role }) => {
                  const inst = muscleInstances(plane).find((i) => i.id === muscle.id && (i.side == null || i.side === (desc.id.match(/[LR]$/) || ["L"])[0]));
                  const key = inst ? inst.key : null;
                  return (
                    <li key={muscle.id}>
                      <button type="button" className="ap-link" onPointerEnter={() => key && onHover({ kind: "muscle", id: key })} onPointerLeave={() => onHover(null)}
                        onClick={() => key && onSelectMuscle(key)}>{muscle.name}</button>
                      {role === "assist" && <span className="ap-asym"> assists</span>}
                    </li>
                  );
                })}
              </ul>
            </dd>
          </>
        )}
        {info && info.restrictions && (
          <><dt>Common limits</dt><dd><ul className="ap-plain">{info.restrictions.map((r, i) => <li key={i}>{r}</li>)}</ul></dd></>
        )}
        {info && info.tip && <><dt>Measuring</dt><dd>{info.tip}</dd></>}
      </dl>
    </div>
  );
}

/** Learn tab: the selected muscle or joint explained; otherwise a muscle index. */
export default function LearnTab({ plane, selected, desc, onHover, onSelectMuscle }) {
  if (selected && selected.kind === "muscle") {
    const [id, side] = selected.id.split(".");
    const muscle = MUSCLE_CATALOG.find((m) => m.id === id);
    if (muscle) return <MuscleCard muscle={muscle} side={plane === "coronal" && side ? (side === "L" ? "R" : "L") : null} onHover={onHover} />;
  }
  if (desc) return <JointLearnCard desc={desc} plane={plane} onHover={onHover} onSelectMuscle={onSelectMuscle} />;
  return (
    <div className="ap-card ap-learn">
      <div className="ap-card is-empty" style={{ border: "none", padding: 0 }}>Tap a muscle or joint on the figure to read about it. Move a joint and the muscles doing the work light up.</div>
      <ul className="ap-index">
        {MUSCLE_CATALOG.map((m) => {
          const inst = muscleInstances(plane).find((i) => i.id === m.id);
          return <li key={m.id}><button type="button" className="ap-link" disabled={!inst} onPointerEnter={() => inst && onHover({ kind: "muscle", id: inst.key })} onPointerLeave={() => onHover(null)} onClick={() => inst && onSelectMuscle(inst.key)}>{m.name}</button><span className="ap-asym"> {m.group}</span></li>;
        })}
      </ul>
    </div>
  );
}
