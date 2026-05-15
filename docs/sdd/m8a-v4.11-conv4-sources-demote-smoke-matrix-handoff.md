# M8A-V4.11 Conv 4 — Sources Demotion + Smoke Matrix Handoff

Date: 2026-05-04
Status: implementation complete, validation complete
Origin: Conv 4 brief after Conv 3 footer disclosure handoff

## Scope

Conv 4 demotes Slice 5 `Sources` from first-read glance affordances into the
inspector advanced source-provenance path.

Implemented:

- Corner provenance badge remains mounted for selector compatibility only. It
  is not visible, focusable, clickable, or a `Sources` trigger.
- Ground-station short chip `[LEO MEO GEO ✓]` remains visible glance evidence.
  Its LEO/MEO/GEO tokens no longer carry `open-sources`, source trigger, role,
  tabindex, endpoint id, or orbit filter attributes.
- `Sources` opens only from the Details inspector advanced
  `Source provenance` toggle.
- `Sources` content remains complete: 13 TLE rows, 2 ground-station evidence
  sections, and 5 R2 blocked/read-only candidates.
- R2 remains read-only: no runtime selector, no controls, no promote path.
- Slice 0 reviewer protocol now reflects the layperson Chinese addendum and
  the Conv 3/4 footer disclosure model.

Not implemented:

- Slice 6 reviewer validation was not started.
- Lock-in I batch reviewer was not run.
- No endpoint, route, actor set, precision, V4.6D model, or source-boundary
  contract was changed.

## Changed Runtime Surfaces

- `src/runtime/m8a-v411-glance-rank-surface.ts`
  - removes direct Sources attributes from the corner badge and ground short
    chip tokens.
- `src/runtime/m8a-v411-hover-popover.ts`
  - ground-station hover click no longer opens Sources; hover click pins State
    Evidence like other hover targets.
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
  - adds the inspector advanced source-provenance toggle and makes it the only
    Sources opener.
- `src/styles/m8a-v411-glance-rank.css`
  - removes open-sources cursor/focus/hover styling from glance chips.
- `src/styles/m8a-v411-inspector-concurrency.css`
  - styles the advanced source-provenance toggle.

## Lock-in J — Smoke Softening Disclosure

| Smoke | Old assertion | New assertion | Reason |
| --- | --- | --- | --- |
| `tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs` | Ground short-chip LEO/MEO/GEO tokens had `data-m8a-v47-action="open-sources"`, `data-m8a-v411-sources-trigger="ground-orbit-evidence"`, and per-orbit source filters. | Ground short-chip tokens remain visible strength tokens but have no direct Sources action, trigger, endpoint, or orbit filter attributes. | Conv 4 demotes Sources out of glance evidence. The short chip stays as first-read evidence only. |
| `tests/smoke/verify-m8a-v4.11-slice2-hover-popover-runtime.mjs` | Click-to-pin expected the old Truth affordance state through `[data-m8a-v47-control-id="truth-affordance"]`. | Click-to-pin asserts no Truth button exists and the footer boundary chip remains closed. | Conv 3 removed the Truth button; footer `[Simulation view]` chip owns `toggle-boundary`. |
| `tests/smoke/verify-m8a-v4.11-slice5-real-data-surfacing-runtime.mjs` | Corner provenance badge click opened full Sources. | Corner placeholder click keeps Sources closed; badge is invisible, non-focusable, non-clickable, and has no Sources trigger. | Corner provenance is now selector-compatible placeholder only; footer carries ambient TLE disclosure. |
| `tests/smoke/verify-m8a-v4.11-slice5-real-data-surfacing-runtime.mjs` | Ground orbit-evidence chip click opened Sources with a LEO filter. | Ground short-chip click does not open Sources. Full Sources is opened from Details → advanced `Source provenance`. | Conv 4 removes direct ground-chip Sources triggers; Sources is an inspector advanced path only. |
| `tests/smoke/verify-m8a-v4.11-slice5-real-data-surfacing-runtime.mjs` | Slice 5 asserted three-role Sources + State Evidence + Truth Boundary concurrency in the same smoke. | Slice 5 asserts Sources opens from the advanced toggle with full 13/2/5 counts, repo-owned URL set, no forbidden claims, and R2 read-only. State Evidence + truth-tail behavior remains covered by Conv 3 and Slice 3 smokes. | The original concurrent Truth/Details concept evolved into single State Evidence + footer disclosure + truth tail. Keeping the old Slice 5 concurrency flow would preserve a deprecated reviewer path. |

