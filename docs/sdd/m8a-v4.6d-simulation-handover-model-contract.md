# M8A-V4.6D Simulation Handover Model Contract

Source note: this is the accepted `V4.6D` model-contract and SDD delta for the
`M8A-VNext` ground-station scene. It is docs-only and does not authorize
runtime implementation by itself.

Related VNext roadmap:
[./m8a-vnext-multi-orbit-simulation-roadmap.md](./m8a-vnext-multi-orbit-simulation-roadmap.md).
Related V4 projection contract:
[../data-contracts/m8a-v4-ground-station-projection.md](../data-contracts/m8a-v4-ground-station-projection.md).
Related V4.6B actor projection record:
[./m8a-v4.6b-source-lineaged-orbit-actor-projection.md](./m8a-v4.6b-source-lineaged-orbit-actor-projection.md).

## Status

- accepted model-contract SDD delta
- docs/design/contract only
- no runtime implementation in this phase
- current as of 2026-04-28

## Decision

`V4.6D` uses both documentation surfaces:

1. this SDD records the accepted model behavior, state windows, validation
   rules, and implementation gate
2. the V4 projection contract receives an additive `V4.6D` extension because
   the future runtime-facing artifact/module contract belongs at the existing
   viewer-owned projection seam

The accepted model id is:

`m8a-v4.6d-simulation-handover-model.v1`

This id is intentionally model-specific rather than a generic V5 subsystem id.
The model is still scoped to the accepted Taiwan/CHT + Speedcast Singapore V4
scene and must not become a reusable arbitrary endpoint selector.

## Fixed Baseline

- V4.6A commit: `6d7fd74`
- V4.6B commit: `ddbd21c`
- route: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair:
  `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- precision: `operator-family-only`
- runtime source boundary: repo-owned projection artifact/module only
- runtime actor set: `6` LEO, `5` MEO, `2` GEO display-context actors

Accepted actor ids for V4.6D model references:

| Actor id | Orbit class | V4.6D eligibility |
| --- | --- | --- |
| `oneweb-0386-leo-display-context` | `leo` | representative or candidate context |
| `oneweb-0537-leo-display-context` | `leo` | representative or candidate context |
| `oneweb-0701-leo-display-context` | `leo` | representative or candidate context |
| `oneweb-0012-leo-display-context` | `leo` | representative or candidate context |
| `oneweb-0249-leo-display-context` | `leo` | representative or candidate context |
| `oneweb-0702-leo-display-context` | `leo` | representative or candidate context |
| `o3b-mpower-f6-meo-display-context` | `meo` | representative or candidate context |
| `o3b-mpower-f1-meo-display-context` | `meo` | representative or candidate context |
| `o3b-mpower-f2-meo-display-context` | `meo` | representative or candidate context |
| `o3b-mpower-f4-meo-display-context` | `meo` | representative or candidate context |
| `o3b-mpower-f3-meo-display-context` | `meo` | representative or candidate context |
| `st-2-geo-continuity-anchor` | `geo` | representative, candidate, or fallback context |
| `ses-9-geo-display-context` | `geo` | representative, candidate, or fallback context |

These are display-context actors only. They are not active serving satellites.

## Hard Boundaries

The model must not claim:

- real operator handover events
- active serving satellite identity
- active gateway assignment
- pair-specific teleport path truth
- measured latency, jitter, throughput, or continuity
- native RF handover
- endpoint pair or precision changes
- `R2` runtime selector authority
- raw `itri` package reads or live external source reads at runtime

## Model Schema Summary

The future runtime-facing artifact/module may add this model as an additive
field. Existing V4.2 and V4.6B artifacts are not retroactively invalidated.

```ts
interface V46dSimulationHandoverModel {
  modelId: "m8a-v4.6d-simulation-handover-model.v1";
  modelStatus: "accepted-contract";
  modelScope: "deterministic-display-context-state-machine";
  modelTruth: "simulation-output-not-operator-log";
  endpointPairId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
  acceptedPairPrecision: "operator-family-only";
  route: "/?scenePreset=regional&m8aV4GroundStationScene=1";
  baselineActorSet: V46dActorSetReference;
  inputs: V46dSimulationHandoverInputs;
  timeline: readonly [
    V46dSimulationHandoverWindow,
    V46dSimulationHandoverWindow,
    V46dSimulationHandoverWindow,
    V46dSimulationHandoverWindow,
    V46dSimulationHandoverWindow
  ];
  validationExpectations: V46dSimulationHandoverValidationExpectations;
  forbiddenClaimScan: V46dForbiddenClaimScanPolicy;
}
```

```ts
type V46dActorId =
  | "oneweb-0386-leo-display-context"
  | "oneweb-0537-leo-display-context"
  | "oneweb-0701-leo-display-context"
  | "oneweb-0012-leo-display-context"
  | "oneweb-0249-leo-display-context"
  | "oneweb-0702-leo-display-context"
  | "o3b-mpower-f6-meo-display-context"
  | "o3b-mpower-f1-meo-display-context"
  | "o3b-mpower-f2-meo-display-context"
  | "o3b-mpower-f4-meo-display-context"
  | "o3b-mpower-f3-meo-display-context"
  | "st-2-geo-continuity-anchor"
  | "ses-9-geo-display-context";
