# Delivery Phases

Source note: this file is a manual rewrite of the active workspace engineering index dated 2026-04-15. Keep it as repo-owned text. Do not replace it with a symlink or hard link.

Related structure: see [architecture.md](./architecture.md).
Related evidence: see [cesium-evidence.md](./cesium-evidence.md).
Related visual evidence: see [visual-baselines.md](./visual-baselines.md).
Related deployment guidance: see [deployment-profiles.md](./deployment-profiles.md).
Related contract docs: see [scene-preset.md](./data-contracts/scene-preset.md), [replay-clock.md](./data-contracts/replay-clock.md), [satellite-overlay.md](./data-contracts/satellite-overlay.md), and [scenario.md](./data-contracts/scenario.md).

## Current Snapshot

- Phase 0 is complete in the current repo state.
- `npm test` is the Phase 0 smoke entry point. It validates build output, copied fixture integrity, neutral delivery wording, and installed-package Cesium evidence.
- Phase 1 bootstrap is stable in the current repo state. `src/main.ts` imports the Cesium bootstrap path, creates a `Viewer`, preserves the native shell, and mounts the repo-local lighting toggle inside the existing toolbar.
- The default runtime keeps native `Viewer` controls, credits, and provider catalogs available while allowing explicit imagery/terrain overrides through deployment configuration.
- The current runtime also includes a small Cesium-native refinement slice: default terrain selection stays on the native `BaseLayerPicker` path, and the lighting toggle uses Cesium scene controls plus a flattened-scene imagery compensation path instead of a repo-local post pipeline.
- The current bootstrap smoke entry point is `node tests/smoke/bootstrap-loads-assets-and-workers.mjs`.
- Phase 2.11 now consumes the Phase 2.8 scene-preset seam through concrete global, regional, and site presets, with runtime selection still kept to a bootstrap-time `scenePreset` path and no preset UI shell.
- The site preset may lazily attach a configured 3D tileset URL through the existing optional hook. That hook still stays inactive when no site tileset URL is configured, but it now also has a separate dataset-backed validation path when a configured URL is present.
- A separate Cesium OSM Buildings showcase variant may now attach through explicit bootstrap opt-in only. It stays off by default, does not redefine the `site` preset, and does not promote ion-backed buildings into the formal Profile A baseline.
- Stage 2.4 fog/post-process remains historical completion evidence in the repo, but it is currently dormant on the active preset runtime until its tuning can be reintroduced without over-brightening or over-fogging the Cesium-native baseline.
- `docs/images/phase-1-baseline.png` remains the historical Phase 1 first-globe capture.
- Phase 2.12 review baselines now live at `docs/images/phase-2.12/*.png`, captured through `tests/visual/capture-three-preset-baselines.mjs` and documented in `docs/visual-baselines.md`.
- The current Phase 2 close-out evidence chain is repo-owned: `npm run test:phase1` verifies the three-preset bootstrap path, and the Phase 2.12 screenshots preserve the accepted global, regional, and site baselines. No separate long-duration globe-only soak artifact is currently claimed.
- The current governance target is to capture that accepted Phase 2 close-out state as its own commit/tag before the first Phase 3.1 implementation change lands.
- Formal Phase 3 readiness still lacks admissible Tier 1 / Tier 2 Profile A measurements, so the formal gate remains open.
- ADR `0008-phase-3-wsl-development-progression.md` now separates that formal no-go from a constrained WSL-backed Phase 3 development-progression gate so routine `3.2+` implementation slices do not require a fresh one-off exception each time.
- The current Phase 3.1 app shell still mounts the repo-owned HUD-frame structure from `3.1`, but `3.5` now narrows that shell to a `data-hud-visibility="status-only"` status panel while the left/right panels remain hidden.
- Phase 3.2 adds a plain-data replay-clock contract under `src/features/time/`, and Phases 3.3-3.5 now implement the real-time and prerecorded paths on top of Cesium's native `viewer.clock` without widening that contract into Cesium runtime classes.
- The current replay-clock runtime is still intentionally narrow: it is exposed through the existing capture seam for targeted validation, consumed locally by the read-only timeline HUD placeholder through a plain-data formatter, prerecorded mode now behaves as a clamped playback clip on that same Cesium clock, and omitting `range` while entering prerecorded mode reuses the active `startTime`/`stopTime` interval explicitly.
- Phase 3.6 now adds a repo-owned overlay manager interface under `src/features/overlays/`, and Phase 3.7 now adds a formal satellite adapter interface under `src/features/satellites/`; overlay state plus satellite fixture/sample data stay plain-data, `overlay-manager` now imports the formal adapter interface, and those public contract files remain the stable boundary even though the current Phase 5.1-5.3 runtime now consumes them indirectly through runtime-specific modules under `src/runtime/`.
- `npm run test:phase3.3` now verifies the real-time replay-clock slice directly in a headless browser, `npm run test:phase3.4` now verifies the prerecorded slice plus the return path back to real-time, `npm run test:phase3.5` now verifies the repo-owned timeline placeholder plus the preserved native toolbar/timeline/credits shell, `npm run test:phase3.6` now verifies the overlay-manager export seam plus the absence of Cesium-runtime, fixture-ingestion, and walker-adapter leakage in that contract, `npm run test:phase3.7` now verifies the satellite adapter export seam plus the formal `overlay-manager` dependency without turning on runtime satellite behavior, and `npm run test:phase5.1` now verifies the default-off overlay toggle path plus the constrained orbit-polyline widening on the existing walker point path without widening the HUD or native Cesium shell.
- Phase 3.8 now records the landed scene-preset, replay-clock, and satellite-overlay boundaries under `docs/data-contracts/` so Phase 4 starts from explicit contract text rather than stale planning assumptions.
- Phase 7.0 first-slice soak evidence now has a repo-owned boundary in `docs/data-contracts/soak-evidence.md` plus a repeatable harness at `tests/soak/run-soak.mjs`; rehearsal and full-run artifacts write to `output/soak/`, stay out of git, and remain local evidence rather than delivery-surface assets.
- Formal site dataset integration MVP now exists on the existing configured `site` hook. The committed OSM Buildings slice remains showcase-only and must not be treated as a substitute for that dataset-backed `site` delivery line. ADR `0007-formal-site-dataset-integration-governance.md` remains the governing classification and boundary document for this line.
- Dataset-enabled validation is now separate from the dormant baseline path: `npm run test:phase1:site-dataset` verifies the dataset-backed runtime, and `npm run capture:site-dataset` writes the separate review artifact under `docs/images/formal-site-dataset-mvp/`.
- The current repo-owned dataset fixture is a validation-only asset. This MVP does not claim that formal Tier 1 / Tier 2 Profile A measurements are closed or that a final delivery AOI has already been provided.
- Phases 5.1-5.3 now add the first live satellite runtime path under a constrained boundary: a repo-owned top-level overlay controller stays off by default, loads the copied walker fixture only when enabled, renders the landed walker point entities plus fixed runtime-local labels from existing `name` or fallback `id` and bounded Cesium polyline orbits through runtime-specific modules under `src/runtime/`, and detaches that overlay path cleanly when disabled again.
- The current Phase 5.3 slice widens only into those fixed labels plus bounded orbit polylines on the existing point path. `Entity.path`, per-satellite controls, overlay HUD controls, and richer scenario data remain out of scope. Native toolbar, timeline, credits, and the status-only HUD remain the accepted shell.
- Ad hoc screenshots under `output/` remain local validation artifacts and are not part of the delivery surface.

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

