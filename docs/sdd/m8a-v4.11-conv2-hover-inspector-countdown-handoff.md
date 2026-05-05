# M8A-V4.11 Conv 2 — Hover + Inspector Single-Role + Countdown Handoff

Date: 2026-05-04
Status: implementation complete, Conv 2 closeout
Origin: planning/control approval of M8A-V4.11 Storyboard Rewrite Proposal v2 + Addendum 1
Predecessor: Conv 1 visual tokens + scene-context chip + ground-station chip
(`m8a-v4.11-conv1-visual-tokens-handoff.md`)

## Conv 2 scope (window-narrowed; per Conv 2 brief)

This conversation implemented exactly the Conv 2 surface; no Conv 3 / 4 work
leaked in. Specifically:

- **Slice 2 hover popover content** rewritten to phase-specific 3-line
  Chinese copy across all 5 V4.6D windows (W1 acquisition / W2 aging /
  W3 hold / W4 re-entry / W5 guard). Ground-station and sequence-rail
  hover targets shrunk to 3 lines.
- **Inspector** collapsed from concurrent State Evidence + Truth Boundary
  roles to a **single State Evidence role** with the Addendum §1.2
  layperson Chinese paragraph as the primary visible content. Truth
  content is merged into the State Evidence section as a tail
  `<section>` (still bearing `data-m8a-v411-inspector-role='truth-boundary'`
  for V4.10 / V4.11 Slice 5 backward compat) rendered only when the Truth
  button is clicked.
- **Truth button** still present (Conv 3 will remove). Click handler
  routes to State Evidence: `boundaryDisclosureOpen=true` continues to
  trigger the Truth tail (V4.10 Slice 4 boundary path), and the State
  Evidence section is now also visually open whenever the inspector is
  open.
- **Countdown surface** (new) wired to V4.6D `replayRatio` + active
  `window.{startRatioInclusive, stopRatioExclusive}` per Addendum §1.1
  derivation rule. Per-window phrase + `~N 分鐘 / ~N 秒` approximate
  display + `~ 為模擬推演值` footnote.

Items explicitly **not** touched (locked for Conv 3 / 4):

- Footer chip system (Conv 3)
- Truth button removal (Conv 3)
- State strip / sequence rail / corner provenance badge (Conv 3)
- Slice 5 Sources affordance (Conv 4)
- Slice 0 reviewer-protocol (Conv 4)
- V4.8 / V4.9 / V4.10 invariant smoke (Conv 4 / never)
- R2 read-only catalog promotion
- Raw ITRI side-read

## Changed and added files

```
A  src/runtime/m8a-v411-countdown-surface.ts                       (new)
A  src/styles/m8a-v411-countdown.css                               (new)
A  tests/smoke/verify-m8a-v4.11-conv2-hover-inspector-countdown-runtime.mjs  (new)
A  docs/sdd/m8a-v4.11-conv2-hover-inspector-countdown-handoff.md   (this doc)
M  src/runtime/m8a-v411-hover-popover.ts                           (5×3 line phase-specific Chinese copy + window/role token wiring)
M  src/runtime/m8a-v411-inspector-concurrency.ts                   (Addendum §1.2 Chinese title + paragraph + V4.10/V4.8/V4.9 backward-compat detail + truth tail metadata)
M  src/runtime/m8a-v4-ground-station-handover-scene-controller.ts  (single-role State Evidence rendering, Truth tail visibility, countdown surface mount, Truth button scroll target)
M  src/styles/m8a-v411-inspector-concurrency.css                   (state-evidence-detail + state-evidence-truth-tail styling)
M  src/styles.css                                                  (@import the new countdown stylesheet)
M  tests/smoke/verify-m8a-v4.11-slice2-hover-popover-runtime.mjs   (Smoke Softening: 3-line phase-specific Chinese schema)
M  tests/smoke/verify-m8a-v4.11-slice3-inspector-concurrency-runtime.mjs (Smoke Softening: single-role + Addendum §1.2 Chinese title/copy + Truth tail compat per Addendum §1.7)
```

## Screenshots (1440×900)

All in `output/m8a-v4.11-conv2/`:

