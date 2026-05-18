# Multi-Station Selector — Information Architecture

Draft date: 2026-05-17
Status: draft (pending plan-design-review + codex challenge)

## Scope

This document defines the visible information architecture (IA) for the unified
selector + projection surface. It is the design contract that downstream
implementation slices converge on. It is the single source of truth for
**what shows up, where, and when**.

The runtime data contract
(`docs/sdd/multi-station-selector/runtime-data-contract.md`) defines the data;
this document defines the surfaces and their visibility rules.

## Terminology

The neutral terminology of the runtime data contract applies here unchanged.
No customer-specific identifier, including the four-letter agency name, appears
in any new module, fixture, label, or doc string introduced for this IA.

## 1. Mission

A single browser surface that simultaneously:

1. Demonstrates every Bucket A requirement
   (`/home/u24/papers/itri/requirements-consolidated.md` §A — 19 entries) in a
   form a non-engineer reviewer can reproduce visually within one screen of
   navigation.
2. Lets the reviewer choose any two stations from the public registry
   (`public/fixtures/ground-stations/multi-orbit-public-registry.json`) and
   recompute the selected-pair projection in under one wall-clock second per
   reselection at the default 360-minute window.
3. Holds 60× replay continuously across the full projection window without UI
   stalls, console errors, or panel re-mount.
4. Presents information at the right time and the right place — every panel
   element is justified by the current display state. The surface never shows
   "everything at once".

## 2. Single-route model

There is one demo route: `/`. URL search parameters carry state:

| Parameter | Owner | Required | Default |
| --- | --- | --- | --- |
| `stationA` | selection store | no | — |
| `stationB` | selection store | no | — |
| `startUtc` | side panel + V4 controller | no | open-page wall-clock UTC |
| `durationMinutes` | side panel + V4 controller | no | 360 |
| `scenePreset` | bootstrap composition | no | implicit `regional` if `stationA` and `stationB` resolve |
| `m8aV4GroundStationScene` | bootstrap composition | no | implicit `1` if `stationA` and `stationB` resolve |

The long-form URL (`m8aV4GroundStationScene=1`) remains accepted for
back-compatibility. The canonical short form remains `?stationA=&stationB=`.
Bootstrap auto-applies the regional preset and enters the runtime path when
both station ids resolve from the registry.

The mount lifecycle is unified: the selector marker set, selection chips,
station list picker, and station info card are mounted on every route entry,
not gated behind `isCleanHomeViewerMode`. The V4 projection side panel and the
V4 ground-station controller surfaces mount on top of that base when both
station slots resolve.

## 3. Display state machine

Five top-level states cover the surface lifecycle. The active state derives
from the selection snapshot, the URL validity, the selection-store + station
info card open/close, and the replay clock.

| State | Trigger | Description |
| --- | --- | --- |
| `idle` | both slots empty AND info card closed | Reviewer has not picked a pair |
| `selecting` | exactly one slot filled, OR info card open, OR list-picker has focus | Mid-selection |
| `projecting` | both slots filled, both registry-valid, replay paused at t=0 (or no replay yet) | Projection ready, no playback |
| `replaying` | as `projecting` PLUS replay clock `isPlaying === true` | Live replay in progress |
| `invalid` | any URL slot present but not registry-resolvable | Bad deep-link / stale id |

The `projecting` and `replaying` states have three substates the panel
exposes through a panel-local state attribute (separate from the surface
state attribute):

| Panel substate | Trigger | Panel content |
| --- | --- | --- |
| `loading` | first compute in flight | Header + spinner + "Loading TLE …" |
| `ready` | compute returned, non-empty | Full Tier-1/2/3 + footer |
| `empty-result` | compute returned, zero shared windows | Header + Tier-1 stats with zeros + Tier-2 collapsed to empty-state lines + Tier-4 footer |
| `error` | compute threw | Header + error message + retry CTA |

State authority and propagation are defined in §13.

The IA describes the state machine as a contract; the implementation may
expose it as a `data-display-state` attribute on the viewer container, a CSS
custom property, or any other mechanism that lets CSS rules react to state
without imperative DOM toggles. The contract is "CSS can branch on the
current state without per-tick JS".

## 4. Surface registry — what mounts where

### 4.0 Anchor zones

The IA describes four anchor zones, not pixel positions. Implementation
maps zones to CSS positions; per-pixel coordinates are an implementation
freedom that lives in `styles.css`, not in this document.

