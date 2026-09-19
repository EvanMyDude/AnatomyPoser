import { CORONAL_BONES, SAGITTAL_BONES } from "./bones.js";
import { rigOf, chainFor } from "./kinematics.js";

export const RIGS = { coronal: rigOf(CORONAL_BONES), sagittal: rigOf(SAGITTAL_BONES) };

/** Draggable end-effectors per plane and their handle labels. */
export const EFFECTORS = {
  coronal: { head: "Head / spine", handL: "Left hand", handR: "Right hand", footL: "Left foot", footR: "Right foot" },
  sagittal: { head: "Head / spine", handL: "Hand", footL: "Foot" },
};

/** CHAINS[plane][effector] = { chain, effector, label }, derived from the rig
 *  topology instead of being typed out by hand. */
export const CHAINS = Object.fromEntries(
  Object.entries(EFFECTORS).map(([plane, effs]) => [
    plane,
    Object.fromEntries(
      Object.entries(effs).map(([eff, label]) => [eff, { chain: chainFor(RIGS[plane], eff), effector: eff, label }])
    ),
  ])
);

/** Panel grouping of joints by body region. */
export const REGIONS = {
  coronal: [
    { id: "spine", label: "Spine & neck", joints: ["spineLo", "spineUp", "neck"] },
    { id: "armL", label: "Arm (screen left)", joints: ["uarmL", "farmL", "handL"] },
    { id: "armR", label: "Arm (screen right)", joints: ["uarmR", "farmR", "handR"] },
    { id: "legL", label: "Leg (screen left)", joints: ["thighL", "shinL", "footL"] },
    { id: "legR", label: "Leg (screen right)", joints: ["thighR", "shinR", "footR"] },
  ],
  sagittal: [
    { id: "spine", label: "Spine & neck", joints: ["spineLo", "spineUp", "neck"] },
    { id: "armL", label: "Arm", joints: ["uarmL", "farmL", "handL"] },
    { id: "legL", label: "Leg", joints: ["thighL", "shinL", "footL"] },
  ],
};

/** Stable joint order for URL encoding and keyboard cycling. */
export const URL_ORDER = {
  coronal: RIGS.coronal.ikBones.map((b) => b.id),
  sagittal: RIGS.sagittal.ikBones.map((b) => b.id),
};