- once `2.9-2.11` land, preset switching is clean
- visual quality is meaningfully above the legacy baseline
- validation is done under the delivery-default Cesium-native profile, with any local/on-prem provider override treated as an explicit opt-in variant rather than the only compliant baseline
- the Phase 2 quality gate is decomposed into reviewable commits rather than a single batch change
- repo-owned globe-only close-out evidence exists before any replay or overlay implementation lands; for the current repo state this means `npm run test:phase1` plus the Phase 2.12 screenshots and `docs/visual-baselines.md`, not an implied 24-hour soak artifact
- that Phase 2 evidence chain is necessary but not sufficient for pre-Phase-3 readiness; separate Tier 1 / Tier 2 Profile A real-machine measurements must still be recorded
- native Cesium controls and provider paths are not degraded solely to satisfy deployment wording

Review checkpoint: mandatory before Phase 3.

- Refresh `docs/architecture.md`, `docs/deployment-profiles.md`, this file, and ADR `0004-deployment-profile` plus ADR `0005-perf-budget`.
- Treat the measured imagery, terrain, site-hook, performance, and close-out evidence constraints as the new baseline. Do not keep carrying stale planning assumptions forward.
- `docs/cesium-evidence.md` and `docs/visual-baselines.md` must explicitly point to the accepted Phase 2 evidence chain. If only smoke plus visual baselines exist and no dedicated long-duration soak artifact exists, state that plainly rather than implying one.
- If the default Cesium-native profile, optional provider-override policy, quality bar, or performance budget changed during implementation, stop and rewrite the plan before any HUD or replay work starts.
- If the current workspace cannot produce admissible Tier 1 / Tier 2 Profile A measurements, stop and record that blocker explicitly. Do not relabel smoke, visual baselines, or SwiftShader runs as tier evidence. That blocker keeps the formal Phase 3 gate open even if ADR `0006-phase-3.1-execution-governance` authorizes a constrained `3.1` start.
- The current authority set accepts and defers the verified large-chunk warning. Revisit mitigation only if later bundle growth or delivery constraints make that trade-off materially worse.
- The current authority set accepts the verified `protobufjs` `eval` warning as an upstream dependency risk because it still originates from the dependency chain rather than repo code.

