# M8A-V4.10 Slice 1 First-Viewport Composition Handoff

Date: 2026-05-01

Route:

- `/?scenePreset=regional&m8aV4GroundStationScene=1`

## Scope Completed

Slice 1 implemented first-viewport composition only. The runtime now presents the default viewport as a handover review product through a larger scene narrative surface that carries:

- active state title
- orbit focus token
- first-read line
- watch cue, or explicit unreliable-anchor fallback
- next-state line

The persistent replay controls remain present and clickable, but are visually demoted to a compact secondary strip. Details/inspector remains closed by default.

## Changed Files

- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/styles.css`
- `package.json`
- `tests/smoke/verify-m8a-v4.8-handover-demonstration-ui-ia-runtime.mjs`
- `tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice1-first-viewport-composition-runtime.mjs`
- `docs/sdd/m8a-v4.10-slice1-first-viewport-composition-handoff.md`

## Implementation Notes

- Added `m8a-v4.10-first-viewport-composition-slice1-runtime.v1` telemetry and DOM seams.
- Reworked the first scene annotation into the Slice 1 scene narrative surface.
- Updated first-read/watch/next copy to product-review language while preserving V4.6D deterministic display-context truth.
- Moved persistent controls to secondary visual priority and kept replay controls unchanged.
- Kept the inspector closed by default and left Slice 2 sequence rail explicitly unimplemented through `sequenceRailScope=not-implemented-slice1`.
- Preserved route, endpoint pair, precision, actor counts, runtime source boundary, R2 read-only support, and V4.6D model truth.

## Screenshot Evidence

Evidence root:

- `output/m8a-v4.10-slice1/capture-manifest.json`

Screenshots:

- `output/m8a-v4.10-slice1/v4.10-slice1-default-1440x900.png`
- `output/m8a-v4.10-slice1/v4.10-slice1-default-1280x720.png`
- `output/m8a-v4.10-slice1/v4.10-slice1-default-390x844.png`
- `output/m8a-v4.10-slice1/v4.10-slice1-active-meo-continuity-hold-1440x900.png`

Metadata:

- `output/m8a-v4.10-slice1/v4.10-slice1-default-1440x900.metadata.json`
- `output/m8a-v4.10-slice1/v4.10-slice1-default-1280x720.metadata.json`
- `output/m8a-v4.10-slice1/v4.10-slice1-default-390x844.metadata.json`
- `output/m8a-v4.10-slice1/v4.10-slice1-active-meo-continuity-hold-1440x900.metadata.json`

Visible-difference evidence from the manifest:

- V4.9 baseline strip: right-side dominant strip, `left=736.96875`, `width=680`.
- Slice 1 strip: secondary left strip, `left=23.03125`, `width=584`.
- V4.9 baseline annotation: `width=278`, `height=112.90625`.
- Slice 1 scene narrative: `width=360`, `height=165.234375`.
- Default desktop and active MEO desktop captures show reliable watch cues.
- Default narrow capture uses explicit unreliable-anchor fallback and remains usable.

## Tests Run

- `node --check tests/smoke/verify-m8a-v4.10-slice1-first-viewport-composition-runtime.mjs` - passed.
- `npm run test:m8a-v4.10:slice1` - passed. Includes build, forbidden raw customer/source-boundary scans, desktop/narrow screenshot capture, Details-default-closed assertion, first-viewport narrative assertions, preserved-invariant assertions, and forbidden-claim scan.
- `npm run test:m8a-v4.8` - passed.
- `npm run test:m8a-v4.9` - passed after the runtime/CSS/test updates and before adding the Slice 1-only smoke/handoff surfaces.

Build warnings observed during Vite builds are existing warnings for large chunks and `protobufjs` direct `eval`; they did not block validation.

## Deviations

None from Slice 1 scope.

Explicitly not implemented:

- Slice 2 full sequence rail
- Slice 3 boundary affordance separation
- Slice 4 inspector redesign
- Slice 5 validation matrix
- endpoint, route, precision, actor-set, source-data, R2 selector, or V4.6D model-truth expansion

## Remaining Work

- Slice 2: sequence rail or equivalent state path.
- Slice 3: boundary affordance separation.
- Slice 4: inspector redesign.
- Slice 5: final validation matrix and closeout package.

## Runtime Cleanup

Slice 1 capture script started and stopped:

- static server PID `75855`
- headless Chrome PID `75860`

V4.8 regression smoke started and stopped:

- static server PID `76886`
- headless Chrome PID `76891`

No Vite dev server was started. Final process checks found no lingering `vite`, `npm run dev`, Playwright MCP, Chrome DevTools MCP, headless Chrome/Chromium, SwiftShader, `http.server`, or smoke server process.
