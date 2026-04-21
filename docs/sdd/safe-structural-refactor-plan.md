# Safe Structural Refactor Plan

Source note: this file is the repo-owned execution SDD for safe structural
refactor work in `scenario-globe-viewer`. It records implementation-order,
boundary locks, and validation requirements for refactor-only changes. Keep it
synchronized by editing this repo directly. Do not replace it with a symlink or
hard link.

Related authority:

- `README.md`
- `docs/architecture.md`
- `docs/delivery-phases.md`
- `docs/cesium-evidence.md`
- `docs/visual-baselines.md`
- `docs/deployment-profiles.md`
- `docs/decisions/0006-phase-3.1-execution-governance.md`
- `docs/decisions/0007-formal-site-dataset-integration-governance.md`
- `docs/decisions/0008-phase-3-wsl-development-progression.md`
- `docs/sdd/phase-6-plus-requirement-centered-plan.md`
- `docs/sdd/phase-8-local-view-integration-plan.md`
- `docs/data-contracts/scene-preset.md`
- `docs/data-contracts/replay-clock.md`
- `docs/data-contracts/satellite-overlay.md`
- `docs/data-contracts/scenario.md`
- `docs/data-contracts/physical-input.md`
- `docs/data-contracts/document-telemetry.md`
- `docs/data-contracts/soak-evidence.md`
- `docs/data-contracts/phase7.1-validation-evidence.md`

## Status

- Proposed on `2026-04-21`
- Created after a repo-structure audit of active runtime, test harness, and
  authority docs
- `SR0` authority sync is in progress across `README.md`,
  `docs/architecture.md`, and `docs/delivery-phases.md`
- This plan does not change product scope, phase ordering, or requirement
  authority
- This plan exists because the repo has reached a stage where structural drift
  now creates delivery risk even when runtime validation is still passing

## Purpose

This SDD exists to make structural cleanup executable without turning it into an
unsafe rewrite.

The current repo is functional. The risk is not "known broken runtime." The
risk is:

1. authority docs no longer describe the same active surface
2. `src/main.ts` has become the single integration choke point
3. test-only state exposure is spread ad hoc across runtime and HUD modules
4. large bootstrap proxy seed files mix static data with runtime logic
5. the main smoke harness is now large enough to resist safe maintenance

The goal is to reduce those risks while preserving:

- Cesium bootstrap behavior
- current phase boundaries
- accepted build and smoke evidence
- repo-owned public contracts
- current capture and validation capability

## Non-Goals

This plan must not be used to justify:

- a Cesium bootstrap rewrite
- a replay-clock redesign
- a site-hook redesign
- a satellite overlay feature expansion
- a new UI direction
- a new authority chain that overrides the current requirement-centered plans
- deleting dormant or legacy files before authority and validation boundaries are
  explicit

## Authority Position

This SDD is downstream execution guidance for refactor-only work.

If this file disagrees with:

- `docs/sdd/phase-6-plus-requirement-centered-plan.md`
- `docs/sdd/phase-8-local-view-integration-plan.md`

those requirement-centered SDDs win. This file may refine refactor sequencing
only after their product/phase authority is already accepted.

## Current Structural Findings

### 1. Authority drift

The initial audit found authority drift between repo documents.

- `README.md` already described active `6.x/7.x` repo reality
- `docs/delivery-phases.md` preserved much of that reality in `Current
  Snapshot`, but its `Beyond Phase 5` summary lagged behind the accepted
  `6.7/7.0/7.1/8.0` state
- before `SR0` started, `docs/architecture.md` still capped the runtime
  implementation target at Phase 5
- `phase-6-plus-requirement-centered-plan.md` and
  `phase-8-local-view-integration-plan.md` already assume later runtime and
  evidence surfaces exist

`SR0` starts by correcting that mismatch so later cleanup does not delete active
surfaces by mistake. Future refactor slices must keep those authority files in
sync.

### 2. Overloaded composition root

`src/main.ts` currently owns:

- bootstrap state/error wiring
- app shell mount
- query/bootstrap selection
- viewer creation
- replay-clock creation
- bootstrap scenario catalog/session setup
- bootstrap operator/controller graph setup
- validation serving-context bridge wiring
- HUD mount
- satellite overlay controller creation
- capture seam exposure
- lighting/showcase mount
- HMR cleanup

This is still understandable, but it is now too central for safe follow-on work.

### 3. Capture and telemetry coupling

The current runtime exposes validation state through two parallel mechanisms:

- `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__`
- widespread `document.documentElement.dataset.*` writes

This capability is necessary, but the ownership is not explicit enough yet.
Multiple feature panels write overlapping document-level state, which makes
refactor safety dependent on many implicit test assumptions.

### 4. Static proxy data mixed with runtime logic

Large runtime-adjacent files such as
`src/runtime/bootstrap-physical-input-source.ts` mix:

- scenario-bound proxy seeds
- provenance text
- helper constructors
- runtime state derivation entry points

This increases review surface for otherwise simple data changes.

### 5. Oversized smoke harness

`tests/smoke/bootstrap-loads-assets-and-workers.mjs` currently combines:

