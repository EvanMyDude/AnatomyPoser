import { describe, it, expect } from "vitest";
import { RIGS } from "../../rig/rigs.js";
import { HISTORY_CAP, initialState, makeReducer, canUndo, canRedo, currentAngles, currentRig } from "../poseReducer.js";

const reduce = makeReducer(RIGS);
const cor = RIGS.coronal, sag = RIGS.sagittal;
const run = (state, ...actions) => actions.reduce(reduce, state);
const rel = (state, id) => currentAngles(state)[id] - currentRig(state, RIGS).neutralLocalOf(id);

describe("initial state", () => {
  const s = initialState(RIGS);
  it("has the spec'd shape", () => {
    expect(s.plane).toBe("coronal");
    expect(s.angles.coronal).toEqual(cor.neutralAngles());
    expect(s.angles.sagittal).toEqual(sag.neutralAngles());
    expect(s).toMatchObject({ fingerCurl: 0, selected: null, drag: null, layer: "both", tab: "pose", side: "L", lastNudge: null });
    expect(s.history).toEqual({ past: [], future: [] });
    expect(canUndo(s)).toBe(false);
    expect(canRedo(s)).toBe(false);
    expect(currentAngles(s)).toBe(s.angles.coronal);
    expect(currentRig(s, RIGS)).toBe(cor);
  });
  it("unknown actions and no-op sets return the same reference", () => {
    expect(reduce(s, { type: "NOPE" })).toBe(s);
    expect(reduce(s, { type: "SET_LAYER", layer: "both" })).toBe(s);
    expect(reduce(s, { type: "SET_TAB", tab: "pose" })).toBe(s);
    expect(reduce(s, { type: "SELECT", selected: null })).toBe(s);
    expect(reduce(s, { type: "UNDO" })).toBe(s);
    expect(reduce(s, { type: "REDO" })).toBe(s);
  });
});

describe("drag gesture", () => {
  const s0 = initialState(RIGS);
  it("DRAG_BEGIN / SET_ANGLES / DRAG_END leaves one history entry with integer-relative angles", () => {
    const moved = { ...s0.angles.coronal, uarmL: s0.angles.coronal.uarmL + 12.4, farmL: -33.7 };
    const s1 = run(s0, { type: "DRAG_BEGIN", drag: { kind: "ik", id: "handL" } });
    expect(s1.drag).toEqual({ kind: "ik", id: "handL" });
    expect(s1.history.past).toHaveLength(1);
    const s2 = reduce(s1, { type: "SET_ANGLES", angles: moved });
    expect(s2.angles.coronal).toBe(moved);
    expect(s2.history.past).toHaveLength(1); // transient: no push
    const s3 = reduce(s2, { type: "DRAG_END" });
    expect(s3.drag).toBeNull();
    expect(s3.history.past).toHaveLength(1);
    expect(rel(s3, "uarmL")).toBe(12);
    expect(rel(s3, "farmL")).toBe(-34);
    expect(Number.isInteger(rel(s3, "farmL"))).toBe(true);
    expect(s3.history.past[0].angles.coronal).toEqual(s0.angles.coronal);
    expect(s0.angles.coronal.uarmL).toBe(cor.neutralLocalOf("uarmL")); // never mutated
  });
  it("snap clamps to bounds", () => {
    const [, hi] = cor.boundsOf("uarmL");
    const s = run(s0,
      { type: "DRAG_BEGIN", drag: { kind: "joint", id: "uarmL" } },
      { type: "SET_ANGLES", angles: { ...s0.angles.coronal, uarmL: hi + 40 } },
      { type: "DRAG_END" });
    expect(s.angles.coronal.uarmL).toBe(hi);
  });
  it("a drag that changes nothing leaves no history", () => {
    const s = run(s0, { type: "DRAG_BEGIN", drag: { kind: "ik", id: "handL" } }, { type: "DRAG_END" });
    expect(s.history.past).toHaveLength(0);
    expect(canUndo(s)).toBe(false);
    const tiny = run(s0,
      { type: "DRAG_BEGIN", drag: { kind: "ik", id: "handL" } },
      { type: "SET_ANGLES", angles: { ...s0.angles.coronal, uarmL: s0.angles.coronal.uarmL + 0.3 } },
      { type: "DRAG_END" });
    expect(tiny.history.past).toHaveLength(0);
    expect(tiny.angles.coronal).toEqual(s0.angles.coronal);
  });
  it("DRAG_END without a drag on already-snapped angles is a no-op", () => {
    expect(reduce(s0, { type: "DRAG_END" })).toBe(s0);
  });
});

