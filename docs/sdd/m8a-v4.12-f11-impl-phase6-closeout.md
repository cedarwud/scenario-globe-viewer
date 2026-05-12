# M8A V4.12 F-11 Implementation Phase 6 Close-Out

Date: 2026-05-12
Working phase name: **M8A V4.12 ITRI must-have followup**.

Status: **已完成（bounded）**.

## 1. Closed Capability

F-11 now exposes a session-local bounded handover rule configuration editor
inside the bootstrap Handover Decision panel. The editor changes only the
active F-10 policy variant's mutable rule fields:

- latency / jitter / modeled-speed weights;
- tie-break order;
- minimum dwell window in modeled bounded ticks;
- hysteresis margin in modeled bounded units.

The applied rule config threads through operator state, the bootstrap
handover-decision snapshot, deterministic ranking, panel datasets, document
telemetry, and `HandoverDecisionReport.appliedRuleConfig`.

Truth boundary remains `bounded-proxy`. This close-out does not claim live RF
handover, live network control, measured latency/jitter/throughput truth,
external validation closure, JSON import/export, persistence beyond the page
session, F-13 scale work, or F-16 export workflow changes.

## 2. Locked Rule Defaults

Defaults are derived from the F-10 `HandoverPolicyDescriptor` variants:

| Policy id | Weights | Tie-break | Dwell | Hysteresis |
|---|---|---|---|---|
| `bootstrap-balanced-v1` | latency `1`, jitter `1`, speed `1` | latency, jitter, speed, stable-serving | `0` | `0` |
| `bootstrap-latency-priority-v1` | latency `3`, jitter `1`, speed `1` | latency, jitter, stable-serving, speed | `0` | `0` |
| `bootstrap-throughput-priority-v1` | latency `1`, jitter `1`, speed `3` | speed, latency, jitter, stable-serving | `0` | `0` |

Validation ranges:

- weights: `0..10`, one decimal place, at least one non-zero weight;
- minimum dwell: `0..60` modeled bounded ticks;
- hysteresis: `0..10` modeled bounded units;
- tie-break order: exact permutation of latency, jitter, speed, stable-serving.

## 3. Runtime Selectors And Report Fields

Panel/editor selectors:

- `[data-handover-rule-config-editor="true"]`
- `[data-handover-rule-form="true"]`
- `[data-handover-rule-input="weights.latencyMs"]`
- `[data-handover-rule-input="weights.jitterMs"]`
- `[data-handover-rule-input="weights.networkSpeedMbps"]`
- `[data-handover-rule-input="minDwellTicks"]`
- `[data-handover-rule-input="hysteresisMargin"]`
- `[data-handover-rule-input="tieBreakOrder.0"]` through `.3`
- `[data-handover-rule-action="apply"]`
- `[data-handover-rule-action="reset"]`
- `[data-handover-rule-action="cancel"]`

Report and telemetry fields:

- `HandoverDecisionReport.appliedRuleConfig`
- `HandoverDecisionSnapshot.appliedRuleConfig`
- `handoverRulePolicyId`
- `handoverRuleAppliedAt`
- `handoverRuleWeights`
- `handoverRuleTieBreakOrder`
- `handoverRuleMinDwellTicks`
- `handoverRuleHysteresisMargin`

## 4. Evidence

Command run:

```bash
npm run test:m8a-v4.12:f11
```

This target runs:

```bash
npm run build
node scripts/verify-m8a-v4.12-f11-handover-rule-config.mjs
node tests/smoke/verify-m8a-v4.12-f11-handover-rule-config-runtime.mjs
```

Focused contract result:

```text
balancedServing=candidate-latency
throughputServing=candidate-throughput
dwellHoldKind=hold
hysteresisHoldKind=hold
```

Runtime smoke artifact:

```text
output/m8a-v4.12-f11-rule-config/f11-rule-config-smoke.json
```

Screenshot evidence:

```text
output/m8a-v4.12-f11-rule-config/desktop-1440x900-initial-open.png
output/m8a-v4.12-f11-rule-config/desktop-1440x900-validation-error.png
output/m8a-v4.12-f11-rule-config/desktop-1440x900-applied-dwell-hold.png
output/m8a-v4.12-f11-rule-config/desktop-1440x900-reset-default.png
```

The smoke confirms:

- editor mounts open inside the Handover Decision panel;
- numeric field helper/error text is attached with `aria-describedby`;
- invalid precision is rejected with inline field error text;
- Apply writes the active bounded dwell rule into report/panel datasets;
- the applied dwell rule deterministically holds the current candidate;
- Reset restores the active policy variant's defaults;
- panel/report forbidden-claim scan is green;
- no runtime/console errors were captured.

## 5. Scope Confirmation

Touched implementation surfaces are the F-11 rule contract, bootstrap
operator-state rule storage, bounded evaluator integration, Handover Decision
panel editor, document telemetry/report widening, and F-11 verification.

No F-09, F-10 policy-selector expansion, F-13 LEO-scale runtime, or F-16 export
workflow implementation is included in this close-out.
