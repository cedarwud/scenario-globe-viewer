# customer Synthetic Fallback Fixture Contract

Date: 2026-05-13

Status: docs-only data contract for customer roadmap S11. This document defines
fixture rules only. It does not authorize runtime implementation, test changes,
package changes, retained output evidence, or checked-in JSON fixture files.

Related roadmap:
[../sdd/itri-requirement-completion-roadmap.md](../sdd/itri-requirement-completion-roadmap.md).

Related evidence plans:

- [../sdd/itri-f07-f09-measured-traffic-evidence-package-plan.md](../sdd/itri-f07-f09-measured-traffic-evidence-package-plan.md)
- [../sdd/itri-v02-v06-external-validation-readiness-package.md](../sdd/itri-v02-v06-external-validation-readiness-package.md)
- [../sdd/m8a-v4.13-multi-orbit-scale-runtime-plan.md](../sdd/m8a-v4.13-multi-orbit-scale-runtime-plan.md)
- [../sdd/m8a-v3-d03-presentation-polish-plan.md](../sdd/m8a-v3-d03-presentation-polish-plan.md)

## Purpose

This contract defines the Tier 3 synthetic fallback fixture boundary for customer
residual lanes when Tier 1 authority evidence and Tier 2 public/open substitute
sources are unavailable or rejected for the bounded deliverable.

Synthetic fixtures may support:

- UI development;
- schema and parser rehearsal;
- smoke selectors;
- negative and gap-package rehearsal;
- deterministic demos that visibly carry synthetic provenance.

Synthetic fixtures must not support authority closure, physical truth,
measurement truth, or external validation verdicts.

## Required Metadata

Every synthetic fallback fixture, fixture family, or fixture manifest must carry
this metadata before any future runtime or test consumer is allowed to read it:

| Field | Required rule |
| --- | --- |
| `fixtureId` | Stable repo-local identifier. Use a lane prefix, for example `itri-f07-synth-ping-shape-v1`. |
| `generatedAt` | ISO-8601 generation timestamp. Include timezone or UTC suffix. |
| `sourceTier` | Must be `tier-3-synthetic`. Do not use Tier 1 or Tier 2 labels for generated fallback data. |
| `syntheticProvenance` | Object that names generator, seed, algorithm/profile, input assumptions, and reviewer notes. |
| `intendedConsumers` | Bounded consumers such as UI preview, parser shape test, schema rehearsal, or gap-package smoke. |
| `forbiddenConsumers` | Consumers that must not read the fixture, such as authority verdicts, acceptance reports, measured evidence packages, external package verdicts, or runtime paths that imply live traffic truth. |
| `maximumClaim` | Highest claim allowed. Default: `deterministic synthetic readiness fixture for UI/schema/parser rehearsal`. |
| `knownGaps` | Explicit missing authority, missing source, missing calibration, or missing testbed facts. |
| `replacementTrigger` | Event that retires the synthetic fixture, such as customer authority package arrival, public profile approval, retained external run, selected standards parameters, or owner rejection. |
| `nonClaims` | Machine-readable nonclaim fields described below. |

`syntheticProvenance` must be specific enough to regenerate or review the
fixture shape without mistaking it for observed project evidence. At minimum it
records:

- `kind`: `deterministic-generated`, `hand-authored-shape`, or
  `simulation-placeholder`;
- `generator`: script, manual process, or document section that defines the
  generation method;
- `seed`: deterministic seed when generated, or `null` with a note for
  hand-authored shape examples;
- `inputAssumptions`: bounded assumptions used to fill fields;
- `lineageNotes`: why Tier 1 and Tier 2 material did not supply the fixture;
- `reviewedBy`: owner or reviewer role when known.

## Nonclaim Fields

Every fixture must expose explicit nonclaims. These fields are required even
when the consuming surface also renders human-readable disclaimers:

```ts
interface ItriSyntheticFixtureNonClaims {
  externalValidationTruth: false;
  measuredTrafficTruth: false;
  physicalLayerTruth: false;
  itriOrbitModelIntegration: false;
  dutNatTunnelPassStatus: false;
  nativeRadioFrequencyHandover: false;
  fullItriAcceptance: false;
  activeSatelliteGatewayOrPathTruth: false;
  standardsBackedPhysicalTruth: false;
}
```

The values must be literal `false`. A fixture cannot omit a field to imply that
the claim is unknown, deferred, or consumer-dependent.

## Absolute Closure Boundary

Synthetic fixtures cannot be cited as closure evidence for:

