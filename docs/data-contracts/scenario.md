# Scenario Contract

## Purpose

`scenario` is the repo-owned plain-data seam planned for Phase 6.1. Its job is
to coordinate scenario identity, source type, lifecycle, and cross-seam
switching without collapsing that responsibility back into `scene-preset`,
`replay-clock`, or `satellite-overlay`.

This contract exists because the current repo has:

- a framing/presentation seam: `scene-preset`
- a time seam: `replay-clock`
- a fixture/overlay seam: `satellite-overlay`

but it does not yet have a single repo-owned surface that answers:

- what scenario is currently loaded
- whether that scenario is `real-time` or `prerecorded`
- which source families are active for that scenario
- how scenario switching coordinates preset, time, overlay, site-dataset, and
  later validation-mode state

## Current Public Shape

Current public source of truth: `src/features/scenario/scenario.ts`,
`src/features/scenario/resolve-scenario-inputs.ts`, and
`src/features/scenario/scenario-facade.ts`, plus
`src/features/scenario/scenario-plan-runner.ts` and
`src/features/scenario/scenario-session.ts`.
Those modules reuse the existing repo-local `ScenePresetKey`, `ClockMode`,
`ClockTimestamp`, `SceneSite3DTilesSource`, and satellite fixture kinds instead
of forking a second vocabulary for the same seams.

```ts
interface ScenarioPresentationRef {
  presetKey: ScenePresetKey;
}

interface ScenarioTimeDefinition {
  mode: ClockMode;
  range?: {
    start: ClockTimestamp;
    stop: ClockTimestamp;
  };
}

// Transitional flat union for Phase 6.1 planning. It currently mixes
// time-family values with broader scenario-intent families. A later accepted
// implementation may split this into separate fields such as `timeMode` and
// `intent` once the boundary is proven in code.
type ScenarioKind =
  | "prerecorded"
  | "real-time"
  | "site-dataset"
  | "validation-bridge";

interface ScenarioDefinition {
  id: string;
  label: string;
  // If `kind` is "prerecorded" or "real-time", it must agree with `time.mode`.
  // If `kind` is "site-dataset" or "validation-bridge", `time.mode` is chosen
  // independently and `kind` expresses the broader scenario intent.
  kind: ScenarioKind;
  presentation: ScenarioPresentationRef;
  time: ScenarioTimeDefinition;
  // First multi-orbit intake widens scenario only with a narrow optional
  // metadata block that stays parallel to `presentation`, `time`, and
  // `sources`.
  context?: {
    vertical?: string;
    truthBoundaryLabel?: "real-pairing-bounded-runtime-projection";
    endpointProfileId?: string;
    infrastructureProfileId?: string;
  };
  sources: {
    satellite?: ScenarioSatelliteSourceRef;
    siteDataset?: ScenarioSiteDatasetRef;
    validation?: ScenarioValidationRef;
  };
}

type ScenarioSatelliteSourceRef =
  | {
      kind: "fixture-ref";
      fixtureType: "tle" | "czml" | "sample-series";
      fixtureId: string;
    }
  | {
      kind: "feed-ref";
      feedId: string;
    };

interface ScenarioSiteDatasetRef {
  source: SceneSite3DTilesSource;
  datasetRef: string;
}

interface ScenarioValidationRef {
  // Phase 6.6 owns the concrete sub-taxonomy here. Phase 6.1 only reserves the
  // shape slot so scenario definitions can point at a later validation seam.
  mode: string;
  transport: string;
}
```

This shape is intentionally narrow. The first accepted multi-orbit intake now
lands the optional top-level `context` block. That block accepts only
`vertical`, `truthBoundaryLabel`, `endpointProfileId`, and
`infrastructureProfileId`, rejects unknown keys during
scenario-definition validation, and rejects any `truthBoundaryLabel` other than
`real-pairing-bounded-runtime-projection`. The two profile IDs now point at the
separate repo-owned plain-data seeds documented in
`docs/data-contracts/overlay-seeds.md` and implemented in
`src/features/overlays/overlay-seeds.ts`; `scenario` still carries only the
string references.

## First Source Taxonomy

The first Phase 6.1 taxonomy is intentionally small:

- `prerecorded`
- `real-time`
- `site-dataset`
- `validation-bridge`

Interpretation:

- `prerecorded` and `real-time` are scenario mode families
- `site-dataset` is a scenario source family for site-facing delivery or review
  cases
- `validation-bridge` is a scenario family for NAT/tunnel/DUT-oriented
  validation cases
- `prerecorded` and `real-time` are treated as Tier 1-confirmed first-class
  families for Phase 6.1 planning
- `site-dataset` and `validation-bridge` are provisional placeholders for
  Phase 6.1 planning and must not be read as a frozen downstream taxonomy

This taxonomy is sufficient for Phase 6.1 planning. It does not claim that the
full final scenario vocabulary is already closed.

## Plain-Data Boundary

The public scenario contract must remain serializable:

