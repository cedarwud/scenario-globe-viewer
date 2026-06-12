# scenario-globe-viewer

`scenario-globe-viewer` is a Cesium-based scenario globe delivery repo. It
provides a standalone Vite/TypeScript viewer with globe rendering, scenario
bootstrap logic, selected-pair ground-station projection, report/export
surfaces, and retained delivery documentation.

## Scope

- Use `cesium` as an npm dependency. Do not fork or vendor Cesium source into
  this repository.
- Keep the default visual baseline on Cesium's native `Viewer` path. Local or
  on-prem imagery, terrain, or tileset mirrors are opt-in deployment
  configuration.
- Treat generated screenshots, planning notes, handoff files, spike artifacts,
  and agent/controller context as local artifacts, not delivery files.
- Keep selected-pair outputs conservative: modeled projections are not measured
  traffic, native RF handover, commercial SLA, or live operational routing.

## Quick Start

1. Install dependencies with `npm install`.
2. Start the local viewer with `npm run dev`.
3. Build the delivery artifact with `npm run build`.
4. Run the default verification chain with `npm test`.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the local Vite development server |
| `npm run build` | Type-check and build the delivery artifact with copied Cesium runtime assets |
| `npm test` | Run selected-pair route governance, build, and baseline delivery checks |
| `npm run verify:selected-pair-route-governance` | Enforce selected-pair route and compatibility guardrails |
| `npm run verify:large-file-budgets:final` | Enforce final source-size budgets used by CI |
| `npm run test:operator-guide` | Build and smoke-test the operator guide modal |
| `npm run test:m8a-v4.11:slice5` | Build and smoke-test selected-pair source/report surfacing |
| `npm run preview` | Preview the built artifact locally |

## Delivery Contents

- `src/` contains the runtime, feature modules, styles, and link-budget models.
- `public/fixtures/` contains repo-owned fixtures copied into the built
  artifact.
- `docs/` contains delivery-facing architecture, deployment, Cesium, ADR, and
  data-contract documentation.
- `scripts/` contains build-time data refreshes and verification gates.
- `tests/smoke/` and `tests/unit/` contain retained automated checks.

## Data Boundaries

The selected-pair route works from public or repo-retained fixtures, registry
data, and deterministic runtime calculations. CSV exports are row-oriented data
outputs; report exports are readable evidence and summary pages. Both surfaces
must state source and limitation boundaries without promoting modeled values to
measured network truth.

For presentation and reviewer handoff source tracing, use
[`docs/data-source-index.md`](docs/data-source-index.md) as the data-source
map. It lists each major displayed/exported number, the retained artifact that
backs it, what claim it can support, and what remains a source gap. The current
retained selected-pair report package lives in
[`deliverable/selected-pair-source-evidence/`](deliverable/selected-pair-source-evidence/).
