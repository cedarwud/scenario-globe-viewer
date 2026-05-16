# Multi-Station Selector — Runtime Data Contract

Draft date: 2026-05-16

## Scope

This document defines the runtime data contract for the homepage multi-station selector feature. The selector lets a user pick two ground stations from a globe-rendered registry; "Apply" then enters the existing V4 ground-station demo route using those two stations as the active endpoint pair.

The contract has three layers:

1. **Input** — what the user-driven selection produces.
2. **Output** — what the V4 demo route consumes to render.
3. **Source-tier authority** — how each pair is labelled in the UI so unverified pairs are not presented as authority-validated.

A separate web-research artifact (`public/fixtures/ground-stations/multi-orbit-public-registry.json`) supplies the station registry that the selector reads.

## Terminology

This document and every new module, file, fixture, and UI label produced for this feature uses neutral terminology only. The strings `itri`, `ITRI`, and references to any specific customer name MUST NOT appear in new source code, new fixtures, or new UI strings. Existing files outside this feature retain their current names; renaming legacy paths is out of scope.

| Concept | Term used in this feature |
| --- | --- |
| Pair attested by an external authority package | `operator-validated` (tier 1) |
| Pair derivable from operator-published disclosure but not contract-validated | `public-disclosed` (tier 2) |
| Pair derived from geometry only | `geometric-derived` (tier 3) |

The existing operator-validated pair (the one with a retained authority package — Taiwan CHT plus Singapore Speedcast) continues to flow through the existing fixture path; the selector neither reads nor exposes that customer-supplied package in any new module under this feature.

## Layer 1 — Input contract

The selector emits a single value when the user completes selection:

```ts
export type SupportedOrbitClass = "LEO" | "MEO" | "GEO";
export type SupportedBand = "L" | "S" | "C" | "X" | "Ku" | "Ka" | "V";

export type GroundStationDescriptor = {
  readonly id: string;
  readonly displayName: string;
  readonly operator: string;
  readonly operatorFamily: string;
  readonly country: string;
  readonly region:
    | "north-america"
    | "europe"
    | "asia"
    | "africa"
    | "oceania"
    | "south-america"
    | "polar-arctic"
    | "polar-antarctic";
  readonly lat: number;
  readonly lon: number;
  readonly supportedOrbits: ReadonlyArray<SupportedOrbitClass>;
  readonly supportedBands: ReadonlyArray<SupportedBand>;
  readonly disclosurePrecision:
    | "exact-coords"
    | "operator-family-region"
    | "region-only";
  readonly publicSourceUrl: string;
};

export type PairSourceTier =
  | "operator-validated"
  | "public-disclosed"
  | "geometric-derived";

export type GroundStationPair = {
  readonly stationA: GroundStationDescriptor;
  readonly stationB: GroundStationDescriptor;
  readonly sourceTier: PairSourceTier;
  readonly scenarioWindow: {
    readonly startUtc: string;
    readonly endUtc: string;
  };
};
```

The selector produces this value on Apply. The route translates it into URL search parameters and the runtime re-resolves the value at route entry.

### URL contract

```
/?scenePreset=regional&groundStationSceneActive=1&siteA=<stationId>&siteB=<stationId>
```

`siteA` and `siteB` resolve to entries in the public registry. The route does not accept lat/lon directly in the URL; only registry-id references, so the registry is the single source for coordinates.

## Layer 2 — Output contract

Given a `GroundStationPair`, the runtime produces a `DemoProjection` that the existing V4 demo controllers consume. The shape is constrained to match what the current fixture-driven path produces, so the only difference is the compute path, not the downstream surface.

```ts
export type VisibilityWindow = {
  readonly satelliteId: string;
  readonly startUtc: string;
  readonly endUtc: string;
  readonly maxElevationDeg: number;
};

export type PairVisibilityWindow = {
  readonly satelliteId: string;
  readonly orbitClass: SupportedOrbitClass;
  readonly stationAWindow: VisibilityWindow;
  readonly stationBWindow: VisibilityWindow;
  readonly intersectionStartUtc: string;
  readonly intersectionEndUtc: string;
};

export type HandoverEvent = {
  readonly handoverAtUtc: string;
  readonly fromSatelliteId: string | null;
  readonly toSatelliteId: string;
  readonly reasonKind:
    | "current-link-unavailable"
    | "better-candidate-available"
    | "policy-tie-break";
};

export type CommunicationStats = {
  readonly totalCommunicatingMs: number;
  readonly byOrbit: Record<SupportedOrbitClass, number>;
  readonly handoverCount: number;
  readonly meanLinkDwellMs: number;
};

export type TruthBoundary = {
  readonly precisionLabel:
    | "operator-validated-precision"
    | "operator-family-precision"
    | "modeled-precision";
  readonly sourceTier: PairSourceTier;
  readonly nonClaims: ReadonlyArray<string>;
};

export type DemoProjection = {
  readonly pair: GroundStationPair;
  readonly visibleConstellations: {
    readonly LEO: ReadonlyArray<{ readonly satelliteId: string; readonly tleSource: string }>;
    readonly MEO: ReadonlyArray<{ readonly satelliteId: string; readonly tleSource: string }>;
    readonly GEO: ReadonlyArray<{ readonly satelliteId: string; readonly tleSource: string }>;
  };
  readonly visibilityWindows: ReadonlyArray<PairVisibilityWindow>;
  readonly handoverEvents: ReadonlyArray<HandoverEvent>;
  readonly communicationStats: CommunicationStats;
  readonly truthBoundary: TruthBoundary;
};
```