- `v4.11-conv2-w1-hover-1440x900.png` — W1 focus LEO hover, 3-line Chinese
- `v4.11-conv2-w3-hover-1440x900.png` — W3 focus MEO hover
- `v4.11-conv2-w4-hover-candidate-1440x900.png` — W4 focus LEO (re-entry / candidate)
- `v4.11-conv2-w5-hover-1440x900.png` — W5 focus GEO
- `v4.11-conv2-w2-countdown-1440x900.png` — W2 countdown surface visible
- `v4.11-conv2-w3-inspector-1440x900.png` — W3 single-role inspector (State Evidence only)
- `v4.11-conv2-truth-button-1440x900.png` — Truth click also opens State Evidence

Manifest: `output/m8a-v4.11-conv2/capture-manifest.json` lists every
capture, the W2 worked-example calculation, and the per-window countdown
derivation values.

## Smoke regression results

| Smoke | Result | Notes |
| --- | --- | --- |
| `verify-m8a-v4.11-conv2-hover-inspector-countdown-runtime.mjs` (new) | ✅ | 7 captures + countdown derivation + monotone decrease + W2 worked example |
| `verify-m8a-v4.11-conv1-visual-tokens-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.11-slice2-hover-popover-runtime.mjs` | ✅ | softened (Smoke Softening Disclosure §1) |
| `verify-m8a-v4.11-slice3-inspector-concurrency-runtime.mjs` | ✅ | softened (Smoke Softening Disclosure §2; Addendum §1.7 design-switch) |
| `verify-m8a-v4.11-slice4-transition-toast-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.11-slice5-real-data-surfacing-runtime.mjs` | ✅ | unchanged; truth-boundary role section still mounts so three-role concurrency continues to assert |
| `verify-m8a-v4.10-slice1-first-viewport-composition-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.10-slice2-handover-sequence-rail-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.10-slice3-boundary-affordance-separation-runtime.mjs` | ✅ | unchanged; sheet text still includes Truth tail phrases via the Truth-tail role visible after Truth click |
| `verify-m8a-v4.10-slice4-inspector-evidence-redesign-runtime.mjs` | ✅ | unchanged; W1 V4.11 path still detects "State Evidence" + "LEO review focus" + the V4.10 W1 paragraph in primarySections["current-state"] (legacy detail block) |
| `verify-m8a-v4.10-slice5-validation-matrix-runtime.mjs` | ✅ | unchanged |
| `verify-m8a-v4.9-product-comprehension-runtime.mjs` | ✅ | unchanged; V4.11 inspector primary-text branch matches because legacy-detail block still names productLabel + "window N of 5" |
| `verify-m8a-v4.8-handover-demonstration-ui-ia-runtime.mjs` | ✅ | unchanged; V4.11 W1–W5 baseline English paragraphs preserved verbatim in legacy-detail block |
| `verify-m8a-v4.6d-simulation-handover-model-runtime.mjs` | ✅ | unchanged (V4.6D contract intact) |

V4.7 was already failing on `main` before Conv 1 (pre-existing provenance
badge / details-close target overlap, see Conv 1 handoff). This pre-existing
failure is **not** a Conv 2 regression. Out of Conv 2 closeout scope per
the brief (`V4.10 / V4.9 / V4.8 + Slice 1 / 2 / 3 / 4 / 5 invariant smoke
全綠`); should be picked up independently.

## §Smoke Softening Disclosure (Lock-in J)

Per Conv 2 brief and Lock-in J disclosure rule, exactly **two** existing
smoke surfaces were softened by Conv 2:

### §1 — Slice 2 hover popover schema (per Conv 2 brief allowance)

| Smoke | Old assertion | New assertion (Conv 2) | Justification |
| --- | --- | --- | --- |
| `tests/smoke/verify-m8a-v4.11-slice2-hover-popover-runtime.mjs` | 5-line satellite popover keyed on `Eutelsat OneWeb`, `LEO · focus role`, `TLE source: …`, `low-latency context class`, `display context, not active serving`. Ground-station 4 lines including triplet `LEO strong · MEO strong · GEO strong` + sources count. Sequence-rail 3 lines using the V4.11 baseline storyboard tokens. `lineCount >= 3` was permissive. | 3-line satellite popover keyed on phase-specific Chinese (e.g. W1 `OneWeb LEO · 現在看這顆 / 連線品質：強 / 服務時間:~22 分鐘`). Ground-station 3-line layperson Chinese. Sequence-rail 3-line layperson Chinese. `lineCount === 3` is now exact-match. | Storyboard rewrite proposal §Per-window rewrite + Addendum §1.2 require phase-specific 3-line layperson copy across all hover targets. The old tokens were engineering vocabulary that did not answer per-window operator concerns. |

