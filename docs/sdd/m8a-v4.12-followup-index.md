# M8A V4.12 ITRI Must-Have Followup Index

Date: 2026-05-12
Working phase name: **M8A V4.12 ITRI must-have followup**.

Status refresh: 2026-05-13. The V4.12 bounded followup chain is closed, and
the V4.13 public-TLE multi-orbit follow-on is also closed for viewer-side
bounded runtime evidence.

## 0. Purpose

Single entry point for the V4.12 chain of ITRI must-have followup SDDs.
A reader landing here should not need to re-discover which F-IDs have
which planning/spec docs, what the execution ordering is, or what each
slice is allowed to claim.

Source authority chain (Tier 1 → 5):

1. `/home/u24/papers/itri/r1.docx` + `kickoff.pptx`
2. `/home/u24/papers/itri/README.md`
3. `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md`
4. [phase-6-plus-requirement-centered-plan.md](./phase-6-plus-requirement-centered-plan.md)
5. this repo

## 1. Scope Boundary

V4.12 covers only **immediately-actionable** ITRI requirement closures that
do **not** require:

- new ITRI-supplied orbit model data (F-01)
- new V組-supplied physical model data (P-01..P-03, F-17)
- external OMNeT++ / INET / ESTNeT stack (F-07/F-08/F-12 measured truth,
  V-02..V-06 end-to-end)
- new multi-orbit second-endpoint authority gate (M8A-V4 product anchor)

V4.12 explicitly closes:

- **F-09** dedicated communication-rate visualization
- **F-10** operator-switchable handover policy
- **F-11** configurable handover rules
- **F-13** LEO-scale runtime (Phase 7.1 LEO leg only)
- **F-16** statistics report export

V4.12 explicitly does **not** close:

- F-01 (needs ITRI orbit model)
- F-02 full ITRI/radio/endpoint authority. V4.13 separately closes only the
  bounded public-TLE LEO/MEO/GEO viewer gate.
- F-03 full external-source/ITRI-model TLE breadth. V4.13 covers bounded
  public-TLE runtime evidence, not ITRI source-model intake.
- F-07/F-08/F-12 measured-truth upgrades
- F-17 / P-01..P-03 real physical model
- V-02..V-06 external validation end-to-end
- D-03 richer presentation (covered by M8A-V3 presentation convergence
  umbrella)

## 2. Doc Map

| F-ID | Status | Planning SDD | Phase 1 spec | Implementation start? |
|---|---|---|---|---|
| F-09 | 已完成（bounded） | [m8a-v4.12-f09-communication-rate-visualization-plan.md](./m8a-v4.12-f09-communication-rate-visualization-plan.md) | [m8a-v4.12-f09-impl-phase1-visualization-spec.md](./m8a-v4.12-f09-impl-phase1-visualization-spec.md) | closed — [m8a-v4.12-f09-impl-phase5-closeout.md](./m8a-v4.12-f09-impl-phase5-closeout.md) |
| F-10 | 已完成（bounded） | [m8a-v4.12-f10-handover-policy-selector-plan.md](./m8a-v4.12-f10-handover-policy-selector-plan.md) | [m8a-v4.12-f10-impl-phase1-policy-spec.md](./m8a-v4.12-f10-impl-phase1-policy-spec.md) | closed — [Phase 5 evidence](./m8a-v4.12-f10-impl-phase5-closeout.md) |
| F-11 | 已完成（bounded） | [m8a-v4.12-f11-handover-rule-config-plan.md](./m8a-v4.12-f11-handover-rule-config-plan.md) | [m8a-v4.12-f11-impl-phase1-rule-config-spec.md](./m8a-v4.12-f11-impl-phase1-rule-config-spec.md) | closed — [Phase 6 evidence](./m8a-v4.12-f11-impl-phase6-closeout.md) |
| F-13 | 已完成（multi-orbit bounded public TLE after V4.13） | [m8a-v4.12-f13-leo-scale-runtime-plan.md](./m8a-v4.12-f13-leo-scale-runtime-plan.md); V4.13 follow-on: [m8a-v4.13-multi-orbit-scale-runtime-plan.md](./m8a-v4.13-multi-orbit-scale-runtime-plan.md) | [m8a-v4.12-f13-impl-phase1-leo-scale-spec.md](./m8a-v4.12-f13-impl-phase1-leo-scale-spec.md); V4.13 lock: [m8a-v4.13-impl-phase1-multi-orbit-spec.md](./m8a-v4.13-impl-phase1-multi-orbit-spec.md) | LEO leg complete in V4.12; public MEO/GEO bounded runtime gate closed in V4.13 with `multi-orbit-scale-1000` retained evidence. ITRI orbit-model integration and measured network truth remain successor requirements. |
| F-16 | 已完成（bounded） | [m8a-v4.12-f16-statistics-report-export-plan.md](./m8a-v4.12-f16-statistics-report-export-plan.md) | [m8a-v4.12-f16-impl-phase1-export-spec.md](./m8a-v4.12-f16-impl-phase1-export-spec.md) | closed — Operator HUD `Report Export` action downloads bounded JSON+CSV report bundles; smoke/screenshot evidence in `output/m8a-v4.12-f16-report-export/` |

Supporting / sibling docs:

- audit baseline:
  [m8a-v4.12-itri-must-have-candidate-audit.md](./m8a-v4.12-itri-must-have-candidate-audit.md)
