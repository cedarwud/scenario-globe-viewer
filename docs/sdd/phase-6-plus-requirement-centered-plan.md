# Phase 6+ Requirement-Centered Plan

Source note: this file is the repo-owned follow-on SDD for work beyond Phase 5.
It is derived from the locked requirement package, the active workspace requirement
summary chain, the locked reset-audit baseline, and current repo reality. Keep it
synchronized by editing this repo directly. Do not replace it with a symlink or
hard link.

Related structure: see [architecture.md](../architecture.md).
Related phase history: see [delivery-phases.md](../delivery-phases.md).
Related contract docs: see [scene-preset.md](../data-contracts/scene-preset.md),
[replay-clock.md](../data-contracts/replay-clock.md),
[satellite-overlay.md](../data-contracts/satellite-overlay.md), and
[scenario.md](../data-contracts/scenario.md). F-03/F-15 owner-supplied source
package intake is recorded in
[itri-external-source-package-intake.schema.json](../data-contracts/itri-external-source-package-intake.schema.json).

## Status

- Phase 1-5 remain preserved as the foundation track.
- Phase 6.0 planning closure is recorded in this file.
- Phase 6 close-out is complete and Phase 6 can be formally closed.
- Phase 6.7 bootstrap scene-starter import is accepted repo reality and should
  be treated as a downstream bridge between Phase 6 closure and later local-view
  presentation work. It does not reopen Phase 6 ordering authority.
- Structural refactor is not part of this plan.
- This plan is requirement-centered by design; it does not reopen the earlier
  reset audit.
- Deep Research / reset-audit rerun is not needed unless new Tier 1
  contradictions appear.

## Purpose

This SDD exists to answer three follow-on planning questions with the current repo
as the implementation target:

1. Is the current direction aligned with the requirement package?
2. Which lines are overbuilt, mis-prioritized, or only valuable as later
   presentation work?
3. What is the correct execution order for work beyond Phase 5?

The current repo is not treated as "nearly complete." It is treated as a strong
foundation baseline whose next steps must be driven by requirement coverage rather
than by natural momentum from overlay, label, orbit, or showcase work.

## Authority Order

When documents disagree, use this order:

1. Tier 1 requirement evidence
   - `r1.docx`
   - `kickoff.pptx`
2. Tier 2 requirement summary and active engineering index
   - `itri/README.md`
   - `itri/v4-quickstart.md`
   - `itri/v4.md`
3. Tier 3 downgraded derived/reference docs
   - `itri/v3.md`
   - `itri/v2.md`
   - `itri/v1.md`
4. Tier 4 locked governance baseline
   - `deepresearch-final-reset-audit.md`
   - `phase6-plus-governance-remap-draft.md`
5. Tier 5 repo reality
   - `scenario-globe-viewer`
   - `scenario-globe-handover-demo`
   - `estnet-bootstrap-kit`
   - `ntn-sim-core`

Interpretation rules:

- Earlier tiers win over later tiers.
- `itri/v1.md` may still be consulted for bounded Cesium satellite-visualization
  implementation questions, but it must not be used as governance authority,
  roadmap-reset authority, or Phase 6+ ordering authority.
- Repo habit and donor habit must not override the requirement package.

## Current Planning Interpretation

The current repo direction is not wrong, but its next-step priority has drift risk.

- Preserve the Phase 1-5 foundation work.
- Do not treat the current overlay/showcase line as proof that the requirement
  center is covered.
- Do not advance directly into another overlay-heavy expansion slice.
- Close requirement-to-phase remapping first, then move through the requirement-
  critical execution spine defined below.

## Repo Role Map

