# Large File Refactor Guard

Draft date: 2026-05-18
Status: proposed SDD

## Scope

This document defines a refactor-only plan to reduce the active large-file
risk in `scenario-globe-viewer` before more feature work is stacked onto the
same runtime files.

The first target is:

```text
src/runtime/m8a-v4-ground-station-handover-scene-controller.ts
```

The file is currently the highest-risk maintenance surface because it combines
route detection, replay clock setup, Cesium entity construction, selected-pair
runtime scene wiring, product panel DOM, placement math, debug state, state
builders, event listeners, and controller lifecycle.

This SDD does not implement a product feature. It defines boundaries, slices,
acceptance gates, and stop rules for a behavior-preserving split.

No new customer-specific identifier or project-external agency name is part of
this document's terminology.

## 1. Problem

The project has crossed a practical maintenance threshold:

| File | Current size | Current role | Risk |
| --- | ---: | --- | --- |
| `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts` | 7570 lines | V4 ground-station scene controller, selected-pair layer, Cesium entities, DOM, state, lifecycle | critical |
| `src/styles.css` | 3913 lines | global shell, older scene styles, current scene styles, responsive rules | critical but write-restricted by current collision rules |
| `tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs` | 2908 lines | browser smoke and assertions | high |
| `src/features/multi-station-selector/v4-projection-side-panel.ts` | 1586 lines | selected-pair panel DOM and interaction | high |
| `src/runtime/m8a-v4-ground-station-projection.ts` | 1611 lines | accepted projection contract and shaping | watch |

The controller is also the hottest active file: recent history shows it is
edited repeatedly for unrelated concerns. That makes it harder for humans and
agents to review changes, reason about ownership, and avoid collision with
parallel work.

## 2. Why Now

The TLE-first selected-pair work has made the runtime path more honest and more
testable. Continuing to add source-health, display policy, external data, or
visual-parity work directly into the monolithic controller would make the next
feature SDD harder to review.

This refactor should happen before the next data-realism or visual-parity
feature SDD.

The existing large-file audits already identify the same target:

- `docs/large-file-split-audit-2026-05-02.md`
- `docs/large-file-split-audit-2026-05-12.md`
- `docs/sdd/m8a-v4.11-refactor-guard-slice-handoff.md`

This SDD turns those audit findings into a current, executable plan.

## 3. Goals

1. Keep the controller's public API stable.
2. Move cohesive helper bands into focused modules.
3. Preserve runtime behavior, DOM data seams, route behavior, and debug payloads.
4. Reduce future merge risk by making new feature work land in smaller modules.
5. Add a guardrail that prevents the controller from growing again after the
   split.
6. Keep each slice small enough to review and revert independently.

## 4. Non-Goals

- No product behavior change.
- No visible UI redesign.
- No route contract change.
- No TLE, station registry, projection, or acceptance-data change.
- No rewrite of Cesium rendering.
- No broad stylesheet split in the first pass. `src/styles.css` is explicitly
  listed in current collision rules as sensitive parallel-WIP territory; it
  needs separate sign-off.
- No mechanical split of binary assets, fixtures, lockfiles, or retained
  evidence.
- No broad cleanup of legacy requirement-reporting code unless a slice
  explicitly owns that behavior and its visual proof.

## 5. Stable Public Surface

These exports must stay available from
`src/runtime/m8a-v4-ground-station-handover-scene-controller.ts` unless a later
approved SDD changes consumers:

```ts
export const M8A_V4_GROUND_STATION_DATA_SOURCE_NAME;
export const M8A_V4_GROUND_STATION_RUNTIME_STATE;
export const M8A_V4_GROUND_STATION_PROOF_SEAM;
export interface M8aV4GroundStationSceneState;
export interface M8aV4GroundStationSceneController;
export interface M8aV4GroundStationSceneControllerOptions;
export function isM8aV4GroundStationRuntimeRequested(search: URLSearchParams): boolean;
export function createM8aV4GroundStationSceneController(...): M8aV4GroundStationSceneController;
```

Consumers should not need to change imports during this SDD. Extracted modules
can import types from the controller during early slices, then move types only
when the dependency graph is clear and tested.

## 6. Target Module Boundaries

### 6.1 Selected-pair runtime scene layer

Proposed file:

```text
src/runtime/m8a-v4-ground-station-selected-pair-layer.ts
```

Ownership:

- selected-pair TLE-first scene install flow;
- selected-pair actor point, glow, model, label, handover cue, and active-link
  helper functions;
- selected-pair runtime data-completeness overlay construction;
- selected-pair layer disposal.

Controller responsibility after extraction:

- call the installer;
- pass viewer, clock, station pair, and callback dependencies;
- own lifecycle orchestration only.

### 6.2 Overlay debug state helpers

Proposed file:

```text
src/runtime/m8a-v4-ground-station-overlay-debug.ts
```

Ownership:

