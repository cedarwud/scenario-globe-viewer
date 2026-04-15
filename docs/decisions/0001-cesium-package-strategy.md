# ADR 0001: Cesium Package Strategy

## Status

Accepted

## Context

This delivery repo needs a single Cesium dependency strategy before any bootstrap code is written. The immediate goal is a stable Phase 0-2 base, not package-level experimentation.

Evidence:

- `project/home-globe-reference-repos/cesium/package.json:2-56` defines the umbrella `cesium` package at `1.140.0` and maps it to `@cesium/engine` and `@cesium/widgets`.
- `project/home-globe-reference-repos/cesium/packages/engine/package.json:1-35` and `project/home-globe-reference-repos/cesium/packages/widgets/package.json:1-33` show the scoped packages and their coupling.

## Decision

Use the umbrella package `cesium@1.140.0` as the provisional default for Phase 0. Do not mix umbrella and scoped imports in the same codebase unless a later ADR replaces this decision.

The scoped package split remains a fallback path, not the default path. Any move to direct `@cesium/engine` or `@cesium/widgets` dependencies must happen in the same change set as the package manifest, import path updates, and documentation updates.

## Consequences

- Phase 0 and Phase 1 can bootstrap against a single pinned dependency with a smaller decision surface.
- Future code can still import the public Cesium API without committing to an internal package split on day one.
- If an explicit blocker appears around version skew or package-level control, this ADR must be revised before the dependency strategy changes.