- ids are strings
- mode names are repo-owned strings
- time values are plain timestamps
- source references are repo-owned descriptors, not runtime instances

The public scenario contract must not expose:

- `Viewer`
- `JulianDate`
- `Entity`
- `Cesium3DTileset`
- concrete adapter instances
- donor-specific runtime handles

The runtime may resolve these plain-data descriptors later, but that resolution
must stay outside the public contract.

## Ownership Boundary

### `scenario`

`scenario` owns:

- scenario identity
- scenario kind
- source-family selection
- lifecycle state for load/switch/unload
- cross-seam coordination intent

`scenario` does not own:

- camera framing internals
- native shell controls
- play/pause/seek/multiplier implementation
- overlay rendering internals
- fixture parsing/propagation internals
- statistics computation
- decision-layer semantics
- validation-stack implementation details

### Boundary With `scene-preset`

`scene-preset` stays the framing and presentation seam only.

- `scene-preset` owns camera framing intent and presentation policy ids
- `scenario` may reference a preset key
- `scenario` must not absorb presentation ownership from `scene-preset`

### Boundary With `replay-clock`

`replay-clock` stays the single time-control seam only.

- `scenario` chooses the time context to load
- `replay-clock` still owns play/pause/seek/multiplier behavior
- `scenario` must not become a second clock API

### Boundary With `satellite-overlay`

`satellite-overlay` stays the fixture/adapter seam only.

- `scenario` chooses which source family or fixture reference is active
- `satellite-overlay` still owns fixture/adapter/runtime-rendering boundaries
- `scenario` must not absorb rendering or adapter-internal ownership

### Boundary With Validation Work

`scenario` may reference validation-facing modes, but it does not replace a later
validation boundary.

- `scenario` can say "this is a validation-bridge scenario"
- a later Phase 6.6 seam still owns NAT/tunnel/DUT integration details

## Lifecycle Boundary

The minimum lifecycle the contract must eventually support is:

1. select a scenario definition
2. resolve source descriptors
3. provide preset/time/overlay inputs in the correct order without taking over
   the apply logic owned by those seams
4. switch deterministically to another scenario
5. unload or detach the current scenario cleanly

Phase 6.1 should stop at defining this lifecycle boundary. It should not expand
into full validation-stack ownership, statistics, or decision-layer behavior.

## Current Repo State

In the current repo state:

- this document is the first repo-owned scenario contract planning surface
- a plain-data `src/features/scenario/` module now records the public scenario
  contract boundary, the first pure coordination helpers, and a thin app-facing
  facade for current-scenario selection state together with a plan-driver
  boundary plus an in-memory session host
- a thin `src/runtime/scenario-runtime-plan-driver.ts` adapter now exists for
  bounded runtime consumers, but it only executes plan steps through explicit
  bindings and still stays off the live `src/main.ts` coordination path
- `src/runtime/scenario-runtime-session.ts` now provides the first bounded
  runtime consumer factory for that adapter, composing it back into the repo-
  owned session host without turning `scenario` into a live top-level
  coordinator
- `src/runtime/scenario-bootstrap-session.ts` now narrows that path one step
  further for future bootstrap-owned callers: it only accepts
  `presentation + time` scenarios and rejects satellite/site/validation source
  families up front
- `src/main.ts` now only seeds that bootstrap helper with the currently
  selected bootstrap scenario so the app shell has a repo-owned scenario caller
  surface without starting live scenario switching
- `scene-preset`, `replay-clock`, and `satellite-overlay` remain separate seams
- the live runtime is still bounded to the current preset/time/overlay structure
- the walker proof path remains an overlay proof line, not a scenario model

That means this document plus `src/features/scenario/` now define the Phase 6.1
public boundary, but they are still not proof that runtime Phase 6.1
coordination has already started.

## Must Stay Out Of Scope

For Phase 6.1 contract planning and first implementation:

- orbit art
- denser overlay expansion
- handover-demo composition work
- statistics layer work
- decision layer work
- validation-stack build-out
- presentation-first shell rewrite

## Non-Goals And Not-Yet-Implemented

This contract does not yet define:

- the final full scenario taxonomy beyond the first four source families
- a runtime registry implementation
- a scenario-management UI
- final validation ownership details
- the concrete virtual/physical DUT, NAT, tunnel, or bridge sub-taxonomy that
  belongs to Phase 6.6
- final admissible soak/scale evidence policy
- final data-source ids for production feeds

Those are follow-on decisions. They do not block the Phase 6.1 contract boundary
from being written down now.

## Related

- [README.md](../../README.md)
- [Architecture](../architecture.md)
- [Delivery Phases](../delivery-phases.md)
- [Phase 6+ Requirement-Centered Plan](../sdd/phase-6-plus-requirement-centered-plan.md)
- [Scene Preset Contract](./scene-preset.md)
- [Replay Clock Contract](./replay-clock.md)
- [Satellite Overlay Contract](./satellite-overlay.md)
