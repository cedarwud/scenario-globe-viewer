# Multi-Station Selector — Slice 0 Baseline

This document is the Slice 0 deliverable named by
`docs/sdd/multi-station-selector/tle-first-3d-pipeline.md` section 8.
No runtime change; it records current route behaviour before the
TLE-first 3D pipeline convergence work begins.

## 1. Capture metadata

- Capture date: 2026-05-18
- Repo HEAD at capture: `2033712` (most recent `main` HEAD when the
  six baseline PNGs were written)
- Browser: Playwright-cached Chromium 1217 (headless)
- Chromium args: `--use-angle=swiftshader --enable-unsafe-swiftshader
  --disable-dev-shm-usage --no-sandbox`
- Viewport: 1440x900
- Host: WSL2
- Dev server: `http://127.0.0.1:5173`
- CDP port for the capture session: 9333

## 2. Fixed demo entry baseline

Screenshot: `/tmp/sgv_fixed_demo_baseline.png`.

Route: `/?scenePreset=regional&m8aV4GroundStationScene=1` (or the
homepage CTA whose `addressedHref` resolves to this URL after
commit `06b4d0d` "Restore fixed V4 demo entry route").

Observed contract:

- `body[data-display-state]` is `idle` because no `stationA` /
  `stationB` URL params are present.
- The selected-pair V4 projection side panel does NOT mount
  (`[data-v4-projection-side-panel="true"]` absent).
- The V4 ground-station controller mounts the fixture-driven scene
  (`[data-m8a-v4-ground-station-scene="true"]` present). That scene
  carries the curated actor / timeline surface: operator-family
  display anchors, polished link-flow pulses, choreographed label
  density, and stable camera framing.
- Visual character: polished, stable, the strongest 3D quality in
  the codebase today.

Truth-class classification per the TLE-first pipeline SDD section 3:

- Endpoint anchors → `public-registry-derived` (operator-family
  region, not exact site coordinates).
- Actors and timeline → `fixture-fallback` (curated demo data, TLE
  lineage on actor ids only).
- Camera framing / label density / link-flow pulses → `display-only`.

This is the visual baseline that the new TLE-first pipeline must
match or explicitly relabel as `fixture-fallback` per Slice 4.

## 3. Selected-pair walkthrough baselines

The five fixed-window walkthrough URLs all use
`startUtc=2026-05-17T00:00:00.000Z` and `durationMinutes=360`.
Mutual-window counts taken from the post-fix final audit verdict
(`docs/sdd/multi-station-selector/final-audit-ship-verdict-2026-05-18.md`).
All five render with LEO actor count chip = `600` (demo LEO actor
fixture record count).

### 3.1 Walkthrough 1 — `ksat-svalsat-svalbard` ↔ `ksat-tromso`

- Screenshot: `/tmp/sgv_slice0_demo1.png`
- `body[data-display-state]`: `replaying`
- Panel `data-state`: `ready`
- Mutual windows: 26 (Row 4 visibility shows next 3 chronologically)
- Link-selection events: populated (no cross-orbit migration in this
  window typically; the row would be purple-modified if present)
- 3D: model satellites visible; short-baseline Arctic pair with
  stable camera. No regression observable in the baseline screenshot.

### 3.2 Walkthrough 2 — `ksat-svalsat-svalbard` ↔ `ksat-trollsat-antarctica`

- Screenshot: `/tmp/sgv_slice0_demo2.png`
- `body[data-display-state]`: `replaying`
- Panel `data-state`: `ready` (after the URL #2 bootstrap-preservation
  fix in `354345b`; prior to that commit the URL silently dropped
  `stationB`)
- Mutual windows: 0 — antipodal polar pair has no shared visibility
  in this window. Row 4 visibility renders the empty state line.
- Link-selection events: empty state line.
- 3D: this is the canonical scene that exposes the polar / antipodal
  framing gap. See section 4 below.

### 3.3 Walkthrough 3 — `intelsat-fuchsstadt` ↔ `intelsat-atlanta`

- Screenshot: `/tmp/sgv_slice0_demo3.png`
- `body[data-display-state]`: `replaying`
- Panel `data-state`: `ready`
- Mutual windows: 15
- Mid-latitude Atlantic-crossing GEO operator pair; classic
  long-baseline coverage. Renders cleanly.

### 3.4 Walkthrough 4 — `singtel-bukit-timah` ↔ `measat-cyberjaya`

