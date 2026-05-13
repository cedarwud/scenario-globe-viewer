# ITRI Public Standards Profile Contract

Date: 2026-05-13

Status: docs-only S4-B data contract for a bounded public standards profile.
This document defines the record/schema shape for F-17/P-01/P-02/P-03. It does
not authorize runtime implementation, test changes, package changes, retained
output evidence, or checked-in fixture JSON files.

Related roadmap:
[../sdd/itri-requirement-completion-roadmap.md](../sdd/itri-requirement-completion-roadmap.md).

Source-lineage input:
[itri-public-standards-source-classification.md](./itri-public-standards-source-classification.md).

Related contracts and plans:

- [physical-input.md](./physical-input.md)
- [itri-synthetic-fallback-fixtures.md](./itri-synthetic-fallback-fixtures.md)
- [../sdd/phase-6-plus-requirement-centered-plan.md](../sdd/phase-6-plus-requirement-centered-plan.md)

## Purpose

This contract defines the bounded public standards profile record that may be
used to describe source-lineaged public standards selections for:

- F-17 rain-attenuation impact display;
- P-01 antenna parameters;
- P-02 rain attenuation / rainy-condition attenuation;
- P-03 ITU-related factors.

The profile is a Tier 2 public/open standards artifact. It may record official
public recommendation lineage, selected profile assumptions, validation-vector
requests, and review status. It does not convert the current Phase 6.5 bounded
proxy physical-input seam into calibrated standards behavior.

## Source Boundary

This S4-B profile consumes S4-A source classification as source-lineage input.
The only standards source IDs allowed at profile creation time are the S4-A
`Public authority candidate` IDs:

| Source id | Requirement mapping | Default S4-B use |
| --- | --- | --- |
| `S4A-ITU-P618` | F-17, P-02, P-03 | Core rain-attenuation propagation candidate. |
| `S4A-ITU-P837` | P-02, P-03 | Rain-rate source candidate. |
| `S4A-ITU-P838` | P-02, P-03 | Rain-specific attenuation candidate. |
| `S4A-ITU-P676` | F-17, P-03 | Atmospheric-gas factor candidate when selected. |
| `S4A-ITU-P839` | P-02, P-03 | Rain-height source candidate. |
| `S4A-ITU-P840` | F-17, P-03 | Cloud/fog attenuation candidate when selected. |
| `S4A-ITU-S465` | P-01, P-03 | Earth-station antenna-pattern candidate. |
| `S4A-ITU-S580` | P-01, P-03 | GEO earth-station antenna design-objective candidate. |
| `S4A-ITU-S1528` | P-01, P-03 | Non-GSO satellite antenna-pattern candidate when selected. |

S4-A method/context source IDs may be referenced only in `licenseUseNotes` or
`sourceLineage.notes`; they must not appear as selected physical profile
recommendations.

## Profile Record

The profile must be a plain-data record. Field names below are normative for
future manifests, fixtures, or implementation slices, but this document creates
no such artifacts.

```ts
type ItriPublicStandardsRequirement = "F-17" | "P-01" | "P-02" | "P-03";

type ItriPublicStandardsSourceTier =
  | "tier-2-public-authority-candidate"
  | "tier-1-itri-or-official-authority";

type ItriPublicStandardsApproximationLevel =
  | "index-only"
  | "parameter-profile"
  | "reference-vector-ready"
  | "implementation-ready-after-authority-review";

type ItriPublicStandardsAcceptanceStatus =
  | "bounded-public-profile-only"
  | "pending-itri-vgroup-review"
  | "accepted-by-itri-vgroup-with-retained-record"
  | "superseded-by-itri-authority"
  | "rejected-by-itri-vgroup";

interface ItriSelectedRecommendation {
  sourceId:
    | "S4A-ITU-P618"
    | "S4A-ITU-P837"
    | "S4A-ITU-P838"
    | "S4A-ITU-P676"
    | "S4A-ITU-P839"
    | "S4A-ITU-P840"
    | "S4A-ITU-S465"
    | "S4A-ITU-S580"
    | "S4A-ITU-S1528";
  recommendationId: string;
  versionId: string;
  url: string;
  accessDate: string;
  mappedRequirements: ReadonlyArray<ItriPublicStandardsRequirement>;
  selectedRole: string;
  status: "candidate" | "selected-for-bounded-profile" | "authority-selected";
  notes: ReadonlyArray<string>;
}

interface ItriPublicStandardsSourceLineage {
  classificationDoc: "itri-public-standards-source-classification.md";
  classificationDate: string;
  sourceIds: ReadonlyArray<ItriSelectedRecommendation["sourceId"]>;
  inheritedUseNotes: ReadonlyArray<string>;
  notes: ReadonlyArray<string>;
}

interface ItriPublicStandardsProfile {
  schemaVersion: "itri.public-standards-profile.v1";
  profileId: string;
  profileDate: string;
  coveredRequirements: ReadonlyArray<ItriPublicStandardsRequirement>;
  profileScope: string;
  sourceTier: ItriPublicStandardsSourceTier;
  selectedRecommendations: ReadonlyArray<ItriSelectedRecommendation>;
  sourceLineage: ItriPublicStandardsSourceLineage;
  accessDates: Record<string, string>;
  versionIds: Record<string, string>;
  licenseUseNotes: ReadonlyArray<string>;

  frequencyBands: ReadonlyArray<ItriFrequencyBandProfile>;
  geography: ItriGeographyProfile;
  rainRateSource: ItriSourceBoundSelection;
  rainHeightSource: ItriSourceBoundSelection;
  pathGeometry: ItriPathGeometryProfile;
  elevationAngle: ItriAngleProfile;
  polarization: ItriPolarizationProfile;
  antennaClass: ItriAntennaClassProfile;
  pointingAssumptions: ReadonlyArray<string>;
  outputUnits: ItriOutputUnitsProfile;
  approximationLevel: ItriPublicStandardsApproximationLevel;

  validationVectors: ReadonlyArray<ItriValidationVectorRef>;
  tolerances: ReadonlyArray<ItriToleranceRef>;
  reviewer: ItriProfileReviewer;
  acceptanceStatus: ItriPublicStandardsAcceptanceStatus;
  nonClaims: ItriPublicStandardsProfileNonClaims;
  replacementRules: ReadonlyArray<ItriPublicStandardsReplacementRule>;
}
```

