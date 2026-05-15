# M8A V4.12 F-16 Implementation Phase 1 Export Spec

Date: 2026-05-12
Working phase name: **M8A V4.12 customer must-have followup**.

Status: Phase 1 contract/spec lock-in only. This document does not authorize
component implementation, styling, smoke work, V4.11 scene changes, or commits.

Parent planning SDD:
[m8a-v4.12-f16-statistics-report-export-plan.md](./m8a-v4.12-f16-statistics-report-export-plan.md).

Sibling reference:
[m8a-v4.12-f09-impl-phase1-visualization-spec.md](./m8a-v4.12-f09-impl-phase1-visualization-spec.md).

Authority context:

- F-16 acceptance status remains `Partial`: export-ready report structures
  exist for communication-time, handover-decision, physical-input, and
  validation-state, but there is no completed end-user export workflow/button.
- F-16 closure only covers the repo-owned bounded report export seam. It does
  not close external `iperf` / `ping` measurement truth, ESTNeT / INET network
  validation, or `>= 500 LEO` evidence.

## 1. Bundle Shape Decision

Decision: ship a **single combined bundle** with optional per-family slicing
inside the same export action. Default download = full bundle. Operator may
deselect families before exporting.

Rationale:

- Combined bundle preserves cross-family provenance and time alignment.
- Per-family export adds UI surface (one button per panel) and risks
  inconsistent provenance copy across artifacts.
- A single export action with a family-selection checklist keeps placement,
  copy, and forbidden-claim discipline in one location.

Resolved parent §9 open question 1: combined-by-default, per-family
de-selection allowed inside the same action.

## 2. Serialization Format Decision

Decision: ship **JSON and CSV in the same implementation prompt**. Both are
default-selectable inside the export action.

Rationale:

- JSON preserves nested provenance/disclaimer structure for archival.
- CSV provides reviewer-convenience flat readout consumable in Excel.
- Acceptance-report §F item 3 explicitly names `end-user report export
  action`, and reviewer-facing acceptance benefits from CSV without further
  follow-up slice.

Resolved parent §9 open question 2: JSON + CSV ship together.

## 3. CSV Row Shape Decision

Decision: use a **normalized long-table shape** with these columns:

| Column | Type | Notes |
|---|---|---|
| `reportFamily` | `"communication-time" \| "handover-decision" \| "physical-input" \| "validation-state"` | Source report family. |
| `recordId` | string | Stable identifier inside the family (window id, candidate id, attach id, etc.). |
| `field` | string | Source field name; matches the JSON path leaf. |
| `value` | string | Stringified scalar. Booleans serialized as `"true"`/`"false"`. Numbers preserve original precision. |
| `unit` | string | Empty for non-numeric. Numeric fields use the source unit label, e.g. `ms`, `Mbps`, `count`. |
| `provenanceKind` | `"bounded-proxy"` \| `"modeled-bounded-class-not-measured"` \| `"repo-owned-readout"` | Per-family provenance enum. |
| `disclaimer` | string | Constant per family. See §6. |
| `generatedAt` | ISO 8601 | Bundle-level timestamp. |
| `schemaVersion` | string | Bundle schema version. |
| `scenarioId` | string | Active scenario id at export time. |
| `replayMode` | `"real-time"` \| `"prerecorded"` | Active replay mode at export time. |

Rationale:

- Long-table shape is reviewer-friendly when families have heterogeneous fields.
- A normalized shape avoids one-CSV-per-family file proliferation while still
  preserving family attribution.
- Reviewer can pivot in Excel without losing provenance/disclaimer rows.

Resolved parent §9 open question 3: normalized long-table.

## 4. Export Control Placement Decision

Decision: place **one new operator-level action group** named `Report Export`
**directly below the existing operator top controls** (scenario select, replay
mode, replay speed) and **above the existing telemetry slot grid**. The action
group exposes a single primary button `Export Statistics Report` plus a small
disclosure for family/format selection.

Source-grep evidence for placement seam:

```bash
rg -n "data-operator-controls|data-operator-time-slot|data-operator-communication-slot|operatorControlsRoot" src/features/operator/bootstrap-operator-hud.ts
```

Rationale:

- An operator-level action keeps cross-family export discoverable.
- Embedding inside a single panel (e.g. Communication Time) would imply
  family-scoped export only.
- Action group sits before the slot grid so a `Tab` traversal reaches export
  before telemetry, matching common dashboard patterns.

