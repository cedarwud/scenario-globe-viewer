# customer Orbit-Model Intake Contract

Date: 2026-05-13

Status: docs-only data contract for customer roadmap slice S1 / F-01. This
document defines the intake requirements for a future customer self-developed
orbit-model authority package. It does not authorize runtime implementation,
test changes, package changes, retained output evidence, fixture JSON files, or
any claim that an customer model package is present in this repo.

Related roadmap:
[../sdd/itri-requirement-completion-roadmap.md](../sdd/itri-requirement-completion-roadmap.md).

Related contracts and plans:

- [satellite-overlay.md](./satellite-overlay.md)
- [m8a-v4-ground-station-projection.md](./m8a-v4-ground-station-projection.md)
- [itri-synthetic-fallback-fixtures.md](./itri-synthetic-fallback-fixtures.md)
- [../sdd/m8a-v4.13-multi-orbit-scale-runtime-plan.md](../sdd/m8a-v4.13-multi-orbit-scale-runtime-plan.md)
- [../sdd/phase-6-plus-requirement-centered-plan.md](../sdd/phase-6-plus-requirement-centered-plan.md)

## Purpose

F-01 remains an external-authority-only lane until an customer or owner-approved
orbit-model package is received, reviewed, and paired with validation vectors.
This contract defines the minimum plain-data intake envelope that future work
must require before any adapter implementation can be planned.

The contract is intentionally stricter than the existing public-TLE viewer
profile. Public CelesTrak or other public TLE sources can support bounded
repo-owned public profiles, but they do not replace the customer model package,
customer-selected propagation rules, or owner-approved validation vectors required
for F-01.

## Intake Preconditions

Before a future implementation slice may begin, the retained authority package
must include:

1. Required authority package metadata.
2. Model identity fields and versioned propagation semantics.
3. Input schema expectations with declared units, frames, and time basis.
4. Output schema expectations with declared frames, labels, uncertainty, and
   tolerance fields.
5. Validation vectors with expected outputs, tolerances, and comparison method.
6. Redistribution, license, and use notes that allow the repo to retain the
   minimum review metadata and any approved projected artifacts.
7. A reviewer decision that states whether the package is usable for adapter
   planning, rejected, or blocked on missing facts.

If any required field is missing, the only allowed result is an intake gap. A
gap may create a request for the package owner, but it must not create runtime
code, fixture payloads, or authority-status copy.

## Required Authority Package Metadata

Every retained intake package must carry these fields before it can be used for
adapter planning:

| Field | Required rule |
| --- | --- |
| `packageId` | Stable package identifier assigned by the customer/model owner or by the repo intake reviewer if the owner has no identifier. |
| `owner` | Human, team, or role that owns the model package and can answer authority questions. |
| `receivedAt` | ISO-8601 timestamp when the repo received the package or authority extract. |
| `redistributionPolicy` | Explicit policy for retaining, copying, projecting, redacting, or excluding package contents from the repo. |
| `licenseUseNotes` | License, use, export, confidentiality, citation, and derivative-artifact notes. |
| `reviewer` | Repo reviewer or owner delegate who checked the package metadata, schema, vectors, and boundaries. |

Recommended supporting fields:

- `sourceTier`: expected value `tier-1-itri-authority` or another explicit
  owner-approved authority tier.
- `redactionPolicy`: fields or files that must not enter public repo artifacts.
- `sourcePackageLocation`: retained private path, checksum, or owner system
  reference when the full package cannot be committed.
- `projectionAllowed`: whether the repo may create viewer-owned projected
  artifacts from the package.
- `reviewNotes`: unresolved questions and owner decisions.

## Model Identity Fields

The authority package must declare one model identity record:

```ts
interface ItriOrbitModelIdentity {
  modelName: string;
  modelVersion: string;
  propagationMethod: string;
  coordinateFrames: {
    inputFrames: ReadonlyArray<string>;
    outputFrames: ReadonlyArray<string>;
    intermediateFrames?: ReadonlyArray<string>;
    frameDefinitionRefs: ReadonlyArray<string>;
  };
  timeSystem: string;
  epochRules: {
    acceptedEpochFormats: ReadonlyArray<string>;
    epochSource: string;
    leapSecondPolicy?: string;
    relativeTimeAllowed: boolean;
    interpolationPolicy?: string;
  };
}
```

Required interpretation:

- `modelName` and `modelVersion` identify the exact model release being
  reviewed.