describe("SET_JOINT / SET_JOINT_REL", () => {
  const s0 = initialState(RIGS);
  it("clamps to bounds and pushes history", () => {
    const [lo, hi] = cor.boundsOf("farmL");
    const s1 = reduce(s0, { type: "SET_JOINT", id: "farmL", value: lo - 100 });
    expect(s1.angles.coronal.farmL).toBe(lo);
    expect(s1.history.past).toHaveLength(1);
    const s2 = reduce(s1, { type: "SET_JOINT", id: "farmL", value: hi + 100 });
    expect(s2.angles.coronal.farmL).toBe(hi);
    expect(s2.history.past).toHaveLength(2);
    expect(s2.angles.sagittal).toBe(s0.angles.sagittal); // other plane untouched
  });
  it("unchanged value or unknown id returns the same reference", () => {
    expect(reduce(s0, { type: "SET_JOINT", id: "farmL", value: s0.angles.coronal.farmL })).toBe(s0);
    expect(reduce(s0, { type: "SET_JOINT", id: "nope", value: 3 })).toBe(s0);
  });
  it("SET_JOINT_REL is relative to neutral", () => {
    const s = reduce(s0, { type: "SET_JOINT_REL", id: "uarmL", rel: 25 });
    expect(rel(s, "uarmL")).toBe(25);
    expect(s.history.past).toHaveLength(1);
  });
});

describe("NUDGE coalescing", () => {
  const s0 = initialState(RIGS);
  it("nudges within 500ms on the same joint share one history entry", () => {
    const s = run(s0,
      { type: "NUDGE", id: "neck", delta: 1, at: 1000 },
      { type: "NUDGE", id: "neck", delta: 1, at: 1300 },
      { type: "NUDGE", id: "neck", delta: 1, at: 1700 });
    expect(rel(s, "neck")).toBe(3);
    expect(s.history.past).toHaveLength(1);
    expect(s.lastNudge).toEqual({ id: "neck", at: 1700 });
    expect(reduce(s, { type: "UNDO" }).angles.coronal.neck).toBe(s0.angles.coronal.neck);
  });
  it("beyond 500ms, or on another joint, a new entry is pushed", () => {
    const s = run(s0,
      { type: "NUDGE", id: "neck", delta: 1, at: 1000 },
      { type: "NUDGE", id: "neck", delta: 1, at: 1600 },
      { type: "NUDGE", id: "spineLo", delta: 1, at: 1650 });
    expect(s.history.past).toHaveLength(3);
  });
  it("a non-nudge commit in between breaks the run", () => {
    const s = run(s0,
      { type: "NUDGE", id: "neck", delta: 1, at: 1000 },
      { type: "SET_JOINT_REL", id: "spineLo", rel: 5 },
      { type: "NUDGE", id: "neck", delta: 1, at: 1100 });
    expect(s.history.past).toHaveLength(3);
  });
  it("clamps and is a no-op at the bound", () => {
    const [, hi] = cor.boundsOf("neck");
    const s1 = reduce(s0, { type: "NUDGE", id: "neck", delta: 999, at: 1 });
    expect(s1.angles.coronal.neck).toBe(hi);
    expect(reduce(s1, { type: "NUDGE", id: "neck", delta: 1, at: 2 })).toBe(s1);
  });
});

