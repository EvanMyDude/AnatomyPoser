// URL hash codec for pose state. Pure: no React, no DOM, no globals.
//
// Format (fields separated by ";", each omitted when at its default, emitted in
// this fixed order so equal states always produce equal strings):
//   1;p=s;t=m;side=R;l=b;j=uarmL;c=uarmL:45,farmL:-30;s=thighL:-90;f=30;m=hp.L.fl.95,kn.L.fl.110
//
//   1      codec version (always first when the string is non-empty)
//   p      plane:  c coronal (default) | s sagittal
//   t      tab:    p pose (default) | m measure | l learn | q quiz
//   side   L (default) | R
//   l      layer:  x both (default) | b bones | m muscles
//   j      selected joint id (only when selected.kind === "joint")
//   c / s  coronal / sagittal joint list, "id:rel" where rel is the integer
//          rotation relative to the joint's neutral; rel 0 entries omitted;
//          emitted in the rig's ik-bone order (URL_ORDER)
//   f      finger curl (integer, omitted when 0)
//   m      measurements "jointCode.side.movementCode.degrees", side "-" = null
//
// The decoder is tolerant: unknown fields / ids / codes are ignored, malformed
// numbers are skipped, joint values are clamped to the rig's bounds, a missing
// or unknown version is treated as 1, and a leading "#" is accepted.

export const CODEC_VERSION = 1;

export const JOINT_CODE = {
  neck: "nk", spineUp: "su", spineLo: "sl",
  shoulder: "sh", elbow: "el", wrist: "wr",
  hip: "hp", knee: "kn", ankle: "an",
};

export const MOVEMENT_CODE = {
  flexion: "fl", extension: "ex", abduction: "ab", adduction: "ad",
  "lateral flexion L": "ll", "lateral flexion R": "lr",
  "radial deviation": "rd", "ulnar deviation": "ud",
  dorsiflexion: "df", plantarflexion: "pf",
  rotation: "ro", "internal rotation": "ir", "external rotation": "er",
  pronation: "pr", supination: "su",
};

const invert = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
const JOINT_FROM_CODE = invert(JOINT_CODE);
const MOVEMENT_FROM_CODE = invert(MOVEMENT_CODE);

const PLANE_CODE = { coronal: "c", sagittal: "s" };
const TAB_CODE = { pose: "p", measure: "m", learn: "l", quiz: "q" };
const LAYER_CODE = { both: "x", bones: "b", muscles: "m" };
const PLANE_FROM_CODE = invert(PLANE_CODE);
const TAB_FROM_CODE = invert(TAB_CODE);
const LAYER_FROM_CODE = invert(LAYER_CODE);

const DEFAULTS = { plane: "coronal", tab: "pose", side: "L", layer: "both" };
const PLANES = ["coronal", "sagittal"];

const INT_RE = /^-?\d+$/;
const parseInt10 = (s) => (INT_RE.test(s) ? parseInt(s, 10) : null);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Ik-bone ids of a rig in declaration order (same as rigs.js URL_ORDER). */
const orderOf = (rig) => (rig && rig.ikBones ? rig.ikBones.map((b) => b.id) : []);

// ---- measurements ----------------------------------------------------------

/** records: [{ j: jointType, s: "L"|"R"|null, m: movement, d: degrees }] -> "hp.L.fl.95,..." */
export function encodeMeasurements(records) {
  if (!Array.isArray(records)) return "";
  const out = [];
  for (const r of records) {
    if (!r) continue;
    const j = JOINT_CODE[r.j], m = MOVEMENT_CODE[r.m];
    const d = Number(r.d);
    if (!j || !m || !Number.isFinite(d)) continue;
    const s = r.s === "L" || r.s === "R" ? r.s : "-";
    out.push(`${j}.${s}.${m}.${Math.round(d)}`);
  }
  return out.join(",");
}

/** "hp.L.fl.95,kn.-.fl.110" -> records; malformed entries are skipped. */
export function decodeMeasurements(str) {
  if (typeof str !== "string" || !str) return [];
  const out = [];
  for (const entry of str.split(",")) {
    const parts = entry.split(".");
    if (parts.length !== 4) continue;
    const [jc, sc, mc, dc] = parts;
    const j = JOINT_FROM_CODE[jc], m = MOVEMENT_FROM_CODE[mc], d = parseInt10(dc);
    if (!j || !m || d === null) continue;
    if (sc !== "L" && sc !== "R" && sc !== "-") continue;
    out.push({ j, s: sc === "-" ? null : sc, m, d });
  }
  return out;
}

// ---- pose ------------------------------------------------------------------

