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
[scenario.md](../data-contracts/scenario.md).

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
| Orbit scope / TLE / multi-orbit | `r1.docx`: `LEO/MEO/GEO`, `≥ 500 LEO`.<br>`kickoff.pptx` Slide 2: multi-orbit switching plus `TLE` input | Generic `tle/czml/sample-series` adapter seam exists, but live runtime is still a walker-only proof path with no formal multi-orbit scenario model | `6.1` start, `7.1` closure | Scenario contract can declare real source descriptors and orbit-class intent; later validation explicitly covers LEO/MEO/GEO and no longer collapses back to walker-only | High: walker proof risks being misread as scope coverage |
| Dynamic parameter UI | `r1.docx`: `可動態調整參數介面`.<br>`kickoff.pptx` Slide 5: `模擬速度可調` and parameter-facing UI intent | Query/bootstrap knobs and capture seam exist, but no operator-grade runtime control surface exists | `6.2` | User-visible controls can steer scenario, replay, policy, and bounded model inputs without rebuild or URL editing | High: WP1-facing operator requirement remains uncovered |
| Communication-time display / statistics / export | `r1.docx`: `即時顯示可通訊時間`, `統計報表匯出`.<br>`kickoff.pptx` Slide 5: `iperf` / `ping`-anchored communication-time display | No live communication-time state, no statistics boundary, no export-ready report structure | `6.3` | Repo-owned communication-time state, scenario-bounded summaries, and export-ready schema exist independently of showcase overlays | High: a named deliverable surface is still absent |
| Handover / link decision logic | `r1.docx`: `換手策略切換`.<br>`kickoff.pptx` Slide 2 and 6: switching by `latency`, `jitter`, `network speed` across orbit classes | No repo-owned decision layer; current runtime only proves a bounded overlay path and not switching semantics | `6.4` | Deterministic decision outputs and reason signals exist and can feed statistics and later presentation | High: central simulator behavior is still only described by requirement text |
| Physical-layer / antenna / rain attenuation / ITU inputs | `kickoff.pptx` Slide 2 and 6: `physical layer`, antenna parameters, rain attenuation, `ITU` inputs | No formal model-input seam exists in the delivery repo | `6.5` | Input families are explicit, provenance-tagged, and consumable by the decision layer | Medium-high: proxy logic may drift away from named requirement inputs |
| Scenario loading / prerecorded vs real-time | `kickoff.pptx` Slide 5 and 6: `real time` vs prerecorded scenario/demo modes | `scene-preset` covers framing only and `replay-clock` covers time only; no repo-owned scenario identity/source/lifecycle contract exists | `6.1` | One plain-data scenario model coordinates identity, source type, load/unload lifecycle, and mode switching | High: prerecorded vs real-time has no stable ownership boundary |
| Validation bridge / NAT / tunnel / DUT | `kickoff.pptx` Slide 3 and 6: Windows tunneling, NAT routing, virtual/physical DUT, ESTNeT/INET bridge | Site tileset hook exists, but it is only a visual dataset seam and not a validation-environment seam | `6.6` | Validation modes, DUT boundaries, and NAT/tunnel/bridge ownership notes are explicit and repo-owned | High: external validation requirement has no named home in the current delivery repo |
| 24h soak | `r1.docx` WP1 close-out and `kickoff.pptx` Slide 6: stable for at least `24` hours | Formal soak contract/harness now has retained rehearsal evidence plus a retained `24h` full-run pass artifact from the canonical package entry | `7.0` | Repeatable soak procedure, pass/fail rule, and retained `24h` full-run evidence exist | Lower after close-out: the formal soak gate is now evidenced rather than inferred |
| 500 LEO validation | `r1.docx`: `支援 ≥ 500 LEO 模擬`.<br>`kickoff.pptx` Slide 5: `支援 ≥ 500 LEO 模擬` | Current runtime remains bounded to the copied walker proof fixture and constrained orbit rendering | `7.1` | Explicit scale validation closes the gap between walker proof and named requirement scale | High: scale requirement is currently unproven |
| Showcase / presentation work | `kickoff.pptx` Slide 6: demo intent exists, but only after requirement-bearing surfaces are mapped | OSM showcase, orbit/label artifact lines, and handover-demo presentation work already exist as useful but non-authoritative later lines | `8.0` | Presentation work resumes only after Phases `6.1-7.1` close or are explicitly waived | Low if deferred; high only if allowed to keep driving ordering |

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

- Close-out accepted on `2026-04-19`
- `npm run test:phase6.2` passed
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

- Close-out accepted on `2026-04-19`
- `npm run test:phase6.5` passed
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

- Close-out accepted on `2026-04-20` via `11732e3` (`docs: close out phase 7.0 soak evidence`)
- `npm run test:phase7.0:rehearsal` passed
- `npm run test:phase7.0:full` passed with a retained `24h` full-run artifact
- Next active entry: `Phase 7.1`

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

- The exact formal scenario source set is still unresolved.
- The exact boundary between repo-owned validation logic and external stack
  ownership still needs to be written down in implementation detail.
- The final site/AOI delivery dataset is still separate from the current MVP
  validation fixture line.
- Formal admissible measurement environments remain distinct from routine WSL
  development-progression evidence.

These planning inputs are routed into Phase 6.0 closure, not into a new audit
cycle.

## Immediate Next Step

Phase 6 formal close-out is complete.

`Phase 7.0` is closed via accepted soak-evidence close-out commit `11732e3`.

`Phase 7.1` is closed via the accepted validation-evidence boundary, live LEO
scale expansion, and multi-orbit gate closure commits `b83ed0b`, `28fdcb8`,
and `d6b0d85`.

The next active entry is `Phase 8.0`.

`Phase 8.0` may now proceed as downstream same-page local-view integration
work, provided it stays inside the accepted authority/boundary rules and does
not reopen Phase 7 requirement-critical closure by accident.
