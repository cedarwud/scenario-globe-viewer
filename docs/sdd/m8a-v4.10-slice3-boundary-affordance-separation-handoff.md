# M8A-V4.10 Slice 3 Boundary Affordance Separation Handoff

Date: 2026-05-01

Route:

- `/?scenePreset=regional&m8aV4GroundStationScene=1`

Related SDD:

- [m8a-v4.10-product-experience-redesign-plan.md](./m8a-v4.10-product-experience-redesign-plan.md)

Related prior artifacts:

- [m8a-v4.10-slice0-baseline-target-lock.md](./m8a-v4.10-slice0-baseline-target-lock.md)
- [m8a-v4.10-slice1-first-viewport-composition-handoff.md](./m8a-v4.10-slice1-first-viewport-composition-handoff.md)
- [m8a-v4.10-slice2-handover-sequence-rail-handoff.md](./m8a-v4.10-slice2-handover-sequence-rail-handoff.md)

## Scope Completed

Slice 3 separates the compact `Truth` / boundary affordance from the generic
`Details` inspector.

Default view now keeps a compact visible boundary affordance:

- `Truth`
- `not operator log`

Clicking `Truth` opens a focused boundary surface with:

- compact boundary summary: `Simulation review - not operator log.`
- secondary non-claim line:
  `No active satellite, gateway, path, or measured metric claim.`
- `Full truth disclosure` as an inspectable disclosure inside the focused
  boundary surface

Clicking `Details` still opens the generic `Handover review` inspector/evidence
sheet. `Truth` and `Details` use separate open states and separate surfaces.

Slice 1 scene narrative and Slice 2 sequence rail remain unchanged in role.
Details remains closed by default.

## Changed Files

- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/styles.css`
- `package.json`
- `tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice3-boundary-affordance-separation-runtime.mjs`
- `docs/sdd/m8a-v4.10-slice3-boundary-affordance-separation-handoff.md`
- `output/m8a-v4.10-slice3/*`

## Screenshot Evidence

Evidence root:

- `output/m8a-v4.10-slice3/capture-manifest.json`

Screenshots:

- `output/m8a-v4.10-slice3/v4.10-slice3-default-1440x900.png`
- `output/m8a-v4.10-slice3/v4.10-slice3-default-1280x720.png`
- `output/m8a-v4.10-slice3/v4.10-slice3-default-390x844.png`
- `output/m8a-v4.10-slice3/v4.10-slice3-transition-leo-aging-pressure-1440x900.png`
- `output/m8a-v4.10-slice3/v4.10-slice3-boundary-open-1440x900.png`
- `output/m8a-v4.10-slice3/v4.10-slice3-details-open-1440x900.png`

Metadata:

- `output/m8a-v4.10-slice3/v4.10-slice3-default-1440x900.metadata.json`
- `output/m8a-v4.10-slice3/v4.10-slice3-default-1280x720.metadata.json`
- `output/m8a-v4.10-slice3/v4.10-slice3-default-390x844.metadata.json`
- `output/m8a-v4.10-slice3/v4.10-slice3-transition-leo-aging-pressure-1440x900.metadata.json`
- `output/m8a-v4.10-slice3/v4.10-slice3-boundary-open-1440x900.metadata.json`
- `output/m8a-v4.10-slice3/v4.10-slice3-details-open-1440x900.metadata.json`

The final Slice 3 manifest records:

- boundary-open capture: `boundarySurfaceOpen=true`
- boundary-open capture: `fullDisclosureOpen=true`
- details-open capture: generic inspector sheet open with focused boundary
  surface closed
- default desktop/narrow captures: Details and boundary surface closed

## Tests Run

- `node --check tests/smoke/verify-m8a-v4.10-slice3-boundary-affordance-separation-runtime.mjs` - passed.
- `npm run build` - passed.
- `npm run test:m8a-v4.10:slice3` - passed.
- `npm run test:m8a-v4.10:slice2` - passed after tightening the boundary copy
  away from the older forbidden-phrase scan false positive.
- `npm run test:m8a-v4.10:slice1` - passed.
- `node --check tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs`
  - passed.
- `npm run test:m8a-v4.9` - passed after updating stale V4.9 assertions so
  `Truth` opens the focused boundary surface while `Details` opens the
  inspector.

Build warnings observed during Vite builds are existing warnings for large
chunks and `protobufjs` direct `eval`.

## Preserved Invariants

- route remains `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair remains Taiwan/CHT + Speedcast Singapore
- precision remains `operator-family-only`
- actor set remains `6` LEO, `5` MEO, `2` GEO
- runtime source boundary remains repo-owned projection/module only
- `R2` remains read-only evidence/catalog support
- `V4.6D` remains deterministic display-context simulation, not an operator log
- Details remains closed by default
- sequence rail remains visible and usable

## Deviations

None from the opened Slice 3 scope.

Copy note:

- The compact boundary copy was tightened from the SDD example wording to
  `Simulation review - not operator log` so older forbidden-claim scans do not
  match the exact positive phrase `operator handover log` inside a negated
  sentence.

Not implemented:

- Slice 4 inspector redesign
- Slice 5 validation matrix
- endpoint expansion
- route expansion
- precision expansion
- actor-set expansion
- source-data expansion
- `R2` runtime selector
- `V4.6D` model truth changes

## Remaining Work

- Slice 4: inspector as evidence, not narrative.
- Slice 5: product-visible validation matrix and final closeout package.

## Runtime Cleanup

Slice 3 final smoke manifest records:

- static server PID `10531` started and stop requested
- headless Chrome PID `10536` started and stop requested
- manifest status: `cleanup-complete`

Slice 2 regression smoke records:

- static server PID `6826` started and stop requested
- headless Chrome PID `6831` started and stop requested
- manifest status: `cleanup-complete`

Slice 1 regression smoke records:

- static server PID `8074` started and stop requested
- headless Chrome PID `8079` started and stop requested
- manifest status: `cleanup-complete`

V4.9 regression smoke records:

- static server PID `14316` started and stop requested
- headless Chrome PID `14321` started and stop requested
- final status: passed; the script `finally` cleanup completed

An earlier sandboxed Slice 3 attempt failed before binding the smoke server
with `PermissionError: [Errno 1] Operation not permitted`; the successful
validation runs used approved escalation for local server/browser validation.

Earlier V4.9 reruns exposed stale assertions before the final pass. Follow-up
process checks found no task-owned static server or headless Chrome residuals.
