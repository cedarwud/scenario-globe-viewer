# Selected-Pair Route Governance

## Status
Accepted

## Date
2026-05-30

## Context
The original ground-station demo route
`/?scenePreset=regional&m8aV4GroundStationScene=1` is fixture-driven. It remains
useful for historical regression coverage, but it is not the primary product
entry because its route state protects the old staged demonstration surface.

The selected-pair route is the current product path for ground-station
projection. It resolves public registry station IDs from URL state, computes a
runtime projection from bundled TLE and public registry inputs, and exposes the
result through the side panel, report actions, Cesium timeline, and selected
pair overlay.

## Decision
Use this selected-pair route as the primary demo entry and main active smoke
target:

```text
/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360
```

The legacy fixture route is compatibility-only:

```text
/?scenePreset=regional&m8aV4GroundStationScene=1
```

## Rules
- New visible CTAs must target the selected-pair route.
- New or migrated smoke tests should import selected-pair route constants from
  `scripts/helpers/demo-routes.mjs` instead of hard-coding route strings.
- New product smoke tests for the selected-pair panel, evidence drawer, report
  actions, replay controls, and overlay state should default to the selected-pair
  route above.
- Legacy fixture-route tests may remain only when they are explicitly checking
  historical fixture behavior or compatibility.
- Do not use the legacy fixture route as evidence for selected-pair runtime
  projection behavior.
- Do not introduce new active assertions that expect homepage CTA, primary
  product entry, or selected-pair evidence behavior from
  `m8aV4GroundStationScene=1`.
- Do not label selected-pair output as operator-validated traffic or measured
  service. The Taiwan-to-South-Africa pair is visibility-derived runtime
  projection evidence.

## Route Classes

`npm run verify:selected-pair-route-governance` enforces three route classes.

1. Active selected-pair route files
   - Homepage CTA.
   - Selected-pair route helper.
   - Active selected-pair smoke defaults.
   - Migrated selected-pair smoke gates, including V4.5 visual acceptance and
     V4.10 Slice 3 source-boundary affordance coverage, V4.10 Slice 4 evidence
     drawer coverage, V4.11 Slice 3 overlay concurrency coverage, V4.11 Slice 5
     source/report completeness coverage, and V4.12 F09 absence coverage.
   - These files must not reference the legacy fixture route directly or through
     `LEGACY_FIXTURE_DEMO_REQUEST_PATH`.

2. Compatibility route owners
   - `scripts/helpers/demo-routes.mjs` (`route-constant-owner`).
   - `src/runtime/m8a-v4-ground-station-projection.ts`
     (`tier1-operator-validated-fixture-owner`).
   - The governance verifier itself
     (`selected-pair-route-governance-gate`).
   - These files are allowed to preserve the long-form fixture route because the
     application still accepts historical links and fixtures.

3. Historical fixture coverage
   - Tier-1 source-boundary smokes: V4.3, V4.6B, and V4.6D.
   - Reviewer package scripts that reproduce external-authority or measured
     traffic package boundaries.
   - No selected-pair migration-candidate smoke remains after V4.11 Slice 3
     moved through overlay governance instead of mechanical route replacement.
   - No pending selected-pair replacement smoke remains after V4.11 Slice 5
     moved through source/report completeness coverage.
   - Historical compatibility: V4.11 Correction Phase C remains a fixture
     product-shell regression.

Any new `src/`, `scripts/`, or `tests/smoke/` file that references the legacy
fixture route without matching one of these classes fails the governance check.

## Closure Stop Point

The route-retirement migration is closed after the sixteenth slice. Do not
continue reducing the remaining legacy-route references under this same task.

The expected remaining references are governance or evidence holders, not active
selected-pair demo-route candidates:

- 1 route constant owner.
- 1 selected-pair route governance gate.
- 1 Tier-1 operator-validated fixture owner.
- 2 reviewer/source-boundary packages.
- 3 Tier-1 fixture/source-boundary smokes.
- 1 historical compatibility product-shell smoke.

The verifier should report:

- 9 remaining legacy route reference files.
- 0 retired legacy route files.
- 0 unclassified legacy route references.
- 0 selected-pair migration candidates.
- 0 pending selected-pair replacements.

Further cleanup is a separate governance decision, not more demo-route
retirement. It would mean retiring Tier-1 fixture evidence, reviewer
source-boundary packages, or historical compatibility coverage. Do not fold that
decision into selected-pair route migration work.

Retired route-file classes are stricter. The following file shapes must not be
reintroduced:

- `tests/smoke/verify-*-demo-route-*`
- `tests/smoke/verify-*-demo-view-*`
- `scripts/capture-*-demo-view-phase5-reviewer-evidence.mjs`
- `tests/smoke/verify-m8a-v4.11-impl-phase4-reviewer-mode-runtime.mjs`
- Fixed-fixture product smoke files retired in the second route-retirement
  slice:
  - `tests/smoke/verify-m8a-v4.6a-full-leo-orbit-replay-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.6e-handover-visual-language-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.7-handover-product-ux-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.8-handover-demonstration-ui-ia-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs`
  - `tests/smoke/helpers/m8a-v4-product-comprehension-*.mjs`
  - `tests/smoke/verify-m8a-v4.10-slice1-first-viewport-composition-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.10-slice2-handover-sequence-rail-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.10-slice5-validation-matrix-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.11-slice2-hover-popover-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.11-slice4-transition-toast-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.11-conv1-visual-tokens-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.11-conv2-hover-inspector-countdown-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.11-conv3-footer-truth-removal-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.11-conv4-sources-demote-smoke-matrix-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.11-correction-a-phase-b-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.11-correction-a-phase-d-runtime.mjs`
  - `tests/smoke/verify-m8a-v4.11-correction-a-phase-e-runtime.mjs`

