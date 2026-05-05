# Large File Split Audit - 2026-05-02

## Scope

This audit checks whether `scenario-globe-viewer` has single files that are too
large for reliable agent reading and maintenance. It records findings only. No
source, style, test, fixture, or build behavior was changed as part of this
audit.

The scan covered project files under `scenario-globe-viewer`, excluding
`.git/`, `node_modules/`, `dist/`, and ignored validation output under
`output/`. The worktree already contained modified and untracked files before
this audit, so this report treats both tracked files and current untracked
project files as part of the review surface.

## Method

Primary signals:

- Line count and byte size for text-like files: TypeScript, JavaScript, CSS,
  Markdown, JSON, GeoJSON, HTML, and TLE.
- Top-level symbol and selector boundaries for the largest source, CSS, and
  smoke-test files.
- Separate classification for binary assets, lockfiles, and fixture data,
  because those can be large without being meaningful split targets for agent
  comprehension.

Working thresholds:

- `critical`: active source or CSS file above 2000 lines, or a file that mixes
  several unrelated responsibilities.
- `high`: active source, test, or script file from 1000 to 2000 lines.
- `watch`: active source, test, script, or doc file from 700 to 1000 lines.
- `not a split target`: generated, lock, binary, or atomic fixture data.

## Summary

The main agent-readability risk is concentrated in one runtime file:

- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
  is about 6029 lines and 218 KB. It is the only critical source file.

Secondary risks:

- `src/styles.css` is about 3123 lines and remains a large monolithic stylesheet.
- Several smoke tests are above 1400 lines. They are not product runtime code,
  but repeated browser harness and assertion patterns make them expensive to
  inspect.
- `src/runtime/m8a-v4-ground-station-projection.ts` is 1611 lines. It is
  mostly contract, projection, and accepted-data shaping logic; split only if it
  becomes an active edit target.

Large binary, fixture, and lock files exist, but they are not meaningful
semantic split targets for agent comprehension.

## Critical Split Candidate

### `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`

- Size: 6029 lines, 218213 bytes.
- Status: critical.
- Why it is hard for agents: one file owns type declarations, copy constants,
  replay-window math, service-state resolution, Cesium entity styling, DOM
  structure creation, scene-annotation placement, product UX rendering, state
  cloning, telemetry sync, controller construction, playback controls, and
  event handling.

Observed responsibility bands:

- Lines 84-430: version constants, product copy, visual policy constants, and
  telemetry keys.
- Lines 587-1179: runtime state, controller, actor, review, and product UX
  interfaces.
- Lines 1187-2031: serialization, time conversion, replay-window math,
  service-window resolution, product-comprehension model building, and playback
  state helpers.
- Lines 2062-2287: Cesium endpoint, actor, relation, label, billboard, and
  style helpers.
- Lines 2304-4203: HUD creation, product UX DOM creation, scene annotation
  placement, inspector placement, and large render update logic.
- Lines 4203-5017: clone, listener, telemetry, endpoint, replay, simulation,
  and product UX state builders.
- Lines 5030-6029: exported controller factory, Cesium entity graph, runtime
  position callbacks, final-hold playback state, product UX controls, event
  handlers, clock listeners, and disposal.

Recommended split direction, if approved later:

- `m8a-v4-ground-station-scene-types.ts`: exported state/controller types and
  narrow public contracts.
- `m8a-v4-ground-station-product-copy.ts`: version constants, visible copy, and
  non-claim text.
- `m8a-v4-ground-station-state-builders.ts`: replay, service, simulation, and
  product UX state builders.
- `m8a-v4-ground-station-cesium-entities.ts`: endpoint, actor, relation, model,
  label, billboard, and style helpers.
- `m8a-v4-ground-station-product-ux-dom.ts`: DOM structure creation and element
  lookup.
- `m8a-v4-ground-station-product-ux-placement.ts`: scene annotation,
  connector, protection-rect, and inspector placement.
- `m8a-v4-ground-station-product-ux-render.ts`: render/update logic for the
  product UX layer.
- `m8a-v4-ground-station-controller.ts`: orchestration-only controller factory
  that wires the extracted helpers together.

The public exports should stay stable during any future split:

- `M8A_V4_GROUND_STATION_DATA_SOURCE_NAME`
- `M8A_V4_GROUND_STATION_RUNTIME_STATE`
- `M8A_V4_GROUND_STATION_PROOF_SEAM`
- `isM8aV4GroundStationRuntimeRequested`
- `createM8aV4GroundStationSceneController`

## Strong Split Candidate

### `src/styles.css`

- Size: 3123 lines, 71840 bytes.
- Status: critical by size, but lower risk than the controller because CSS can
  be searched by selector prefix.
- Current structure: base app shell, HUD panels, first-intake feature panels,
  native Cesium control adjustments, homepage CTA, M8A V4 ground-station scene,
  M8A V4.7 product UX, M8A V4.10 sequence/boundary/inspector surfaces, and
  responsive rules live in one file.
- Existing worktree note: untracked `src/styles/m8a-v411-*.css` files already
  exist, which suggests a local split direction has begun, but `src/main.ts`
  still imports only `./styles.css`.

Recommended split direction, if approved later:

- `src/styles/base.css`
- `src/styles/cesium-native-controls.css`
- `src/styles/hud-shell.css`
- `src/styles/first-intake-panels.css`
- `src/styles/homepage-entry-cta.css`
- `src/styles/m8a-v4-ground-station-scene.css`
- `src/styles/m8a-v47-product-ux.css`
- `src/styles/m8a-v410-product-comprehension.css`
- keep or formalize the existing `src/styles/m8a-v411-*.css` files
- use one explicit stylesheet entrypoint so import order is controlled

