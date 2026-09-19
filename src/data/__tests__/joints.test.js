import { describe, it, expect } from "vitest";
import { JOINTS, jointInfo } from "../joints.js";
import { NORMS } from "../norms.js";

describe("joints data", () => {
  it("covers every NORMS joint type and nothing else", () => {
    expect(Object.keys(JOINTS).sort()).toEqual(Object.keys(NORMS).sort());
    expect(Object.keys(JOINTS).length).toBe(9);
  });
  it("every joint has a name, kind, 2-3 restrictions and a measurement tip", () => {
    for (const [type, j] of Object.entries(JOINTS)) {
      expect(j.name, type).toBeTruthy();
      expect(j.kind, type).toBeTruthy();
      expect(Array.isArray(j.restrictions), type).toBe(true);
      expect(j.restrictions.length, type).toBeGreaterThanOrEqual(2);
      expect(j.restrictions.length, type).toBeLessThanOrEqual(3);
      for (const r of j.restrictions) expect(typeof r === "string" && r.length > 10, type).toBe(true);
      expect(typeof j.tip === "string" && j.tip.length > 20, type).toBe(true);
    }
  });
  it("jointInfo looks up by type and returns null for unknown", () => {
    expect(jointInfo("shoulder").kind).toBe("ball-and-socket");
    expect(jointInfo("spineUp").name).toMatch(/Thoracic/);
    expect(jointInfo("nope")).toBeNull();
  });
});
