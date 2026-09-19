import { describe, it, expect } from "vitest";
import { emptyProgress, applyResult, dueItems, unseenItems, touchStreak, completeSession, mastery, INTERVALS_MS, MAX_BOX, localDate } from "../progress.js";

const DAY = 86400000;
const T0 = new Date(2026, 8, 19, 12, 0, 0).getTime(); // local noon

describe("applyResult", () => {
  it("advances the box on correct, resets on wrong, and schedules the next due", () => {
    let p = emptyProgress();
    p = applyResult(p, "a", true, T0);
    expect(p.items.a).toMatchObject({ box: 1, seen: 1, correct: 1, due: T0 + INTERVALS_MS[1] });
    p = applyResult(p, "a", true, T0);
    p = applyResult(p, "a", true, T0);
    p = applyResult(p, "a", true, T0);
    p = applyResult(p, "a", true, T0);
    expect(p.items.a.box).toBe(MAX_BOX);
    expect(p.items.a.due).toBe(T0 + INTERVALS_MS[MAX_BOX]);
    p = applyResult(p, "a", false, T0);
    expect(p.items.a).toMatchObject({ box: 0, seen: 6, correct: 5, due: T0 });
  });
  it("returns a new object and leaves the old one untouched", () => {
    const p0 = emptyProgress();
    const p1 = applyResult(p0, "x", true, T0);
    expect(p1).not.toBe(p0);
    expect(p0.items.x).toBeUndefined();
  });
});

describe("due and unseen", () => {
  it("splits ids by schedule", () => {
    let p = emptyProgress();
    p = applyResult(p, "a", true, T0); // due tomorrow
    p = applyResult(p, "b", false, T0); // due now
    expect(dueItems(p, ["a", "b", "c"], T0)).toEqual(["b"]);
    expect(dueItems(p, ["a", "b", "c"], T0 + DAY)).toEqual(["a", "b"]);
    expect(unseenItems(p, ["a", "b", "c"])).toEqual(["c"]);
  });
});

describe("streak", () => {
  it("increments on consecutive days, holds within a day, resets after a gap", () => {
    let p = emptyProgress();
    p = touchStreak(p, T0);
    expect(p.streak).toEqual({ days: 1, last: localDate(T0) });
    p = touchStreak(p, T0 + 3600000);
    expect(p.streak.days).toBe(1);
    p = touchStreak(p, T0 + DAY);
    expect(p.streak.days).toBe(2);
    p = touchStreak(p, T0 + 4 * DAY);
    expect(p.streak.days).toBe(1);
  });
  it("completeSession counts sessions and touches the streak", () => {
    const p = completeSession(emptyProgress(), T0);
    expect(p.sessions).toBe(1);
    expect(p.streak.days).toBe(1);
  });
});

describe("mastery", () => {
  it("is the mean box over max box, unseen counting as zero", () => {
    let p = emptyProgress();
    p = applyResult(p, "a", true, T0); p = applyResult(p, "a", true, T0); // box 2
    expect(mastery(p, ["a", "b"])).toBeCloseTo((2 / MAX_BOX + 0) / 2);
    expect(mastery(emptyProgress(), [])).toBe(0);
  });
});
