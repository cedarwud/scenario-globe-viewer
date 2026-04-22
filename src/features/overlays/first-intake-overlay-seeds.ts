import type {
  EndpointOverlaySeed,
  InfrastructureOverlaySeed
} from "./overlay-seeds";

export const FIRST_INTAKE_ENDPOINT_OVERLAY_SEEDS = [
  {
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
          "Trajectory-backed mobile endpoint remains unresolved here; coordinates are intentionally omitted until a later mobile snapshot seam exists."
      },
      {
        endpointId: "aviation-service-anchor",
        role: "endpoint-b",
        entityType: "fixed_service_site",
        positionMode: "provider-managed-anchor",
        mobilityKind: "logical",
        renderClass: "logical-anchor",
        notes:
          "Provider-managed service anchor remains coordinate-free here; this seed does not pin a pair-specific GEO ground coordinate."
      }
    ]
  }
] as const satisfies ReadonlyArray<EndpointOverlaySeed>;

export const FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_SEEDS = [
  {
    profileId: "oneweb-gateway-pool-profile",
    nodes: [
      {
        nodeId: "talkeetna-gateway",
        provider: "Eutelsat OneWeb",
        nodeType: "gateway",
        networkRoles: ["gateway"],
        lat: 62.333075,
        lon: -150.031231,
        precision: "exact",
        sourceAuthority: "regulator"
      },
      {
        nodeId: "clewiston-gateway",
        provider: "Eutelsat OneWeb",
        nodeType: "gateway",
        networkRoles: ["gateway"],
        lat: 26.747722,
        lon: -81.049222,
        precision: "exact",
        sourceAuthority: "regulator"
      },
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
      },
      {
        nodeId: "paumalu-gateway",
        provider: "Eutelsat OneWeb",
        nodeType: "gateway",
        networkRoles: ["gateway"],
        lat: 21.666664,
        lon: -158.030833,
        precision: "exact",
        sourceAuthority: "regulator"
      },
      {
        nodeId: "yona-gateway",
        provider: "Eutelsat OneWeb",
        nodeType: "gateway",
        networkRoles: ["gateway"],
        lat: 13.418444,
        lon: 144.751722,
        precision: "exact",
        sourceAuthority: "regulator"
      }
    ]
  }
] as const satisfies ReadonlyArray<InfrastructureOverlaySeed>;