- external validation truth;
- measured traffic truth;
- customer orbit-model integration;
- DUT, NAT, or tunnel pass status;
- native radio-frequency (RF) handover;
- full customer acceptance;
- physical-layer truth;
- active satellite, gateway, or path truth;
- standards-backed physical calibration unless a later public profile or customer
  authority package replaces the synthetic fixture.

If a future consumer needs one of these claims, the consumer must use Tier 1
authority evidence or an approved Tier 2 bounded public profile, not this
synthetic fallback boundary.

## Lane-Specific Fixture Categories

### F-01 Orbit-Model Integration

Allowed synthetic categories:

- adapter-envelope shape fixture with input/output field names only;
- timestamp, frame, and tolerance placeholder records for schema rehearsal;
- negative fixtures for missing customer model package, missing vectors, or missing
  redistribution policy;
- renderer placeholder orbit samples that are visibly labeled synthetic.

Required gaps:

- no customer-supplied orbit model package;
- no accepted propagator, reference frame, time basis, vectors, or tolerance;
- no owner sign-off on equivalence.

Forbidden consumers:

- F-01 authority closure;
- acceptance-report rows that imply customer model adoption;
- multi-orbit runtime evidence gates that require real public TLE or customer model
  artifacts.

Maximum claim:

`F-01 adapter/schema readiness only; no orbital truth.`

Replacement trigger:

Retire or quarantine the fixture when customer supplies the model package, schema,
validation vectors, tolerances, redistribution policy, or written owner
rejection of the synthetic adapter shape.

### F-07 / F-08 / F-09 Measured Traffic

Allowed synthetic categories:

- `ping` log shape examples with deterministic timestamps and sample rows;
- statistics table examples for latency, jitter, loss, duration, and sample
  count field coverage;
- `iperf3`-style throughput JSON shape examples that omit pass verdicts;
- handover-window continuity examples for parser and chart behavior;
- negative fixtures for missing topology, missing endpoint identity, missing
  raw logs, missing redaction notes, or missing thresholds.

Required gaps:

- no retained raw `ping` or `iperf3` project logs;
- no approved topology, endpoints, direction, duration, or thresholds;
- no packet path evidence or testbed owner verdict.

Forbidden consumers:

- F-07/F-08/F-09 measured verdicts;
- package summaries under `output/validation/external-f07-f09/`;
- acceptance text that treats deterministic samples as retained traffic.

Maximum claim:

`F-07/F-08/F-09 parser, chart, and review-manifest readiness only.`

Replacement trigger:

Retire the fixture when a retained measured-traffic package with raw logs,
topology, thresholds, and review notes exists for the same lane.

### F-12 Decision Switching

Allowed synthetic categories:

- deterministic candidate metric rows for latency, jitter, and network-speed
  style fields;
- tie-breaker and ranking examples;
- negative fixtures for missing threshold authority or missing rule semantics;
- replay-window examples that exercise decision-state transitions without live
  control.

Required gaps:

- no customer-approved threshold set;
- no accepted rule semantics;
- no trace proving that decisions affect external traffic or simulator state.

Forbidden consumers:

- authority decision-rule upgrades;
- live-control claims;
- measured-decision verdicts.

Maximum claim:

`F-12 deterministic decision-shape readiness over synthetic candidate metrics.`

Replacement trigger:

Retire the fixture when customer supplies thresholds, rule semantics, validation
traces, and the accepted relationship between measured fields and decision
inputs.

### F-17 / P-01 / P-02 / P-03 Physical Inputs

Allowed synthetic categories:

- rain-rate and rain-attenuation parameter grids for UI delta rehearsal;
- antenna gain, pattern, pointing, and band field-shape examples;
- ITU-style factor placeholders that name missing recommendation/version
  selections;
- negative fixtures for missing geography, frequency, polarization, elevation,
  approximation level, or validation vector;
- paired candidate examples that exercise the existing physical-input seam.

Required gaps:

- no selected ITU-R recommendations, versions, and parameter values from the
  owner;
- no accepted antenna geometry, rain model, geography, path geometry, or
  validation vectors;
- no public standards profile approved for the exact bounded lane.

Forbidden consumers:

- standards-backed physical profile closure;
- calibration evidence;
- authority physical-layer verdicts.

Maximum claim:

`F-17/P-01/P-02/P-03 UI and physical-input schema readiness only.`

Replacement trigger:

Retire or downgrade the fixture when an customer/V-group owner selects standards,
versions, parameters, approximation level, and validation vectors, or when a
bounded public standards profile is approved.

### V-02 Windows + WSL

Allowed synthetic categories:

- environment inventory shape examples;
- command transcript schema examples;
- interface and route table field-shape examples;
- negative fixtures for missing WSL mode, missing tool inventory, or missing
  traffic transcript.

