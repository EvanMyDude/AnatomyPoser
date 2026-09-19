// Named poses as joint angles RELATIVE to neutral, per plane. Anything omitted
// stays neutral. Ids are rig ids (coronal: screen-left = "L").
export const PRESETS = [
  { id: "neutral", label: "Neutral", coronal: {}, sagittal: {} },
  { id: "tpose", label: "T-pose", coronal: { uarmL: 90, uarmR: -90 }, sagittal: {} },
  { id: "arms-up", label: "Arms up", coronal: { uarmL: 170, uarmR: -170 }, sagittal: { uarmL: -170 } },
  { id: "sitting", label: "Sitting", coronal: {}, sagittal: { thighL: -90, shinL: 90, footL: 0, spineLo: 5 } },
  { id: "squat", label: "Squat", coronal: {}, sagittal: { thighL: -100, shinL: 110, footL: -15, spineLo: 25, spineUp: 10, uarmL: -70 } },
  { id: "reach", label: "Reach forward", coronal: {}, sagittal: { uarmL: -90, farmL: 0, spineUp: 10, neck: -10 } },
];
