import { useEffect } from "react";

/** Global shortcuts: undo/redo, and joint nudging when a joint is selected and
 *  focus is not inside a text field. */
export function useKeyboardPosing({ dispatch, selectedJointId, jointOrder, rig }) {
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || "";
      const inField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); dispatch({ type: e.shiftKey ? "REDO" : "UNDO" }); return; }
      if (inField) return;
      if (e.key === "Escape") { dispatch({ type: "SELECT", selected: null }); return; }
      if (!selectedJointId) return;
      const step = e.shiftKey ? 5 : 1;
      const nudge = (delta) => { e.preventDefault(); dispatch({ type: "NUDGE", id: selectedJointId, delta, at: Date.now() }); };
      switch (e.key) {
        case "ArrowRight": case "ArrowUp": nudge(step); break;
        case "ArrowLeft": case "ArrowDown": nudge(-step); break;
        case "Home": e.preventDefault(); dispatch({ type: "SET_JOINT", id: selectedJointId, value: rig.boundsOf(selectedJointId)[0] }); break;
        case "End": e.preventDefault(); dispatch({ type: "SET_JOINT", id: selectedJointId, value: rig.boundsOf(selectedJointId)[1] }); break;
        case "0": dispatch({ type: "RESET_JOINT", id: selectedJointId }); break;
        case "[": case "]": {
          const i = jointOrder.indexOf(selectedJointId);
          if (i < 0) break;
          const n = jointOrder[(i + (e.key === "]" ? 1 : jointOrder.length - 1)) % jointOrder.length];
          dispatch({ type: "SELECT", selected: { kind: "joint", id: n } });
          break;
        }
        default: break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, selectedJointId, jointOrder, rig]);
}