### §2 — Slice 3 inspector role structure (per Conv 2 brief allowance + Addendum §1.7 design switch)

| Smoke | Old assertion | New assertion (Conv 2) | Justification |
| --- | --- | --- | --- |
| `tests/smoke/verify-m8a-v4.11-slice3-inspector-concurrency-runtime.mjs` | After Details + Truth click sequence: state-evidence visible AND truth-boundary visible (concurrent two-role spec). `result.stateRole.title === "LEO review focus"` and `result.stateRole.copy === EXPECTED_W1_STATE_EVIDENCE` (V4.11 baseline English W1 paragraph). | After Details + Truth click sequence: state-evidence visible (single-role primary), and the Truth-tail section (still named `truth-boundary` in DOM for V4.10 / V4.11 Slice 5 backward compat) declares `data-m8a-v411-inspector-conv2-tail-of-state-evidence='true'`. State Evidence W1 title = `"剛接上 OneWeb LEO · LEO review focus"`, copy = Addendum §1.2 layperson Chinese, detail = V4.11 baseline W1 English paragraph (kept as backward-compat detail block). | Storyboard rewrite proposal §Inspector becomes single-role + Addendum §1.7 explicitly acknowledges the design switch from concurrency (V4.11 SDD §Slice 3) to single-role with Truth content merged. The Truth-boundary `<section>` element survives as a tail container so V4.10 Slice 4 (`fullTruth.visible === true` after Truth click) and V4.11 Slice 5 three-role concurrency continue to pass. |

The Truth content visible-text invariants required by V4.10 Slice 3 / 4
(sheet contains `Truth Boundary` / `Truth boundary` / `Simulation review`
/ `not an operator handover log` / `No active gateway assignment is
claimed` / `No native RF handover is claimed`) are preserved by the
Truth-tail section's existing `<strong>Truth boundary</strong>` heading
and disclosure-line `<ul>`.

The V4.10 Slice 4 V4.11 detection branch (`v411StateEvidenceInspector`)
also continues to match because the State Evidence section's primary
section innerText still contains `State Evidence`, `LEO review focus`,
`The simulation review is currently anchored on the OneWeb LEO context
marked as the focus role.`, and `Endpoint precision remains
operator-family only and no active gateway is being claimed.` (now via
the title + Conv 2 detail block).

V4.9 inspector matrix and V4.8 inspector body checks for each of W1–W5
also continue to pass because each window's State Evidence section
still contains the V4.6D product label (e.g. `LEO pressure`),
`window N of 5` ordinal marker, and the V4.11 baseline English
paragraph.

## Addendum §1.1 countdown derivation

```
withinWindowFraction = (replayRatio - window.startRatioInclusive)
                       / (window.stopRatioExclusive - window.startRatioInclusive)
remainingFraction = 1 - withinWindowFraction
remainingSimulatedSec = remainingFraction
                        × (window.stopRatioExclusive - window.startRatioInclusive)
                        × FULL_REPLAY_SIMULATED_SECONDS
displayString = formatApproximate(remainingSimulatedSec)
              = "~N 分鐘"  if remainingSimulatedSec  >  60
              = "~N 秒"    if remainingSimulatedSec  ≤  60
```

`FULL_REPLAY_SIMULATED_SECONDS` is derived from
`M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.replayDurationMs / 1000`
(V4.6A baseline = longest current OneWeb LEO orbital period + 5-minute
margin; ≈ 6900 s / 115 min for the current TLE batch). It is **not** a
new V4.6D contract field; both `replayRatio` and `window` are existing
V4.6D inputs. The countdown is a deterministic derivation, not a
measured / claimed metric, and the
`Forbidden-Claim Scan` policy is unchanged because the derivation does
not touch the listed `numericLatencyAllowed / JitterAllowed /
ThroughputAllowed` keys.

The countdown surface always renders the `~ 為模擬推演值` footnote so
reviewers do not mistake the value for a measured countdown.

### Worked example — W2, replayRatio = 0.30

V4.6D `leo-aging-pressure` window: `startRatioInclusive = 0.20`,
`stopRatioExclusive = 0.40`. With the current TLE batch
`FULL_REPLAY_SIMULATED_SECONDS ≈ 6900 s`:

