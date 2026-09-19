import { useCallback, useMemo, useState } from "react";
import { load, save, KEYS } from "../state/storage.js";
import { NORMS, bandFor } from "../data/norms.js";
import { TYPE_NAME } from "../data/labels.js";

const key = (r) => `${r.j}|${r.s || "-"}|${r.m}`;

/**
 * The measurement sheet: one record per (joint, side, movement).
 *   { j: jointType, s: "L"|"R"|null, m: movement, d: degrees }
 * Persisted to localStorage; the URL can override on load.
 */
export function useMeasurements() {
  const [records, setRecords] = useState(() => load(KEYS.measurements, []));
  const persist = useCallback((next) => { setRecords(next); save(KEYS.measurements, next); }, []);

  const record = useCallback((r) => {
    setRecords((prev) => {
      const k = key(r);
      const next = [...prev.filter((x) => key(x) !== k), { ...r, d: Math.round(r.d) }];
      save(KEYS.measurements, next);
      return next;
    });
  }, []);
  const remove = useCallback((r) => persist(records.filter((x) => key(x) !== key(r))), [records, persist]);
  const clear = useCallback(() => persist([]), [persist]);
  const replaceAll = useCallback((rs) => persist(rs), [persist]);

  /** Rows with norms, bands, and left/right pairing for the table. */
  const rows = useMemo(() => {
    const byKey = Object.fromEntries(records.map((r) => [key(r), r]));
    const out = [];
    const seen = new Set();
    const order = ["neck", "spineUp", "spineLo", "shoulder", "elbow", "wrist", "hip", "knee", "ankle"];
    const sorted = [...records].sort((a, b) => order.indexOf(a.j) - order.indexOf(b.j) || a.m.localeCompare(b.m) || (a.s || "").localeCompare(b.s || ""));
    for (const r of sorted) {
      const k = key(r); if (seen.has(k)) continue;
      const entry = (NORMS[r.j] || {})[r.m];
      const norm = entry ? entry.norm : null;
      const mk = (rec) => {
        const pct = norm ? Math.min(rec.d / norm, 1) : null;
        return { ...rec, label: TYPE_NAME[rec.j] || rec.j, norm, pct, deficit: norm != null ? Math.max(0, norm - rec.d) : null, band: pct != null ? bandFor(pct) : null };
      };
      const row = mk(r);
      seen.add(k);
      const otherSide = r.s === "L" ? "R" : r.s === "R" ? "L" : null;
      const other = otherSide ? byKey[`${r.j}|${otherSide}|${r.m}`] : null;
      if (other) {
        seen.add(key(other));
        const pair = [row, mk(other)].sort((a) => (a.s === "L" ? -1 : 1));
        pair[0].pairStart = true; pair[0].asym = pair[0].d - pair[1].d;
        out.push(...pair);
      } else { row.pairStart = true; out.push(row); }
    }
    return out;
  }, [records]);

  return { records, rows, record, remove, clear, replaceAll };
}
