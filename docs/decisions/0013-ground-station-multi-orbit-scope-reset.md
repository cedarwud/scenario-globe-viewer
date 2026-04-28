# ADR 0013: Reset Next Multi-Orbit Scene To Ground-Station Endpoint Pair

## Status

Accepted

## Date

2026-04-25

## Context

The completed `M8A` and `M8A-V3.5` line improved the viewer substantially, but
it followed the earlier aviation-first authority:

- endpoint A: aircraft-side connectivity stack
- nearby visual endpoint: YKA fixed facility context
- provider-managed `GEO` continuity anchor
- `OneWeb LEO + Intelsat GEO` aviation service-layer switching
- source-lineaged `LEO`/`GEO` display-context actors

That line was internally coherent, but it does not match the clarified product
goal for the next visible demo. The next scene should be:

- two ground-station or ground-infrastructure endpoints
- no aircraft endpoint
- no ordinary handset `UE`
- real/source-backed endpoint and orbit evidence
- continuous handover pressure from moving satellites
- multi-orbit context that can include `LEO`, `MEO`, and `GEO` when evidence
  supports the claim

Recent evidence review also showed that the earlier YKA package proved a real
fixed facility context, not a verified ground station capable of public
cross-orbit satellite handover. Reusing YKA or the aircraft corridor as the
next product narrative would preserve old implementation momentum but would
miss the clarified requirement.

The current evidence snapshot is recorded at:

- `itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/`

The key finding is that Taiwan/Chunghwa Telecom currently has the strongest
public evidence for `GEO/MEO/LEO` multi-orbit capability near Taiwan, while the
second country/site candidate still needs an endpoint-pair authority gate.

## Decision

### 1. Open A New V4 Ground-Station Planning Lane

Create a new `M8A-V4` planning lane for a ground-station multi-orbit handover
scene. This lane supersedes the aviation/YKA product narrative for the next
homepage demo, but it does not delete or rewrite the completed `M8A` historical
work.

The new planning home is:

- `docs/sdd/m8a-v4-ground-station-multi-orbit-handover-plan.md`

### 2. Reuse V3.5 As Technical Foundation Only

The `M8A-V3.5` implementation remains useful for:

- Cesium runtime wiring
- replay-clock-driven presentation
- source-lineaged satellite actor projection
- generic satellite mesh attribution
- source-vs-render truth-boundary telemetry
- smoke/screenshot validation harnesses

It must not be treated as proof that the aviation/YKA endpoint story is still
the desired product narrative.

### 3. Require Endpoint-Pair Authority Before Runtime Promotion

The next implementation must not pick two points directly from a catalog or
research list. It must first pass an endpoint-pair authority gate that records:

- endpoint identity
- country/operator/site family
- endpoint role:
  - customer/service endpoint
  - ground station
  - gateway/SNP
  - teleport
  - logical service node
- coordinate precision
- public source authority
- per-orbit evidence for `LEO`, `MEO`, and `GEO`
- explicit non-claims

The initial preferred primary endpoint candidate is:

- Taiwan / Chunghwa Telecom multi-orbit ground infrastructure

The second endpoint remains unresolved and must be selected from a candidate
package rather than inferred ad hoc.

### 4. Preserve Truth Boundaries

The V4 scene may use real ground-station coordinates, real operator/service
evidence, and source-lineaged satellite actors. It may model or simulate
handover decisions only if that boundary is visible and machine-checkable.

It must not claim:

- public proof that two selected ground stations have performed live
  cross-orbit handover with each other
- exact active serving satellite truth
- exact active gateway assignment
- pair-specific teleport path truth
- measurement-truth latency, jitter, throughput, or continuity
- native RF handover across unrelated commercial constellations

### 5. Keep R2 Read-Only

`R2` remains the read-only confirmed-points catalog. It is not converted into a
runtime communication selector. V4 may consume evidence packages that would
also be suitable for R2, but V4 requires a stronger endpoint-pair authority
gate before runtime use.

### 6. Retain The Aviation/YKA Line Only As Historical Regression Surface

The completed aviation/YKA implementation is not deleted as part of this scope
reset because it still protects reusable viewer behavior such as route
bootstrap, replay-clock wiring, Cesium scene lifecycle, telemetry seams, and
smoke-test harnesses.

That retention is not product-scope authority. The aviation/YKA route,
fixtures, controllers, and tests must be treated as historical/regression-only
unless explicitly reopened by a separate decision.

A later cleanup branch may remove, archive, or further hide those surfaces when:

- the VNext ground-station line covers route bootstrap, replay, telemetry, and
  visual smoke regressions at equal or better confidence
- the old aviation/YKA surfaces have no homepage or product entry
- no active VNext runtime or smoke test depends on the old endpoint pair to
  protect shared viewer behavior
- the cleanup preserves enough documentation to explain why aircraft/YKA was
  superseded

Until that gate is met, the old implementation may remain in code and tests,
but it must not re-enter V4/VNext endpoint scope or appear as a recommended
product path.

## Alternatives Considered

### Continue With Aircraft + YKA

This would reuse the most existing UI and runtime code, but it would keep the
wrong product story. It does not satisfy the clarified requirement for two
ground-station endpoints.

Rejected.

### Treat R2 As The Runtime Selector

This would be tempting because R2 already discusses confirmed points, grouping,
and filtering. However, R2 was explicitly designed as read-only and does not
grant communication-selection authority.

Rejected.

### Require Two Fully Proven Three-Orbit Ground Stations Before Any V4 Planning

This would be ideal from an evidence standpoint, but current public evidence
does not show a second near-Taiwan country with Taiwan-level `LEO/MEO/GEO`
proof. Blocking all planning on that would stall the corrected scene.

Rejected. V4 should plan the authority gate, candidate selection, and explicit
truth boundary first.

### Use Taiwan-Only Endpoints

This would maximize evidence quality because Chunghwa Telecom is currently the
strongest multi-orbit candidate. It would fail the preference for a cross-country
pair unless no defensible second-country candidate can be promoted later.

Deferred as fallback.

## Consequences

- New work should start from the V4 SDD, not from the M8A aviation/YKA SDDs.
- Existing V3.5 source-lineaged actor code remains useful but needs semantic
  rewiring before any new implementation.
- Endpoint A/B labels and overlay copy must remove aircraft/YKA assumptions in
  the V4 scene.
- Aviation/YKA surfaces are retained only for historical/regression value until
  a later cleanup gate proves they can be safely removed or archived.
- A future implementation prompt must explicitly say "do not rewrite the plan"
  and "do not promote endpoint B before the authority gate is satisfied."
- Roadmap and handoff documents must warn future agents that V4 is a product
  semantic correction, not a generic arbitrary endpoint selector.

## Related

- `docs/sdd/m8a-v4-ground-station-multi-orbit-handover-plan.md`
- `docs/sdd/m8a-v3.5-source-lineaged-orbit-actor-recovery-plan.md`
- `docs/sdd/multi-orbit-follow-on-roadmap.md`
- `../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/README.md`
- `../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/candidate-matrix.json`
