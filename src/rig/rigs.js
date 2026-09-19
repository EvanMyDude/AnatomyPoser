import { CORONAL_BONES, SAGITTAL_BONES } from "./bones.js";
import { rigOf, chainFor } from "./kinematics.js";
import { baseOf } from "./ids.js";

export const RIGS = { coronal: rigOf(CORONAL_BONES), sagittal: rigOf(SAGITTAL_BONES) };

/** Draggable end-effectors per plane and their handle labels. */
export const EFFECTORS = {
  coronal: { head: "Head / spine", handL: "Left hand", handR: "Right hand", footL: "Left foot", footR: "Right foot" },
  sagittal: { head: "Head / spine", handL: "Hand", footL: "Foot" },
};

/** Per-joint IK weights by effector kind, keyed by side-less bone id. Proximal
 *  joints follow the drag less eagerly so the spine and hip do not whip; a
 *  joint absent from its table weighs 1. */
export const CHAIN_WEIGHTS = {
  head: { neck: 1, spineUp: 0.5, spineLo: 0.3 },
  hand: { uarm: 0.7, farm: 1, hand: 1 },
  foot: { thigh: 0.7, shin: 1, foot: 1 },
};

const chainKind = (eff) => (eff === "head" ? "head" : baseOf(eff));

/** Wrist and ankle stay out of IK so the hand/foot keeps its set angle while
 *  the arm/leg follows the drag. */
const isTerminal = (id) => { const b = baseOf(id); return b === "hand" || b === "foot"; };

/** CHAINS[plane][effector] = { chain, ikChain, weights, effector, label },
 *  derived from the rig topology instead of being typed out by hand.
 *    chain    every ik joint from the chain root to the effector
 *    ikChain  the joints solveCCD moves (chain minus wrist/ankle)
 *    weights  { [jointId]: 0..1 } for solveCCD, from CHAIN_WEIGHTS */
export const CHAINS = Object.fromEntries(
  Object.entries(EFFECTORS).map(([plane, effs]) => [
    plane,
    Object.fromEntries(
      Object.entries(effs).map(([eff, label]) => {
        const chain = chainFor(RIGS[plane], eff);
        const table = CHAIN_WEIGHTS[chainKind(eff)] || {};
        const weights = Object.fromEntries(chain.map((id) => [id, table[baseOf(id)] ?? 1]));
        return [eff, { chain, ikChain: chain.filter((id) => !isTerminal(id)), weights, effector: eff, label }];
      })
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