| Surface | Role | Authority level | Can drive ordering? | Can supply implementation reference? | Can supply validation reference? | Must stay downstream? |
|---|---|---|---|---|---|---|
| `scenario-globe-viewer` | Active delivery-aware implementation and repo-owned planning surface | Active repo-local planning/execution surface, but still subordinate to Tier 1-4 requirement/governance authority | Yes | Yes | Yes | No |
| `scenario-globe-handover-demo` | Later presentation/design probe for same-page handover storytelling | Presentation-only Tier 5 repo reality; not requirement or roadmap authority | No | Yes | No | Yes |
| `estnet-bootstrap-kit` | Donor/reference producer for bootstrap, fixture, control-layer, and validation-environment patterns | Donor/reference-only surface | No | Yes | Yes | Yes |
| `ntn-sim-core` | Semantics/reference surface for truth-vs-presentation separation and handover vocabulary | Semantics/reference-only surface; not requirement authority | No | Yes | Yes | Yes |

## Requirement Coverage Matrix

| Requirement-bearing area | Requirement source | Current repo status | Target phase(s) | Closure signal | Current risk if deferred |
|---|---|---|---|---|---|
| Orbit scope / TLE / multi-orbit | `r1.docx`: `LEO/MEO/GEO`, `≥ 500 LEO`.<br>`kickoff.pptx` Slide 2: multi-orbit switching plus `TLE` input | V4.13 now has bounded public-TLE LEO/MEO/GEO runtime evidence through `multi-orbit-scale-points`; customer orbit-model integration and measured network truth remain successor requirements | `6.1` start, `7.1` closure | Retained Phase 7.1 evidence explicitly covers LEO/MEO/GEO and no longer collapses back to walker-only | Lower after V4.13: remaining risk is external/customer-authority integration, not viewer-side public-TLE coverage |
| Dynamic parameter UI | `r1.docx`: `Dynamically adjustable parameter UI`.<br>`kickoff.pptx` Slide 5: `Adjustable simulation speed` and parameter-facing UI intent | Phase 6.2, V4.12 F-10/F-11, and D-03 now provide visible scenario, replay, policy, and bounded rule controls in the Operator HUD. These controls remain repo-owned bounded controls, not external authority controls. | `6.2`, V4.12, D-03 | User-visible controls can steer scenario, replay, policy, and bounded model inputs without rebuild or URL editing | Lower for bounded UI; remaining risk is authority-backed external parameter ownership, not absence of controls |
| Communication-time display / statistics / export | `r1.docx`: `Real-time display of available communication time`, `Statistics report export`.<br>`kickoff.pptx` Slide 5: `iperf` / `ping`-anchored communication-time display | Phase 6.3 and V4.12 F-09/F-16 provide bounded communication-time, communication-rate, statistics/report state, and export surfaces. F-07R1 provides a fail-closed reviewer for future retained traffic packages. | `6.3`, V4.12, F-07R1 | Repo-owned communication-time state, scenario-bounded summaries, report export, and package-review readiness exist independently of showcase overlays | Lower for bounded surfaces; remaining risk is retained external traffic evidence and threshold authority |
| Handover / link decision logic | `r1.docx`: `Handover policy switching`.<br>`kickoff.pptx` Slide 2 and 6: switching by `latency`, `jitter`, `network speed` across orbit classes | Phase 6.4 and V4.12 F-10/F-11 provide deterministic bounded handover decision outputs, policy switching, and rule editing. F-12R1 provides a fail-closed reviewer for future threshold authority packages. | `6.4`, V4.12, F-12R1 | Deterministic decision outputs and reason signals exist and can feed statistics, presentation, and later authority review packages | Lower for bounded decision behavior; remaining risk is retained measured inputs and owner-approved threshold semantics |
| Physical-layer / antenna / rain attenuation / ITU inputs | `kickoff.pptx` Slide 2 and 6: `physical layer`, antenna parameters, rain attenuation, `ITU` inputs | Phase 6.5 provides bounded physical-input families and projected decision effects. S4-A/S4-B/S4R1 add source classification, profile schema, and fail-closed reviewer readiness for future public standards packages. | `6.5`, S4-A/S4-B/S4R1 | Input families are explicit, provenance-tagged, consumable by the decision layer, and prepared for bounded public standards package review | Lower for bounded inputs; remaining risk is customer/V-group selected versions, parameters, approximation level, and validation vectors |
| Scenario loading / prerecorded vs real-time | `kickoff.pptx` Slide 5 and 6: `real time` vs prerecorded scenario/demo modes | Phase 6.1 provides scenario identity/source/lifecycle coordination, V4.13 proves bounded public-TLE multi-orbit runtime coverage, and S12-A defines the docs-only intake schema for later owner-supplied TLE/source packages. External scenario-source breadth for F-03/F-15 still requires owner material and later review if customer requires scope beyond the vendored public fixtures. | `6.1`, V4.13; successor F-03/F-15 source lane if required | One plain-data scenario model coordinates identity, source type, load/unload lifecycle, and mode switching | Lower for repo-owned scenario mode switching; remaining risk is external source-package authority and update cadence |
| Validation bridge / NAT / tunnel / DUT | `kickoff.pptx` Slide 3 and 6: Windows tunneling, NAT routing, virtual/physical DUT, ESTNeT/INET bridge | Phase 6.6 gives these modes a validation-state home, and V-02R1 adds a fail-closed manifest reviewer for future retained external packages. The repo still does not own real tunnel, NAT, DUT, NE-ONE, or traffic-generator execution. | `6.6`, V-02R1 | Validation modes, DUT boundaries, NAT/tunnel/bridge ownership notes, and package-review readiness are explicit and repo-owned | Lower for repo visibility; remaining risk is retained external run evidence and owner verdicts |
| 24h soak | `r1.docx` WP1 close-out and `kickoff.pptx` Slide 6: stable for at least `24` hours | Formal soak contract/harness has retained rehearsal evidence; the `24h` full-run pass artifact has not yet been produced — run must complete before this row can close | `7.0` | Repeatable soak procedure and pass/fail rule exist; retained `24h` full-run artifact still pending | Remains open until the full 24h soak completes and the artifact is retained |
| 500 LEO validation | `r1.docx`: `Support >= 500 LEO simulation`.<br>`kickoff.pptx` Slide 5: `Support >= 500 LEO simulation` | V4.12 closed the route-native LEO leg with `600` public Starlink TLE records; V4.13 carries that count inside the multi-orbit public-TLE gate | `7.1` | `multi-orbit-scale-1000` retained evidence shows `observedLeoCount = 600` with MEO/GEO counts also observed | Lower after V4.13: scale is evidenced for bounded public TLE, not for customer orbit-model or measured network truth |
| Showcase / presentation work | `kickoff.pptx` Slide 6: demo intent exists, but only after requirement-bearing surfaces are mapped | OSM showcase, orbit/label artifact lines, and handover-demo presentation work already exist as useful but non-authoritative later lines | `8.0` | Presentation work resumes only after Phases `6.1-7.1` close or are explicitly waived | Low if deferred; high only if allowed to keep driving ordering |