- dist verification
- static server lifecycle
- browser startup/teardown
- CDP helpers
- layout assertions
- baseline checks
- showcase failure injection
- site-dataset checks
- overlay toggle checks
- suite routing

This file is useful evidence, but it is too large for low-risk maintenance.

## Boundary Lock

The following surfaces are explicitly preserved during this refactor plan:

- `src/core/cesium/bootstrap.ts`
- `src/core/cesium/viewer-factory.ts`
- `src/features/time/cesium-replay-clock.ts`
- `src/features/globe/site-3d-tiles-hook.ts`
- the accepted Phase `6.1` ownership split where `scene-preset`,
  `replay-clock`, and `satellite-overlay` remain bounded seams and `scenario`
  owns scenario identity, source type, lifecycle, and cross-seam coordination
- every file listed as the current public source of truth in
  `docs/data-contracts/*.md`, including the current `scenario`,
  `physical-input`, `soak-evidence`, and `phase7.1-validation-evidence`
  surfaces
- the accepted Phase `6.2-6.7` bootstrap runtime line, including
  `src/runtime/bootstrap-*-source.ts` and
  `src/runtime/bootstrap-*-controller.ts`
- `tests/soak/run-soak.mjs`
- `tests/validation/run-phase7.1-viewer-scope-validation.mjs`
- `scripts/run-phase7.1-viewer-validation.mjs`
- `src/runtime/satellite-overlay-controller.ts` behavior
- `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__` capability
- document dataset signals required by accepted smoke, soak, and validation
  evidence

Preserved does not mean frozen forever. It means this plan may reorganize
ownership and call sites, but it must not silently change behavior or evidence
semantics.

## Refactor Principles

1. Behavior-first, shape-second.
   The runtime must keep the same visible behavior and evidence signals while
   files are moved or split.
2. One structural concern per slice.
   Do not combine authority sync, runtime split, data extraction, and harness
   modularization in one commit-sized change.
3. Keep public contracts stable.
   `docs/data-contracts/*` and repo-owned feature contracts stay authoritative
   unless a specific accepted slice says otherwise.
4. Test seams stay explicit.
   If validation depends on a signal, promote that signal into a named boundary
   instead of leaving it as accidental DOM state.
5. Delete only after replacement.
   Unused or dormant modules should be removed only after imports, authority
   docs, active test paths, and documented phase-history evidence are re-checked
   in the same slice.

## Execution Order

## Phase SR0

### Name

Authority synchronization

### Goal

Bring repo authority docs back into internal agreement before any structural
code movement starts.

### In Scope

- align `README.md`, `docs/architecture.md`, and `docs/delivery-phases.md`
  around active `6.x/7.x` repo reality
- explicitly classify this SDD as refactor-only and downstream of the current
  requirement-centered plans
- record which surfaces are active, dormant, historical, or cleanup candidates

### Out Of Scope

- runtime code changes
- test harness changes
- deleting dormant modules

### Acceptance Criteria

- repo authority no longer disagrees about whether `6.x/7.x` runtime surfaces
  are active
- refactor-only scope is explicit and does not override product-phase authority
- cleanup candidates are classified conservatively and not yet removed
- `SR0` is accepted only when the documentation-only authority-sync set is
  committed as one repo slice before any `SR1` runtime refactor begins

## Phase SR1

### Name

Bootstrap composition extraction

### Goal

Reduce `src/main.ts` to a thin entrypoint by moving orchestration into a bounded
bootstrap composition module.

### In Scope

- extract a repo-owned bootstrap composition module under
  `src/runtime/bootstrap/composition.ts` plus adjacent helpers in the same
  subdirectory
- move controller graph creation and teardown into named helpers
- keep `main.ts` focused on root lookup, bootstrap start, and final mount

### Out Of Scope

- changing controller behavior
- changing capture seam shape
- changing HUD content
- relocating the existing `src/runtime/bootstrap-*-source.ts` or
  `src/runtime/bootstrap-*-controller.ts` files during `SR1`

### Acceptance Criteria

- `src/main.ts` no longer directly wires the full controller graph
- teardown remains deterministic and complete
- current build plus Phase 1 / Phase 6 validation still pass

## Phase SR2

### Name

Capture and telemetry boundary formalization

### Goal

Make validation-facing runtime state explicit instead of leaving it scattered
across ad hoc dataset writers.

### In Scope

- define one repo-owned capture/telemetry boundary document
- keep `docs/data-contracts/document-telemetry.md` aligned with runtime writers
- centralize document-level dataset writes behind named helpers or modules
- distinguish panel-local DOM state from document-level test telemetry
- keep existing smoke/soak/validation readers working

### Out Of Scope

- removing the capture seam entirely
- removing dataset-based validation immediately

### Acceptance Criteria

- document-level telemetry has a named owner
- `docs/data-contracts/document-telemetry.md` matches the landed writer surface
- feature panels no longer each reinvent document-level sync patterns
- accepted smoke and validation harnesses continue to read the same evidence
  semantics

## Phase SR3

### Name

Bootstrap proxy seed extraction

### Goal

Separate static proxy scenario data from runtime derivation code.

