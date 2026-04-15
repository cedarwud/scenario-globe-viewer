# ADR 0004: Deployment Profile

## Status

Accepted

## Context

The delivery target includes offline and on-prem operation, so the default profile cannot assume online Cesium services. The deployment baseline must also stay aligned with the same profile used during day-to-day development.

Evidence:

- [../cesium-evidence.md](../cesium-evidence.md) preserves the offline deployment rules verified against the upstream Cesium offline guide during repo bootstrap.
- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:281-284` documents the constructor toggles for `baseLayerPicker` and `geocoder`.
- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:416-428`, `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:564-588`, and `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:644-656` show how those widgets are conditionally created in the runtime shell.

## Decision

Adopt Profile A, fully offline or on-prem, as both the delivery default and the development default. Profile B, online service-backed visuals, is allowed only as a short-lived opt-in spike. Profile C, mixed showcase assets, remains an optional later-stage profile.

Profile switching will be handled through provider-factory configuration rather than a separate Cesium fork or a separate bootstrap stack.

## Consequences

- Phase 2 quality gates must be met under the offline-first profile, not under an online-only visual spike.
- Credits remain required even when the data source is local or on-prem.
- Local imagery, terrain, and optional tileset hosting become explicit project responsibilities instead of hidden future work.