- `SelectedPairOverlayDebugStatus`;
- `SelectedPairOverlayDebugState`;
- `createSelectedPairOverlayDebugState`;
- small serialization helpers used only by the overlay state.

This module should stay DOM-free.

### 6.3 Cesium entity style helpers

Proposed file:

```text
src/runtime/m8a-v4-ground-station-cesium-entities.ts
```

Ownership:

- endpoint marker graphics;
- actor glow, label, model, relation, link-flow segment, pulse, and label
  graphics;
- update helpers for actor, relation, segment, and pulse handles;
- generic color, width, and image helpers used by those graphics.

This module should not read URL search params, mutate controller state, or own
event listeners.

### 6.4 Product panel DOM helpers

Proposed file:

```text
src/runtime/m8a-v4-ground-station-product-dom.ts
```

Ownership:

- product panel root creation;
- static DOM skeleton;
- stable element lookup;
- small rendering fragments that do not need Cesium or replay clock access.

This slice should not change visible text or layout. It only moves DOM
construction into a smaller module.

### 6.5 Placement and protection rect helpers

Proposed file:

```text
src/runtime/m8a-v4-ground-station-placement.ts
```

Ownership:

- rectangle intersection helpers;
- protection rect construction;
- scene annotation placement;
- connector start/end point placement.

This module can use DOM geometry types, but it should not mutate product state.

### 6.6 State builders

Proposed file:

```text
src/runtime/m8a-v4-ground-station-state-builders.ts
```

Ownership:

- endpoint state builders;
- replay-window state builders;
- simulation handover state builders;
- product panel state builders;
- export-bundle shaping if still needed by the controller.

This module should be pure or near-pure. It should not touch the DOM or Cesium.

### 6.7 Smoke helper extraction

Proposed file family:

```text
tests/smoke/helpers/m8a-v4-*.mjs
```

Ownership:

- shared CDP browser setup;
- route readiness polling;
- common capture reads;
- shared geometry and dataset assertions.

Large smoke files should be reduced by harness extraction, not by hiding
feature-specific assertions.

## 7. Slice Plan

### Slice R0 — Baseline and freeze guard

Record the line-count baseline and add review rules for this refactor.

Acceptance:

- line-count baseline recorded in this SDD closeout or a slice handoff;
- no behavior files changed;
- `git status --short --branch` is captured before refactor work starts;
- new feature work is paused on the large controller until R1 lands, unless the
  user explicitly overrides.

### Slice R1 — Selected-pair layer extraction

Move selected-pair TLE-first scene layer helpers out of the controller.

Acceptance:

- selected-pair short URL still reports runtime source mode;
- fixed demo route still reports fixture fallback mode;
- zero-window selected-pair route stays empty without fake actors;
- controller public exports unchanged;
- controller line count drops by at least 500 lines.

### Slice R2 — Overlay debug state extraction

Move selected-pair overlay debug state creation and narrow serializers.

Acceptance:

- D6 data-completeness smoke still passes;
- overlay payload shape unchanged;
- no DOM dependency in the new debug-state module;
- controller line count drops further or remains stable while dependency
  direction improves.

### Slice R3 — Cesium entity helper extraction

Move endpoint, actor, relation, link-flow, label, and update helper functions.

Acceptance:

- replay continuity smoke still passes;
- information-density smoke still passes;
- selected-pair 3D actors, labels, active links, and handover cues remain
  visible under existing gates;
- controller line count is below 6000.

### Slice R4 — Product panel DOM and placement extraction

Move static product panel DOM helpers and placement math.

Acceptance:

- no visible text or layout copy changes;
- product panel dataset seams remain stable;
- any existing product panel smoke still passes;
- controller line count is below 5000.

### Slice R5 — State builder extraction

Move pure state builder logic into a focused module.

Acceptance:

- telemetry sync still receives the same state shape;
- export bundle behavior, if still reachable, is unchanged;
- controller line count is below 4200;
- new state-builder module has no DOM or Cesium side effects.

### Slice R6 — Smoke harness extraction

Extract shared browser/capture helpers from large smoke tests.

Acceptance:

- at least one large smoke test loses duplicated setup code;
- feature-specific assertions remain in feature-specific smoke files;
- no validation coverage is removed;
- helper names are feature-neutral and reusable.

### Slice R7 — Stylesheet split decision

Decide whether to open a separate stylesheet SDD.

Acceptance:

- no direct edits to `src/styles.css` in this SDD unless explicitly approved;
- if approved later, define an import-order-controlled stylesheet entrypoint;
- selector moves are verified by browser screenshots or layout-box smokes.

## 8. Guardrails

### 8.1 Refactor-only rule

Each slice must be behavior-preserving. If a slice discovers a behavior bug, log
it as a follow-up unless the bug blocks the extraction.

### 8.2 Explicit staging rule

Stage only explicit paths. Do not use broad staging commands.

### 8.3 Collision rule

Before editing sensitive surfaces, check:

