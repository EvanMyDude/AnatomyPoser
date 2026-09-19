import React from "react";

const MOVE = (m) => m.replace(/ [LR]$/, "");

export default function MeasureSheet({ rows, onRemove, onClear, onCopyLink, onPrint }) {
  return (
    <>
      <div className="ap-sheet">
        {rows.length === 0 ? (
          <div className="ap-sheet-empty">No measurements yet. Select a joint, set its angle, and press Record. Rows compare to normal range and pair left with right.</div>
        ) : (
          <table>
            <thead><tr><th>Joint</th><th className="num">Measured / normal</th><th>Result</th><th aria-label="Remove" /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.j}|${r.s}|${r.m}`} className={r.pairStart ? "is-pair-start" : ""}>
                  <td><div>{r.label}{r.s ? ` (${r.s})` : ""}</div><div className="ap-asym">{MOVE(r.m)}</div></td>
                  <td className="num"><b>{r.d}°</b> <span className="ap-asym">/ {r.norm != null ? `${r.norm}°` : "—"}</span></td>
                  <td>
                    {r.band && <span className="ap-band" style={{ "--band-color": `var(--band-${r.band.id})` }}>{Math.round(r.pct * 100)}%</span>}
                    {r.asym != null && Math.abs(r.asym) >= 1 && <div className="ap-asym">{r.asym > 0 ? "+" : "−"}{Math.abs(r.asym)}° vs right</div>}
                  </td>
                  <td><button type="button" className="ap-btn" aria-label={`Remove ${r.label} ${MOVE(r.m)}`} onClick={() => onRemove(r)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="ap-sheet-actions">
        <button type="button" className="ap-btn" onClick={onCopyLink}>Copy link</button>
        <button type="button" className="ap-btn" onClick={onPrint} disabled={rows.length === 0}>Print summary</button>
        <button type="button" className="ap-btn" onClick={onClear} disabled={rows.length === 0}>Clear sheet</button>
      </div>
    </>
  );
}
