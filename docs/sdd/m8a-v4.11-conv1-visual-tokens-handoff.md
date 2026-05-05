# M8A-V4.11 Conv 1 — Visual Tokens + Scene-Context Chip + Ground-Station Short Chip Handoff

Date: 2026-05-03
Status: implementation complete, Conv 1 closeout
Origin: planning/control approval of M8A-V4.11 Storyboard Rewrite Proposal v2 + Addendum 1
Conv 0 spike: PASS (`spike/m8a-v4.11-visual-tokens/spike-report.md`)

## Conv 1 scope (window-narrowed; per Conv 1 brief)

This conversation implemented exactly the Conv 1 surface; no Conv 2/3/4 work
leaked in. Specifically:

- 5 visual tokens (W1 rising arc / W2 fading arc / W3 800 km breathing
  disk / W4 candidate pulse / W5 steady ring), wired to V4.6D
  `simulationHandoverModel.window.windowId` so each token is shown only in
  its assigned window
- Scene-context chip (top-center, 14 px, ≤380×28, copy
  `13 顆衛星模擬展示 · 完整 ≥500 LEO 多軌道驗證見後續階段`)
- Ground-station short chip per Addendum 1.5 (≤96×18, 11 px, with
  `LEO MEO GEO ✓` content). Replaces the previous two-line precision +
  triplet pair on each ground station. Per-orbit-class sources triggers
  preserved so V4.11 Slice 5 click flow remains untouched.
- Demoted-actor 30 % opacity (`emphasis === "context"` actors get
  `opacity: 0.3`)

Items explicitly **not** touched (locked for Conv 2 / 3 / 4):

- Hover popover content (Conv 2)
- Inspector role structure / open-close behavior (Conv 2)
- Countdown numbers (Conv 2)
- Footer chip system / Truth removal / sequence-rail / state strip (Conv 3)
- Slice 5 Sources affordance (Conv 4)
- Slice 0 reviewer-protocol (Conv 4)
- V4.8 / V4.9 / V4.10 smoke surfaces (Conv 4 / never)

## Changed and added files

```
A  src/runtime/m8a-v411-visual-tokens.ts                           (new)
A  src/runtime/m8a-v411-scene-context-chip.ts                       (new)
A  src/styles/m8a-v411-visual-tokens.css                            (new)
A  tests/smoke/verify-m8a-v4.11-conv1-visual-tokens-runtime.mjs     (new)
A  docs/sdd/m8a-v4.11-conv1-visual-tokens-handoff.md                (this doc)
M  src/runtime/m8a-v411-glance-rank-surface.ts                      (ground-station short chip + demoted opacity)
M  src/styles/m8a-v411-glance-rank.css                              (short chip styling, removed precision/triplet rules)
M  src/runtime/m8a-v4-ground-station-handover-scene-controller.ts   (visual-token controller install + scene-context chip wiring + dataset seams)
M  src/styles.css                                                   (@import the new visual-tokens stylesheet)
M  tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs (Smoke Softening: ground-station chip shape only)
```

## Screenshots (1440×900)

All in `output/m8a-v4.11-conv1/`:

- `v4.11-conv1-default-1440x900.png` — default load (W1 active by ratio
  midpoint, scene-context chip + 2 ground-station short chips visible)
- `v4.11-conv1-w1-1440x900.png` — W1 rising arc segments (8 polylines, stepped alpha)
- `v4.11-conv1-w2-1440x900.png` — W2 past 6 + future 6 dashed polylines, amber→red gradient
- `v4.11-conv1-w3-1440x900.png` — W3 breathing disk centered on focus MEO sub-satellite point, locked at 800 km
- `v4.11-conv1-w4-1440x900.png` — W4 candidate pulse rings (3 phase-shifted billboards)
- `v4.11-conv1-w5-1440x900.png` — W5 steady gold ring on GEO

Manifest: `output/m8a-v4.11-conv1/capture-manifest.json` lists each
capture's `visibleTokenEntityIds` so cross-window leak is verifiable.

## W3 800 km lock

- Locked. `M8A_V411_W3_DISK_RADIUS_METERS = 800_000` in
  `src/runtime/m8a-v411-visual-tokens.ts` (Addendum 1.3 prediction
  matched — 1500 km dominates the camera view at 9 000 km altitude;
  800 km reads cleanly).
- Conv 1 smoke asserts `entity.ellipse.semiMajorAxis === 800_000` and
  `rootDataset.m8aV411VisualTokenW3RadiusMeters === "800000"`.

## Depth-test policy adopted

- Spike F-1 flagged that `disableDepthTestDistance: Number.POSITIVE_INFINITY`
  causes bleed-through when the camera is on the antipodal side.
- Addendum 1.3 / planning/control Decision 1 mandated W4 / W5 to use
  `DistanceDisplayCondition` to gate against bleed-through.
- **Conv 1 adopted option (b)**: each token entity has a
  `DistanceDisplayCondition`:
  - W1 / W2 / W3: `[0, 60_000_000 m]` (W3 ellipse hugs the surface so a
    moderate camera-distance gate is sufficient)
  - W4 candidate pulse: `[0, 35_000_000 m]` (LEO altitude band; gate is
    tight to suppress antipodal bleed-through)
  - W5 steady ring: `[0, 90_000_000 m]` (GEO sits at 35 786 km; gate
    accommodates the GEO distance)