Required gaps:

- no retained external host run;
- no command transcript from the intended Windows + WSL setup;
- no successful traffic proof for that setup.

Forbidden consumers:

- V-02 pass verdicts;
- external package summaries;
- host compatibility acceptance.

Maximum claim:

`V-02 package-shape readiness only.`

Replacement trigger:

Retire the fixture when a retained V-02 package contains host details,
interfaces, routes, commands, tools, and traffic proof.

### V-03 Tunnel / Bridge

Allowed synthetic categories:

- tunnel endpoint and bridge-process config shape examples;
- bridge log shape examples;
- packet-path placeholder rows;
- negative fixtures for missing endpoint config, missing bridge logs, or missing
  traffic crossing the expected path.

Required gaps:

- no real tunnel or bridge configuration;
- no bridge process logs;
- no retained traffic proof across the expected path.

Forbidden consumers:

- tunnel/bridge pass verdicts;
- external validation summaries;
- path-success copy.

Maximum claim:

`V-03 tunnel/bridge package-shape readiness only.`

Replacement trigger:

Retire the fixture when a retained external package includes configured
tunnel/bridge paths and traffic proof across those paths.

### V-04 NAT / ESTNeT / INET

Allowed synthetic categories:

- NAT table and route table shape examples;
- ESTNeT/INET scenario identity placeholders;
- gateway mapping placeholders;
- negative fixtures for missing route state, missing NAT rules, missing gateway
  mapping, or missing simulated-to-real traffic logs.

Required gaps:

- no authoritative ESTNeT/OMNeT++ scenario identity;
- no INET NAT/gateway mapping retained from a run;
- no host interface mapping or raw traffic logs.

Forbidden consumers:

- V-04 pass verdicts;
- NAT or gateway success claims;
- simulated-to-real traffic closure.

Maximum claim:

`V-04 NAT/ESTNeT/INET package-shape readiness only.`

Replacement trigger:

Retire the fixture when retained topology, NAT/routing state, gateway mapping,
raw traffic logs, and review notes exist for the intended run.

### V-05 Virtual DUT

Allowed synthetic categories:

- virtual DUT identity and testbench field-shape examples;
- DUT-facing interface and route shape examples;
- raw-log placeholder files represented in schema only;
- negative fixtures for missing image/version, missing traffic profile, missing
  command output, or missing verdict.

Required gaps:

- no virtual DUT identity or image from the owner;
- no testbench source/version/config;
- no raw DUT logs or output verdict.

Forbidden consumers:

- V-05 pass verdicts;
- DUT acceptance records;
- external package closure.

Maximum claim:

`V-05 virtual-DUT package-shape and negative-case readiness only.`

Replacement trigger:

Retire the fixture when a retained virtual DUT package contains DUT identity,
testbench input, command output, DUT logs, traffic result, and owner verdict.

### V-06 Physical DUT / Traffic Generator

Allowed synthetic categories:

- physical topology and cabling field-shape examples;
- traffic-generator profile shape examples;
- redaction-policy examples;
- lab-output schema examples;
- negative fixtures for missing DUT identity, missing profile, missing raw
  output, missing packet capture policy, or missing owner verdict.

Required gaps:

- no physical DUT or traffic-generator run artifacts;
- no retained topology/cabling/port mapping;
- no raw DUT, NE-ONE, packet capture, `ping`, or `iperf` outputs;
- no lab owner verdict.

Forbidden consumers:

- V-06 pass verdicts;
- physical lab acceptance;
- traffic-generator performance closure.

Maximum claim:

`V-06 physical-DUT and traffic-generator package-shape readiness only.`

Replacement trigger:

Retire the fixture when retained physical DUT or traffic-generator output,
topology, redaction notes, and owner verdict exist for the intended run.

## Pseudo-Schema

The following TypeScript shape is a validation example, not a runtime fixture:

