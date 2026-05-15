# M8A V4.12 F-10 Implementation Phase 1 Policy Spec

Date: 2026-05-12
Working phase name: **M8A V4.12 customer must-have followup**.

Status: Phase 1 contract/spec lock-in only. This document resolves the
planning SDD open questions before runtime implementation. It does not widen
the scope beyond F-10 and does not authorize F-09, F-11, F-13, or F-16 work.

Authority context:

- F-10 acceptance status remains `部分完成`: the repo already has a
  deterministic handover-decision layer, but the policy id is fixed instead of
  operator switchable.
- F-12 remains `已完成（bounded）` for the repo-owned latency, jitter, and
  network-speed decision seam. F-10 must not promote those metrics into
  measured truth.
- F-10 therefore closes only a bounded, service-layer policy selector. It must
  not claim live RF, network, or external-stack control.

Required skill query results were run with the exact requested query strings
from the planning SDD:

```text
select dropdown listbox accessible label --domain ux:
- Every input needs a visible label.
- Interactive elements need accessible names.
- All functionality must be keyboard accessible with logical tab order.

policy selector dashboard control --domain ux:
- Found 0 results in the local UX database.
```

## 1. Policy Variant Decision

Decision: ship exactly three canonical bounded variants for F-10.

| Policy id | Operator label | Weight table | Tie-break order |
|---|---|---|---|
| `bootstrap-balanced-v1` | Balanced handover policy | latency `1`, jitter `1`, speed `1` | latency, jitter, speed, stable-serving |
| `bootstrap-latency-priority-v1` | Latency priority policy | latency `3`, jitter `1`, speed `1` | latency, jitter, stable-serving, speed |
| `bootstrap-throughput-priority-v1` | Throughput priority policy | latency `1`, jitter `1`, speed `3` | speed, latency, jitter, stable-serving |

Rationale:

- Three variants satisfy the planning SDD without inventing a rule editor.
- The names stay repo-owned and bounded. No variant references a specific customer
  test case until a later authority document provides that mapping.
- `bootstrap-balanced-v1` preserves the current equal metric-win behavior.
- Priority policies alter only deterministic bounded ranking weights.

## 2. Persistence Decision

Decision: policy selection is session-local runtime state owned by the
bootstrap operator controller.

Required behavior:

- default on page load: `bootstrap-balanced-v1`;
- preserve the selected policy across scenario changes, replay mode changes,
  replay speed changes, and replay-clock ticks within the same session;
- reset to `bootstrap-balanced-v1` after full page reload;
- do not use `localStorage`, query params, cookies, or external persistence.

Rationale:

- F-10 needs operator switchability, not durable preference management.
- Session-local state avoids accidental claims that policy choice is a saved
  operator configuration or externally ratified setting.

## 3. Announcement Decision

Decision: switching policy emits a polite live-region announcement.

Required behavior:

- native `<select>` control with visible label `Handover Policy`;
- `aria-label="Handover Policy"`;
- announcement text after user selection:
  `Policy changed to <label>.`;
- no announcement on initial mount;
- announcement lives inside the operator HUD and uses `role="status"`,
  `aria-live="polite"`, and `aria-atomic="true"`.

Rationale:

- The local UX search requires visible labels and keyboard reachability.
- A native select provides the expected keyboard and screen-reader behavior
  without a custom listbox.
- A polite announcement confirms that a replay decision refresh happened
  without interrupting the operator.

## 4. Panel And Report Decision

Decision: expose the active policy label in the Handover Decision panel, but
keep tie-break ordering inside structured state/report fields.

Required panel behavior:

- render `Policy: <label>` above `Provenance`;
- keep `Provenance: bounded-proxy` unchanged;
- do not render the full tie-break table in the panel.

Required report behavior:

- widen `HandoverDecisionReport` with `policyId`, `policyLabel`,
  `policySummary`, and `policyTieBreak`;
- keep existing `snapshot.policyId` for backwards-compatible telemetry;
- include the same policy fields in `snapshot` so existing JSON exports pick
  them up automatically.

Rationale:

- Operators need the active policy label at a glance.
- The tie-break order is audit/report material. Rendering it in the compact HUD
  would add dense implementation detail to the decision panel and pre-empt
  F-11 rule-parameter UI.

## 5. Reason-Code Decision

Decision: add `policy-weighted-override` to `HandoverReasonSignalCode`.

Required behavior:

- emit `policy-weighted-override` when a non-balanced policy selects a
  different best candidate than the balanced policy would select for the same
  candidate set;
- do not emit it for the default balanced policy;
- preserve existing metric reason codes when the selected candidate also beats
  the current serving candidate on latency, jitter, or modeled speed;
- panel label: `Policy weighted override`.

Rationale:

- F-10 acceptance requires switching policy to visibly alter decision state.
- A dedicated reason code makes the behavior auditable without implying live
  network control or external validation truth.

## 6. Truth Boundary

Allowed copy remains:

- `Bounded handover policy`
- `Service-layer decision policy`
- `Repo-owned proxy policy`
- `Modeled, not measured.`

Forbidden copy remains:

- `live network control`
- `live RF handover`
- `policy applied to real satellite`
- `policy verified by iperf/ping`
- `production handover controller`
- `policy ratified by customer`
- `policy meets 3GPP specification`
- `policy enforces operator SLA`
- `policy ensures >=500 LEO closure`
- `policy closes V-02..V-06 validation`

Implementation may proceed to Phase 2 only against these locked decisions.
