// describeJoint: the one place joint numbers are turned into meaning.
// Every readout, slider row, goniometer overlay, activation map, quiz scorer
// and URL encoder consumes this object instead of re-deriving it.
import { typeOf, rawSideOf } from "./ids.js";
import { NORMS, normEntry, bandFor } from "../data/norms.js";
import { TYPE_NAME } from "../data/labels.js";
import { clamp } from "./kinematics.js";

export { typeOf };

const EPS = 0.6;

/**
 * Patient-relative side label. The coronal rig is a FRONT view (the figure
 * faces the viewer), so a screen-left limb ("…L" id) is the patient's RIGHT.
 * The sagittal rig is single-sided, so it carries no side label.
 */
export const displaySide = (id, plane) => {
  const raw = rawSideOf(id);
  if (!raw || plane !== "coronal") return null;
  return raw === "L" ? "R" : "L";
};

export const jointLabel = (id, plane) => {
  const side = displaySide(id, plane);
  return TYPE_NAME[typeOf(id)] + (side ? ` (${side})` : "");
};

/** Human note for the joint's movements in this plane, e.g. "abduction / adduction". */
export const movementNote = (rig, id, plane) => {
  const b = rig.byId[id];
  if (!b || !b.motion) return `fixed — no ${plane} motion`;
  const t = typeOf(id);
  const wanted = new Set([b.motion.pos, b.motion.neg]);
  const names = Object.keys(NORMS[t] || {})
    .filter((k) => wanted.has(k))
    .map((k) => k.replace(/ [LR]$/, ""));
  return [...new Set(names)].join(" / ");
};

/**
 * Describe one joint at the current pose.
 *   rel/relLo/relHi  signed degrees relative to neutral (slider units)
 *   movement/degrees the movement the joint is currently in, and how far (>= 0)
 *   norm/limit/pct/deficit/band  clinical comparison for that movement
 *   clinical         this plane is the movement's measurement plane
 *   atLimit          the joint has MOVED to a boundary (a joint whose neutral
 *                    sits on a boundary, e.g. the knee at full extension, is not
 *                    "at limit" while unmoved)
 *   locked           no motion in this plane
 */
export function describeJoint(rig, angles, plane, id) {
  const b = rig.byId[id];
  const type = typeOf(id);
  const nl = rig.neutralLocalOf(id);
  const [lo, hi] = rig.boundsOf(id);
  const v = angles[id];
  const rel = v - nl, relLo = lo - nl, relHi = hi - nl;
  const locked = relHi - relLo < EPS;
  const atLimit = !locked && (
    (relLo < -EPS && rel <= relLo + EPS) ||
    (relHi > EPS && rel >= relHi - EPS)
  );
  const movement = !b.motion || Math.abs(rel) < 1e-9 ? null : rel > 0 ? b.motion.pos : b.motion.neg;
  const degrees = Math.abs(rel);
  const entry = movement ? normEntry(type, movement) : null;
  const norm = entry ? entry.norm : null;
  const limit = entry ? entry.limit ?? entry.norm : null;
  const clinical = !!entry && entry.plane === plane;
  const pct = norm ? clamp(degrees / norm, 0, 1) : null;
  const deficit = norm != null ? Math.max(0, norm - degrees) : null;
  const band = pct != null ? bandFor(pct) : null;
  return {
    id, type, side: displaySide(id, plane), label: jointLabel(id, plane),
    note: movementNote(rig, id, plane),
    movement, degrees, norm, limit, pct, deficit, band, clinical, src: entry ? entry.src : null,
    atLimit, locked, rel, relLo, relHi, value: v, neutral: nl, lo, hi,
    frac: clamp((v - lo) / (hi - lo || 1), 0, 1),
  };
}

export function describePose(rig, angles, plane) {
  const out = {};
  for (const b of rig.ikBones) out[b.id] = describeJoint(rig, angles, plane, b.id);
  return out;
}

/** Signed relative angle that puts the joint `degrees` into `movement`. */
export function relForMovement(rig, id, movement, degrees) {
  const b = rig.byId[id];
  if (!b.motion) return 0;
  if (movement === b.motion.pos) return +degrees;
  if (movement === b.motion.neg) return -degrees;
  throw new Error(`${id} cannot perform "${movement}" in this plane`);
}