Resolved parent §9 open question 4: operator controls row, dedicated
`Report Export` action group.

## 5. Filename Convention Decision

Decision: canonical filename =

```text
m8a-v4.12-f16-report-<scenarioId>-<utcTimestamp>.<ext>
```

Where:

- `scenarioId` is the active scenario id, slug-safe (lower-case, `a-z0-9-`
  only; non-conforming chars collapse to `-`).
- `utcTimestamp` follows the compact ISO 8601 form `YYYYMMDDTHHMMSSZ`, derived
  from `bundle.generatedAt`. No local offset.
- `ext` is `json` or `csv`.

Example:

```text
m8a-v4.12-f16-report-bootstrap-balanced-2026-05-12-20260512T143055Z.json
```

Rationale:

- UTC-only avoids reviewer-side ambiguity across regions.
- Compact form keeps filename short while remaining sortable.
- `m8a-v4.12-f16-report-` prefix makes archival/grep trivial.

Resolved parent §9 open question 5: compact ISO 8601 UTC.

## 6. Disclaimer Copy Per Family

Decision: each family carries a fixed disclaimer constant exposed by the
bundle. Copy must appear in JSON metadata, CSV `disclaimer` column, and the
UI export success message.

| Family | Disclaimer constant |
|---|---|
| `communication-time` | `Repo-owned readout from bounded scenario windows; not iperf/ping measured availability.` |
| `handover-decision` | `Bounded-proxy decision over deterministic candidate metrics; not measured latency, jitter, or throughput truth.` |
| `physical-input` | `Bounded proxy physical inputs projected into latencyMs / jitterMs / networkSpeedMbps; not final physical-layer truth.` |
| `validation-state` | `Repo-owned validation boundary readout; external NAT / tunnel / DUT / iperf / ping truth lives outside this repo.` |

Bundle-level disclaimer constant:

```text
Modeled, not measured. Repo-owned bounded report export; external network and
physical-layer truth remain outside this artifact.
```

## 7. JSON Shape

```ts
type ReportFamilyId =
  | "communication-time"
  | "handover-decision"
  | "physical-input"
  | "validation-state";

interface ReportBundleMetadata {
  schemaVersion: "m8a-v4.12-f16-bundle-v1";
  generatedAt: string;
  scenarioId: string;
  scenarioLabel: string;
  replayMode: "real-time" | "prerecorded";
  replayTimeIso: string | null;
  includedFamilies: ReadonlyArray<ReportFamilyId>;
  bundleDisclaimer: string;
  familyDisclaimers: Record<ReportFamilyId, string>;
}

interface ReportBundleFamilyEntry<TPayload> {
  family: ReportFamilyId;
  available: boolean;
  unavailableReason: string | null;
  payload: TPayload | null;
}

interface ReportBundle {
  metadata: ReportBundleMetadata;
  families: {
    communicationTime: ReportBundleFamilyEntry<CommunicationTimeReport>;
    handoverDecision: ReportBundleFamilyEntry<HandoverDecisionReport>;
    physicalInput: ReportBundleFamilyEntry<PhysicalInputReport>;
    validationState: ReportBundleFamilyEntry<ValidationStateReport>;
  };
}
```

`CommunicationTimeReport`, `HandoverDecisionReport`, `PhysicalInputReport`,
`ValidationStateReport` are reused unchanged from existing Phase 6 sources.
The bundle never mutates source schemas.

## 8. CSV Header

Header row, in this exact order:

```text
reportFamily,recordId,field,value,unit,provenanceKind,disclaimer,generatedAt,schemaVersion,scenarioId,replayMode
```

All cells quoted with `"` per RFC 4180. Embedded `"` escaped as `""`.

## 9. Disabled / Unavailable State Rule

When a family controller has no current report state:

- `families.<familyKey>.available = false`
- `families.<familyKey>.unavailableReason` carries a short repo-owned phrase
  such as `"Communication time controller not mounted on this route."`
- The CSV emits **zero rows** for that family. It does not emit a
  placeholder row.
- The export button stays enabled if at least one family is available. If all
  four are unavailable, the button is disabled with visible text
  `"No report state available."` and an ARIA-described reason.

## 10. ARIA / Keyboard Outline

- Export action group container: `role="group"` with
  `aria-labelledby="report-export-heading"`.
- Primary button: `<button type="button">Export Statistics Report</button>`
  with focusable disclosure caret.
