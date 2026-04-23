# Nearby Second-Endpoint Info Contract

## Purpose

`nearby-second-endpoint-info` is the dedicated `M8A.4` viewer-facing
information surface for the accepted nearby second endpoint. It is
supplemental to the integrated first active-case narrative and exists only to
answer:

1. what the second endpoint is
2. where it is expressed, at what accepted precision
3. what remains unclaimed

It does not rewrite endpoint A, endpoint B, first-case handover semantics, or
the M8A.3 globe expression.

## Current Public Source Of Truth

- `src/runtime/first-intake-nearby-second-endpoint-info-controller.ts`
- `src/runtime/bootstrap/composition.ts`
- `docs/data-contracts/document-telemetry.md`
- `tests/smoke/verify-m8a4-first-intake-nearby-second-endpoint-info-runtime.mjs`

## Runtime Sources

The info controller may read only existing repo-owned runtime seams:

- `firstIntakeNearbySecondEndpoint`
- `firstIntakeActiveCaseNarrative`
- `firstIntakeScenarioSurface`

It must not import or read raw package files under:

- `itri/multi-orbit/download/nearby-second-endpoints/...`
- `itri/multi-orbit/download/aircraft-corridors/...`

## Viewer-Facing Facts

The first `M8A.4` surface exposes only:

- second endpoint label:
  `YKA Kamloops Airport Operations Office`
- endpoint type:
  `airport-adjacent-fixed-service-endpoint`
- accepted position precision:
  `facility-known`
- geography bucket:
  `interior-bc-corridor-adjacent`
- nearby relation:
  `first-corridor-nearby-second-endpoint`
- first-case context:
  `OneWeb LEO + Intelsat GEO aviation`,
  `service-layer switching`, `isNativeRfHandover = false`, `bounded-proxy`

## Explicit Non-Claims

The surface must make these non-claims visible:

- no active gateway assignment
- no pair-specific GEO teleport
- no measurement-truth performance claim

It must not expose measurement-truth latency, jitter, throughput, active
serving infrastructure, a second operator pair, arbitrary endpoint selection,
or MEO wording.

## Runtime Proof

The addressed first-intake route publishes:

- `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeNearbySecondEndpointInfo`
- document telemetry under `firstIntakeNearbySecondEndpointInfo*`

The default bootstrap route must not publish either proof seam.

## Scope Notes

This contract does not authorize:

- arbitrary endpoint UI
- global or multi-case comparison UI
- physical-input changes
- handover-decision changes
- mobile-endpoint-trajectory changes
- nearby-second-endpoint ownership widening
- new globe expression beyond `M8A.3`