- `propagationMethod` names the model-owned propagation method or references
  the owner document that defines it.
- `coordinateFrames` must state every input and output frame, including whether
  the adapter is expected to receive or produce ECEF, ECI, TEME, WGS84 geodetic,
  or another frame.
- `timeSystem` must identify the model time basis, such as UTC, TAI, GPS time,
  or an owner-defined simulation clock.
- `epochRules` must say how scenario start time, model epoch, sample time, and
  relative replay time relate to each other.

If these fields are incomplete, the adapter must not infer missing frame or
time semantics from public TLE behavior.

## Input Schema Expectations

The authority package must define the model-facing input shape. At minimum it
must include:

| Input area | Required content |
| --- | --- |
| Scenario time | Absolute and/or relative scenario time fields, time system, epoch source, sample cadence, valid range, and replay-clock mapping rule. |
| Satellite identity | Stable satellite id, optional display name, orbit class when applicable, model catalog key, and identity-version policy. |
| Ground station reference | Ground station id, reference frame, coordinate basis, precision policy, endpoint-pair relationship when applicable, and whether the reference is source truth or a viewer projection. |
| Orbit state inputs | Required state representation, such as position/velocity, orbital elements, covariance, drag/solar parameters, maneuver state, or owner-specific model inputs. |
| Units | Required units for every numeric input, including distance, velocity, angle, time, frequency, atmospheric or physical parameters, and uncertainty terms. |

Pseudo-shape:

```ts
interface ItriOrbitModelInputContract {
  scenarioTime: {
    timestamp: string;
    timeSystem: string;
    epochId: string;
    replayOffsetSeconds?: number;
    sampleCadenceSeconds?: number;
  };
  satelliteIdentity: {
    satelliteId: string;
    modelCatalogKey?: string;
    displayName?: string;
    orbitClass?: "leo" | "meo" | "geo" | string;
    identityVersion?: string;
  };
  groundStationReference?: {
    groundStationId: string;
    referenceKind:
      | "source-authority-coordinate"
      | "viewer-owned-projection"
      | "operator-family-anchor";
    coordinateFrame: string;
    position: Record<string, number | null>;
    precisionPolicy: string;
    sourcePackageRef?: string;
  };
  orbitStateInputs: {
    stateKind: string;
    values: Record<string, number | string | null>;
    covariance?: Record<string, number>;
    physicalParameters?: Record<string, number | string | null>;
  };
  units: Record<string, string>;
}
```

The adapter may reject inputs that omit required units, carry incompatible
frames, or mix source-truth coordinates with viewer-owned display anchors.

## Output Schema Expectations

The model output shape must state what the repo adapter can consume and what it
may project into existing viewer seams.

Required output areas:

| Output area | Required content |
| --- | --- |
| Position/velocity | Position vector, velocity vector when available, vector units, vector frame, sample time, and satellite identity. |
| Coverage/access windows | Window id, target satellite or ground station, start/stop time, time labels, access state, visibility/coverage rule, and owner-defined thresholds. |
| Uncertainty/tolerance fields | Position, velocity, timing, access-window, and frame-conversion uncertainty or tolerance fields. |
| Frame/time labels | Machine-readable labels for output frame, time system, epoch id, sample timestamp, and any conversion already applied by the model. |

Pseudo-shape:

```ts
interface ItriOrbitModelOutputContract {
  samples: ReadonlyArray<{
    satelliteId: string;
    sampleTime: string;
    timeSystem: string;
    epochId: string;
    position: {
      frame: string;
      units: "meters" | string;
      x: number;
      y: number;
      z: number;
    };
    velocity?: {
      frame: string;
      units: "meters-per-second" | string;
      x: number;
      y: number;
      z: number;
    };
    uncertainty?: ItriOrbitModelUncertainty;
  }>;
  accessWindows?: ReadonlyArray<{
    windowId: string;
    satelliteId: string;
    groundStationId?: string;
    startTime: string;
    stopTime: string;
    timeSystem: string;
    state: "visible" | "not-visible" | "covered" | "not-covered" | string;
    thresholdRef?: string;
    tolerance?: ItriOrbitModelTolerance;
  }>;
  frameTimeLabels: {
    outputFrame: string;
    timeSystem: string;
    epochId: string;
    conversionApplied?: string;
  };
}

interface ItriOrbitModelUncertainty {
  positionMeters?: number;
  velocityMetersPerSecond?: number;
  timingSeconds?: number;
  covarianceRef?: string;
  notes?: string;
}

interface ItriOrbitModelTolerance {
  positionMeters?: number;
  velocityMetersPerSecond?: number;
  timingSeconds?: number;
  accessWindowSeconds?: number;
  angularDegrees?: number;
}
```

