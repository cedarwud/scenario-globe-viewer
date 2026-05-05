# M8A-V4.10 Slice 5 Validation Matrix Final Handoff

Date: 2026-05-01

Route:

- `/?scenePreset=regional&m8aV4GroundStationScene=1`

Scope:

- validation / closeout only
- no product-visible runtime feature work
- no runtime UI or CSS redesign

## Changed Files

- `package.json`
- `tests/smoke/verify-m8a-v4.10-slice5-validation-matrix-runtime.mjs`
- `docs/sdd/m8a-v4.10-slice5-validation-matrix-final-handoff.md`
- `output/m8a-v4.10-slice5/*`

## Validation Matrix By Slice

| Slice | Result | Validation |
| --- | --- | --- |
| Slice 1 - first viewport composition | passed | Default desktop, compact desktop, and narrow captures show the scene narrative visible and primary; Details stays closed by default. |
| Slice 2 - handover sequence rail | passed | Five accepted V4.6D states remain visible and ordered; active and next states are marked; transition capture verifies `leo-aging-pressure` -> `meo-continuity-hold`. |
| Slice 3 - boundary affordance separation | passed | `Truth` opens the focused boundary surface only; Details remains closed; full truth disclosure remains inspectable inside the boundary surface. |
| Slice 4 - inspector evidence redesign | passed | `Details` opens only the evidence inspector; Truth boundary remains closed; inspector groups remain evidence/source/boundary-oriented. |
| Slice 5 - final validation matrix | passed | Screenshot evidence, metadata, invariant checks, forbidden positive claim scan, narrow layout scan, and package script coverage are recorded in `output/m8a-v4.10-slice5/capture-manifest.json`. |

## Product-Visible Acceptance Result

V4.10 is product-visible acceptance-ready.

The default viewport now reads as a handover review product rather than an
engineering inspector. The reviewer can see the active state, orbit focus,
scene cue, next state, compact truth boundary, and five-state sequence rail
without opening Details.

## Invariant Preservation Result

Preserved:

- route: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair:
  `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- precision: `operator-family-only`
- actor set: `6` LEO, `5` MEO, `2` GEO
- source boundary: repo-owned `M8A_V4_GROUND_STATION_RUNTIME_PROJECTION`
- raw ITRI package side-read: forbidden
- raw source paths in runtime: false
- `R2`: read-only evidence/catalog support, not runtime selector
- V4.6D model id:
  `m8a-v4.6d-simulation-handover-model.v1`
- model truth: `simulation-output-not-operator-log`
- deterministic five-state window order:
  `leo-acquisition-context`, `leo-aging-pressure`,
  `meo-continuity-hold`, `leo-reentry-candidate`,
  `geo-continuity-guard`

## Screenshot / Evidence Inventory

Evidence root:

- `output/m8a-v4.10-slice5/`

Manifest:

- `capture-manifest.json`

Screenshots:

- `v4.10-slice5-default-1440x900.png`
- `v4.10-slice5-default-1280x720.png`
- `v4.10-slice5-default-390x844.png`
- `v4.10-slice5-details-open-1440x900.png`
- `v4.10-slice5-boundary-open-1440x900.png`
- `v4.10-slice5-transition-leo-aging-pressure-1440x900.png`

Metadata:

- `v4.10-slice5-default-1440x900.metadata.json`
- `v4.10-slice5-default-1280x720.metadata.json`
- `v4.10-slice5-default-390x844.metadata.json`
- `v4.10-slice5-details-open-1440x900.metadata.json`
- `v4.10-slice5-boundary-open-1440x900.metadata.json`
- `v4.10-slice5-transition-leo-aging-pressure-1440x900.metadata.json`

## Details Vs Truth Final Behavior

- Default load: Details closed, Truth boundary surface closed.
- `Details`: opens the secondary evidence inspector only.
- `Details`: keeps Truth boundary surface closed.
- `Truth`: opens the focused boundary surface only.
- `Truth`: keeps Details closed.
- Full truth disclosure remains inspectable inside the focused boundary surface.
- Truth boundary was not merged back into Details.

## Desktop / Narrow Layout Findings

Desktop:

- default scene narrative is visible and primary
- five-state sequence rail is visible and ordered
- controls are secondary
- Details-open inspector is on-demand and evidence-oriented

Narrow:

- default `390x844` capture passed the no-incoherent-overlap scan
- sequence rail does not collide with controls, Cesium default-token notice,
  credits, attribution, viewer bottom, or timeline surfaces
- Details and Truth are not open by default

## Accepted Risks

- Details-open `1440x900` capture overlaps the far-right portion of the
  sequence rail. This is accepted because the inspector is on-demand, the scene
  narrative and controls remain readable, and Details is not needed for first
  understanding.
- One `npm run test:m8a-v4.10:slice2` attempt timed out waiting for Cesium
  `tilesLoaded=true` even though the viewer existed with one imagery layer.
  A process check found no task-owned server or headless Chrome residuals, and
  the immediate rerun passed.
- Vite still reports existing large chunk and `protobufjs` direct `eval`
  warnings. These are unchanged build warnings and did not block validation.
- Cesium native default-token / credit surfaces remain present. Slice 5 narrow
  layout validation accepts them because they do not incoherently overlap the
  product rail or controls.

## Blockers

None.

## Tests Run

- `node --check tests/smoke/verify-m8a-v4.10-slice5-validation-matrix-runtime.mjs` - passed
- `npm run test:m8a-v4.10:slice5` - passed
- `npm run test:m8a-v4.10:slice4` - passed
- `npm run test:m8a-v4.10:slice3` - passed
- `npm run test:m8a-v4.10:slice2` - first attempt hit Cesium
  `tilesLoaded=false`; rerun passed
- `npm run test:m8a-v4.10:slice1` - passed
- `npm run test:m8a-v4.9` - passed
- `npm run test:m8a-v4.8` - passed
- `npm run build` - passed
- `git diff --check -- package.json` - passed for the touched tracked file

The initial sandboxed Slice 5 run could not bind the local smoke server
(`PermissionError: [Errno 1] Operation not permitted`); the approved
server/browser validation run passed.

## Deviations

No product-scope deviations.

No endpoint, route, precision, actor-set, source-boundary, R2 selector, or
V4.6D model-truth expansion was introduced.

No runtime UI, CSS, model, source, route, or existing Slice 1-4 smoke/handoff
files were modified by Slice 5.

## Final Recommendation

Acceptance-ready: yes.

V4.10 can close as a product-visible redesign validation package.

## Runtime Cleanup

- Dev server kept: none.
- Temporary dev servers stopped: none were started.
- Temporary smoke static servers stopped: all task-owned Python static servers
  from Slice 5, Slice 4, Slice 3, Slice 2, Slice 1, V4.9, and V4.8 smoke runs
  were stopped by their smoke cleanup paths.
- Temporary Playwright / Chrome / headless browser processes stopped: all
  task-owned headless Chrome processes were stopped by their smoke cleanup
  paths.
- Final process check found no task-owned `python3 -m http.server`, headless
  Chrome/Chromium, or SwiftShader process left from this task.
- Intentionally retained background processes: pre-existing Codex, VSCode,
  Claude, and MCP processes that were already present or unrelated to this
  Slice 5 validation work.
