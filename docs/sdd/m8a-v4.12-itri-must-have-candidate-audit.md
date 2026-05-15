# M8A V4.12 customer Must-Have Candidate Audit

Date: 2026-05-06
Status: planning audit, doc-only. No implementation authority, no runtime change, no smoke, no commit.

Working phase name: **M8A V4.12 customer must-have followup**.

Canonical planning SDD for the recommended candidate:
[m8a-v4.12-f16-statistics-report-export-plan.md](./m8a-v4.12-f16-statistics-report-export-plan.md).

## 1. Audit Table

Required `ui-ux-pro-max` searches were run from the installed skill path
`/home/u24/.codex/skills/ui-ux-pro-max/scripts/search.py` because the repo-local
`.codex` path is a file in this workspace. The exact required query strings were
used.

| ID | customer demo impact | Implementation footprint | Risk of over-claim | V4.11 / Phase 7.1 dependency | Acceptance criteria | Skill rationale |
|---|---|---|---|---|---|---|
| F-09 dedicated communication-rate visualization | Highest visible delta because acceptance status says there is no dedicated surface yet. A new rate surface would be obvious in an customer WP review. | Tier 2, about 3-4 implementation conversations: new visualization component, source wiring from bounded `networkSpeedMbps`, copy/claim reconciliation, smoke. | Medium-high. Numeric Mbps can look like measured throughput. Any closure must label values as modeled/proxy class, not live `iperf` / measured throughput. | Independent from V4.11 and Phase 7.1 if scoped to the existing bounded physical/decision metrics. Must not pretend to solve Phase 7.1 scale. | F-09 closure requires a visible communication-rate visualization surface for the existing bounded model, with provenance and no measured throughput claim. | Required chart query returned `Trend Over Time` line chart and `Performance vs Target` gauge/bullet options. Use a simple trend/bullet/class readout, with visible labels, legend, data-table fallback, and color-not-only treatment. |
| F-10 operator-switchable handover policy | Medium-high. It improves the existing Handover Decision panel and lets reviewers see policy choice rather than fixed bootstrap behavior. | Tier 2-3, about 4-5 conversations: policy contract, operator selector, state propagation, persistence/replay behavior, smoke. | Medium. "Switch policy" can sound like live network control. UI must say bounded simulation policy / service-layer decision policy. | Independent from V4.11 if kept in the Bootstrap Operator HUD seam. Can become entangled if someone tries to retrofit it into the V4.11 review scene. | F-10 closure requires an end-user policy selector whose selected bounded policy changes the repo-owned handover decision/report state and is visible in the panel/export, without live RF/network claims. | Required UX query returned no direct rows. Fallback skill rules still apply: native/system controls, visible labels, keyboard focus, disabled/loading feedback, and no ambiguous disabled state. |
| F-11 configurable handover rules / dynamic parameters | Medium. It gives operator interaction and would make the simulator feel more configurable, but it is less instantly reviewable than F-09 or F-16 unless carefully staged. | Tier 3, 5+ conversations: rule schema, validation, UI editor, state integration, persistence/undo, smoke and forbidden-claim checks. | Highest of the small candidates. A rule editor can look like a real network controller unless all controls are bounded simulation parameters. | Mostly independent from V4.11 and Phase 7.1, but it depends on stronger handover-rule contracts and likely follows F-10. | F-11 closure requires user-configurable bounded handover rules/parameters, validation and error handling, deterministic effect on simulation reports, and copy that prevents real controller claims. | Required UX query returned no direct rows. Supplemental skill searches support form labels, helper text, inline validation, focus states, keyboard navigation, and ARIA labels. That points to a larger form/configuration workflow rather than a quick panel patch. |
| F-16 statistics report export | High deliverable credibility. It produces an artifact reviewers can inspect, attach, and archive. It is less visually dramatic than F-09 but more closure-oriented. | Tier 1-2, about 2-3 conversations: export contract, one end-user action, CSV/JSON serialization, smoke/download validation. | Lowest. Exporting the repo-owned bounded reports is honest if the exported payload preserves schemaVersion, provenance, and "not measured truth" disclaimers. | Independent from V4.11 and Phase 7.1. It can use existing Phase 6 report structures and does not require the V4.11 scene. | F-16 closure requires an end-user export workflow/button that downloads statistics report data from existing communication-time, handover, physical-input, and validation-state report structures, with provenance and bounded truth labels. | Required UX query returned no direct rows, but the skill file's chart/data guidance includes export options for data-heavy products, and supplemental searches emphasize loading feedback, focus states, keyboard navigation, and ARIA labels. This maps cleanly to a compact export workflow. |

