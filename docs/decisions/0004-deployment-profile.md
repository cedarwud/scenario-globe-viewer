# ADR 0004: Deployment Profile

## Status

Accepted

## Context

The delivery target includes offline and on-prem operation, so the default profile cannot assume online Cesium services. The deployment baseline must also stay aligned with the same profile used during day-to-day development.

Evidence:

- `project/home-globe-reference-repos/cesium/Documentation/OfflineGuide/README.md:3-11` states that CesiumJS defaults include online data sources and that offline applications must choose their own providers.
- `project/home-globe-reference-repos/cesium/Documentation/OfflineGuide/README.md:11-16` recommends disabling `BaseLayerPicker` and `Geocoder` for offline applications.
- `project/home-globe-reference-repos/cesium/Documentation/OfflineGuide/README.md:21-31` shows an offline `Viewer` setup using local Natural Earth II assets.
- `project/home-globe-reference-repos/cesium/Documentation/OfflineGuide/README.md:33-35` requires serving static assets through a local server path rather than relying on `file://`.

## Decision

Adopt Profile A, fully offline or on-prem, as both the delivery default and the development default. Profile B, online service-backed visuals, is allowed only as a short-lived opt-in spike. Profile C, mixed showcase assets, remains an optional later-stage profile.

Profile switching will be handled through provider-factory configuration rather than a separate Cesium fork or a separate bootstrap stack.

## Consequences

- Phase 2 quality gates must be met under the offline-first profile, not under an online-only visual spike.
- Credits remain required even when the data source is local or on-prem.
- Local imagery, terrain, and optional tileset hosting become explicit project responsibilities instead of hidden future work.
