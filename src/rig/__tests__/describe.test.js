import { describe, it, expect } from "vitest";
import { RIGS } from "../rigs.js";
import { describeJoint, describePose, jointLabel, movementNote, relForMovement, displaySide } from "../describe.js";

const cor = RIGS.coronal, sag = RIGS.sagittal;

describe("describeJoint", () => {
  it("knee at rest is not at limit even though neutral sits on the ROM boundary", () => {
    const d = describeJoint(cor, cor.neutralAngles(), "coronal", "shinL");
    expect(d.rel).toBe(0);
    expect(d.relHi).toBe(0);
    expect(d.atLimit).toBe(false);
    expect(d.locked).toBe(false);
    expect(d.movement).toBeNull();
  });
  it("knee fully flexed is at limit", () => {
    const a = cor.neutralAngles(); a.shinL = cor.boundsOf("shinL")[0];
    const d = describeJoint(cor, a, "coronal", "shinL");
    expect(d.atLimit).toBe(true);
    expect(d.movement).toBe("flexion");
    expect(d.degrees).toBe(135);
    expect(d.clinical).toBe(false); // knee flexion is measured in the sagittal plane
  });
  it("coronal ankle is locked and never at limit", () => {
    const d = describeJoint(cor, cor.neutralAngles(), "coronal", "footL");
    expect(d.locked).toBe(true);
    expect(d.atLimit).toBe(false);
    expect(d.note).toMatch(/fixed/);
  });
  it("shoulder abduction 30° reads as clinical abduction against the 180° norm", () => {
    const a = cor.neutralAngles(); a.uarmL += 30;
    const d = describeJoint(cor, a, "coronal", "uarmL");
    expect(d.movement).toBe("abduction");
    expect(d.degrees).toBeCloseTo(30);
    expect(d.norm).toBe(180);
    expect(d.clinical).toBe(true);
    expect(d.pct).toBeCloseTo(30 / 180);
    expect(d.deficit).toBeCloseTo(150);
    expect(d.band.id).toBe("severe");
  });
  it("the mirrored right shoulder abducts with negative rotation", () => {
    const a = cor.neutralAngles(); a.uarmR -= 30;
    expect(describeJoint(cor, a, "coronal", "uarmR").movement).toBe("abduction");
  });
  it("sagittal hip flexion is negative rotation and clinical", () => {
    const a = sag.neutralAngles(); a.thighL -= 90;
    const d = describeJoint(sag, a, "sagittal", "thighL");
    expect(d.movement).toBe("flexion");
    expect(d.degrees).toBeCloseTo(90);
    expect(d.norm).toBe(120);
    expect(d.clinical).toBe(true);
  });
  it("describePose covers every ik bone", () => {
    expect(Object.keys(describePose(cor, cor.neutralAngles(), "coronal")).sort()).toEqual(cor.ikBones.map((b) => b.id).sort());
  });
});

describe("labels", () => {
  it("front view: screen-left limb is the patient's right", () => {
    expect(displaySide("uarmL", "coronal")).toBe("R");
    expect(displaySide("uarmR", "coronal")).toBe("L");
    expect(displaySide("uarmL", "sagittal")).toBeNull();
    expect(jointLabel("uarmL", "coronal")).toBe("Shoulder (R)");
    expect(jointLabel("neck", "coronal")).toBe("Neck");
    expect(jointLabel("thighL", "sagittal")).toBe("Hip");
  });
  it("movement notes come from the norms vocabulary", () => {
    expect(movementNote(cor, "uarmL", "coronal")).toBe("abduction / adduction");
    expect(movementNote(cor, "neck", "coronal")).toBe("lateral flexion");
    expect(movementNote(sag, "footL", "sagittal")).toBe("dorsiflexion / plantarflexion");
  });
  it("relForMovement inverts describeJoint", () => {
    expect(relForMovement(cor, "uarmL", "abduction", 40)).toBe(40);
    expect(relForMovement(cor, "uarmR", "abduction", 40)).toBe(-40);
    expect(() => relForMovement(cor, "uarmL", "flexion", 10)).toThrow();
  });
});
