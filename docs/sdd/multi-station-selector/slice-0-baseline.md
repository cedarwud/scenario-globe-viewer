# Multi-Station Selector — Slice 0 Baseline

This document is the Slice 0 deliverable named by
`docs/sdd/multi-station-selector/tle-first-3d-pipeline.md` section 8,
Slice 0. No runtime change is made here; this records current behaviour before
the TLE-first convergence work begins.

Post-TH1 addendum (2026-05-21): any `public-disclosure pair` or
`public-disclosed` labels below are historical pre-TH1 capture observations.
Current source-tier logic requires explicit pair attestation; unattested
same-family pairs resolve as `geometric-derived` with a same-family inference
non-claim.

## 1. Capture metadata

- Capture date: 2026-05-18
- Commit at capture: 2033712 (most recent main HEAD at capture time)
- Browser: Chromium 1217 headless via
  `--use-angle=swiftshader --enable-unsafe-swiftshader`
- Viewport: 1440x900
- Host: WSL2
- Dev server: http://127.0.0.1:5173

## 2. Fixed demo entry baseline

Screenshot:

- `/tmp/sgv_fixed_demo_baseline.png`

Route:

- URL: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- Equivalent entry: homepage CTA that navigates to the same fixed demo route.
- `body[data-display-state]` is `idle` because no `stationA` or `stationB`
  query parameters are present.
- The V4 projection side panel does not mount. It remains a
  selected-pair-only surface.
- The V4 ground-station controller mounts the fixture-driven scene.
- The mounted scene shows curated actor and timeline state.
- The mounted scene shows operator-family display anchors.
- The mounted scene shows polished link-flow pulses.
- The mounted scene shows label-density choreography.
- The mounted scene keeps stable camera framing.

Source-tier classification against the parent SDD truth-class table:

- Actors and timeline: `fixture-fallback`.
- Endpoint anchors: `public-registry-derived`.
- Camera framing, label density, and visual spacing: `display-only`.
- Throughput, rain, and handover state when shown: `modeled`.

Observed 3D state:

- The LEO actor chip reports `600`.
- Multiple model satellites are visible above the horizon.
- LEO, MEO, and GEO labels are visible in the curated grammar.
- Uplink and downlink ribbons are visible near the selected operating region.
- The globe is framed as a polished product demo rather than a raw pair
  projection.
- The side-panel absence is expected for this fixed route.

This is the visual baseline the new pipeline must match or explicitly relabel.

## 3. Selected-pair walkthrough baselines

All five walkthrough captures use:

- `startUtc=2026-05-17T00:00:00.000Z`
- `durationMinutes=360`
- Viewport `1440x900`
- LEO actor count chip `600`
- Replay preset `60x`
- `body[data-display-state]="replaying"`
- V4 panel `data-state="ready"`

### 3.1 Walkthrough 1 — Svalbard / Tromso

Screenshot:

- `/tmp/sgv_slice0_demo1.png`

URL:

```text
/?stationA=ksat-svalsat-svalbard&stationB=ksat-tromso&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360
```

Observed state:

- `body[data-display-state]="replaying"`
- Panel `data-state="ready"`
- Pair title: Svalbard Satellite Station (SvalSat) to Tromso Satellite
  Station (TSS).
- Tier badge: public-disclosure pair, operator-stated capability.
- Source footer: operator-family precision and public-disclosed source class.
- Comm time: `360m`.
- Handovers: `1`.
- LEO actor count: `600`.

Panel Row 4:

- Visibility list is populated.
- Count line reads `26 mutual windows · showing next 3`.
- The first three preview rows are visible.
- Link-selection list is populated.
- Count line reads `2 events · showing next 2`.
- The first event is initial acquisition.
- The second event is a current-link-unavailable transition.
- No cross-orbit migration event is visible in the capture.
- The V-MO1 pin is represented by the link-selection event area.

Observed 3D characteristics:

- Several model satellites are visible, with a compact MEO cluster above the
  Arctic-facing endpoint pair.
- A vertical active-link line rises from the paired stations toward the visible
  actor group.
- Endpoint markers are visible and close enough to require label choreography.
- The camera frames northern Europe and the Arctic edge with usable context.
- Label overlap is present but controlled enough for the selected-pair demo.
- This is the compatible Arctic pair baseline.

Expected count from the shipped walkthrough audit:

- `26` mutual windows.

