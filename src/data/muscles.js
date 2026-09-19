// Muscle catalog: ONE entry per muscle (not per side), plus the helpers that
// expand it into drawable per-side instances and score them against a pose.
//
// Entry shape:
//   { id, name, group, paired, origin, insertion, innervation, actions, why, place }
//   actions  [{ joint, movement, role: "prime" | "assist", sameSide? }]
//            `joint` is a NORMS key, `movement` a key of NORMS[joint].
//            Lateral flexion is written ONCE as { movement: "lateral flexion",
//            sameSide: true }: the muscle side-bends toward its own side. The
//            helpers resolve that to the "lateral flexion L" / "lateral flexion
//            R" norms (see SIDE CONVENTION below).
//   place    { bone, depth, cor, sag }
//            bone   side-less bone id: limb "uarm" | "farm" | "hand" | "thigh" |
//                   "shin" | "foot", or midline "neck" | "spineUp" | "spineLo"
//            depth  "ant" (seen from the front) | "post" (drawn dashed in front view)
//            cor/sag  { t, off, len, wid } or null when not drawable in that plane
//              t    fraction along the bone from its proximal end
//              off  perpendicular offset (svg units), see musclePlace()
//
// Placement sign convention (from stage/geometry.js musclePlace):
//   limb bones point DOWN on screen: +off = screen-LEFT, i.e. LATERAL for the
//     screen-left ("L") limb in the coronal rig, and POSTERIOR in the sagittal rig
//   midline bones point UP: +off = screen-RIGHT in coronal, ANTERIOR in sagittal
//   `cor.off` is authored for the screen-left "L" instance and negated for "R".
//
// SIDE CONVENTION: an instance's `side` is the SCREEN side, matching the rig's
// L/R bone ids ("uarmL" is the screen-left arm). The coronal rig is a front
// view, so screen-left "L" is the patient's RIGHT (rig/describe.js displaySide).
// The lateral-flexion norms are named by PATIENT side ("lateral flexion L" is
// the positive rotation of a midline bone, whose tip moves screen-right, i.e.
// toward the patient's left). A same-side lateral flexor on screen side "L"
// therefore fires on "lateral flexion R", and vice versa: the muscle on the
// concave side of the bend lights up. The sagittal rig has no lateral flexion.
import { NORMS } from "./norms.js";

const LIMB_BONES = new Set(["uarm", "farm", "hand", "thigh", "shin", "foot"]);
/** Joint type -> side-less id of the bone whose desc describes that joint. */
const JOINT_BONE = { shoulder: "uarm", elbow: "farm", wrist: "hand", hip: "thigh", knee: "shin", ankle: "foot" };

const P = (t, off, len, wid) => ({ t, off, len, wid });
const A = (joint, movement, role = "prime", extra = {}) => ({ joint, movement, role, ...extra });
const LAT = (joint, role = "prime") => A(joint, "lateral flexion", role, { sameSide: true });