## High Test And Script Split Candidates

These files are large enough to slow agent reading, but they are validation
surfaces rather than production runtime code. Splitting shared harness utilities
first would likely give the most value.

| File | Lines | Bytes | Suggested treatment |
| --- | ---: | ---: | --- |
| `tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs` | 2866 | 105276 | Split browser setup, persistent-layer assertions, scene-near assertions, inspector assertions, and transition-event assertions. |
| `tests/smoke/bootstrap-loads-assets-and-workers.mjs` | 1909 | 71500 | Split baseline shell checks, native Cesium control checks, walker overlay checks, OSM/showcase checks, and shared CDP helpers. |
| `tests/smoke/verify-m8a-v4.10-slice3-boundary-affordance-separation-runtime.mjs` | 1901 | 69915 | Extract shared M8A V4.10 capture/assertion helpers. |
| `tests/smoke/verify-m8a-v4.10-slice5-validation-matrix-runtime.mjs` | 1724 | 61410 | Extract validation matrix builder and common screenshot metadata helpers. |
| `tests/smoke/verify-m8a-v4.7-handover-product-ux-runtime.mjs` | 1608 | 54375 | Split product UX inspect, playback policy, pointer matrix, final hold, and disclosure checks. |
| `tests/smoke/verify-m8a-v4.8-handover-demonstration-ui-ia-runtime.mjs` | 1531 | 54608 | Split scene-anchor geometry and orbit-motion correction checks. |
| `tests/smoke/verify-m8a-v4.10-slice2-handover-sequence-rail-runtime.mjs` | 1460 | 51929 | Extract shared sequence-rail assertions. |
| `tests/smoke/verify-m8a-v4.10-slice4-inspector-evidence-redesign-runtime.mjs` | 1419 | 49906 | Extract shared inspector assertions. |
| `scripts/verify-phase6.1-scenario-coordination.mjs` | 1514 | 44887 | Split plain-data assertion helpers if this verifier continues growing. |

Existing worktree note: an untracked
`tests/smoke/helpers/m8a-v4-browser-capture-harness.mjs` exists. If the user
approves test cleanup later, review that helper before creating another harness.

## High Source Files To Watch

| File | Lines | Bytes | Assessment |
| --- | ---: | ---: | --- |
| `src/runtime/m8a-v4-ground-station-projection.ts` | 1611 | 59174 | Large contract/projection file. Consider splitting exported types from accepted projection construction only if actively edited. |
| `src/runtime/first-intake-orbit-context-actor-controller.ts` | 1382 | 45323 | Earlier controller with similar mixed responsibilities. Split if this path reopens. |
| `src/runtime/first-intake-nearby-second-endpoint-expression-controller.ts` | 993 | 32996 | Watch. Large but bounded to one feature controller. |
| `src/runtime/first-intake-overlay-expression-controller.ts` | 914 | 29716 | Watch. Large but bounded to one feature controller. |
| `src/runtime/m8a-v411-hover-popover.ts` | 802 | 23510 | Watch. Newer focused module; acceptable if it does not keep growing. |
| `src/runtime/bootstrap/composition.ts` | 782 | 31815 | Watch. It is orchestration-heavy but still reasonably navigable. |
| `src/features/physical-input/physical-input.ts` | 690 | 19940 | Below threshold but close enough to avoid adding unrelated behavior. |

## Large Files That Should Not Be Split For Agent Readability

| File | Lines or size | Reason |
| --- | ---: | --- |
| `src/runtime/fixtures/first-intake-aircraft-corridor/trajectory-replay.geojson` | 9852 lines, 242889 bytes | Atomic trajectory fixture. Use tools or schema-aware reads; do not split semantically. |
| `public/fixtures/ground-station-projections/m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28.json` | 1744 lines, 73424 bytes | Accepted projection fixture. Keep atomic unless the data contract changes. |
| `public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json` | 1088 lines, 44973 bytes | Accepted projection fixture. Keep atomic unless the data contract changes. |
| `package-lock.json` | 1480 lines, 51564 bytes | Lockfile. Do not hand-edit or split. |
| `public/assets/models/generic-satellite.glb` | 3049428 bytes | Binary model asset. Not an agent source-reading problem. |
| `docs/images/**/*.png` | up to about 1.5 MB each in committed docs images | Binary evidence screenshots. Not split targets. |

## Documentation Notes

The largest docs are not immediate split targets:

- `docs/sdd/m8a-vnext-multi-orbit-simulation-roadmap.md`: 1044 lines.
- `docs/data-contracts/m8a-v4-ground-station-projection.md`: 751 lines.

These are long, but they are already documentation surfaces. Split only if they
become active planning authority for a new phase and the user wants a smaller
canonical SDD surface.

## Recommended Future Order If Splitting Is Approved

1. Split `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts` first.
   Keep the exported API stable and make each step behavior-preserving.
2. Formalize CSS modularization through a single import entrypoint. Do not rely
   on ad hoc direct imports from feature modules until import order is explicit.
3. Extract shared smoke-test browser and assertion helpers. Reuse the existing
   untracked helper if it is correct, rather than adding a parallel harness.
4. Consider splitting `src/runtime/m8a-v4-ground-station-projection.ts` only
   after the controller and CSS risk are reduced.
5. Leave binary assets, lockfiles, screenshots, and accepted fixtures alone
   unless there is a separate storage, provenance, or runtime-loading reason.

## No-Action Record

This report intentionally does not implement any split. It is a planning and
audit artifact only.
