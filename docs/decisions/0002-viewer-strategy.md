# ADR 0002: Viewer Strategy

## Status

Accepted

## Context

The repo needs one high-level Cesium container strategy before the first render path is introduced. Early phases focus on the globe foundation, neutral shell wiring, and later interface seams for time and overlays.

Evidence:

- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:1-39` shows that `Viewer` layers a higher-level container over engine primitives and widget modules.
- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:276-298`, `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:416-428`, `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:564-588`, and `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:644-656` show the constructor options and creation paths for `baseLayerPicker` and `geocoder`.
- [../cesium-evidence.md](../cesium-evidence.md) preserves the offline-oriented `Viewer` conclusions that were extracted during repo bootstrap.

## Decision

Adopt `Viewer` as the default Cesium wrapper for this repo. Keep it for the full delivery track unless an explicit blocker appears.

When the first render path lands, disable unused built-in controls through constructor options instead of switching to `CesiumWidget` preemptively. There is no scheduled migration window for `CesiumWidget`.

## Consequences

- Phase 1 can reach a working globe sooner because scene, data source, and attribution wiring arrive together.
- Later UI work must account for `widgets.css` and constructor-level widget shutdown rather than assuming a zero-widget shell.
- If CSS isolation or render-loop control becomes an actual blocker, that blocker must be documented before this ADR is replaced.