export const MUSCLE_CATALOG = [
  // ---- Neck and trunk --------------------------------------------------------
  {
    id: "sternocleidomastoid", name: "Sternocleidomastoid", group: "Neck", paired: true,
    origin: "Manubrium of sternum (sternal head) and medial third of clavicle (clavicular head)",
    insertion: "Mastoid process of temporal bone and lateral half of superior nuchal line",
    innervation: "Accessory n. (CN XI); C2–C3 for proprioception",
    actions: [A("neck", "flexion"), LAT("neck"), A("neck", "rotation", "assist")],
    why: "The rope-like muscle you see when someone turns their head; a shortened one on one side produces torticollis (wry neck).",
    place: { bone: "neck", depth: "ant", cor: P(.5, -9, 26, 8), sag: P(.5, 7, 22, 7) },
  },
  {
    id: "trapezius", name: "Trapezius (upper fibres)", group: "Neck / upper back", paired: true,
    origin: "External occipital protuberance, ligamentum nuchae and spinous processes of C7–T12",
    insertion: "Lateral third of clavicle, acromion and spine of scapula",
    innervation: "Accessory n. (CN XI); C3–C4 for proprioception",
    actions: [A("neck", "extension"), LAT("neck", "assist"), A("neck", "rotation", "assist")],
    why: "Upper trapezius carries the shoulder girdle and is where desk-bound neck and shoulder tension usually lives.",
    place: { bone: "spineUp", depth: "post", cor: P(.85, -20, 36, 16), sag: P(.85, -10, 36, 12) },
  },
  {
    id: "erectorSpinae", name: "Erector spinae", group: "Back", paired: false,
    origin: "Sacrum, iliac crest, lumbar spinous processes and thoracolumbar fascia (common tendon)",
    insertion: "Ribs, transverse and spinous processes up the spine, mastoid process (iliocostalis, longissimus, spinalis columns)",
    innervation: "Posterior (dorsal) rami of spinal nerves at each level",
    actions: [A("spineLo", "extension"), A("spineUp", "extension"), A("neck", "extension", "assist"), LAT("spineLo", "assist"), LAT("spineUp", "assist")],
    why: "The paired columns either side of the spine that hold you upright and straighten you from a bend; guarding here is a hallmark of acute low back pain.",
    place: { bone: "spineLo", depth: "post", cor: P(.5, 0, 72, 24), sag: P(.5, -9, 72, 14) },
  },
  {
    id: "quadratusLumborum", name: "Quadratus lumborum", group: "Back", paired: true,
    origin: "Posterior iliac crest and iliolumbar ligament",
    insertion: "Inferior border of 12th rib and transverse processes of L1–L4",
    innervation: "Subcostal n. (T12) and ventral rami of L1–L4",
    actions: [LAT("spineLo"), A("spineLo", "extension", "assist")],
    why: "The deep lumbar side-bender that hikes the pelvis; a frequent, often missed source of one-sided low back pain.",
    place: { bone: "spineLo", depth: "post", cor: P(.4, -16, 34, 12), sag: null },
  },
  {
    id: "rectusAbdominis", name: "Rectus abdominis", group: "Abdomen", paired: false,
    origin: "Pubic crest and pubic symphysis",
    insertion: "Xiphoid process and costal cartilages of ribs 5–7",
    innervation: "Thoracoabdominal nn. (T7–T11) and subcostal n. (T12)",
    actions: [A("spineLo", "flexion"), A("spineUp", "flexion")],
    why: "The six-pack muscle that curls the trunk forward and braces the abdomen when you lift or cough.",
    place: { bone: "spineLo", depth: "ant", cor: P(.5, 0, 56, 30), sag: P(.5, 15, 34, 24) },
  },
  {
    id: "externalOblique", name: "External oblique", group: "Abdomen", paired: true,
    origin: "External surfaces of ribs 5–12",
    insertion: "Linea alba, pubic tubercle and anterior half of iliac crest",
    innervation: "Thoracoabdominal nn. (T7–T11) and subcostal n. (T12)",
    actions: [LAT("spineLo"), LAT("spineUp"), A("spineLo", "flexion", "assist")],
    why: "The outermost flank muscle that side-bends and twists the trunk, working with the opposite internal oblique to rotate.",
    place: { bone: "spineLo", depth: "ant", cor: P(.45, -26, 40, 16), sag: P(.5, 22, 34, 16) },
  },

  // ---- Shoulder girdle ---------------------------------------------------------
  {
    id: "deltoid", name: "Deltoid", group: "Shoulder", paired: true,
    origin: "Lateral third of clavicle, acromion and spine of scapula",
    insertion: "Deltoid tuberosity of humerus",
    innervation: "Axillary n. (C5–C6)",
    actions: [A("shoulder", "abduction"), A("shoulder", "flexion", "assist"), A("shoulder", "extension", "assist")],
    why: "The cap of the shoulder that lifts the arm out to the side; it wastes visibly after an axillary nerve injury or shoulder dislocation.",
    place: { bone: "uarm", depth: "ant", cor: P(.14, 0, 34, 26), sag: P(.14, 0, 32, 26) },
  },
  {
    id: "pectoralisMajor", name: "Pectoralis major", group: "Chest", paired: true,
    origin: "Medial half of clavicle, anterior sternum and costal cartilages of ribs 1–6",
    insertion: "Lateral lip of the bicipital (intertubercular) groove of humerus",
    innervation: "Medial and lateral pectoral nn. (C5–T1)",
    actions: [A("shoulder", "adduction"), A("shoulder", "flexion"), A("shoulder", "internal rotation", "assist")],
    why: "The big chest muscle that pulls the arm across the body; push-ups, hugging and bench press all live here.",
    place: { bone: "spineUp", depth: "ant", cor: P(.25, -26, 40, 26), sag: P(.28, 20, 34, 22) },
  },
  {
    id: "latissimusDorsi", name: "Latissimus dorsi", group: "Back", paired: true,
    origin: "Spinous processes of T7–L5, thoracolumbar fascia, iliac crest and ribs 9–12",
    insertion: "Floor of the bicipital (intertubercular) groove of humerus",
    innervation: "Thoracodorsal n. (C6–C8)",
    actions: [A("shoulder", "extension"), A("shoulder", "adduction"), A("shoulder", "internal rotation", "assist")],
    why: "The broad back muscle behind pull-ups and swimming strokes; it pulls the arm down and back with the whole trunk behind it.",
    place: { bone: "spineUp", depth: "post", cor: P(.22, -22, 44, 18), sag: P(.22, -12, 44, 16) },
  },

  // ---- Arm and forearm -----------------------------------------------------
  {
    id: "biceps", name: "Biceps brachii", group: "Anterior arm", paired: true,
    origin: "Supraglenoid tubercle of scapula (long head) and coracoid process (short head)",
    insertion: "Radial tuberosity and bicipital aponeurosis",
    innervation: "Musculocutaneous n. (C5–C6)",
    actions: [A("elbow", "flexion"), A("elbow", "supination"), A("shoulder", "flexion", "assist")],
    why: "Bends the elbow and, more powerfully, turns the palm up; the classic C5–C6 reflex muscle.",
    place: { bone: "uarm", depth: "ant", cor: P(.55, 0, 44, 18), sag: P(.55, -9, 44, 16) },
  },
  {
    id: "triceps", name: "Triceps brachii", group: "Posterior arm", paired: true,
    origin: "Infraglenoid tubercle of scapula (long head); posterior humerus above and below the radial groove (lateral and medial heads)",
    insertion: "Olecranon of ulna",
    innervation: "Radial n. (C6–C8)",
    actions: [A("elbow", "extension"), A("shoulder", "extension", "assist")],
    why: "The only real elbow extensor, so pushing up from a chair or locking the arm out depends on it and on the radial nerve.",
    place: { bone: "uarm", depth: "post", cor: P(.55, 0, 46, 18), sag: P(.55, 9, 46, 16) },
  },
  {
    id: "brachioradialis", name: "Brachioradialis", group: "Lateral forearm", paired: true,
    origin: "Lateral supracondylar ridge of humerus",
    insertion: "Lateral surface of distal radius, just above the styloid process",
    innervation: "Radial n. (C5–C6)",
    actions: [A("elbow", "flexion"), A("elbow", "pronation", "assist"), A("elbow", "supination", "assist")],
    why: "The forearm flexor that bulges when you lift with the thumb up; it returns the forearm to mid-position from either pronation or supination.",
    place: { bone: "farm", depth: "ant", cor: P(.45, 0, 40, 16), sag: P(.45, -6, 40, 14) },
  },
  {
    id: "wristFlexors", name: "Wrist flexors (FCR, FCU)", group: "Anterior forearm", paired: true,
    origin: "Medial epicondyle of humerus (common flexor origin); FCU also from the olecranon and posterior ulna",
    insertion: "FCR: bases of 2nd and 3rd metacarpals; FCU: pisiform, hook of hamate and 5th metacarpal",
    innervation: "FCR median n. (C6–C7); FCU ulnar n. (C7–T1)",
    actions: [A("wrist", "flexion"), A("wrist", "ulnar deviation"), A("wrist", "radial deviation", "assist"), A("elbow", "flexion", "assist")],
    why: "The common flexor origin at the medial epicondyle is the site of golfer's elbow, and these tendons frame the carpal tunnel.",
    place: { bone: "farm", depth: "ant", cor: P(.5, -4, 44, 14), sag: P(.5, -6, 44, 12) },
  },
  {
    id: "wristExtensors", name: "Wrist extensors (ECRL, ECRB, ECU)", group: "Posterior forearm", paired: true,
    origin: "Lateral epicondyle of humerus (common extensor origin); ECRL from the lateral supracondylar ridge",
    insertion: "ECRL/ECRB: bases of 2nd and 3rd metacarpals; ECU: base of 5th metacarpal",
    innervation: "Radial n. and its posterior interosseous branch (C6–C8)",
    actions: [A("wrist", "extension"), A("wrist", "radial deviation"), A("wrist", "ulnar deviation", "assist")],
    why: "Tennis elbow is an overload of this common extensor origin, and a radial nerve palsy shows up as the wrist drop these muscles normally prevent.",
    place: { bone: "farm", depth: "post", cor: P(.5, 4, 44, 14), sag: P(.5, 6, 44, 12) },
  },

  // ---- Hip and thigh ---------------------------------------------------------
  {
    id: "iliopsoas", name: "Iliopsoas", group: "Anterior hip", paired: true,
    origin: "Psoas major: bodies and transverse processes of T12–L5; iliacus: iliac fossa",
    insertion: "Lesser trochanter of femur",
    innervation: "Psoas: ventral rami L1–L3; iliacus: femoral n. (L2–L3)",
    actions: [A("hip", "flexion"), A("hip", "external rotation", "assist")],
    why: "The strongest hip flexor and the one that tightens with prolonged sitting, tipping the pelvis forward and loading the low back (Thomas test).",
    place: { bone: "thigh", depth: "ant", cor: P(.12, -6, 28, 14), sag: P(.12, -8, 28, 12) },
  },
  {
    id: "gluteusMaximus", name: "Gluteus maximus", group: "Gluteal", paired: true,
    origin: "Posterior gluteal line of ilium, posterior sacrum and coccyx, sacrotuberous ligament",
    insertion: "Iliotibial tract and gluteal tuberosity of femur",
    innervation: "Inferior gluteal n. (L5–S2)",
    actions: [A("hip", "extension"), A("hip", "external rotation", "assist"), A("hip", "abduction", "assist")],
    why: "The largest muscle in the body, used for climbing stairs, standing from a chair and sprinting rather than for level walking.",
    place: { bone: "thigh", depth: "post", cor: P(.1, -4, 30, 26), sag: P(.1, 12, 32, 26) },
  },
  {
    id: "gluteusMedius", name: "Gluteus medius", group: "Gluteal", paired: true,
    origin: "Outer surface of ilium between the anterior and posterior gluteal lines",
    insertion: "Lateral surface of greater trochanter of femur",
    innervation: "Superior gluteal n. (L4–S1)",
    actions: [A("hip", "abduction"), A("hip", "internal rotation", "assist")],
    why: "Keeps the pelvis level when you stand on one leg; weakness gives a Trendelenburg sign and the pelvis drops on the swing side.",
    place: { bone: "thigh", depth: "post", cor: P(.06, 12, 24, 14), sag: P(.06, 4, 24, 14) },
  },
  {
    id: "hipAdductors", name: "Hip adductors (longus, brevis, magnus)", group: "Medial thigh", paired: true,
    origin: "Body and inferior ramus of pubis; adductor magnus also from the ischial tuberosity",
    insertion: "Linea aspera of femur; adductor magnus also to the adductor tubercle",
    innervation: "Obturator n. (L2–L4); hamstring part of magnus by tibial division of sciatic n. (L4)",
    actions: [A("hip", "adduction"), A("hip", "flexion", "assist")],
    why: "The groin muscles that pull the legs together and steady the pelvis in walking; a groin strain is usually adductor longus.",
    place: { bone: "thigh", depth: "ant", cor: P(.3, -12, 50, 16), sag: null },
  },
  {
    id: "quadriceps", name: "Quadriceps femoris", group: "Anterior thigh", paired: true,
    origin: "Rectus femoris: anterior inferior iliac spine; vasti: shaft of femur",
    insertion: "Tibial tuberosity via the patella and patellar ligament",
    innervation: "Femoral n. (L2–L4)",
    actions: [A("knee", "extension"), A("hip", "flexion", "assist")],
    why: "Straightens the knee and controls it on stairs and landings; the muscle that wastes fastest after knee injury or surgery.",
    place: { bone: "thigh", depth: "ant", cor: P(.5, 0, 66, 26), sag: P(.5, -9, 60, 24) },
  },
  {
    id: "hamstrings", name: "Hamstrings", group: "Posterior thigh", paired: true,
    origin: "Ischial tuberosity (biceps femoris long head, semitendinosus, semimembranosus); linea aspera (biceps femoris short head)",
    insertion: "Head of fibula (biceps femoris); medial tibia (semitendinosus, semimembranosus)",
    innervation: "Sciatic n., tibial division (L5–S2); biceps short head by the common fibular division",
    actions: [A("knee", "flexion"), A("hip", "extension")],
    why: "Bend the knee and drive the hip back in sprinting; the most commonly strained muscle group in running sports.",
    place: { bone: "thigh", depth: "post", cor: P(.55, -10, 60, 20), sag: P(.55, 10, 60, 20) },
  },

  // ---- Leg -------------------------------------------------------------------
  {
    id: "tricepsSurae", name: "Triceps surae (gastrocnemius, soleus)", group: "Posterior leg", paired: true,
    origin: "Gastrocnemius: posterior femoral condyles; soleus: soleal line of tibia and posterior head of fibula",
    insertion: "Calcaneal tuberosity via the Achilles tendon",
    innervation: "Tibial n. (S1–S2)",
    actions: [A("ankle", "plantarflexion"), A("knee", "flexion", "assist")],
    why: "The calf that pushes you off in every step; its Achilles tendon is the thickest in the body and the one that ruptures in weekend athletes.",
    place: { bone: "shin", depth: "post", cor: P(.4, -4, 50, 18), sag: P(.4, 9, 52, 18) },
  },
  {
    id: "tibialisAnterior", name: "Tibialis anterior", group: "Anterior leg", paired: true,
    origin: "Lateral condyle and upper lateral surface of tibia, interosseous membrane",
    insertion: "Medial cuneiform and base of 1st metatarsal",
    innervation: "Deep fibular (peroneal) n. (L4–L5)",
    actions: [A("ankle", "dorsiflexion")],
    why: "Lifts the foot so the toes clear the ground in swing; a deep fibular nerve or L4–L5 lesion causes foot drop and a slapping gait.",
    place: { bone: "shin", depth: "ant", cor: P(.45, -6, 52, 14), sag: P(.45, -7, 50, 14) },
  },
];

