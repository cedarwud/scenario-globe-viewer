# Delivery Phases

Source note: this file is a manual rewrite of the active workspace engineering index dated 2026-04-15. Keep it as repo-owned text. Do not replace it with a symlink or hard link.

Related structure: see [architecture.md](./architecture.md).

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

## Phase 1

Goal: bootstrap Cesium with a clean first-globe path.

Planned outcomes:

- add Cesium bootstrap code and `widgets.css`
- wrap `Viewer`
- disable unused built-in controls
- preserve credits
- add first smoke coverage for assets and workers

Gate:

- no console bootstrap errors
- Cesium assets and workers resolve from the delivery path
- the globe renders and interaction is stable enough for baseline capture

## Phase 2

Goal: build a clearly stronger globe baseline under the offline-first deployment profile.

Planned outcomes:

- atmosphere, lighting, fog, star background, and camera language
- offline-first imagery and terrain selection
- scene preset contracts and preset implementations
- visual baselines and a globe-only soak run

Gate:

- preset switching is clean
- visual quality is meaningfully above the legacy baseline
- validation is done under the delivery-default deployment profile, not an online-only spike

## Phase 3

Goal: add application framing and time/overlay seams without turning on satellite implementation.

Planned outcomes:

- shell HUD frame
- replay clock interface and implementation
- placeholder timeline surface
- overlay manager interface
- satellite overlay adapter interface only

Gate:

- replay controls work
- HUD framing exists
- overlay integration points are present
- no walker adapter implementation exists yet

## Beyond Phase 3

Phase 4 and later introduce actual satellite fixture handling, richer scenario data contracts, and full-system validation. Those phases are intentionally out of scope for the current implementation pass.
