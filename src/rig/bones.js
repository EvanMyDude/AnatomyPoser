// Bone tables for the two 2D rigs.
// Angles in DEGREES. SVG coords: +x right, +y down. "Up" = -90°.
// Positive local rotation is clockwise on screen.
//
// Each spec: { id, parent, len, nW, ik, motion }
//   nW      neutral world direction of the segment (degrees)
//   ik      participates in IK chains / has a slider row
//   motion  { pos, neg } movement names for +/- rotation (see data/norms.js),
//           or null when the joint is fixed in this plane.
// `rom` is derived from `motion` by resolveRom(), so norms.js is the only place
// range-of-motion numbers live.
import { resolveRom } from "../data/norms.js";

export const PELVIS_FRAME = -90;
export const ANCHOR = { x: 210, y: 372 };

/** True segment lengths shared by both rigs (svg units). Clavicle and hip
 *  "lengths" are per-plane projection offsets and live in the specs below. */
export const SEGMENT_LEN = {
  spineLo: 64, spineUp: 58, neck: 28, head: 30,
  uarm: 86, farm: 72, hand: 38, thigh: 104, shin: 96, foot: 30,
};

const B = (id, parent, len, nW, ik, motion) => ({ id, parent, len, nW, ik, motion });
const L = SEGMENT_LEN;

// ---- CORONAL (front view; the figure faces the viewer) ----------------------
// Screen-left limbs carry the "L" suffix. Positive rotation on a screen-left
// limb moves its tip away from the midline (abduction); the R side is mirrored.
const CORONAL_AXIAL = [
  B("pelvis", null, 0, -90, false, null),
  B("spineLo", "pelvis", L.spineLo, -90, true, { pos: "lateral flexion L", neg: "lateral flexion R" }),
  B("spineUp", "spineLo", L.spineUp, -90, true, { pos: "lateral flexion L", neg: "lateral flexion R" }),
  B("neck", "spineUp", L.neck, -90, true, { pos: "lateral flexion L", neg: "lateral flexion R" }),
  B("head", "neck", L.head, -90, false, null),
];
const CORONAL_ARM_L = [
  B("clavL", "spineUp", 60, 202, false, null),
  B("uarmL", "clavL", L.uarm, 93, true, { pos: "abduction", neg: "adduction" }),
  // Elbow and knee bend are drawn in the front view for posing, but their
  // clinical plane is sagittal (norms.js says so); describeJoint marks them
  // non-clinical here.
  B("farmL", "uarmL", L.farm, 93, true, { pos: "extension", neg: "flexion" }),
  B("handL", "farmL", L.hand, 93, true, { pos: "radial deviation", neg: "ulnar deviation" }),
];
const CORONAL_LEG_L = [
  B("hipL", "pelvis", 34, 150, false, null),
  B("thighL", "hipL", L.thigh, 91, true, { pos: "abduction", neg: "adduction" }),
  B("shinL", "thighL", L.shin, 91, true, { pos: "extension", neg: "flexion" }),
  B("footL", "shinL", L.foot, 155, true, null), // ankle motion is sagittal only
];

const norm360 = (a) => ((a % 360) + 360) % 360;
const flipId = (id) => (id && id.endsWith("L") ? id.slice(0, -1) + "R" : id);

/** Mirror a screen-left bone across the midline: nW' = 180 - nW, and the
 *  movement axis swaps sign (rom' = [-hi, -lo]). */
export const mirrorBone = (b) => ({
  ...b,
  id: flipId(b.id),
  parent: flipId(b.parent),
  nW: norm360(180 - b.nW) > 180 ? norm360(180 - b.nW) - 360 : norm360(180 - b.nW),
  motion: b.motion ? { pos: b.motion.neg, neg: b.motion.pos } : null,
});

// Order matters twice: parents must precede children (FK), and the ik bones'
// order is the slider order in the panel.
export const CORONAL_SPEC = [
  ...CORONAL_AXIAL,
  ...CORONAL_ARM_L, ...CORONAL_ARM_L.map(mirrorBone),
  ...CORONAL_LEG_L, ...CORONAL_LEG_L.map(mirrorBone),
];

// ---- SAGITTAL (side view; the figure faces +x, viewer sees its left side) ----
export const SAGITTAL_SPEC = [
  B("pelvis", null, 0, -90, false, null),
  B("spineLo", "pelvis", L.spineLo, -90, true, { pos: "flexion", neg: "extension" }),
  B("spineUp", "spineLo", L.spineUp, -90, true, { pos: "flexion", neg: "extension" }),
  B("neck", "spineUp", L.neck, -90, true, { pos: "flexion", neg: "extension" }),
  B("head", "neck", L.head, -90, false, null),
  B("clavL", "spineUp", 23, -70, false, null),
  B("uarmL", "clavL", L.uarm, 90, true, { pos: "extension", neg: "flexion" }),
  B("farmL", "uarmL", L.farm, 90, true, { pos: "extension", neg: "flexion" }),
  B("handL", "farmL", L.hand, 90, true, { pos: "extension", neg: "flexion" }),
  B("hipL", "pelvis", 8, 90, false, null),
  B("thighL", "hipL", L.thigh, 90, true, { pos: "extension", neg: "flexion" }),
  B("shinL", "thighL", L.shin, 90, true, { pos: "flexion", neg: "extension" }),
  B("footL", "shinL", L.foot, 0, true, { pos: "plantarflexion", neg: "dorsiflexion" }),
];

/** Attach the derived `rom` so kinematics.js can stay movement-agnostic. */
export const withRom = (specs) => specs.map((s) => ({ ...s, rom: resolveRom(s) }));

export const CORONAL_BONES = withRom(CORONAL_SPEC);
export const SAGITTAL_BONES = withRom(SAGITTAL_SPEC);
