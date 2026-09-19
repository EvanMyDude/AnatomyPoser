import { describe, it, expect } from "vitest";
import { NORMS } from "../norms.js";
import { MUSCLE_CATALOG, MUSCLES, muscleInstances, agonistsFor, activationMap, invalidActions, muscleById } from "../muscles.js";
import { RIGS } from "../../rig/rigs.js";
import { describePose } from "../../rig/describe.js";

const cor = RIGS.coronal, sag = RIGS.sagittal;
const byKey = (list) => Object.fromEntries(list.map((x) => [x.key || x.id, x]));

describe("muscle catalog content", () => {
  it("ids are unique and every entry has the required fields", () => {
    const ids = MUSCLE_CATALOG.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MUSCLE_CATALOG) {
      for (const f of ["id", "name", "group", "origin", "insertion", "innervation", "why"]) expect(m[f], `${m.id}.${f}`).toBeTruthy();
      expect(typeof m.paired).toBe("boolean");
      expect(m.actions.length).toBeGreaterThan(0);
      expect(["ant", "post"]).toContain(m.place.depth);
      expect(m.place.cor || m.place.sag).toBeTruthy();
    }
  });
  it("every action references a valid NORMS joint and movement", () => {
    expect(invalidActions()).toEqual([]);
    for (const m of MUSCLE_CATALOG) for (const a of m.actions) expect(["prime", "assist"]).toContain(a.role);
  });
  it("every drawable NORMS movement has at least one prime mover", () => {
    const missing = [];
    for (const [joint, table] of Object.entries(NORMS)) for (const [movement, n] of Object.entries(table)) {
      if (n.plane == null) continue;
      if (!agonistsFor(joint, movement).some((a) => a.role === "prime")) missing.push(`${joint}.${movement}`);
    }
    expect(missing, `movements without a prime mover: ${missing.join(", ")}`).toEqual([]);
  });
  it("agonistsFor lists prime movers first and resolves lateral flexion to same-side muscles", () => {
    const elbow = agonistsFor("elbow", "flexion");
    const roles = elbow.map((a) => a.role);
    expect(roles.indexOf("assist")).toBeGreaterThan(roles.lastIndexOf("prime"));
    expect(elbow.map((a) => a.muscle.id)).toContain("biceps");
    const latL = agonistsFor("spineLo", "lateral flexion L").map((a) => a.muscle.id);
    const latR = agonistsFor("spineLo", "lateral flexion R").map((a) => a.muscle.id);
    expect(latL).toEqual(latR);
    expect(latL).toContain("externalOblique");
    expect(agonistsFor("knee", "extension").map((a) => a.muscle.id)).toEqual(["quadriceps"]);
  });
});

describe("muscleInstances", () => {
  it("coronal: two per paired muscle with mirrored off, one per midline muscle", () => {
    const inst = muscleInstances("coronal");
    for (const m of MUSCLE_CATALOG) {
      const mine = inst.filter((i) => i.id === m.id);
      if (!m.place.cor) { expect(mine).toEqual([]); continue; }
      if (m.paired) {
        expect(mine.map((i) => i.key)).toEqual([`${m.id}.L`, `${m.id}.R`]);
        expect(mine[1].place.off + mine[0].place.off).toBe(0);
        expect(mine[0].place.t).toBe(mine[1].place.t);
      } else {
        expect(mine.map((i) => i.key)).toEqual([m.id]);
        expect(mine[0].side).toBeNull();
      }
      for (const i of mine) {
        expect(cor.byId[i.bone], `${i.key} bone ${i.bone}`).toBeTruthy();
        expect(i.muscle).toBe(m);
        expect(i.depth).toBe(m.place.depth);
        expect(i.plane).toBe("coronal");
      }
    }
    expect(inst.find((i) => i.key === "biceps.R").bone).toBe("uarmR");
    expect(inst.find((i) => i.key === "sternocleidomastoid.R").bone).toBe("neck");
  });
  it("sagittal: one L instance per muscle that has a sag placement, none otherwise", () => {
    const inst = muscleInstances("sagittal");
    const withSag = MUSCLE_CATALOG.filter((m) => m.place.sag);
    expect(inst.length).toBe(withSag.length);
    for (const i of inst) {
      expect(sag.byId[i.bone], `${i.key} bone ${i.bone}`).toBeTruthy();
      expect(i.side === "L" || i.side === null).toBe(true);
      expect(i.place).toEqual(i.muscle.place.sag);
    }
    expect(inst.some((i) => i.id === "hipAdductors")).toBe(false);
    expect(inst.some((i) => i.id === "quadratusLumborum")).toBe(false);
  });
  it("is memoized per plane and does not mutate catalog placements", () => {
    expect(muscleInstances("coronal")).toBe(muscleInstances("coronal"));
    expect(muscleById("biceps").place.cor).toEqual({ t: .55, off: 0, len: 44, wid: 18 });
  });
});

