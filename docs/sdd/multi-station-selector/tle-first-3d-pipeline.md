# Multi-Station Selector — TLE-First 3D Pipeline

Draft date: 2026-05-18
Status: proposed SDD

## Scope

This document defines the target pipeline for making any selected registry
station pair render through one TLE-first 3D scene contract.

It covers both data and 3D presentation. The implementation is intentionally
phased: first define the contract, then move selected-pair 3D onto it, then
decide whether the fixed demo entry becomes a default runtime pair or remains
an explicitly labelled fixture fallback.

No new customer-specific identifier or project-external agency name is part of
this document's terminology.

## 1. Mission

The viewer should support this reviewer story:

1. Pick any two valid registry stations.
2. Compute the pair using public station coordinates and local TLE fixtures.
3. Render the 3D scene from the same computed pair data wherever possible.
4. Use modeled values only where public source data cannot provide measured
   values.
5. Mark any display-only compression or modeled value so the 3D view does not
   imply measured service telemetry.

The long-term product target is one 3D visual grammar, not one polished fixture
view plus a separate lower-quality selected-pair overlay.

## 2. Current State

### 2.1 Fixed demo entry

The fixed V4 demo entry currently has the best visual quality. It uses the
existing runtime projection fixture and curated actor/timeline surfaces:

- endpoint anchors are operator-family display anchors, not exact source site
  coordinates;
- satellite actors carry TLE lineage, but the visible motion track is a
  viewer-owned display track optimized for readability;
- service state and handover state are modeled fixture timelines;
- relation cues, link-flow pulses, camera framing, label density, and visual
  choreography are polished.

This path is stable and should remain the visual baseline until the TLE-first
runtime scene can match it.

### 2.2 Selected-pair entry

The selected-pair route has stronger pair-specific data today:

- station coordinates come from the public registry;
- visibility windows are computed from TLE propagation and station look-angle;
- pair windows are intersections of the two station visibility sets;
- communication stats and handover events are derived from those windows plus
  link-budget and handover policy models;
- the side panel and CSV are based on this runtime projection.

The selected-pair 3D presentation has improved materially between the
initial SDD draft and 2026-05-18 (hot-mount of the V4 controller for
clean pair selection in `25d0a46`, short-URL routing in `61b1151`,
scene declutter in `ba9637e`, and model-rendered selected-pair
satellites in `39b02a7`). The remaining gap is framing, actor
placement, camera behavior, visual-grammar parity, and display policy,
not raw absence of 3D.

- actor placement is not yet robust across polar, antipodal, and
  long-baseline pairs;
- camera framing still needs pair-geometry-specific handling across polar,
  antipodal, long-baseline, and empty-result scenes;
- it does not yet expose the fixed demo entry's full actor/timeline/link-flow
  visual grammar (role styling, link-flow pulses, label density,
  final-hold);
- display policy for actor count, label density, altitude compression, and
  non-active trails is not yet explicit.

## 3. Truth Classes

Every visible scene value belongs to one of these classes.

| Class | Meaning | Examples | Display requirement |
| --- | --- | --- | --- |
| `tle-derived` | Computed directly from TLE propagation and station geometry | satellite sampled position, station elevation, visibility window, pair intersection | May drive 3D position and panel rows |
| `public-registry-derived` | Directly resolved from the station registry | station id, station name, lat/lon, disclosed orbit support | May drive endpoint markers and pair labels |
| `modeled` | Derived from a physical or policy model, not measured telemetry | throughput estimate, jitter estimate, rain impact, handover decision score | Must remain labelled as modeled |
| `display-only` | Chosen only to make the scene readable | camera height, label declutter, compressed altitude, display lane offset, generic satellite mesh | Must not be treated as source truth |
| `fixture-fallback` | Curated fixed demo data used because runtime data is not yet ready | existing fixed-entry actor/timeline surface | Must be explicit in state and docs |

The renderer may use display-only transforms, but the scene state must keep the
source-derived value available for audit and must not hide the transform.

## 4. Target Architecture

The target runtime has four layers:

1. **Projection compute**: existing selected-pair compute resolves stations,
   loads TLE fixtures, calculates visibility, intersects pair windows, applies
   link-budget models, and emits runtime projection data.
2. **Scene adapter**: converts runtime projection data into a scene view-model
   that the globe renderer can consume.