describe("UNDO / REDO", () => {
  const s0 = initialState(RIGS);
  const s1 = reduce(s0, { type: "SET_JOINT_REL", id: "uarmL", rel: 10 });
  const s2 = reduce(s1, { type: "SET_JOINT_REL", id: "uarmL", rel: 20 });
  it("undo restores the prior angles, redo reapplies", () => {
    const u = reduce(s2, { type: "UNDO" });
    expect(rel(u, "uarmL")).toBe(10);
    expect(canUndo(u)).toBe(true);
    expect(canRedo(u)).toBe(true);
    const uu = reduce(u, { type: "UNDO" });
    expect(uu.angles.coronal).toEqual(s0.angles.coronal);
    expect(canUndo(uu)).toBe(false);
    expect(reduce(uu, { type: "UNDO" })).toBe(uu);
    const r = reduce(uu, { type: "REDO" });
    expect(rel(r, "uarmL")).toBe(10);
    const rr = reduce(r, { type: "REDO" });
    expect(rel(rr, "uarmL")).toBe(20);
    expect(canRedo(rr)).toBe(false);
    expect(reduce(rr, { type: "REDO" })).toBe(rr);
  });
  it("a new commit after undo clears the future", () => {
    const u = reduce(s2, { type: "UNDO" });
    const n = reduce(u, { type: "SET_JOINT_REL", id: "neck", rel: 5 });
    expect(n.history.future).toHaveLength(0);
    expect(canRedo(n)).toBe(false);
  });
  it("undo also restores fingerCurl and the other plane", () => {
    const s = run(s0,
      { type: "SET_FINGER", value: 45, at: 1 },
      { type: "SET_PLANE", plane: "sagittal" },
      { type: "SET_JOINT_REL", id: "thighL", rel: -30 });
    const u = run(s, { type: "UNDO" }, { type: "UNDO" });
    expect(u.fingerCurl).toBe(0);
    expect(u.angles.sagittal).toEqual(sag.neutralAngles());
    expect(u.plane).toBe("sagittal"); // plane is not part of history
  });
});

describe("RESET_* and SET_FINGER", () => {
  const s0 = initialState(RIGS);
  it("RESET_PLANE restores neutral and fingerCurl 0 with one history entry", () => {
    const posed = run(s0,
      { type: "SET_JOINT_REL", id: "uarmL", rel: 30 },
      { type: "SET_JOINT_REL", id: "shinL", rel: -40 },
      { type: "SET_FINGER", value: 60, at: 1 });
    expect(posed.fingerCurl).toBe(60);
    const r = reduce(posed, { type: "RESET_PLANE" });
    expect(r.angles.coronal).toEqual(cor.neutralAngles());
    expect(r.fingerCurl).toBe(0);
    expect(r.history.past).toHaveLength(posed.history.past.length + 1);
    expect(reduce(r, { type: "RESET_PLANE" })).toBe(r);
  });
  it("RESET_JOINT / RESET_CHAIN are plane-scoped and skip when unchanged", () => {
    const posed = run(s0,
      { type: "SET_JOINT_REL", id: "uarmL", rel: 30 },
      { type: "SET_JOINT_REL", id: "farmL", rel: -40 },
      { type: "SET_JOINT_REL", id: "neck", rel: 10 });
    const j = reduce(posed, { type: "RESET_JOINT", id: "uarmL" });
    expect(rel(j, "uarmL")).toBe(0);
    expect(rel(j, "farmL")).toBe(-40);
    expect(reduce(j, { type: "RESET_JOINT", id: "uarmL" })).toBe(j);
    const c = reduce(posed, { type: "RESET_CHAIN", ids: ["uarmL", "farmL", "handL"] });
    expect(rel(c, "uarmL")).toBe(0);
    expect(rel(c, "farmL")).toBe(0);
    expect(rel(c, "neck")).toBe(10);
    expect(c.history.past).toHaveLength(4);
  });
  it("SET_FINGER clamps 0..90 and coalesces per gesture", () => {
    const s = run(s0,
      { type: "SET_FINGER", value: 10, at: 100 },
      { type: "SET_FINGER", value: 200, at: 200 },
      { type: "SET_FINGER", value: -5, at: 300 });
    expect(s.fingerCurl).toBe(0);
    expect(s.history.past).toHaveLength(1);
    const later = reduce(s, { type: "SET_FINGER", value: 30, at: 2000 });
    expect(later.history.past).toHaveLength(2);
    expect(reduce(later, { type: "SET_FINGER", value: 30, at: 2001 })).toBe(later);
  });
});