- `git status --short --branch`;
- recent file list from `git diff --name-only`;
- running parallel agents if unexpected changes appear.

Do not revert unrelated working-tree changes.

### 8.4 File-growth rule

After this SDD starts, new feature work should not add substantial logic to the
large controller. If a feature needs new controller behavior, first add a
focused helper module or extend an extracted module.

Suggested budget:

- controller target after R5: below 4200 lines;
- no new source module above 1200 lines without a local split note;
- no new smoke file above 1200 lines without shared-harness justification.

## 9. Acceptance Criteria

### A1. Public API stability

Existing imports of the ground-station scene controller continue to compile.

### A2. Runtime source-mode stability

Selected-pair routes remain runtime-sourced; fixed demo routes remain explicit
fixture fallback.

### A3. Data-completeness stability

Selected-pair debug payload, CSV export, TLE source manifest, actor provenance,
visibility provenance, empty reason codes, and telemetry chip datasets remain
compatible with the completed data-completeness SDD.

### A4. Visual and replay stability

Existing replay, information-density, and selected-pair visual gates continue to
pass after the slices that touch Cesium or DOM code.

### A5. Line-count improvement

Each extraction slice either reduces the large controller or records a clear
dependency reason why the reduction happens in the next slice.

### A6. No new restricted literal

New code and docs must obey the project rule forbidding new customer-name
literals. Run the project R1 scan before each commit.

### A7. No forbidden parallel-WIP edits

Do not edit the marker modules, `composition.ts`, or `src/styles.css` in this
SDD unless the user explicitly expands the scope.

### A8. Reviewable commits

Each slice should be committed separately, with a message that names the
boundary extracted.

## 10. Verification Matrix

| Gate | When | Purpose |
| --- | --- | --- |
| `git status --short --branch` | before and after every slice | collision and cleanliness check |
| `find src scripts tests docs -type f ... wc -l` | R0 and closeout | line-count evidence |
| `git diff --check` | every slice | whitespace and patch hygiene |
| project R1 scan from `AGENTS.md` | every slice | no new restricted customer-name literal |
| `npm run build` | every slice | TypeScript and bundle regression |
| `npx tsx --test tests/unit/tle-first-scene-view-model.test.mjs` | R1-R3 | scene adapter contract stability |
| `node scripts/verify-tle-first-data-completeness.mjs --port=<port>` | R1-R3 and closeout | selected-pair data-completeness stability |
| `node scripts/verify-random-pair-projection-budget.mjs --base-url=<dev-url> --port=<port> --seed=<int>` | R1-R3 and closeout | compute budget and worker path stability |
| `node scripts/verify-60x-replay-continuity.mjs --port=<port>` | R3-R5 | replay lifecycle stability |
| `node scripts/verify-information-density.mjs --port=<port>` | R3-R5 | no-overlap and density stability |

Browser gates should run after starting a local Vite dev server on an explicit
port. Stop any server started by the slice before final handoff.

## 11. Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Circular imports while moving types | build failure or hidden runtime cycles | keep public controller types stable first; move type-only imports before moving state ownership |
| Cesium entity helpers depend on controller locals | subtle render regressions | move style helpers first, then lifecycle wiring later |
| Product panel extraction changes DOM order | smoke or visual regressions | extract static DOM skeleton without changing strings or dataset names |
| Browser smoke becomes slower | delivery friction | run focused gates per slice, full matrix at closeout |
| Parallel sessions touch the same files | accidental overwrite | explicit staging and status checks before edits |
| Large module simply moves elsewhere | no real maintainability gain | enforce 1200-line soft limit and responsibility ownership per module |

## 12. Open Decisions

1. Whether R1 should extract the selected-pair layer first or whether the
   existing product panel DOM should be split first. This SDD recommends
   selected-pair first because it is the active data-completeness path.
2. Whether the stylesheet split should happen immediately after R5 or wait for
   a visual SDD. This SDD recommends waiting unless the user explicitly opens
   that scope.
3. Whether to add a CI line-count guard. This SDD recommends a documented
   manual gate first, then a script only if the controller starts growing again.

## 13. Closeout Requirements

Before marking this SDD implemented:

- list the commits for R0-R7 or explicitly mark skipped slices;
- record before/after line counts for the controller and any extracted modules;
- confirm the public exports stayed stable;
- confirm the final verification matrix results;
- confirm no forbidden parallel-WIP files were touched;
- confirm memory was not updated by non-controller agents.

## 14. References

- `docs/large-file-split-audit-2026-05-02.md`
- `docs/large-file-split-audit-2026-05-12.md`
- `docs/sdd/m8a-v4.11-refactor-guard-slice-handoff.md`
- `docs/sdd/multi-station-selector/tle-first-3d-pipeline.md`
- `docs/sdd/multi-station-selector/tle-first-data-completeness.md`
- `docs/sdd/multi-station-selector/runtime-data-contract.md`
