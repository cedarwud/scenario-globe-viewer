# Selected-Pair Overlay Governance

## Status

Accepted working governance for selected-pair UI, evidence surfaces, hover
surfaces, and adjacent overlay chrome.

## Purpose

This document prevents repeated UI regressions where multiple surfaces answer
the same question with similar controls, similar charts, or unrelated local open
states. Future agents must read this before changing selected-pair UI,
`Details & sources`, marker hover UI, replay-event UI, inspector-adjacent
surfaces, or overlay z-index/focus behavior.

## Core Rule

Every visible surface must have one primary job. If two surfaces show the same
data at the same time scale with the same visual form, one of them must be
removed, demoted, or restyled into evidence/supporting information.

The main selected-pair panel is the operator decision surface. Evidence
surfaces explain why the decision is defensible. They must not become a second
copy of the main product flow.

## Current Surface Ownership

| Surface | Primary job | State owner | Do not add |
| --- | --- | --- | --- |
| Selected-pair header/outcome | Pair identity, source tier, availability, next link | `v4-projection-side-panel.ts` | Long provenance or full row data |
| Link map | Operational serving-link timeline for the selected projection window | `v4-projection-side-panel.ts` | A second evidence-only coverage chart that looks identical |
| Link plan | Human-readable current/next/cross-orbit decisions | `v4-projection-side-panel.ts` | Full handover history |
| Rain impact | Immediate effect of rain parameter on active metrics | `v4-projection-side-panel.ts` | Full model inventory |
| Evidence report | Full row-level verification artifact | `runtime-projection-evidence-report.ts` | Interactive product controls |
| Station info card | Station metadata and slot assignment | `station-info-card.ts` | Runtime projection evidence |
| Marker hover tooltip | Lightweight station preview | `marker-hover-tooltip.ts` | Click-level actions or deep evidence |
| Product hover popover | Product UX hover evidence for V4.11 targets | `m8a-v411-hover-popover.ts` | Station selector behavior |
| Replay event pill | Transient handover notification | `replay-event-pill.ts` | Persistent decision history |

## Link Map And Time Windows

The default selected-pair reading mode is the six-hour link map. It answers:

- which orbit/satellite is serving;
- where handovers cluster;
- whether the serving lane changes during the selected window.

Longer lookahead windows are diagnostic, not equal primary modes. Keep `12h`
and `24h` out of first-rank UI unless the user-facing question is explicitly
"no useful activity in 6h; look further ahead." If longer windows remain
available, label them as lookahead/diagnostic and avoid making them look like a
separate core feature.

Do not put another three-lane, same-color, same-axis map inside
`Details & sources`. If evidence needs per-orbit visibility information, render
it as an evidence summary such as:

- per-orbit windows count;
- visible percentage;
- active serving time;
- source/health status;
- report link for exact rows.

Do not use meter bars or mini charts for mixed-unit evidence such as elevation
degrees, hysteresis dB, latency ms, and minimum-window seconds. Those values
must be definition rows with a plain-language explanation of what each gate
does. A chart is allowed only when the axis, unit, and comparison target are
obvious without hovering.

## Overlay State Rules

Do not add another independent `open` boolean unless no existing owner can
represent the state.

Shared selected-pair overlay arbitration lives in
`src/features/multi-station-selector/selected-pair-overlay-state.ts`.
Use it for:

- marker hover suppression while station info card or product
  inspector is open;
- `selected-pair-overlay-change` notifications when those blocking surfaces
  change.


Before adding or changing an overlay, identify:

1. Owner module.
2. DOM root selector.
3. Open/closed state source.
4. Focus target on open.
5. Focus return on close.
6. Escape behavior.
7. Whether hover tooltips must be suppressed while it is open.
8. Z-index layer and which surfaces it may cover.

If this table cannot be filled, do not implement the overlay change yet.

## Mutual-Exclusion Policy

Use these defaults unless a specific spec says otherwise:

- Drawer/modal/inspector open: hide transient hover tooltips.
- Station info card open: marker hover tooltip may not compete for focus.
- Details drawer open: selected-pair main panel remains visible but secondary.
- Evidence report download: no runtime state changes.
- Replay event pill: never stacks; latest event replaces the visible content.
- Product inspector and selected-pair evidence drawer must not both try to be
  the primary explanation surface for the same click.
- Replay play/pause is not a pair-identity change. Do not re-run selected-pair
  re-anchoring, replay-clock setup, or camera hint application merely because
  Cesium's native clock toggled between paused and playing.

## Layering Policy

Do not introduce ad hoc z-index values without checking the existing layer
system. New selected-pair layers must state whether they are:

- product panel;
- evidence drawer;
- transient tooltip;
- modal/inspector;
- replay notification.

If the change requires a new layer class, add a named token or a documented
constant first. Numeric z-index patches are allowed only for small bug fixes and
must explain which existing surface they sit above/below.

## Accessibility And Interaction Floor

Every new overlay or control must satisfy:

- visible text or `aria-label` for buttons;
- `aria-expanded` for disclosure triggers;
- `aria-controls` when a button opens a persistent region;
- Escape closes drawer/modal-like surfaces;
- focus moves into drawer/modal-like surfaces on open;
- focus returns to the trigger on close;
- no hover-only path for required information;
- no sub-14px text for active decisions.

If the surface cannot meet these in the current slice, keep it out of the UI and
put the information in the evidence report instead.

## Change Workflow For Agents

Use the smallest scope that answers the user complaint.

1. Read this file, `information-architecture.md`, `runtime-data-contract.md`,
   and the touched modules.
2. List current surfaces that answer the same user question.
3. Decide the one primary surface.
4. Demote, remove, or restyle duplicate surfaces before adding new controls.
5. Avoid camera/framing changes unless explicitly requested.
6. Avoid fresh project/customer-specific literals in new code or docs unless
   the user asks for them.
7. Preserve unrelated dirty work and untracked files.
8. Validate with `npm run build`.
9. For selected-pair layout or drawer changes, also run
   `node scripts/verify-information-density.mjs`.
10. If route coverage is touched, run
    `node scripts/verify-g1-bucket-a-coverage.mjs`.

## When To Escalate To Larger Cleanup

Start local. Escalate only if two or more of these are true:

- two overlays need to suppress each other but have no shared state boundary;
- z-index order depends on numeric coincidence;
- Escape/focus behavior differs across drawer/modal-like surfaces;
- the same chart or control appears in more than one visible surface;
- replay state changes are needed to make an overlay safe;
- tests must be weakened to preserve the UI.

When escalation is needed, write an implementation plan first. Do not mix
selected-pair content cleanup with product inspector, replay-state, or camera
cleanup in the same patch unless the user explicitly scopes it that way.

## Non-Goals

This governance does not authorize:

- full controller rewrites;
- camera framing experiments;
- replay-clock semantic changes;
- deleting legacy product inspector surfaces;
- changing source authority or data contracts;
- broad style rewrites unrelated to the selected-pair complaint.
