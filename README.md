# scenario-globe-viewer

`scenario-globe-viewer` is a Cesium-based scenario globe delivery repo. It provides the standalone globe shell, delivery-side documentation, and bootstrap assets required to build a high-quality Earth-first scenario viewer without forking Cesium.

## Scope

- Use `cesium` as an npm dependency. Do not fork or vendor Cesium source into this repository.
- Build the globe foundation first. Phases 0-3 keep satellite work at the interface and hook level only.
- Treat archived viewer lines as postmortem-only references. Delivery authority lives in this repo's README, ADRs, and docs.

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
- `src/`
- `tests/smoke/`

Detailed structure and phase sequencing are documented in `docs/architecture.md` and `docs/delivery-phases.md`.