```
withinWindowFraction  = (0.30 - 0.20) / (0.40 - 0.20)
                      = 0.10 / 0.20
                      = 0.50
remainingFraction     = 1 - 0.50 = 0.50
remainingSimulatedSec = 0.50 × 0.20 × 6900
                      = 0.10 × 6900
                      = 690 s
                      = 11.5 min
displayString         = "~12 分鐘"   (formatApproximate rounds to nearest minute when seconds > 60)
```

Equivalently, the simplified form `(stopRatioExclusive - replayRatio) ×
FULL_REPLAY_SIMULATED_SECONDS = 0.10 × 6900 ≈ 690 s` yields the same
result — useful for quick mental checks.

The Conv 2 negative smoke
(`assertCountdownDerivation` + `verifyW2WorkedExample`) checks both the
recorded `withinWindowFraction` / `remainingSimulatedSec` data
attributes against this derivation per per-window seek and the W2
ratio = 0.30 case explicitly. The `verifyCountdownDecreasesAcrossPlayback`
check also confirms the surface monotonically decreases as the replay
clock advances (here from ratio = 0.22 → ratio = 0.32 within W2).

## Truth-button transitional behavior (Conv 2 → Conv 3)

Per the Conv 2 brief, the Truth button is **kept** in Conv 2; only the
inspector role structure changes. The button's click handler still
routes through `toggle-boundary` and sets `boundaryDisclosureOpen=true`
(V4.10 Slice 3 / 4 contract preserved), but with two Conv 2 changes:

1. The State Evidence section is rendered visible whenever
   `detailsSheetState === "open"` **or** `boundarySurfaceState === "open"`,
   so the Truth button click now opens the inspector showing the
   Addendum §1.2 layperson Chinese paragraph (single-role primary) — same
   visible content as a Details click.
2. The Truth-tail section (renamed to declare
   `data-m8a-v411-inspector-conv2-tail-of-state-evidence='true'`) is
   visible only on Truth click. Its content (truth headings + 7
   disclosure lines) is identical to the V4.11 baseline Truth Boundary
   role; this preserves the V4.10 Slice 4 boundary-click branch and the
   V4.11 Slice 5 three-role concurrency assertion.

Net effect: **Truth and Details are visually equivalent in Conv 2** —
both open the inspector to State Evidence. Truth click adds the Truth
tail at the bottom; Details click does not. This is a transitional
state that Conv 3 will retire by removing the Truth button entirely.

The runtime seam `data-m8a-v411-truth-affordance-conv2-behavior` records
this transition explicitly (`opens-state-evidence-with-truth-tail-visible`).

## Conv 2 invariants explicitly confirmed

