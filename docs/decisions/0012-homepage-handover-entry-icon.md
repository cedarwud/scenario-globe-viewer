# ADR 0012: Homepage Handover Entry Icon

## Status

Accepted

## Date

2026-04-25

## Context

ADR 0010 removed the bare `/` silent demo mapping and made an explicit
homepage entry the only user-discovery surface for the first-case handover
scene. M8A-V3.5 then kept the addressed route as the source-lineaged
`OneWeb LEO + Intelsat GEO aviation` scene while preserving the truth boundary
from ADR 0011.

M8A-V3.6 needs the homepage entry to read as a clear top-right icon button
rather than a large homepage card. This is a presentation-entry refinement, not
a new scenario source or handover-decision truth change.

## Decision

1. Bare `/` remains a stable baseline viewer and must not adopt first-intake
   state without an explicit user action.
2. Bare `/` mounts one top-right handover icon entry in the existing Cesium
   toolbar. The entry is an anchor-style icon button with an accessible label,
   title, and hover/focus tooltip naming the `OneWeb LEO + Intelsat GEO`
   aviation handover target.
3. The icon href directly addresses the existing first-case route with:
   - `firstIntakeScenarioId=app-oneweb-intelsat-geo-aviation`
   - `firstIntakeAutoplay=1`
   - `scenePreset=global`
4. Addressed-route entry continues to use the existing close-view camera and
   replay-authority path. V3.6 does not add orbit sources, fake actors,
   Starlink assets, RF beams, gateway claims, serving-state claims, or
   handover-decision candidates.
5. The icon is not a silent demo. It is an explicit user-discovery affordance
   that navigates to the same addressed transport preserved by ADR 0010 and
   bounded by ADR 0011.

## Consequences

- Smoke coverage must check both sides of the entry contract: bare `/` keeps
  first-intake unadopted, and clicking the icon lands in the addressed autoplay
  scene with endpoints, source-lineaged orbit actors, stage strip, and replay
  motion visible.
- Future homepage presentation changes may restyle the icon, but they must not
  reintroduce ambient demo mount on bare `/`.

## Related

- `docs/decisions/0010-reverse-bare-homepage-silent-demo-entry.md`
- `docs/decisions/0011-source-lineaged-orbit-context-actor-gate.md`
- `docs/sdd/m8a-v3.5-source-lineaged-orbit-actor-recovery-plan.md`
