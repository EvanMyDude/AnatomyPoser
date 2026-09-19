// Small formatters shared by panel components.
export const fmtRel = (d) => (d.locked ? "—" : `${d.rel >= 0 ? "+" : "−"}${Math.abs(Math.round(d.rel))}°`);
export const fmtMove = (d) => (d.locked ? "fixed" : d.movement ? `${Math.round(d.degrees)}° ${d.movement.replace(/ [LR]$/, "")}` : "neutral");