```ts
type ItriSyntheticLane =
  | "F-01"
  | "F-07"
  | "F-08"
  | "F-09"
  | "F-12"
  | "F-17"
  | "P-01"
  | "P-02"
  | "P-03"
  | "V-02"
  | "V-03"
  | "V-04"
  | "V-05"
  | "V-06";

type ItriSyntheticSourceTier = "tier-3-synthetic";

type ItriSyntheticConsumer =
  | "ui-preview"
  | "schema-rehearsal"
  | "parser-shape-test"
  | "smoke-selector"
  | "negative-gap-rehearsal"
  | "demo-placeholder";

type ItriForbiddenConsumer =
  | "authority-verdict"
  | "acceptance-report-closure"
  | "measured-evidence-package"
  | "external-validation-verdict"
  | "physical-layer-verdict"
  | "runtime-live-traffic-claim";

interface ItriSyntheticProvenance {
  kind:
    | "deterministic-generated"
    | "hand-authored-shape"
    | "simulation-placeholder";
  generator: string;
  seed: string | null;
  inputAssumptions: ReadonlyArray<string>;
  lineageNotes: ReadonlyArray<string>;
  reviewedBy: string | null;
}

interface ItriSyntheticFallbackFixtureManifest {
  schemaVersion: "itri.synthetic-fallback-fixture.v1";
  fixtureId: string;
  lanes: ReadonlyArray<ItriSyntheticLane>;
  category: string;
  generatedAt: string;
  sourceTier: ItriSyntheticSourceTier;
  syntheticProvenance: ItriSyntheticProvenance;
  intendedConsumers: ReadonlyArray<ItriSyntheticConsumer>;
  forbiddenConsumers: ReadonlyArray<ItriForbiddenConsumer>;
  maximumClaim:
    | "deterministic synthetic readiness fixture for UI/schema/parser rehearsal"
    | string;
  knownGaps: ReadonlyArray<string>;
  replacementTrigger: string;
  nonClaims: ItriSyntheticFixtureNonClaims;
}
```

A JSON-Schema-style validator may enforce the same boundary with these minimum
constraints:

```json
{
  "required": [
    "schemaVersion",
    "fixtureId",
    "lanes",
    "category",
    "generatedAt",
    "sourceTier",
    "syntheticProvenance",
    "intendedConsumers",
    "forbiddenConsumers",
    "maximumClaim",
    "knownGaps",
    "replacementTrigger",
    "nonClaims"
  ],
  "properties": {
    "sourceTier": { "const": "tier-3-synthetic" },
    "nonClaims": {
      "required": [
        "externalValidationTruth",
        "measuredTrafficTruth",
        "physicalLayerTruth",
        "itriOrbitModelIntegration",
        "dutNatTunnelPassStatus",
        "nativeRadioFrequencyHandover",
        "fullItriAcceptance",
        "activeSatelliteGatewayOrPathTruth",
        "standardsBackedPhysicalTruth"
      ],
      "properties": {
        "externalValidationTruth": { "const": false },
        "measuredTrafficTruth": { "const": false },
        "physicalLayerTruth": { "const": false },
        "itriOrbitModelIntegration": { "const": false },
        "dutNatTunnelPassStatus": { "const": false },
        "nativeRadioFrequencyHandover": { "const": false },
        "fullItriAcceptance": { "const": false },
        "activeSatelliteGatewayOrPathTruth": { "const": false },
        "standardsBackedPhysicalTruth": { "const": false }
      }
    }
  }
}
```

Do not commit concrete JSON fixture files from this contract unless a later
slice explicitly authorizes fixture-file creation and names the target path.

## Review And Replacement Rules

Before a synthetic fixture is promoted to any consumer, a reviewer must confirm:

1. Tier 1 and Tier 2 status has been recorded for the lane.
2. Required metadata is present.
3. `sourceTier` is `tier-3-synthetic`.
4. `maximumClaim` does not exceed readiness, parser, schema, smoke, or demo
   placeholder use.
5. `forbiddenConsumers` blocks authority, external, measured, DUT/NAT/tunnel,
   physical, and acceptance consumers.
6. `nonClaims` fields are present and literal `false`.
7. `replacementTrigger` is actionable.

When replacement evidence arrives:

- mark the synthetic fixture as superseded or remove it from the consumer path;
- preserve its historical role only as a readiness artifact if needed;
- do not merge synthetic rows into retained measured or external packages;
- rerun edited-file claim scans and any slice-specific smoke scans.

## Smoke And Grep Scoping

This contract adopts the D-03 Section 8.1 scan lesson:

- Edited-file grep probes are the authoritative doc close-out check for this
  slice.
- Future runtime smokes must scan only the fixture file, manifest, or DOM
  subtree introduced or modified by the fixture-consuming slice.
- Do not scan the whole HUD, globe root, route root, panel root, or complete
  validation package when a slice changes only one fixture or one child element.
- If a scan hits a pre-existing negated disclaimer outside the changed surface,
  narrow the scan scope rather than weakening the nonclaim text.
- If a newly authored fixture disclaimer contains restricted wording inside a
  negation, record the hit as a scoped negation and keep the explicit nonclaim.
- Keep literal probe patterns in validation commands or task notes, not inside
  future fixture payloads, unless a reviewer explicitly accepts the negated
  nonclaim wording.

For this docs-only S11 slice, scan only the edited docs. No DOM smoke or output
evidence package is created by this contract.