- Phase 7.1 evidence boundary:
  [../data-contracts/phase7.1-validation-evidence.md](../data-contracts/phase7.1-validation-evidence.md)
- demo-route mirror (existing, do not re-open):
  [itri-demo-route-requirement-closure-sdd.md](./itri-demo-route-requirement-closure-sdd.md)

## 3. Execution Ordering

Historical execution order:

```text
F-09 Phase 2..5    ──┐
                     ├──> F-10 Phase 1..5 ──> F-11 Phase 1..6 ──> ITRI demo cut
F-16 Phase 2..4    ──┘
F-13 Phase 1..6  (independent track; needs ADR 0005 re-review)
```

Rules:

- **one F-ID per conversation.** Each new conversation picks one slice and
  refuses to widen.
- F-09 and F-16 may run in parallel (different surfaces, no contract
  overlap).
- F-10 must close before F-11 starts. F-11 builds on
  `HandoverPolicyDescriptor`.
- F-13 may run anytime but cannot mix with operator-HUD slices.
- After every F-ID close-out, update
  `01-itri-requirement-inventory-and-status.md` row honestly. Do not mark
  any external-truth requirement closed.

## 4. Forbidden-Claim Common Discipline

Every V4.12 slice must obey:

- no `measured throughput`, `measured latency`, `measured jitter`
- no `live iperf`, `live ping`, `iperf result`, `ping-verified`
- no `active satellite`, `active gateway`, `pair-specific path`
- no `radio-layer handover`
- no `ESTNeT throughput`, `INET speed`, `NAT validated`,
  `tunnel verified end-to-end`, `DUT closed`
- no external-truth `>=500 LEO` or ITRI orbit-model closure. V4.12 F-13 may
  claim the bounded public-TLE LEO leg; V4.13 may claim the bounded public-TLE
  LEO/MEO/GEO viewer gate.
- no `complete ITRI acceptance`
- no `Phase 8 unlocked`

Each slice provenance copy stays bounded-proxy / modeled-bounded-class
/ repo-owned readout.

## 5. Cross-Slice Contract Touch Points

| Touch point | Owner | Consumers | Slice |
|---|---|---|---|
| `HandoverPolicyDescriptor` | handover-decision | bootstrap source, panel, report | F-10 |
| `HandoverRuleConfig` | handover-decision | rank evaluator, panel editor, report | F-11 |
| `CommunicationRateSnapshot` | communication-rate (new module) | Communication Time panel | F-09 |
| `ReportBundle` | report-export (new module) | operator HUD action group | F-16 |
| `bulk-tle-adapter` | satellites adapter family | overlay controller | F-13 |
| `HandoverDecisionReport` widening | handover-decision | F-16 export bundle | F-10, F-11 |

Any new slice must check this table before mutating shared contracts. F-16
automatically picks up F-10 and F-11 report widenings; no F-16 change is
required when F-10 or F-11 ship.

## 6. Acceptance Update Procedure

After each F-ID close-out:

1. update
   `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md`
   row narrative honestly (e.g. `部分完成 → 已完成（bounded）`).
2. update
   `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/02-completed-capability-bundles.md`
   with the new bundle entry.
3. do **not** update `00-external-acceptance-summary.md` external-truth rows;
   they remain external-stack dependent.
4. update this index `§2 Doc Map` status column.

## 7. Out-Of-Scope Pointers

For other immediately-actionable items not covered by V4.12:

- **D-03 richer presentation composition**: covered by
  [m8a-v3-presentation-convergence-umbrella-plan.md](./m8a-v3-presentation-convergence-umbrella-plan.md).
  Do not bundle into V4.12.
- **V4.13 public-TLE multi-orbit closure**: covered by
  [m8a-v4.13-multi-orbit-scale-runtime-plan.md](./m8a-v4.13-multi-orbit-scale-runtime-plan.md)
  and locked by
  [m8a-v4.13-impl-phase1-multi-orbit-spec.md](./m8a-v4.13-impl-phase1-multi-orbit-spec.md).
  It closes the bounded public-TLE LEO/MEO/GEO viewer gate only; it does not
  integrate ITRI orbit-model data or measured network truth.
- **Multi-orbit second endpoint authority**: covered by
  [m8a-v4-ground-station-multi-orbit-handover-plan.md](./m8a-v4-ground-station-multi-orbit-handover-plan.md)
  and ADR
  [`0013-ground-station-multi-orbit-scope-reset.md`](../decisions/0013-ground-station-multi-orbit-scope-reset.md).
  Do not bundle into V4.12.
- **External validation truth (V-02..V-06, measured F-07/F-08/F-12)**:
  covered by
  [itri-v02-v06-external-validation-evidence-package-plan.md](./itri-v02-v06-external-validation-evidence-package-plan.md)
  and
  [itri-f07-f09-measured-traffic-evidence-package-plan.md](./itri-f07-f09-measured-traffic-evidence-package-plan.md).
  Do not bundle into V4.12.

## 8. Closeout Of V4.12 Chain

V4.12 chain may be marked closed when:

- F-09, F-10, F-11, F-13 (LEO leg), F-16 all show `已完成（bounded）` in
  acceptance report
- forbidden-claim scans green across all five slices
- one consolidated demo path exercises all five
- next-step pointer recorded in this index

Current closeout:

- V4.12 chain is closed.
- V4.13 bounded public-TLE LEO/MEO/GEO viewer gate is closed.
- Remaining successors are ITRI orbit-model intake, measured traffic truth,
  and external NAT/tunnel/DUT validation packages.
