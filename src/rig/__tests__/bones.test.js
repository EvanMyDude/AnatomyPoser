import { describe, it, expect } from "vitest";
import { CORONAL_BONES, SAGITTAL_BONES, mirrorBone } from "../bones.js";
import { LEGACY_ROM, LEGACY_NW, LEGACY_ORDER, ALIGNED } from "./legacyRom.fixture.js";

const byId = (bones) => Object.fromEntries(bones.map((b) => [b.id, b]));

describe("bone tables reproduce the original rig", () => {
  for (const plane of ["coronal", "sagittal"]) {
    const bones = plane === "coronal" ? CORONAL_BONES : SAGITTAL_BONES;
    const map = byId(bones);
    it(`${plane}: same bone ids`, () => {
      expect(Object.keys(map).sort()).toEqual(Object.keys(LEGACY_ROM[plane]).sort());
    });
    for (const [id, legacy] of Object.entries(LEGACY_ROM[plane])) {
      const expected = (ALIGNED[plane] || {})[id] || legacy;
      it(`${plane}.${id} rom ${JSON.stringify(expected)}`, () => {
        expect(map[id].rom).toEqual(expected);
      });
    }
  }
  it("coronal: mirrored neutral directions and declaration order match", () => {
    expect(CORONAL_BONES.map((b) => b.id)).toEqual(LEGACY_ORDER.coronal);
    for (const [id, nW] of Object.entries(LEGACY_NW.coronal)) expect(CORONAL_BONES.find((b) => b.id === id).nW).toBe(nW);
  });
  it("mirrorBone flips id, parent, direction and movement sign", () => {
    const r = mirrorBone({ id: "uarmL", parent: "clavL", len: 86, nW: 93, ik: true, motion: { pos: "abduction", neg: "adduction" } });
    expect(r).toMatchObject({ id: "uarmR", parent: "clavR", nW: 87, motion: { pos: "adduction", neg: "abduction" } });
    expect(mirrorBone({ id: "clavL", parent: "spineUp", nW: 202, motion: null }).nW).toBe(-22);
  });
});