describe("LOAD", () => {
  const s0 = initialState(RIGS);
  it("ignores unknown ids, clamps, merges over neutral, and clears history", () => {
    const dirty = run(s0, { type: "SET_JOINT_REL", id: "neck", rel: 5 }, { type: "UNDO" });
    expect(canUndo(dirty) || canRedo(dirty)).toBe(true);
    const [, hi] = cor.boundsOf("uarmL");
    const s = reduce(dirty, {
      type: "LOAD", plane: "sagittal", tab: "measure", fingerCurl: 500,
      angles: { coronal: { uarmL: hi + 50, bogus: 12 }, sagittal: { thighL: -20 } },
    });
    expect(s.plane).toBe("sagittal");
    expect(s.tab).toBe("measure");
    expect(s.fingerCurl).toBe(90);
    expect(s.angles.coronal.uarmL).toBe(hi);
    expect("bogus" in s.angles.coronal).toBe(false);
    expect(s.angles.coronal.neck).toBe(0); // partial angles merged over neutral, not over prior state
    expect(s.angles.sagittal.thighL).toBe(-20);
    expect(s.angles.sagittal.shinL).toBe(sag.neutralLocalOf("shinL"));
    expect(s.history).toEqual({ past: [], future: [] });
    expect(s.layer).toBe("both"); // unprovided fields keep their value
  });
  it("drops a selection that the loaded plane's rig does not have", () => {
    const s = reduce(s0, { type: "LOAD", plane: "sagittal", selected: { kind: "joint", id: "uarmR" } });
    expect(s.selected).toBeNull();
    const m = reduce(s0, { type: "LOAD", plane: "sagittal", selected: { kind: "muscle", id: "deltoid" } });
    expect(m.selected).toEqual({ kind: "muscle", id: "deltoid" });
  });
});

describe("SET_PLANE and selection", () => {
  const s0 = initialState(RIGS);
  it("maps R ids to L when entering sagittal and keeps joint selection", () => {
    const s = run(s0, { type: "SELECT", selected: { kind: "joint", id: "uarmR" } }, { type: "SET_PLANE", plane: "sagittal" });
    expect(s.plane).toBe("sagittal");
    expect(s.selected).toEqual({ kind: "joint", id: "uarmL" });
    expect(currentAngles(s)).toBe(s.angles.sagittal);
  });
  it("keeps a midline selection by reference and clears one the new rig lacks", () => {
    const sel = { kind: "bone", id: "neck" };
    const s = run(s0, { type: "SELECT", selected: sel }, { type: "SET_PLANE", plane: "sagittal" });
    expect(s.selected).toBe(sel);
    const gone = run(s0, { type: "SELECT", selected: { kind: "joint", id: "phantomR" } }, { type: "SET_PLANE", plane: "sagittal" });
    expect(gone.selected).toBeNull();
  });
  it("clears drag, ignores unknown planes, and is a no-op for the same plane", () => {
    const d = reduce(s0, { type: "DRAG_BEGIN", drag: { kind: "aim", id: "farmL" } });
    expect(reduce(d, { type: "SET_PLANE", plane: "sagittal" }).drag).toBeNull();
    expect(reduce(s0, { type: "SET_PLANE", plane: "axial" })).toBe(s0);
    expect(reduce(s0, { type: "SET_PLANE", plane: "coronal" })).toBe(s0);
  });
  it("SELECT / SET_LAYER / SET_TAB / SET_SIDE push no history", () => {
    const s = run(s0,
      { type: "SELECT", selected: { kind: "muscle", id: "deltoid" } },
      { type: "SET_LAYER", layer: "bones" }, { type: "SET_TAB", tab: "learn" }, { type: "SET_SIDE", side: "R" });
    expect(s).toMatchObject({ selected: { kind: "muscle", id: "deltoid" }, layer: "bones", tab: "learn", side: "R" });
    expect(s.history.past).toHaveLength(0);
  });
});

describe("history cap", () => {
  it("keeps at most HISTORY_CAP entries, dropping the oldest", () => {
    let s = initialState(RIGS);
    for (let i = 1; i <= HISTORY_CAP + 10; i++) s = reduce(s, { type: "SET_JOINT_REL", id: "neck", rel: (i % 40) - 20 });
    expect(s.history.past).toHaveLength(HISTORY_CAP);
    // oldest surviving snapshot is the state after commit #10, i.e. neck rel = 10 % 40 - 20
    expect(s.history.past[0].angles.coronal.neck).toBe(10 - 20);
    let u = s;
    for (let i = 0; i < HISTORY_CAP; i++) u = reduce(u, { type: "UNDO" });
    expect(canUndo(u)).toBe(false);
    expect(u.angles.coronal.neck).toBe(10 - 20);
  });
});
