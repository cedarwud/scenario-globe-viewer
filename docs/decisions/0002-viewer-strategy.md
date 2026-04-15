# ADR 0002: Viewer Strategy

## Status

Accepted

## Context

The repo needs one high-level Cesium container strategy before the first render path is introduced. Early phases focus on the globe foundation, neutral shell wiring, and later interface seams for time and overlays.

Evidence:

- `project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:1-39` shows that `Viewer` layers a higher-level container over engine primitives and widget modules.
- `project/home-globe-reference-repos/cesium/packages/widgets/Specs/Viewer/ViewerSpec.js:85-117` verifies that `Viewer` exposes the integrated scene, data source, camera, credit, and widget surface.
- `project/home-globe-reference-repos/cesium/Documentation/OfflineGuide/README.md:7-16` documents the `Viewer` constructor path for supplying offline imagery and disabling online-facing widgets.

## Decision

Adopt `Viewer` as the default Cesium wrapper for this repo. Keep it for the full delivery track unless an explicit blocker appears.

When the first render path lands, disable unused built-in controls through constructor options instead of switching to `CesiumWidget` preemptively. There is no scheduled migration window for `CesiumWidget`.

## Consequences

- Phase 1 can reach a working globe sooner because scene, data source, and attribution wiring arrive together.
- Later UI work must account for `widgets.css` and constructor-level widget shutdown rather than assuming a zero-widget shell.
- If CSS isolation or render-loop control becomes an actual blocker, that blocker must be documented before this ADR is replaced.