```

### Inputs

```ts
interface V46dSimulationHandoverInputs {
  replayRatio: number;
  replayRatioPolicy: "normalized-zero-to-one-over-v4.6a-full-leo-replay";
  windowSelection: "deterministic-ratio-window";
  endpointPairId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
  acceptedPairPrecision: "operator-family-only";
  actorSetSource: "v4.6b-repo-owned-projection-runtime-module";
  actorIds: ReadonlyArray<V46dActorId>;
  actorGeometryInputs: ReadonlyArray<V46dActorGeometryInput>;
  metricPolicy: V46dBoundedMetricPolicy;
  runtimeSourceBoundary: "repo-owned-projection-or-generated-module-only";
}

interface V46dActorSetReference {
  expectedLeoActors: 6;
  expectedMeoActors: 5;
  expectedGeoActors: 2;
  acceptedActorIds: ReadonlyArray<V46dActorId>;
}

interface V46dActorGeometryInput {
  actorId: V46dActorId;
  orbitClass: "leo" | "meo" | "geo";
  geometryClass:
    | "display-acquisition-context"
    | "display-aging-context"
    | "display-continuity-hold-context"
    | "display-reentry-context"
    | "display-continuity-guard-context";
  geometryTruth: "display-context-not-service-truth";
}

interface V46dBoundedMetricPolicy {
  metricTruth: "modeled-bounded-class-not-measured";
  numericLatencyAllowed: false;
  numericJitterAllowed: false;
  numericThroughputAllowed: false;
  allowedMetricClasses: readonly [
    "latency-class",
    "jitter-class",
    "network-speed-class",
    "continuity-class"
  ];
}
```

`replayRatio` is the deterministic state selector. Geometry and metric classes
may explain the displayed state, but they must not make the model claim an
observed service event.

### Outputs And Role Names

```ts
interface V46dSimulationHandoverWindow {
  windowId: V46dSimulationHandoverWindowId;
  startRatioInclusive: number;
  stopRatioExclusive: number;
  stopPolicy: "exclusive-except-final-window";
  displayRepresentativeOrbitClass: "leo" | "meo" | "geo";
  displayRepresentativeActorId: V46dActorId;
  candidateContextOrbitClasses: ReadonlyArray<"leo" | "meo" | "geo">;
  candidateContextActorIds: ReadonlyArray<V46dActorId>;
  fallbackContextOrbitClasses: readonly ["geo"];
  fallbackContextActorIds: ReadonlyArray<V46dActorId>;
  handoverPressureReason: V46dHandoverPressureReason;
  reasonSignalClasses: ReadonlyArray<V46dReasonSignalClass>;
  boundedMetricClasses: V46dWindowMetricClasses;
  nonClaims: V46dWindowNonClaims;
}

