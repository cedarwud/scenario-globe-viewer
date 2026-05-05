# M8A-V4.11 Follow-up Smoke Matrix Corrective Handoff

Date: 2026-05-05
Status: corrective smoke/runtime/package repair complete; validation re-run complete
Supersede basis:
`docs/sdd/m8a-v4.11-correction-a-itri-requirement-driven-details-and-layout-plan.md`
Follow-up diagnosis:
`docs/sdd/m8a-v4.11-followup-smoke-regression-diagnosis.md`

## Honest Correction Header

The Slice 6 handoff validation table in commit `a93876f`, recorded in
`docs/sdd/m8a-v4.11-slice6-validation-matrix-final-handoff.md`, claimed the
V4.8 / V4.9 / V4.10 / V4.11 Conv 1-4 smoke matrix as "all PASS" too early.
That claim was not reproducible from the requested npm-command re-run captured
in the follow-up diagnosis. This file records the actual corrective work, the
successor smoke disclosures, and the re-run validation matrix.

The Slice 6 reviewer gate itself remains accepted: 3 reviewers x 5/5 remains
the primary reviewer acceptance evidence. This corrective pass only reconciles
older smoke contracts and missing package aliases with the already-accepted
Correction A layout.

## Scope Boundaries

Unchanged:

- Route and endpoint pair.
- Precision contract and 13-actor set.
- V4.6D handover model id.
- R2 read-only posture.
- Correction A left rail / scope strip / four-tab Details / W3 800 km disk /
  W4 candidate halo layout.
- Slice 6 reviewer transcript and reviewer-gate conclusion.

Not done:

- No amend, rebase, commit, push, or force push.
- No Correction A layout restoration.
- No new product claim text or metric claim text.
- No raw ITRI side-read or live source-read path.

## Runtime Correction

V4.8 still requires every visible product text node under the runtime product
surface to carry an accepted `data-m8a-v48-info-class` value. Correction A
introduced visible left handover rail slots after that contract was written.

Runtime reinforcement:

- Left handover rail slot text nodes now carry
  `data-m8a-v48-info-class="dynamic"`.
- Static inspector module labels that are visible in the same product surface
  now carry `data-m8a-v48-info-class="fixed"`.

No visible text, layout, route, endpoint, precision, actor, or source-boundary
behavior was changed for this runtime correction.

## Package Alias Correction

Added npm aliases for the Conv smoke matrix:

| Alias | Target |
| --- | --- |
| `test:m8a-v4.11:conv1` | `node tests/smoke/verify-m8a-v4.11-conv1-visual-tokens-runtime.mjs` |
| `test:m8a-v4.11:conv2` | `node tests/smoke/verify-m8a-v4.11-conv2-hover-inspector-countdown-runtime.mjs` |
| `test:m8a-v4.11:conv3` | `node tests/smoke/verify-m8a-v4.11-conv3-footer-truth-removal-runtime.mjs` |
| `test:m8a-v4.11:conv4` | `node tests/smoke/verify-m8a-v4.11-conv4-sources-demote-smoke-matrix-runtime.mjs` |

Conv 3 and Conv 4 were the missing aliases identified in the diagnosis. Conv 1
and Conv 2 aliases were also added because the requested validation matrix uses
`npm run test:m8a-v4.11:conv1` through `conv4` uniformly.

## Smoke Softening Disclosure

Per Lock-in J, each older smoke relaxation is explicit and tied to Correction A
as the successor contract. These soften only assertions superseded by
Correction A; the hard route, endpoint, actor, precision, model, forbidden
claim, source-boundary, and source identity checks remain hard.

| Smoke | Disclosure |
| --- | --- |
| V4.8 | Correction A Phase B adds a visible left handover rail. The V4.8 info-class smoke now accepts those new rail text nodes only when they carry the existing `dynamic` class. The five-window order, V4.6D model, endpoint identity, pair, precision, 13 actors, source-boundary scan, and forbidden-claim scan remain unchanged. |
| V4.9 | Correction A §Footer chip system intentionally makes ambient disclosure chips default-visible: `[模擬展示]`, `[TLE: CelesTrak NORAD GP · 2026-04-26]`, `[operator-family precision]`, `[13 actors]`, plus the top scope/replay context. These strings are removed from the V4.9 default-visible denied-list path only as Correction A ambient disclosure. Forbidden claims, metadata demotion, and transition non-blocking checks remain hard. |
| V4.10 Slice 1 | Correction A §5.2/§5.3 supersedes the old first-viewport geometry baseline. The geometry assertion now accepts either the legacy V4.10 baseline delta or the Correction A successor geometry: `currentStrip.left ~= 340` with `focus · LEO`. Other first-viewport, forbidden-claim, source, route, and actor invariants remain hard. |
| V4.10 Slice 2 | Same successor pattern as Slice 1: the old geometry baseline remains accepted, and Correction A `currentStrip.left ~= 340` plus `focus · LEO` is also accepted. Sequence rail, transition, source, route, endpoint, actor, and forbidden-claim invariants remain hard. |
| V4.10 Slice 3 | Same successor pattern as Slice 1: Correction A left rail/scope-strip geometry is accepted alongside the legacy baseline. Boundary affordance separation, source-boundary, route, endpoint, actor, and forbidden-claim invariants remain hard. |
| V4.10 Slice 4 | Correction A supersedes the legacy first-read layout, but this smoke had no hard old strip-left assertion. The disclosure records that the current right Details / Evidence successor layout is expected, while inspector evidence, source-boundary, route, endpoint, actor, and forbidden-claim invariants remain hard. |
| V4.10 Slice 5 | Correction A supersedes the legacy first-read layout, but this smoke had no hard old strip-left assertion. The disclosure records that the current source/evidence successor layout is expected, while validation matrix, source-boundary, route, endpoint, actor, R2 read-only, and forbidden-claim invariants remain hard. |

