# ADR 0008: Phase 3 WSL Development Progression

## Status

Accepted

## Context

The repo's formal Phase 3 readiness gate is still blocked by the missing Tier 1 / Tier 2 Profile A admissible real-machine measurements recorded in ADR `0005-perf-budget.md`.

That formal blocker is still real, but the operating assumptions for the active line have also stabilized:

- the active implementation environment remains WSL-backed
- the repo already has a Phase 2 close-out anchor plus landed `3.1` work
- the repo now also has a separate formal site dataset MVP line that preserves the dormant Phase 2.12 baseline instead of rewriting it
- ongoing development still needs a predictable way to continue Phase 3 work without pretending WSL evidence closes the formal measurement gate

ADR `0006-phase-3.1-execution-governance.md` solved the first step by authorizing the initial `3.1` slice only. That narrow exception was useful as a bootstrap checkpoint, but continuing to govern every later Phase 3 slice through fresh one-off exceptions would create unnecessary governance churn while the workspace assumptions remain unchanged.

The repo therefore needs a more durable execution model:

- keep the formal readiness gate intact
- keep WSL evidence explicitly non-admissible for that gate
- but also allow routine Phase 3 implementation slices to continue under a separate, constrained progression model

## Decision

Split the old single gate into two governance surfaces:

1. `formal Phase 3 readiness`
2. `Phase 3 development progression under WSL`

The formal readiness gate remains unchanged:

- it stays `no-go` until admissible Tier 1 / Tier 2 Profile A real-machine measurements exist
- WSL smoke, WSL visual refreshes, SwiftShader runs, and repo-owned fixture artifacts still do not count as admissible measurement evidence

The new development-progression gate is:

- `go with constraints` under the current WSL-only operating assumption
- applicable to routine `3.2+` implementation slices inside the existing Phase 3 scope
- not itself a release gate, handoff gate, or proof that formal Phase 3 readiness has closed

For a routine Phase 3 slice to proceed under this WSL development-progression gate, it must:

- pass `npm run build`
- pass `npm run test:phase1`
- pass the slice-specific smoke and/or capture path
- keep the accepted Phase 2.12 dormant-hook baseline intact
- keep the Profile C OSM showcase and formal site dataset lines separated according to ADR `0007-formal-site-dataset-integration-governance.md`
- update source-of-truth docs when runtime contracts, visible shell behavior, overlay seams, or time-model semantics change

This ADR does **not** authorize silent widening. A fresh governance checkpoint is still required when a proposed slice:

- expands deployment-profile semantics
- widens data contracts or ingestion seams
- reclassifies the site dataset line
- changes Phase 3 scope itself rather than implementing a routine slice inside that scope
- or claims to close the admissible-measurement gate

## Consequences

- Formal Phase 3 readiness can remain honestly `no-go` without freezing all Phase 3 implementation work.
- Routine `3.2+` work no longer needs a brand-new ad hoc exception every time the next slice stays inside the current WSL-backed development model.
- Reviews can distinguish between:
  - formal readiness closure
  - routine WSL-backed progression
  - and separate governance lines such as formal site dataset follow-ons
- ADR `0006-phase-3.1-execution-governance.md` remains valuable as the historical record of the first `3.1` start, but this ADR becomes the current authority for ongoing Phase 3 execution under WSL.
