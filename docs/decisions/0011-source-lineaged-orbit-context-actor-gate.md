# ADR 0011: Source-Lineaged Orbit Context Actor Gate

## Status

Accepted

## Date

2026-04-25

## Context

`M8A-V2` already permits and requires visible orbit-context actors. The
orbit-animation plan allows replay-clock-driven `LEO` context actor movement,
fixed or near-fixed `GEO` context anchor behavior, stage-linked emphasis, and
presentation-only relation ribbons. It forbids RF beams, endpoint-to-satellite
success beams, gateway flash theater, pair-specific teleport claims, arbitrary
random satellite motion, and demo-style proxy recasting.

The same plan defines the minimum visible slice as:

- at least one visible `LEO` context actor
- one visible `GEO` context anchor
- shared replay-clock animation
- stage-linked emphasis
- at least one compact bounded metric cue
- source/evidence styling that separates accepted endpoint truth from
  display-context satellite actors

The `M8A-V3.4` recovery direction stayed too conservative by emphasizing
abstract dashed lines and orbit arcs instead of opening the source-lineaged
actor path. That preserved truth boundaries, but it did not fully satisfy the
V2 minimum visible slice or the user's requirement that the viewer read as an
obvious cross-orbit handover demo.

The planning distinction is:

- visual presentation quality is allowed to improve
- visible satellite models are allowed when they are backed by source-lineaged
  orbit-context data and explicit non-claims
- fake orbit data, random actors, synthetic demo handover loops, and active
  serving-satellite claims remain forbidden

## Decision

### 1. Open The Source-Lineaged Actor Gate For V3.5

`M8A-V3.5` may render visible `LEO` and `GEO` orbit-context actors when the
implementation consumes a repo-owned projected display seam with source
lineage, epochs, freshness, precision, evidence class, and machine-readable
non-claims.

This gate does not promote active serving-satellite truth. Actors remain
display-context unless a later authority explicitly upgrades them.

### 2. Keep Orbit Truth Separate From Model-Asset Truth

The visual mesh used for a satellite actor is not itself orbit or operator
truth.

The first accepted mesh policy is:

- `satellite.glb` may be used as a generic satellite mesh if it is copied into
  the viewer repo with attribution metadata and a third-party notice.
- The mesh must be described as a generic visual model, not a OneWeb or
  Intelsat spacecraft body model.
- The actor's orbit/operator context must come from the projected orbit-context
  data seam, not from the mesh filename, mesh appearance, or asset source.

`starlink.glb` is not approved for OneWeb or Intelsat presentation in this
branch. Its asset metadata identifies it as a Starlink/SpaceX satellite, so it
would create a brand/operator implication that conflicts with the first-case
truth boundary.

The demo repo's `sat.glb` is not approved as the delivery default. Its
`CC-BY-NC-4.0` license creates a non-commercial-use constraint that is
unacceptable for a default delivery asset unless a later review explicitly
approves that use.

### 3. Require A Repo-Owned Projection Contract Before Rendering

Runtime, controller, and render code may consume only a viewer-owned projected
display artifact or module. They must not side-read:

- raw `itri/multi-orbit/download/...` packages
- donor project folders
- demo project assets at runtime
- live external orbit feeds at render time

The source package may be archived under the `itri/multi-orbit` authority
surface, but the renderer must consume only the accepted viewer-owned
projection artifact.

### 4. Use Context/Anchor Wording, Not Serving Wording

Visible actor labels must use wording such as:

- `OneWeb LEO context`
- `Intelsat GEO continuity anchor`
- `display-context`
- `not active serving satellite`

Labels such as `SERVING`, `PENDING`, `handover target`, or equivalent active
satellite wording are not approved for this branch.

### 5. V3.5 Must Not Be Actor-Only

The first implementation slice under this ADR must combine source-lineaged
actors with the minimum handover presentation-state skeleton:

- `GEO context`
- `dual orbit`
- `switch window`
- `LEO context`

The presentation state must stay separate from `handover-decision` truth and
remain bounded to replay-time-driven presentation. Actor motion without stage
progression is not enough to claim V3.5 recovery.

### 6. ADR 0010 Remains Current For Entry Semantics

This ADR does not supersede ADR 0010. The explicit demo entry remains the
canonical discovery surface. Existing query/address transport may remain for
smoke, capture, and deep-link coverage. A later homepage pivot that changes
ADR 0010's discovery model requires a separate decision.

## Alternatives Considered

### Keep Dashed Lines And Orbit Arcs Only

This preserves truth boundaries but fails the V2 minimum visible slice and does
not make the handover story visually obvious.

Rejected.

### Port Demo Synthetic Actors

The demo proves useful presentation grammar, but its actor loop and local
handover cycle are synthetic. Porting them would violate the source-lineage
and non-synthetic actor rules.

Rejected.

### Use `starlink.glb` As The Generic Mesh

The mesh is visually strong, but its embedded asset title/source identifies it
as a Starlink/SpaceX satellite. That would undermine the OneWeb/Intelsat
first-case semantics and could create trademark or endorsement confusion.

Rejected for this branch.

### Wait For Exact OneWeb And Intelsat Spacecraft Models

Exact operator spacecraft body models would be cleaner if their source,
license, and spacecraft-type mapping were verified. Waiting for that would
block the presentation recovery even though the current need is display-context
orbit actors, not exact body-geometry truth.

Rejected for the first V3.5 slice.

## Consequences

- V3.5 needs a child SDD that binds source-lineaged orbit actor ingestion,
  generic mesh attribution, presentation state, metric cue, and visual
  acceptance into one implementation slice.
- The first implementation should render both a moving `LEO` context actor and
  a fixed or near-fixed `GEO` continuity anchor, but both remain
  display-context.
- The same generic `satellite.glb` mesh may be used for both orbit classes if
  styling, labels, source lineage, and motion mode make `LEO` and `GEO`
  distinct.
- Validation must prove default-route exclusion, no raw side-reads, no active
  gateway/teleport/RF/measurement claims, and no accidental Starlink/demo mesh
  promotion.

## Related

- `docs/sdd/m8a-v2-satellite-evidence-and-data-contract-plan.md`
- `docs/sdd/m8a-v2-orbit-animation-and-visual-language-plan.md`
- `docs/sdd/m8a-v3-presentation-convergence-umbrella-plan.md`
- `docs/sdd/m8a-v3-validation-and-acceptance-plan.md`
- `docs/sdd/m8a-v3.5-source-lineaged-orbit-actor-recovery-plan.md`