## Required Metadata Fields

| Field | Required rule |
| --- | --- |
| `profileId` | Stable repo-local identifier, for example `itri-f17-p01-p02-p03-public-standards-v1`. |
| `profileDate` | ISO-8601 date for the profile record. |
| `coveredRequirements` | Must include at least one of `F-17`, `P-01`, `P-02`, or `P-03`; the combined profile should include all four unless deliberately split. |
| `profileScope` | Human-readable bounded scope. It must name the profile as public standards lineage, not ITRI/V-group authority truth. |
| `sourceTier` | Defaults to `tier-2-public-authority-candidate`. Use `tier-1-itri-or-official-authority` only when a retained authority record selects the parameters or vectors. |
| `selectedRecommendations` | Recommendation records selected from S4-A public authority candidate source IDs only. |
| `sourceLineage` | Pointer back to S4-A classification date, source IDs, inherited use notes, and any review notes. |
| `accessDates` | Map from source ID to retained access date. Initial S4-A sources use `2026-05-13`. |
| `versionIds` | Map from source ID to recommendation/version ID, for example `ITU-R P.618-14 (08/2023)`. |
| `licenseUseNotes` | Citation and use boundary notes inherited from S4-A. Do not copy ITU method text, equations, tables, gridded components, or recommendation prose into data payloads without later license and authority review. |

## Physical/Profile Fields

These fields define selected assumptions. They are descriptive until a later
authorized implementation or retained authority package consumes them.

```ts
interface ItriFrequencyBandProfile {
  bandId: string;
  label: string;
  uplinkFrequencyGHz?: number;
  downlinkFrequencyGHz?: number;
  centerFrequencyGHz?: number;
  bandwidthMHz?: number;
  sourceIds: ReadonlyArray<ItriSelectedRecommendation["sourceId"]>;
  notes: ReadonlyArray<string>;
}

interface ItriGeographyProfile {
  geographyId: string;
  label: string;
  latitudeDeg?: number;
  longitudeDeg?: number;
  region?: string;
  sourceIds: ReadonlyArray<ItriSelectedRecommendation["sourceId"]>;
  notes: ReadonlyArray<string>;
}

interface ItriSourceBoundSelection {
  sourceId: ItriSelectedRecommendation["sourceId"] | "itri-supplied";
  label: string;
  versionId?: string;
  parameterIds: ReadonlyArray<string>;
  notes: ReadonlyArray<string>;
}

interface ItriPathGeometryProfile {
  geometryId: string;
  pathRole: "earth-to-space" | "space-to-earth" | "slant-path" | "other";
  orbitClass?: "leo" | "meo" | "geo" | "mixed";
  pathLengthKm?: number;
  terminalAltitudeM?: number;
  satelliteAltitudeKm?: number;
  notes: ReadonlyArray<string>;
}

interface ItriAngleProfile {
  valueDeg?: number;
  rangeDeg?: { min: number; max: number };
  basis: "fixed-profile-value" | "scenario-derived" | "itri-supplied" | "not-selected";
  notes: ReadonlyArray<string>;
}

interface ItriPolarizationProfile {
  value:
    | "horizontal"
    | "vertical"
    | "circular-left"
    | "circular-right"
    | "dual"
    | "not-selected"
    | string;
  basis: "profile-selected" | "scenario-derived" | "itri-supplied" | "not-selected";
  notes: ReadonlyArray<string>;
}

interface ItriAntennaClassProfile {
  classId: string;
  terminalRole: "earth-station" | "satellite" | "user-terminal" | "gateway" | "other";
  orbitApplicability?: ReadonlyArray<"leo" | "meo" | "geo">;
  selectedPatternSourceIds: ReadonlyArray<ItriSelectedRecommendation["sourceId"]>;
  gainDbi?: number;
  diameterM?: number;
  notes: ReadonlyArray<string>;
}

interface ItriOutputUnitsProfile {
  rainAttenuation?: "dB";
  gaseousAttenuation?: "dB";
  cloudFogAttenuation?: "dB";
  antennaGain?: "dBi";
  decisionImpact?: "bounded-metric-delta" | "not-derived";
  notes: ReadonlyArray<string>;
}
```

