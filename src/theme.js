// Visual tokens and inline style objects. Moved verbatim from the original
// component; migrating to a stylesheet is Phase 1 work.
export const C = {
  bg: "#0f1417", panel: "#151b1f", panel2: "#1b2329", line: "#2a353c",
  ink: "#e8ede9", sub: "#8a9aa2", faint: "#5c6b72",
  bone: "#e9e4d6", boneEdge: "#b8b09a", muscle: "#a6485a", muscleEdge: "#7d3444",
  accent: "#38d0c8", accentDim: "#1e6f6b", warn: "#e8b04b", handle: "#38d0c8",
};

/* =========================================================================
   STYLES
   ========================================================================= */
export const S = {
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

export const CSS = `
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