## Current Alignment Review 2026-05-14

The repo direction is still aligned with the customer requirement spine, with one
planning correction recorded here:

- The historical drift risk from presentation-heavy M8A work has been bounded.
  D-03 closes presentation convergence only and does not claim external
  measurement, native radio handover, customer orbit-model integration, NAT/tunnel/
  DUT validation, or full external authority acceptance.
- The Phase 6.1-6.6 implementation line now maps to real repo surfaces:
  scenario coordination, Operator HUD controls, communication-time/report
  state, deterministic handover decision state, physical-input state, and
  validation-state boundaries.
- The R1 reviewer chain now maps the major authority-gated lanes to fail-closed
  local package review surfaces: F-07/F-08/F-09, F-12, V-02..V-06,
  F-17/P-01/P-02/P-03, F-01, and S11 synthetic fallback fixtures.
- No retained owner evidence has been created by the R1 reviewer chain. The
  reviewers are readiness gates, not requirement pass evidence.
- The formerly underrepresented planning item is now partially bounded:
  F-03/F-15 external scenario-source breadth has an S12-A docs-only intake
  schema for owner-supplied TLE/source catalogs, update cadence, and
  real-time/prerecorded source rules. The repo still has no retained source
  package, reviewer, or runtime ingestion path for arbitrary owner-supplied
  source breadth beyond the vendored public fixtures.

