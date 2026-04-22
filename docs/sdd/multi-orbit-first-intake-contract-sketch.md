# Multi-Orbit First Intake Contract Sketch

Source note: this file is a planning-stage plain-data sketch for the first
real-world multi-orbit intake case. It is an example-only bridge between the
proposal and future contract work. Keep it synchronized by editing this repo
directly. Do not replace it with a symlink or hard link.

Related proposal: see
[multi-orbit-contract-adoption-proposal.md](./multi-orbit-contract-adoption-proposal.md).
Related checklist: see
[multi-orbit-first-intake-checklist.md](./multi-orbit-first-intake-checklist.md).
Upstream research authority: see
[../../../itri/multi-orbit/README.md](../../../itri/multi-orbit/README.md).
Related prep bridge: see
[../../../itri/multi-orbit/prep/viewer-contract-widening-proposal.md](../../../itri/multi-orbit/prep/viewer-contract-widening-proposal.md),
[../../../itri/multi-orbit/prep/endpoint-overlay-seed-draft.md](../../../itri/multi-orbit/prep/endpoint-overlay-seed-draft.md),
and
[../../../itri/multi-orbit/prep/seeds/oneweb-intelsat-geo-aviation.seed.json](../../../itri/multi-orbit/prep/seeds/oneweb-intelsat-geo-aviation.seed.json).

## Purpose

This document gives one concrete question-shaped answer:

If the repo accepts the first real-world multi-orbit case, what might the
future plain-data payloads look like **without** starting runtime code yet?

This is a sketch only. It is **not** an accepted contract.

## First Intake Case

- `OneWeb LEO + Intelsat GEO aviation`
- `commercial_aviation`
- `service-layer switching`
- `isNativeRfHandover = false`

## 1. Sketch: Scenario Definition

This sketch assumes the minimal `context` widening proposed in the companion
planning doc.

It also assumes `truthBoundaryLabel` is a closed enum with one currently
accepted value:

- `real-pairing-bounded-runtime-projection`

```ts
const scenarioDefinition = {
  id: "multi-orbit-oneweb-intelsat-aviation-prerecorded",
  label: "OneWeb + Intelsat GEO Aviation",
  kind: "prerecorded",
  presentation: {
    presetKey: "global"
  },
  time: {
    mode: "prerecorded"
  },
  context: {
    vertical: "commercial_aviation",
    truthBoundaryLabel: "real-pairing-bounded-runtime-projection",
    endpointProfileId: "aviation-endpoint-overlay-profile",
    infrastructureProfileId: "oneweb-gateway-pool-profile"
  },
  sources: {}
} as const;
```

Notes:

- The first intake case still stays presentation/time-first at the scenario
  layer.
- The scenario layer still does **not** directly own gateway arrays or endpoint
  coordinates.

## 2. Sketch: Static Bounded Profile + Physical Input Source Entry

This sketch assumes the proposed widening on `CandidatePhysicalInputs`, but it
does **not** let the adapter invent raw numbers inline. The first round should
pair the path-semantics widening with a repo-owned static bounded profile.

```ts
const aviationBoundedProjectionProfile = {
  profileId: "aviation-service-switching-v1",
  provenanceKind: "bounded-proxy",
  candidates: {
    "oneweb-leo-service-path": {
      antenna: {
        profileId: "aviation-esa-oneweb-bounded",
        gainDb: 37,
        pointingLossDb: 1.1
      },
      rain: {
        modelId: "aviation-rain-bounded",
        attenuationDb: 2.6,
        rainRateMmPerHr: 9
      },
      itu: {
        profileId: "aviation-ka-bounded",
        frequencyGHz: 20.4,
        elevationDeg: 46,
        availabilityPercent: 99.93
      },
      baseMetrics: {
        latencyMs: 31,
        jitterMs: 4.5,
        networkSpeedMbps: 235
      }
    },
    "intelsat-geo-service-path": {
      antenna: {
        profileId: "aviation-esa-geo-bounded",
        gainDb: 38.4,
        pointingLossDb: 1
      },
      rain: {
        modelId: "aviation-rain-bounded",
        attenuationDb: 2.3,
        rainRateMmPerHr: 8
      },
      itu: {
        profileId: "aviation-ku-ka-bounded",
        frequencyGHz: 12.5,
        elevationDeg: 50,
        availabilityPercent: 99.92
      },
      baseMetrics: {
        latencyMs: 97,
        jitterMs: 13,
        networkSpeedMbps: 104
      }
    }
  }
} as const;

const physicalInputSourceEntry = {
  scenarioId: "multi-orbit-oneweb-intelsat-aviation-prerecorded",
  windows: [
    {
      startRatio: 0,
      stopRatio: 0.45,
      contextLabel: "Aviation ingress over OneWeb-preferred corridor",
      candidates: [
        {
          candidateId: "oneweb-leo-service-path",
          orbitClass: "leo",
          pathRole: "primary",
          pathControlMode: "managed_service_switching",
          infrastructureSelectionMode: "eligible-pool",
          ...aviationBoundedProjectionProfile.candidates["oneweb-leo-service-path"]
        },
        {
          candidateId: "intelsat-geo-service-path",
          orbitClass: "geo",
          pathRole: "secondary",
          pathControlMode: "managed_service_switching",
          infrastructureSelectionMode: "provider-managed",
          ...aviationBoundedProjectionProfile.candidates["intelsat-geo-service-path"]
        }
      ]
    }
  ],
  provenance: [
    {
      family: "antenna",
      kind: "bounded-proxy",
      label: "aviation antenna bounded proxy",
      detail:
        "Repo-owned bounded aviation ESA proxy for the first real-world OneWeb+GEO contract case."
    },
    {
      family: "rain-attenuation",
      kind: "bounded-proxy",
      label: "aviation rain bounded proxy",
      detail:
        "Repo-owned bounded rain projection for the first real-world OneWeb+GEO contract case."
    },
    {
      family: "itu-style",
      kind: "bounded-proxy",
      label: "aviation ITU-style bounded proxy",
      detail:
        "Repo-owned bounded ITU-style projection for the first real-world OneWeb+GEO contract case."
    }
  ]
} as const;
```

