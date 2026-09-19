// Pure drawing geometry derived from an FK result. No React.
import { D2R } from "../rig/kinematics.js";

export const VIEW = { x: 0, y: 0, w: 420, h: 640, midX: 210, groundY: 612, headR: 26 };

export const seg = (rig, pos, dir, id) => {
  const b = rig.byId[id], a = pos[b.parent], c = pos[id];
  return { ax: a.x, ay: a.y, bx: c.x, by: c.y, ang: dir[id] };
};

export const boneWidth = (id) =>
  id.startsWith("spine") ? 11 : id === "neck" ? 9 :
  (id.startsWith("thigh") || id.startsWith("shin")) ? 11 :
  (id.startsWith("uarm") || id.startsWith("farm")) ? 8.5 : 7;

/** Place a muscle ellipse along its bone: returns null when the muscle has no
 *  placement in this plane or its bone is not in the rig. */
export const musclePlace = (rig, pos, dir, plane, m) => {
  if (!rig.byId[m.bone]) return null;
  const p = plane === "sagittal" ? m.sag : m.cor;
  if (!p) return null;
  const s = seg(rig, pos, dir, m.bone);
  const dx = s.bx - s.ax, dy = s.by - s.ay;
  const cx = s.ax + dx * p.t, cy = s.ay + dy * p.t;
  const pr = (s.ang + 90) * D2R;
  return { cx: cx + Math.cos(pr) * p.off, cy: cy + Math.sin(pr) * p.off, ang: s.ang, rx: p.len / 2, ry: p.wid / 2 };
};

/** All placeable muscles for this plane, computed once per frame. */
export const placeMuscles = (rig, pos, dir, plane, muscles) =>
  muscles.map((m) => ({ m, pl: musclePlace(rig, pos, dir, plane, m) })).filter((x) => x.pl);

export const fingerPolylines = (pos, dir, handId, fingerCurl) => {
  const base = pos[handId], baseAng = dir[handId], curlR = fingerCurl * D2R;
  return [-18, -6, 6, 18].map((off) => {
    const a0 = (baseAng + off) * D2R, l1 = 12, l2 = 11;
    const j = { x: base.x + Math.cos(a0) * l1, y: base.y + Math.sin(a0) * l1 };
    const a1 = a0 + curlR;
    const tip = { x: j.x + Math.cos(a1) * l2, y: j.y + Math.sin(a1) * l2 };
    return `${base.x},${base.y} ${j.x},${j.y} ${tip.x},${tip.y}`;
  });
};

/** Place muscle INSTANCES (from data/muscles.js muscleInstances) for this frame. */
export const placeInstances = (rig, pos, dir, instances) =>
  instances.map((inst) => {
    const p = inst.place;
    if (!p || !rig.byId[inst.bone]) return null;
    const s = seg(rig, pos, dir, inst.bone);
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const cx = s.ax + dx * p.t, cy = s.ay + dy * p.t;
    const pr = (s.ang + 90) * D2R;
    return { inst, pl: { cx: cx + Math.cos(pr) * p.off, cy: cy + Math.sin(pr) * p.off, ang: s.ang, rx: p.len / 2, ry: p.wid / 2 } };
  }).filter(Boolean);