export const muscleById = (id) => MUSCLE_CATALOG.find((m) => m.id === id) || null;

/** Patient side of a screen-side instance in the coronal (front) rig. */
const patientSide = (screenSide) => (screenSide === "L" ? "R" : screenSide === "R" ? "L" : null);

/** The NORMS movement names an action can match for an instance on `side`
 *  (screen side, or null for an unpaired midline muscle). */
const movementsFor = (action, side) => {
  if (!action.sameSide) return [action.movement];
  const p = patientSide(side);
  return p ? [`${action.movement} ${p}`] : [`${action.movement} L`, `${action.movement} R`];
};

const instanceCache = {};

/**
 * Expand the catalog into drawable instances for a plane.
 *   coronal   paired muscles -> "id.L" and "id.R" (cor.off negated for R)
 *   sagittal  paired muscles -> "id.L" only (the rig has one side)
 *   unpaired  -> one instance keyed by the muscle id, side null
 * Muscles with no placement in the plane are skipped. Memoized per plane.
 */
export function muscleInstances(plane) {
  if (instanceCache[plane]) return instanceCache[plane];
  const out = [];
  for (const muscle of MUSCLE_CATALOG) {
    const p = muscle.place;
    const base = plane === "sagittal" ? p.sag : p.cor;
    if (!base) continue;
    const sides = !muscle.paired ? [null] : plane === "sagittal" ? ["L"] : ["L", "R"];
    for (const side of sides) {
      const bone = side && LIMB_BONES.has(p.bone) ? p.bone + side : p.bone;
      const place = plane === "coronal" && side === "R" ? { ...base, off: base.off === 0 ? 0 : -base.off } : { ...base }; // avoid -0
      out.push({ key: side ? `${muscle.id}.${side}` : muscle.id, id: muscle.id, muscle, bone, side, place, depth: p.depth, plane });
    }
  }
  instanceCache[plane] = out;
  return out;
}

