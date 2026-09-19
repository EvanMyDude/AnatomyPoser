import React, { memo, useState } from "react";
import { fmtMove } from "./fmt.js";

const Row = memo(function Row({ d, current, onSelect, onHover }) {
  const span = d.relHi - d.relLo || 1;
  const left = ((Math.min(0, d.rel) - d.relLo) / span) * 100, width = (Math.abs(d.rel) / span) * 100;
  return (
    <button type="button" className="ap-row" aria-current={current} onClick={() => onSelect(d.id)}
      onPointerEnter={() => onHover({ kind: "bone", id: d.id })} onPointerLeave={() => onHover(null)}>
      <span className="ap-row-name">{d.label}</span>
      <span className={"ap-row-val" + (d.locked ? " is-locked" : d.atLimit ? " is-limit" : !d.movement ? " is-neutral" : "")}>{fmtMove(d)}</span>
      <span className="ap-row-sub">{d.note}</span>
      {!d.locked && (
        <span className="ap-row-bar">
          <i style={{ left: `${left}%`, width: `${width}%` }} />
          <b className={d.atLimit ? "is-limit" : ""} style={{ left: `${((d.rel - d.relLo) / span) * 100}%` }} />
        </span>
      )}
    </button>
  );
});

/** Collapsible body region; collapsed shows a one-line summary of its joints. */
export default function RegionGroup({ region, descs, selectedJointId, onSelect, onHover }) {
  const contains = region.joints.includes(selectedJointId);
  const [open, setOpen] = useState(false);
  const isOpen = open || contains;
  return (
    <div className="ap-region">
      <button type="button" className="ap-region-head" aria-expanded={isOpen} onClick={() => setOpen(!isOpen)}>
        <span>{region.label}</span>
        {!isOpen && (
          <span className="ap-region-summary">
            {region.joints.map((id) => descs[id] && !descs[id].locked && <span key={id}>{descs[id].label.replace(/ \([LR]\)$/, "")} {descs[id].movement ? `${Math.round(descs[id].degrees)}°` : "0°"}</span>)}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="ap-region-body">
          {region.joints.map((id) => descs[id] && <Row key={id} d={descs[id]} current={selectedJointId === id} onSelect={onSelect} onHover={onHover} />)}
        </div>
      )}
    </div>
  );
}