## Preserve / Downgrade / Stop / Consider-Remove

### Preserve

- Cesium bootstrap and native `Viewer` path
- Plain-data contracts
- Replay seam
- Overlay-manager boundary
- Walker fixture adapter seam
- Site hook
- Smoke/capture/hardening
- Cleanup residue control

Reason: these lines already reduce coupling and give Phase 6+ a clean place to
land scenario, statistics, decision, and validation work without reopening
Phase 1-5 foundation decisions.

### Downgrade

- Orbit review artifact line
- Label review artifact line
- OSM Buildings showcase as a near-term driver
- Lighting/stars/shell polish as a near-term driver
- `scenario-globe-handover-demo` itself to a later presentation/design probe

Reason: these lines remain useful as later Phase 8 presentation assets, but they
must stop being read as evidence that requirement-critical work is already
covered.

### Stop Expanding

- More walker-centered screenshot parity on the current proof line
- More orbit/label widening treated as the default next move
- More donor-shaped 18-sat assumptions in public contracts
- More presentation-driven expansion before requirement closure
- More `scenario-globe-handover-demo` roadmap influence

Reason: these are the clearest priority-drift vectors under the locked
baseline.

### Consider Partial Removal Later

- Showcase-only branches with ongoing maintenance cost but weak requirement value
- Dormant shell surfaces that remain mounted without clear follow-on need
- Artifact-only lines that no longer support active governance once Phase 8 is explicitly separated

Reason: this is not immediate cleanup work. Revisit only after the requirement-
critical spine is approved and later presentation lines are clearly downstream.

## Phase 6+ Execution Principles

1. Do not reopen the reset audit unless new contradictions appear in the Tier 1
   requirement package.
2. Do not use `itri/v1.md` to set Phase 6+ ordering.
3. Do not widen the public contracts around walker-specific assumptions.
4. Keep extending repo-owned plain-data seams instead of pushing logic into the
   Cesium runtime layer prematurely.
5. Keep presentation work downstream of requirement closure.
6. Use repo reality as implementation input, not as authority that overrides the
   requirement package.

## Phase 6.0

### Name

Requirement-to-phase remapping

### Goal

Translate the requirement package into an explicit repo-owned execution spine
before any new runtime slice is promoted as "Phase 6."

### In Scope

- A requirement matrix that maps every requirement-bearing signal to either an
  existing surface or a future phase
- A repo triage table for `scenario-globe-viewer`, `scenario-globe-handover-demo`,
  `estnet-bootstrap-kit`, and `ntn-sim-core`
- A locked preserve/downgrade/stop/consider-remove baseline
- A corrected phase map for Phase 6.1-8.0

### Out Of Scope

- New overlay runtime work
- New presentation work
- Structural refactor
- Reopening the reset audit

### Acceptance Criteria

- Every requirement-bearing area in the matrix has a named home
- Every current line in repo reality is classified as preserve, downgrade, stop,
  or consider-remove
- Repo roles are explicit and non-overlapping
- This SDD is accepted as the repo-local planning surface for work beyond Phase 5

### Closure Lock

- Phase 6.0 closure is evaluated against Tier 1-5 authority order only.
- No Tier 1 contradiction was found during the closure session.
- `No, not needed` for rerunning Deep Research or reopening the reset audit.
- `Retract`: any reading of `itri/v1.md` as governance, roadmap-reset, or Phase 6+ ordering authority.
- `Retract`: any reading of `scenario-globe-handover-demo` as a roadmap driver rather than a downstream presentation probe.
- `Retract`: any assumption that the current `scene-preset` + `replay-clock` + `satellite-overlay` seams already form a sufficient scenario contract.
- Entry judgment: Phase 6.1 starts from a new repo-owned scenario contract surface.

## Phase 6.1

### Name

Scenario contract and loading model

### Goal