- Conv 1 smoke asserts every W4 / W5 entity carries a
  `distanceDisplayCondition` (`hasDistanceCondition === true`).

## V4.6D wiring confirmation (no contract change)

- The visual-token controller subscribes via `renderProductUx` arguments
  only; it consumes
  `state.simulationHandoverModel.window.windowId` and the focus actor's
  `state.actors[i].renderPositionEcefMeters`. No new V4.6D field.
- Window → token mapping:

  | Window id | Token | Focus actor (V4.6D `displayRepresentativeActorId`) |
  | --- | --- | --- |
  | `leo-acquisition-context` | W1 | `oneweb-0386-leo-display-context` |
  | `leo-aging-pressure` | W2 | `oneweb-0537-leo-display-context` |
  | `meo-continuity-hold` | W3 | `o3b-mpower-f6-meo-display-context` |
  | `leo-reentry-candidate` | W4 | `oneweb-0702-leo-display-context` |
  | `geo-continuity-guard` | W5 | `st-2-geo-continuity-anchor` |

- W1 / W2 ground tracks are deterministic visual approximations
  (eastward bearing + LEO ground-track angular speed), anchored on the
  current ECEF→cartographic projection of the focus LEO. This is a
  **viewer-owned display projection** and does not claim to be a TLE
  ground-track readout. Same `renderTrackIsSourceTruth: false` boundary
  as existing V4.6B actor projection.

## §Smoke Softening Disclosure (Lock-in J)

Per Conv 1 brief and Lock-in J disclosure rule, exactly **one** existing
smoke surface was softened by Conv 1: the V4.11 Slice 1 negative smoke's
ground-station chip shape assertion.

| Smoke | Old assertion | New assertion (Conv 1) | Justification |
| --- | --- | --- | --- |
| `tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs` | `station.precision.visible && station.precision.text === "operator-family precision" && station.triplet.visible && station.triplet.text === "LEO ✓ · MEO ✓ · GEO ✓" && station.tripletCopy === "LEO ✓ · MEO ✓ · GEO ✓" && station.strengthTokens.length === 3` | `station.shortChip.isShortChip === true && station.shortChip.copy === "LEO MEO GEO ✓" && station.rect.width <= 96.5 && station.rect.height <= 18.5 && station.shortChip.fontSizePx ≈ 11 && station.strengthTokens.length === 3 && every token has data-m8a-v411-sources-trigger="ground-orbit-evidence" with orbit class leo/meo/geo` | Addendum 1.5 replaces the two-line precision+triplet label with a single ≤96×18 short chip per ground station. The Slice 5 sources flow is preserved by keeping per-orbit-class triggers inside the short chip. |

**Not softened (still asserted hard in Slice 1 smoke):**

- per-station `station.visible === true` (still required)
- 13 actor-orbit chips visible (still required, unchanged)
- corner provenance badge visible (still required, unchanged)
- `forbiddenClaimScan` (still required, unchanged — covers the new
  short chip text and dataset values)
- `urlPath`, V4.6D model id, endpoint pair, precision, actor counts,
  timeline window order, R2 read-only invariant (all unchanged)
- Details / Truth default-closed (unchanged)

No other smoke was modified. V4.11 Slice 2 / 3 / 4 / 5 and V4.8 / V4.9 /
V4.10 invariant smokes were rerun unchanged and remain green (full list
below).

## Smoke regression results

| Smoke | Result | Notes |
| --- | --- | --- |
| `verify-m8a-v4.11-conv1-visual-tokens-runtime.mjs` (new) | ✅ | 1 default + 5 per-window captures |
| `verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs` | ✅ | Conv 1 Smoke Softening Disclosure applied |
| `verify-m8a-v4.11-slice2-hover-popover-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.11-slice3-inspector-concurrency-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.11-slice4-transition-toast-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.11-slice5-real-data-surfacing-runtime.mjs` | ✅ | unchanged; Sources LEO/MEO/GEO triggers still resolve from short chip |
| `verify-m8a-v4.10-slice1-first-viewport-composition-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.10-slice2-handover-sequence-rail-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.10-slice3-boundary-affordance-separation-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.10-slice4-inspector-evidence-redesign-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.10-slice5-validation-matrix-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.9-product-comprehension-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.8-handover-demonstration-ui-ia-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.6d-simulation-handover-model-runtime.mjs` | ✅ | unchanged (V4.6D contract intact) |

`verify-m8a-v4.7-handover-product-ux-runtime.mjs` was already failing on
`main` before any Conv 1 change (provenance badge covers details-close
target). This pre-existing failure was confirmed by stashing all Conv 1
changes and rerunning, then unstashing. **Not a Conv 1 regression.** Out of
the Conv 1 closeout scope per the brief (`V4.10 / V4.9 / V4.8 + Slice
1 / 2 / 3 / 4 / 5 invariant smoke 全綠`); should be picked up
independently.

