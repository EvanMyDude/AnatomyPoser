import React from "react";

export function Seg({ label, options, value, onChange }) {
  return (
    <div className="ap-seg" role="group" aria-label={label}>
      {options.map(([v, lbl]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{lbl}</button>
      ))}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="ap-tabs" role="tablist">
      {tabs.map(([v, lbl]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)}>{lbl}</button>
      ))}
    </div>
  );
}
