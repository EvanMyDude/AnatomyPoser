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

/** Effector-on-target tolerance for solveCCD's early exit (svg units). */
const CCD_EPS = 0.25;

/** Cyclic coordinate descent: rotate each chain joint (tip first) toward the
 *  target, clamped to its bounds. Incremental: pass the previous frame's angles.
 *  `weights` ({ [jointId]: 0..1 }, missing = 1) scales each joint's delta so
 *  proximal joints (spine, hip, shoulder) follow less eagerly than distal ones.
 *  FK stays inside the joint loop: CCD needs the positions produced by the
 *  previous joint's update, so hoisting it would change the solution. Instead
 *  we stop as soon as the effector is within CCD_EPS of the target. */
export function solveCCD(rig, angles, chain, effectorId, target, iters = 4, weights = null) {
  const a = { ...angles };
  for (let it = 0; it < iters; it++) {
    for (let i = chain.length - 1; i >= 0; i--) {
      const jid = chain[i];
      const { pos } = rig.fk(a);
      const jp = pos[rig.byId[jid].parent], ep = pos[effectorId];
      const ex = target.x - ep.x, ey = target.y - ep.y;
      if (ex * ex + ey * ey < CCD_EPS * CCD_EPS) return a;
      const v1x = ep.x - jp.x, v1y = ep.y - jp.y, v2x = target.x - jp.x, v2y = target.y - jp.y;
      if (v1x * v1x + v1y * v1y < 1e-6 || v2x * v2x + v2y * v2y < 1e-6) continue;
      const w = weights && weights[jid] != null ? weights[jid] : 1;
      const d = Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y) * R2D * w;
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

/** Rotate one joint by a signed delta, clamped to its bounds. Returns the same
 *  `angles` reference when nothing changes (so callers can skip a re-render). */
export function rotateJointByDelta(rig, angles, id, deltaDeg) {
  if (!Number.isFinite(deltaDeg)) return angles;
  const [lo, hi] = rig.boundsOf(id);
  const next = clamp(angles[id] + deltaDeg, lo, hi);
  if (next === angles[id]) return angles;
  return { ...angles, [id]: next };
}

/** Round every ik joint to the nearest `step` degrees relative to its neutral,
 *  then clamp to bounds. Non-ik joints are copied through untouched. */
export function snapAngles(rig, angles, step = 1) {
  const a = { ...angles };
  if (!(step > 0)) return a;
  for (const b of rig.ikBones) {
    const v = a[b.id];
    if (v == null) continue;
    const nl = rig.neutralLocalOf(b.id);
    const [lo, hi] = rig.boundsOf(b.id);
    a[b.id] = clamp(nl + Math.round((v - nl) / step) * step, lo, hi);
  }
  return a;
}

/** Direction of pivot -> point in degrees, SVG frame (+x right, +y down; "up" = -90). */
export const angleAt = (pivot, point) => Math.atan2(point.y - pivot.y, point.x - pivot.x) * R2D;

/** Dead-zone radius around a pivot inside which a drag carries no rotation. */
export const DRAG_DEAD_ZONE = 8;

/** Signed shortest angle (degrees) from the ray pivot->startPoint to the ray
 *  pivot->currentPoint. Clockwise on screen is positive (SVG y-down). Returns 0
 *  when either point sits within DRAG_DEAD_ZONE of the pivot, where the angle is
 *  numerically meaningless and would make the joint spin. */
export function deltaFromDrag(pivot, startPoint, currentPoint) {
  const v1x = startPoint.x - pivot.x, v1y = startPoint.y - pivot.y;
  const v2x = currentPoint.x - pivot.x, v2y = currentPoint.y - pivot.y;
  const dz2 = DRAG_DEAD_ZONE * DRAG_DEAD_ZONE;
  if (v1x * v1x + v1y * v1y < dz2 || v2x * v2x + v2y * v2y < dz2) return 0;
  return Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y) * R2D;
}

export const BASE_VIEWBOX = { x: 0, y: 0, w: 420, h: 640 };

/** Smallest viewBox that contains `base` and every FK position with `pad`
 *  margin, keeping base's aspect ratio by growing the shorter dimension
 *  symmetrically. Returns `base` itself (same reference) when every position
 *  already fits, so memoized consumers see no change at rest. */
export function fitViewBox(pos, base = BASE_VIEWBOX, pad = 30) {
  let x0 = base.x, y0 = base.y, x1 = base.x + base.w, y1 = base.y + base.h;
  let grew = false;
  for (const id in pos) {
    const p = pos[id];
    if (!p) continue;
    if (p.x - pad < x0) { x0 = p.x - pad; grew = true; }
    if (p.x + pad > x1) { x1 = p.x + pad; grew = true; }
    if (p.y - pad < y0) { y0 = p.y - pad; grew = true; }
    if (p.y + pad > y1) { y1 = p.y + pad; grew = true; }
  }
  if (!grew) return base;
  let w = x1 - x0, h = y1 - y0;
  const ratio = base.w / base.h;
  if (w / h > ratio) {
    const nh = w / ratio;
    y0 -= (nh - h) / 2; h = nh;
  } else if (w / h < ratio) {
    const nw = h * ratio;
    x0 -= (nw - w) / 2; w = nw;
  }
  return { x: x0, y: y0, w, h };
}

/** Geometry for the goniometer overlay at joint `id`: the pivot, the neutral
 *  and current ray directions (world degrees), the signed relative angle, and
 *  an arc radius that fits inside the shorter adjacent segment. `pos`/`dir`
 *  come from rig.fk(angles). Pure. */
export function goniometer(rig, angles, pos, dir, id) {
  const b = rig.byId[id];
  const pb = rig.byId[b.parent];
  const pivot = pos[b.parent];
  const neutralLocal = rig.neutralLocalOf(id);
  return {
    pivot: { x: pivot.x, y: pivot.y },
    neutralDeg: dir[b.parent] + neutralLocal,
    currentDeg: dir[id],
    rel: angles[id] - neutralLocal,
    radius: Math.min(b.len, (pb && pb.len) || b.len) * 0.55,
  };
}
