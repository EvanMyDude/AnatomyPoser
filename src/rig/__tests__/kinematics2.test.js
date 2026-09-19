import { describe, it, expect } from "vitest";
import { RIGS, CHAINS, CHAIN_WEIGHTS } from "../rigs.js";
import {
  solveCCD, rotateJointByDelta, snapAngles, angleAt, deltaFromDrag, fitViewBox, goniometer,
  DRAG_DEAD_ZONE, BASE_VIEWBOX,
} from "../kinematics.js";

const cor = RIGS.coronal;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ray = (pivot, deg, r) => ({ x: pivot.x + r * Math.cos(deg * Math.PI / 180), y: pivot.y + r * Math.sin(deg * Math.PI / 180) });

describe("rotateJointByDelta", () => {
  const a0 = cor.neutralAngles();
  const [lo, hi] = cor.boundsOf("uarmL");
  it("clamps to the upper bound", () => {
    const a1 = rotateJointByDelta(cor, a0, "uarmL", 1000);
    expect(a1.uarmL).toBe(hi);
    expect(a1).not.toBe(a0);
  });
  it("clamps to the lower bound", () => {
    expect(rotateJointByDelta(cor, a0, "uarmL", -1000).uarmL).toBe(lo);
  });
  it("applies a small delta and leaves other joints untouched", () => {
    const a1 = rotateJointByDelta(cor, a0, "uarmL", 10);
    expect(a1.uarmL).toBeCloseTo(a0.uarmL + 10, 9);
    for (const id of Object.keys(a0)) if (id !== "uarmL") expect(a1[id]).toBe(a0[id]);
  });
  it("returns the same reference when nothing changes", () => {
    expect(rotateJointByDelta(cor, a0, "uarmL", 0)).toBe(a0);
    const atHi = { ...a0, uarmL: hi };
    expect(rotateJointByDelta(cor, atHi, "uarmL", 5)).toBe(atHi);
    expect(rotateJointByDelta(cor, a0, "uarmL", NaN)).toBe(a0);
  });
});

describe("snapAngles", () => {
  it("rounds ik joints to integer neutral-relative angles inside bounds", () => {
    const a0 = cor.neutralAngles();
    const messy = { ...a0 };
    for (const b of cor.ikBones) messy[b.id] = cor.neutralLocalOf(b.id) + 12.34;
    messy.uarmL = cor.boundsOf("uarmL")[1] + 40.6; // over the limit
    messy.head = 0.123; // non-ik: must pass through untouched
    const a1 = snapAngles(cor, messy);
    expect(a1).not.toBe(messy);
    for (const b of cor.ikBones) {
      const rel = a1[b.id] - cor.neutralLocalOf(b.id);
      expect(Math.abs(rel - Math.round(rel))).toBeLessThan(1e-9);
      const [lo, hi] = cor.boundsOf(b.id);
      expect(a1[b.id]).toBeGreaterThanOrEqual(lo);
      expect(a1[b.id]).toBeLessThanOrEqual(hi);
    }
    expect(a1.uarmL).toBe(cor.boundsOf("uarmL")[1]);
    expect(a1.head).toBe(0.123);
  });
  it("honours a coarser step", () => {
    const a0 = cor.neutralAngles();
    const a1 = snapAngles(cor, { ...a0, farmL: a0.farmL - 13 }, 5);
    expect(a1.farmL - cor.neutralLocalOf("farmL")).toBeCloseTo(-15, 9);
  });
});