| Zone | Purpose | Stack order |
| --- | --- | --- |
| `chrome.topLeft` | Selection identity + interactive primary | top-down: chips → list-picker → replay-strip |
| `chrome.topRight` | V4 projection side panel | only the V4 panel mounts here, in `projecting` / `replaying`; see §4.5 |
| `chrome.bottomLeft` | Cesium credits + telemetry footer | bottom-up: Cesium credit · TLE telemetry chip |
| `chrome.bottomRight` | Replay event pill (transient) | single slot, transient |
| `globe` | World-space elements (markers, satellites, ribbon, label) | not stacked; world coordinates |
| `marker-docked` | Pop-overs anchored to clicked / hovered marker | overlay layer, follows marker |

### 4.1 Always present (chrome)

These surfaces mount at every entry to `/` independent of selection state.
Their visibility within a state is controlled in §4.5.

| Surface | Zone | State visibility | Source |
| --- | --- | --- | --- |
| Cesium globe | `globe` | all | `core/cesium/viewer-factory.ts` |
| Ground station markers (registry) | `globe` | all (subject to filter) | `features/multi-station-selector/station-markers.ts` |
| Selection chips (slot A · slot B · tier badge · Apply / Copy-link) | `chrome.topLeft` row 1 | all (chips show empty-state placeholder copy in `idle`) | `features/multi-station-selector/selection-chips.ts` |
| Station list picker (with embedded filter chips: orbit + region + band) | `chrome.topLeft` row 2 | all | `features/multi-station-selector/station-list-picker.ts` |
| Replay control strip (play/pause · restart · 30×/60×/120×) | `chrome.topLeft` row 3 | all (controls disabled until `projecting`) | V4 controller's `m8a-v47-product-ux__strip` |
| LEO actor count chip (`${tleSourceCount} LEO actors`) | `chrome.topLeft` row 3 inline-end | all | chip belongs to replay strip's right slot |
| TLE telemetry chip (`TLE ${date}`) | `chrome.bottomLeft` | all | small dim chip beside Cesium credit |
| Cesium credit + info | `chrome.bottomLeft` | all | Cesium |

The IA's canonical placement for the orbit + region + band filter chips
is **inside the station list picker's collapsible body** at
`chrome.topLeft` row 2 — that is where the chips are rendered today (see
`station-list-picker.ts:~650-720`). The standalone modules on disk
(`marker-filter-panel.ts`, `marker-filter-chips.ts`, `marker-region-chips.ts`,
`marker-band-chips.ts`, `marker-toggle.ts`, `marker-search-input.ts`) are
parallel-session WIP territory; `composition.ts` currently still calls
`mountMarkerFilterPanel` for a redundant standalone surface, but the IA
does not depend on that surface — consolidating it (or removing it) is a
follow-up slice (see §11.3) coordinated with the parallel session.

The LEO actor count chip reads from the TLE source count (LEO TLE fixture
record count, the same denominator that satisfies R1-F1 / K-E1's
≥ 500 LEO claim), not from the selected-pair projection's 60-record cap.
The chip is sourced once at bootstrap from the fixture and never re-derived
from runtime projection state.

### 4.2 Selection-dependent