- Family/format selection disclosure: `aria-expanded` toggling a panel that
  contains checkbox list (4 family checkboxes) and radio group (JSON / CSV /
  Both).
- Default state: all 4 families checked, format = Both.
- Visible focus indicator required on button, caret, checkboxes, radios.
- Loading state: button text swaps to `Preparing…` with `aria-busy="true"`;
  spinner has `aria-hidden="true"`. Do not disable button (keep focusable for
  cancel intent in later slice).
- Success: polite live region announces
  `Report exported. <N> files downloaded.`
- Failure: assertive live region announces
  `Export failed. <reason>.` Button returns to idle.

## 11. Source Seam Contract

Bundle assembly consumes the existing capture seam handles:

| Family | Source handle (from `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__`) | Read method |
|---|---|---|
| `communication-time` | `communicationTime` controller | existing `getState().report` |
| `handover-decision` | `handoverDecision` controller | existing `getState().report` |
| `physical-input` | `physicalInput` controller | existing `getState().report` |
| `validation-state` | `validationState` controller | existing `getState().report` |

The export adapter does not mutate any controller state. Read-only access only.

If a handle is missing from the capture seam, the family entry is marked
unavailable per §9.

## 12. Forbidden-Claim Discipline

Export workflow, UI copy, JSON bundle, and CSV cells must not include:

- `measured throughput`, `measured latency`, `measured jitter`
- `live iperf`, `iperf result`, `ping-verified`, `live ping`
- `active gateway`, `active serving satellite`, `pair-specific path`
- `native RF handover`
- `ESTNeT throughput`, `INET speed`, `NAT validated`
- `tunnel verified end-to-end`, `DUT closed`
- `>=500 LEO`, `500 LEO closure`, `multi-orbit closure`
- `full customer acceptance`, `acceptance complete`

A forbidden-claim scan runs at Phase 4 against:

- DOM of the export action group
- generated JSON bytes
- generated CSV bytes

## 13. Reviewer-Acceptance Note

Parent §9 open question 6 (will customer reviewers accept bounded export as F-16
closure while external `iperf/ping` truth remains external) is resolved as
**bounded closure accepted** for repo-side F-16, conditional on:

- bundle disclaimer §6 present in every artifact
- forbidden-claim scan green
- acceptance report row F-16 narrative says `Partial → Complete (bounded)`
  with explicit external-truth carve-out preserved.

If customer later requests measured-truth export, that becomes a separate slice
gated by `itri-f07-f09-measured-traffic-evidence-package-plan.md`, not by
F-16 reopening.

## 14. Open-Question Resolution Matrix

| Parent §9 question | Resolution |
|---|---|
| 1. Combined vs per-panel | Single combined bundle with optional per-family de-selection inside the same export action. |
| 2. JSON-only or JSON+CSV | JSON + CSV ship together. |
| 3. CSV shape | Normalized long-table with `reportFamily/recordId/field/value/unit/provenanceKind/disclaimer/...` columns. |
| 4. Placement | Operator-level `Report Export` action group below top controls, above slot grid. |
| 5. Filename timestamp | UTC compact ISO 8601 `YYYYMMDDTHHMMSSZ`. |
| 6. Reviewer acceptance | Bounded closure accepted, disclaimer-bound; measured-truth export is a separate slice. |

## 15. Phase 1 Closeout State

- TS contract files changed: none.
- Compile required: no.
- Smoke required: no.
- V4.11 scene changed: no.
- Phase 2/3/4 implementation leaked: no.
- Measured-truth claim added: no.
- Ready for Phase 2 implementation prompt: yes, after planning/control accepts
  this Phase 1 spec.

## 16. Phase 2 Implementation Boundaries (Reminder)

Phase 2 may:

- add `src/features/report-export/` module
- add `bootstrap-report-export-action.ts` mounted by operator HUD
- read capture-seam controllers via read-only handles
- write JSON via `Blob` + `URL.createObjectURL`
- write CSV via the same `Blob` path
- add data attributes for smoke selectors

Phase 2 may not:

- change `CommunicationTimeReport`, `HandoverDecisionReport`,
  `PhysicalInputReport`, or `ValidationStateReport` schemas
- add a new capture-seam handle
- mount inside V4.11 ground-station scene
- bundle F-09 / F-10 / F-11 / F-13 work
- introduce server, backend, scheduled export, PDF, or email flows
