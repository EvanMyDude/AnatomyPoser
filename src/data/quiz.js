// Quiz items generated from the data tables (NORMS, MUSCLE_CATALOG, the rigs).
// There is no hand-written question bank: every item is derived, has a stable
// id, and can be regenerated identically on every load, so progress keyed by
// id survives across sessions.
//
// Item shape:
//   { id, type, prompt, plane, interaction, setup, choices?, meta }
//   type         "tap-muscle" | "pose-to" | "rom-normal" | "name-muscle" | "which-plane"
//   plane        the view the stage must show for this item
//   interaction  "pickMuscle" | "poseJoint" | "choice"  (how the UI collects the answer)
//   setup        { angles?: { [jointId]: relDeg }, selectJoint?, highlightMuscle? }
//   choices      [{ id, label }] for interaction "choice"
//   meta         { joint?, movement?, muscleId?, targetDeg?, measured?, side? }
import { NORMS, BANDS, bandFor } from "./norms.js";
import { MUSCLE_CATALOG, muscleInstances, agonistsFor } from "./muscles.js";
import { TYPE_NAME } from "./labels.js";
import { RIGS } from "../rig/rigs.js";
import { relForMovement } from "../rig/describe.js";
import { dueItems, unseenItems } from "../state/progress.js";

// ---- Small deterministic helpers -------------------------------------------

