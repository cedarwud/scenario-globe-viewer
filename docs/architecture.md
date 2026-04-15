# Architecture

Source note: this file is a manual rewrite of the active workspace engineering index dated 2026-04-15. Keep it synchronized by editing this repo directly. Do not replace it with a symlink or hard link.

## Delivery Shape

`scenario-globe-viewer` is an Earth-first Cesium delivery repo. The delivery surface stays neutral, keeps Cesium upstream-owned, and avoids replay or satellite implementation work until the globe foundation and shell contracts are stable.

Related roadmap: see [delivery-phases.md](./delivery-phases.md).
Related evidence ledger: see [cesium-evidence.md](./cesium-evidence.md).

## System Layers

The repo is organized into five layers:

1. Delivery docs and ADRs
   `README.md`, `docs/`, and `docs/decisions/` define repo-local authority for packaging, viewer choice, bootstrap, deployment profile, and performance budget.
2. Runtime shell
   `index.html`, `src/main.ts`, and future app-shell modules own bootstrap sequencing, neutral page framing, and `CESIUM_BASE_URL` setup.
3. Cesium integration seam
   Future `src/core/cesium/` modules wrap `Viewer`, provider factories, credits, and performance controls without copying Cesium internals.
4. Feature interfaces
   Globe presets, replay time, and satellite overlays remain contract-led. Through Phase 3, satellite work is limited to interface boundaries and necessary hooks.
5. Validation harness
   `scripts/verify-phase0.mjs` and `tests/smoke/` keep build output, fixture integrity, neutral wording, and preserved Cesium evidence runnable from the repo itself.

## Repo Boundaries

- Cesium is consumed as an npm dependency, not as a fork.
- Renderer, shader, worker, terrain, and 3D tiles pipelines stay upstream-owned. This repo configures them but does not reimplement them.
- Archived viewer lines are postmortem-only references and do not define delivery-side behavior here.
- The walker TLE fixture is a smoke asset only. It must not become a core data model assumption.

## Data And Control Flow

Current Phase 0 flow is intentionally minimal:

1. `index.html` reserves `window.CESIUM_BASE_URL` before the application module runs.
2. Vite copies Cesium runtime assets into the delivery build under `cesium/`.
3. The app shell renders a placeholder page until Phase 1 introduces Cesium bootstrap.
4. `npm test` confirms the copied runtime surfaces and fixture remain intact without requiring a live Cesium render path.

Planned Phase 1-3 flow:

1. Bootstrap code creates a delivery-local Cesium runtime entry.
2. A viewer factory owns the high-level `Viewer` wrapper and later disables unused built-in controls.
3. Scene presets become the data-only input for globe presentation.
4. Replay and overlay contracts attach later without leaking Cesium runtime classes into external interfaces.

## Directory Intent

- `docs/` stores delivery-side design authority and phase guidance.
- `public/fixtures/` stores copied runtime fixtures with no build-time dependency on donor repos.
- `scripts/` stores repo-local verification entry points.
- `src/` stores the application shell and future Cesium integration seams.
- `tests/smoke/` is reserved for build/bootstrap and preset-level smoke coverage.

## Phase Boundaries

- Phase 0: repo rules, ADRs, package bootstrap, asset copy, and fixture staging
- Phase 1: Cesium bootstrap, `Viewer` wrapper, and credit-preserving first globe
- Phase 2: globe quality, scene presets, and offline-first visual baseline
- Phase 3: shell framing, replay clock, and overlay interfaces only

Anything beyond Phase 3 is outside the current implementation target.
