# Multi-Station Selector — Acceptance Criteria

Draft date: 2026-05-17
Status: draft (pending plan-design-review + codex challenge)

## Scope

This document defines what "deliverable" means for the unified selector +
projection surface. It is the gate the implementation slices land against.
The information architecture
(`docs/sdd/multi-station-selector/information-architecture.md`) and the data
contract (`runtime-data-contract.md`) define how; this document defines
when work is done.

## Terminology

Neutral terminology of the runtime data contract applies unchanged.

## 1. Hard acceptance gates

Every gate is a binary pass / fail. Delivery requires all of them to pass on
the same build.

### G1. Bucket A surface coverage

Each of the 19 Bucket A requirements in
`/home/u24/papers/itri/requirements-consolidated.md` resolves to a visible
surface in the demo with no extra navigation. Verification cites the DOM
selector and the numeric / textual assertion. The five reference station
ids (`ksat-svalsat-svalbard`, `ksat-tromso`,
`ksat-trollsat-antarctica`, `intelsat-fuchsstadt`, `intelsat-atlanta`,
`singtel-bukit-timah`, `measat-cyberjaya`, `cht-yangmingshan`,
`sansa-hartebeesthoek`) MUST resolve in
`public/fixtures/ground-stations/multi-orbit-public-registry.json`;
the smoke fails fast on absence.

| ID | Selector | Assertion |
| --- | --- | --- |
| R1-T1 / K-A1 | `[data-v4-projection-side-panel="true"] .v4-projection-side-panel__list-item` in the link-selection list | count ≥ 1 OR the empty-state line `No handover events` is present |
| R1-T2 / K-D1 | first row of `.v4-projection-side-panel__list-primary` in visibility windows section | text contains a satellite id matching `/^[A-Z0-9_-]+$/` resolvable to the LEO/MEO/GEO TLE fixture |
| R1-T3 / K-D2 | `canvas.cesium-widget-canvas` | element present, non-zero `clientWidth` |
| R1-T4 / K-D3 | `.ground-station-list-picker__filters-button`, `.ground-station-selection-chip`, `.v4-projection-side-panel__rain-slider`, `.m8a-v47-product-ux__strip [data-m8a-v47-control-id="play-pause"]` | each element exists; replay button is enabled when panel substate is `ready` |
| R1-T5 / K-D4 | `.v4-projection-side-panel__details:nth-of-type(3)` body | body innerText contains `TR 38.821 §7.3` |
| R1-T6 / K-D5 | `.v4-projection-side-panel__details:nth-of-type(1)` body | body innerText contains lines starting with at least two of `LEO downlink`, `MEO downlink`, `GEO downlink` |
| R1-F1 / K-E1 | `[data-leo-actor-count-chip="true"]` | DOM attribute `data-leo-actor-count` parses to integer ≥ 500 |
| R1-F2 / K-E2 | `[data-m8a-v47-control-group="speed"] button[data-m8a-v47-playback-multiplier]` | three buttons present; `data-m8a-v47-playback-multiplier` values `30`, `60`, `120` (matches `renderSpeedButtons` in `m8a-v4-ground-station-handover-scene-controller.ts:2187-2201`) |
| R1-F3 / K-E3 | `.v4-projection-side-panel__stat-value` (first stat) | text matches `/\d+[hms]/` OR panel substate `empty-result` |
| R1-F4 / K-E4 / K-F4 | each `.v4-projection-side-panel__list-item` in link-selection list | `.v4-projection-side-panel__list-secondary` non-empty |
| R1-F5 / K-E5 | `.v4-projection-side-panel__download-csv` | button present; click yields a `text/csv` blob whose body starts with `# Runtime projection,` and contains 5 lines starting with `# ` |
| K-A4 | `[data-tle-telemetry-chip="true"]` | DOM attribute `data-tle-date` parses to ISO date, value ≥ `2026-05-12` |
| K-E6 | `.v4-projection-side-panel__rain-slider` + `.v4-projection-side-panel__details:nth-of-type(1)` body | drag slider to value `80`, recompute completes (panel substate `ready` retained), disclosure body shows at least one row with `−` sign indicating reduction for orbits in 10–30 GHz band |
| K-F7 | `body[data-display-state]` | attribute equals one of `idle`, `selecting`, `projecting`, `replaying`, `invalid` |
| R1-D1 / D2 / D3 | covered by R1-T2 / R1-T4 / R1-F3 + Row 3 stats | — |
| R1-D4 | `[data-soak-summary-path]` on viewer root | attribute non-empty; the file at the cited path exists on disk |
| V-MO1 | `.v4-projection-side-panel__list-item[data-modifier="cross-orbit-migration"]` | element present in link-selection list when projection emits a cross-orbit-migration event in the window |

