// Bone/joint id conventions.
// A joint shares the id of the bone distal to it: "uarmL" is both the humerus
// segment and the left-screen shoulder joint that rotates it. Ids end in L/R
// for paired limbs (screen-left / screen-right in the coronal rig; the sagittal
// rig has only L). Midline ids (neck, spineLo, spineUp) have no side.

export const typeOf = (id) => {
  if (id.startsWith("uarm")) return "shoulder";
  if (id.startsWith("farm")) return "elbow";
  if (id.startsWith("hand")) return "wrist";
  if (id.startsWith("thigh")) return "hip";
  if (id.startsWith("shin")) return "knee";
  if (id.startsWith("foot")) return "ankle";
  return id; // neck, spineLo, spineUp, head, pelvis, clav*, hip*
};

/** Raw side suffix of a paired-limb id: "L", "R", or null for midline ids. */
export const rawSideOf = (id) => {
  if (typeOf(id) === id) return null;
  const s = id.slice(-1);
  return s === "L" || s === "R" ? s : null;
};

/** "uarmL" -> "uarm"; midline ids unchanged. */
export const baseOf = (id) => (rawSideOf(id) ? id.slice(0, -1) : id);