### 3.2 Walkthrough 2 — Svalbard / Trollsat

Screenshot:

- `/tmp/sgv_slice0_demo2.png`

URL:

```text
/?stationA=ksat-svalsat-svalbard&stationB=ksat-trollsat-antarctica&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360
```

Observed state:

- `body[data-display-state]="replaying"`
- Panel `data-state="ready"`
- Pair title: Svalbard Satellite Station (SvalSat) to Troll Satellite
  Station (TrollSat).
- Tier badge: public-disclosure pair, operator-stated capability.
- Source footer: operator-family precision and public-disclosed source class.
- Comm time: `0s`.
- Handovers: `0`.
- LEO actor count: `600`.

Panel Row 4:

- Visibility list renders the empty state.
- Count line reads `0 mutual windows`.
- Empty copy reads `No mutual visibility in this window.`
- Link-selection list renders the empty state.
- Count line reads `0 events`.
- Empty copy says no handover events were triggered by the cross-orbit-live
  policy in this window.
- No cross-orbit migration event is present.
- There is no fake active satellite in the panel or 3D scene.

Observed 3D characteristics:

- Endpoint context is present, but framing is the known weak point.
- The screenshot centers southern Africa while the pair is polar and
  antipodal in practice.
- Endpoint markers can appear separated from the expected polar mental model.
- The dashed pair guide crosses the globe, but there is no pair-geometry
  camera classifier yet.
- No active satellite actor is fabricated for the empty result.
- This is the canonical polar antipodal zero-window baseline.

Expected count from the shipped walkthrough audit:

- `0` mutual windows.

### 3.3 Walkthrough 3 — Intelsat Fuchsstadt / Intelsat Atlanta

Screenshot:

- `/tmp/sgv_slice0_demo3.png`

URL:

```text
/?stationA=intelsat-fuchsstadt&stationB=intelsat-atlanta&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360
```

Observed state:

- `body[data-display-state]="replaying"`
- Panel `data-state="ready"`
- Pair title: Intelsat Fuchsstadt Teleport to Intelsat Atlanta Teleport
  (Ellenwood).
- Tier badge: public-disclosure pair, operator-stated capability.
- Source footer: operator-family precision and public-disclosed source class.
- Comm time: `360m`.
- Handovers: `2`.
- LEO actor count: `600`.

Panel Row 4:

- Visibility list is populated.
- Count line reads `15 mutual windows · showing next 3`.
- The first three preview rows are visible.
- Link-selection list is populated.
- Count line reads `3 events · showing next 3`.
- The first event is initial acquisition.
- Two later events are current-link-unavailable transitions.
- No cross-orbit migration event is visible in the capture.
- The V-MO1 pin remains in the Row 4 link-selection area.

Observed 3D characteristics:

- Multiple model satellites are visible across a wider orbital band.
- Endpoint markers sit on opposite sides of a mid-latitude long path.
- Active-link lines connect the endpoints to the current actor.
- The dashed route arc is visible between the endpoints.
- Camera framing includes both endpoints and a useful portion of the actor
  field.
- The scene is readable but busier than the fixed demo grammar.
- This is the mid-latitude GEO operator-pair baseline.

Expected count from the shipped walkthrough audit:

- `15` mutual windows.

### 3.4 Walkthrough 4 — Singtel Bukit Timah / MEASAT Cyberjaya

Screenshot:

- `/tmp/sgv_slice0_demo4.png`

URL:

```text
/?stationA=singtel-bukit-timah&stationB=measat-cyberjaya&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360
```

Observed state:

- `body[data-display-state]="replaying"`
- Panel `data-state="ready"`
- Pair title: Singtel Bukit Timah Teleport to MEASAT Teleport & Broadcast
  Centre (Cyberjaya).
- Tier badge: geometric pair, visibility-derived only.
- Source footer: modeled precision and geometric-derived source class.
- Comm time: `360m`.
- Handovers: `0`.
- LEO actor count: `600`.

Panel Row 4:

- Visibility list is populated.
- Count line reads `42 mutual windows · showing next 3`.
- The first three preview rows are visible.
- Link-selection list is populated.
- Count line reads `1 event · showing next 1`.
- The one event is initial acquisition.
- No cross-orbit migration event is visible in the capture.
- The V-MO1 pin remains in the link-selection area but has no transition
  event to surface.

Observed 3D characteristics:

