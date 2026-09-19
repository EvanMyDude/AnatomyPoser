// Pure kinematics. No React, no DOM.
// Angles in DEGREES. SVG coords: +x right, +y down. "Up" = -90°.
import { ANCHOR, PELVIS_FRAME } from "./bones.js";

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Build a rig from a bone table (each bone must carry `rom`). */
export function rigOf(bones) {
  const byId = Object.fromEntries(bones.map((b) => [b.id, b]));
  // FK walks the array in order, so every parent must precede its children.
  bones.forEach((b, i) => {
    if (b.parent != null && bones.findIndex((p) => p.id === b.parent) > i)
      throw new Error(`Bone "${b.id}" is declared before its parent "${b.parent}"`);
  });
  const neutralLocalOf = (id) => {
    const b = byId[id];
    if (b.parent == null) return 0;
    return b.nW - byId[b.parent].nW;
  };
  const boundsOf = (id) => {
    const nl = neutralLocalOf(id), r = byId[id].rom;
    return [nl + r[0], nl + r[1]];
  };
  const neutralAngles = () => {
    const a = {};
    for (const b of bones) a[b.id] = neutralLocalOf(b.id);
    return a;
  };
  const fk = (angles) => {
    const pos = {}, dir = {};
    pos.pelvis = { ...ANCHOR }; dir.pelvis = PELVIS_FRAME;
    for (const b of bones) {
      if (b.parent == null) continue;
      const wd = dir[b.parent] + angles[b.id]; dir[b.id] = wd;
      const r = wd * D2R;
      pos[b.id] = { x: pos[b.parent].x + b.len * Math.cos(r), y: pos[b.parent].y + b.len * Math.sin(r) };
    }
    return { pos, dir };
  };
  const ikBones = bones.filter((b) => b.ik);
  /** Joint position = the pivot the bone rotates about (its parent's tip). */
  const jointPos = (pos, id) => pos[byId[id].parent];
  return { bones, byId, ikBones, neutralLocalOf, boundsOf, neutralAngles, fk, jointPos };
}

/** IK chain for an effector: the effector bone (if ik) and its ik ancestors,
 *  root first. Stops at the first non-ik ancestor. */
export function chainFor(rig, effectorId) {
  const chain = [];
  let id = effectorId;
  while (id != null) {
    const b = rig.byId[id];
    if (!b) break;
    if (b.ik) chain.unshift(id);
    else if (chain.length) break; // passed the ik run
    id = b.parent;
  }
  return chain;
}

/** Cyclic coordinate descent: rotate each chain joint (tip first) toward the
 *  target, clamped to its bounds. Incremental: pass the previous frame's angles. */
export function solveCCD(rig, angles, chain, effectorId, target, iters = 10) {
  const a = { ...angles };
  for (let it = 0; it < iters; it++) {
    for (let i = chain.length - 1; i >= 0; i--) {
      const jid = chain[i];
      const { pos } = rig.fk(a);
      const jp = pos[rig.byId[jid].parent], ep = pos[effectorId];
      const v1x = ep.x - jp.x, v1y = ep.y - jp.y, v2x = target.x - jp.x, v2y = target.y - jp.y;
      if (v1x * v1x + v1y * v1y < 1e-6 || v2x * v2x + v2y * v2y < 1e-6) continue;
      const d = Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y) * R2D;
      const [lo, hi] = rig.boundsOf(jid);
      a[jid] = clamp(a[jid] + d, lo, hi);
    }
  }
  return a;
}

/** Single-joint rotate: point boneId's tip at the target, clamped. */
export function aimJoint(rig, angles, boneId, target) {
  const a = { ...angles };
  const { pos } = rig.fk(a);
  const b = rig.byId[boneId];
  const P = pos[b.parent], E = pos[boneId];
  const v1x = E.x - P.x, v1y = E.y - P.y, v2x = target.x - P.x, v2y = target.y - P.y;
  if (v1x * v1x + v1y * v1y < 1e-6 || v2x * v2x + v2y * v2y < 1e-6) return a;
  const delta = Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y) * R2D;
  const [lo, hi] = rig.boundsOf(boneId);
  a[boneId] = clamp(a[boneId] + delta, lo, hi);
  return a;
}