type V46dHandoverPressureReason =
  | "leo-display-geometry-acquisition"
  | "leo-display-geometry-aging"
  | "meo-continuity-hold"
  | "leo-display-geometry-reentry"
  | "geo-continuity-guard";

type V46dReasonSignalClass =
  | "leo-candidate-entering-display-region"
  | "leo-candidate-aging-from-display-region"
  | "meo-wide-area-continuity-context"
  | "leo-candidate-reentry-context"
  | "geo-continuity-guard-context"
  | "operator-family-precision-disclosure"
  | "simulation-state-non-claim-disclosure";

interface V46dWindowMetricClasses {
  metricTruth: "modeled-bounded-class-not-measured";
  latencyClass:
    | "leo-low-latency-context-class"
    | "meo-mid-latency-context-class"
    | "geo-higher-latency-continuity-class";
  jitterClass:
    | "changing-geometry-class"
    | "continuity-hold-class"
    | "continuity-guard-class";
  networkSpeedClass:
    | "candidate-capacity-context-class"
    | "continuity-context-class"
    | "guard-context-class";
  continuityClass:
    | "acquisition-context-class"
    | "pressure-context-class"
    | "hold-context-class"
    | "reentry-context-class"
    | "guard-context-class";
}
```

Accepted role names:

- `displayRepresentativeActorId`
- `candidateContextActorIds`
- `fallbackContextActorIds`

Forbidden role names:

- `servingSatelliteId`
- `activeServingSatelliteId`
- `activeGatewayId`
- `gatewayAssignmentId`
- `teleportPathId`

## Accepted State Windows

The five windows cover the normalized replay range from `0` to `1` with no
gaps and no overlaps. The final window includes the replay end.

| Window | Ratio range | Representative | Candidates | Fallback context | Pressure reason |
| --- | --- | --- | --- | --- | --- |
| `leo-acquisition-context` | `[0.00, 0.20)` | `oneweb-0386-leo-display-context` | `oneweb-0537-leo-display-context`, `oneweb-0701-leo-display-context`, `o3b-mpower-f6-meo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` | `leo-display-geometry-acquisition` |
| `leo-aging-pressure` | `[0.20, 0.40)` | `oneweb-0537-leo-display-context` | `oneweb-0012-leo-display-context`, `oneweb-0249-leo-display-context`, `o3b-mpower-f1-meo-display-context`, `o3b-mpower-f2-meo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` | `leo-display-geometry-aging` |
| `meo-continuity-hold` | `[0.40, 0.60)` | `o3b-mpower-f6-meo-display-context` | `o3b-mpower-f1-meo-display-context`, `o3b-mpower-f2-meo-display-context`, `o3b-mpower-f4-meo-display-context`, `o3b-mpower-f3-meo-display-context`, `oneweb-0702-leo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` | `meo-continuity-hold` |
| `leo-reentry-candidate` | `[0.60, 0.82)` | `oneweb-0702-leo-display-context` | `oneweb-0012-leo-display-context`, `oneweb-0249-leo-display-context`, `oneweb-0386-leo-display-context`, `o3b-mpower-f4-meo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` | `leo-display-geometry-reentry` |
| `geo-continuity-guard` | `[0.82, 1.00]` | `st-2-geo-continuity-anchor` | `ses-9-geo-display-context`, `o3b-mpower-f3-meo-display-context`, `oneweb-0701-leo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` | `geo-continuity-guard` |

Accepted metric classes are bounded labels only:

| Window | Latency class | Jitter class | Network-speed class | Continuity class |
| --- | --- | --- | --- | --- |
| `leo-acquisition-context` | `leo-low-latency-context-class` | `changing-geometry-class` | `candidate-capacity-context-class` | `acquisition-context-class` |
| `leo-aging-pressure` | `leo-low-latency-context-class` | `changing-geometry-class` | `candidate-capacity-context-class` | `pressure-context-class` |
| `meo-continuity-hold` | `meo-mid-latency-context-class` | `continuity-hold-class` | `continuity-context-class` | `hold-context-class` |
| `leo-reentry-candidate` | `leo-low-latency-context-class` | `changing-geometry-class` | `candidate-capacity-context-class` | `reentry-context-class` |
| `geo-continuity-guard` | `geo-higher-latency-continuity-class` | `continuity-guard-class` | `guard-context-class` | `guard-context-class` |

Required window ids:

```ts
type V46dSimulationHandoverWindowId =
  | "leo-acquisition-context"
  | "leo-aging-pressure"
  | "meo-continuity-hold"
  | "leo-reentry-candidate"
  | "geo-continuity-guard";
