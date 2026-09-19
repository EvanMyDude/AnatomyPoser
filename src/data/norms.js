// Single source of truth for joint movements and their normal range of motion.
// Values are AAOS Neutral Zero norms (anatomical position = 0°), cross-checked
// 2026-09-19 against the F.A. Davis "Measurement of Joint Motion" normative
// tables. Teaching model, not clinical data.
//
// Shape: NORMS[jointType][movement] = { plane, norm, limit?, src }
//   plane  the measurement plane this rig can draw it in: "coronal" | "sagittal" | null
//          (null = real movement, e.g. rotation, that a 2D rig cannot pose; kept
//          for muscle actions and quiz text only)
//   norm   normal end range in degrees
//   limit  rig clamp when it should differ from the norm (e.g. elbow hyperextension
//          headroom). Defaults to norm.
import { typeOf } from "../rig/ids.js";

export const SOURCES = {
  AAOS: "American Academy of Orthopaedic Surgeons, Joint Motion: Method of Measuring and Recording (Neutral Zero method)",
  DAVIS: "Norkin & White, Measurement of Joint Motion: A Guide to Goniometry, 5th ed. (F.A. Davis)",
};

const S = (plane, norm, extra = {}) => ({ plane, norm, src: "AAOS", ...extra });

export const NORMS = {
  neck: {
    flexion: S("sagittal", 45),
    extension: S("sagittal", 60),
    "lateral flexion L": S("coronal", 45),
    "lateral flexion R": S("coronal", 45),
    rotation: S(null, 80),
  },
  // Thoracolumbar totals (AAOS: flexion 80, extension 25, lateral 35) are split
  // across the two spine segments of this rig. Composite readouts are deferred.
  spineUp: {
    flexion: S("sagittal", 30),
    extension: S("sagittal", 10),
    "lateral flexion L": S("coronal", 20),
    "lateral flexion R": S("coronal", 20),
  },
  spineLo: {
    flexion: S("sagittal", 45),
    extension: S("sagittal", 20),
    "lateral flexion L": S("coronal", 30),
    "lateral flexion R": S("coronal", 30),
  },
  shoulder: {
    flexion: S("sagittal", 180),
    extension: S("sagittal", 60),
    abduction: S("coronal", 180),
    adduction: S("coronal", 50),
    "internal rotation": S(null, 70),
    "external rotation": S(null, 90),
  },
  elbow: {
    flexion: S("sagittal", 150),
    extension: S("sagittal", 0, { limit: 5 }),
    pronation: S(null, 80),
    supination: S(null, 80),
  },
  wrist: {
    flexion: S("sagittal", 80),
    extension: S("sagittal", 70),
    "radial deviation": S("coronal", 20),
    "ulnar deviation": S("coronal", 30),
  },
  hip: {
    flexion: S("sagittal", 120),
    extension: S("sagittal", 30),
    abduction: S("coronal", 45),
    adduction: S("coronal", 30),
    "internal rotation": S(null, 45),
    "external rotation": S(null, 45),
  },
  knee: {
    flexion: S("sagittal", 135),
    extension: S("sagittal", 0),
  },
  ankle: {
    dorsiflexion: S("sagittal", 20),
    plantarflexion: S("sagittal", 50),
  },
};

/** Teaching bands for measured / norm. Not a clinical grading scale. */
export const BANDS = [
  { min: 0.9, id: "normal", label: "Within normal", color: "#4fd08a" },
  { min: 0.75, id: "mild", label: "Mild deficit", color: "#e8b04b" },
  { min: 0.5, id: "moderate", label: "Moderate deficit", color: "#e8834b" },
  { min: 0, id: "severe", label: "Severe deficit", color: "#e0505e" },
];
export const bandFor = (pct) => BANDS.find((b) => pct >= b.min) || BANDS[BANDS.length - 1];

export const normEntry = (jointType, movement) => (NORMS[jointType] || {})[movement] || null;

/** Rig clamp for a movement: its `limit` if set, else its norm. */
export const limitOf = (jointType, movement) => {
  const e = normEntry(jointType, movement);
  if (!e) throw new Error(`No norm for ${jointType}.${movement}`);
  return e.limit ?? e.norm;
};

/**
 * Derive a bone's legacy `rom: [lo, hi]` (degrees relative to neutral, in
 * bone-local rotation sign) from its movement axis.
 *   motion = { pos: movement for positive rotation, neg: movement for negative }
 *   motion = null  -> locked in this plane, [0, 0]
 */
export const resolveRom = (spec) => {
  const t = typeOf(spec.id);
  if (!spec.motion) return [0, 0];
  const neg = limitOf(t, spec.motion.neg);
  return [neg === 0 ? 0 : -neg, limitOf(t, spec.motion.pos)]; // avoid -0
};
