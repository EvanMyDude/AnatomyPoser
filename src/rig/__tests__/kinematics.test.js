import { describe, it, expect } from "vitest";
import { RIGS, CHAINS } from "../rigs.js";
import { solveCCD, aimJoint, chainFor, rigOf } from "../kinematics.js";
import { ANCHOR } from "../bones.js";

const cor = RIGS.coronal, sag = RIGS.sagittal;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

describe("forward kinematics at neutral", () => {
  const { pos } = cor.fk(cor.neutralAngles());
  it("head is straight above the pelvis", () => {
    expect(pos.head.x).toBeCloseTo(ANCHOR.x, 5);
    expect(pos.head.y).toBeLessThan(ANCHOR.y - 150);
  });
  it("arms hang beside the body, mirrored", () => {
    expect(pos.handL.x).toBeLessThan(ANCHOR.x);
    expect(pos.handR.x).toBeGreaterThan(ANCHOR.x);
    expect(pos.handL.x + pos.handR.x).toBeCloseTo(2 * ANCHOR.x, 5);
    expect(pos.handL.y).toBeCloseTo(pos.handR.y, 5);
  });
  it("feet are below the pelvis", () => {
    expect(pos.footL.y).toBeGreaterThan(ANCHOR.y + 150);
  });
});

describe("bounds and chains", () => {
  it("boundsOf = neutral + rom", () => {
    for (const b of cor.ikBones) {
      const nl = cor.neutralLocalOf(b.id);
      expect(cor.boundsOf(b.id)).toEqual([nl + b.rom[0], nl + b.rom[1]]);
    }
  });
  it("chains are derived from topology and match the hand-written originals", () => {
    expect(CHAINS.coronal.head.chain).toEqual(["spineLo", "spineUp", "neck"]);
    expect(CHAINS.coronal.handL.chain).toEqual(["uarmL", "farmL", "handL"]);
    expect(CHAINS.coronal.footR.chain).toEqual(["thighR", "shinR", "footR"]);
    expect(CHAINS.sagittal.footL.chain).toEqual(["thighL", "shinL", "footL"]);
    expect(chainFor(sag, "handL")).toEqual(["uarmL", "farmL", "handL"]);
  });
  it("rigOf rejects a child declared before its parent", () => {
    expect(() => rigOf([{ id: "a", parent: "b", len: 1, nW: 0, rom: [0, 0] }, { id: "b", parent: null, len: 0, nW: -90, rom: [0, 0] }])).toThrow();
  });
});

describe("solveCCD", () => {
  it("never exceeds bounds and moves the effector toward a reachable target", () => {
    const { chain, effector } = CHAINS.coronal.handL;
    const a0 = cor.neutralAngles();
    const target = { x: 60, y: 200 };
    const before = dist(cor.fk(a0).pos[effector], target);
    const a1 = solveCCD(cor, a0, chain, effector, target, 10);
    for (const id of chain) {
      const [lo, hi] = cor.boundsOf(id);
      expect(a1[id]).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(a1[id]).toBeLessThanOrEqual(hi + 1e-9);
    }
    expect(dist(cor.fk(a1).pos[effector], target)).toBeLessThan(before);
  });
  it("is a no-op when the effector is already on target", () => {
    const { chain, effector } = CHAINS.coronal.footL;
    const a0 = cor.neutralAngles();
    const target = cor.fk(a0).pos[effector];
    const a1 = solveCCD(cor, a0, chain, effector, target, 5);
    for (const id of chain) expect(a1[id]).toBeCloseTo(a0[id], 6);
  });
});

describe("aimJoint", () => {
  it("rotates only the named joint, clamped to its bounds", () => {
    const a0 = cor.neutralAngles();
    const P = cor.fk(a0).pos.clavL;
    // target 100° counter-clockwise of the hanging humerus: adduction past the 50° limit
    const a1 = aimJoint(cor, a0, "uarmL", { x: P.x + 100, y: P.y - 12 });
    const [lo] = cor.boundsOf("uarmL");
    expect(a1.uarmL).toBeCloseTo(lo, 6);
    for (const id of Object.keys(a0)) if (id !== "uarmL") expect(a1[id]).toBe(a0[id]);
  });
  it("positive delta for a clockwise target (SVG y-down)", () => {
    const a0 = cor.neutralAngles();
    const { pos } = cor.fk(a0);
    const P = pos.clavL;
    // a point slightly clockwise of the hanging humerus
    const a1 = aimJoint(cor, a0, "uarmL", { x: P.x - 30, y: P.y + 80 });
    expect(a1.uarmL).toBeGreaterThan(a0.uarmL);
  });
});
