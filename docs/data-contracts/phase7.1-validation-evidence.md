# Phase 7.1 Validation Evidence Contract

## Purpose

`phase7.1-validation-evidence` is the repo-owned viewer-side boundary for
`Phase 7.1` multi-orbit scope and `>= 500 LEO` scale evidence.

It formalizes:

- `validationProfile`
- `orbitScopeMatrix`
- `scaleRunParams`
- `observedRuntimeVariant`
- `passFailSummary`
- `knownGaps`
- `artifactLayout`

without turning the validation runner into a new feature/runtime ownership
surface.

This contract is evidence-first. It does not promote the current walker-backed
runtime into multi-orbit closure, and it does not absorb external NAT / tunnel /
DUT truth.

## Current Public Source Of Truth

- `scripts/run-phase7.1-viewer-validation.mjs`
- `tests/validation/run-phase7.1-viewer-scope-validation.mjs`
- `src/features/scenario/scenario.ts`
- `src/features/satellites/adapter.ts`
- `src/features/physical-input/physical-input.ts`
- `src/runtime/satellite-overlay-controller.ts`

The harness reads only:

- the existing capture seam `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__`
- `document.documentElement.dataset.*`
- the repo-owned contract/runtime source files listed above

It does not become a new viewer bootstrap path, overlay controller, scenario
controller, or Phase 8 presentation surface.

## Public Shape

```ts
type OrbitScopeClass = "leo" | "meo" | "geo";
type CoverageStatus = "declared" | "partial" | "missing";
type LiveRuntimeStatus = "observed" | "walker-only" | "not-implemented" | "error";

interface ValidationProfile {
  id: string;
  description: string;
  requiredOrbitClasses: ReadonlyArray<OrbitScopeClass>;
  requestedOverlayMode: "walker-points";
  retentionDays: number;
}

interface OrbitScopeMatrixEntry {
  orbitClass: OrbitScopeClass;
  contractCoverage: {
    status: CoverageStatus;
    detail: string;
  };
  liveRuntimeCoverage: {
    status: LiveRuntimeStatus;
    detail: string;
  };
  walkerOnlyKnownGap: string | null;
}

interface ScaleRunParams {
  runId: string;
  targetLeoCount: number;
  observedLeoCount: number;
  requestedOverlayMode: "walker-points";
  observedOverlayRenderMode: string | null;
  enforcePass: boolean;
}

interface ObservedRuntimeVariant {
  bootstrapState: string | null;
  bootstrapDetail: string | null;
  scenePreset: string | null;
  buildingShowcaseState: string | null;
  siteTilesetState: string | null;
  scenarioId: string | null;
  replayMode: string | null;
  communicationStatus: string | null;
  handoverDecisionKind: string | null;
  validationAttachState: string | null;
  overlayMode: string | null;
  overlayState: string | null;
  overlayRenderMode: string | null;
  overlayPointCount: number;
  captureHandles: {
    viewer: boolean;
    replayClock: boolean;
    scenarioSession: boolean;
    communicationTime: boolean;
    handoverDecision: boolean;
    validationState: boolean;
    satelliteOverlay: boolean;
  };
}

interface ValidationGateResult {
  id: string;
  passed: boolean;
  detail: string;
}

interface PassFailSummary {
  evidenceBoundaryEstablished: boolean;
  requirementGatePassed: boolean;
  enforcePass: boolean;
  gates: ReadonlyArray<ValidationGateResult>;
}

interface ArtifactLayout {
  outputDir: string;
  files: ReadonlyArray<string>;
  retentionDays: number;
}

interface Phase71ValidationSummary {
  schemaVersion: string;
  validationProfile: ValidationProfile;
  orbitScopeMatrix: ReadonlyArray<OrbitScopeMatrixEntry>;
  scaleRunParams: ScaleRunParams;
  observedRuntimeVariant: ObservedRuntimeVariant;
  passFailSummary: PassFailSummary;
  knownGaps: ReadonlyArray<string>;
  artifactLayout: ArtifactLayout;
}
```

## Orbit Scope Matrix Rules

- `contractCoverage` is derived from repo-owned source surfaces, not from a
  screenshot or a verbal assumption.
- `liveRuntimeCoverage` is derived from the currently built viewer runtime only.
- If the live runtime still exposes only `off | walker-points`, that state must
  be recorded as `walker-only` rather than paraphrased as multi-orbit closure.
- `walkerOnlyKnownGap` is mandatory whenever the live runtime still collapses
  back to the copied walker proof line.

## Artifact Tree

Expected output tree:

```text
output/validation/phase7.1/<ISO8601>-<run-id>/
  harness-params.json
  contract-signals.json
  observed-runtime.json
  orbit-scope-matrix.json
  known-gaps.json
  summary.json
```

`summary.json` is the retained close-out artifact for the first slice. The
other files keep the retained artifact self-describing and auditable.

## Pass/Fail Rules

The Phase 7.1 first-slice runner keeps two outcomes separate:

1. `evidenceBoundaryEstablished`
   - static contract signals were read successfully
   - the built viewer reached a bounded ready state
   - the requested viewer-side observation path ran and wrote retained artifacts
2. `requirementGatePassed`
   - every required orbit class has non-placeholder live runtime coverage
   - `observedLeoCount >= targetLeoCount`

This separation is intentional. The first-slice boundary may be established
while the requirement-critical gate still fails.

The default command writes retained artifacts even when `requirementGatePassed`
is `false`.

`--enforce-pass` converts a failing requirement gate into a non-zero process
exit so the same runner has an explicit pass/fail path.

## Retention Rule

- The repo tracks only this contract, the wrapper, the runner, and
  `output/validation/.gitkeep`
- generated artifacts under `output/validation/phase7.1/<run>/` must not be
  committed
- each run records `retentionDays` in `harness-params.json`

## Ownership Boundary

The Phase 7.1 validation runner may:

- start the built app
- read the existing capture seam
- inspect repo-owned contract/runtime source files
- write retained evidence artifacts

The Phase 7.1 validation runner may not:

- widen `src/features/*`
- move orchestration into `src/main.ts`
- redefine `validation-state` ownership
- claim external NAT / tunnel / DUT / `iperf` / `ping` truth
- claim Phase 8 local-view or presentation closure

