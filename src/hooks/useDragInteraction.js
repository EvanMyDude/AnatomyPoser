import { useCallback, useEffect, useRef, useState } from "react";
import { solveCCD, rotateJointByDelta, deltaFromDrag, DRAG_DEAD_ZONE } from "../rig/kinematics.js";

const SNAP = 5;

/**
 * All pointer posing lives here. One drag model, no modes:
 *   ik    effector handle: CCD on the chain (wrist/ankle excluded), grab offset kept
 *   joint joint dot or bone/muscle: rotate that joint by the drag's angular delta
 * Click (no movement past the threshold) selects instead of dragging.
 * Robust to pointercancel, lost capture, and the cursor leaving the SVG.
 */
export function useDragInteraction({ svgRef, rig, chains, posRef, anglesRef, dispatch, isNarrow }) {
  const [active, setActive] = useState(null); // { kind, id } while dragging
  const g = useRef(null); // gesture in progress
  const raf = useRef(0);

  const toSvg = useCallback((ctmInv, cx, cy) => {
    const p = new DOMPoint(cx, cy).matrixTransform(ctmInv);
    return { x: p.x, y: p.y };
  }, []);

  const begin = useCallback((kind, id, e, extra = {}) => {
    const svg = svgRef.current; if (!svg) return;
    e.stopPropagation();
    const m = svg.getScreenCTM(); if (!m) return;
    const ctmInv = m.inverse();
    const start = toSvg(ctmInv, e.clientX, e.clientY);
    g.current = { kind, id, pointerId: e.pointerId, ctmInv, start, screen: { x: e.clientX, y: e.clientY },
      startAngles: anglesRef.current, dragging: false, last: null, target: e.currentTarget, ...extra };
    if (g.current.refFromStart) g.current.ref = start;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not all targets can capture */ }
  }, [svgRef, anglesRef, toSvg]);

  const onHandleDown = useCallback((eff, e) => {
    const c = chains[eff]; if (!c) return;
    const ep = posRef.current[c.effector];
    const svg = svgRef.current; const m = svg && svg.getScreenCTM(); if (!m) return;
    const start = toSvg(m.inverse(), e.clientX, e.clientY);
    begin("ik", eff, e, { effector: c.effector, chain: c.ikChain || c.chain, weights: c.weights, grab: { x: ep.x - start.x, y: ep.y - start.y } });
  }, [begin, chains, posRef, svgRef, toSvg]);

  const onJointDown = useCallback((id, e) => {
    const b = rig.byId[id]; if (!b || !b.ik) return;
    begin("joint", id, e, { pivot: rig.jointPos(posRef.current, id), selectKind: "joint" });
  }, [begin, rig, posRef]);

  const onBoneDown = useCallback((id, e) => {
    const b = rig.byId[id];
    if (b && b.ik) begin("joint", id, e, { pivot: rig.jointPos(posRef.current, id), selectKind: "bone", refFromStart: true });
    else { e.stopPropagation(); dispatch({ type: "SELECT", selected: { kind: "bone", id } }); }
  }, [begin, rig, posRef, dispatch]);

  const onMuscleDown = useCallback((inst, e) => {
    const b = rig.byId[inst.bone];
    if (b && b.ik) begin("joint", inst.bone, e, { pivot: rig.jointPos(posRef.current, inst.bone), selectKind: "muscle", selectId: inst.key, refFromStart: true });
    else { e.stopPropagation(); dispatch({ type: "SELECT", selected: { kind: "muscle", id: inst.key } }); }
  }, [begin, rig, posRef, dispatch]);

  useEffect(() => {
    const threshold = isNarrow ? 8 : 4;
    const solve = () => {
      raf.current = 0;
      const s = g.current; if (!s || !s.dragging || !s.last) return;
      const cur = toSvg(s.ctmInv, s.last.x, s.last.y);
      let next;
      if (s.kind === "ik") {
        const target = { x: cur.x + s.grab.x, y: cur.y + s.grab.y };
        next = solveCCD(rig, anglesRef.current, s.chain, s.effector, target, 4, s.weights);
      } else {
        // A joint-dot drag starts ON the pivot, where an angle is undefined, so
        // the reference ray is the first cursor position outside the dead zone.
        if (!s.ref) {
          if (Math.hypot(cur.x - s.pivot.x, cur.y - s.pivot.y) <= DRAG_DEAD_ZONE) return;
          s.ref = cur;
        }
        let d = deltaFromDrag(s.pivot, s.ref, cur);
        if (s.last.shift) d = Math.round(d / SNAP) * SNAP;
        next = rotateJointByDelta(rig, s.startAngles, s.id, d);
      }
      if (next !== anglesRef.current) dispatch({ type: "SET_ANGLES", angles: next });
    };
    const onMove = (e) => {
      const s = g.current; if (!s || e.pointerId !== s.pointerId) return;
      if (e.buttons === 0) { finish(e, true); return; }
      if (!s.dragging) {
        const dx = e.clientX - s.screen.x, dy = e.clientY - s.screen.y;
        if (dx * dx + dy * dy < threshold * threshold) return;
        s.dragging = true;
        dispatch({ type: "DRAG_BEGIN", drag: { kind: s.kind, id: s.id } });
        if (s.selectKind) dispatch({ type: "SELECT", selected: { kind: "joint", id: s.id } });
        setActive({ kind: s.kind, id: s.id });
      }
      s.last = { x: e.clientX, y: e.clientY, shift: e.shiftKey };
      if (!raf.current) raf.current = requestAnimationFrame(solve);
    };
    const finish = (e, cancelled) => {
      const s = g.current; if (!s || (e && e.pointerId != null && e.pointerId !== s.pointerId)) return;
      g.current = null;
      if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0; }
      try { s.target.releasePointerCapture(s.pointerId); } catch { /* already released */ }
      if (s.dragging) { setActive(null); dispatch({ type: "DRAG_END" }); }
      else if (!cancelled && s.selectKind) {
        dispatch({ type: "SELECT", selected: { kind: s.selectKind === "muscle" ? "muscle" : "joint", id: s.selectKind === "muscle" ? s.selectId : s.id } });
      }
    };
    const onUp = (e) => finish(e, false);
    const onCancel = (e) => finish(e, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", () => finish(null, true));
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [rig, dispatch, anglesRef, isNarrow, toSvg]);

  return { active, onHandleDown, onJointDown, onBoneDown, onMuscleDown };
}