Field-specific rules:

- `frequencyBands` must not be inferred from current bounded proxy metric
  names. A band needs a source-lineaged selection or an ITRI/V-group supplied
  value.
- `geography`, `rainRateSource`, and `rainHeightSource` must name whether they
  come from selected public recommendations, public components, or ITRI/V-group
  authority input.
- `pathGeometry`, `elevationAngle`, `polarization`, `antennaClass`, and
  `pointingAssumptions` must remain explicit even when unknown. Use
  `not-selected` or notes rather than silent defaults.
- `outputUnits` may name target units, but no conversion, formula, lookup, or
  numeric standards-derived behavior is implemented by this docs-only slice.
- `approximationLevel` starts at `index-only` until selected parameters,
  permitted source components, validation vectors, and tolerances exist.

## Validation Fields

Validation fields describe the review envelope for a future profile. They do
not create validation evidence.

```ts
interface ItriValidationVectorRef {
  vectorId: string;
  source: "itri-supplied" | "public-standards-example" | "not-yet-supplied";
  coveredRequirements: ReadonlyArray<ItriPublicStandardsRequirement>;
  inputSummary: string;
  expectedOutputSummary?: string;
  retainedPath?: string;
  notes: ReadonlyArray<string>;
}

interface ItriToleranceRef {
  toleranceId: string;
  appliesTo: string;
  toleranceValue?: number;
  toleranceUnit?: string;
  source: "itri-supplied" | "public-profile-selected" | "not-yet-supplied";
  notes: ReadonlyArray<string>;
}

interface ItriProfileReviewer {
  name?: string;
  role: "itri-vgroup-owner" | "repo-maintainer" | "external-authority-reviewer" | "unassigned";
  reviewedAt?: string;
  notes: ReadonlyArray<string>;
}
```

Required validation rules:

- `validationVectors` must be present. If no vectors exist, include a single
  `not-yet-supplied` record that names the missing vector class.
- `tolerances` must be present. If no tolerance authority exists, include a
  `not-yet-supplied` record rather than inventing an allowed error.
- `reviewer.role` may be `repo-maintainer` for bounded public profile review.
  Authority escalation requires `itri-vgroup-owner` or another retained
  authority reviewer role.
- `acceptanceStatus` must remain `bounded-public-profile-only` unless a
  retained ITRI/V-group or official authority record explicitly changes it.

## Nonclaim Fields

The profile must carry machine-readable nonclaims that separate bounded public
standards lineage from ITRI/V-group authority truth.

```ts
interface ItriPublicStandardsProfileNonClaims {
  itriVGroupAuthorityTruth: false;
  selectedStandardsImplyItriVGroupAcceptance: false;
  numericStandardsDerivedBehaviorImplemented: false;
  calibratedPhysicalAuthorityTruth: false;
  measuredTrafficTruth: false;
  externalValidationVerdict: false;
  dutNatTunnelVerdict: false;
  nativeRadioFrequencyHandoverVerdict: false;
  activeSatelliteGatewayOrPathTruth: false;
  currentBoundedProxyValuesAreStandardsDerived: false;
  syntheticFixtureTruth: false;
}
```

Each field value must be literal `false`. A future profile cannot omit a field
to imply unknown, deferred, or consumer-dependent truth.

## Absolute Rules

- This docs-only slice implements no numeric standards-derived behavior. It
  defines record names, review gates, and source-lineage requirements only.
- Selected public standards do not imply ITRI/V-group acceptance. Selection
  means the source is eligible for a bounded public profile until a retained
  authority record says otherwise.