```

Every window must carry the same required non-claims:

```ts
interface V46dWindowNonClaims {
  noRealOperatorHandoverEvent: true;
  noActiveServingSatelliteIdentity: true;
  noActiveGatewayAssignment: true;
  noPairSpecificTeleportPathTruth: true;
  noMeasuredLatencyJitterThroughputTruth: true;
  noNativeRfHandover: true;
  noEndpointPairOrPrecisionChange: true;
  noR2RuntimeSelector: true;
  noRawItriOrLiveExternalRuntimeSource: true;
}
```

```ts
interface V46dSimulationHandoverValidationExpectations {
  expectedModelId: "m8a-v4.6d-simulation-handover-model.v1";
  expectedEndpointPairId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
  expectedPrecision: "operator-family-only";
  expectedActorCounts: {
    leo: 6;
    meo: 5;
    geo: 2;
  };
  expectedWindowIds: readonly [
    "leo-acquisition-context",
    "leo-aging-pressure",
    "meo-continuity-hold",
    "leo-reentry-candidate",
    "geo-continuity-guard"
  ];
  windowsMustCoverZeroToOneWithoutGaps: true;
  actorIdsMustExistInV46bActorSet: true;
  actorOrbitClassesMustMatchModelRoles: true;
  endpointPairAndPrecisionMustRemainUnchanged: true;
  runtimeRawItriSideReadAllowed: false;
  measuredMetricTruthAllowed: false;
  requiredWindowNonClaimKeys: ReadonlyArray<keyof V46dWindowNonClaims>;
}

