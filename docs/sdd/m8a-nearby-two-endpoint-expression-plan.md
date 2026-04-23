# M8A Nearby Two-Endpoint Expression Plan

Source note: this file defines the first viewer-expression lane for `M8A`. It
does not authorize arbitrary endpoint rendering or handover theater. Its job is
to make one nearby second endpoint visible beside the already accepted first
endpoint geography.

Related M8A spine: see
[./m8a-nearby-second-endpoint-expansion-plan.md](./m8a-nearby-second-endpoint-expansion-plan.md).
Related runtime ownership widening: see
[./m8a-runtime-ownership-widening-plan.md](./m8a-runtime-ownership-widening-plan.md).
Related first-case overlay runtime lane: see
[./multi-orbit-first-overlay-seed-resolution-lane.md](./multi-orbit-first-overlay-seed-resolution-lane.md).

## Status

- Planning-only render/expression SDD
- No implementation authority by itself
- Bounded to first-case-plus-nearby-second-endpoint only

## Purpose

This file answers one narrow question:

Once the nearby second endpoint exists as runtime-owned plain-data, what is the
smallest viewer expression that makes the two-endpoint relation legible without
turning the scene into generic animated handover theater?

## Core Expression Decision

The first `M8A` expression must show:

- the accepted first mobile endpoint geography
- the accepted nearby second fixed endpoint
- a bounded relation between them

It must not imply:

- satellite path truth
- gateway serving truth
- GEO teleport truth
- RF beam truth

## Exact First Expression Shape

`M8A.3` should express exactly three visual elements:

1. `current mobile endpoint position cue`
   - derived from the existing accepted corridor replay + replay clock
2. `fixed nearby second-endpoint marker`
   - derived from the new nearby second-endpoint runtime seam
3. `relation cue`
   - a bounded presentation-only cue between the two

The relation cue may be:

- a dashed line
- a soft pulse line
- a short-lived highlight link

It must be described in docs and UI as:

- scene aid only
- not a claimed satellite path

## Planned Runtime Home

The future runtime controller home is planned as:

- `src/runtime/first-intake-nearby-second-endpoint-expression-controller.ts`

This controller should consume only:

- the first-intake runtime scenario surface
- the first-intake mobile-endpoint trajectory seam
- the nearby second-endpoint seam
- the replay clock

It must not side-read:

- raw corridor package files
- raw second-endpoint package files
- physical-input source files

## Animation Boundary

Allowed animation:

- replay-clock-driven movement of the current aircraft cue
- subtle relation-cue transitions tied to the active replay time

Allowed static expression:

- fixed second-endpoint marker
- optional fixed label

Forbidden animation:

- fake orbit-to-orbit transfer beams
- active gateway switching flashes
- GEO teleport selection animation
- generic handover arcs not grounded in runtime seams

## Truth Boundary Rule

The expression must keep these facts explicit:

- the mobile endpoint comes from an accepted historical replay package
- the second endpoint is a fixed nearby real endpoint
- the relation cue is bounded presentation only
- no serving infrastructure claim is being made

## Acceptance Criteria For The Future Implementation Slice

The future expression slice is acceptable only when:

1. one nearby fixed second endpoint is visible on the globe
2. the current mobile position cue comes only from the existing trajectory seam
3. the relation cue is clearly presentation-only
4. no render surface claims active gateway, GEO teleport, or direct sat-path
   truth
5. the scene still reads as "existing first endpoint + nearby second endpoint",
   not generic arbitrary endpoint selection

## Stop Boundary

This file does not authorize:

- arbitrary endpoint selection UI
- second-case expression
- MEO expression
- satcom info panel wording
- global comparison scenes