- A compact equatorial station pair is visible with overlapping labels.
- Several GEO model satellites appear in a line across the upper scene.
- A long active-link line reaches from the station pair to the current actor.
- The endpoint baseline is short, so station labels and badges crowd each
  other.
- Camera framing is useful for continuity but still needs a short-baseline
  display policy.
- This is the equatorial short-baseline baseline.

Expected count from the shipped walkthrough audit:

- `42` mutual windows.

### 3.5 Walkthrough 5 — Yangmingshan / Hartebeesthoek

Screenshot:

- `/tmp/sgv_slice0_demo5.png`

URL:

```text
/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360
```

Observed state:

- `body[data-display-state]="replaying"`
- Panel `data-state="ready"`
- Pair title: Chunghwa Telecom Yangmingshan Earth Station to SANSA Space
  Operations Hartebeesthoek.
- Tier badge: geometric pair, visibility-derived only.
- Source footer: modeled precision and geometric-derived source class.
- Comm time: `360m`.
- Handovers: `2`.
- LEO actor count: `600`.

Panel Row 4:

- Visibility list is populated.
- Count line reads `9 mutual windows · showing next 3`.
- The first three preview rows are visible.
- Link-selection list is populated.
- Count line reads `3 events · showing next 3`.
- The first event is initial acquisition.
- The second event is marked `better candidate available`.
- The third event is marked `current link unavailable`.
- No cross-orbit migration event is visible in the capture.
- The V-MO1 pin remains in the Row 4 link-selection area.

Observed 3D characteristics:

- Multiple model satellites are visible across a broad long-baseline frame.
- Endpoint markers are far apart and joined by a long active-link segment.
- The dashed route arc spans a large part of the lower scene.
- The camera keeps both endpoints visible, but the right endpoint shares space
  with several actor badges.
- The scene shows the strongest current long-baseline composition of the five
  walkthrough captures.
- This is the cross-hemisphere long-baseline baseline.

Expected count from the shipped walkthrough audit:

- `9` mutual windows.

## 4. Known failure modes carried forward

### Polar pair camera failure mode

Walkthrough 2, Svalbard / Trollsat, is the canonical example.

Today:

- The panel mounts with `0` mutual windows.
- The panel reaches `data-state="ready"`.
- The route retains both selected stations after bootstrap.
- The camera framing does not yet have a polar or antipodal classifier.
- Endpoints can collapse onto each other in the projection.
- Endpoints can also sit near opposite poles without a guided pull-back.
- The current screenshot shows the globe centered away from the intuitive
  pair frame.

This is exactly what the parent SDD section 6 rule 5 and section 9 A2 address
in Slice 2 and Slice 3.

### Zero-window behaviour

Same URL: Walkthrough 2.

Today:

- The panel reaches `data-state="ready"` after the URL #2
  bootstrap-preservation fix in commit `354345b`.
- Row 4 visibility renders `0 mutual windows · empty state`.
- Link-selection events render the empty state.
- There is no fake active satellite.
- The 3D renderer keeps endpoint context rather than inventing a link.

This is already correct under the existing renderer. The Slice 1 adapter must
preserve this no-fake-actor invariant per parent SDD section 6 rule 6.

## 5. Reproducibility one-liners

Chromium baseline binary and arguments:

```bash
CHROME=/home/u24/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome
ARGS="--headless=new --disable-gpu --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1440,900"
```

Re-capture the six PNGs if needed:

```bash
npm run dev -- --host 127.0.0.1 --port 5173

$CHROME $ARGS --screenshot=/tmp/sgv_fixed_demo_baseline.png \
  'http://127.0.0.1:5173/?scenePreset=regional&m8aV4GroundStationScene=1'

$CHROME $ARGS --screenshot=/tmp/sgv_slice0_demo1.png \
  'http://127.0.0.1:5173/?stationA=ksat-svalsat-svalbard&stationB=ksat-tromso&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360'

$CHROME $ARGS --screenshot=/tmp/sgv_slice0_demo2.png \
  'http://127.0.0.1:5173/?stationA=ksat-svalsat-svalbard&stationB=ksat-trollsat-antarctica&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360'

$CHROME $ARGS --screenshot=/tmp/sgv_slice0_demo3.png \
  'http://127.0.0.1:5173/?stationA=intelsat-fuchsstadt&stationB=intelsat-atlanta&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360'

$CHROME $ARGS --screenshot=/tmp/sgv_slice0_demo4.png \
  'http://127.0.0.1:5173/?stationA=singtel-bukit-timah&stationB=measat-cyberjaya&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360'

$CHROME $ARGS --screenshot=/tmp/sgv_slice0_demo5.png \
  'http://127.0.0.1:5173/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360'
```