function encodeJoints(rig, angles) {
  if (!rig || !angles) return "";
  const parts = [];
  for (const id of orderOf(rig)) {
    const a = angles[id];
    if (typeof a !== "number" || !Number.isFinite(a)) continue;
    const rel = Math.round(a - rig.neutralLocalOf(id));
    if (rel !== 0) parts.push(`${id}:${rel}`);
  }
  return parts.join(",");
}

function decodeJoints(rig, str) {
  const out = {};
  if (!rig || !str) return out;
  const ids = new Set(orderOf(rig));
  for (const entry of str.split(",")) {
    const i = entry.indexOf(":");
    if (i <= 0) continue;
    const id = entry.slice(0, i), rel = parseInt10(entry.slice(i + 1));
    if (!ids.has(id) || rel === null) continue;
    const [lo, hi] = rig.boundsOf(id);
    out[id] = clamp(rig.neutralLocalOf(id) + rel, lo, hi);
  }
  return out;
}

/**
 * Encode the shareable part of app state. Returns "" when everything is at
 * its default; otherwise a string WITHOUT the leading "#".
 */
export function encodePose(state, rigs) {
  const st = state || {}, rg = rigs || {};
  const fields = [];
  const plane = PLANE_CODE[st.plane];
  if (plane && st.plane !== DEFAULTS.plane) fields.push(`p=${plane}`);
  const tab = TAB_CODE[st.tab];
  if (tab && st.tab !== DEFAULTS.tab) fields.push(`t=${tab}`);
  if (st.side === "R") fields.push("side=R");
  const layer = LAYER_CODE[st.layer];
  if (layer && st.layer !== DEFAULTS.layer) fields.push(`l=${layer}`);
  if (st.selected && st.selected.kind === "joint" && typeof st.selected.id === "string" && st.selected.id)
    fields.push(`j=${st.selected.id}`);
  const angles = st.angles || {};
  for (const p of PLANES) {
    const joints = encodeJoints(rg[p], angles[p]);
    if (joints) fields.push(`${PLANE_CODE[p]}=${joints}`);
  }
  const f = Math.round(Number(st.fingerCurl) || 0);
  if (f !== 0) fields.push(`f=${f}`);
  const m = encodeMeasurements(st.measurements);
  if (m) fields.push(`m=${m}`);
  if (!fields.length) return "";
  return [String(CODEC_VERSION), ...fields].join(";");
}

/**
 * Decode a hash (with or without "#") into a partial state. Only fields that
 * are present and valid are returned; joint angles are ABSOLUTE local angles
 * (neutral + rel), clamped to the rig's bounds, e.g.
 *   { angles: { coronal: { uarmL: 138 } }, plane: "sagittal" }
 * Returns {} for empty or unrecognisable input.
 */
export function decodePose(hash, rigs) {
  if (typeof hash !== "string") return {};
  const rg = rigs || {};
  let str = hash.trim();
  if (str.startsWith("#")) str = str.slice(1);
  if (!str) return {};
  const tokens = str.split(";");
  // Version: a bare integer first token. Missing or unknown -> treated as 1.
  if (INT_RE.test(tokens[0])) tokens.shift();

  const out = {};
  const seen = new Set();
  for (const tok of tokens) {
    const i = tok.indexOf("=");
    if (i <= 0) continue;
    const key = tok.slice(0, i), val = tok.slice(i + 1);
    if (seen.has(key)) continue; // first occurrence wins
    seen.add(key);
    switch (key) {
      case "p": if (PLANE_FROM_CODE[val]) out.plane = PLANE_FROM_CODE[val]; break;
      case "t": if (TAB_FROM_CODE[val]) out.tab = TAB_FROM_CODE[val]; break;
      case "side": if (val === "L" || val === "R") out.side = val; break;
      case "l": if (LAYER_FROM_CODE[val]) out.layer = LAYER_FROM_CODE[val]; break;
      case "j": {
        const known = PLANES.some((p) => orderOf(rg[p]).includes(val));
        if (known) out.selected = { kind: "joint", id: val };
        break;
      }
      case "c":
      case "s": {
        const plane = PLANE_FROM_CODE[key];
        const joints = decodeJoints(rg[plane], val);
        if (Object.keys(joints).length) {
          out.angles = out.angles || {};
          out.angles[plane] = joints;
        }
        break;
      }
      case "f": {
        const f = parseInt10(val);
        if (f !== null) out.fingerCurl = f;
        break;
      }
      case "m": {
        const recs = decodeMeasurements(val);
        if (recs.length) out.measurements = recs;
        break;
      }
      default: break; // unknown field: ignore
    }
  }
  return out;
}
