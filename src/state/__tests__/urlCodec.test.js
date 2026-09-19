import { describe, it, expect } from "vitest";
import { RIGS, URL_ORDER } from "../../rig/rigs.js";
import {
  CODEC_VERSION, JOINT_CODE, MOVEMENT_CODE,
  encodePose, decodePose, encodeMeasurements, decodeMeasurements,
} from "../urlCodec.js";

const cor = RIGS.coronal, sag = RIGS.sagittal;
const nl = (rig, id) => rig.neutralLocalOf(id);

const neutralState = () => ({
  plane: "coronal",
  angles: { coronal: cor.neutralAngles(), sagittal: sag.neutralAngles() },
  fingerCurl: 0,
  selected: null,
  layer: "both",
  tab: "pose",
  side: "L",
  measurements: [],
});

const richState = () => {
  const s = neutralState();
  s.plane = "sagittal";
  s.tab = "measure";
  s.side = "R";
  s.layer = "bones";
  s.selected = { kind: "joint", id: "uarmL" };
  s.angles.coronal.uarmL = nl(cor, "uarmL") + 45;
  s.angles.coronal.farmL = nl(cor, "farmL") - 30;
  s.angles.coronal.thighR = nl(cor, "thighR") - 20;
  s.angles.sagittal.thighL = nl(sag, "thighL") - 90;
  s.angles.sagittal.shinL = nl(sag, "shinL") + 60;
  s.fingerCurl = 30;
  s.measurements = [
    { j: "hip", s: "L", m: "flexion", d: 95 },
    { j: "knee", s: "L", m: "flexion", d: 110 },
    { j: "neck", s: null, m: "lateral flexion L", d: 30 },
  ];
  return s;
};

/** Decode gives a partial; overlay it on a neutral state for comparison. */
const applyDecoded = (base, partial) => {
  const out = { ...base, ...partial, angles: { ...base.angles } };
  for (const p of ["coronal", "sagittal"]) {
    out.angles[p] = { ...base.angles[p], ...((partial.angles || {})[p] || {}) };
  }
  return out;
};

describe("encodePose", () => {
  it("neutral state encodes to the empty string", () => {
    expect(encodePose(neutralState(), RIGS)).toBe("");
  });

  it("emits the exact documented format, in fixed field order", () => {
    const s = richState();
    expect(encodePose(s, RIGS)).toBe(
      `${CODEC_VERSION};p=s;t=m;side=R;l=b;j=uarmL;c=uarmL:45,farmL:-30,thighR:-20;s=thighL:-90,shinL:60;f=30;m=hp.L.fl.95,kn.L.fl.110,nk.-.ll.30`
    );
  });

  it("omits neutral joints and rounds rel values", () => {
    const s = neutralState();
    s.angles.coronal.uarmL = nl(cor, "uarmL") + 10.4;
    s.angles.coronal.farmL = nl(cor, "farmL") + 0.2; // rounds to 0 -> omitted
    expect(encodePose(s, RIGS)).toBe("1;c=uarmL:10");
  });

  it("orders joints by URL_ORDER regardless of object key order", () => {
    const a = neutralState(), b = neutralState();
    const ids = ["footR", "spineLo", "uarmR", "handL"];
    // insert in opposite orders
    a.angles.coronal = {};
    b.angles.coronal = {};
    for (const id of ids) a.angles.coronal[id] = nl(cor, id) + 5;
    for (const id of [...ids].reverse()) b.angles.coronal[id] = nl(cor, id) + 5;
    for (const id of cor.ikBones.map((x) => x.id)) {
      if (!(id in a.angles.coronal)) { a.angles.coronal[id] = nl(cor, id); b.angles.coronal[id] = nl(cor, id); }
    }
    const ea = encodePose(a, RIGS), eb = encodePose(b, RIGS);
    expect(ea).toBe(eb);
    const emitted = ea.replace(/^1;c=/, "").split(",").map((e) => e.split(":")[0]);
    const expected = URL_ORDER.coronal.filter((id) => ids.includes(id));
    expect(emitted).toEqual(expected);
  });

  it("only emits j for joint selections", () => {
    const s = neutralState();
    s.selected = { kind: "muscle", id: "deltoid" };
    expect(encodePose(s, RIGS)).toBe("");
    s.selected = { kind: "joint", id: "neck" };
    expect(encodePose(s, RIGS)).toBe("1;j=neck");
  });

  it("omits defaults for plane/tab/side/layer and zero finger curl", () => {
    const s = neutralState();
    s.plane = "coronal"; s.tab = "pose"; s.side = "L"; s.layer = "both"; s.fingerCurl = 0;
    expect(encodePose(s, RIGS)).toBe("");
    s.tab = "quiz"; s.layer = "muscles";
    expect(encodePose(s, RIGS)).toBe("1;t=q;l=m");
  });
});

