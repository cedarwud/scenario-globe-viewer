# Multi-Station Selector — Slice 0 Baseline

This document is the Slice 0 deliverable named by
`docs/sdd/multi-station-selector/tle-first-3d-pipeline.md` section 8,
Slice 0. No runtime change is made here; this records current behaviour before
the TLE-first convergence work begins.

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

## 6. Hand-off to Slice 1

Slice 1 will introduce `TleFirstSceneViewModel` and `SceneActor` per section
5 of the parent SDD, alongside `selected-pair-scene-adapter.ts`. The Slice 0
baseline freezes the visual state Slice 1 must not regress, per Slice 1's
"Smokes that must keep passing" line in parent SDD section 8.
