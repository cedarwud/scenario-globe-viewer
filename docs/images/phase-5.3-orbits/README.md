# Phase 5.3 Orbit Review Artifact

This directory stores the separate review artifact line for the constrained
Phase 5.3 orbit widening on the walker-backed overlay path.

- primary artifact: `global-preset-overlay-orbits.png`
- capture command: `npm run capture:phase5.3-orbits`
- separation rule:
  - not part of `docs/images/phase-2.12/`
  - not part of `docs/images/phase-5.2-labels/`
  - not part of `docs/images/formal-site-dataset-mvp/`
  - not part of the Phase 3.1 HUD follow-up line

This line records the current bounded overlay slice: existing walker-backed
points remain present, fixed runtime-local labels still derive only from
existing `name` or fallback `id`, and the only new widening is bounded Cesium
polyline orbits on that same path.

It does not imply per-satellite controls, overlay HUD UI, richer scenario
data, public orbit styling/configuration, or admissible measurement evidence.