## 6. Data inventory appendix

This appendix is the Slice D0 baseline for
`docs/sdd/multi-station-selector/tle-first-data-completeness.md`. It records
the local source inventory before runtime provenance fields are added. No
runtime behavior changed for this appendix.

### 6.1 Local TLE source inventory

Count method: parse each bundled 3-line TLE fixture as name + line 1 + line 2
groups, then extract epoch from TLE line 1. Source timestamp is the date
embedded in the fixture filename; there is no live refresh in this baseline.

| Orbit | Runtime fixture path | Source date | Parsed records | Epoch range |
| --- | --- | --- | ---: | --- |
| LEO | `public/fixtures/satellites/leo-scale/starlink-2026-05-12T12-35-35Z.tle` | 2026-05-12 | 600 | 2026-05-10T16:40:08.249Z -> 2026-05-12T08:00:01.000Z |
| MEO | `public/fixtures/satellites/multi-orbit/meo/galileo-2026-05-13T01-28-37Z.tle` | 2026-05-13 | 33 | 2026-04-25T15:10:52.485Z -> 2026-05-12T13:12:24.687Z |
| GEO | `public/fixtures/satellites/multi-orbit/geo/commercial-geo-top30-2026-05-13T01-28-37Z.tle` | 2026-05-13 | 30 | 2026-05-11T06:21:38.641Z -> 2026-05-12T20:33:28.077Z |

Runtime selected-pair compute currently applies a 60-record cap per orbit
class. With the current fixtures this means LEO can be capped during
selected-pair compute; MEO and GEO are below the cap.

### 6.2 Wave-1 selected-pair baseline (frozen 2026-05-19 at commit 7c44d60)

Captured from the five canonical walkthrough selected-pair URLs on
2026-05-19 against commit `7c44d60`. Runtime capture used a clean clone at
that commit, a Vite dev server, and headless Chromium via CDP with
`--use-angle=swiftshader --enable-unsafe-swiftshader`.

#### URL #1 — Svalbard / Tromso

URL:
`/?stationA=ksat-svalsat-svalbard&stationB=ksat-tromso&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360`

Captured: 2026-05-19 against commit `7c44d60`

##### Row 3 stats

- totalCommunicatingMs: `21600000`
- handoverCount: `1`
- meanLinkDwellMs: `10800000`

##### Row 4 link-selection events

- total event count: `2`
- first 3 events:
  1. `2026-05-17T00:00:00.000Z` | `current-link-unavailable` | `none` -> `GSAT0210 (GALILEO 13)`
  2. `2026-05-17T05:24:00.000Z` | `current-link-unavailable` | `GSAT0210 (GALILEO 13)` -> `GSAT0226 (GALILEO 31)`
- cross-orbit-migration events: `0`

##### Row 5 d1 per-orbit throughput (current magic-capacity model)

- LEO Mbps: `198.932`
- MEO Mbps: `99.712`
- GEO Mbps: `48.841`

##### Row 6 footer

- precisionLabel: `operator-family-precision`
- sourceTier: `public-disclosed`

##### TLE source health (wave-1 derivation: filename-based)

- LEO: `fresh`
- MEO: `fresh`
- GEO: `fresh`

##### Scene source mode

- sourceMode: `tle-first-runtime`

##### Modeled outputs summary (wave-1 6 kinds)

- handover.modelId: `cross-orbit-live-policy`
- link-budget.modelId: `fspl-rain-gas-link-budget-v1`
- throughput.modelId: `selected-pair-throughput-estimate-v1`
- jitter.modelId: `selected-pair-jitter-estimate-v1`
- latency.modelId: `selected-pair-propagation-delay-v1`
- rain-impact.modelId: `selected-pair-rain-impact-v1`

#### URL #2 — Svalbard / Trollsat

URL:
`/?stationA=ksat-svalsat-svalbard&stationB=ksat-trollsat-antarctica&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360`

Captured: 2026-05-19 against commit `7c44d60`

##### Row 3 stats

- totalCommunicatingMs: `0`
- handoverCount: `0`
- meanLinkDwellMs: `0`

##### Row 4 link-selection events

