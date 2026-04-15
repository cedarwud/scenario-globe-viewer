# Delivery Phases

Source note: this file is a manual rewrite of the active workspace engineering index dated 2026-04-15. Keep it as repo-owned text. Do not replace it with a symlink or hard link.

Related structure: see [architecture.md](./architecture.md).
Related evidence: see [cesium-evidence.md](./cesium-evidence.md).

## Current Snapshot

- Phase 0 is complete in the current repo state.
- `npm test` is the Phase 0 smoke entry point. It validates build output, copied fixture integrity, neutral delivery wording, and installed-package Cesium evidence.
- Phase 1 bootstrap is active in the current repo state. `src/main.ts` imports the Cesium bootstrap path, creates a `Viewer`, and routes credits through the repo-owned footer shell.
- The current bootstrap smoke entry point is `node tests/smoke/bootstrap-loads-assets-and-workers.mjs`.
- The current first-globe baseline capture is stored at `docs/images/phase-1-baseline.png`.

## Phase 0

Goal: establish repo-local authority, package baseline, asset-copy wiring, and copied fixtures without starting Cesium rendering.

Commit sequence:

1. README and license
2. `.gitignore` with agent-internal exclusions
3. ADR 0001-0005
4. package scaffold with pinned `cesium@1.140.0`
5. Vite asset copy plus `CESIUM_BASE_URL` reservation
6. repo-owned architecture and phase docs
7. Cesium boundary and navigation docs
8. copied public walker fixture

Gate:

- docs and ADRs exist in this repo
- `cesium/Assets` and `cesium/Workers` are designed into the build output
- the delivery surface stays neutral
- Cesium is still not imported into runtime code
- `npm test` passes without needing a live Cesium render

Review checkpoint: recommended before Phase 1.

- Refresh `docs/decisions/*.md`, `docs/architecture.md`, and this file so the repo skeleton, package choice, viewer choice, and deployment-profile assumptions match the actual repo state.
- If the asset-copy layout or fixture placement differs from the original plan, update docs first, then start Phase 1.

## Phase 1

Goal: bootstrap Cesium with a clean first-globe path.

Commit sequence:

1. `feat(core): cesium bootstrap with CESIUM_BASE_URL and widgets.css`
2. `feat(core): viewer factory wrapping Viewer`
3. `feat(core): disable unused widgets`
4. `feat(core): credits wrapper preserving attribution`
5. `test(smoke): bootstrap loads assets and workers`
6. `chore: capture first-globe baseline screenshot`

Gate:

- no console bootstrap errors
- Cesium assets and workers resolve from the delivery path
- the globe renders and interaction is stable enough for baseline capture
- a repo-local smoke command exists for bootstrap and worker loading

Review checkpoint: recommended before Phase 2.

- Refresh `docs/architecture.md`, `docs/cesium-adoption-boundary.md`, `docs/cesium-navigation-index.md`, and any ADR text affected by the actual bootstrap path.
- If runtime bootstrap constraints differ from the Phase 0 assumptions, correct the docs before moving into globe-quality work.

## Phase 2

Goal: build a clearly stronger globe baseline under the offline-first deployment profile.

Commit sequence:

1. `feat(globe): atmosphere baseline`
2. `feat(globe): lighting baseline`
3. `feat(globe): star background`
4. `feat(globe): fog and post-process`
5. `feat(globe): offline imagery provider setup`
6. `feat(globe): terrain provider (offline-first)`
7. `feat(globe): camera language — flyTo tuning`
8. `feat(globe): scene preset interface`
9. `feat(globe): global preset implementation`
10. `feat(globe): regional preset implementation`
11. `feat(globe): site preset with optional 3D tiles hook`
12. `test(visual): three-preset screenshot baselines`
13. `docs: deployment-profiles.md`

Gate:

- preset switching is clean
- visual quality is meaningfully above the legacy baseline
- validation is done under the delivery-default deployment profile, not an online-only spike
- the Phase 2 quality gate is decomposed into reviewable commits rather than a single batch change
- globe-only soak evidence is captured before any replay or overlay implementation lands

Review checkpoint: mandatory before Phase 3.

- Refresh `docs/architecture.md`, `docs/deployment-profiles.md`, this file, and ADR `0004-deployment-profile` plus ADR `0005-perf-budget`.
- Treat the measured imagery, terrain, site-hook, performance, and soak constraints as the new baseline. Do not keep carrying stale planning assumptions forward.
- If the default offline-first profile, quality bar, or performance budget changed during implementation, stop and rewrite the plan before any HUD or replay work starts.

## Phase 3

Goal: add application framing and time/overlay seams without turning on satellite implementation.

Commit sequence:

1. `feat(app): hud frame with empty panels`
2. `feat(time): replay clock interface`
3. `feat(time): replay clock implementation (real-time)`
4. `feat(time): replay clock implementation (prerecorded)`
5. `feat(time): timeline HUD placeholder`
6. `feat(overlays): overlay manager interface`
7. `feat(satellites): satellite overlay adapter interface`
8. `docs: data-contracts/*.md`

Gate:

- replay controls work
- HUD framing exists
- overlay integration points are present
- no walker adapter implementation exists yet
- satellite implementation is still absent from the runtime path

Review checkpoint: mandatory before Phase 4.

- Refresh `docs/architecture.md`, this file, and `docs/data-contracts/*.md` so replay-clock semantics, HUD scope, overlay ownership, and adapter seams are explicit.
- If the time model, overlay-manager responsibilities, or adapter contract changed during implementation, update docs before fixture ingestion starts.

## Phase 4

Goal: land the smallest real fixture-ingestion path without coupling the core to a donor format.

Gate:

- a minimal fixture can be loaded through an adapter seam
- the fixture path is still treated as a smoke source, not the core domain model
- time semantics and coordinate/frame conversions are documented, not left implicit

Review checkpoint: mandatory before Phase 5.

- Refresh `docs/data-contracts/*.md`, `docs/architecture.md`, and this file.
- Explicitly record the chosen `epochMode`, frame assumptions, and the required conversion path when external propagation output is not already in the runtime-ready frame.
- If fixture reality breaks the planned contracts, update the contracts first, then continue.

## Phase 5

Goal: add the first satellite overlay without degrading the globe baseline.

Gate:

- the first overlay path can be toggled on and off cleanly
- the globe-only mode remains available for isolated validation
- overlay integration does not silently erase attribution, performance budgets, or scene cleanliness

Review checkpoint: mandatory before any Phase 6+ expansion.

- Refresh `docs/architecture.md`, this file, and ADR `0005-perf-budget`.
- Re-evaluate overlay-vs-globe tradeoffs before adding richer scenario data, denser overlays, or full-system validation.
- If the overlay path has already degraded the globe baseline, stop and re-plan instead of stacking more features on top.

## Beyond Phase 5

Phase 6 and later introduce richer scenario data contracts, denser overlays, and full-system validation. Treat those as explicit follow-on phases, not an automatic continuation once Phase 5 lands.
