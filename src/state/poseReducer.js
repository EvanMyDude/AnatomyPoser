// Pose reducer: pure JS, no React. State is never mutated; every action returns
// the same object reference when nothing changes so React can bail out.
//
// History snapshots are { angles: { coronal, sagittal }, fingerCurl }. Only
// committing actions push; SET_ANGLES is transient (between DRAG_BEGIN and
// DRAG_END). `lastNudge` = { id, at } coalesces rapid NUDGE / SET_FINGER
// commits into one history entry.
import { clamp } from "../rig/kinematics.js";

export const HISTORY_CAP = 100;
const NUDGE_WINDOW_MS = 500;
const FINGER_MAX = 90;

export function initialState(rigs) {
  return {
    plane: "coronal",
    angles: { coronal: rigs.coronal.neutralAngles(), sagittal: rigs.sagittal.neutralAngles() },
    fingerCurl: 0,
    selected: null,
    drag: null,
    history: { past: [], future: [] },
    layer: "both",
    tab: "pose",
    side: "L",
    lastNudge: null,
  };
}

// ---- selectors --------------------------------------------------------------
export const canUndo = (s) => s.history.past.length > 0;
export const canRedo = (s) => s.history.future.length > 0;
export const currentAngles = (s) => s.angles[s.plane];
export const currentRig = (s, rigs) => rigs[s.plane];

// ---- helpers ----------------------------------------------------------------
const sameAngles = (a, b) => {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
};
const sameSnapshot = (a, b) =>
  a.fingerCurl === b.fingerCurl &&
  sameAngles(a.angles.coronal, b.angles.coronal) &&
  sameAngles(a.angles.sagittal, b.angles.sagittal);
const sameSelection = (a, b) => (a == null && b == null) || (a != null && b != null && a.kind === b.kind && a.id === b.id);
/** Joint/bone selections must name a bone of `rig`; muscle ids are not rig ids. */
const inRig = (rig, sel) => sel.kind === "muscle" || !!rig.byId[sel.id];

const snapshot = (s) => ({
  angles: { coronal: { ...s.angles.coronal }, sagittal: { ...s.angles.sagittal } },
  fingerCurl: s.fingerCurl,
});

/** Push a snapshot of `s` onto past, clear future, cap past (drop oldest). */
function pushHistory(s) {
  const past = s.history.past.length >= HISTORY_CAP ? s.history.past.slice(-(HISTORY_CAP - 1)) : s.history.past;
  return { ...s, history: { past: [...past, snapshot(s)], future: [] } };
}

/** Commit a change to the current plane's angles and/or fingerCurl, pushing
 *  history unless `nudge` coalesces with the previous nudge on the same id. */
function commit(s, { angles: patch, fingerCurl } = {}, nudge = null) {
  const cur = s.angles[s.plane];
  const angleChange = !!patch && Object.keys(patch).some((k) => patch[k] !== cur[k]);
  const fingerChange = fingerCurl != null && fingerCurl !== s.fingerCurl;
  if (!angleChange && !fingerChange) return s;
  const coalesce = !!nudge && !!s.lastNudge && s.lastNudge.id === nudge.id && nudge.at - s.lastNudge.at <= NUDGE_WINDOW_MS;
  const next = coalesce ? { ...s } : pushHistory(s);
  if (angleChange) next.angles = { ...s.angles, [s.plane]: { ...cur, ...patch } };
  if (fingerChange) next.fingerCurl = fingerCurl;
  next.lastNudge = nudge;
  return next;
}

const clampJoint = (rig, id, v) => { const [lo, hi] = rig.boundsOf(id); return clamp(v, lo, hi); };

/** Round every joint to an integer offset from neutral, clamped. Same ref if unchanged. */
function snapAngles(rig, angles) {
  let out = null;
  for (const id in angles) {
    if (!rig.byId[id]) continue;
    const nl = rig.neutralLocalOf(id);
    const v = clampJoint(rig, id, Math.round(angles[id] - nl) + nl);
    if (v !== angles[id]) (out ??= { ...angles })[id] = v;
  }
  return out ?? angles;
}

/** Partial angles merged over neutral; unknown ids dropped, values clamped. */
function mergeOverNeutral(rig, partial) {
  const out = rig.neutralAngles();
  for (const id in partial) {
    if (!rig.byId[id] || typeof partial[id] !== "number" || Number.isNaN(partial[id])) continue;
    out[id] = clampJoint(rig, id, partial[id]);
  }
  return out;
}

/** Restore a history snapshot; `from` and `to` are the stacks to move between. */
function restore(s, from, to) {
  const stack = s.history[from];
  if (!stack.length) return s;
  const snap = from === "past" ? stack[stack.length - 1] : stack[0];
  const rest = from === "past" ? stack.slice(0, -1) : stack.slice(1);
  const other = from === "past" ? [snapshot(s), ...s.history[to]] : [...s.history[to], snapshot(s)];
  return {
    ...s, angles: snap.angles, fingerCurl: snap.fingerCurl, drag: null, lastNudge: null,
    history: { [from]: rest, [to]: other },
  };
}

