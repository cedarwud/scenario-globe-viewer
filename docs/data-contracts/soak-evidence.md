# Soak Evidence Contract

## Purpose

`soak-evidence` is the repo-owned Phase 7.0 boundary for long-running
stability evidence. It formalizes run parameters, periodic samples, failure
records, summary output, artifact layout, and retention rules without turning
the soak harness into a new feature/runtime ownership surface.

## Current Public Source Of Truth

- `tests/soak/run-soak.mjs`
- package scripts `npm run test:phase7.0:rehearsal` and
  `npm run test:phase7.0:full`

The harness reads only the accepted external evidence surfaces:

- `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__`
- `document.documentElement.dataset.bootstrapState`
- repo bootstrap `window error` and `unhandledrejection` events

The shipped package scripts also sanitize ambient
`VITE_CESIUM_BUILDING_SHOWCASE` and `VITE_CESIUM_SITE_TILESET_URL` before the
build plus soak run so rehearsal/full evidence stays on the accepted default
runtime variant unless a caller explicitly bypasses that package entry.

## Public Shape

```ts
interface SoakRunParams {
  runId: string;
  profile: string;
  durationMs: number;
  sampleIntervalMs: number;
  maxFailures: number;
  retentionDays: number;
  screenshotOnFailure?: boolean;
}

interface SoakSample {
  timestamp: string;
  bootstrapState: string;
  scenarioId?: string;
  replayTime?: string;
  replayPlaying?: boolean;
  communicationStatus?: string;
  handoverDecisionKind?: string;
  validationAttachState?: string;
  memoryUsageMb?: number;
}

interface SoakFailure {
  timestamp: string;
  kind:
    | "window-error"
    | "unhandledrejection"
    | "bootstrap-error"
    | "state-stale"
    | "memory-threshold";
  message: string;
  detail?: unknown;
}

interface SoakSummary {
  schemaVersion: string;
  runId: string;
  profile: string;
  durationMs: number;
  sampleIntervalMs: number;
  passed: boolean;
  failureCount: number;
  sampleCount: number;
  startedAt: string;
  endedAt: string;
  outputDir: string;
}
```

## Artifact Tree

Expected output tree:

```text
output/soak/<ISO8601>-<run-id>/
  harness-params.json
  summary.json
  samples.ndjson
  errors.ndjson
  screenshots/   # optional
```

The harness owns artifact emission only. It does not become a runtime state
store, feature controller, or alternate bootstrap path.

`harness-params.json` also stores the derived evaluator policy
(`memoryThresholdMb`, `staleWindowMs`, `staleRuleArmCondition`) plus the
observed ready-state runtime variant (`scenePreset`, `buildingShowcase*`,
`siteTilesetState`) so a retained artifact remains self-describing.

## Pass/Fail Rules

Phase 7.0 first slice keeps the gate explicit and narrow:

- `bootstrapState` must not enter `error`
- any `window error` or `unhandledrejection` is a soak failure
- replay state is considered stale when `replayPlaying === true` but
  `replayTime` stops advancing across the bounded stale window; the current
  baseline bootstrap starts paused, so this rule is armed only once the runtime
  itself is in playback
- the current harness profile treats JS heap usage above the configured memory
  threshold as a soak failure; `memoryUsageMb` is sampled by the harness
  through browser-local CDP heap inspection rather than a repo runtime seam
- `summary.passed` is derived from `failureCount <= maxFailures`

These rules are evidence rules only. They do not redefine scenario, replay,
overlay, communication-time, handover-decision, physical-input, or
validation-state ownership.

## Retention Rule

- The repo tracks only this contract, the harness source, package wiring, and
  `output/soak/.gitkeep`
- generated soak artifacts under `output/soak/<run>/` must not be committed
- each run records `retentionDays` in `harness-params.json`; rehearsal and full
  evidence should stay locally retained for at least that duration before manual
  cleanup

## Ownership Boundary

The soak harness may:

- start the built app
- read the existing capture seam
- read bootstrap dataset state
- sample state periodically
- record failure artifacts

The soak harness may not:

- own feature state
- widen `src/features/`
- move orchestration into `src/main.ts`
- redefine Phase 6 boundaries
- claim Phase 7.1 scale validation
