import type {
  NearbySecondEndpointNarrativeRole,
  NearbySecondEndpointPositionPrecision,
  NearbySecondEndpointScenarioId
} from "./nearby-second-endpoint";

export const ACCEPTED_NEARBY_SECOND_ENDPOINT_PACKAGE_ID =
  "m8a-yka-operations-office-2026-04-23";
export const ACCEPTED_NEARBY_SECOND_ENDPOINT_SCENARIO_ID: NearbySecondEndpointScenarioId =
  "app-oneweb-intelsat-geo-aviation";
export const ACCEPTED_NEARBY_SECOND_ENDPOINT_CORRIDOR_PACKAGE_ID =
  "ac-cgojz-crj900-c06aa4-2026-04-21";
export const ACCEPTED_NEARBY_SECOND_ENDPOINT_PACKAGE_ROOT =
  "itri/multi-orbit/download/nearby-second-endpoints/m8a-yka-operations-office-2026-04-23";
export const ACCEPTED_NEARBY_SECOND_ENDPOINT_AUTHORITY_PACKAGE_PATH =
  `${ACCEPTED_NEARBY_SECOND_ENDPOINT_PACKAGE_ROOT}/authority-package.md`;
export const ACCEPTED_NEARBY_SECOND_ENDPOINT_POSITION_PATH =
  `${ACCEPTED_NEARBY_SECOND_ENDPOINT_PACKAGE_ROOT}/position.json`;
export const ACCEPTED_NEARBY_SECOND_ENDPOINT_NON_CLAIMS_PATH =
  `${ACCEPTED_NEARBY_SECOND_ENDPOINT_PACKAGE_ROOT}/non-claims.md`;

export interface AcceptedNearbySecondEndpointPositionProjection {
  packageId: typeof ACCEPTED_NEARBY_SECOND_ENDPOINT_PACKAGE_ID;
  endpointId: string;
  endpointLabel: string;
  endpointType: string;
  endpointRoleForM8A: NearbySecondEndpointNarrativeRole;
  geographyBucket: string;
  positionPrecision: NearbySecondEndpointPositionPrecision;
  coordinateReference: "WGS84";
  lat: number;
  lon: number;
  coordinateSource: string;
  sourceAuthority: ReadonlyArray<string>;
  precisionNotes: string;
  locationNarrative: string;
  relatedFirstCase: NearbySecondEndpointScenarioId;
  relatedCorridorPackage: typeof ACCEPTED_NEARBY_SECOND_ENDPOINT_CORRIDOR_PACKAGE_ID;
}

// Repo-owned plain-data projection of the accepted YKA package for M8A.2 runtime use.
export const ACCEPTED_NEARBY_SECOND_ENDPOINT_POSITION_PROJECTION = {
  packageId: ACCEPTED_NEARBY_SECOND_ENDPOINT_PACKAGE_ID,
  endpointId: "endpoint-yka-operations-office",
  endpointLabel: "YKA Kamloops Airport Operations Office",
  endpointType: "airport-adjacent-fixed-service-endpoint",
  endpointRoleForM8A: "nearby-fixed-second-endpoint",
  geographyBucket: "interior-bc-corridor-adjacent",
  positionPrecision: "facility-known",
  coordinateReference: "WGS84",
  lat: 50.703,
  lon: -120.4486,
  coordinateSource: "secondary-airport-reference-proxy",
  sourceAuthority: [
    "Kamloops Airport official contact page",
    "City of Kamloops property report for 3035 Airport Rd"
  ],
  precisionNotes:
    "The endpoint identity and mailing/location address are publicly attributable at 101-3035 Airport Rd, Kamloops, BC V2B 7X1. The WGS84 coordinate stored here is a facility-adjacent airport reference proxy used for viewer placement and distance comparison only. It is not an exact office-suite or operations-console coordinate.",
  locationNarrative:
    "Airport-adjacent operations office at Kamloops Airport within the accepted interior British Columbia to Vancouver first-case corridor narrative.",
  relatedFirstCase: ACCEPTED_NEARBY_SECOND_ENDPOINT_SCENARIO_ID,
  relatedCorridorPackage: ACCEPTED_NEARBY_SECOND_ENDPOINT_CORRIDOR_PACKAGE_ID
} as const satisfies AcceptedNearbySecondEndpointPositionProjection;