### Compute layer

The runtime resolves the projection in one of two paths, selected by `sourceTier`:

1. **`operator-validated`** — the route consumes the existing repo fixture under `public/fixtures/ground-station-projections/`. No new compute layer touches this path; the existing controllers continue to render exactly the same surface they render today. This preserves the current verified-complete test surface.

2. **`public-disclosed` / `geometric-derived`** — the route invokes a new compute module:

   - `src/features/multi-station-selector/runtime-projection.ts` (new)
   - Pulls TLE data from `public/fixtures/satellites/` (existing).
   - Computes per-station per-satellite visibility windows via `satellite.js` (already a project dependency).
   - Intersects the two stations' windows per satellite to derive `PairVisibilityWindow`.
   - Filters by `supportedOrbits` ∩ orbit class of each candidate satellite.
   - Feeds the existing handover-decision rule engine (`src/features/handover-decision/handover-decision.ts`) to derive `handoverEvents`.
   - Aggregates `communicationStats` from the intersection windows.
   - Stamps `truthBoundary` with the pair's `sourceTier` and tier-appropriate non-claim strings.

The two paths converge on the same `DemoProjection` shape; the V4 demo route does not branch on the source path.

## Layer 3 — Source-tier authority labels

The non-claim labels are explicit:

| Tier | UI badge text | Required non-claim strings |
| --- | --- | --- |
| `operator-validated` | "Authority-validated pair" | (none beyond the existing demo's non-claims) |
| `public-disclosed` | "Public-disclosure pair · operator-stated capability" | "Pair shown from public operator disclosure. Commercial routing not validated by this surface." |
| `geometric-derived` | "Geometric pair · visibility-derived only" | "Pair derivable from public station coordinates and satellite ephemerides only. No operator or contractual attestation." |

The badge and non-claims render in the demo route's top strip (see existing `m8a-v411-top-strip` infrastructure) and in any export bundle's `truthBoundary` field.

## Boundary with the existing demo route

- The current demo route remains the consumer surface; this contract does not change what the demo *displays*, only what *upstream* of that demo computes the inputs.
- The route still reads `scenePreset=regional&groundStationSceneActive=1` as today.
- `siteA` / `siteB` are new optional URL params. When absent, the route falls back to the existing default operator-validated pair (no behavior change for unspecified entry).
- Existing tier-1 fixture-driven assertions (phase6.x, m8a-v4.3 / .11 / .12, phase7.1 multi-orbit scale, scenario surfaces) continue to consume the fixture; the runtime path is invoked only for `siteA` / `siteB` URL values not matching the operator-validated pair id.

## Resolved decisions (2026-05-16)

1. **URL parameter names** — `stationA` and `stationB`. The internal type `M8aV4EndpointId` continues to use "endpoint" terminology to match existing fixture naming, but the public URL surface uses the clearer "station" word.

2. **Default scenario window** — wall-clock UTC, anchored at the live replay clock start. For `bootstrap-regional-real-time` entry, the window is `[now, now + 20 min]`. For `bootstrap-regional-prerecorded` entry, the window is the fixed historical span the prerecorded scenario already defines. The replay multiplier (1x, 4x, 30x, 60x, 120x) is a separate playback control and does not change which wall-clock UTC range the runtime computes against.

3. **Handover rule engine** — selected pairs at every source tier feed through the existing handover-decision engine (`src/features/handover-decision/handover-decision.ts`) with the existing default `bootstrap-balanced-v1` policy (latency + jitter + network-speed weighted, as required by the prep-layer requirement that handover switches use latency/jitter/network-speed). The policy selector remains available so the user can switch policies inside the demo. Source-tier and handover policy are orthogonal axes: the source-tier badge labels how the *pair* was attested; the policy selector labels how the *rule engine* decides switches.

4. **Visible-globe markers** — render every station in the registry as a Cesium entity by default. A toggle control (default: on) lets the user hide them. When hidden, the demo entry CTA remains as today.

## External-spec inputs taken into account

The handover compute path treats the following constraints as inherited from the prep-layer spec:

- Switching metrics: latency, jitter, network-speed (per the kickoff and prep documents).
- Switching across LEO / MEO / GEO orbit classes.
- Service-layer switching, not RF-native handover.
- No canonical numerical thresholds inherited; thresholds remain repo-owned, expressed inside the existing `bootstrap-balanced-v1` and adjacent policies.
- At least two switchable policies (existing `bootstrap-balanced-v1` plus the existing latency/jitter/speed-prioritized variants already verified under F-10 / F-12).

No new claim of authority for the modeled stations is introduced; the truth-boundary block makes the source-tier explicit.
