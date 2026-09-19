import { useCallback, useState } from "react";
import { load, save, KEYS } from "../state/storage.js";
import { emptyProgress, applyResult, completeSession } from "../state/progress.js";

/** Quiz progress (Leitner-lite) persisted in localStorage. */
export function useProgress() {
  const [progress, setProgress] = useState(() => {
    const p = load(KEYS.quiz, null);
    return p && p.v === 1 ? p : emptyProgress();
  });
  const commit = useCallback((next) => { setProgress(next); save(KEYS.quiz, next); }, []);
  const record = useCallback((itemId, correct, now = Date.now()) => setProgress((p) => { const n = applyResult(p, itemId, correct, now); save(KEYS.quiz, n); return n; }), []);
  const finishSession = useCallback((now = Date.now()) => setProgress((p) => { const n = completeSession(p, now); save(KEYS.quiz, n); return n; }), []);
  const reset = useCallback(() => commit(emptyProgress()), [commit]);
  return { progress, record, finishSession, reset };
}