## Phase 3

Goal: add application framing and time/overlay seams without turning on satellite implementation.

Formal Phase 3 readiness is still held open by the missing Tier 1 / Tier 2 Profile A measurements. In the current repo state, that gate is not closed.

The current WSL-only operating assumption now uses a separate development-progression gate. That gate is allowed to move forward under repo-owned implementation evidence even while formal readiness remains `no-go`.

Current status under that model:

- `3.2` is `go with constraints` for routine in-scope Phase 3 implementation slices
- the landed `3.2-3.7` surface now includes the plain-data replay-clock contract, Cesium-backed real-time and prerecorded implementations on the same `viewer.clock`, a read-only status-panel timeline placeholder, a repo-owned overlay-manager interface, and a formal satellite adapter interface; those public seams remain stable even though the first live consumer now arrives later in the constrained Phase 5.1-5.3 runtime path
- this is not automatic authorization for Phase 3 close-out, deployment/profile widening, data-contract widening, or admissible-measurement closure
- any slice that crosses those boundaries still needs a fresh governance checkpoint before implementation starts

Current execution policy:

- keep the dedicated Phase 2 close-out commit/tag as the historical baseline anchor
- treat ADR `0006-phase-3.1-execution-governance.md` as the historical start authorization for `3.1`, not as the ongoing model for every later Phase 3 slice
- allow routine `3.2+` implementation slices to proceed under the constrained WSL development-progression gate defined by ADR `0008-phase-3-wsl-development-progression.md`
- require `npm run build`, `npm run test:phase1`, the slice-specific smoke/capture path, and source-of-truth doc updates for any Phase 3 slice that changes runtime contracts or visible behavior
- do not treat WSL smoke, WSL visual refreshes, or SwiftShader runs as admissible measurement evidence
- do not treat the development-progression gate as formal Phase 3 close-out, release readiness, or measurement closure
- do not treat formal site dataset integration as covered by the old narrow `3.1` exception; the current MVP already uses its own governance checkpoint because it changes the dormant `site` hook into a real dataset-backed delivery path. Any follow-on expansion should continue to start from ADR `0007-formal-site-dataset-integration-governance.md`.

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
- overlay-manager imports the formal satellite adapter interface
- no walker adapter implementation exists yet
- satellite implementation is still absent from the runtime path

Review checkpoint: mandatory before Phase 4.

- Refresh `docs/architecture.md`, this file, and `docs/data-contracts/*.md` so replay-clock semantics, HUD scope, overlay ownership, and adapter seams are explicit.
- If the time model, overlay-manager responsibilities, or adapter contract changed during implementation, update docs before fixture ingestion starts.
- Re-check governance before `3.2+` only when the next slice widens Phase 3 scope, deployment/profile semantics, data-contract seams, or other governance boundaries beyond the constrained WSL development-progression model. Do not require a fresh ad hoc exception for every routine Phase 3 implementation slice.
- Re-check governance before any formal site dataset follow-on expands past the current MVP. That work should stay scoped explicitly against the existing `site` hook and the already-committed Profile C showcase rather than being folded into an undefined "next Phase 3 step." Use ADR `0007-formal-site-dataset-integration-governance.md` as the starting authority for that prompt.