- total event count: `0`
- first 3 events: `(none)`
- cross-orbit-migration events: `0`

##### Row 5 d1 per-orbit throughput (current magic-capacity model)

- LEO Mbps: `N/A` (no visibility)
- MEO Mbps: `N/A` (no visibility)
- GEO Mbps: `N/A` (no visibility)

##### Row 6 footer

- precisionLabel: `operator-family-precision`
- sourceTier: `public-disclosed`

##### TLE source health (wave-1 derivation: filename-based)

- LEO: `fresh`
- MEO: `fresh`
- GEO: `fresh`

##### Scene source mode

- sourceMode: `tle-first-runtime`
- emptyReasonCode: `no-pair-intersection`

##### Modeled outputs summary (wave-1 6 kinds)

- handover.modelId: `cross-orbit-live-policy`
- link-budget.modelId: `fspl-rain-gas-link-budget-v1`
- throughput.modelId: `selected-pair-throughput-estimate-v1`
- jitter.modelId: `selected-pair-jitter-estimate-v1`
- latency.modelId: `selected-pair-propagation-delay-v1`
- rain-impact.modelId: `selected-pair-rain-impact-v1`

#### URL #3 — Intelsat Fuchsstadt / Intelsat Atlanta

URL:
`/?stationA=intelsat-fuchsstadt&stationB=intelsat-atlanta&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360`

Captured: 2026-05-19 against commit `7c44d60`

##### Row 3 stats

- totalCommunicatingMs: `21600000`
- handoverCount: `2`
- meanLinkDwellMs: `7200000`

##### Row 4 link-selection events

- total event count: `3`
- first 3 events:
  1. `2026-05-17T00:00:00.000Z` | `current-link-unavailable` | `none` -> `GSAT0213 (GALILEO 17)`
  2. `2026-05-17T03:35:30.000Z` | `current-link-unavailable` | `GSAT0213 (GALILEO 17)` -> `GSAT0227 (GALILEO 30)`
  3. `2026-05-17T05:20:30.000Z` | `current-link-unavailable` | `GSAT0227 (GALILEO 30)` -> `GSAT0205 (GALILEO 9)`
- cross-orbit-migration events: `0`

##### Row 5 d1 per-orbit throughput (current magic-capacity model)

- LEO Mbps: `N/A` (orbit not shared by the selected pair)
- MEO Mbps: `99.712`
- GEO Mbps: `48.841`

##### Row 6 footer

- precisionLabel: `operator-family-precision`
- sourceTier: `public-disclosed`

##### TLE source health (wave-1 derivation: filename-based)

- LEO: `fresh`
- MEO: `fresh`
- GEO: `fresh`

##### Scene source mode

- sourceMode: `tle-first-runtime`

##### Modeled outputs summary (wave-1 6 kinds)

- handover.modelId: `cross-orbit-live-policy`
- link-budget.modelId: `fspl-rain-gas-link-budget-v1`
- throughput.modelId: `selected-pair-throughput-estimate-v1`
- jitter.modelId: `selected-pair-jitter-estimate-v1`
- latency.modelId: `selected-pair-propagation-delay-v1`
- rain-impact.modelId: `selected-pair-rain-impact-v1`

#### URL #4 — Singtel Bukit Timah / MEASAT Cyberjaya

URL:
`/?stationA=singtel-bukit-timah&stationB=measat-cyberjaya&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360`

Captured: 2026-05-19 against commit `7c44d60`

##### Row 3 stats

- totalCommunicatingMs: `21600000`
- handoverCount: `0`
- meanLinkDwellMs: `21600000`

##### Row 4 link-selection events

- total event count: `1`
- first 3 events:
  1. `2026-05-17T00:00:00.000Z` | `current-link-unavailable` | `none` -> `ASIASTAR`
- cross-orbit-migration events: `0`

##### Row 5 d1 per-orbit throughput (current magic-capacity model)

- LEO Mbps: `198.932`
- MEO Mbps: `N/A` (orbit not shared by the selected pair)
- GEO Mbps: `48.841`

##### Row 6 footer

- precisionLabel: `modeled-precision`
- sourceTier: `geometric-derived`

##### TLE source health (wave-1 derivation: filename-based)

- LEO: `fresh`
- MEO: `fresh`
- GEO: `fresh`

##### Scene source mode

- sourceMode: `tle-first-runtime`

##### Modeled outputs summary (wave-1 6 kinds)