// ---- reducer ----------------------------------------------------------------
export function makeReducer(rigs) {
  return function reduce(s, a) {
    const rig = rigs[s.plane];
    switch (a.type) {
      // Switch rig; keep selection if its id exists there (R -> L into sagittal). Clears drag.
      case "SET_PLANE": {
        if (!rigs[a.plane]) return s;
        if (a.plane === s.plane && s.drag == null) return s;
        let selected = s.selected;
        if (selected) {
          const id = a.plane === "sagittal" && selected.id.endsWith("R") ? selected.id.slice(0, -1) + "L" : selected.id;
          const moved = id === selected.id ? selected : { ...selected, id };
          selected = inRig(rigs[a.plane], moved) ? moved : null;
        }
        return { ...s, plane: a.plane, selected, drag: null };
      }
      // Plain UI sets; no history.
      case "SELECT": return sameSelection(s.selected, a.selected) ? s : { ...s, selected: a.selected ?? null };
      case "SET_LAYER": return s.layer === a.layer ? s : { ...s, layer: a.layer };
      case "SET_TAB": return s.tab === a.tab ? s : { ...s, tab: a.tab };
      case "SET_SIDE": return s.side === a.side ? s : { ...s, side: a.side };
      // Start a gesture: snapshot now so DRAG_END has nothing to push.
      case "DRAG_BEGIN": return { ...pushHistory(s), drag: a.drag, lastNudge: null };
      // Transient frame update during a drag; no history.
      case "SET_ANGLES": return a.angles === s.angles[s.plane] ? s : { ...s, angles: { ...s.angles, [s.plane]: a.angles } };
      // End a gesture: snap to integer-relative angles; drop the DRAG_BEGIN snapshot if nothing moved.
      case "DRAG_END": {
        const snapped = snapAngles(rig, s.angles[s.plane]);
        if (snapped === s.angles[s.plane] && s.drag == null) return s;
        const next = { ...s, drag: null, angles: snapped === s.angles[s.plane] ? s.angles : { ...s.angles, [s.plane]: snapped } };
        const past = s.history.past;
        if (s.drag && past.length && sameSnapshot(past[past.length - 1], snapshot(next)))
          next.history = { ...s.history, past: past.slice(0, -1) };
        return next;
      }
      // Absolute / neutral-relative joint sets, clamped; push history if changed.
      case "SET_JOINT":
        return rig.byId[a.id] ? commit(s, { angles: { [a.id]: clampJoint(rig, a.id, a.value) } }) : s;
      case "SET_JOINT_REL":
        return rig.byId[a.id] ? commit(s, { angles: { [a.id]: clampJoint(rig, a.id, rig.neutralLocalOf(a.id) + a.rel) } }) : s;
      // Increment by delta; consecutive nudges on one joint within 500ms share a history entry.
      case "NUDGE": {
        if (!rig.byId[a.id]) return s;
        const v = clampJoint(rig, a.id, s.angles[s.plane][a.id] + a.delta);
        return commit(s, { angles: { [a.id]: v } }, { id: a.id, at: a.at ?? Date.now() });
      }
      // Resets to neutral, plane-scoped.
      case "RESET_JOINT": return rig.byId[a.id] ? commit(s, { angles: { [a.id]: rig.neutralLocalOf(a.id) } }) : s;
      case "RESET_CHAIN": {
        const patch = {};
        for (const id of a.ids || []) if (rig.byId[id]) patch[id] = rig.neutralLocalOf(id);
        return commit(s, { angles: patch });
      }
      case "RESET_PLANE": return commit(s, { angles: rig.neutralAngles(), fingerCurl: 0 });
      // Finger curl 0..90; coalesces like NUDGE under the id "finger".
      case "SET_FINGER":
        return commit(s, { fingerCurl: clamp(a.value, 0, FINGER_MAX) }, { id: "finger", at: a.at ?? Date.now() });
      // Move snapshots between past and future.
      case "UNDO": return restore(s, "past", "future");
      case "REDO": return restore(s, "future", "past");
      // New session: merge provided fields (angles over neutral, clamped), wipe history.
      case "LOAD": {
        const next = { ...s, drag: null, lastNudge: null, history: { past: [], future: [] } };
        if (rigs[a.plane]) next.plane = a.plane;
        for (const k of ["selected", "layer", "tab", "side"]) if (a[k] !== undefined) next[k] = a[k];
        if (a.angles) {
          next.angles = { ...s.angles };
          for (const p in rigs) if (a.angles[p]) next.angles[p] = mergeOverNeutral(rigs[p], a.angles[p]);
        }
        if (typeof a.fingerCurl === "number") next.fingerCurl = clamp(a.fingerCurl, 0, FINGER_MAX);
        if (next.selected && !inRig(rigs[next.plane], next.selected)) next.selected = null;
        return next;
      }
      default: return s;
    }
  };
}