describe("round trip", () => {
  it("rich state (both planes, finger, selection, measurements) is exact", () => {
    const s = richState();
    const decoded = decodePose(encodePose(s, RIGS), RIGS);
    expect(applyDecoded(neutralState(), decoded)).toEqual(s);
  });

  it("decoded angles are absolute local angles for present joints only", () => {
    const d = decodePose("1;c=uarmL:45", RIGS);
    expect(d).toEqual({ angles: { coronal: { uarmL: nl(cor, "uarmL") + 45 } } });
  });
});

describe("decodePose tolerance", () => {
  it("returns {} for empty, '#', and garbage", () => {
    expect(decodePose("", RIGS)).toEqual({});
    expect(decodePose("#", RIGS)).toEqual({});
    expect(decodePose("lol;wat=;;=x", RIGS)).toEqual({});
    expect(decodePose(undefined, RIGS)).toEqual({});
    expect(decodePose(null, RIGS)).toEqual({});
  });

  it("tolerates a leading '#'", () => {
    expect(decodePose("#1;p=s;f=12", RIGS)).toEqual({ plane: "sagittal", fingerCurl: 12 });
  });

  it("treats a missing or unknown version as 1", () => {
    expect(decodePose("p=s", RIGS)).toEqual({ plane: "sagittal" });
    expect(decodePose("99;p=s", RIGS)).toEqual({ plane: "sagittal" });
  });

  it("ignores unknown fields, unknown ids, and non-integer values", () => {
    const d = decodePose("1;zz=1;c=nope:10,uarmL:abc,farmL:1.5,uarmR:20,head:5;f=x;t=zzz", RIGS);
    expect(d).toEqual({ angles: { coronal: { uarmR: nl(cor, "uarmR") + 20 } } });
  });

  it("clamps out-of-range rel values to the rig bounds", () => {
    const [lo, hi] = cor.boundsOf("uarmL");
    const d = decodePose("1;c=uarmL:9999,farmL:-9999", RIGS);
    expect(d.angles.coronal.uarmL).toBe(hi);
    expect(d.angles.coronal.farmL).toBe(cor.boundsOf("farmL")[0]);
    expect(d.angles.coronal.uarmL).toBeGreaterThanOrEqual(lo);
  });

  it("ignores invalid enum values and unknown selected joint ids", () => {
    expect(decodePose("1;p=q;t=zz;side=X;l=y;j=bogus", RIGS)).toEqual({});
    expect(decodePose("1;j=thighR", RIGS)).toEqual({ selected: { kind: "joint", id: "thighR" } });
  });

  it("sagittal ids that are not in the sagittal rig are ignored there", () => {
    expect(decodePose("1;s=uarmR:10", RIGS)).toEqual({});
  });
});

describe("measurements codec", () => {
  it("round-trips including a null side", () => {
    const recs = [
      { j: "shoulder", s: "R", m: "abduction", d: 150 },
      { j: "spineLo", s: null, m: "extension", d: 15 },
      { j: "ankle", s: "L", m: "dorsiflexion", d: 18 },
    ];
    const str = encodeMeasurements(recs);
    expect(str).toBe("sh.R.ab.150,sl.-.ex.15,an.L.df.18");
    expect(decodeMeasurements(str)).toEqual(recs);
  });

  it("skips malformed or unknown entries", () => {
    expect(decodeMeasurements("hp.L.fl.95,xx.L.fl.10,hp.Z.fl.10,hp.L.zz.10,hp.L.fl.9.5,hp.L.fl,,junk")).toEqual([
      { j: "hip", s: "L", m: "flexion", d: 95 },
    ]);
    expect(decodeMeasurements("")).toEqual([]);
    expect(decodeMeasurements(undefined)).toEqual([]);
    expect(encodeMeasurements([{ j: "nope", s: "L", m: "flexion", d: 1 }, null])).toBe("");
    expect(encodeMeasurements(undefined)).toBe("");
  });

  it("joint and movement code tables are injective", () => {
    const uniq = (o) => new Set(Object.values(o)).size === Object.values(o).length;
    expect(uniq(JOINT_CODE)).toBe(true);
    expect(uniq(MOVEMENT_CODE)).toBe(true);
  });
});