Lift the current preset/time/overlay seams into a real scenario model that can
carry prerecorded, real-time, site, validation, and follow-on decision-layer
work without hard-coding the walker proof line into the public contract.

### In Scope

- Scenario identity and metadata
- Scenario source type
- Scenario load/unload lifecycle
- Deterministic switching between scenarios
- Integration boundaries between `scene-preset`, `replay-clock`, and
  `satellite-overlay`

### Out Of Scope

- New orbit art
- Denser overlay expansion
- Handover demo composition work
- Replacing Cesium-native shell ownership

### Planned Outputs

- A repo-owned scenario contract doc
- A repo-owned scenario module boundary under `src/features/`
- Explicit ownership notes for how scenario loading coordinates preset, time,
  overlay, site-hook, and later validation inputs

### Boundary Lock

- `scene-preset` stays the presentation/camera shell seam only.
- `replay-clock` stays the single time-control seam only.
- `satellite-overlay` stays the fixture/overlay adapter seam only.
- The new `scenario` surface owns scenario identity, source type, lifecycle,
  and cross-seam coordination.

### Acceptance Criteria

- The public scenario shape stays plain-data and serializable
- Scenario switching is deterministic and reversible
- No walker-specific count, topology, or donor assumption leaks into the public
  contract
- Real-time and prerecorded paths share one scenario model instead of branching
  into unrelated code paths

### Closure Note

- Close-out accepted on `2026-04-19`
- `npm run build` passed
- `npm run test:phase6.1` passed
- Next active entry: `Phase 6.2`

## Phase 6.2

### Name

Dynamic parameter UI

### Goal

Land the first operator-grade control surface required by the package without
turning the app into a decorative shell rewrite.

### In Scope

- Replay speed and mode controls
- Scenario-selection controls
- Handover policy controls
- Physical-layer threshold/toggle controls
- Validation-mode toggles where applicable

### Out Of Scope

- A presentation-only HUD redesign
- Per-satellite cosmetic controls
- Replacing the native Cesium timeline or toolbar

### Acceptance Criteria

- Operators can change key runtime parameters without rebuilding or editing the
  URL directly
- The control surface remains consistent with repo-owned plain-data state
- Changes are observable by downstream statistics, decision, or validation layers
- The UI does not silently widen into a presentation-first rewrite

### Closure Note

- Close-out re-accepted on `2026-05-15` after `51965e0` repaired
  `scripts/verify-phase6.2-bootstrap-operator-controls.mjs` to localize the
  `features/handover-decision` import inside the transpile temp dir.
- `npm run test:phase6.2` passes (exit 0) as of `51965e0`.
- Audit reference: `INDEPENDENT-AUDIT-results.md` F-WP1-B row.
- Next active entry: `Phase 6.3`

## Phase 6.3

### Name

Communication-time statistics

### Goal

Create the first formal observability/reporting layer for requirement-bearing
communication-time behavior.

### In Scope

- Live communication-time readout
- Scenario-bounded communication-time summaries
- Export-ready report structure
- A repo-owned statistics boundary that later phases can consume

### Out Of Scope

- Full physical-layer modeling by itself
- Arbitrary analytics dashboards unrelated to requirement closure

### Acceptance Criteria

- Communication-time state exists independently of presentation polish
- Statistics can be tied to a scenario and time range
- Export structure is stable enough for later validation/report work
- The readout is not a one-off overlay artifact

### Closure Note

- Close-out accepted on `2026-04-19`
- `npm run test:phase6.3` passed
- Next active entry: `Phase 6.4`

## Phase 6.4

### Name

Handover and link decision layer

### Goal

Move handover from presentation language into a deterministic decision model
driven by requirement-bearing inputs.

### In Scope

- Decision inputs for latency, jitter, and network-speed-style signals
- Orbit-class-aware switching behavior
- Repo-owned decision outputs and reason signals
- A narrow semantics bridge for truth-vs-presentation separation

Dependency note:

- Phase 6.4 may begin with bounded proxy model inputs.
- Formal physical-layer inputs from Phase 6.5 must replace those proxies when
  they become available.
