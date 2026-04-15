# scenario-globe-viewer

`scenario-globe-viewer` is a Cesium-based scenario globe delivery repo. It provides the standalone globe shell, delivery-side documentation, and bootstrap assets required to build a high-quality Earth-first scenario viewer without forking Cesium.

## Scope

- Use `cesium` as an npm dependency. Do not fork or vendor Cesium source into this repository.
- Build the globe foundation first. Phases 0-3 keep satellite work at the interface and hook level only.
- Treat archived viewer lines as postmortem-only references. Delivery authority lives in this repo's README, ADRs, and docs.

## Quick Start

1. Install dependencies with `npm install`.
2. Start the local shell with `npm run dev`.
3. Build the delivery artifact with `npm run build`.
4. Run the Phase 0 smoke suite with `npm test`.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the local Vite development server |
| `npm run build` | Type-check and build the delivery artifact with copied Cesium runtime assets |
| `npm test` | Build and verify Phase 0 outputs, fixture integrity, neutral wording, and installed-package Cesium evidence |
| `npm run preview` | Preview the built artifact locally |

## Delivery Status

The current repo snapshot includes a completed Phase 0 baseline and an active Phase 1 bootstrap path:

- repo-local authority docs and ADRs are present
- `cesium@1.140.0` is pinned as the package strategy
- `CESIUM_BASE_URL` and runtime asset-copy plumbing are wired
- the walker TLE fixture is copied into `public/fixtures/`
- runtime Cesium bootstrap is active through `src/main.ts`
- a repo-local bootstrap smoke command exists at `node tests/smoke/bootstrap-loads-assets-and-workers.mjs`
- the current first-globe baseline capture is stored at `docs/images/phase-1-baseline.png`

## Phase 0 Deliverables

Phase 0 establishes:

- repo conventions and neutral delivery-side wording
- ADRs for package strategy, viewer strategy, bundler/bootstrap, deployment profile, and performance budget
- a minimal Vite + TypeScript scaffold with Cesium pinned as a dependency
- runtime asset-copy plumbing for `CESIUM_BASE_URL`
- copied public fixtures that do not create build-time dependencies on donor repos

## Repository Layout

Phase 0 targets the following top-level layout:

- `docs/`
- `public/fixtures/`
- `scripts/`
- `src/`
- `tests/smoke/`

Detailed structure, phase sequencing, and preserved Cesium evidence are documented in `docs/architecture.md`, `docs/delivery-phases.md`, and `docs/cesium-evidence.md`.
