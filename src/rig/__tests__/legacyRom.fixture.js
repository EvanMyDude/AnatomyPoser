// The rom arrays exactly as they were hand-typed in the original single-file
// component (commit 497a56a). resolveRom() must reproduce them, except for the
// deliberate AAOS alignments listed in ALIGNED.
export const LEGACY_ROM = {
  coronal: {
    spineLo: [-30, 30], spineUp: [-20, 20], neck: [-45, 45],
    uarmL: [-50, 180], farmL: [-145, 5], handL: [-20, 30],
    uarmR: [-180, 50], farmR: [-5, 145], handR: [-30, 20],
    thighL: [-30, 45], shinL: [-135, 0], footL: [0, 0],
    thighR: [-45, 30], shinR: [0, 135], footR: [0, 0],
    pelvis: [0, 0], head: [0, 0], clavL: [0, 0], clavR: [0, 0], hipL: [0, 0], hipR: [0, 0],
  },
  sagittal: {
    spineLo: [-20, 45], spineUp: [-10, 30], neck: [-60, 50],
    uarmL: [-180, 60], farmL: [-145, 5], handL: [-80, 70],
    thighL: [-120, 20], shinL: [0, 135], footL: [-20, 45],
    pelvis: [0, 0], head: [0, 0], clavL: [0, 0], hipL: [0, 0],
  },
};
export const LEGACY_NW = {
  coronal: { pelvis: -90, spineLo: -90, spineUp: -90, neck: -90, head: -90, clavL: 202, uarmL: 93, farmL: 93, handL: 93,
    clavR: -22, uarmR: 87, farmR: 87, handR: 87, hipL: 150, thighL: 91, shinL: 91, footL: 155, hipR: 30, thighR: 89, shinR: 89, footR: 25 },
};
export const LEGACY_ORDER = {
  coronal: ["pelvis", "spineLo", "spineUp", "neck", "head", "clavL", "uarmL", "farmL", "handL", "clavR", "uarmR", "farmR", "handR",
    "hipL", "thighL", "shinL", "footL", "hipR", "thighR", "shinR", "footR"],
};
// Deliberate changes to match AAOS norms (see data/norms.js):
export const ALIGNED = {
  coronal: {
    farmL: [-150, 5], farmR: [-5, 150],          // elbow flexion 145 -> 150
    handL: [-30, 20], handR: [-20, 30],          // radial 20 / ulnar 30 were swapped
  },
  sagittal: {
    neck: [-60, 45],                             // cervical flexion 50 -> 45
    farmL: [-150, 5],                            // elbow flexion 145 -> 150
    thighL: [-120, 30],                          // hip extension 20 -> 30
    footL: [-20, 50],                            // plantarflexion 45 -> 50
  },
};
