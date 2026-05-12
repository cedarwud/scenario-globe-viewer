# M8A V4.12 F-11 Phase 1 Rule Configuration Spec

Date: 2026-05-12
Working phase name: **M8A V4.12 ITRI must-have followup**.

## 0. Status

Status: Phase 1 lock-in for F-11 implementation.

Authority chain:

1. `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md`
2. [m8a-v4.12-followup-index.md](./m8a-v4.12-followup-index.md)
3. [m8a-v4.12-f10-handover-policy-selector-plan.md](./m8a-v4.12-f10-handover-policy-selector-plan.md)
4. [m8a-v4.12-f11-handover-rule-config-plan.md](./m8a-v4.12-f11-handover-rule-config-plan.md)
5. `src/features/handover-decision`

Hard dependency satisfied: F-10 is closed and
`HandoverPolicyDescriptor` exists.

## 1. Locked Decisions

1. **Config scope:** per selectable F-10 policy variant. Editing the active
   variant changes only that variant's session-local rule config.
2. **Hysteresis units:** modeled bounded units only. Do not expose dB or RF
   language.
3. **Apply behavior:** apply instantly after validation. No confirm modal,
   because applying is reversible, session-local, and not destructive.
4. **JSON import/export:** deferred. F-11 only widens the
   `HandoverDecisionReport` with the applied config.
5. **Invalid input:** reject with inline error text. Do not snap-clamp.
6. **Reset scope:** reset only the currently active policy variant.

## 2. Rule Contract

`HandoverRuleConfig` is owned by `handover-decision`:

- `policyId`
- `weights.latencyMs`
- `weights.jitterMs`
- `weights.networkSpeedMbps`
- `tieBreakOrder`
- `minDwellTicks`
- `hysteresisMargin`
- `appliedAt`
- `provenanceKind: "bounded-proxy"`

Validation ranges:

- weights: `0..10`, one decimal place, at least one weight greater than zero
- `minDwellTicks`: `0..60`, integer
- `hysteresisMargin`: `0..10`, one decimal place, modeled bounded units
- `tieBreakOrder`: exact permutation of `latency`, `jitter`, `speed`,
  `stable-serving`

Default configs are derived from the F-10 policy descriptors. The F-10
descriptor enum ids remain immutable; F-11 edits only mutable rule fields.

## 3. UI Decisions

The editor mounts as a collapsible section inside the existing Handover
Decision panel. It uses labelled fields, persistent helper text, inline error
messages, a polite status live region, and keyboard-reachable Apply, Reset,
and Cancel controls.

No top Operator HUD control row is added for F-11. The existing F-10 policy
selector remains the active-variant selector.

## 4. Truth Boundary

All copy and report data remain bounded-proxy / modeled-rule language. The
implementation must not claim live RF handover, live network control, measured
latency/jitter/throughput truth, DUT validation, or external-stack closure.