A row that does not appear because the projection emits zero events for that
window is acceptable iff the panel renders the empty-state line for that
section. Empty states still count as covered.

### G2. Single-route mount

There is only one bootstrap entry path that the user navigates. Markers,
selection chips, station list picker (which carries the orbit / region /
band filter chips in its collapsible body), and station info card mount
on every route entry, irrespective of whether the URL carries `stationA`
/ `stationB`. The V4 projection side panel mounts iff
`resolveV4RouteSelection` returns `resolvedPair !== null` — i.e. both
`stationA` AND `stationB` URL params parse to ids present in
`multi-orbit-public-registry.json` AND the two ids differ. Acceptance:

1. Navigate to `/` with no params: markers and chips are visible; V4
   panel is absent. `body[data-display-state]` equals `idle`.
2. Navigate to `/?stationA=<id-A>&stationB=<id-B>` where both ids
   resolve in the registry: markers, chips, list picker, info-card,
   and V4 panel are all mounted simultaneously.
   `body[data-display-state]` equals `projecting` (or `replaying` if
   the replay clock is auto-playing).
3. Navigate to `/?stationA=bogus&stationB=bogus`: markers and chips
   mount; V4 panel does not mount; `body[data-display-state]` equals
   `invalid`.
4. Both short URL and long URL (`?m8aV4GroundStationScene=1&stationA=
   …&stationB=…`) MUST mount the V4 panel. The same DOM assertions
   pass on both URL forms.

### G3. 60× replay continuity

With a selected-pair URL and `durationMinutes=360`, pressing 60× plays the
window in approximately 6 wall-clock minutes. During the run:

Baseline (pinned for reproducibility):

- Browser: Playwright-cached Chromium 1217
  (`/home/u24/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`).
- Mode: `--headless=new --use-angle=swiftshader
  --enable-unsafe-swiftshader --no-sandbox --disable-dev-shm-usage` plus
  the background-throttling disables and
  `Emulation.setFocusEmulationEnabled` (see the smoke for the exact
  argument list).
- Viewport: 1440×900.
- Host: WSL2 with at least 4 CPU cores.

Hard gate — the smoke MUST satisfy all three to exit 0:

1. **No errors** — zero entries in `console.error` and `pageerror`
   collectors across the 6-minute wall-clock run.
2. **Panel stays `ready`** — the V4 panel root keeps
   `data-state="ready"` across all 5-second wall-clock samples. Any
   sample returning anything else fails the gate.
3. **Replay clock advances** — `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__
   .replayClock.getState().currentTime` is strictly greater at the end
   sample than at the first. Proves the playback engine ticked across
   the full window rather than stalling silently.

Observation only — recorded in the verdict JSON but NOT gating:

- `fpsAvg` — average fps across 5-second wall-clock windows.
- `fpsP95FromInterval` — 1000 ÷ p95 inter-frame interval.
- `maxFrameGapMs` — longest single inter-frame gap.

Headless swiftshader on WSL2 caps raf around 1–2 fps regardless of
background-throttling flags; the rate floor (`FPS_AVG_FLOOR = 45`,
`FPS_P95_FLOOR = 28`) is retained in the smoke as a target for
non-headless characterization but the smoke does not fail when only the
FPS observables miss it. Real-browser frame-rate characterization
belongs in a separate non-headless audit, not in this gate.

The smoke script `scripts/verify-60x-replay-continuity.mjs` launches
Chromium with `--remote-debugging-port=<random>`, drives it via raw CDP,
and asserts the three hard-gate conditions.

### G4. Any-2-station real-time compute

For any registry pair, the time from selection commit to panel
`renderResult` is under 1000 ms at the default 360-minute window. The
smoke `scripts/verify-random-pair-projection-budget.mjs` exercises three
disjoint pair sets:

1. **10 random pairs** drawn from the registry with a seeded RNG so the
   run is reproducible.
2. **5 walkthrough pairs** — the exact five demo URLs enumerated in
   `docs/itri-requirement-walkthrough.md` §3.
3. **3 worst-case pairs** named in the smoke fixture:
   - cross-equator with no shared orbit class (zero intersection
     fast-path);
   - max great-circle distance pair (Svalbard ↔ Hartebeesthoek);
   - dual-LEO-rich pair where the 60-record cap saturates
     (Tromsø ↔ Fucino).

All 18 pairs must satisfy budget. If a pair returns
`empty-result` (no shared orbit class), the panel still resolves
within budget and renders the empty-state row with no error.

### G5. Information density at 1280×800

At 1280×800 viewport, with V4 panel mounted at panel substate `ready`:

1. Rows 1 through 4 of the panel render without any internal scroll on
   the panel root.
2. Row 5 disclosures are closed by default. Opening a disclosure
   scrolls **inside the disclosure body only**; the panel root does
   not scroll.
