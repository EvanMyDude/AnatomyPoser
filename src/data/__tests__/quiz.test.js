import { describe, it, expect } from "vitest";
import { generateItems, scoreItem, buildSession, verbFor, jointIdFor } from "../quiz.js";
import { agonistsFor, MUSCLE_CATALOG } from "../muscles.js";
import { NORMS, bandFor } from "../norms.js";
import { RIGS } from "../../rig/rigs.js";
import { emptyProgress, applyResult } from "../../state/progress.js";

const items = generateItems();
const byId = Object.fromEntries(items.map((i) => [i.id, i]));

describe("generateItems", () => {
  it("produces unique, stable ids", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(generateItems().map((i) => i.id)).toEqual(ids);
  });
  it("every item has a plane, prompt, interaction and meta", () => {
    for (const it of items) {
      expect(["coronal", "sagittal"]).toContain(it.plane);
      expect(it.prompt.length).toBeGreaterThan(8);
      expect(["pickMuscle", "poseJoint", "choice"]).toContain(it.interaction);
      expect(it.meta).toBeTruthy();
    }
  });
  it("choice items carry the right number of choices with one correct answer", () => {
    for (const it of items.filter((i) => i.interaction === "choice")) {
      const n = it.type === "which-plane" ? 2 : 4;
      expect(it.choices).toHaveLength(n);
      expect(new Set(it.choices.map((c) => c.id)).size).toBe(n);
      const correct = it.choices.filter((c) => scoreItem(it, c.id).correct);
      expect(correct).toHaveLength(1);
    }
  });
  it("every tap-muscle item has at least one prime mover", () => {
    for (const it of items.filter((i) => i.type === "tap-muscle")) {
      expect(agonistsFor(it.meta.joint, it.meta.movement).some((a) => a.role === "prime")).toBe(true);
    }
  });
  it("pose-to targets are multiples of 5 within the norm and the rig can reach them", () => {
    for (const it of items.filter((i) => i.type === "pose-to")) {
      expect(it.meta.targetDeg % 5).toBe(0);
      expect(it.meta.targetDeg).toBeLessThanOrEqual(NORMS[it.meta.joint][it.meta.movement].norm);
      expect(it.setup.selectJoint).toBe(jointIdFor(it.meta.joint));
      const rig = RIGS[it.plane];
      const b = rig.byId[it.setup.selectJoint];
      expect(b.motion.pos === it.meta.movement || b.motion.neg === it.meta.movement).toBe(true);
    }
  });
  it("rom-normal poses within the rig limit and asks about a band", () => {
    for (const it of items.filter((i) => i.type === "rom-normal")) {
      const rig = RIGS[it.plane];
      for (const [id, rel] of Object.entries(it.setup.angles)) {
        const nl = rig.neutralLocalOf(id), [lo, hi] = rig.boundsOf(id);
        expect(nl + rel).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(nl + rel).toBeLessThanOrEqual(hi + 1e-9);
      }
      expect(it.choices.map((c) => c.id).sort()).toEqual(["mild", "moderate", "normal", "severe"]);
    }
  });
  it("name-muscle distractors exclude the answer and prefer the same group", () => {
    for (const it of items.filter((i) => i.type === "name-muscle")) {
      const answer = MUSCLE_CATALOG.find((m) => m.id === it.meta.muscleId);
      const others = it.choices.filter((c) => c.id !== answer.id);
      expect(others).toHaveLength(3);
      const sameGroup = MUSCLE_CATALOG.filter((m) => m.id !== answer.id && m.group === answer.group);
      const expectedSame = Math.min(3, sameGroup.length);
      expect(others.filter((c) => sameGroup.some((m) => m.id === c.id)).length).toBe(expectedSame);
      expect(it.setup.highlightMuscle.startsWith(answer.id)).toBe(true);
    }
  });
  it("which-plane items answer with the norm's plane", () => {
    for (const it of items.filter((i) => i.type === "which-plane")) {
      expect(scoreItem(it, NORMS[it.meta.joint][it.meta.movement].plane).correct).toBe(true);
    }
  });
  it("verbFor has a phrase for every drawable movement", () => {
    for (const ms of Object.values(NORMS)) for (const [m, e] of Object.entries(ms)) if (e.plane) expect(verbFor(m).length).toBeGreaterThan(3);
  });
});

describe("scoreItem", () => {
  it("tap-muscle: prime = correct, assist = partial, other = wrong", () => {
    const it = byId["tap:shoulder:abduction"];
    expect(scoreItem(it, "deltoid.L")).toMatchObject({ correct: true, partial: false });
    expect(scoreItem(it, "pectoralisMajor.L")).toMatchObject({ correct: false, partial: false });
    const flex = byId["tap:shoulder:flexion"];
    expect(scoreItem(flex, "deltoid.L")).toMatchObject({ correct: false, partial: true }); // deltoid assists flexion
    expect(scoreItem(flex, "deltoid.L").explain).toMatch(/Pectoralis|Deltoid/);
  });
  it("pose-to: within 5 correct, within 10 partial, else wrong, wrong movement wrong", () => {
    const it = byId["pose:hip:flexion:60"];
    expect(scoreItem(it, { degrees: 63 }, { movement: "flexion" })).toMatchObject({ correct: true });
    expect(scoreItem(it, { degrees: 68 }, { movement: "flexion" })).toMatchObject({ correct: false, partial: true });
    expect(scoreItem(it, { degrees: 80 }, { movement: "flexion" })).toMatchObject({ correct: false, partial: false });
    expect(scoreItem(it, { degrees: 60 }, { movement: "extension" })).toMatchObject({ correct: false });
  });
  it("rom-normal: the band from measured / norm is correct", () => {
    const it = byId["rom:hip:flexion"];
    const band = bandFor(it.meta.measured / it.meta.norm).id;
    expect(scoreItem(it, band).correct).toBe(true);
    expect(scoreItem(it, band === "normal" ? "severe" : "normal").correct).toBe(false);
    expect(scoreItem(it, band).explain).toMatch(/%/);
  });
  it("name-muscle: id match", () => {
    const it = byId["name:deltoid"];
    expect(scoreItem(it, "deltoid").correct).toBe(true);
    expect(scoreItem(it, "biceps").correct).toBe(false);
    expect(scoreItem(it, "biceps").explain).toMatch(/Deltoid/);
  });
});

describe("buildSession", () => {
  const now = Date.now();
  it("returns at most n items, deterministic for a seed", () => {
    const a = buildSession(items, emptyProgress(), now, 10, 7);
    const b = buildSession(items, emptyProgress(), now, 10, 7);
    expect(a).toHaveLength(10);
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
    expect(buildSession(items, emptyProgress(), now, 10, 8).map((i) => i.id)).not.toEqual(a.map((i) => i.id));
  });
  it("puts due items before unseen ones", () => {
    let p = emptyProgress();
    const dueIds = items.slice(0, 3).map((i) => i.id);
    for (const id of dueIds) p = applyResult(p, id, false, now - 10); // box 0, due immediately
    const s = buildSession(items, p, now, 10, 1);
    expect(s.slice(0, 3).map((i) => i.id).sort()).toEqual([...dueIds].sort());
  });
  it("never runs more than 3 of a type in a row when avoidable", () => {
    const s = buildSession(items, emptyProgress(), now, 20, 3);
    let run = 1;
    for (let i = 1; i < s.length; i++) { run = s[i].type === s[i - 1].type ? run + 1 : 1; expect(run).toBeLessThanOrEqual(3); }
  });
});
