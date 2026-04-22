# Multi-Orbit First Intake Checklist

Source note: this file is a planning-stage intake checklist for the first
real-world multi-orbit contract-adoption slice in `scenario-globe-viewer`.
Keep it synchronized by editing this repo directly. Do not replace it with a
symlink or hard link.

Related proposal: see
[multi-orbit-contract-adoption-proposal.md](./multi-orbit-contract-adoption-proposal.md).
Related scenario contract: see [../data-contracts/scenario.md](../data-contracts/scenario.md).
Related physical-input contract: see [../data-contracts/physical-input.md](../data-contracts/physical-input.md).
Upstream research authority: see
[../../../itri/multi-orbit/README.md](../../../itri/multi-orbit/README.md).
Related prep bridge: see
[../../../itri/multi-orbit/prep/viewer-contract-widening-proposal.md](../../../itri/multi-orbit/prep/viewer-contract-widening-proposal.md),
[../../../itri/multi-orbit/prep/endpoint-overlay-seed-draft.md](../../../itri/multi-orbit/prep/endpoint-overlay-seed-draft.md),
and
[../../../itri/multi-orbit/prep/seeds/oneweb-intelsat-geo-aviation.seed.json](../../../itri/multi-orbit/prep/seeds/oneweb-intelsat-geo-aviation.seed.json).

## Purpose

This checklist answers one narrow question:

When is the repo ready to start **contract work** for the first real-world
multi-orbit case?

It does **not** authorize runtime implementation, overlay implementation, HUD
implementation, or metric calibration.

## First Intake Target

Current first intake target:

- `OneWeb LEO + Intelsat GEO aviation`
- `commercial_aviation`
- `aircraft onboard connectivity stack`
- `service-layer switching`
- `isNativeRfHandover = false`

## Stage A: Intake Selection

- [ ] The first intake case is still `OneWeb + Intelsat GEO aviation`
- [ ] No weaker case has replaced it only because it looks easier to render
- [ ] The repo still treats this as a real-world pairing with bounded runtime
      projection rather than a direct measured-truth import

## Stage B: Truth Boundary

- [ ] `isNativeRfHandover = false` remains explicit
- [ ] `truthBoundaryLabel` remains a closed accepted vocabulary value
- [ ] service-layer switching remains the accepted decision model
- [ ] bounded runtime projection remains explicit
- [ ] the repo is not silently treating projected latency/jitter/throughput as
      research truth

## Stage C: Endpoint Semantics

- [ ] endpoint A is still treated as a mobile aviation endpoint
- [ ] endpoint B is still treated as a logical/provider-managed anchor
- [ ] the repo is not inventing a public fixed GEO ground anchor to simplify
      the scene
- [ ] mobile endpoint trajectory ownership is still treated as a later adapter
      or seed-resolution step

## Stage D: Infrastructure Semantics

- [ ] OneWeb ground nodes are still treated as an eligible pool
- [ ] the repo is not falsely pinning one active OneWeb gateway without
      evidence
- [ ] non-canonical sites are still excluded from first-intake planning

## Stage E: Contract Delta Scope

- [ ] `scenario` widening is still limited to a narrow context layer
- [ ] `physical-input` widening is still the main path-semantics intake seam
- [ ] first-round `physical-input` widening is paired with a repo-owned static
      bounded metric profile, not hardcoded adapter literals
- [ ] `handover-decision` widening is deferred until a first runtime or
      validation consumer exists
- [ ] endpoint semantics are still planned as a separate plain-data seed, not
      folded into `scenario` or `physical-input`
- [ ] provider infrastructure is still planned as a separate plain-data seed,
      not folded into `scenario` or `physical-input`
- [ ] mobile endpoint trajectory ownership is still reserved for a later seam
      rather than being stuffed into overlay or scenario ownership

## Stage F: Stop Conditions

If any of the following becomes true, stop before contract edits:

- [ ] a tri-orbit generic schema is being added before the first case is proven
- [ ] raw research metadata is being pushed directly into repo-owned runtime
      contracts
- [ ] the repo is trying to solve exact mobile trajectory truth during the
      first contract delta
- [ ] the repo is using contract work to reopen overlay-heavy runtime expansion

## Exit Condition

This checklist is satisfied only when the repo can honestly say:

1. the first real-world intake case is still narrow and stable
2. the truth boundary is still explicit
3. contract widening is still minimal
4. runtime work has **not** started yet

Only after that should the repo begin contract edits in:

- `scenario`
- `physical-input`
- separate endpoint overlay seed
- separate infrastructure overlay seed

`handover-decision` is explicitly allowed to follow later once a first consumer
exists.