interface V46dForbiddenClaimScanPolicy {
  scanPositiveClaimFields: true;
  scanRuntimeLabelsDerivedFromModel: true;
  allowForbiddenConceptsOnlyInNegatedFields: true;
  negatedFieldNames: readonly [
    "nonClaims",
    "doesNotClaim",
    "requiredDisclosures",
    "validationExpectations",
    "forbiddenClaimScan"
  ];
  forbiddenModelKeys: ReadonlyArray<
    | "servingSatelliteId"
    | "activeServingSatelliteId"
    | "activeGatewayId"
    | "gatewayAssignmentId"
    | "teleportPathId"
    | "latencyMs"
    | "jitterMs"
    | "throughputMbps"
    | "throughputGbps"
    | "rfHandoverId"
    | "operatorHandoverEventId"
  >;
}
```

## Validation Expectations

Future implementation must make these checks machine-readable:

- `modelId` equals `m8a-v4.6d-simulation-handover-model.v1`
- route remains `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair remains
  `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- precision remains `operator-family-only`
- actor count remains `6` LEO, `5` MEO, `2` GEO unless a later accepted
  source/projection gate changes it
- every referenced actor id exists in the V4.6B repo-owned actor set
- `displayRepresentativeActorId` orbit class matches
  `displayRepresentativeOrbitClass`
- every `candidateContextActorIds` entry matches one of the listed
  `candidateContextOrbitClasses`
- every `fallbackContextActorIds` entry is `geo`
- windows sort by `startRatioInclusive`
- first window starts at `0`
- each window stop equals the next window start
- final window stops at `1`
- no state window is missing required non-claims
- bounded metric fields contain only classes, not numeric measurements or unit
  suffixes such as `Ms`, `Mbps`, `Gbps`, or `percentMeasured`
- runtime source-boundary scan remains required for controller, renderer,
  tests, and generated modules

## Forbidden-Claim Scan Policy

The future smoke test must scan the model object and any runtime labels derived
from it.

Positive-claim fields must not contain positive assertions for:

- real operator handover event
- active serving satellite
- active gateway
- pair-specific teleport path
- measured latency, jitter, throughput, or continuity
- native RF handover
- site-level, same-site, or exact endpoint precision
- R2 runtime selection
- raw `itri` or live external runtime source reads

The scan must fail if these keys appear anywhere in the model:

- `servingSatelliteId`
- `activeServingSatelliteId`
- `activeGatewayId`
- `gatewayAssignmentId`
- `teleportPathId`
- `latencyMs`
- `jitterMs`
- `throughputMbps`
- `throughputGbps`
- `rfHandoverId`
- `operatorHandoverEventId`

The same concepts may appear only inside `nonClaims`, `doesNotClaim`,
`requiredDisclosures`, or validation-policy fields that explicitly negate the
claim.

## Runtime Implementation Gate

Runtime implementation is ready to open only after the user explicitly starts a
V4.6D implementation thread. That thread must:

- read this SDD and the V4 projection contract first
- implement the model through the repo-owned projection/module seam only
- avoid runtime reads from raw `itri` packages or live external sources
- preserve the endpoint pair, route, precision, and V4.6B actor set
- add validation for window coverage, actor references, actor orbit-class
  matching, role-name bans, bounded metric classes, required non-claims, and
  forbidden claims

No runtime code is changed by this SDD delta.

## Runtime Implementation Prompt

Use this only after the user explicitly opens V4.6D runtime implementation:

```text
Read the canonical SDD and projection contract first. Implement only
M8A-V4.6D simulation handover model runtime consumption.

Canonical docs:
- docs/sdd/m8a-v4.6d-simulation-handover-model-contract.md
- docs/sdd/m8a-vnext-multi-orbit-simulation-roadmap.md
- docs/data-contracts/m8a-v4-ground-station-projection.md

Scope:
- Add model id m8a-v4.6d-simulation-handover-model.v1 through the repo-owned
  projection/module seam only.
- Preserve route /?scenePreset=regional&m8aV4GroundStationScene=1.
- Preserve endpoint pair taiwan-cht-speedcast-singapore-operator-family-2026-04-26.
- Preserve operator-family-only precision.
- Reference only the V4.6B 6 LEO / 5 MEO / 2 GEO actor set.
- Implement deterministic windows:
  1. leo-acquisition-context
  2. leo-aging-pressure
  3. meo-continuity-hold
  4. leo-reentry-candidate
  5. geo-continuity-guard.

Rules:
- Use displayRepresentativeActorId, candidateContextActorIds, and
  fallbackContextActorIds.
- Do not add servingSatelliteId or any active serving/gateway/path role.
- Metrics are bounded classes only; no numeric measured latency, jitter,
  throughput, or continuity.
- Every state/window carries required non-claims.
- Do not add an R2 runtime selector.
- Do not read raw itri packages or live external sources at runtime.

Validation:
- Build.
- Add or run a focused V4.6D smoke test proving window coverage, actor-id
  existence, actor orbit-class role matching, unchanged endpoint pair and
  precision, runtime source boundary, required non-claims, bounded metric
  classes, and forbidden-claim scan.

Return only:
- Changed files
- What was implemented
- Validation results
- Deviations from SDD
- Remaining work
```
