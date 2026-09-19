import { useEffect, useRef } from "react";
import { encodePose, decodePose } from "../state/urlCodec.js";

/**
 * Mirrors the pose (and measurement sheet) into location.hash. Reads once on
 * mount (URL beats localStorage), writes debounced and never mid-drag.
 * Returns the decoded measurements from the URL (or null) via onLoad.
 */
export function useUrlState({ state, rigs, measurements, dispatch, onLoadMeasurements }) {
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return; loaded.current = true; // StrictMode double-invoke guard
    const parsed = decodePose(window.location.hash, rigs);
    if (!parsed || Object.keys(parsed).length === 0) return;
    const { measurements: m, ...rest } = parsed;
    if (Object.keys(rest).length) dispatch({ type: "LOAD", ...rest });
    if (m && m.length && onLoadMeasurements) onLoadMeasurements(m);
  }, [rigs, dispatch, onLoadMeasurements]);

  const { plane, angles, fingerCurl, selected, layer, tab, side, drag } = state;
  useEffect(() => {
    if (drag) return;
    const t = setTimeout(() => {
      const hash = encodePose({ plane, angles, fingerCurl, selected, layer, tab, side, measurements }, rigs);
      const next = hash ? "#" + hash : "";
      if (next !== window.location.hash && !(next === "" && window.location.hash === "")) {
        window.history.replaceState(null, "", next || window.location.pathname + window.location.search);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [plane, angles, fingerCurl, selected, layer, tab, side, drag, measurements, rigs]);
}
