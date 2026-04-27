const ONEWEB_INTELSAT_GEO_AVIATION_SEED = {
  schemaVersion: "multi-orbit-app-facing-scenario.v0",
  seedStatus: "trajectory-backed-pre-implementation",
  seedIntent: "app-facing-planning",
  researchRefs: {
    operatorPairId: "oneweb-intelsat-geo-aviation",
    endpointEntityTypes: ["aircraft_onboard_connectivity_stack"],
    terminalPatternIds: ["managed_ifc_esa"],
    switchActorIds: ["onboard_connectivity_stack"],
    gatewayBaselineRef: "oneweb-gateway-position-baseline.json"
  },
  scenario: {
    id: "app-oneweb-intelsat-geo-aviation",
    label: "OneWeb + Intelsat GEO Aviation",
    presentation: {
      presetKey: "global",
      suggestedScopeLabel: "global aviation corridor"
    },
    time: {
      recommendedMode: "prerecorded"
    },
    vertical: "commercial_aviation",
    intent: "multi-orbit-service-handover"
  },
  evidence: {
    evidenceGrade: "publicly-proven",
    proofScope: "named_deployment_and_deployment_scale",
    deploymentStatus: "commercial_live",
    relationshipAsOfDate: "2025-07-16",
    isNativeRfHandover: false
  },
  endpoints: [
    {
      endpointId: "aircraft-stack",
      role: "endpoint-a",
      entityType: "aircraft_onboard_connectivity_stack",
      positionMode: "mobile-snapshot-required",
      mobilityKind: "mobile",
      renderClass: "aircraft",
      notes:
        "Use the frozen aircraft corridor package at download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21 as the first trajectory-backed input. Air Canada is the named deployment, and the package preserves fleet-class evidence without claiming a tail-level equipped aircraft identity."
    },
    {
      endpointId: "aviation-service-anchor",
      role: "endpoint-b",
      entityType: "fixed_service_site",
      positionMode: "provider-managed-anchor",
      mobilityKind: "logical",
      renderClass: "logical-anchor",
      notes:
        "Represents the provider-side service/network anchor rather than a pinned public airport or pair-specific Intelsat teleport coordinate."
    }
  ],
  knownInfrastructureNodes: [
    {
      nodeId: "talkeetna-gateway",
      provider: "Eutelsat OneWeb",
      nodeType: "gateway",
      networkRoles: ["gateway"],
      lat: 62.333075,
      lon: -150.031231,
      precision: "exact",
      sourceAuthority: "regulator",
      operationalStatus: "unknown"
    },
    {
      nodeId: "clewiston-gateway",
      provider: "Eutelsat OneWeb",
      nodeType: "gateway",
      networkRoles: ["gateway"],
      lat: 26.747722,
      lon: -81.049222,
      precision: "exact",
      sourceAuthority: "regulator",
      operationalStatus: "unknown"
    },
    {
      nodeId: "southbury-gateway",
      provider: "Eutelsat OneWeb",
      nodeType: "gateway",
      networkRoles: ["gateway"],
      lat: 41.451778,
      lon: -73.289333,
      precision: "exact",
      sourceAuthority: "regulator",
      operationalStatus: "unknown"
    },
    {
      nodeId: "santa-paula-gateway",
      provider: "Eutelsat OneWeb",
      nodeType: "gateway",
      networkRoles: ["gateway"],
      lat: 34.402,
      lon: -119.073194,
      precision: "exact",
      sourceAuthority: "regulator",
      operationalStatus: "unknown"
    },
    {
      nodeId: "paumalu-gateway",
      provider: "Eutelsat OneWeb",
      nodeType: "gateway",
      networkRoles: ["gateway"],
      lat: 21.666664,
      lon: -158.030833,
      precision: "exact",
      sourceAuthority: "regulator",
      operationalStatus: "unknown"
    },
    {
      nodeId: "yona-gateway",
      provider: "Eutelsat OneWeb",
      nodeType: "gateway",
      networkRoles: ["gateway"],
      lat: 13.418444,
      lon: 144.751722,
      precision: "exact",
      sourceAuthority: "regulator",
      operationalStatus: "unknown"
    }
  ],
  candidatePaths: [
    {
      candidateId: "oneweb-leo-service-path",
      orbitClass: "leo",
      provider: "OneWeb",
      pathRole: "primary",
      pathControlMode: "managed_service_switching",
      switchSemantics: ["service-layer switching", "managed network integration"],
      terminalPatternIds: ["managed_ifc_esa"],
      switchActorIds: ["onboard_connectivity_stack"],
      infrastructureSelectionMode: "eligible-pool",
      infrastructureNodeRefs: [
        "talkeetna-gateway",
        "clewiston-gateway",
        "southbury-gateway",
        "santa-paula-gateway",
        "paumalu-gateway",
        "yona-gateway"
      ]
    },
    {
      candidateId: "intelsat-geo-service-path",
      orbitClass: "geo",
      provider: "Intelsat",
      pathRole: "secondary",
      pathControlMode: "managed_service_switching",
      switchSemantics: ["service-layer switching", "managed network integration"],
      terminalPatternIds: ["managed_ifc_esa"],
      switchActorIds: ["onboard_connectivity_stack"],
      infrastructureSelectionMode: "provider-managed",
      infrastructureNodeRefs: []
    }
  ],
  handoverPolicy: {
    policyId: "aviation-service-switching-v1",
    decisionModel: "service-layer-switching",
    truthBoundaryLabel: "real-pairing-bounded-runtime-projection",
    preferredSignalOrder: [
      "latency-better",
      "jitter-better",
      "network-speed-better",
      "policy-hold"
    ],
    truthBoundaryNote:
      "Pairing, endpoint type, and gateway pool are research-backed. Runtime metrics still require adapter-side bounded projection."
  },
  metricProjectionPlan: {
    mode: "adapter-required",
    targetSeams: ["physical-input", "handover-decision"],
    note:
      "Do not embed final latency/jitter/throughput truth here. Generate bounded proxy windows later from path semantics plus scenario timing."
  },
  unresolvedInputs: [
    {
      inputId: "intelsat-ground-anchor-selection",
      category: "provider-ground-anchor",
      requirement:
        "Select how the GEO provider-side ground anchor will be represented in the scene without inventing a public pair-specific teleport coordinate."
    },
    {
      inputId: "active-oneweb-gateway-selection",
      category: "path-node-selection",
      requirement:
        "Keep the scene on a canonical eligible gateway pool unless a later per-scene source chain justifies a resolved active gateway assignment."
    },
    {
      inputId: "aviation-metric-projection-profile",
      category: "metric-calibration",
      requirement:
        "Define the bounded metric projection profile for service-layer aviation switching so the adapter can materialize physical-input windows."
    }
  ]
} as const;

export default ONEWEB_INTELSAT_GEO_AVIATION_SEED;
