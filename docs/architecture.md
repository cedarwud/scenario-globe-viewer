# Architecture

Source note: this file is a manual rewrite of the active workspace engineering index dated 2026-04-15. Keep it synchronized by editing this repo directly. Do not replace it with a symlink or hard link.

## Delivery Shape

`scenario-globe-viewer` is an Earth-first Cesium delivery repo. The delivery surface stays neutral, keeps Cesium upstream-owned, and avoids replay or satellite implementation work until the globe foundation and shell contracts are stable.

For this repo, `offline-first` is now interpreted as "stay on Cesium's upstream runtime path and avoid repo-local forks or fake substitute shells." It does not mean disabling Cesium-native controls, imagery, terrain, or geocoding simply because those defaults may be backed by Cesium services.

Related roadmap: see [delivery-phases.md](./delivery-phases.md).
Related evidence ledger: see [cesium-evidence.md](./cesium-evidence.md).
Related deployment guidance: see [deployment-profiles.md](./deployment-profiles.md).
Related contract docs: see [scene-preset.md](./data-contracts/scene-preset.md), [replay-clock.md](./data-contracts/replay-clock.md), and [satellite-overlay.md](./data-contracts/satellite-overlay.md).

## System Layers

The repo is organized into five layers:

1. Delivery docs and ADRs
   `README.md`, `docs/`, and `docs/decisions/` define repo-local authority for packaging, viewer choice, bootstrap, deployment profile, and performance budget.
2. Runtime shell
   `index.html`, `src/main.ts`, and future app-shell modules own bootstrap sequencing, neutral page framing, and `CESIUM_BASE_URL` setup.
3. Cesium integration seam
   Future `src/core/cesium/` modules wrap `Viewer`, provider factories, credits, and performance controls without copying Cesium internals.
4. Feature interfaces
   Phase 2.8 starts globe presets as a plain-data scene-preset seam for camera framing and presentation-profile selection, Phase 2.9 lands the first concrete global preset, Phase 2.10 adds the first regional preset, and Phase 2.11 adds the first site preset plus an optional configured-url 3D tiles hook. Phase 3.2 adds the repo-local replay-clock contract under `src/features/time/`, Phases 3.3-3.4 now layer Cesium-backed real-time and prerecorded behavior on top of that contract while keeping app-facing time state serializable, Phase 3.6 adds a repo-local overlay-manager contract under `src/features/overlays/` that keeps overlay ownership at the plain-data attach/detach/visibility/dispose boundary, and Phase 3.7 adds a formal satellite adapter contract under `src/features/satellites/` that keeps fixture/sample inputs plain-data while `overlay-manager` depends only on that interface. Through Phase 3, satellite work is limited to interface boundaries and necessary hooks.
5. Validation harness
   `scripts/verify-phase0.mjs`, `tests/smoke/`, and the Phase 2.12 capture path under `tests/visual/` keep build output, fixture integrity, preset/bootstrap evidence, replay-clock targeted validation, and repo-owned baseline screenshots runnable from the repo itself.

## Repo Boundaries

- Cesium is consumed as an npm dependency, not as a fork.
- Renderer, shader, worker, terrain, and 3D tiles pipelines stay upstream-owned. This repo configures them but does not reimplement them.
- Archived viewer lines are postmortem-only references and do not define delivery-side behavior here.
- The walker TLE fixture is a smoke asset only. It must not become a core data model assumption.

## Data And Control Flow

Current runtime flow is now active:

1. `index.html` reserves `window.CESIUM_BASE_URL` before the application module runs.
2. Vite copies Cesium runtime assets into the delivery build under `cesium/`.
3. `src/core/cesium/bootstrap.ts` sets Cesium's runtime base URL before the first `Viewer` is created.
4. `src/main.ts` mounts the repo-owned viewer shell, keeps the left/right HUD panels hidden, surfaces a status-only read-only timeline placeholder in the HUD status panel, resolves a bootstrap-time `scenePreset` key plus an explicit optional `buildingShowcase` selection, creates a `Viewer`, applies the selected global, regional, or site preset through the existing `Viewer` path, preserves Cesium's native credit handling, attaches the repo-local lighting toggle inside the existing toolbar, attaches Cesium OSM Buildings only when the explicit showcase opt-in is present, and only loads a site tileset when the site preset is selected, a configured URL is present, and the OSM showcase is not active. Phases 3.3-3.5 now also instantiate the replay-clock adapter on top of that same `viewer.clock`, keep both real-time and prerecorded playback on the single Cesium time source, expose the adapter through the narrow capture seam used by targeted validation, and consume the same plain-data state locally for the HUD placeholder without leaking Cesium runtime classes into app-facing time UI contracts. Phases 3.6-3.7 also add repo-owned overlay-manager and satellite-adapter interfaces under `src/features/overlays/` and `src/features/satellites/`, but they are intentionally not wired into the live runtime path yet. The runtime also exposes repo-local `siteTilesetState` so the harness can distinguish dormant, blocked, loading, ready, degraded, and error states across the baseline and dataset-backed site-hook lines.
5. `npm test` confirms the Phase 0 build surfaces stay intact, and `npm run test:phase1` runs a headless bootstrap smoke against the built app.

Planned Phase 2-5 flow:

1. Globe-quality work adds atmosphere, lighting, terrain, imagery, presets, and optional provider-override handling while keeping the default baseline on Cesium-native `Viewer` behavior.
2. A viewer factory continues to own the high-level `Viewer` wrapper and only changes built-in controls when there is an explicit product reason rather than an abstract "offline-first" requirement.
3. Phase 2.8 scene presets are now consumed by concrete global, regional, and site presets for globe presentation and camera framing, while the site-specific 3D tiles path remains limited to a configured-url hook rather than a full tiles subsystem. The opt-in Cesium OSM Buildings showcase remains a separate bootstrap variant and does not expand the preset contract into a multi-model system.
4. The current formal site dataset MVP now builds on that existing configured-url `site` hook as its own dataset-backed delivery line, remains separate from the Profile C showcase path, and preserves the current Profile A baseline/capture path instead of rewriting it in place.
5. Phase 3.2 defines the replay-clock interface boundary in `src/features/time/`, and Phases 3.3-3.5 now map both the real-time and prerecorded paths onto Cesium's native `viewer.clock` inside `src/features/time/cesium-replay-clock.ts` while formatting a read-only timeline HUD placeholder from plain replay-clock state. The prerecorded path stays a clamped clip on that same clock, and when `setMode('prerecorded')` omits `range` it reuses the active `startTime`/`stopTime` interval instead of inventing a second time source. Phase 3.6 defines the repo-owned overlay-manager seam in `src/features/overlays/`, and Phase 3.7 now adds the plain-data `SatelliteOverlayAdapter` seam in `src/features/satellites/`; manager ownership stays at adapter attach/detach, top-level show/hide, and disposal, while the satellite contract stays limited to serializable fixture/sample input plus clock-binding and visibility hooks for a later concrete adapter.
6. Fixture ingestion and the first overlay remain later phases, after the shell and time seams are stable.

## Directory Intent

- `docs/` stores delivery-side design authority and phase guidance.
- `public/fixtures/` stores copied runtime fixtures with no build-time dependency on donor repos.
- `scripts/` stores repo-local verification entry points.
- `src/` stores the application shell and future Cesium integration seams.
- `tests/smoke/` is reserved for build/bootstrap and preset-level smoke coverage.
- `tests/visual/` stores the Phase 2.12 baseline capture harnesses plus the separate dataset-enabled site capture path.

## Phase Boundaries

- Phase 0: repo rules, ADRs, package bootstrap, asset copy, and fixture staging
- Phase 1: Cesium bootstrap, `Viewer` wrapper, and credit-preserving first globe
- Phase 2: globe quality, scene presets, and a Cesium-native visual baseline with optional provider overrides
- Phase 3: shell framing, replay clock, and overlay interfaces only
- Phase 4: minimal fixture ingestion through an adapter seam
- Phase 5: first overlay path without degrading the globe baseline

Anything beyond Phase 5 is outside the current implementation target.