Repo-facing projection into the existing `satellite-overlay` sample path is
allowed only after the package defines a trustworthy conversion into the
repo-facing frame and units. The public satellite overlay contract remains
plain data and must not expose model runtime classes.

## Validation Vector Requirements

The authority package must include validation vectors before implementation
planning starts. Each vector must be retained or referenced according to the
package redistribution policy.

Required fields:

| Field | Required rule |
| --- | --- |
| `caseId` | Stable reference case id. |
| `casePurpose` | Scenario covered by the vector, such as LEO sample propagation, MEO access window, GEO near-fixed sample, frame conversion, or ground-station access. |
| `input` | Complete model input object or a checksum/reference to a retained authority input file. |
| `expectedOutput` | Expected samples, windows, or aggregate outputs from the owner-approved model run. |
| `tolerances` | Numeric tolerances for position, velocity, timing, access windows, and any comparison-specific values. |
| `comparisonMethod` | Exact comparison rule, including interpolation, rounding, frame conversion, sample matching, and pass/fail aggregation. |
| `failureHandling` | Required behavior for missing fields, out-of-tolerance values, model execution failure, redacted data, and reviewer escalation. |

Validation vectors must cover at least:

- one sample for each model-supported orbit class needed by the accepted scope;
- at least one ground-station access or coverage-window case if the model is
  expected to produce access windows;
- at least one frame/time conversion boundary case;
- negative cases for missing package metadata, unsupported units, and
  incompatible frame/time labels.

Failure handling must default to a blocked or failed validation-vector review.
The adapter must not widen tolerances, substitute public TLE output, or convert
a missing authority vector into a pass verdict.

## Adapter Boundary

The repo adapter may transform only the repo-facing envelope and declared
projection layers. It may:

- validate required metadata, schema fields, units, frames, and time labels;
- map owner-approved output samples into plain repo-facing satellite samples;
- convert units only when the package declares the source and target units;
- convert coordinate frames only when the package explicitly assigns that
  conversion to the repo adapter or provides an owner-approved conversion
  reference;
- attach package lineage and nonclaim fields to projected artifacts;
- reject or quarantine package records that are missing required authority
  fields.

The model owner must retain ownership of:

- propagation equations, numerical methods, approximations, and model constants;
- satellite catalog identity and model-specific object identity rules;
- authoritative coordinate-frame definitions and time-system rules;
- physical or environmental inputs that change propagation behavior;
- coverage/access thresholds and semantics;
- validation-vector expected outputs and tolerances;
- claims about equivalence, calibration, or authority acceptance.

The adapter must not infer model behavior from current CelesTrak/SGP4 code
paths, Phase 7.1 public-TLE evidence, M8A-V4 display-context actors, or
synthetic fallback fixtures.

## Public TLE Fallback Boundary

Public TLE data, including CelesTrak or other first-party public catalogs, may
remain valid for bounded public profiles when source lineage, access date,
license/use notes, and nonclaims are retained.

Public TLE material may support:

- bounded LEO/MEO/GEO viewer profiles;
- scale and performance smokes for public-profile paths;
- source-lineaged public fixtures;
- method context for adapter parsing and projection shape;
- comparison baselines labeled as public-profile output.

Public TLE material must not be treated as:

- the customer self-developed model package;
- owner-approved propagation-method equivalence;
- a substitute for customer validation vectors;
- authority evidence for F-01 model adoption;
- measured traffic, physical testbed, DUT, NAT, tunnel, active gateway, active
  path, or radio-layer handover truth.

If a future owner explicitly accepts a public TLE source as authority for a
bounded scope, that acceptance must be recorded as a separate authority decision
with package metadata and limitations. It still must not be silently promoted
to the customer self-developed model lane.

## Synthetic Fallback Boundary

Synthetic fallback rules are defined by S11 in
[itri-synthetic-fallback-fixtures.md](./itri-synthetic-fallback-fixtures.md).
For F-01, synthetic artifacts are limited to adapter-envelope shape rehearsal,
timestamp/frame/tolerance placeholder records, negative missing-package cases,
and renderer placeholder samples that are visibly labeled synthetic.