- The current Phase 6.5 `physical-input` bounded proxy values are not
  standards-derived merely because this profile schema exists.
- S4-A source IDs are lineage inputs, not formula imports or component-data
  imports.
- Synthetic fallback fixtures remain governed by
  [itri-synthetic-fallback-fixtures.md](./itri-synthetic-fallback-fixtures.md).
  They must not be merged into this Tier 2 profile as if they were public
  standards evidence.
- A profile may support repo-owned readiness, schema, review, or bounded public
  profile status only. Any stronger authority claim needs retained owner or
  official authority evidence.

## Replacement And Escalation Rules

```ts
interface ItriPublicStandardsReplacementRule {
  trigger:
    | "itri-official-parameters-arrive"
    | "itri-validation-vectors-arrive"
    | "itri-tolerances-arrive"
    | "itri-rejects-public-profile"
    | "recommendation-version-superseded"
    | "license-or-use-boundary-changes";
  requiredAction: string;
  profileStatusAfterAction:
    | "retained-as-bounded-public-history"
    | "superseded-by-itri-authority"
    | "rejected-by-itri-vgroup"
    | "needs-reclassification";
}
```

Replacement and escalation are mandatory when any of these events occurs:

- ITRI/V-group supplies official parameters for bands, geography, rain-rate
  source, rain height, path geometry, elevation, polarization, antenna class,
  output units, or approximation level.
- ITRI/V-group supplies validation vectors, tolerances, reviewer acceptance
  records, or rejection records.
- A selected ITU recommendation version is superseded or the retained public
  page status changes.
- License, component-use, redistribution, or quotation rules change.

Required actions:

1. Freeze the current profile record as bounded public history, or mark it as
   rejected if the owner rejects the profile.
2. Open a new authority intake or profile revision that records the supplied
   parameters, vectors, tolerances, reviewer, and retained evidence path.
3. Keep S4-A source lineage visible if the official authority still uses the
   same public recommendations.
4. Remove or quarantine any synthetic fallback fixtures that overlap the
   accepted official parameters or vectors.
5. Do not update runtime behavior until a later implementation slice is
   explicitly authorized and validated.

## Minimum Validator Shape

A future JSON-Schema-style validator should enforce at least these constraints:

```json
{
  "required": [
    "schemaVersion",
    "profileId",
    "profileDate",
    "coveredRequirements",
    "profileScope",
    "sourceTier",
    "selectedRecommendations",
    "sourceLineage",
    "accessDates",
    "versionIds",
    "licenseUseNotes",
    "frequencyBands",
    "geography",
    "rainRateSource",
    "rainHeightSource",
    "pathGeometry",
    "elevationAngle",
    "polarization",
    "antennaClass",
    "pointingAssumptions",
    "outputUnits",
    "approximationLevel",
    "validationVectors",
    "tolerances",
    "reviewer",
    "acceptanceStatus",
    "nonClaims",
    "replacementRules"
  ],
  "properties": {
    "schemaVersion": { "const": "itri.public-standards-profile.v1" },
    "sourceTier": {
      "enum": [
        "tier-2-public-authority-candidate",
        "tier-1-itri-or-official-authority"
      ]
    },
    "nonClaims": {
      "required": [
        "itriVGroupAuthorityTruth",
        "selectedStandardsImplyItriVGroupAcceptance",
        "numericStandardsDerivedBehaviorImplemented",
        "calibratedPhysicalAuthorityTruth",
        "measuredTrafficTruth",
        "externalValidationVerdict",
        "dutNatTunnelVerdict",
        "nativeRadioFrequencyHandoverVerdict",
        "activeSatelliteGatewayOrPathTruth",
        "currentBoundedProxyValuesAreStandardsDerived",
        "syntheticFixtureTruth"
      ],
      "properties": {
        "itriVGroupAuthorityTruth": { "const": false },
        "selectedStandardsImplyItriVGroupAcceptance": { "const": false },
        "numericStandardsDerivedBehaviorImplemented": { "const": false },
        "calibratedPhysicalAuthorityTruth": { "const": false },
        "measuredTrafficTruth": { "const": false },
        "externalValidationVerdict": { "const": false },
        "dutNatTunnelVerdict": { "const": false },
        "nativeRadioFrequencyHandoverVerdict": { "const": false },
        "activeSatelliteGatewayOrPathTruth": { "const": false },
        "currentBoundedProxyValuesAreStandardsDerived": { "const": false },
        "syntheticFixtureTruth": { "const": false }
      }
    }
  }
}
```

## Close-Out Scope

This S4-B contract closes only the docs-only public standards profile schema
for F-17/P-01/P-02/P-03. It adds no runtime code, package metadata, tests,
fixture files, retained validation output, or implementation evidence.