describe("angleAt / deltaFromDrag", () => {
  const P = { x: 100, y: 100 };
  it("angleAt is atan2 in the SVG frame (up = -90)", () => {
    expect(angleAt(P, { x: 100, y: 0 })).toBeCloseTo(-90, 9);
    expect(angleAt(P, { x: 150, y: 100 })).toBeCloseTo(0, 9);
  });
  it("clockwise on screen (y-down) is positive", () => {
    expect(deltaFromDrag(P, ray(P, 0, 40), ray(P, 90, 40))).toBeCloseTo(90, 9);
    expect(deltaFromDrag(P, ray(P, 90, 40), ray(P, 0, 40))).toBeCloseTo(-90, 9);
  });
  it("returns 0 inside the dead zone", () => {
    expect(deltaFromDrag(P, ray(P, 0, DRAG_DEAD_ZONE - 1), ray(P, 90, 40))).toBe(0);
    expect(deltaFromDrag(P, ray(P, 0, 40), { x: P.x + 3, y: P.y - 3 })).toBe(0);
    expect(deltaFromDrag(P, ray(P, 0, 40), ray(P, 90, 40))).not.toBe(0);
  });
  it("takes the shortest path across the +/-180 seam", () => {
    expect(deltaFromDrag(P, ray(P, 170, 50), ray(P, -170, 50))).toBeCloseTo(20, 9);
    expect(deltaFromDrag(P, ray(P, -170, 50), ray(P, 170, 50))).toBeCloseTo(-20, 9);
  });
});

describe("fitViewBox", () => {
  const ratio = BASE_VIEWBOX.w / BASE_VIEWBOX.h;
  it("returns the base reference when every position fits with padding", () => {
    const { pos } = cor.fk(cor.neutralAngles());
    expect(fitViewBox(pos)).toBe(BASE_VIEWBOX);
    const base = { x: 0, y: 0, w: 420, h: 640 };
    expect(fitViewBox(pos, base)).toBe(base);
  });
  it("grows to include an outside point with padding and keeps the aspect ratio", () => {
    const { pos } = cor.fk(cor.neutralAngles());
    const out = { ...pos, handL: { x: -50, y: 200 } };
    const vb = fitViewBox(out);
    expect(vb).not.toBe(BASE_VIEWBOX);
    expect(vb.x).toBeLessThanOrEqual(-50 - 30);
    expect(vb.x + vb.w).toBeGreaterThanOrEqual(BASE_VIEWBOX.w);
    expect(vb.y).toBeLessThanOrEqual(0);
    expect(vb.y + vb.h).toBeGreaterThanOrEqual(BASE_VIEWBOX.h);
    expect(vb.w / vb.h).toBeCloseTo(ratio, 9);
  });
  it("grows symmetrically in the other axis when a point is far below", () => {
    const { pos } = cor.fk(cor.neutralAngles());
    const vb = fitViewBox({ ...pos, footR: { x: 210, y: 900 } });
    expect(vb.y + vb.h).toBeGreaterThanOrEqual(930);
    expect(vb.w / vb.h).toBeCloseTo(ratio, 9);
    // width grew: centred on the base horizontally
    expect(vb.x).toBeLessThan(0);
    expect(vb.x + vb.w - BASE_VIEWBOX.w).toBeCloseTo(-vb.x, 6);
  });
});