### In Scope

- move large proxy seed tables into dedicated data modules or JSON-like TS
  modules
- keep provenance text and scenario labels close to the seed data
- keep controllers and source resolvers focused on transformation logic

### Out Of Scope

- changing proxy values
- changing requirement interpretation
- changing report schema versions

### Acceptance Criteria

- large seed-heavy runtime files are materially smaller
- runtime logic can be reviewed without scrolling through full proxy datasets
- all existing source/controller validation remains green

## Phase SR4

### Name

Smoke harness modularization

### Goal

Split the main smoke harness into bounded helper modules without changing its
evidence contract.

### In Scope

- extract browser lifecycle helpers
- extract CDP evaluation helpers
- extract suite scenario tables
- extract specialized assertion/failure-injection helpers where useful

### Out Of Scope

- changing smoke suite semantics
- changing the accepted baseline assertions
- replacing the harness with another framework

### Acceptance Criteria

- the top-level smoke entry file becomes primarily orchestration
- failure injection and suite routing remain readable and auditable
- `npm run test:phase1` remains green
- `npm run test:phase1:showcase` remains green
- `npm run test:phase1:site-dataset` remains green
- `npm run test:phase1:site-hook-conflict` remains green
- `npm run test:phase5.1` remains green

## Phase SR5

### Name

Dormant and unused surface cleanup

### Goal

Remove or downgrade clearly unused repo-local modules only after the structural
boundaries above are in place.

### Initial classification notes

The initial audit surfaced several low-import or dormant-looking modules, but
`SR0` does not pre-approve any of them for deletion.

Keep, do not treat as automatic cleanup candidates:

- `src/core/cesium/credits.ts` because `docs/delivery-phases.md` still records
  it as historical Phase 1 attribution-wrapper evidence
- `src/features/globe/fog-and-post-process.ts` because
  `docs/delivery-phases.md` explicitly keeps it as dormant historical Phase 2.4
  evidence
- `src/features/globe/global-preset.ts` because
  `docs/delivery-phases.md` still records it as historical Phase 2.9 evidence
- `src/features/overlays/index.ts` because
  `scripts/verify-phase3.6-overlay-manager-contract.mjs` treats it as the
  active Phase 3.6 contract-verifier target

Any future deletion or downgrade must re-check current imports, docs, active
test paths, and documented phase history immediately before the change, and it
must update the affected authority/evidence chain in the same slice.

### Out Of Scope

- deleting modules that are merely dormant in docs but still intended as active
  future slices
- deleting files that remain active contract-verifier targets or documented
  historical phase evidence without updating that authority/evidence chain in
  the same slice
- removing evidence-only historical artifact lines from `docs/images/`

### Acceptance Criteria

- each removed or downgraded file has a recorded reason
- no authority doc or active contract verifier still points to a removed active
  surface
- any deleted historical evidence surface is paired with the required
  `docs/delivery-phases.md` or contract-doc update in the same slice
- build and targeted validation stay green after cleanup

## Required Validation

Minimum validation for any structural slice:

- `npm run build`
- `npm test`
- `npm run test:phase1`

Additional slice-specific validation:

- any `scenario`, session, bootstrap composition, or controller-graph change:
  `npm run test:phase6.1`, `npm run test:phase6.2`, `npm run test:phase6.3`,
  `npm run test:phase6.4`, `npm run test:phase6.5`, `npm run test:phase6.6`,
  and `npm run test:phase6.7`
- any touch to `src/runtime/bootstrap-*-source.ts` or
  `src/runtime/bootstrap-*-controller.ts`:
  `npm run test:phase6.2`, `npm run test:phase6.3`, `npm run test:phase6.4`,
  `npm run test:phase6.5`, `npm run test:phase6.6`, and
  `npm run test:phase6.7`
- any physical-input contract or source extraction:
  `npm run test:phase6.5`
- any scene-starter, validation-state, or document-level telemetry change:
  `npm run test:phase6.6`, `npm run test:phase6.7`, and
  `node scripts/run-phase7.1-viewer-validation.mjs`
- any overlay controller or capture boundary change:
  `npm run test:phase5.1`, `npm run test:phase7.0:rehearsal`, and
  `node scripts/run-phase7.1-viewer-validation.mjs`

If a slice touches only docs, code validation is optional but the affected
authority files must be reviewed together.

## Deviation Rules

The following require updating this SDD before continuing:

- a slice needs to change public evidence semantics
- the capture seam must change shape
- a later phase decides to replace dataset-based evidence with another boundary
- a proposed cleanup candidate is discovered to be active product authority,
  active contract-verifier surface, or documented historical evidence
- Phase 8 local-view work needs to consume the same files being refactored

## Recommended First Slice

Start with `SR0`.

Reason:

- the repo currently has authority disagreement
- safe deletion depends on fixing that disagreement first
- `SR0` is the lowest-risk slice and improves decision quality for all later
  refactor steps

Only after `SR0` is accepted should the repo move into `SR1` runtime
composition extraction.

For this plan, "`SR0` is accepted" means the documentation-only authority-sync
set has been committed as one repo change before any `SR1` runtime code
movement starts.