3. No `chrome.topRight` contention (per IA §4.5) — the V4 panel is the
   only surface anchored in the topRight upper portion.
4. The selection chips and station list picker (including its
   collapsible filter chip body) in `chrome.topLeft` do not visually
   overlap each other or the replay strip.

Verified at 1280×800 and 1920×1080 by `scripts/verify-information-density.mjs`
which computes layout boxes via CDP `DOM.getBoxModel`.

### G6. No customer-name literal in new code

```
grep -RInE 'itri' \
  src/features/multi-station-selector/ \
  src/runtime/ \
  src/components/ \
  src/styles.css \
  src/styles/ \
  tests/smoke/multi-station-selector-*.mjs \
  scripts/verify-60x-replay-continuity.mjs \
  scripts/verify-random-pair-projection-budget.mjs \
  scripts/verify-information-density.mjs \
  docs/sdd/multi-station-selector/
```

returns no match for the case-insensitive substring `itri` introduced in
files authored or rewritten by waves 1 through 5. The grep is
case-insensitive (`-i`). Existing legacy literals in files NOT touched
this round (audit reports, fixtures, archive directories) are out of
scope; per-file overrides live in `scripts/g6-allowlist.txt` listing
exact lines that may remain.

This restates feedback memory `feedback_no_itri_in_new_code` as a hard
gate, with an explicit allow-list to avoid false positives on legacy
text in untouched files.

### G7. Build + existing smokes pass

`npm run build` exits 0. The existing soak summary at
`output/soak/2026-05-15T05-42-07-506Z-phase7-0-full/summary.json` is
not modified. The smoke manifest at
`tests/smoke/manifest-2026-05-17-pre-ia-convergence.txt` (captured at
SDD freeze) lists which smokes must keep passing; `npm run
test:smoke:manifest` (added in wave 4) iterates that manifest and
asserts each script exits 0.

The data-completeness closeout adds one selected-pair provenance gate:
`node scripts/verify-tle-first-data-completeness.mjs --port=<port>`. It
asserts source health, station precision, modeled-output metadata, empty reason
codes, CSV provenance sections, `fakeActorCount === 0`, and fixed-demo
`fixture-fallback` isolation.

## 2. Soft acceptance (warnings, not blockers)

1. Lighthouse accessibility score on `/` ≥ 90.
2. Wave 3 removes the following dead-DOM subtrees from
   `m8a-v4-ground-station-handover-scene-controller.ts` (per IA §11.4
   and the dead-DOM scan): top-strip (lines 2290-2296),
   handover-rail-scrim + handover-rail-drawer aside (2297-2332),
   transition-event (2334-2337), scene-annotation (2338-2345),
   sequence-rail (2346-2355), reviewer-mode-toggle inside strip (2368),
   reviewer-mode-status (2373), boundary-surface aside (2374-2390),
   inspector-sheet aside (2391-2628). The structure-check at lines
   2267-2287 is updated accordingly. LOC count is observed (not
   targeted) — the gate is "named subtrees removed".
3. Panel render time (initial `renderResult` invocation) measured by
   `performance.now()` deltas under 250 ms.

## 3. Sub-agent dispatch criteria

Each implementation wave dispatches when its preconditions are met. The
vocabulary "must-fix" used in §3 maps to severity `blocker` in
plan-design-review and codex-challenge output.

- Wave 1 (P1 mount unification) ← SDD trio committed; plan-design-review
  blocker count = 0; codex-challenge verdict ∈ {SOUND, PARTIALLY-SOUND}.
- Wave 2 (P2 panel IA) ← Wave 1 merged; G2 passes locally.
- Wave 3 (P3 controller DOM cleanup) ← Wave 2 merged; G1 passes locally.
- Wave 4 (P4 visual unification + 60× soak + random-pair budget) ←
  Wave 3 merged; G3 and G4 smoke scripts authored.
- Final audit ← all four waves merged; G1 through G7 pass on the same
  build.

## 4. Roll-back posture

Each wave lands as a small set of commits with explicit per-file
`git add` targets (per R6 concurrent-session caution). A wave that
fails its preconditions in audit reverts only its own commits;
preceding waves stay.

## 5. Resolved decisions (from 2026-05-17 SDD-review convergence)

1. G3 fps floor: 45 average + p95 ≥ 28 (was: 30 average). Pinned
   Chromium baseline.
2. G4 budget: 1000 ms with 40 % headroom over the ~600 ms baseline.
   Sample size: 10 random + 5 walkthrough + 3 worst case.
3. G5 mobile (720p) is a soft assert in §2 only. Hard gate is desktop
   1280×800 + 1920×1080.
4. G2 long-form URL parity: yes. Both short and long URL forms must
   pass the same assertions.
