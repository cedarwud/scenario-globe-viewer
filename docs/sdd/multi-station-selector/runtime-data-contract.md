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
/?scenePreset=regional&m8aV4GroundStationScene=1&stationA=<stationId>&stationB=<stationId>
```

`stationA` and `stationB` resolve to entries in the public registry. The route does not accept lat/lon directly in the URL; only registry-id references, so the registry is the single source for coordinates.

The short form is also valid:

```
/?stationA=<stationId>&stationB=<stationId>
```

When both station ids are present, bootstrap treats the route as a V4 ground-station runtime entry and auto-applies the regional scene preset. The side panel also accepts `startUtc=<ISO timestamp>` and `durationMinutes=<20..480>` to pin a reproducible projection window. `siteA`, `siteB`, and `groundStationSceneActive` were early draft names; they are not the current runtime URL contract.

## Layer 2 — Output contract

Given a `GroundStationPair`, the selected-pair runtime produces a `DemoProjection`
for the V4 side panel, CSV export, and truth-boundary labels. The main globe can
render selected-pair endpoint markers, endpoint ribbon, camera framing,
selected-pair visible-satellite overlay points, and a runtime link cue. Its
fixture actor/timeline surface remains in place until the controller gets a full
pair-projection adapter for replacing the original actor model.

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
    | "policy-tie-break"
    | "cross-orbit-migration";
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
  readonly timeWindow: {
    readonly startUtc: string;
    readonly endUtc: string;
  };
  readonly sharedSupportedOrbits: ReadonlyArray<SupportedOrbitClass>;
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

2. **`public-disclosed` / `geometric-derived`** — the route invokes the runtime projection module:

   - `src/features/multi-station-selector/runtime-projection.ts`
   - Pulls TLE data from `public/fixtures/satellites/` (existing).
   - Computes per-station per-satellite visibility windows via `satellite.js` (already a project dependency).
   - Intersects the two stations' windows per satellite to derive `PairVisibilityWindow`.
   - Filters candidates to orbit classes disclosed by both selected stations.
   - Caps selected-pair interactive compute at 60 TLE records per orbit class.
   - Feeds the existing link-budget handover policy module to derive `handoverEvents`.
   - Aggregates `communicationStats` from the intersection windows; `handoverCount` excludes the first initial acquisition event.
   - Stamps `truthBoundary` with the pair's `sourceTier` and tier-appropriate non-claim strings.
   - Builds a bounded scene overlay from selected link events plus the longest mutual visibility windows. This overlay carries selected satellite ids/orbits and TLE-sampled positions for CSV/debug evidence; the globe cue renders those selected satellites in demo display lanes so the selected pair stays readable.

The public-disclosed / geometric-derived runtime projection currently feeds the V4 route's side panel, CSV export, and `truthBoundary` labeling. The selected public registry pair also drives main-globe endpoint markers, the endpoint context ribbon, camera framing, TLE-derived display-lane satellite cues, and runtime link cue. The tier-1 fixture-driven actor/timeline surface remains the existing V4 controller surface; this contract does not claim that public registry pairs have replaced the V4 controller satellite actor/timeline main scene.

## Layer 3 — Source-tier authority labels

The non-claim labels are explicit:

| Tier | UI badge text | Required non-claim strings |
| --- | --- | --- |
| `operator-validated` | "Authority-validated pair" | (none beyond the existing demo's non-claims) |
| `public-disclosed` | "Public-disclosure pair · operator-stated capability" | "Pair shown from public operator disclosure. Commercial routing not validated by this surface." |
| `geometric-derived` | "Geometric pair · visibility-derived only" | "Pair derivable from public station coordinates and satellite ephemerides only. No operator or contractual attestation." |

The badge and non-claims render in the runtime projection side panel and in any export bundle's `truthBoundary` field.

## Boundary with the existing demo route

- The current demo route remains the consumer surface. Public-disclosed and geometric-derived pairs are exposed through the runtime projection side panel, CSV export, and `truthBoundary` labels.
- The route reads `m8aV4GroundStationScene=1` as the explicit V4 activation flag. The short URL `/?stationA=<id>&stationB=<id>` also activates the V4 ground-station runtime and auto-applies `scenePreset=regional`.
- `stationA` / `stationB` are optional URL params. When absent, the route falls back to the existing default operator-validated pair (no behavior change for unspecified entry).
- Existing tier-1 fixture-driven assertions (phase6.x, m8a-v4.3 / .11 / .12, phase7.1 multi-orbit scale, scenario surfaces) continue to consume the fixture. Public registry pairs do not replace the V4 controller actor/timeline main scene.
- The side panel renders a display-boundary note for this split: panel/CSV follow the selected-pair modeled projection, while main-globe selected-pair cues are TLE-derived demo display lanes; the main globe is not selected-pair measured service telemetry.
Convergence forward reference: `docs/sdd/multi-station-selector/tle-first-3d-pipeline.md` (proposed 2026-05-18) defines the target scene view-model that will eventually let both the fixed demo entry and the selected-pair entry share one TLE-first 3D presentation. Until that convergence ships, the selected-pair globe cues remain the model-render path described above, and the fixed demo entry remains fixture-driven.

## Resolved decisions (2026-05-16)

1. **URL parameter names** — `stationA` and `stationB`. The internal type `M8aV4EndpointId` continues to use "endpoint" terminology to match existing fixture naming, but the public URL surface uses the clearer "station" word.

2. **Default scenario window** — selected-pair side panel projection defaults to wall-clock UTC `[now, now + 360 min]`. A route may pin the window with `startUtc` and `durationMinutes`; duration is clamped to 20-480 minutes. The replay multiplier (`30x`, `60x`, `120x` in the visible V4 HUD) is a separate playback control and does not change which UTC range the runtime computes against.

3. **Handover rule engine** — selected pairs feed through the link-budget handover policy module with the `cross-orbit-live` policy. The policy considers elevation, predicted visibility, latency, jitter, and network-speed-derived metrics. Source-tier and handover policy are orthogonal axes: the source-tier badge labels how the *pair* was attested; the policy labels how the *rule engine* decides switches. The visible side panel does not expose a policy selector.

4. **Visible-globe markers** — render every station in the registry as a Cesium entity by default. A toggle control (default: on) lets the user hide them. When hidden, the demo entry CTA remains as today.

5. **Keyboard station-list fallback** — globe marker picking is the primary visual selection path. A native select-based station picker remains available as the accessibility fallback, and it writes through the same selection store and `stationA` / `stationB` URL contract.

## External-spec inputs taken into account

The handover compute path treats the following constraints as inherited from the prep-layer spec:

- Switching metrics: latency, jitter, network-speed (per the kickoff and prep documents).
- Switching across LEO / MEO / GEO orbit classes.
- Service-layer switching, not RF-native handover.
- No canonical numerical thresholds inherited; thresholds remain repo-owned, expressed inside the `cross-orbit-live` config used by the V4 selected-pair projection.
- Additional policy variants remain implemented in module-level code, but the V4 selected-pair demo surface intentionally uses `cross-orbit-live` only.

No new claim of authority for the modeled stations is introduced; the truth-boundary block makes the source-tier explicit.

## 2026-05-17 addendum — single-route mount unification

The original boundary description treated the homepage clean route and the V4
selected-pair route as two separate consumers. The 2026-05-17 IA convergence
collapses them into a single mount lifecycle. The data contract itself is
unchanged; only the mount and visibility rules move. The companion document
`docs/sdd/multi-station-selector/information-architecture.md` carries the
visible-state machine and surface registry; this addendum records the data
contract implications.

### A.1 Mount lifecycle (replaces "two routes" framing)

- The bootstrap composition mounts the ground-station marker layer, the
  marker filter panel, the selection chips, the station list picker, the
  station info card, and the marker hover tooltip on every entry, regardless
  of whether `stationA` and `stationB` resolve to a registry-valid pair.
- The V4 projection side panel and the V4 ground-station controller surfaces
  mount on top of that base iff the selection store resolves a registry-valid
  pair. Their dispose is symmetric: when the pair is cleared (either slot
  becomes empty), the V4 panel and the V4 controller endpoint surfaces
  dispose; the marker layer + selection chips + filter panel remain mounted.
- The route URL no longer differentiates between "demo" and "selected-pair"
  modes. The same `/` lifecycle covers both. The long-form URL
  (`m8aV4GroundStationScene=1`) is treated identically to the short form by
  the bootstrap; it remains accepted only for back-compat with existing
  links.

### A.2 Selection store as the single state authority

The existing `selection-store.ts` already replaces the URL via
`history.replaceState` on every commit. After mount unification:

- Selection commits drive the V4 panel mount / unmount decision in
  composition. A pair completing (both slots non-null and registry-valid)
  mounts the V4 panel; clearing or invalidating a slot unmounts it.
- The Apply CTA on the selection chips continues to live in place but its
  semantic narrows: with mount unification the panel mounts automatically
  on pair completion, so Apply becomes a no-op when the panel is already
  mounted. Wave 1 keeps the Apply button visible as a no-op fallback that
  reloads the URL only when no panel is mounted (defensive). Wave 2 may
  hide Apply entirely once the in-place flow is verified.
- `popstate` (history back / forward, copy-paste URL) continues to route
  through the selection store; the panel re-mounts or unmounts based on the
  resulting snapshot.

### A.3 Compute path is unchanged

- The runtime projection module
  (`features/multi-station-selector/runtime-projection.ts`) and its worker
  client are unchanged. Each pair commit triggers a fresh `compute`
  invocation; the worker client cancels stale requests through its
  `computeRequestSeq` mechanism.
- The CSV export module is unchanged.
- The selected-pair scene adapter is unchanged; it continues to produce a
  bounded overlay of up to 6 satellites with sampled positions.
- The V4 controller's endpoint context (`buildSceneEndpointContext`) reads
  the selection from the URL at startup. Wave 1 leaves that startup-only
  behaviour; wave 2 extends the controller to subscribe to selection-store
  changes so reselection re-anchors endpoints without reload. The data
  contract does not change in either case.

### A.4 Source-tier authority semantics retained

The three-tier authority remains:

- `operator-validated` — the existing CHT + Speedcast retained-fixture path
  is preserved exactly; mount unification does not introduce a competing
  flow into that path.
- `public-disclosed` / `geometric-derived` — selected-pair runtime projection
  produces these. The IA carries the badge into Tier-1 of the V4 panel
  header (operator-validated does not flow through the IA's panel-driven
  surfaces because it is consumed by the legacy controller path only).

### A.5 Boundary note

The selected-pair main-globe satellite cue continues to be a TLE-derived
display lane, not measured service telemetry. The fixture-driven V4
controller actor/timeline main scene remains the existing surface; mount
unification does not replace it with the selected-pair projection's full
constellation. Both render simultaneously in `projecting` / `replaying`
states. The Row 6 panel footer carries the precision / source-tier caveat
so that boundary remains explicit in the smaller IA.

### A.6 Composition subscription contract (codex-challenge fix)

Mount and dispose decisions for selection-driven surfaces are made by a
single `display-state` helper that composition wires up at bootstrap:

```ts
// features/multi-station-selector/display-state.ts (new in wave 1)
export type DisplayState =
  | "idle"
  | "selecting"
  | "projecting"
  | "replaying"
  | "invalid";

