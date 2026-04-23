# M8A Satcom Info Expansion Plan

Source note: this file defines the viewer-facing satcom information widening
for `M8A`. It exists so the second nearby endpoint can be explained without
quietly widening into measurement-truth wording, operator-pair expansion, or
generic multi-case control UI.

Related M8A spine: see
[./m8a-nearby-second-endpoint-expansion-plan.md](./m8a-nearby-second-endpoint-expansion-plan.md).
Related runtime ownership widening: see
[./m8a-runtime-ownership-widening-plan.md](./m8a-runtime-ownership-widening-plan.md).
Related first active-case narrative surface: see
[./multi-orbit-program-skeleton.md](./multi-orbit-program-skeleton.md).

## Status

- Planning-only satcom-info SDD
- No runtime implementation authority by itself
- Bounded to first-case-plus-nearby-second-endpoint only

## Purpose

This file answers one narrow question:

What new viewer-facing communication is allowed once `M8A` adds a second nearby
real endpoint, and what must remain out of scope?

## Core Information Decision

The first `M8A` satcom-info widening should be supplemental, not a rewrite of
the already accepted first-case narrative.

That means the first implementation should prefer:

- one dedicated nearby-second-endpoint info surface

before it considers:

- rewriting the integrated active-case narrative into a broader global case UI

## Planned Runtime Surface

The future runtime surface is planned as:

- `first-intake-nearby-second-endpoint-info`

The future controller home is planned as:

- `src/runtime/first-intake-nearby-second-endpoint-info-controller.ts`

This controller should consume only:

- the nearby second-endpoint runtime seam
- the existing active first-case runtime seams needed for context

It must not side-read:

- raw endpoint package files
- raw corridor package files
- external research JSON at runtime

## Allowed Facts

The first `M8A` info widening may expose only:

- second endpoint label
- second endpoint type
- second endpoint position precision
- second endpoint geography bucket
- why it is "nearby" to the accepted first corridor
- explicit non-claims:
  - no active gateway assignment
  - no pair-specific GEO teleport
  - no measurement-truth performance claim

It may also restate already accepted first-case facts:

- `OneWeb LEO + Intelsat GEO aviation`
- `service-layer switching`
- `isNativeRfHandover = false`
- bounded-proxy semantics

## Forbidden Facts

The first `M8A` info widening must not expose:

- exact serving infrastructure path
- exact active onboard service state
- tail-level equipage claim
- measurement-truth latency/jitter/throughput
- generic multi-case comparison UI
- MEO language

## Information Design Rule

The nearby-second-endpoint info surface should answer three questions only:

1. what is the second endpoint?
2. where is it, at what accepted precision?
3. what is it **not** claiming?

If the info surface starts answering broader questions such as:

- which orbit is currently winning?
- which gateway is serving now?
- which operator family should be chosen next?

then it has already widened beyond `M8A`.

## Acceptance Criteria For The Future Implementation Slice

The future satcom-info slice is acceptable only when:

1. the second endpoint is understandable from the viewer alone
2. its accepted precision is visible
3. its non-claims are explicit
4. the first-case truth boundary remains intact
5. the panel does not become a generic control center or multi-case selector

## Stop Boundary

This file does not authorize:

- runtime ownership widening
- globe expression
- arbitrary endpoint UI
- second operator-pair narrative
- MEO exploratory narrative