/** Muscles that produce `movement` at `joint`: [{ muscle, role }], prime movers
 *  first. "lateral flexion L" / "… R" both return the same-side lateral flexors
 *  (the catalog does not know sides; muscleInstances / activationMap do). */
export function agonistsFor(joint, movement) {
  const out = [];
  for (const muscle of MUSCLE_CATALOG) {
    const a = muscle.actions.find((x) => x.joint === joint && (x.movement === movement || (x.sameSide && movement.startsWith(x.movement + " "))));
    if (a) out.push({ muscle, role: a.role });
  }
  return out.sort((x, y) => (x.role === y.role ? 0 : x.role === "prime" ? -1 : 1));
}

const ROLE_WEIGHT = { prime: 1, assist: 0.5 };
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Activation per instance for a pose: { [instanceKey]: 0..1 }.
 * `descs` is describePose() output keyed by joint id. For each instance and
 * each of its muscle's actions, the desc consulted is the one for that joint
 * on the instance's side (midline joints have no side; an unpaired muscle on a
 * limb joint checks both sides). When the desc's current movement equals the
 * action's movement, intensity = roleWeight * clamp(degrees / norm, 0, 1),
 * prime 1, assist 0.5; the instance takes the max over its actions. Every
 * instance gets a key; idle instances are 0.
 */