## Conv 1 invariants explicitly confirmed

- ✅ Route unchanged: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- ✅ Endpoint pair unchanged: `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- ✅ Precision unchanged: `operator-family-only`
- ✅ Actor set unchanged: 6 LEO / 5 MEO / 2 GEO (13 total)
- ✅ V4.6D model contract unchanged (no new fields, no role rename, no
  positive-claim addition)
- ✅ R2 still read-only (no runtime selector authority)
- ✅ Corner provenance badge still visible (Conv 3 will replace, not
  Conv 1)
- ✅ Orbit-class chip on each of 13 actors still present (asserted in
  both Slice 1 smoke and Conv 1 smoke)
- ✅ No hover popover content changes (Conv 2)
- ✅ No inspector role changes (Conv 2)
- ✅ No countdown numbers (Conv 2)
- ✅ No footer / Truth / sequence-rail / state-strip changes (Conv 3)
- ✅ No Slice 5 Sources affordance changes (Conv 4)
- ✅ No measured-metric / latency / jitter / throughput text added
- ✅ No raw ITRI side-read added
- ✅ No `Cesium.Viewer` instantiation outside the existing controller

## Runtime seam summary

The Conv 1 surface adds the following stable runtime seams (used by
smoke and downstream conversations):

- `data-m8a-v411-visual-tokens="m8a-v4.11-visual-tokens-conv1-runtime.v1"`
- `data-m8a-v411-visual-token-active-id` ∈ `{ "W1", "W2", "W3", "W4", "W5", "none" }`
- `data-m8a-v411-visual-token-w3-radius-meters="800000"`
- `data-m8a-v411-visual-token-w{1..5}-max-distance-meters` (DistanceDisplayCondition seams)
- `data-m8a-v411-visual-token-data-source-name="m8a-v4.11-visual-tokens-conv1"`
- `data-m8a-v411-scene-context-chip="m8a-v4.11-scene-context-chip-conv1-runtime.v1"`
- `data-m8a-v411-scene-context-chip-copy="13 顆衛星模擬展示 · 完整 ≥500 LEO 多軌道驗證見後續階段"`
- `data-m8a-v411-ground-station-short-chip="true"` on each ground-station chip
- `data-m8a-v411-ground-short-chip-copy="LEO MEO GEO ✓"`
- `data-m8a-v411-ground-short-chip-max-width-px="96"`, `…-max-height-px="18"`, `…-font-size-px="11"`
- `data-m8a-v411-orbit-chip-demoted="true|false"` and `data-m8a-v411-orbit-chip-opacity` on each orbit-class chip
- `data-m8a-v411-demoted-actor-opacity="0.3"`

Visual-token entities are owned by a Cesium `CustomDataSource` named
`m8a-v4.11-visual-tokens-conv1`, accessible via
`viewer.dataSources.getByName("m8a-v4.11-visual-tokens-conv1")[0]`.
Smoke iterates these entities to assert exclusive show/hide per active
window.

## Spike-first rule (Lock-in K) compliance

- Conv 0 spike landed and reported PASS before Conv 1 touched any
  production file.
- Conv 1 ports the spike sandcastle patterns directly (per spike report
  §Per-token results) into `src/runtime/m8a-v411-visual-tokens.ts`. No
  reinvention. Per-token references:
  - W1 / W2 polyline pattern → `Polyline Per-segment Coloring` +
    `polyline-dash`
  - W3 callback breath → `callback-property` +
    `circles-and-ellipses` + `ColorMaterialProperty`
  - W4 / W5 ring billboards → `billboards` + canvas-generated radial-gradient sprite

## Production GPU validation gate (Lock-in L) — explicit non-claim

This handoff makes **no fps claim** for production. The Conv 1 smoke
captures geometry and entity-show invariants on the same SwiftShader
software-rendering harness used by the spike. Conv 4 closeout will
re-evaluate frame-budget on a real GPU instance per Lock-in L; that is
out of Conv 1 scope by explicit instruction.

## Reproduction

```sh
cd /home/u24/papers/scenario-globe-viewer
npm run build
node tests/smoke/verify-m8a-v4.11-conv1-visual-tokens-runtime.mjs
ls output/m8a-v4.11-conv1/
```

## Returning to planning/control

Conv 1 closeout returns the following invariants to the planning/control
total reconciliation:

- 5 visual tokens implemented and exclusively gated by V4.6D window id
- W3 disk radius locked at 800 km
- DistanceDisplayCondition policy adopted on W4 / W5 (and on W1 / W2 / W3
  defensively) per planning/control Decision 1
- Scene-context chip live (Addendum 1.4 spec, point-of-load visible)
- Ground-station short chip live (Addendum 1.5 spec, ≤96×18, per-orbit
  sources triggers preserved)
- Demoted-actor 30 % opacity logic live
- Slice 1 smoke softened on exactly the ground-station chip shape
  assertion; all other Slice 1 invariants and all V4.x / V4.11-Slice
  invariants remain hard-asserted and green
- No Conv 2 / 3 / 4 scope leak
- No V4.6D contract / route / pair / precision / actor-set / R2 change