No V4.8, V4.9, or V4.10 smoke assertion was softened by Conv 4.

## Slice 3 Design Evolution Note

The original Slice 3 plan described concurrent State Evidence and Truth
Boundary roles opened through Details and Truth. Conv 2 collapsed the inspector
to a single State Evidence primary role, Conv 3 moved the Truth button into
footer ambient disclosure, and Conv 4 keeps Sources behind the inspector
advanced source-provenance toggle. The current design is:

- State Evidence is the primary inspector role.
- Footer chips provide ambient disclosure:
  `[Simulation view] [operator-family precision] [TLE: CelesTrak NORAD GP · 2026-04-26] [13 actors]`.
- W5 adds high-salience `Not actual failover evidence`.
- Truth content survives as a truth tail when the footer boundary chip is
  opened, preserving the boundary state machine without restoring a Truth
  button.
- Sources is advanced evidence, not first-read disclosure.

## Protocol Revision

Updated:

- `docs/sdd/m8a-v4.11-slice0-baseline-protocol-storyboard.md`
- `output/m8a-v4.11-slice0/reviewer-protocol.md`

The acceptable-answer examples now include:

- `Currently viewing this one`
- `Position conditions worsening`
- `Temporarily holding`
- `Candidate`
- `Guard coverage`
- `Simulation view`
- `Not actual failover evidence`
- `TLE / CelesTrak NORAD GP`

Obsolete assumptions about opening Details and Truth together are superseded
by the footer disclosure model and the State Evidence truth tail.

## Guardrails Confirmed

- Route remains `/?scenePreset=regional&m8aV4GroundStationScene=1`.
- Endpoint pair remains
  `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`.
- Precision remains `operator-family-only`.
- Actor set remains 13 actors: 6 LEO / 5 MEO / 2 GEO.
- V4.6D model id and window order remain unchanged.
- Source-boundary scans remain hard requirements.
- R2 remains read-only and non-promotable.
- No raw customer side-read or live CelesTrak fetch is introduced.
- No measured latency, jitter, throughput, continuity, RF handover, active
  gateway, active path, or real operator handover claim is introduced.
- No Slice 6 reviewer validation or Lock-in I batch reviewer was started.

## Validation Status

| Check | Result |
| --- | --- |
| `npm run build` | pass, with existing large-chunk and upstream protobuf direct-eval warnings |
| `node scripts/verify-m8a-v4.3-raw-itri-side-read.mjs` | pass |
| `node scripts/verify-m8a-v4.6b-runtime-source-boundary.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-conv4-sources-demote-smoke-matrix-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-conv1-visual-tokens-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-conv2-hover-inspector-countdown-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-conv3-footer-truth-removal-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-slice2-hover-popover-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-slice3-inspector-concurrency-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-slice4-transition-toast-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-slice5-real-data-surfacing-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.10-slice1-first-viewport-composition-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.10-slice2-handover-sequence-rail-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.10-slice3-boundary-affordance-separation-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.10-slice4-inspector-evidence-redesign-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.10-slice5-validation-matrix-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.8-handover-demonstration-ui-ia-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.7-handover-product-ux-runtime.mjs` | diagnostic fail: obsolete V4.7 scene-near mapping assertion expects the pre-Conv1 scene annotation, while current V4.11 shows `focus · LEO`; not treated as a Conv 4 gate |

## Lock-in L

Lock-in L is not admissible on this host.

- Machine/kernel: `LAPTOP-O8M86FNI`, Linux
  `6.6.87.2-microsoft-standard-WSL2`
- `/dev/dri`: absent
- Browser: `google-chrome`, HeadlessChrome `145.0.0.0`
- WebGL vendor: `Google Inc. (Google)`
- WebGL renderer:
  `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`

Because this is WSL2 + SwiftShader software rendering, no 60s hardware-GPU
frame-budget PASS is claimed.