export function activationMap(descs, instances) {
  const out = {};
  for (const inst of instances) {
    let best = 0;
    for (const action of inst.muscle.actions) {
      const base = JOINT_BONE[action.joint];
      const ids = !base ? [action.joint] : inst.side ? [base + inst.side] : [base + "L", base + "R"];
      const wanted = movementsFor(action, inst.side);
      for (const id of ids) {
        const d = descs[id];
        if (!d || !d.movement || !d.norm || !wanted.includes(d.movement)) continue;
        const v = (ROLE_WEIGHT[action.role] || 0) * clamp01(d.degrees / d.norm);
        if (v > best) best = v;
      }
    }
    out[inst.key] = best;
  }
  return out;
}

// ---- Legacy per-side shape --------------------------------------------------
// { id, bone, name, cor, sag } as the pre-catalog muscles.js exported it, kept
// for stage/geometry.js placeMuscles. The nine original muscles keep their old
// ids (scmL, pecR, abs, ...); newer ones use the instance key. `sag` rides on
// the L (or unpaired) entry only, as before.
const LEGACY_ID = {
  sternocleidomastoid: "scm", pectoralisMajor: "pec", rectusAbdominis: "abs", externalOblique: "obl",
  deltoid: "delt", biceps: "bic", brachioradialis: "br", quadriceps: "quad", tibialisAnterior: "tib",
};
export const MUSCLES = muscleInstances("coronal").map((inst) => {
  const sagInst = muscleInstances("sagittal").find((s) => s.id === inst.id);
  const legacy = LEGACY_ID[inst.id];
  const entry = { id: legacy ? legacy + (inst.side || "") : inst.key, bone: inst.bone, name: inst.muscle.name, depth: inst.depth, cor: inst.place };
  if (sagInst && inst.side !== "R") entry.sag = sagInst.place;
  return entry;
});

/** Sanity check used by tests: every action names a real NORMS movement. */
export const invalidActions = () => {
  const bad = [];
  for (const m of MUSCLE_CATALOG) for (const a of m.actions) {
    const table = NORMS[a.joint];
    const ok = table && (a.sameSide ? table[`${a.movement} L`] && table[`${a.movement} R`] : table[a.movement]);
    if (!ok) bad.push(`${m.id}: ${a.joint}.${a.movement}`);
  }
  return bad;
};