## Migration Notes
The first migration slice moved the homepage entry CTA and the two active
selected-pair smoke defaults to the Taiwan selected-pair route. Follow-up
cleanup should classify remaining fixture-route smoke files as historical or
replace their active product assertions with selected-pair route assertions.
The second slice introduced `scripts/helpers/demo-routes.mjs` so future active
smoke work uses named selected-pair and legacy-compatibility constants rather
than anonymous duplicate route literals.
It also added `npm run verify:selected-pair-route-governance`, which fails if
homepage or selected-pair active smoke files point back to the legacy fixture
route.
Do not mechanically migrate reviewer-mode or fixture product-demo smokes: several
of those tests assert legacy product controls, fixed actor ids, or bundle claim
scans and are historical/compatibility coverage rather than selected-pair gates.
The third slice made the governance verifier enumerate all legacy fixture-route
references in active source, scripts, and smoke tests. This keeps the route
accepted for old links while preventing it from silently becoming the main
product evidence path again.
The fourth slice deleted the standalone demo-route/demo-view smoke family and
one obsolete reviewer-mode runtime smoke. The governance verifier now fails if
those retired file shapes are restored.
The fifth slice removed fixed-fixture product smoke package keys and files that
two read-only deletion audits agreed were not selected-pair product gates. It
kept contract or migration candidates in place: V4.3, V4.5, V4.6B, V4.6D, V4.9,
V4.10 Slice 3/4, V4.11 Slice 3/5, V4.11 Conv 2/3/4, V4.11 Correction Phase C,
and V4.12 F09.
The sixth slice migrated V4.5 visual acceptance and V4.12 F09 absence coverage
from the legacy fixture route to the selected-pair route. The V4.6B package
script no longer runs V4.5 as a nested fixture smoke; V4.6B stays focused on
source-boundary contracts.
The seventh slice wired route governance into the default local and CI gates:
`npm test` now runs `npm run verify:selected-pair-route-governance` before the
build, and `.github/workflows/structural-gates.yml` runs the same check before
build and browser smoke. The governance verifier also checks those wiring
points so the gate cannot be removed silently.
The eighth slice deleted V4.11 Conv 2 and Conv 3 old product-shell smokes. Their
hover/countdown and footer-chip assertions belonged to the fixed-fixture product
UX shell, not to the selected-pair route; any surviving overlay/source value
should be reintroduced only through selected-pair drawer, report, or overlay
governance smokes.
The ninth slice retired the V4.9 product-comprehension smoke family. The smoke
and helper modules encoded the fixed-fixture 13-actor product shell; active
selected-pair comprehension should be covered by selected-pair panel, drawer,
report, route, and overlay gates instead.
The tenth slice migrated the link-flow cue smoke to the selected-pair route.
It now checks selected-pair link-flow segments, pulse billboards, motion, and
display-only source boundaries from the TLE-first runtime overlay instead of
fixture-route relation-cue telemetry.
The eleventh slice deleted V4.11 Conv 4 source-demotion smoke. Its legacy
fixture inspector assertions duplicated stronger V4.11 Slice 5 source-boundary
coverage and did not provide unique selected-pair route evidence.
The twelfth slice refined the governance status labels for retained legacy
references. Tier-1 fixture/source-boundary holders, reviewer packages,
selected-pair migration candidates, and pending selected-pair replacements are
now reported separately instead of being collapsed into a generic historical
fixture bucket.
The thirteenth slice migrated V4.10 Slice 4 to the selected-pair route. Its
active coverage now checks the `Details & sources` drawer, shared overlay state,
and evidence report artifact instead of the fixed-fixture product inspector.
The fourteenth slice migrated V4.10 Slice 3 to the selected-pair route. Its
active coverage now checks the compact source-boundary affordance in the panel,
the secondary `Source boundary` disclosure inside `Details & sources`, and the
non-claim boundary that keeps source evidence separate from report actions.
The fifteenth slice migrated V4.11 Slice 3 to the selected-pair route. Its
active coverage now checks shared selected-pair overlay arbitration:
`Details & sources` opens through the drawer owner, suppresses transient marker
hover, keeps report actions from mutating overlay state, and preserves blocking
state when another selected-pair overlay is visible.
The sixteenth slice migrated V4.11 Slice 5 to the selected-pair route. Its
active coverage now checks selected-pair source/report completeness: pair-source
attribution, station coordinate and elevation source rows, bundled TLE source
manifest rows, runtime inventory, modeled-output assumptions, policy/model
tables, raw JSON evidence, and non-claim boundaries.