## Phase 4

Goal: land the smallest real fixture-ingestion path without coupling the core to a donor format.

Current repo reality after Phase 4.1:

- the formal `SatelliteOverlayAdapter` contract still defines the public serializable boundary
- a concrete walker fixture adapter now exists at `src/features/satellites/walker-fixture-adapter.ts`
- the copied walker TLE under `public/fixtures/satellites/walker-o6-s3-i45-h698.tle` is only a smoke/source fixture
- no satellite or overlay runtime path is wired into `src/main.ts`
- fixture ingestion is now adapter-local only and remains inactive on the live runtime path

Hard boundary for the first `4.1` slice:

- stop at the walker fixture adapter ingestion seam
- keep walker-specific handling inside that adapter seam rather than in `overlay-manager`, `replay-clock`, `scene-preset`, or the general satellite contract
- keep TLE parsing, SGP4 propagation, and any TEME / ECI to repo-facing ECEF or other Cesium-consumable conversion inside the adapter layer
- use `epochMode: "relative-to-now"` as the repo-owned default for the Phase 4 smoke TLE ingestion path, while treating that default as smoke-path-scoped rather than an immutable core-contract rule
- do not wire the seam into `src/main.ts`
- do not claim runtime overlay activation, entity/primitive/orbit rendering, HUD controls, or per-satellite UI in Phase 4.1

Gate:

- a minimal fixture can be loaded through an adapter seam
- the fixture path is still treated as a smoke source, not the core domain model
- the walker smoke default and frame-conversion responsibility are documented, not left implicit
- no runtime overlay path is turned on yet

Review checkpoint: mandatory before Phase 5.

- Refresh `docs/data-contracts/*.md`, `docs/architecture.md`, and this file.
- Confirm that Phase 4.1 stayed at the walker fixture adapter ingestion seam and did not widen into runtime overlay wiring.
- Explicitly record the chosen `epochMode`, frame assumptions, and the required conversion path when external propagation output is not already in the runtime-ready frame.
- If fixture reality breaks the planned contracts, update the contracts first, then continue.

## Phase 5

Goal: add the first satellite overlay/runtime-rendering path without degrading the globe baseline.

Current repo reality after Phase 5.3:

- the default startup path remains globe-only, with the first overlay path disabled by default
- `src/runtime/satellite-overlay-controller.ts` is the single repo-owned top-level control surface for this slice and is exposed only through the existing capture seam used by targeted validation
- enabling the slice loads the copied walker TLE, reuses the existing walker ingestion seam, and renders the landed point entities plus fixed runtime-local labels derived only from existing `name` or fallback `id` together with bounded Cesium polyline orbits through runtime-specific data-source modules without moving parsing, propagation, or frame conversion into `overlay-manager`
- disabling the slice detaches the point/label/polyline overlay cleanly and restores the accepted globe-only validation path without adding overlay HUD controls
- fixed upper-bound orbit sampling/cache policy stays runtime-local or adapter-local only, `Entity.path` remains disabled, and no unbounded history is accumulated
- per-satellite controls, richer scenario data, and user-facing label styling/UI remain out of scope

Gate:

- the first overlay path can be toggled on and off cleanly
- the globe-only mode remains available for isolated validation
- overlay integration does not silently erase attribution, performance budgets, or scene cleanliness

Review checkpoint: mandatory before any Phase 6+ expansion.

- Refresh `docs/architecture.md`, this file, and ADR `0005-perf-budget`.
- Re-evaluate overlay-vs-globe tradeoffs before adding richer scenario data, denser overlays, or full-system validation.
- If the overlay path has already degraded the globe baseline, stop and re-plan instead of stacking more features on top.

## Beyond Phase 5

Phase 6 and later are no longer treated as an automatic continuation of the
current overlay/showcase line. Use the repo-owned follow-on SDD:
[Phase 6+ Requirement-Centered Plan](./sdd/phase-6-plus-requirement-centered-plan.md).
That SDD now records the Phase 6.0 planning closure and the Phase 6.1 entry
decision; do not start Phase 6.1 implementation from this file alone.