- Phase 6.4 is not interpreted as permission to permanently close the decision
  layer on proxy inputs alone if Phase 6.5 remains open.

### Out Of Scope

- Presentation-led proxy handover scenes as the primary target
- A donor-led control stack redesign

### Acceptance Criteria

- Decision outcomes are explainable and testable
- Inputs and outputs have repo-owned names
- The decision layer can feed both statistics and later presentation layers
- Presentation repos remain downstream consumers, not ordering authorities

### Closure Note

- Close-out accepted on `2026-04-19`
- `npm run test:phase6.4` passed
- Next active entry: `Phase 6.5`

## Phase 6.5

### Name

Physical-layer / antenna / rain attenuation / ITU parameters

### Goal

Add the requirement-bearing model inputs that the decision layer depends on.

### In Scope

- Antenna-related inputs
- Rain attenuation inputs
- ITU-style parameter inputs or explicitly bounded proxies
- Provenance notes for every new input surface

### Out Of Scope

- Treating these inputs as late-stage polish
- Hiding requirement-bearing model inputs behind showcase-only visuals

### Acceptance Criteria

- Model inputs are explicit and documented
- The decision layer can consume them deterministically
- Provenance is recorded for each input family
- The repo does not pretend these inputs are merely optional demo spice

### Closure Note

- Close-out re-accepted on `2026-05-15` after `51965e0` repaired
  `scripts/verify-phase6.5-bootstrap-physical-input.mjs` assertion target to
  match composition.ts active alias `activePhysicalInputController`.
- `npm run test:phase6.5` passes (exit 0) as of `51965e0`.
- Audit reference: `INDEPENDENT-AUDIT-results.md` F-WP1-B / P-01..P-03 rows.
- Public-source-only ITU-R physics module follow-on (2026-05-15): the
  bounded-public-source-only physics module landed under
  `src/features/itu-r-physics/` and now backs demo physical-input seeds:
  P.838-3 rain specific attenuation (`01a3820`), P.618-14 §2.4 total path
  attenuation (`be8c042`), and F.699-8 antenna sidelobe envelope plus
  boresight `G_max` (`23f4314`). Reference cases pass via
  `scripts/verify-itu-r-p838-rain-attenuation.mjs`,
  `scripts/verify-itu-r-p618-link-budget.mjs`, and
  `scripts/verify-itu-r-f699-antenna-pattern.mjs`. The module is
  intentionally bounded-public-source-only: demo frequency/elevation/
  polarization/antenna-geometry remain repo-chosen, customer/V-group
  selected parameters/vectors/tolerances/acceptance still gate authority
  closure beyond bounded-public-source-only readiness. Roadmap pointer:
  `docs/sdd/itri-requirement-completion-roadmap.md` ITU-R Physics Module
  close-out pointer. S4R1 cross-reference:
  `docs/sdd/itri-s4r1-public-standards-profile-reviewer-closeout.md`
  ITU-R Physics Module Follow-On section.
- Next active entry: `Phase 6.6`

## Phase 6.6

### Name

Validation bridge / NAT / tunnel / DUT

### Goal

Define how the viewer-side delivery repo meets the validation-environment part
of the requirement package.

### In Scope

- Validation-environment mode definitions
- Virtual and physical DUT boundary definitions
- NAT/tunnel/bridge ownership notes
- Repo-owned integration seam for validation-state input/output

### Out Of Scope

- Rebuilding the whole external validation stack inside this repo
- Letting donor repo structure become the roadmap authority

### Acceptance Criteria

- Validation modes are explicit
- External connectivity responsibilities are named
- The repo has a clear adapter/boundary for validation work
- The plan distinguishes viewer ownership from external stack ownership

### Closure Note

- Close-out accepted on `2026-04-19`
- `npm run test:phase6.6` passed
- Next active entry: `Phase 7.0`

## Phase 7.0

### Name

24h soak and stability evidence

### Goal

Promote current hygiene into formal stability evidence.

### In Scope