- ✅ Route unchanged: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- ✅ Endpoint pair unchanged: `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- ✅ Precision unchanged: `operator-family-only`
- ✅ Actor set unchanged: 6 LEO / 5 MEO / 2 GEO (13 total)
- ✅ V4.6D model contract unchanged (no new fields, no role rename, no
  positive-claim addition)
- ✅ R2 still read-only (no runtime selector authority)
- ✅ Conv 1 surfaces (5 visual tokens, scene-context chip,
  ground-station short chip, demoted-actor 30 % opacity) untouched in
  behavior or sizing
- ✅ Truth button retained (Conv 3 will remove)
- ✅ Footer / corner provenance badge / state strip / sequence rail
  untouched (Conv 3)
- ✅ Slice 5 Sources affordance untouched (Conv 4)
- ✅ Slice 4 toast smoke unchanged
- ✅ V4.10 / V4.9 / V4.8 invariant smokes unchanged
- ✅ No measured-metric / latency / jitter / throughput numeric text
  added anywhere
- ✅ Countdown derivation does not introduce a new V4.6D field — uses
  existing `replayRatio` + `window.{startRatioInclusive,
  stopRatioExclusive}` inputs and the V4.6A baseline
  `FULL_REPLAY_SIMULATED_SECONDS`
- ✅ No raw ITRI side-read added
- ✅ No `Cesium.Viewer` instantiation outside the existing controller

## Runtime seam summary

The Conv 2 surface adds the following stable runtime seams (used by
smoke and downstream conversations):

- `data-m8a-v411-hover-conv2-schema="phase-specific-three-line"` (root
  + every hover target)
- `data-m8a-v411-inspector-conv2-behavior="single-state-evidence-role-truth-button-shows-state-evidence"`
- `data-m8a-v411-inspector-primary-role="state-evidence"`
- `data-m8a-v411-state-evidence-detail="true"` on the V4.10 / V4.8 / V4.9
  backward-compat detail block
- `data-m8a-v411-state-evidence-truth-tail="true"` and
  `data-m8a-v411-inspector-conv2-tail-of-state-evidence="true"` on the
  Truth-tail section (still bears
  `data-m8a-v411-inspector-role='truth-boundary'` for V4.10 / Slice 5
  compat)
- `data-m8a-v411-state-evidence-triggered-by-details` /
  `data-m8a-v411-state-evidence-triggered-by-truth` on the State Evidence
  section
- `data-m8a-v411-truth-affordance-conv2-behavior="opens-state-evidence-with-truth-tail-visible"`
- `data-m8a-v411-countdown-surface="m8a-v4.11-countdown-surface-conv2-runtime.v1"`
  (root + countdown surface element)
- `data-m8a-v411-countdown-derivation="addendum-1.1"`
- `data-m8a-v411-countdown-window-id`,
  `data-m8a-v411-countdown-replay-ratio`,
  `data-m8a-v411-countdown-start-ratio`,
  `data-m8a-v411-countdown-stop-ratio`,
  `data-m8a-v411-countdown-within-window-fraction`,
  `data-m8a-v411-countdown-remaining-fraction`,
  `data-m8a-v411-countdown-remaining-simulated-sec`,
  `data-m8a-v411-countdown-full-replay-simulated-sec`,
  `data-m8a-v411-countdown-approximate-display`
- `data-m8a-v411-countdown-primary-text`,
  `data-m8a-v411-countdown-appendix-text`,
  `data-m8a-v411-countdown-footnote-text="~ 為模擬推演值"`
- `data-m8a-v411-countdown-font-size-px="14"`,
  `data-m8a-v411-countdown-gap-from-micro-cue-px="8"`

The Slice 2 hover surface module ID
(`m8a-v4.11-hover-popover-slice2-runtime.v1`) and the Slice 3 inspector
concurrency module ID
(`m8a-v4.11-inspector-concurrency-slice3-runtime.v1`) are intentionally
unchanged — Slice 4, Slice 5, V4.10 and earlier smokes that key on
those constants continue to detect the seam.

## Production GPU validation gate (Lock-in L) — explicit non-claim

This handoff makes **no fps claim** for production. Conv 2 smoke captures
geometry / DOM seam / countdown-derivation invariants on the SwiftShader
software-rendering harness used by Conv 0 spike + Conv 1. Conv 4
closeout will re-evaluate frame-budget on a real GPU instance per
Lock-in L; that is out of Conv 2 scope by explicit instruction.

## Reproduction

```sh
cd /home/u24/papers/scenario-globe-viewer
npm run build
node tests/smoke/verify-m8a-v4.11-conv2-hover-inspector-countdown-runtime.mjs
ls output/m8a-v4.11-conv2/
```

## Returning to planning/control

Conv 2 closeout returns the following invariants to the planning/control
total reconciliation:

- 5 phase-specific 3-line satellite hover popover entries (W1–W5) +
  3-line ground-station + 3-line sequence-rail content live across all
  V4.6D windows
- Inspector consolidated to a single State Evidence role with Addendum
  §1.2 layperson Chinese paragraph as the primary visible content;
  Truth content merged as a tail section (still mounting under
  `data-m8a-v411-inspector-role='truth-boundary'` for V4.10 + Slice 5
  invariant compat)
- Truth button retained but transitional — both Truth and Details click
  open the inspector to State Evidence; Truth additionally exposes the
  Truth tail. Conv 3 will remove the button.
- Countdown surface live, derived from V4.6D `replayRatio` + window
  range per Addendum §1.1 with `~ 為模擬推演值` footnote
- Two Smoke Softening Disclosures applied (Slice 2 hover schema, Slice 3
  inspector role structure); all V4.10 / V4.9 / V4.8 invariant smokes
  unchanged and green
- No Conv 3 / 4 scope leak (no footer, no Truth removal, no Slice 5
  demote, no V4.8 / 9 / 10 smoke modification)
- No V4.6D contract / route / pair / precision / actor-set / R2 change
- No measured-metric text added; countdown is a deterministic
  derivation of two existing V4.6D inputs and a V4.6A baseline value