- handover.modelId: `cross-orbit-live-policy`
- link-budget.modelId: `fspl-rain-gas-link-budget-v1`
- throughput.modelId: `selected-pair-throughput-estimate-v1`
- jitter.modelId: `selected-pair-jitter-estimate-v1`
- latency.modelId: `selected-pair-propagation-delay-v1`
- rain-impact.modelId: `selected-pair-rain-impact-v1`

#### URL #5 — Yangmingshan / Hartebeesthoek

URL:
`/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek&startUtc=2026-05-17T00:00:00.000Z&durationMinutes=360`

Captured: 2026-05-19 against commit `7c44d60`

##### Row 3 stats

- totalCommunicatingMs: `21600000`
- handoverCount: `2`
- meanLinkDwellMs: `7200000`

##### Row 4 link-selection events

- total event count: `3`
- first 3 events:
  1. `2026-05-17T00:00:00.000Z` | `current-link-unavailable` | `none` -> `INMARSAT 3-F3`
  2. `2026-05-17T02:24:30.000Z` | `better-candidate-available` | `INMARSAT 3-F3` -> `GSAT0203 (GALILEO 7)`
  3. `2026-05-17T04:31:30.000Z` | `current-link-unavailable` | `GSAT0203 (GALILEO 7)` -> `INMARSAT 3-F3`
- cross-orbit-migration events: `0`

##### Row 5 d1 per-orbit throughput (current magic-capacity model)

- LEO Mbps: `198.932`
- MEO Mbps: `99.712`
- GEO Mbps: `48.841`

##### Row 6 footer

- precisionLabel: `modeled-precision`
- sourceTier: `geometric-derived`

##### TLE source health (wave-1 derivation: filename-based)

- LEO: `fresh`
- MEO: `fresh`
- GEO: `fresh`

##### Scene source mode

- sourceMode: `tle-first-runtime`

##### Modeled outputs summary (wave-1 6 kinds)

- handover.modelId: `cross-orbit-live-policy`
- link-budget.modelId: `fspl-rain-gas-link-budget-v1`
- throughput.modelId: `selected-pair-throughput-estimate-v1`
- jitter.modelId: `selected-pair-jitter-estimate-v1`
- latency.modelId: `selected-pair-propagation-delay-v1`
- rain-impact.modelId: `selected-pair-rain-impact-v1`

Frozen reference for F9 §49 pre/post comparison view. Captured BEFORE any
wave-2 wiring (F2/F3/F5/F7) lands. Any future capture against a later commit
must be added as a new §6.N sub-section, not overwritten. Comparison view in
F9 §49 may interpolate between this baseline and the live wave-2 numbers; the
baseline values here are immutable source-of-truth for the "before" pane.

### 6.3 Station registry inventory

Registry source:
`public/fixtures/ground-stations/multi-orbit-public-registry.json`, generated
at `2026-05-16T09:10:22Z`.

| Metric | Count |
| --- | ---: |
| Total stations | 69 |
| `exact-coords` stations | 22 |
| `operator-family-region` stations | 47 |
| `region-only` stations | 0 |
| Stations disclosing LEO support | 50 |
| Stations disclosing MEO support | 41 |
| Stations disclosing GEO support | 69 |

Registry `sourceTier` distribution is source-publication metadata, not the
pair source-tier badge:

| Registry source tier | Count |
| --- | ---: |
| `operator-stated` | 57 |
| `wikipedia` | 7 |
| `industry-disclosure` | 4 |
| `regulatory-filing` | 1 |

### 6.4 Selected-pair output fields before D1-D7

`RuntimeProjectionResult` already carries the selected-pair fields that D1-D7
will annotate:

- pair station descriptors;
- UTC time window;
- shared supported orbit classes;
- visible constellation rows by orbit;
- pair visibility windows;
- handover events;
- communication stats;
- truth boundary with precision label, pair source tier, and non-claims.

The missing baseline fields are machine-readable source health, per-source
cap/exclusion detail, station coordinate precision as structured state,
modeled-output metadata, empty reason code, and a stable data-completeness
debug payload.

## 7. Hand-off to Slice 1

Slice 1 introduced `TleFirstSceneViewModel` and `SceneActor` per section 5 of
the parent SDD. Slice 5 removes the superseded selected-pair display adapter.
The Slice 0 baseline freezes the visual state the migration must not regress,
per the "Smokes that must keep passing" lines in parent SDD section 8.