- Screenshot: `/tmp/sgv_slice0_demo4.png`
- `body[data-display-state]`: `replaying`
- Panel `data-state`: `ready`
- Mutual windows: 42 (densest sample; short-baseline equatorial pair
  with high LEO overlap)
- Renderer handles the high-density window without label collision in
  the baseline screenshot.

### 3.5 Walkthrough 5 — `cht-yangmingshan` ↔ `sansa-hartebeesthoek`

- Screenshot: `/tmp/sgv_slice0_demo5.png`
- `body[data-display-state]`: `replaying`
- Panel `data-state`: `ready`
- Mutual windows: 9
- Long-baseline cross-hemisphere pair; tests camera framing on
  longer geodesics. Renders cleanly in the baseline screenshot.

## 4. Known failure modes carried forward

These observations bound what Slice 2 and Slice 3 must improve.

### 4.1 Polar / antipodal camera classifier missing

Walkthrough 2 (Svalbard ↔ Trollsat) is the canonical example. The
panel mounts with 0 mutual windows correctly, but the renderer has
no pair-geometry classifier today: endpoints sit near opposite poles
without a guided pull-back, and the camera is not aware that the
pair geometry is `antipodal`. The new SDD section 6 rule 5 plus
section 9 A2 require this in Slice 2-3.

`SceneCameraHint.pairGeometry` is the contract field that will carry
this classification (per the TLE-first pipeline SDD section 5).

### 4.2 Zero-window invariant — already correct, MUST be preserved

Walkthrough 2 also exercises the zero-window invariant. Today the
renderer correctly avoids inventing a fake active satellite: Row 4
visibility renders empty, Row 4 link-selection events render empty,
and the panel reaches `data-state="ready"` instead of stalling.

Slice 1 (`TleFirstSceneViewModel` adapter) MUST preserve this
no-fake-actor invariant per the parent SDD section 6 rule 6. The
adapter regression test for Slice 1 asserts:

```
zero-window projection → 0 active actors, 0 SceneActiveLink entries
```

## 5. Reproducibility one-liners

Restart Chromium 9333 for fresh captures:

```
PW=/home/u24/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome
rm -rf /tmp/sgv-pw5
"$PW" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
  --disable-dev-shm-usage --no-sandbox \
  --user-data-dir=/tmp/sgv-pw5 --remote-debugging-port=9333 \
  --window-size=1440,900 about:blank &
```

Re-capture the six PNGs (uses `/tmp/sgv-capture.mjs` helper):

```
node /tmp/sgv-capture.mjs 9333 \
  'http://127.0.0.1:5173/?scenePreset=regional&m8aV4GroundStationScene=1' \
  /tmp/sgv_fixed_demo_baseline.png 14000

for i in 1 2 3 4 5; do
  case $i in
    1) URL='http://127.0.0.1:5173/?stationA=ksat-svalsat-svalbard&stationB=ksat-tromso&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360' ;;
    2) URL='http://127.0.0.1:5173/?stationA=ksat-svalsat-svalbard&stationB=ksat-trollsat-antarctica&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360' ;;
    3) URL='http://127.0.0.1:5173/?stationA=intelsat-fuchsstadt&stationB=intelsat-atlanta&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360' ;;
    4) URL='http://127.0.0.1:5173/?stationA=singtel-bukit-timah&stationB=measat-cyberjaya&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360' ;;
    5) URL='http://127.0.0.1:5173/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360' ;;
  esac
  node /tmp/sgv-capture.mjs 9333 "$URL" "/tmp/sgv_slice0_demo${i}.png" 13000
done
```

The four acceptance smokes also remain reproducible per
`docs/sdd/multi-station-selector/acceptance-criteria.md`.

## 6. Hand-off to Slice 1

Slice 1 introduces `TleFirstSceneViewModel` and `SceneActor` per
section 5 of the parent SDD, alongside the existing
`src/features/multi-station-selector/selected-pair-scene-adapter.ts`.
The two adapters co-exist through Slice 1; Slice 2 makes the renderer
consume the new shape, and Slice 5 removes the old adapter after the
Slice 4 decision.

The Slice 0 baseline freezes the visual state Slice 1 must not
regress. Per the parent SDD section 8 Slice 1, the smokes that must
keep passing after Slice 1 lands are `npm run build`,
`verify-g1-bucket-a-coverage`, and
`verify-random-pair-projection-budget`. The six baseline PNGs are
the visual reference for the Slice 2 visual-diff gate.
