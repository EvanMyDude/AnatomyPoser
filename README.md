# Anatomy Poser

A range-of-motion reference on an articulated 2D figure, with the anatomy
behind each movement and a quiz that uses the figure as the answer surface.

**Live:** https://evanmydude.github.io/AnatomyPoser/

## What it does

- **Pose.** Drag a ring to pose a limb (inverse kinematics), or drag a joint
  dot or bone to turn one joint. Every joint stops at its AAOS normal range.
  Undo, redo, presets, keyboard nudging, and a shareable link for any pose.
- **Measure.** Select a joint and read it like a goniometer: the movement
  name, degrees, the normal value, percent of normal, and a deficit band.
  Type a measured value, record it to a sheet that pairs left with right,
  and print or export the result. Norms follow the AAOS Neutral Zero method.
- **Learn.** Twenty-two muscles with origin, insertion, nerve, and actions.
  Move a joint and the muscles doing the work light up on the figure.
- **Quiz.** Find the muscle, pose a joint to a target, judge whether a range
  is normal, name a highlighted muscle. Progress uses spaced repetition and
  stays in your browser.

Teaching model, not clinical data.

## Develop

```sh
npm install
npm run dev      # local dev server
npm test         # vitest: rig tables, kinematics, describe, reducer, codec, quiz, progress
npm run build    # outputs dist/
npm run preview  # serve the production build locally
```

## Structure

```
src/
  rig/     bone tables (movement axes, mirrored sides), kinematics, describeJoint
  data/    norms (single source of ROM truth), muscles, joints, presets, quiz generators
  state/   pose reducer with history, URL hash codec, localStorage, quiz progress
  hooks/   drag interaction, keyboard, URL sync, measurements, progress
  stage/   SVG layers: bones, muscles, hit targets, handles, goniometer overlay
  panel/   toolbar, tabs, joint card, regions, measure sheet, learn, quiz
```

Deployment is automatic: every push to `main` runs tests, builds, and
publishes `dist/` to GitHub Pages. Design notes live in
`docs/superpowers/specs/2026-09-19-anatomy-poser-design.md`.