Any synthetic F-01 record must carry the S11 maximum claim:

`F-01 adapter/schema readiness only; no orbital truth.`

Synthetic fallback artifacts must be retired, quarantined, or reclassified when
customer supplies the model package, schema, validation vectors, tolerances,
redistribution policy, or written rejection of the synthetic adapter shape.

## Forbidden Claims

Future docs, code comments, UI labels, validation summaries, commits, and
acceptance rows must not state or imply that this intake contract itself proves:

- F-01 authority completion;
- customer model adoption by runtime code;
- model equivalence between public TLE output and customer-owned propagation;
- measured traffic or physical testbed truth;
- DUT, NAT, tunnel, active gateway, active path, or radio-layer pass verdicts;
- complete customer acceptance;
- exact serving-satellite identity or gateway assignment;
- native radio-layer handover behavior.

Allowed wording:

- `F-01 authority intake contract`;
- `adapter planning boundary`;
- `external authority package required`;
- `bounded public-TLE profile`;
- `synthetic adapter/schema readiness`;
- `owner-approved validation vectors required`;
- `model package not present in this repo`.

## Acceptance Status Fields

Any future package manifest, review note, or projected artifact produced under
this contract must carry machine-readable status fields. These fields must
distinguish contract readiness from model authority and runtime implementation.

```ts
interface ItriOrbitModelIntakeStatus {
  contractStatus:
    | "docs-only-intake-contract"
    | "superseded-by-later-contract";
  authorityPackageStatus:
    | "not-received"
    | "received-in-review"
    | "metadata-complete"
    | "schema-complete"
    | "vectors-complete"
    | "blocked-missing-authority"
    | "rejected-by-reviewer";
  adapterPlanningStatus:
    | "not-started"
    | "blocked-on-package"
    | "ready-for-design-review"
    | "design-review-only";
  implementationStatus:
    | "not-authorized"
    | "separate-slice-required"
    | "implemented-by-later-slice";
  acceptanceLimitations: ReadonlyArray<string>;
  nonClaims: ItriOrbitModelIntakeNonClaims;
}

interface ItriOrbitModelIntakeNonClaims {
  modelPackagePresentInRepo: false;
  runtimeAdapterImplementedByThisContract: false;
  publicTleSubstitutesForItriModel: false;
  syntheticDataProvidesOrbitalTruth: false;
  measuredTrafficTruth: false;
  externalStackVerdict: false;
  fullItriAcceptance: false;
}
```

For this docs-only contract, the status is:

```json
{
  "contractStatus": "docs-only-intake-contract",
  "authorityPackageStatus": "not-received",
  "adapterPlanningStatus": "blocked-on-package",
  "implementationStatus": "not-authorized",
  "acceptanceLimitations": [
    "customer model package is not present in this repo",
    "owner-approved validation vectors are not retained in this repo",
    "public TLE profiles and synthetic fallback rules remain separate boundaries"
  ],
  "nonClaims": {
    "modelPackagePresentInRepo": false,
    "runtimeAdapterImplementedByThisContract": false,
    "publicTleSubstitutesForItriModel": false,
    "syntheticDataProvidesOrbitalTruth": false,
    "measuredTrafficTruth": false,
    "externalStackVerdict": false,
    "fullItriAcceptance": false
  }
}
```

## Intake Review Checklist

Before any later code task cites this contract as its entry condition, a
reviewer must confirm:

1. `packageId`, `owner`, `receivedAt`, `redistributionPolicy`,
   `licenseUseNotes`, and `reviewer` are present.
2. `modelName`, `modelVersion`, `propagationMethod`, `coordinateFrames`,
   `timeSystem`, and `epochRules` are present and internally consistent.
3. Input fields include scenario time, satellite identity, ground station
   reference when needed, orbit state inputs, and units.
4. Output fields include position/velocity, access or coverage windows when
   needed, uncertainty/tolerance fields, and frame/time labels.
5. Validation vectors include reference cases, expected outputs, tolerances,
   comparison method, and failure handling.
6. Redistribution policy allows the planned adapter review or projection.
7. Public-TLE and synthetic fallback boundaries remain separate from the customer
   model lane.
8. Status and nonclaim fields are present and machine-readable.

If any checklist item fails, the result is an intake gap and the next action is
an owner request or review note, not implementation.
