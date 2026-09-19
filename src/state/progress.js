// Leitner-lite spaced repetition over a plain, JSON-serialisable object
// (persisted by the caller under storage KEYS.quiz). Every function is pure
// and returns a NEW object; `now` is always a ms timestamp passed in by the
// caller so tests can fake the clock. Nothing here calls Date.now().
//
// Shape:
//   { v: 1,
//     items: { [itemId]: { box, due, seen, correct, last } },   box 0..4
//     streak: { days, last },                                   last "YYYY-MM-DD" local
//     sessions }

const DAY_MS = 86400000;

/** Review interval for each box: 0 (again now), 1, 3, 7, 21 days. */
export const INTERVALS_MS = [0, 1, 3, 7, 21].map((d) => d * DAY_MS);
export const MAX_BOX = INTERVALS_MS.length - 1;

export const emptyProgress = () => ({ v: 1, items: {}, streak: { days: 0, last: null }, sessions: 0 });

const pad2 = (n) => String(n).padStart(2, "0");
/** Local calendar date of a ms timestamp as "YYYY-MM-DD". */
export const localDate = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
/** Local date one calendar day before the one containing `ms` (DST safe). */
const localYesterday = (ms) => {
  const d = new Date(ms);
  return localDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12).getTime());
};

/**
 * Record one answer. Correct: box + 1 (capped at MAX_BOX); wrong: back to
 * box 0. The item is next due at now + INTERVALS_MS[box].
 */
export function applyResult(progress, itemId, correct, now) {
  const prev = progress.items[itemId] || { box: 0, due: 0, seen: 0, correct: 0, last: null };
  const box = correct ? Math.min(prev.box + 1, MAX_BOX) : 0;
  const entry = {
    box,
    due: now + INTERVALS_MS[box],
    seen: prev.seen + 1,
    correct: prev.correct + (correct ? 1 : 0),
    last: now,
  };
  return { ...progress, items: { ...progress.items, [itemId]: entry } };
}

/** Ids (from `itemIds`) that have been seen and whose review is due. */
export function dueItems(progress, itemIds, now) {
  return itemIds.filter((id) => {
    const e = progress.items[id];
    return !!e && e.due <= now;
  });
}

/** Ids (from `itemIds`) never answered. */
export function unseenItems(progress, itemIds) {
  return itemIds.filter((id) => !progress.items[id]);
}

/**
 * Daily streak bookkeeping for a completed session: consecutive local
 * calendar days. Same day -> unchanged; yesterday -> +1; anything else -> 1.
 */
export function touchStreak(progress, now) {
  const today = localDate(now);
  const { days, last } = progress.streak;
  if (last === today) return progress;
  const next = last === localYesterday(now) ? days + 1 : 1;
  return { ...progress, streak: { days: next, last: today } };
}

export function completeSession(progress, now) {
  return touchStreak({ ...progress, sessions: progress.sessions + 1 }, now);
}

/** Mean box over `itemIds` (unseen count as 0), scaled to 0..1. */
export function mastery(progress, itemIds) {
  if (!itemIds.length) return 0;
  let sum = 0;
  for (const id of itemIds) sum += progress.items[id] ? progress.items[id].box : 0;
  return sum / (itemIds.length * MAX_BOX);
}