export interface DisplayStateInputs {
  readonly selection: SelectionSnapshot;
  readonly registryResolves: (id: string) => boolean;
  readonly infoCardOpen: boolean;
  readonly replayClockIsPlaying: boolean;
}

export function resolveDisplayState(inputs: DisplayStateInputs): DisplayState;

export function subscribeDisplayState(
  store: SelectionStore,
  replayClock: ReplayClock,
  infoCardOpenSignal: { subscribe(fn: (open: boolean) => void): () => void },
  onChange: (state: DisplayState) => void
): () => void;
```

Composition does:

```ts
const dispose: Array<() => void> = [];
let v4Panel: V4ProjectionSidePanelHandle | null = null;
let v4Endpoints: V4EndpointSurfacesHandle | null = null;

const unsubscribe = subscribeDisplayState(
  groundStationSelectionStore,
  replayClock,
  groundStationInfoCard.openSignal,
  (state) => {
    const isPanelState = state === "projecting" || state === "replaying";
    if (isPanelState && !v4Panel) {
      const pair = resolveV4RouteSelection(currentSearchParams()).resolvedPair;
      if (pair) v4Panel = mountV4ProjectionSidePanel(viewerContainer, { resolvedPair: pair });
    }
    if (!isPanelState && v4Panel) {
      v4Panel.dispose();
      v4Panel = null;
    }
    // wave 2 extends with v4Endpoints mount/dispose
    document.body.dataset.displayState = state;
  }
);