Notes:

- The values above are still illustrative, but they are illustrative inside a
  repo-owned static profile rather than as ad hoc adapter literals.
- The first round should validate the profile path, not claim calibrated truth.

## 3. Later Sketch: Handover Decision Snapshot

This section is intentionally deferred beyond the first implementation round.
When a first consumer exists, a future slice may look like:

```ts
const handoverDecisionSnapshot = {
  scenarioId: "multi-orbit-oneweb-intelsat-aviation-prerecorded",
  evaluatedAt: "2026-04-21T00:10:00.000Z",
  activeRange: {
    start: "2026-04-21T00:00:00.000Z",
    stop: "2026-04-21T00:20:00.000Z"
  },
  currentServingCandidateId: "oneweb-leo-service-path",
  policyId: "aviation-service-switching-v1",
  isNativeRfHandover: false,
  decisionModel: "service-layer-switching",
  candidates: [
    {
      candidateId: "oneweb-leo-service-path",
      orbitClass: "leo",
      latencyMs: 31,
      jitterMs: 4.5,
      networkSpeedMbps: 235,
      provenance: "bounded-proxy"
    },
    {
      candidateId: "intelsat-geo-service-path",
      orbitClass: "geo",
      latencyMs: 97,
      jitterMs: 13,
      networkSpeedMbps: 104,
      provenance: "bounded-proxy"
    }
  ]
} as const;
```

And the result semantics sketch:

```ts
const handoverDecisionResult = {
  decisionKind: "hold",
  servingCandidateId: "oneweb-leo-service-path",
  servingOrbitClass: "leo",
  reasonSignals: [{ code: "latency-better" }, { code: "jitter-better" }],
  semanticsBridge: {
    truthState: "serving",
    truthBoundaryLabel: "real-pairing-bounded-runtime-projection"
  }
} as const;
```

## 4. Sketch: Endpoint Overlay Seed

```ts
const endpointOverlaySeed = {
  profileId: "aviation-endpoint-overlay-profile",
  endpoints: [
    {
      endpointId: "aircraft-stack",
      role: "endpoint-a",
      entityType: "aircraft_onboard_connectivity_stack",
      positionMode: "mobile-snapshot-required",
      mobilityKind: "mobile",
      renderClass: "aircraft",
      notes:
        "Coordinates intentionally omitted until a real aircraft snapshot or replay segment is selected."
    },
    {
      endpointId: "aviation-service-anchor",
      role: "endpoint-b",
      entityType: "fixed_service_site",
      positionMode: "provider-managed-anchor",
      mobilityKind: "logical",
      renderClass: "logical-anchor",
      notes:
        "Logical provider-managed anchor; do not invent a public airport or teleport coordinate."
    }
  ]
} as const;
```

Notes:

- The first intake must allow mobile and logical endpoints to exist without
  invented coordinates.
- Endpoint overlay remains separate from both `scenario` and `physical-input`.
- Render-facing strings such as `renderClass` and `positionMode` remain
  adapter-facing/open in the first round rather than a renderer-owned closed
  enum.

## 5. Sketch: Infrastructure Overlay Seed

This sketch stays separate from `scenario` and `physical-input`.

```ts
const infrastructureOverlaySeed = {
  profileId: "oneweb-gateway-pool-profile",
  nodes: [
    {
      nodeId: "southbury-gateway",
      provider: "Eutelsat OneWeb",
      nodeType: "gateway",
      networkRoles: ["gateway"],
      lat: 41.451778,
      lon: -73.289333,
      precision: "exact",
      sourceAuthority: "regulator"
    },
    {
      nodeId: "santa-paula-gateway",
      provider: "Eutelsat OneWeb",
      nodeType: "gateway",
      networkRoles: ["gateway"],
      lat: 34.402,
      lon: -119.073194,
      precision: "exact",
      sourceAuthority: "regulator"
    }
  ]
} as const;
```

Notes:

- This is a gateway pool, not a pinned active path assignment.
- The first intake still keeps the GEO side as a provider-managed anchor rather
  than a falsely precise public site.

## 6. Reserved Later Seam: Mobile Endpoint Trajectory

The frozen aircraft corridor package currently lives outside both
`EndpointOverlaySeed` and `InfrastructureOverlaySeed`.

That is intentional:

- the corridor should not be forced into overlay ownership just because it is
  render-adjacent
- the first round does not yet need a runtime consumer for that trajectory

When a later slice needs aircraft replay ingestion, it should reserve a
dedicated mobile-endpoint trajectory seam rather than overloading `scenario` or
overlay seeds.

## What This Sketch Intentionally Does Not Solve

- exact aircraft trajectory truth
- exact Intelsat GEO ground-anchor truth
- final bounded metric calibration
- runtime rendering ownership
- UI copy or HUD layout
- the final shape of a mobile-endpoint trajectory contract

## Why This Sketch Exists

Without a sketch like this, future contract work risks jumping straight from:

- proposal prose

to:

- code

without one intermediate step that proves the widened plain-data shapes are
coherent.