- Repeatable soak procedure
- Pass/fail criteria
- Failure capture and reporting
- Evidence retention rules

### Out Of Scope

- Presentation-polish work bundled into the soak gate
- Treating short smoke coverage as a substitute for formal soak evidence

### Acceptance Criteria

- Soak evidence is formal rather than implied
- Failures produce actionable outputs
- The repo can show a clear gate between "tested briefly" and "stable enough"

### Closure Note

- Close-out docs committed `2026-04-20` via `11732e3` (`docs: close out phase 7.0 soak evidence`), but the retained `24h` full-run artifact was never produced
- `npm run test:phase7.0:rehearsal` passed
- `npm run test:phase7.0:full` has **not** completed; no retained `24h` full-run artifact exists on disk
- Phase 7.0 gate remains open pending a completed full soak run

## Phase 7.1

### Name

Multi-orbit and 500 LEO validation

### Goal

Close the gap between the current walker proof path and the requirement-bearing
scope/scale signals.

### Entry Note

- The first slice is a viewer-side validation/evidence boundary, not a
  presentation slice.
- It must converge the orbit-scope matrix, retained `>= 500 LEO` evidence, and
  explicit known-gap reporting.
- It does not include `Phase 8.0` local-view/presentation work.
- It does not close external NAT / `iperf` / DUT truth.

### In Scope

- Multi-orbit validation coverage
- 500 LEO scale validation
- Evidence that current assumptions no longer collapse back to the walker line

### Out Of Scope

- Treating the current walker fixture as sufficient proxy coverage
- Using presentation captures or showcase polish as substitute scale evidence

### Acceptance Criteria

- Validation is no longer bounded to the current walker fixture
- Scope/scale evidence is explicit rather than implied
- Any remaining limitation is documented as a known gap, not hidden behind a
  showcase baseline

### Closure Note

- Close-out accepted on `2026-04-21`
- Validation/evidence boundary landed via `b83ed0b` (`feat(phase7.1): add viewer validation evidence boundary`)
- Live LEO scale expansion landed via `28fdcb8` (`feat(phase7.1): expand live leo runtime scope`)
- Multi-orbit live runtime gate closure landed via `d6b0d85` (`feat(phase7.1): close multi-orbit live runtime gate`)
- `node scripts/run-phase7.1-viewer-validation.mjs --profile first-slice --enforce-pass` passed with retained artifact under `output/validation/phase7.1/2026-04-21T05-43-35.639Z-phase7-1-first-slice/summary.json`
- Fresh reconciliation evidence on `2026-05-12`: the same command passed with
  retained artifact
  `output/validation/phase7.1/2026-05-11T16-43-23.879Z-phase7-1-first-slice/summary.json`.
  It observed `540` LEO, `6` MEO, `3` GEO, `549` total overlay points,
  `requirementGatePassed=true`, and `knownGaps=[]`. This remains separate from
  the V4 13-actor demo route and does not close external NAT / `iperf` / DUT
  truth.
- V4.13 public-TLE multi-orbit gate closure on `2026-05-13`: locked by
  [m8a-v4.13-impl-phase1-multi-orbit-spec.md](./m8a-v4.13-impl-phase1-multi-orbit-spec.md)
  and implemented against
  [m8a-v4.13-multi-orbit-scale-runtime-plan.md](./m8a-v4.13-multi-orbit-scale-runtime-plan.md).
  The retained artifact
  `output/validation/phase7.1/2026-05-13T01-38-25.092Z-multi-orbit-scale-1000/summary.json`
  reports `requirementGatePassed=true`, `overlayRenderMode="multi-orbit-scale-points"`,
  and `observedRuntimeVariant.overlayOrbitClassCounts = { leo: 600, meo: 65, geo: 30 }`.
  ADR `0005-perf-budget` was re-reviewed; the retained perf file records the
  bounded point-primitive posture with no labels, paths, polylines, or
  orbit-history accumulation. This closes only the viewer-side bounded
  public-TLE multi-orbit gate, not customer orbit-model integration, truth for
  retained traffic measurements, external validation, or native radio
  handover.
