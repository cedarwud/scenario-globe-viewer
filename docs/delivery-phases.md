# Delivery Phases

Source note: this file is a manual rewrite of the active workspace engineering index dated 2026-04-15. Keep it as repo-owned text. Do not replace it with a symlink or hard link.

Related structure: see [architecture.md](./architecture.md).
Related evidence: see [cesium-evidence.md](./cesium-evidence.md).
Related deployment guidance: see [deployment-profiles.md](./deployment-profiles.md).

## Current Snapshot

- Phase 0 is complete in the current repo state.
- `npm test` is the Phase 0 smoke entry point. It validates build output, copied fixture integrity, neutral delivery wording, and installed-package Cesium evidence.
- Phase 1 bootstrap is stable in the current repo state. `src/main.ts` imports the Cesium bootstrap path, creates a `Viewer`, preserves the native shell, and mounts the repo-local lighting toggle inside the existing toolbar.
- The default runtime keeps native `Viewer` controls, credits, and provider catalogs available while allowing explicit imagery/terrain overrides through deployment configuration.
- The current runtime also includes a small Cesium-native refinement slice: default terrain selection stays on the native `BaseLayerPicker` path, and the lighting toggle uses Cesium scene controls plus a flattened-scene imagery compensation path instead of a repo-local post pipeline.
- The current bootstrap smoke entry point is `node tests/smoke/bootstrap-loads-assets-and-workers.mjs`.
- `docs/images/phase-1-baseline.png` remains the historical Phase 1 first-globe capture. Ad hoc screenshots under `output/` are local validation artifacts and are not part of the delivery surface.

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
3. `feat(core): configure built-in controls for the delivery shell`
4. `feat(core): credits wrapper preserving attribution`
5. `test(smoke): bootstrap loads assets and workers`
6. `chore: capture first-globe baseline screenshot`

Gate:

- no console bootstrap errors
- Cesium assets and workers resolve from the delivery path
- the globe renders and interaction is stable enough for baseline capture
- the built-in toolbar and timeline controls present in the shell are an intentional product decision, not an accidental Cesium default
- a repo-local smoke command exists for bootstrap and worker loading

Review checkpoint: recommended before Phase 2.

- Refresh `docs/architecture.md`, `docs/cesium-adoption-boundary.md`, `docs/cesium-navigation-index.md`, and any ADR text affected by the actual bootstrap path.
- If runtime bootstrap constraints differ from the Phase 0 assumptions, correct the docs before moving into globe-quality work.
- Record the current Phase 1 bundle shape and build warnings as baseline evidence. In particular:
  - capture the main JS chunk size and copied Cesium runtime-asset sizes
  - record whether build warnings come from repo code or upstream Cesium dependencies
- Do not block Phase 2 on aggressive bundle surgery unless there is an explicit delivery blocker. Phase 1 should only establish the provenance and current cost of warnings such as upstream `protobufjs` `eval`.

## Phase 2

Goal: build a clearly stronger globe baseline on top of Cesium's native `Viewer` path.

Commit sequence:

1. `feat(globe): atmosphere baseline`
2. `feat(globe): lighting baseline`
3. `feat(globe): star background`
4. `feat(globe): fog and post-process`
5. `feat(globe): imagery provider policy and optional configured source`
6. `feat(globe): terrain provider policy and optional configured source`
7. `feat(globe): camera language — flyTo tuning`
8. `feat(globe): scene preset interface`
9. `feat(globe): global preset implementation`
10. `feat(globe): regional preset implementation`
11. `feat(globe): site preset with optional 3D tiles hook`
12. `test(visual): three-preset screenshot baselines`
13. `docs: deployment-profiles.md`

Recommended branch point:

- If another downstream integration track wants to reuse the refined globe baseline without inheriting this repo's preset, provider-factory, replay, or overlay contracts, branch after `2.7` and before `2.8`.
- Up through `2.7`, the work is still dominated by globe quality and Cesium configuration.
- `2.8` is the first commit that introduces a repo-specific abstraction layer (`scene preset interface`) rather than pure globe-quality work.

Gate:

- preset switching is clean
- visual quality is meaningfully above the legacy baseline
- validation is done under the delivery-default Cesium-native profile, with any local/on-prem provider override treated as an explicit opt-in variant rather than the only compliant baseline
- the Phase 2 quality gate is decomposed into reviewable commits rather than a single batch change
- globe-only soak evidence is captured before any replay or overlay implementation lands
- native Cesium controls and provider paths are not degraded solely to satisfy deployment wording

Review checkpoint: mandatory before Phase 3.

- Refresh `docs/architecture.md`, `docs/deployment-profiles.md`, this file, and ADR `0004-deployment-profile` plus ADR `0005-perf-budget`.
- Treat the measured imagery, terrain, site-hook, performance, and soak constraints as the new baseline. Do not keep carrying stale planning assumptions forward.
- If the default Cesium-native profile, optional provider-override policy, quality bar, or performance budget changed during implementation, stop and rewrite the plan before any HUD or replay work starts.
- Revisit bundle size now that the real globe baseline, preset structure, and provider choices are visible. This is the right point to decide whether low-risk code splitting, deferred bootstrap, or chunk-shaping work is worth doing.
- Re-check the `protobufjs` `eval` warning after Phase 2. If it is still present and still originates from the Cesium dependency chain rather than repo code, document whether the project accepts it as an upstream dependency risk or needs a targeted mitigation before later delivery phases.

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