3. **3D renderer**: renders endpoint markers, satellite actors, tracks,
   active link, handover cues, labels, and camera framing from the scene
   view-model.
4. **Truth boundary**: exposes source class, modeled values, and display-only
   transforms through panel copy, CSV, debug state, and machine-readable data.

The selected-pair route and the fixed demo entry should eventually consume the
same scene view-model contract. If the fixed demo entry remains fixture-based,
it must identify itself as `fixture-fallback` instead of looking equivalent to
the TLE-first runtime path.

## 5. Scene View-Model Contract

The scene adapter should produce a single object shaped like this:

```ts
export interface TleFirstSceneViewModel {
  readonly sourceMode: "tle-first-runtime" | "fixture-fallback";
  readonly pair: {
    readonly stationAId: string;
    readonly stationBId: string;
    readonly sourceClass: "public-registry-derived" | "fixture-fallback";
  };
  readonly timeWindow: {
    readonly startUtc: string;
    readonly endUtc: string;
    readonly sampleStepSeconds: number;
  };
  readonly actors: ReadonlyArray<SceneActor>;
  readonly activeLinks: ReadonlyArray<SceneActiveLink>;
  readonly handoverEvents: ReadonlyArray<SceneHandoverEvent>;
  readonly cameraHint: SceneCameraHint;
  readonly displayPolicy: SceneDisplayPolicy;
  readonly truthBoundary: SceneTruthBoundary;
}
```

Actor contract:

```ts
export interface SceneActor {
  readonly satelliteId: string;
  readonly orbitClass: "LEO" | "MEO" | "GEO";
  readonly role: "active" | "candidate" | "context" | "continuity";
  readonly sourceClass: "tle-derived" | "fixture-fallback";
  readonly sourceSamples: ReadonlyArray<{
    readonly atUtc: string;
    readonly ecefKm: { readonly x: number; readonly y: number; readonly z: number };
  }>;
  readonly visibilityWindows: ReadonlyArray<{
    readonly startUtc: string;
    readonly endUtc: string;
    readonly maxElevationDeg: number;
  }>;
  readonly displayTransform?: {
    readonly transformClass: "display-only";
    readonly reason: string;
  };
}
```

```ts
export interface SceneActiveLink {
  readonly fromUtc: string;
  readonly toUtc: string;
  readonly satelliteId: string;
  readonly stationAId: string;
  readonly stationBId: string;
}

export interface SceneHandoverEvent {
  readonly atUtc: string;
  readonly fromSatelliteId: string | null;
  readonly toSatelliteId: string;
  readonly reasonKind:
    | "current-link-unavailable"
    | "better-candidate-available"
    | "policy-tie-break"
    | "cross-orbit-migration";
}

export interface SceneCameraHint {
  readonly pairGeometry:
    | "short-baseline"
    | "long-baseline"
    | "polar"
    | "antipodal"
    | "empty-result";
  readonly suggestedAltitudeKm: number;
  readonly suggestedHeadingDeg: number;
  readonly suggestedPitchDeg: number;
}

export interface SceneDisplayPolicy {
  readonly maxVisibleActorLabels: number;
  readonly altitudeCompressionEnabled: boolean;
  readonly altitudeCompressionFactor: number;
  readonly suppressNonActiveTrails: boolean;
}

export interface SceneTruthBoundary {
  readonly sourceMode: "tle-first-runtime" | "fixture-fallback";
  readonly tleCapPerOrbit: number;
  readonly modeledMetricsActive: ReadonlyArray<string>;
  readonly displayOnlyTransformsActive: ReadonlyArray<string>;
}
```

**Migration vs. existing adapter**

`TleFirstSceneViewModel` is the convergence target. Slice 1 introduces a new
adapter alongside the existing
`src/features/multi-station-selector/selected-pair-scene-adapter.ts`. Slice 2
makes the renderer consume the new shape. Slice 5 removes the old
`SelectedPairSceneOverlay` adapter once Slice 4 has decided whether the fixed
demo entry is `tle-first-runtime` or `fixture-fallback`. The two adapters MUST
NOT both feed the renderer at the same time after Slice 2.

The key rule: if `sourceMode` is `tle-first-runtime`, actor identity and
source samples must come from TLE records. Display transforms may change how an
actor is drawn, but not which actor the scene claims is present.