describe("legacy MUSCLES export", () => {
  const OLD_IDS = ["scmL", "scmR", "pecL", "pecR", "abs", "oblL", "oblR", "deltL", "deltR", "bicL", "bicR", "brL", "brR", "quadL", "quadR", "tibL", "tibR"];
  it("still contains the 17 original ids", () => {
    const ids = new Set(MUSCLES.map((m) => m.id));
    for (const id of OLD_IDS) expect(ids.has(id), id).toBe(true);
    expect(new Set(MUSCLES.map((m) => m.id)).size).toBe(MUSCLES.length);
  });
  it("keeps the original placements unchanged", () => {
    const m = byKey(MUSCLES);
    expect(m.scmL).toMatchObject({ bone: "neck", name: "Sternocleidomastoid", cor: { t: .5, off: -9, len: 26, wid: 8 }, sag: { t: .5, off: 7, len: 22, wid: 7 } });
    expect(m.scmR).toMatchObject({ bone: "neck", cor: { t: .5, off: 9, len: 26, wid: 8 } });
    expect(m.scmR.sag).toBeUndefined();
    expect(m.pecL).toMatchObject({ bone: "spineUp", cor: { t: .25, off: -26, len: 40, wid: 26 }, sag: { t: .28, off: 20, len: 34, wid: 22 } });
    expect(m.abs).toMatchObject({ bone: "spineLo", cor: { t: .5, off: 0, len: 56, wid: 30 }, sag: { t: .5, off: 15, len: 34, wid: 24 } });
    expect(m.bicL).toMatchObject({ bone: "uarmL", cor: { t: .55, off: 0, len: 44, wid: 18 }, sag: { t: .55, off: -9, len: 44, wid: 16 } });
    expect(m.bicR).toMatchObject({ bone: "uarmR", cor: { t: .55, off: 0, len: 44, wid: 18 } });
    expect(m.tibR).toMatchObject({ bone: "shinR", cor: { t: .45, off: 6, len: 52, wid: 14 } });
  });
});

describe("activationMap", () => {
  const corInst = muscleInstances("coronal"), sagInst = muscleInstances("sagittal");
  it("abducting the coronal left shoulder 90° lights the deltoid at 0.5 and not the pec", () => {
    const a = cor.neutralAngles(); a.uarmL += 90;
    const descs = describePose(cor, a, "coronal");
    expect(descs.uarmL.movement).toBe("abduction");
    const act = activationMap(descs, corInst);
    expect(act["deltoid.L"]).toBeCloseTo(0.5);
    expect(act["pectoralisMajor.L"]).toBe(0);
    expect(act["deltoid.R"]).toBe(0);
    expect(act["gluteusMedius.L"]).toBe(0);
  });
  it("adducting the coronal left shoulder lights the pec and lats, not the deltoid", () => {
    const a = cor.neutralAngles(); a.uarmL -= 25;
    const descs = describePose(cor, a, "coronal");
    expect(descs.uarmL.movement).toBe("adduction");
    const act = activationMap(descs, corInst);
    expect(act["pectoralisMajor.L"]).toBeCloseTo(25 / 50);
    expect(act["latissimusDorsi.L"]).toBeCloseTo(25 / 50);
    expect(act["deltoid.L"]).toBe(0);
  });
  it("sagittal knee flexion lights the hamstrings (prime) and calf (assist at half)", () => {
    const a = sag.neutralAngles(); a.shinL += 60;
    const descs = describePose(sag, a, "sagittal");
    expect(descs.shinL.movement).toBe("flexion");
    const act = activationMap(descs, sagInst);
    expect(act["hamstrings.L"]).toBeCloseTo(60 / 135);
    expect(act["tricepsSurae.L"]).toBeCloseTo(0.5 * 60 / 135);
    expect(act["quadriceps.L"]).toBe(0);
  });
  it("assist role halves the intensity and the max over actions wins", () => {
    const a = sag.neutralAngles(); a.uarmL -= 90; // shoulder flexion 90/180
    const act = activationMap(describePose(sag, a, "sagittal"), sagInst);
    expect(act["pectoralisMajor.L"]).toBeCloseTo(0.5);
    expect(act["deltoid.L"]).toBeCloseTo(0.25);
    expect(act["biceps.L"]).toBeCloseTo(0.25);
  });
  it("intensity clamps at 1 and every instance gets a key", () => {
    const a = cor.neutralAngles(); a.handL = cor.boundsOf("handL")[0]; // full ulnar deviation
    const act = activationMap(describePose(cor, a, "coronal"), corInst);
    expect(act["wristFlexors.L"]).toBe(1);
    expect(act["wristExtensors.L"]).toBe(0.5);
    expect(Object.keys(act).length).toBe(corInst.length);
    for (const i of corInst) expect(act[i.key]).toBeGreaterThanOrEqual(0);
  });
  it("lateral flexion lights the muscle on the concave (patient) side", () => {
    // Positive spineLo rotation is "lateral flexion L": the trunk bends toward
    // the patient's left, which is screen-RIGHT in the front view, so the
    // screen-right ("R") instance is the agonist.
    const a = cor.neutralAngles(); a.spineLo += 15;
    const descs = describePose(cor, a, "coronal");
    expect(descs.spineLo.movement).toBe("lateral flexion L");
    const act = activationMap(descs, corInst);
    expect(act["externalOblique.R"]).toBeCloseTo(15 / 30);
    expect(act["externalOblique.L"]).toBe(0);
    expect(act["quadratusLumborum.R"]).toBeCloseTo(15 / 30);
    expect(act.erectorSpinae).toBeCloseTo(0.5 * 15 / 30); // unpaired: assists either way
  });
});