dispose.push(unsubscribe);
```

The `infoCardOpenSignal` is the new minimal extension to the existing
`mountGroundStationInfoCard` API: it returns an `openSignal` (a tiny
subscribe primitive) so the display-state helper can react to info-card
open/close transitions without depending on DOM presence.

In wave 1 only `subscribeDisplayState` and the V4 panel mount/dispose
edge are wired; the V4 controller endpoint surfaces continue to mount
once at bootstrap from the URL. Wave 2 extends the seam to V4 controller
endpoint surfaces (re-anchoring endpoint markers + camera framing on
pair change without page reload).

### A.7 Wave-1 reload semantic

Per IA §11.1–§11.2, the chips' Apply CTA in wave 1 acts only when the
URL on landing did not carry a valid pair AND the user has now filled
both slots from the picker / markers / list. After the single-route
correction, Apply never adds the legacy explicit V4 flag; its fallback
link uses the canonical short selected-pair URL
`/?stationA=<id>&stationB=<id>`. When the URL already carried a valid
pair, or the panel has already auto-mounted from pair completion, Apply is
hidden by the selection chips renderer; the panel is already there, and
changing either slot through the chips, picker, or markers updates the URL
via `selection-store.writeUrl` (already `history.replaceState`-based) and
triggers a panel recompute via the §A.6 subscription.

There is no other Apply semantic. There is no full-reload during a
session that already has a mounted V4 panel — preserving G3 60×
continuity.

## 2026-05-18 addendum — data-completeness payload

The selected-pair runtime now exposes a second machine-readable contract on
top of `DemoProjection`: `RuntimeDataCompletenessState`, exported from
`src/features/multi-station-selector/runtime-data-completeness.ts` and carried
on `RuntimeProjectionResult.dataCompleteness`.

The payload records:

- route source mode (`tle-first-runtime` for selected-pair runtime);
- per-orbit TLE source manifest, cap, source timestamp, epoch range, accepted
  and rejected counts, and source-health state;
- per-station disclosure precision and whether the rendered coordinate is
  source truth or a representative coordinate;
- actor source coverage with `fakeActorCount === 0`;
- modeled output metadata for handover, link budget, throughput, jitter,
  latency, and rain impact;
- display-only transform provenance;
- empty reason codes for unsupported or no-window cases.

The V4 side panel and CSV export surface the same payload without changing the
route shape:

- Row 6 carries `[data-station-precision-disclosure="true"]`.
- `[data-tle-telemetry-chip="true"]` is patched with source-count,
  accepted/rejected-count, timestamp, and health dataset fields after selected
  projection render.
- CSV export includes `# TLE source manifest`, `# Station precision`,
  `# Modeled outputs`, and `# Data completeness` sections.

The fixed demo entry remains `fixture-fallback`; it does not receive a hidden
selected-pair data retrofit.