## Additional Conv 3/4 Successor Notes

The initial diagnosis classified Conv 3 and Conv 4 as package-alias failures.
After aliases were added, the real npm runs exposed two narrow Correction A
successor assertion drifts:

- Conv 3 bottom-layout assertion now accepts either the legacy footer stack or
  the Correction A successor stack where the left rail and footer keep the
  accepted rail/footer sizes while the bottom offsets reflect Correction A.
- Conv 4 advanced source-provenance assertion now accepts opening Sources from
  the Correction A Evidence-tab path when the resulting Sources role owns the
  advanced trigger and complete 13 / 2 / 5 source counts.

No Conv 3 or Conv 4 runtime layout was changed by these assertion corrections.

## Actual Validation Matrix

| Command | Result | Note |
| --- | --- | --- |
| `npm run test:m8a-v4.7.1` | PASS | Successor smoke green; V4.7 legacy disposition remains separate. |
| `npm run test:m8a-v4.8` | PASS | Rail info-class reinforcement verified. |
| `npm run test:m8a-v4.9` | PASS | Correction A ambient disclosure accepted. |
| `npm run test:m8a-v4.10:slice1` | PASS | Accepted geometry contract: V4.11 Correction A successor. |
| `npm run test:m8a-v4.10:slice2` | PASS | Accepted geometry contract: V4.11 Correction A successor. |
| `npm run test:m8a-v4.10:slice3` | PASS | Accepted geometry contract: V4.11 Correction A successor. |
| `npm run test:m8a-v4.10:slice4` | PASS | Existing hard invariants preserved. |
| `npm run test:m8a-v4.10:slice5` | PASS | Existing hard invariants preserved. |
| `npm run test:m8a-v4.11:slice1` | PASS | First run hit transient `tilesLoaded=false`; rerun passed. |
| `npm run test:m8a-v4.11:slice2` | PASS | Browser smoke green. |
| `npm run test:m8a-v4.11:slice3` | PASS | Browser smoke green. |
| `npm run test:m8a-v4.11:slice4` | PASS | Browser smoke green. |
| `npm run test:m8a-v4.11:slice5` | PASS | Browser smoke green. |
| `npm run test:m8a-v4.11:slice6` | PASS | Artifact/reviewer verifier green. |
| `npm run test:m8a-v4.11:conv1` | PASS | Alias added; local static-server run required escalated sandbox permission. |
| `npm run test:m8a-v4.11:conv2` | PASS | Alias added; local static-server run required escalated sandbox permission. |
| `npm run test:m8a-v4.11:conv3` | PASS | Alias added; bottom-layout assertion aligned to Correction A successor. |
| `npm run test:m8a-v4.11:conv4` | PASS | Alias added; advanced Sources opener assertion aligned to Correction A successor. |
| `npm run test:m8a-v4.11:correction-a-phase-b` | PASS | Includes existing raw-side-read and source-boundary scans. |
| `npm run test:m8a-v4.11:correction-a-phase-c` | PASS | Includes existing raw-side-read and source-boundary scans. |
| `npm run test:m8a-v4.11:correction-a-phase-d` | PASS | Includes existing raw-side-read and source-boundary scans. |
| `npm run test:m8a-v4.11:correction-a-phase-e` | PASS | Includes existing raw-side-read and source-boundary scans. |

## Known Open Items

- Lock-in L hardware GPU validation remains open. This WSL2 host still uses
  SwiftShader software rendering, so no hardware-GPU frame-budget acceptance is
  claimed here.
- V4.7 legacy disposition handoff remains pending commit and separate from this
  smoke matrix repair. `test:m8a-v4.7.1` is the successor smoke that passed in
  this matrix.

## Changed Surfaces

Runtime:

- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`

Smoke contracts:

- `tests/smoke/verify-m8a-v4.8-handover-demonstration-ui-ia-runtime.mjs`
- `tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice1-first-viewport-composition-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice2-handover-sequence-rail-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice3-boundary-affordance-separation-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice4-inspector-evidence-redesign-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice5-validation-matrix-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-conv3-footer-truth-removal-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-conv4-sources-demote-smoke-matrix-runtime.mjs`

Package:

- `package.json`

Handoff:

- `docs/sdd/m8a-v4.11-followup-smoke-matrix-corrective-handoff.md`

Smoke reruns also refreshed generated `output/` artifacts. Those artifacts are
validation byproducts, not new runtime or contract changes.
