import React, { useCallback, useEffect, useMemo, useState } from "react";
import { generateItems, buildSession, scoreItem } from "../data/quiz.js";
import { dueItems, mastery } from "../state/progress.js";

const ALL_ITEMS = generateItems();
const TYPE_LABEL = { "tap-muscle": "Find the muscle", "pose-to": "Pose the joint", "rom-normal": "Judge the range", "name-muscle": "Name the muscle", "which-plane": "Pick the plane" };

/**
 * Quiz runner. The figure is the answer surface: items set the view and pose,
 * then collect a tap, a pose, or a button choice. Progress is spaced
 * repetition-lite in localStorage.
 */
export default function QuizTab({ descs, dispatch, progress, recordResult, finishSession, setInteraction, setQuizPick }) {
  const [session, setSession] = useState(null); // { items, i, phase: "prompt"|"feedback"|"done", results: [] }
  const item = session && session.phase !== "done" ? session.items[session.i] : null;
  const [feedback, setFeedback] = useState(null);

  // Sampled in event handlers (start, finish, back) so the intro counts are fresh without impure reads in render.
  const [now, setNow] = useState(() => Date.now());
  const due = useMemo(() => dueItems(progress, ALL_ITEMS.map((x) => x.id), now).length, [progress, now]);
  const seen = Object.keys(progress.items || {}).length;
  const overall = useMemo(() => mastery(progress, ALL_ITEMS.map((x) => x.id)), [progress]);

  const start = useCallback(() => {
    const t = Date.now(); setNow(t);
    const items = buildSession(ALL_ITEMS, progress, t, 10, t % 100000);
    setSession({ items, i: 0, phase: "prompt", results: [] });
    setFeedback(null);
  }, [progress]);

  // Apply the current item's setup to the stage.
  useEffect(() => {
    if (!item) { setInteraction({ kind: "pose" }); return; }
    dispatch({ type: "QUIZ_SETUP", plane: item.plane, rel: item.setup.angles || {}, selected: item.setup.highlightMuscle ? { kind: "muscle", id: item.setup.highlightMuscle } : item.setup.selectJoint ? { kind: "joint", id: item.setup.selectJoint } : null });
    if (item.interaction === "pickMuscle") setInteraction({ kind: "pickMuscle" });
    else if (item.interaction === "poseJoint") setInteraction({ kind: "poseJoint", joint: item.setup.selectJoint });
    else setInteraction({ kind: "readonly" });
  }, [item, dispatch, setInteraction]);

  useEffect(() => () => setInteraction({ kind: "pose" }), [setInteraction]);

  const answer = useCallback((payload, ctx) => {
    if (!item || session.phase !== "prompt") return;
    const res = scoreItem(item, payload, ctx || {});
    recordResult(item.id, res.correct);
    setFeedback(res);
    setSession((s) => ({ ...s, phase: "feedback", results: [...s.results, { id: item.id, ...res }] }));
  }, [item, session, recordResult]);

  // Muscle taps arrive from the stage.
  useEffect(() => { setQuizPick(() => (key) => answer(key)); return () => setQuizPick(null); }, [answer, setQuizPick]);

  const next = useCallback(() => {
    setFeedback(null);
    setSession((s) => {
      if (s.i + 1 >= s.items.length) { finishSession(); setNow(Date.now()); return { ...s, phase: "done" }; }
      return { ...s, i: s.i + 1, phase: "prompt" };
    });
  }, [finishSession]);

  if (!session) {
    return (
      <div className="ap-card ap-quiz">
        <div className="ap-card-head"><span className="ap-card-name">Quiz</span><span className="ap-card-plane">{ALL_ITEMS.length} questions</span></div>
        <p className="ap-why">Ten quick questions on the figure: find a muscle, pose a joint to a target, judge whether a range is normal, name a highlighted muscle.</p>
        <div className="ap-progress">
          <div><b>{Math.round(overall * 100)}%</b><span>mastery</span></div>
          <div><b>{due}</b><span>due now</span></div>
          <div><b>{ALL_ITEMS.length - seen}</b><span>unseen</span></div>
          <div><b>{progress.streak.days}</b><span>day streak</span></div>
        </div>
        <button type="button" className="ap-btn is-primary" onClick={start}>Start a session</button>
      </div>
    );
  }

  if (session.phase === "done") {
    const right = session.results.filter((r) => r.correct).length;
    return (
      <div className="ap-card ap-quiz">
        <div className="ap-card-head"><span className="ap-card-name">Session complete</span></div>
        <div className="ap-reading"><span className="ap-reading-deg">{right}/{session.items.length}</span><span className="ap-reading-move">correct</span></div>
        <ul className="ap-plain">
          {session.results.map((r, i) => <li key={i} className={r.correct ? "is-right" : "is-wrong"}>{session.items[i].prompt}</li>)}
        </ul>
        <div className="ap-sheet-actions">
          <button type="button" className="ap-btn is-primary" onClick={start}>Another session</button>
          <button type="button" className="ap-btn" onClick={() => { setNow(Date.now()); setSession(null); }}>Back</button>
        </div>
      </div>
    );
  }

  const d = item.setup.selectJoint ? descs[item.setup.selectJoint] : null;
  return (
    <div className="ap-card ap-quiz">
      <div className="ap-card-head"><span className="ap-card-plane">{session.i + 1} of {session.items.length} · {TYPE_LABEL[item.type]}</span></div>
      <p className="ap-prompt">{item.prompt}</p>
      {session.phase === "prompt" && item.interaction === "pickMuscle" && <p className="ap-note">Tap a muscle on the figure.</p>}
      {session.phase === "prompt" && item.interaction === "poseJoint" && (
        <>
          <p className="ap-note">Drag the highlighted joint, or use the arrow keys. Now: <b>{d && d.movement ? `${Math.round(d.degrees)}° ${d.movement.replace(/ [LR]$/, "")}` : "neutral"}</b></p>
          <button type="button" className="ap-btn is-primary" onClick={() => answer({ degrees: d ? d.degrees : 0 }, { movement: d ? d.movement : null })}>Check</button>
        </>
      )}
      {session.phase === "prompt" && item.interaction === "choice" && (
        <div className="ap-choices">
          {item.choices.map((c) => <button key={c.id} type="button" className="ap-btn" onClick={() => answer(c.id)}>{c.label}</button>)}
        </div>
      )}
      {session.phase === "feedback" && feedback && (
        <>
          <div className={"ap-verdict " + (feedback.correct ? "is-right" : feedback.partial ? "is-partial" : "is-wrong")}>{feedback.correct ? "Correct" : feedback.partial ? "Close" : "Not quite"}</div>
          <p className="ap-note">{feedback.explain}</p>
          <button type="button" className="ap-btn is-primary" onClick={next}>{session.i + 1 >= session.items.length ? "Finish" : "Next"}</button>
        </>
      )}
      <button type="button" className="ap-link ap-quit" onClick={() => setSession(null)}>End session</button>
    </div>
  );
}