## 2. Recommended Pick

Recommended pick: **F-16 statistics report export**.

customer demo impact ranking:

1. F-09: highest visual delta because there is no rate surface.
2. F-16: strongest deliverable artifact because it creates downloadable report evidence.
3. F-10: useful operator credibility improvement on an existing panel.
4. F-11: valuable but larger and easier to over-scope.

F-16 is the best first V4.12 pick because it has the shortest credible path to
formal acceptance-gate closure, the lowest over-claim risk, and the least
entanglement with V4.11 or Phase 7.1. The acceptance report already says
export-ready report structures exist but the end-user export workflow does not.
That makes the missing slice narrow and verifiable.

F-13 `>=500 LEO` is explicitly out of scope for this task. It remains the larger
Phase 7.1 gate, not a V4.12 small must-have followup candidate.

Skill-grounded rationale:

- The required F-16 query had no direct UX database result, so no nonexistent
  pattern should be claimed.
- `ui-ux-pro-max` chart/data guidance still supports export affordances for
  data-heavy products.
- Supplemental skill searches found high-severity guidance for loading feedback,
  focus states, ARIA labels, and keyboard navigation. Those are exactly the
  high-risk details for a small export action.
- `frontend-ui-engineering` favors focused components, simple state ownership,
  accessibility, and project design-system adherence. F-16 can follow that
  without inventing a new rule engine or policy architecture.

## 3. Planning SDD For F-16

The full planning SDD is:
[m8a-v4.12-f16-statistics-report-export-plan.md](./m8a-v4.12-f16-statistics-report-export-plan.md).

Summary:

- §0 status: planning only, doc-only, no implementation authorized.
- §1 customer requirement: F-16, `Statistics report export`, currently `Partial`.
- §2 current reality: Phase 6 has report structures for communication-time,
  handover-decision, physical-input, and validation-state; the Operator HUD has
  scenario/replay/speed controls and panel slots, but no export action.
- §3 goal: close F-16 with a visible end-user export workflow that downloads
  bounded statistics reports as CSV/JSON and preserves provenance/disclaimers.
- §4 scope: export workflow only, no F-09/F-10/F-11/F-13, no backend, no measured
  truth, no V4.11 scene rewrite.
- §5 forbidden claims: no measured throughput, no live ping/iPerf, no active
  satellite/gateway/path, no native RF handover, no `>=500 LEO` closure.
- §6 phase count: 4 implementation phases with reconciliation.
- §7 skill plan: rerun/report the required export query, then apply accessibility,
  loading feedback, focus, ARIA, and export-option guidance during UI and smoke.
- §8 V4.11 entanglement: independent.
- §9 open questions: combined vs per-panel export, CSV shape, placement, file
  naming, and whether bounded export is accepted as F-16 closure.

## 4. Why Not The Other Three

**F-09** should be deferred because it has the biggest visual payoff but a higher
truth-boundary burden. Existing `networkSpeedMbps` values are repo-owned bounded
proxies, not measured throughput, and a dedicated visualization must be designed
carefully so numeric Mbps does not read as live RF or `iperf` truth. It becomes a
good followup after F-16 because the export workflow can already establish the
report/provenance pattern that F-09 would need.

**F-10** should be deferred because switching policies requires state and
contract work, not just a selector. The current policy is fixed at
`bootstrap-balanced-v1`; closing F-10 means policy selection must alter bounded
decision behavior, report state, persistence or replay behavior, and copy. That
is credible work, but it is larger and more claim-sensitive than F-16.

**F-11** should be deferred because a handover rule editor is the largest and
riskiest small-candidate path. It needs rule schema design, validation,
error-handling, interaction design, and deterministic runtime effects. It is
best unlocked after F-10 clarifies the policy model and after the team decides
which rule parameters are truly in scope for bounded simulation control.
