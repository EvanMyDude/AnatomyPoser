# Anatomy Poser

Interactive 2D anatomy rig with coronal (front) and sagittal (side) views. Drag joints
to pose the figure within real range-of-motion limits, or isolate a single joint to
explore it. Toggle bones, muscles, or both.

**Live:** https://evanmydude.github.io/AnatomyPoser/

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build   # outputs dist/
npm run preview # serve the production build locally
```

Deployment is automatic: every push to `main` runs the workflow in
`.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to GitHub Pages.
