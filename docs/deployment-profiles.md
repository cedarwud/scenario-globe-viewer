# Deployment Profiles

Source note: this file records the repo's current deployment-profile interpretation after the Phase 2 close-out governance sync. Keep it synchronized with ADR 0004, `delivery-phases.md`, and `cesium-evidence.md`.

## Profile Labels

- Profile A: Cesium-native default
- Profile B: explicit local or on-prem override
- Profile C: mixed or showcase variant

These labels supersede older wording that treated Profile A as the offline stack and Profile B as the ion-only spike path.

## Current Rule

For this repo, `offline-first` no longer means "disable or replace Cesium-native functionality until the app looks self-hosted."

It means:

- stay on Cesium's upstream runtime path
- avoid Cesium forks or parallel bootstrap stacks
- preserve native `Viewer` controls and provider behavior unless there is an explicit product requirement to change them
- treat local or on-prem imagery, terrain, and tilesets as opt-in deployment configuration, not as the only compliant default

In practical terms, Cesium-native features count as acceptable baseline behavior for this repo, even when those defaults are backed by Cesium services.

## Profile A: Cesium-Native Default

Use this as the delivery default, development default, and Phase 2 validation baseline.

Expected characteristics:

- native `Viewer` shell stays intact
- native `BaseLayerPicker`, `Geocoder`, `HomeButton`, timeline, and credits remain available unless a separate product decision says otherwise
- native imagery and terrain choices remain valid baseline behavior
- an explicit ion token may be supplied to remove warning noise while staying on the same native path

This profile exists to protect visual quality and to prevent repo-local code from degrading the shell just to satisfy a planning term.

## Profile B: Explicit Local Or On-Prem Override

Use this only when a deployment explicitly requires mirrored or self-hosted providers.

Expected characteristics:

- the repo stays on the same `Viewer` shell
- imagery and terrain are swapped through explicit provider configuration
- local or mirrored assets are added as opt-in overrides rather than by replacing the default profile definition

Examples include:

- `VITE_CESIUM_IMAGERY_URL`
- `VITE_CESIUM_SITE_TILESET_URL`
- `VITE_CESIUM_TERRAIN_URL`
- other explicit mirrored provider endpoints

Profile B is supported, but it is not the baseline that Phase 2 quality work should optimize against by default.

The current formal site dataset MVP belongs here: it uses the explicit configured site-hook path, keeps attribution and validation explicit, and remains distinct from the Profile C showcase line.

## Profile C: Mixed Or Showcase Variant

This remains an optional later-stage profile for demos or mixed asset strategies.

Current example: the explicit Cesium OSM Buildings showcase opt-in (`?buildingShowcase=osm` or `VITE_CESIUM_BUILDING_SHOWCASE=osm`) may be used as a mixed/showcase-only variant. It remains separate from the formal `site` preset semantics and does not turn ion-backed buildings into the default validation baseline.

It must not silently replace Profile A as the normal development or validation path.
It also must not be re-labeled as the repo's formal site dataset delivery path.

## Phase 2 Interpretation

Phase 2 should improve globe quality on top of Cesium-native behavior. It should not:

- disable `Geocoder` or `BaseLayerPicker` just because a historical offline guide showed that pattern
- force low-fidelity local imagery as the default visual baseline
- force ellipsoid fallback terrain as the default visual baseline
- treat Cesium-native services as disallowed by definition

If a deployment truly needs local or on-prem providers, add them as explicit Profile B configuration and validate them separately. Do not restore the older Profile A/Profile B label mapping in future repo docs.