## 6. 3D Renderer Contract

The renderer should satisfy these rules:

1. Endpoint markers and ribbon come from the selected station pair.
2. Satellite actors come from `SceneActor`, not from a hard-coded visual list.
3. Active link geometry follows the active `SceneActiveLink` over replay time.
4. Handover visual cues use the same event list as the side panel.
5. Camera framing uses `SceneCameraHint` and has explicit handling for:
   - short-baseline pairs;
   - long-baseline pairs;
   - polar pairs;
   - antipodal or near-antipodal pairs;
   - zero-visibility windows.
6. Empty-result scenes render endpoints, pair context, and the empty state;
   they do not invent active satellites.
7. Generic satellite models are allowed, but mesh shape and scale remain
   display-only.
8. Label density must not depend on how many satellites were computed; it must
   be governed by `SceneDisplayPolicy`.

The renderer can start with points or glow cues, then progress to model actors
after framing and scale are stable.

## 7. Data Policy

### 7.1 Must be TLE-first when runtime data exists

These values must come from TLE propagation and station geometry:

- satellite sampled position;
- station elevation over time;
- station visibility windows;
- pair visibility intersections;
- candidate satellite identity;
- active satellite identity selected by the handover policy.

### 7.2 Modeled values

These values are allowed to be modeled:

- one-way propagation delay from slant range;
- network-speed estimate;
- jitter estimate;
- rain and gas attenuation;
- handover policy score and reason;
- display choreography.

Modeled values must be labelled as modeled and must not be described as
measured telemetry.

### 7.3 Performance cap

The existing per-orbit TLE cap is allowed for interactive compute. The cap must
be visible in debug state or truth boundary text so the scene does not imply an
exhaustive full-catalog search.

## 8. Implementation Slices

### Slice 0 — SDD and baseline capture

Record this SDD and capture current route behavior:

- fixed demo entry visual baseline;
- selected-pair route behavior for the five walkthrough pairs;
- selected-pair polar pair camera failure mode;
- zero-window behavior.

No runtime behavior changes in this slice.

- Smokes that must keep passing: `npm run build` only, because this slice has
  no runtime change.

### Slice 1 — Scene view-model adapter

Add a pure adapter from runtime projection result to
`TleFirstSceneViewModel`.

Acceptance:

- selected-pair runtime projection can produce actors, active links,
  handover events, camera hints, and truth boundary;
- zero-window projections produce no active actors and no fake links;
- tests assert actor ids resolve to TLE records.

- Smokes that must keep passing: `npm run build`;
  `verify-g1-bucket-a-coverage`; `verify-random-pair-projection-budget`.

### Slice 2 — Selected-pair 3D renderer v1

Render selected-pair 3D from the scene view-model with conservative visual
primitives.

Acceptance:

- endpoint markers, pair ribbon, active link, and actor cues are derived from
  the view-model;
- polar and long-baseline pairs do not stack models incoherently over the
  viewport;
- the fixed demo entry remains unchanged.

- Smokes that must keep passing: `npm run build`;
  `verify-g1-bucket-a-coverage`; `verify-random-pair-projection-budget`;
  `verify-information-density`; visual diff vs
  `/tmp/sgv_demo*_post_wave3.png` for the five walkthrough pairs.

### Slice 3 — Visual parity with fixed demo grammar

Move selected-pair 3D from conservative cues toward the fixed demo entry's
visual grammar:

- actor role styling;
- link-flow pulse language;
- event cue timing;
- label density;
- camera choreography;
- final-hold and replay behavior.

Acceptance:

- selected-pair routes feel like the same product surface as the fixed demo
  entry;
- side panel events and 3D handover cues are driven by the same event list.

- Smokes that must keep passing: `npm run build`;
  `verify-g1-bucket-a-coverage`; `verify-random-pair-projection-budget`;
  `verify-information-density`; `verify-60x-replay-continuity`.

### Slice 4 — Fixed demo route convergence

Choose one of two outcomes:

1. Make the fixed demo entry a default TLE-first runtime pair.
2. Keep it as an explicitly labelled fixture fallback.

Acceptance:

- there is no ambiguous second 3D truth model;
- machine-readable state exposes whether the scene is `tle-first-runtime` or
  `fixture-fallback`;
- the entry copy and side-panel truth boundary match the chosen mode.