- Next active entry: `Phase 8.0`

## Phase 8.0

### Name

Viewer-local same-page local-view integration only if still justified

### Goal

Resume presentation-facing work only after requirement-critical closure is in
place or explicitly accepted as complete enough for a later presentation pass.
For current repo reality, this means productizing selected same-page local-view
capabilities from `scenario-globe-handover-demo` into
`scenario-globe-viewer` as a downstream presentation consumer of the viewer's
repo-owned scenario, replay-clock, communication-time, handover-decision,
physical-input, validation-state, and accepted `6.7` scene-starter seams.

### Locked Interpretation

- `scenario-globe-handover-demo` remains a presentation/design probe and
  implementation reference only.
- Phase 8 does not merge repos or promote demo-runtime synthetic logic into
  roadmap authority.
- Phase 8 is the correct home for same-page local-view work in
  `scenario-globe-viewer`, but only after Phase `7.0-7.1` closure or explicit
  requirement-owner waiver.
- The accepted detailed execution plan for this interpretation now lives at
  `docs/sdd/phase-8-local-view-integration-plan.md`.

### Possible Candidates

- Viewer-local focus activation and camera choreography
- Starter-export-aware local truth/presentation consumption
- Single-Viewer local-focus truth / presentation / shell separation
- More expressive local-sky storytelling
- Updated local cue grammar: resident serving beam, pending preview cue, and
  unlinked context proxy
- Presentation-polish work that stays downstream of viewer-owned semantics

### Hard Guardrail

No Phase 8 work should pre-empt unresolved requirement-critical work from
Phases 6.1-7.1.

### Acceptance Criteria

- Phase 8 work is only accepted when Phases 6.1-7.1 have closed or have been
  explicitly waived by the requirement owner.
- Presentation work remains downstream of requirement-critical closure rather
  than redefining the execution spine.
- No accepted Phase 8 slice may reopen a stopped or downgraded authority path as
  a new roadmap driver.

## Risks And Open Questions

- The exact formal scenario source set is still unresolved; S12-A defines the
  intake metadata but does not supply owner source material.
- The exact boundary between repo-owned validation logic and external stack
  ownership still needs to be written down in implementation detail.
- The final site/AOI delivery dataset is still separate from the current MVP
  validation fixture line.
- Formal admissible measurement environments remain distinct from routine WSL
  development-progression evidence.

These planning inputs are routed into Phase 6.0 closure, not into a new audit
cycle.

## V4.12 customer Must-Have Followup Chain

A parallel `V4.12` followup track addresses immediately-actionable customer
requirement closures that do not depend on external stack truth (OMNeT++ /
INET / ESTNeT), customer orbit-model delivery, or the M8A-V4 multi-orbit second
endpoint authority gate. It covers:

- F-09 dedicated communication-rate visualization
- F-10 operator-switchable handover policy
- F-11 configurable handover rules
- F-13 LEO-scale runtime (Phase 7.1 LEO leg, route-native closure slice)
- F-16 statistics report export

Single entry point:
[m8a-v4.12-followup-index.md](./m8a-v4.12-followup-index.md).

This chain runs in parallel with `Phase 8.0` work. It does not reopen Phase 6
or Phase 7 closure and does not absorb external-truth requirement scope.

## Immediate Next Step

Phase 6 formal close-out is complete.

`Phase 7.0` is closed via accepted soak-evidence close-out commit `11732e3`.

`Phase 7.1` is closed for the viewer-side bounded public-TLE gate via the
accepted validation-evidence boundary, the V4.12 LEO-scale expansion, and the
V4.13 public MEO/GEO multi-orbit retained artifact. This does not close customer
orbit-model integration, truth for retained traffic measurements, external
validation, or native radio handover.

The next active entry is `Phase 8.0`.

`Phase 8.0` may now proceed as downstream same-page local-view integration
work, provided it stays inside the accepted authority/boundary rules and does
not reopen Phase 7 requirement-critical closure by accident.