/** FNV-1a 32-bit hash of a string, as an unsigned integer. */
export const hashId = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/** mulberry32 seeded PRNG: returns () => [0, 1). */
export const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffled = (list, rand) => {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const round5 = (v) => Math.round(v / 5) * 5;

// ---- Joint / rig mapping ------------------------------------------------------

/** Joint type -> side-less id of the rig bone whose desc describes that joint. */
const JOINT_BONE = { shoulder: "uarm", elbow: "farm", wrist: "hand", hip: "thigh", knee: "shin", ankle: "foot" };
const isLimb = (joint) => !!JOINT_BONE[joint];

/** Rig joint id used for a joint type in a plane: paired limbs use the screen-left
 *  "L" instance (patient's right in the coronal front view). */
export const jointIdFor = (joint) => (isLimb(joint) ? JOINT_BONE[joint] + "L" : joint);

/** The maximum degrees the rig can show for (joint, movement) in `plane`, or
 *  null when that bone cannot perform the movement in the plane. */
const rigMaxDeg = (plane, joint, movement) => {
  const rig = RIGS[plane];
  const id = jointIdFor(joint);
  const b = rig.byId[id];
  if (!b || !b.motion) return null;
  const nl = rig.neutralLocalOf(id);
  const [lo, hi] = rig.boundsOf(id);
  if (movement === b.motion.pos) return hi - nl;
  if (movement === b.motion.neg) return nl - lo;
  return null;
};

// ---- Wording ----------------------------------------------------------------------

/** Verb phrase per movement. "{joint}" is replaced by the joint phrase
 *  ("the right shoulder"); phrases without it get the joint appended. */
export const MOVEMENT_VERBS = {
  flexion: "flexes {joint}",
  extension: "extends {joint}",
  abduction: "abducts {joint} (lifts it out to the side)",
  adduction: "adducts {joint} (pulls it in)",
  "lateral flexion L": "side-bends {joint}",
  "lateral flexion R": "side-bends {joint}",
  dorsiflexion: "pulls the foot up at {joint} (dorsiflexes)",
  plantarflexion: "points the foot down at {joint} (plantarflexes)",
  "radial deviation": "bends {joint} toward the thumb",
  "ulnar deviation": "bends {joint} toward the little finger",
  rotation: "rotates {joint}",
  "internal rotation": "internally rotates {joint}",
  "external rotation": "externally rotates {joint}",
  pronation: "pronates {joint}",
  supination: "supinates {joint}",
};

/** "flexes the hip"; without a joint phrase, "flexes the joint". */
export function verbFor(movement, jointPhrase = "the joint") {
  const t = MOVEMENT_VERBS[movement] || `produces ${movement} at {joint}`;
  return t.includes("{joint}") ? t.replace("{joint}", jointPhrase) : `${t} ${jointPhrase}`;
}

/** Lower-case joint name, e.g. "hip", "spine (lower)"; "right shoulder" for a
 *  paired limb in the coronal (front) view, where the rig's screen-left "L"
 *  limb is the patient's right. */
const jointNoun = (joint, plane) => {
  const name = TYPE_NAME[joint].toLowerCase();
  return plane === "coronal" && isLimb(joint) ? `right ${name}` : name;
};

/** Display name: the patient-side suffix of "lateral flexion L/R" is an
 *  internal rig direction, not something a learner is asked about. */
const movementLabel = (movement) => movement.replace(/ [LR]$/, "");
/** Two movements are "the same" for scoring when they differ only by side. */
const sameMovement = (a, b) => a === b || (!!a && !!b && movementLabel(a) === movementLabel(b) && /lateral flexion/.test(a));

// ---- Generators -------------------------------------------------------------------

/** (joint, movement, entry) for every NORMS movement, in table order. */
const movementEntries = () => {
  const out = [];
  for (const [joint, table] of Object.entries(NORMS))
    for (const [movement, entry] of Object.entries(table)) {
      if (/ R$/.test(movement)) continue; // "lateral flexion R" duplicates "lateral flexion L" for quiz purposes
      out.push({ joint, movement, entry });
    }
  return out;
};

const clinicalEntries = () => movementEntries().filter(({ entry }) => entry.plane != null);

const sideMeta = (joint) => (isLimb(joint) ? "L" : null);

function tapMuscleItems() {
  const out = [];
  for (const { joint, movement, entry } of clinicalEntries()) {
    const primes = agonistsFor(joint, movement).filter((a) => a.role === "prime");
    if (!primes.length) continue;
    const plane = entry.plane;
    out.push({
      id: `tap:${joint}:${movement}`,
      type: "tap-muscle",
      prompt: `Tap a muscle that ${verbFor(movement, "the " + jointNoun(joint, plane))}`,
      plane,
      interaction: "pickMuscle",
      setup: {},
      meta: { joint, movement, side: sideMeta(joint) },
    });
  }
  return out;
}

const POSE_FRACTIONS = [0.5, 0.75];

function poseToItems() {
  const out = [];
  for (const { joint, movement, entry } of clinicalEntries()) {
    if (!entry.norm) continue; // a 0° norm (knee / elbow extension) has no target to set
    const plane = entry.plane;
    const max = rigMaxDeg(plane, joint, movement);
    if (max == null || max <= 0) continue;
    for (const f of POSE_FRACTIONS) {
      const target = Math.min(round5(entry.norm * f), round5(max));
      if (target <= 0) continue;
      out.push({
        id: `pose:${joint}:${movement}:${target}`,
        type: "pose-to",
        prompt: `Set the ${jointNoun(joint, plane)} to ${target}° ${movementLabel(movement)}`,
        plane,
        interaction: "poseJoint",
        setup: { selectJoint: jointIdFor(joint) },
        meta: { joint, movement, targetDeg: target, side: sideMeta(joint) },
      });
    }
  }
  return out;
}

const ROM_PCTS = [0.45, 0.6, 0.8, 0.95];
const BAND_CHOICES = BANDS.map((b) => ({ id: b.id, label: b.label }));

function romNormalItems() {
  const out = [];
  for (const { joint, movement, entry } of clinicalEntries()) {
    if (!entry.norm) continue; // measured / norm is undefined for a 0° norm
    const plane = entry.plane;
    const max = rigMaxDeg(plane, joint, movement);
    if (max == null || max <= 0) continue;
    const id = `rom:${joint}:${movement}`;
    const pct = ROM_PCTS[hashId(id) % ROM_PCTS.length];
    const measured = Math.max(5, Math.min(round5(entry.norm * pct), Math.floor(max)));
    const jointId = jointIdFor(joint);
    out.push({
      id,
      type: "rom-normal",
      prompt: `This ${jointNoun(joint, plane)} is at ${measured}° ${movementLabel(movement)}. Is that within normal range?`,
      plane,
      interaction: "choice",
      setup: { angles: { [jointId]: relForMovement(RIGS[plane], jointId, movement, measured) } },
      choices: BAND_CHOICES.map((c) => ({ ...c })),
      meta: { joint, movement, measured, norm: entry.norm, side: sideMeta(joint) },
    });
  }
  return out;
}

const byIdOrder = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** The correct muscle plus 3 distractors: same `group` first, then the rest,
 *  in muscle-id order; the correct answer's slot is picked by hashing the item id. */
function muscleChoices(itemId, muscle) {
  const others = MUSCLE_CATALOG.filter((m) => m.id !== muscle.id).slice().sort(byIdOrder);
  const same = others.filter((m) => m.group === muscle.group);
  const rest = others.filter((m) => m.group !== muscle.group);
  const distractors = [...same, ...rest].slice(0, 3);
  const choices = distractors.map((m) => ({ id: m.id, label: m.name }));
  choices.splice(hashId(itemId) % (choices.length + 1), 0, { id: muscle.id, label: muscle.name });
  return choices;
}

function nameMuscleItems() {
  const out = [];
  const coronal = muscleInstances("coronal").filter((inst) => inst.side !== "R");
  const sagittalOnly = muscleInstances("sagittal").filter((inst) => !inst.muscle.place.cor);
  for (const inst of [...coronal, ...sagittalOnly]) {
    const id = `name:${inst.id}`;
    out.push({
      id,
      type: "name-muscle",
      prompt: "Which muscle is highlighted?",
      plane: inst.plane,
      interaction: "choice",
      setup: { highlightMuscle: inst.key },
      choices: muscleChoices(id, inst.muscle),
      meta: { muscleId: inst.id, side: inst.side },
    });
  }
  return out;
}

export const PLANE_CHOICES = [
  { id: "coronal", label: "Front view (coronal)" },
  { id: "sagittal", label: "Side view (sagittal)" },
];

function whichPlaneItems() {
  return clinicalEntries().map(({ joint, movement, entry }) => ({
    id: `plane:${joint}:${movement}`,
    type: "which-plane",
    prompt: `In which plane do you measure ${jointNoun(joint, null)} ${movementLabel(movement)}?`,
    plane: entry.plane,
    interaction: "choice",
    setup: {},
    choices: PLANE_CHOICES.map((c) => ({ ...c })),
    meta: { joint, movement, plane: entry.plane, side: null },
  }));
}

/** Every quiz item, in a deterministic order. */
export function generateItems() {
  const all = [...tapMuscleItems(), ...poseToItems(), ...romNormalItems(), ...nameMuscleItems(), ...whichPlaneItems()];
  const seen = new Set();
  return all.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

// ---- Scoring -------------------------------------------------------------------------

const listNames = (list) => list.map((a) => a.muscle.name).join(", ");

/**
 * Score an answer for an item. Returns { correct, partial, explain }.
 *   tap-muscle   answer = instance key ("deltoid.L") or muscle id
 *   pose-to      answer = { degrees, movement? }; ctx.movement = the joint's current movement
 *   rom-normal   answer = band id
 *   name-muscle  answer = muscle id
 *   which-plane  answer = plane id
 */
export function scoreItem(item, answer, ctx = {}) {
  const m = item.meta;
  switch (item.type) {
    case "tap-muscle": {
      const muscleId = String(answer ?? "").split(".")[0];
      const agonists = agonistsFor(m.joint, m.movement);
      const hit = agonists.find((a) => a.muscle.id === muscleId);
      const primes = agonists.filter((a) => a.role === "prime");
      const correct = !!hit && hit.role === "prime";
      const partial = !correct && !!hit && hit.role === "assist";
      const what = `${TYPE_NAME[m.joint].toLowerCase()} ${movementLabel(m.movement)}`;
      const explain = correct
        ? `${hit.muscle.name} is a prime mover for ${what}. Prime movers: ${listNames(primes)}.`
        : partial
          ? `${hit.muscle.name} only assists ${what}. Prime movers: ${listNames(primes)}.`
          : `Prime movers for ${what}: ${listNames(primes)}.`;
      return { correct, partial, explain };
    }
    case "pose-to": {
      const degrees = answer && typeof answer === "object" ? Number(answer.degrees) : Number(answer);
      const movement = (answer && typeof answer === "object" && answer.movement) || ctx.movement || null;
      const sameMove = sameMovement(movement, m.movement);
      const diff = Number.isFinite(degrees) ? Math.abs(degrees - m.targetDeg) : Infinity;
      const correct = sameMove && diff <= 5;
      const partial = !correct && sameMove && diff <= 10;
      const achieved = Number.isFinite(degrees) ? `${Math.round(degrees)}° ${movement ? movementLabel(movement) : "(no movement)"}` : "nothing";
      const explain = `Target ${m.targetDeg}° ${movementLabel(m.movement)}; you set ${achieved}.` + (correct ? " Within 5°." : partial ? " Within 10°." : "");
      return { correct, partial, explain };
    }
    case "rom-normal": {
      const pct = m.measured / m.norm;
      const band = bandFor(pct);
      const correct = answer === band.id;
      const explain = `${m.measured}° is ${Math.round(pct * 100)}% of the ${m.norm}° norm: ${band.label.toLowerCase()}.`;
      return { correct, partial: false, explain };
    }
    case "name-muscle": {
      const muscle = MUSCLE_CATALOG.find((x) => x.id === m.muscleId);
      const correct = answer === m.muscleId;
      const explain = `${muscle.name}. Origin: ${muscle.origin}.`;
      return { correct, partial: false, explain };
    }
    case "which-plane": {
      const correct = answer === m.plane;
      const label = PLANE_CHOICES.find((c) => c.id === m.plane).label;
      const explain = `${TYPE_NAME[m.joint]} ${movementLabel(m.movement)} is measured in the ${label.toLowerCase()}.`;
      return { correct, partial: false, explain };
    }
    default:
      return { correct: false, partial: false, explain: `Unknown item type ${item.type}` };
  }
}

// ---- Sessions -------------------------------------------------------------------------

const MAX_RUN = 3;

/** Reorder `list` (appending onto `out`) so no more than MAX_RUN items of one
 *  type run consecutively, where possible. Greedy, stable otherwise. */
function spreadTypes(out, list) {
  const pool = list.slice();
  while (pool.length) {
    const n = out.length;
    const runType = n >= MAX_RUN && out.slice(n - MAX_RUN).every((x) => x.type === out[n - 1].type) ? out[n - 1].type : null;
    let idx = runType == null ? 0 : pool.findIndex((x) => x.type !== runType);
    if (idx < 0) idx = 0;
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * Pick up to `n` items for a session: due items first, then unseen, then the
 * rest, each group shuffled by a seeded PRNG and spread across types.
 */
export function buildSession(items, progress, now, n = 10, seed = 0) {
  const ids = items.map((it) => it.id);
  const due = new Set(dueItems(progress, ids, now));
  const unseen = new Set(unseenItems(progress, ids));
  const rand = mulberry32(seed);
  const groups = [
    items.filter((it) => due.has(it.id)),
    items.filter((it) => unseen.has(it.id)),
    items.filter((it) => !due.has(it.id) && !unseen.has(it.id)),
  ];
  const out = [];
  for (const g of groups) {
    if (out.length >= n) break;
    spreadTypes(out, shuffled(g, rand));
  }
  return out.slice(0, n);
}