| Surface | Required state | Zone | Source |
| --- | --- | --- | --- |
| Marker hover tooltip | any state where marker is hovered | `marker-docked` | `marker-hover-tooltip.ts` |
| Station info card | when a marker is clicked, dismiss on outside-click / ESC | `marker-docked` | `station-info-card.ts` |
| V4 projection side panel | `projecting` or `replaying` | `chrome.topRight` upper | `v4-projection-side-panel.ts` |
| V4 endpoint A/B markers + ribbon + camera framing | `projecting` or `replaying` | `globe` | `m8a-v4-ground-station-handover-scene-controller.ts:1108-1158, 1474+` |
| Selected-pair display-lane satellite cue + active-selection sample | `projecting` or `replaying` | `globe` (renders alongside controller's fixture actors per data-contract §A.5) | controller via `selected-pair-scene-adapter.ts` |

The selected-pair display-lane satellite cue and the fixture-driven V4
controller actor/timeline main scene **render simultaneously** during
`projecting` and `replaying`. The data contract §A.5 reaffirms this; this
IA does not assert the cue replaces the fixture actors. Tier-4 footer
carries the precision/source-tier caveat that the cue is TLE-derived
display lane, not measured service telemetry.

### 4.3 Replay-dependent

| Surface | Required state | Zone | Source |
| --- | --- | --- | --- |
| Replay event pill (single rolling, 4 s fade) | `replaying`, mounts on handover-event emission | `chrome.bottomRight` | new lightweight emitter |
| Active selected satellite ring | `replaying` | `globe` | controller |

### 4.4 Idle hint copy folds into chip empty-state

There is no standalone idle hint card. The selection chips' empty-state
placeholder text carries the prompt:

- Slot A empty: `Pick station A · click a globe marker or use the list below`
- Slot B empty: `Pick station B · click a second marker`

Copy is iterable; the IA specifies the role (one-line empty-state prompt
adjacent to slot label) and leaves wording to UX.

### 4.5 Top-right exclusivity rule (`chrome.topRight` upper)

No `chrome.topRight` contention — the V4 panel mounts alone in the upper
portion; the marker filter chips live inside the list picker's collapsible
body at `chrome.topLeft`. The previous over-specified collapse-to-icon
rule has been retired alongside the standalone-filter-panel design.

## 5. V4 panel — five-row information layering

The side panel reads top-to-bottom as a triage funnel. Five rows; each row
has one clearly-named role.

### Row 1 — header (always visible while panel is mounted)

Three lines, each capped to fit panel width at 1280×800:

1. Title line: `${stationA.shortName} ↔ ${stationB.shortName}`. Truncation
   strategy is a typography decision; the contract is "one line, ellipsis
   past panel width".
2. Tier badge chip (one pill, header-right): `Public-disclosure` or
   `Geometric`. Same color tokens as the selection chips' tier badge.
3. Window line: `${startIso} → ${endIso} UTC · ${durationMinutes}m`. ISO
   second precision.

Row 1 must fit in three lines maximum at 1280×800. No collapsibles in Row 1.

### Row 2 — control (always visible while panel is mounted)

Rain rate slider (0–100 mm/h, step 5). One dedicated row. This is the
single visible parameter that exercises K-E6; isolating it keeps it
clear of the summary lists below.

### Row 3 — flat stats (always visible while panel is mounted)

Two stats in a grid:

- `Comm time ${formatDurationMs}`
- `Handovers ${count}`

Mean dwell stays in Row 5's projection-metrics disclosure. Three flat
numbers at this row width is one too many.

### Row 4 — summary lists (always visible while panel is mounted)

Two dense flat lists; one row per item; no inner collapsibles:

1. Visibility windows summary: `${total}` count line + the **next 3 by
   chronological start time** (reviewers map list rows to globe motion;
   recency aligns with what they see moving). Top-by-duration ranking lives
   in Row 5's full list.
2. Link selection events summary: `${total}` count line + the **next 3 by
   chronological time** PLUS the **most recent `cross-orbit-migration`
   event** if not already in the top 3. Cross-orbit migration events
   render with the existing purple left-border modifier so V-MO1 stays
   visible regardless of recency.

### Row 5 — disclosures (collapsed by default)

Three independent `<details>` elements, each opens individually:

1. `Rain impact` — comm-time lost · % impact · per-orbit downlink throughput
   comparison · jitter delta · caveats. Body header line carries the
   citation `ITU-R P.618-14 §2.2.1` so a reviewer reading the rain effect
   sees its standards source without opening a second disclosure.
2. `All visibility windows` — full sorted list, scroll-confined within the
   `<details>` body, internal scroll bar; CSV download button at the top.
3. `Sources + non-claims` — full handover list (longer than the Row 4
   top-3); source-tier non-claims; standards references (TR 38.821 §7.3 +
   V-MO1, P.618-14, P.676-13). Mean dwell stat sits here as a small
   secondary block.

Disclosures are independent; multiple may be open simultaneously. The
"don't auto-expand" rule applies — none auto-opens on state transitions.

### Row 6 — fixed footer (always visible)

A small dim footer line:

> `${precisionLabel} · ${sourceTier}`

That is the entire row 6 content. The TLE date chip moved to
`chrome.bottomLeft` (§4.1); the full non-claims list is in Row 5
disclosure 3. Row 6 is the panel's truth-tier anchor in one short line.

### Row 1 ↔ chips Apply CTA

Per data-contract §A.2 the chips' Apply CTA loses its primary role once
mount unification is in place. Row 1 carries a small `📋 Copy link` icon
(top-right corner of the panel header) that copies the current URL to
clipboard. Wave 1 keeps the chips' Apply button as a no-op reload fallback
per §11.1.

## 6. ITRI Bucket A coverage map

Every Bucket A entry lands at a specific surface in a specific display state.
Each row references the new five-row panel layering (Row 1–6 of §5) or a
chrome surface enumerated in §4.

| ID | Surface | State | Layer |
| --- | --- | --- | --- |
| R1-T1 / K-A1 multi-orbit + switching | Globe constellation (fixture actors + selected-pair cue) + V4 panel Row 4 link-selection list | projecting / replaying | globe + Row 4 |
| R1-T2 / K-D1 orbit data integration | Row 4 visibility list rows (each row carries satelliteId resolvable to TLE) | projecting | Row 4 |
| R1-T3 / K-D2 viz | Globe | all | globe |
| R1-T4 / K-D3 UI interactive | Selection chips + marker filter + rain slider (Row 2) + replay controls | all | chrome + Row 2 |
| R1-T5 / K-D4 handover rules | Row 5 disclosure 3 `Sources + non-claims` (policy citation TR 38.821 §7.3) | projecting | Row 5 d3 |
| R1-T6 / K-D5 rate viz | Row 5 disclosure 1 `Rain impact` (per-orbit downlink contrast) | projecting | Row 5 d1 |
| R1-F1 / K-E1 ≥500 LEO | LEO actor count chip (`chrome.topLeft` row 3 inline-end) sourced from LEO TLE fixture record count (~11015 sats) | all | chrome |
| R1-F2 / K-E2 speed adjustable | Replay strip 30× / 60× / 120× | all | chrome |
| R1-F3 / K-E3 communication time | Row 3 `Comm time` stat + Row 5 d2 full window list | projecting / replaying | Row 3 + Row 5 d2 |
| R1-F4 / K-E4 / K-F4 handover-switch | Row 4 link-selection events list + reasonKind text + Row 5 d3 full list | replaying | Row 4 + Row 5 d3 |
| R1-F5 / K-E5 CSV export | Row 5 disclosure 2 head button | projecting | Row 5 d2 |
| K-A4 TLE input + tracking | TLE telemetry chip (`chrome.bottomLeft`) + satellite motion on globe | all | chrome |
| K-E6 rain attenuation demo | Row 2 rain slider + Row 5 d1 `Rain impact` (with inline P.618-14 §2.2.1 citation in disclosure body header per §5) | projecting | Row 2 + Row 5 d1 |
| K-F7 demo deliverable | Whole surface | all | — |
| R1-D1 11/30 orbit model import | Same as R1-T2 | projecting | Row 4 |
| R1-D2 11/30 dynamic parameters | Row 2 rain slider + replay speed + URL `startUtc` / `durationMinutes` | projecting / replaying | Row 2 + chrome |
| R1-D3 11/30 comm time stats | Row 3 stats + CSV (Row 5 d2 button) | projecting | Row 3 + Row 5 d2 |
| R1-D4 11/30 24h soak | Soak summary path on viewer-root dataset (`data-soak-summary-path`) | n/a | viewer-root attr |
| V-MO1 cross-orbit live handover | Purple-highlighted handover row in Row 4 (pinned regardless of recency per §5 Row 4) + reason text in Row 5 d3 | replaying | Row 4 + Row 5 d3 |

Every Bucket A row maps to a layer. None is hidden behind multi-level
scroll. The soak summary path lives on the viewer root element as a
`data-soak-summary-path` attribute; it is not a visible UI element but is
machine-readable evidence of R1-D4.

### 6.1 Bucket B antenna pattern (K-A3-a) — out of this round's IA

`src/runtime/link-budget/antenna-pattern.ts` (S.1528 + S.465-6) is
implemented as a standalone module but **not** wired into the
selected-pair runtime projection's compute path (per memory snapshot R8).
Visible compute for Row 5 d1 `Rain impact` uses FSPL + rain + gas only;
antenna gain is not part of the rendered downlink throughput contrast.

This round's IA does **not** add an antenna-gain surface. Two options for
a future round:

- Wire `antenna-pattern.ts` into `runtime-projection.ts` so the
  per-orbit downlink number reflects antenna gain, with the citation
  added to Row 5 d1 body header alongside P.618-14.
- Add a read-only Row 5 d4 `Antenna pattern` disclosure that calls the
  module's exports for the selected pair's frequency / elevation and
  renders the dB number with the citation, without changing throughput.

The acceptance gate G1 does not require either of these. Reviewers who
ask about antenna gain are pointed to the standalone module by file path
in Row 5 d3's reference list.

## 7. 60× replay continuity contract

The surface holds 60× replay continuously without breaking. Acceptance:

1. The reviewer opens a selected-pair URL with default 360-minute window.
2. Reviewer presses 60×. The window plays in 6 wall-clock minutes.
3. During those 6 minutes:
   - No uncaught console error.
   - The V4 panel does not re-mount. Its `data-state=ready` attribute stays
     set the entire time.
   - Frame rate does not drop below 30 fps on a 1080p Chromium baseline.
   - Tier-1 stats update or stay stable; they do not blank out.
   - Replay event pill emits at every handover event from the projection
     `handoverEvents` array.
4. At the end of the window, the replay clock reaches its stop time, the
   replay strip shows the paused state, and the panel still displays the
   final stats.

This is a hard acceptance gate. The 60× soak smoke is added in wave 4.

## 8. Any-2-station real-time compute contract

The surface accepts any valid pair from the registry:

1. The selection store accepts `setStation('stationA', id)` and
   `setStation('stationB', id)` for any registry id; on commit, the URL is
   replaced and the panel recomputes.
2. The panel issues a worker-thread projection request; the UI thread stays
   responsive.
3. Wall-clock time from `setStation` commit to `renderResult` (panel state
   `ready`) is under 1000 ms for the default 360-minute window on a
   baseline machine (Chromium 1217, 4-core, no GPU rasterization required by
   the compute itself — compute is CPU-only via `satellite.js`).
4. If both stations are valid but share no supported orbit class, the panel
   renders the empty-state row (`No mutual communication in this window`),
   not an error.
5. For the 5 sample demo URLs in
   `docs/itri-requirement-walkthrough.md` §3, the expected counts table in
   that document is reproduced exactly at the listed fixed time window.

Acceptance: a smoke script picks 10 random pairs from the registry, runs the
projection, asserts the budget. Lives at `scripts/`.

## 9. Information density rules

1. Rows 1–4 fit within the panel's max-height at 1280×800 without any
   internal scroll on the panel. The panel itself does not scroll; only
   Row 5 disclosure bodies scroll internally when opened.
2. Row 5 disclosures appear only in panel substate `ready` (per §3 panel
   substates). They never auto-expand.
3. Row 6 footer is one short line. Its visual weight is design-system
   territory; the contract is "minimum-noise truth-tier anchor". The full
   set of non-claim strings only renders inside Row 5 disclosure 3.
4. No element duplicates information present in another element. The
   current duplicate `Scenario status` heading
   (`v4-projection-side-panel.ts:317, 385`) is a known bug; this IA
   removes both call sites in favour of Row 3 stats + Row 4 lists.
5. Standards citations: the rain demo (Row 5 d1) inlines P.618-14 §2.2.1
   in the disclosure body header so reviewers do not need to open a second
   disclosure to find the source for that effect. The longer policy
   citation chain stays in Row 5 d3.

## 9a. Implementation freedom (intentionally unspecified)

This IA does not prescribe (and downstream slices are free to choose):

- Pixel positions (px / rem / clamp) for chrome zone anchors.
- The mechanism by which CSS reads state (data attribute, custom property,
  body class) — only the contract that state is reachable from CSS without
  per-tick JS.
- The truncation strategy for Row 1 title (CSS ellipsis, JS slice, etc.).
- Exact wording of empty-state copy (§4.4), idle-hint copy, Row 5
  disclosure titles. UX may iterate.
- The visual styling of Row 6 footer (opacity, font weight, height).
- The exact icon for the Copy-link affordance in Row 1.

## 10. Accessibility floor

Minimum:

1. Tab traversal in this order: selection chips (slot A clear, slot B
   clear, Apply CTA), station list picker (orbit + region + band filter
   chips inside the picker body, then list selects), rain slider, panel
   disclosures.
2. ARIA-live regions on selection changes (existing) and on handover events
   during replay (new in wave 2).
3. Marker info card closes on ESC.
4. Apply CTA reachable by keyboard and announces with explicit aria-label
   the resolved pair.

Focus trapping on the info card and full keyboard navigation among markers
remain deferred per R4 Block B; not required for delivery.

## 11. Out of scope this round

1. **V4 controller hot-mount on selection change in wave 1.** Wave 1
   mount-unification mounts the clean-home base surfaces (markers, chips,
   list picker, info card, hover tooltip) on every entry. The V4 panel +
   V4 controller endpoint surfaces continue to require a full page reload
   triggered by the chips' Apply CTA when going from "no pair" to "pair
   present". Wave 2 extends the seam to subscribe the panel + controller
   endpoint context to the selection store so a reselection during an
   existing session re-anchors without reload. Both waves keep
   `selection-store.ts` URL-replaceState semantics unchanged.
2. **Apply CTA semantic in wave 1** — Apply triggers a reload only when
   no V4 panel is mounted (e.g. user landed on `/` with no params, picked
   two stations, clicked Apply). When the panel is already mounted (URL
   carries a valid pair), Apply is hidden / no-op. The selection chips'
   `mountSelectionChips` already disables Apply when the snapshot is
   incomplete; the new behaviour adds "hide when panel already mounted".
3. Standalone marker-filter module cleanup — `marker-toggle.ts`,
   `marker-filter-panel.ts`, `marker-filter-chips.ts`,
   `marker-region-chips.ts`, `marker-band-chips.ts`,
   `marker-search-input.ts` exist on disk as parallel-session WIP but are
   not imported by `composition.ts`; removing them is a separate slice
   gated on R6 concurrent-session coordination.
4. Removal of dead inspector / boundary-surface / countdown DOM in the V4
   controller is wave 3; the controller's hidden HUD aside continues to
   carry state-bearing dataset attributes until then.
5. Existing operator-validated fixture path is preserved exactly. None of
   the IA changes alter that fixture or its consumers.
6. Antenna pattern (K-A3-a) wiring into the visible compute path is
   deferred (§6.1).

## 12. Resolved decisions (from 2026-05-17 SDD-review convergence)

Drawn from plan-design-review and codex-challenge findings:

1. Apply CTA tooltip / Copy-link: no tooltip on Apply. Row 1 carries a
   `📋 Copy link` icon that copies the current URL on click.
2. Row 3 stats: two flat numbers (`Comm time`, `Handovers`). Mean dwell
   moves to Row 5 d3.
3. Row 4 visibility ranking: chronological "next 3 by time", not
   "top 3 by duration". Top-by-duration list lives in Row 5 d2.
4. Replay event pill: single rolling pill, 4 s fade. Not a stack.
5. Tier badge: pill chip in Row 1 header matching the selection-chips
   tier-badge tokens. Not a panel left-border color.

## 13. State authority and propagation

The IA names a single state authority for each input dimension:

| Input dimension | Authority module | Reaches IA via |
| --- | --- | --- |
| selection (slot A, slot B) | `selection-store.ts` | `subscribe(snapshot)` |
| URL `startUtc`, `durationMinutes` | side-panel + V4 controller (each reads at re-mount) | URL read |
| URL validity (registry id resolvable?) | `v4-route-selection.ts` `resolveV4RouteSelection` | `resolvedPair` field |
| info card open/close | `station-info-card.ts` (panel state) | publishes `infoCardOpen` boolean via a small extension callback |
| replay clock (paused / playing / multiplier) | `replayClock` | existing replay-clock event stream |

The composition module owns the **derived display state**. It subscribes
to the selection store, the info card open state, and the replay clock,
and computes one of the five states in §3. The derivation lives in a new
helper `features/multi-station-selector/display-state.ts` (created in
wave 1). The helper exports `resolveDisplayState(inputs)` and
`subscribeDisplayState(...)` so composition can react without re-implementing
the rule for each surface.

Surface mount/unmount decisions key off the derived state, not the raw
inputs. Composition's pseudo-code:

```
const dispose: (() => void)[] = [];
function react(state) {
  if (state === 'projecting' || state === 'replaying') {
    if (!v4Panel) v4Panel = mountV4ProjectionSidePanel(...);
    if (!v4Endpoints) v4Endpoints = mountV4EndpointSurfaces(...);
  } else {
    v4Panel?.dispose(); v4Panel = null;
    v4Endpoints?.dispose(); v4Endpoints = null;
  }
}
subscribeDisplayState(react);
```

Wave 1 implements this for the V4 projection side panel (already an
independent mount). Wave 2 extends the contract to V4 controller endpoint
surfaces.