describe("solveCCD weights and ikChain", () => {
  it("moves a 0.3-weight joint less than a 1.0-weight joint for the same target", () => {
    const { chain, effector } = CHAINS.coronal.handL;
    const a0 = cor.neutralAngles();
    const target = { x: 60, y: 200 };
    const light = solveCCD(cor, a0, chain, effector, target, 1, { uarmL: 0.3, farmL: 1, handL: 1 });
    const full = solveCCD(cor, a0, chain, effector, target, 1, { uarmL: 1, farmL: 1, handL: 1 });
    const moved = (a, id) => Math.abs(a[id] - a0[id]);
    expect(moved(full, "uarmL")).toBeGreaterThan(0);
    expect(moved(light, "uarmL")).toBeLessThan(moved(full, "uarmL"));
    expect(moved(light, "uarmL")).toBeCloseTo(0.3 * moved(full, "uarmL"), 6);
    // the distal joint (weight 1 in both) is solved first and identically
    expect(light.farmL).toBeCloseTo(full.farmL, 9);
  });
  it("null weights and the default iteration count behave like the unweighted solver", () => {
    const { chain, effector } = CHAINS.coronal.footL;
    const a0 = cor.neutralAngles();
    const target = { x: 120, y: 520 };
    const a = solveCCD(cor, a0, chain, effector, target, 4, null);
    const b = solveCCD(cor, a0, chain, effector, target);
    for (const id of chain) expect(a[id]).toBe(b[id]);
  });
  it("with ikChain (no wrist) never changes the wrist angle but still reaches toward the target", () => {
    const { ikChain, weights, effector, chain } = CHAINS.coronal.handL;
    expect(ikChain).toEqual(["uarmL", "farmL"]);
    expect(chain).toEqual(["uarmL", "farmL", "handL"]);
    const a0 = { ...cor.neutralAngles() };
    a0.handL = cor.neutralLocalOf("handL") + 10; // a deliberately set wrist
    const target = { x: 60, y: 200 };
    const before = dist(cor.fk(a0).pos[effector], target);
    let a = a0;
    for (let i = 0; i < 6; i++) a = solveCCD(cor, a, ikChain, effector, target, 4, weights);
    expect(a.handL).toBe(a0.handL);
    expect(dist(cor.fk(a).pos[effector], target)).toBeLessThan(before);
  });
  it("exits early once the effector is on target", () => {
    const { ikChain, effector, weights } = CHAINS.coronal.footR;
    const a0 = cor.neutralAngles();
    const target = { ...cor.fk(a0).pos[effector] };
    target.x += 0.1;
    const a1 = solveCCD(cor, a0, ikChain, effector, target, 4, weights);
    for (const id of ikChain) expect(a1[id]).toBe(a0[id]);
  });
  it("CHAIN_WEIGHTS feed CHAINS.weights for every plane and effector", () => {
    expect(CHAINS.coronal.head.weights).toEqual({ spineLo: 0.3, spineUp: 0.5, neck: 1 });
    expect(CHAINS.coronal.head.ikChain).toEqual(CHAINS.coronal.head.chain);
    expect(CHAINS.coronal.footR.weights).toEqual({ thighR: 0.7, shinR: 1, footR: 1 });
    expect(CHAINS.coronal.footR.ikChain).toEqual(["thighR", "shinR"]);
    expect(CHAINS.sagittal.handL.weights).toEqual({ uarmL: 0.7, farmL: 1, handL: 1 });
    expect(CHAINS.sagittal.footL.ikChain).toEqual(["thighL", "shinL"]);
    expect(CHAIN_WEIGHTS.head.spineLo).toBe(0.3);
  });
});

describe("goniometer", () => {
  it("neutralDeg and currentDeg differ by rel; pivot is the parent tip", () => {
    const a0 = cor.neutralAngles();
    const a1 = rotateJointByDelta(cor, a0, "uarmL", 30);
    const { pos, dir } = cor.fk(a1);
    const g = goniometer(cor, a1, pos, dir, "uarmL");
    expect(g.rel).toBeCloseTo(30, 9);
    expect(g.currentDeg - g.neutralDeg).toBeCloseTo(g.rel, 9);
    expect(g.pivot).toEqual(pos.clavL);
    expect(g.pivot).not.toBe(pos.clavL);
    expect(g.radius).toBeCloseTo(Math.min(cor.byId.uarmL.len, cor.byId.clavL.len) * 0.55, 9);
  });
  it("falls back to the bone's own length when the parent has none", () => {
    const a0 = cor.neutralAngles();
    const { pos, dir } = cor.fk(a0);
    const g = goniometer(cor, a0, pos, dir, "spineLo");
    expect(g.radius).toBeCloseTo(cor.byId.spineLo.len * 0.55, 9);
    expect(g.rel).toBeCloseTo(0, 9);
    expect(g.currentDeg).toBeCloseTo(g.neutralDeg, 9);
  });
});