- Smokes that must keep passing: all of G1-G5 plus an additional regression
  manifest pass for any `m8a-v4.*` smoke that the fixed demo entry exercises.

### Slice 5 — Cleanup and regression hardening

Remove stale selected-pair overlay code only after the new renderer is stable.

Acceptance:

- build passes;
- existing selected-pair gates pass;
- 60x replay continuity still passes;
- route entry and copy-link behavior stay stable.

- Smokes that must keep passing: all of G1-G5; visual identity vs the Slice 3
  baseline screenshots.

## 9. Acceptance Criteria

### A1. Data provenance (verifies section 6 rules 2 and 6)

For a selected-pair runtime route:

- every rendered satellite actor has a TLE-backed id;
- actor source samples carry UTC timestamps;
- zero-window projections render no fake active satellite;
- modeled metrics remain labelled as modeled.

### A2. Visual coherence (verifies section 6 rule 5)

For the five existing walkthrough pairs:

- endpoints are visible;
- the camera frames the pair and active actors without incoherent overlap;
- polar pairs do not place a row of large models across the top of the view;
- empty-result scenes remain visually intentional.

### A3. Route convergence (verifies section 6 rule 1)

The selected-pair route and the fixed demo entry use the same scene view-model
contract, or the fixed demo entry explicitly reports `fixture-fallback`.

### A4. Replay continuity

At 60x playback:

- the side panel remains ready;
- the replay clock advances;
- active 3D link state follows the replay time;
- no stale pair's actors remain after reselection.

### A5. Performance

Default selected-pair compute remains under the existing one-second budget for
the accepted random/walkthrough/worst-case smoke set.

### A6. Source-boundary visibility

The UI or debug state exposes:

- runtime source mode;
- TLE cap;
- display-only transforms;
- modeled metric status;
- fixture fallback status when used.

## 10. Non-Goals

- No claim of measured throughput, measured jitter, active gateway assignment,
  or native service telemetry.
- No private source-coordinate upgrade.
- No requirement to render every satellite in the upstream catalog.
- No full-catalog exhaustive compute in the interactive route.
- No removal of the stable fixed demo entry until the new pipeline can match
  its visual baseline.

## 11. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Polar / antipodal framing | Actors and endpoints can collapse into unreadable compositions | Camera hints must classify pair geometry before render |
| Model scale | Generic satellite models can dominate the viewport | Start with point/glow renderer; promote models only after scale gates pass |
| Runtime cost | More actor samples can break the one-second budget | Keep cap explicit; separate compute cap from display count |
| Truth confusion | Display compression can look like source geometry | Carry display-transform metadata through state and copy |
| Route regression | Changing fixed demo data can break the stable presentation | Keep fixed demo untouched until Slice 4 decision |
| Fixed-demo consumer regression at Slice 4 | Changing the fixed demo entry data model can regress existing `m8a-v4.*` smokes that snapshot its DOM | Capture full `m8a-v4.*` manifest pass on the pre-Slice-4 build; treat that as the regression baseline. Do not delete or rename fixed-demo dataset attributes consumed by surviving smokes. |

## 12. Open Decisions

1. Should the fixed demo entry become a default public-registry pair, or remain
   a fixture fallback?
2. What is the maximum number of visible actors for selected-pair 3D at
   1280x800 and 1920x1080?
3. Should display compression preserve real longitude/latitude and compress
   only altitude, or may it use separate display lanes when explicitly labelled?
4. Should the selected-pair renderer show context candidates, or only the
   current active and next handover candidate?
5. Which route should be the canonical reviewer URL after convergence?

   > SDD inclination: the selected-pair short URL (`/?stationA=&stationB=`) becomes canonical once Slice 4 lands, because A3 already targets one shared scene view-model contract. The fixed-demo CTA then either resolves to a default pair (option 1) or stays as a labelled fixture-fallback (option 2). Final call is the user's at Slice 4 acceptance review.

## 13. References

- `docs/sdd/multi-station-selector/information-architecture.md`
- `docs/sdd/multi-station-selector/runtime-data-contract.md`
- `docs/sdd/multi-station-selector/acceptance-criteria.md`
- `docs/sdd/multi-station-selector/delivery-summary.md`
- `src/features/multi-station-selector/runtime-projection.ts`
- `src/features/multi-station-selector/selected-pair-scene-adapter.ts`
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
