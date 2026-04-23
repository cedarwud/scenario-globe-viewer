import {
  createNearbySecondEndpointCatalog,
  resolveNearbySecondEndpointSourceEntry,
  type NearbySecondEndpointPositionPrecision,
  type NearbySecondEndpointSourceCatalog,
  type NearbySecondEndpointSourceEntry
} from "../features/nearby-second-endpoint/nearby-second-endpoint";
import {
  ACCEPTED_NEARBY_SECOND_ENDPOINT_AUTHORITY_PACKAGE_PATH,
  ACCEPTED_NEARBY_SECOND_ENDPOINT_CORRIDOR_PACKAGE_ID,
  ACCEPTED_NEARBY_SECOND_ENDPOINT_NON_CLAIMS_PATH,
  ACCEPTED_NEARBY_SECOND_ENDPOINT_PACKAGE_ID,
  ACCEPTED_NEARBY_SECOND_ENDPOINT_PACKAGE_ROOT,
  ACCEPTED_NEARBY_SECOND_ENDPOINT_POSITION_PATH,
  ACCEPTED_NEARBY_SECOND_ENDPOINT_POSITION_PROJECTION,
  ACCEPTED_NEARBY_SECOND_ENDPOINT_SCENARIO_ID,
  type AcceptedNearbySecondEndpointPositionProjection
} from "../features/nearby-second-endpoint/accepted-nearby-second-endpoint-source-data";

export const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_ADOPTION_MODE =
  "accepted-nearby-second-endpoint-package-ingestion";
export const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_CONTRACT_SEAM =
  "NearbySecondEndpointSourceEntry";
export const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_PACKAGE_ROOT =
  ACCEPTED_NEARBY_SECOND_ENDPOINT_PACKAGE_ROOT;
export const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_AUTHORITY_PACKAGE_PATH =
  ACCEPTED_NEARBY_SECOND_ENDPOINT_AUTHORITY_PACKAGE_PATH;
export const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_POSITION_PATH =
  ACCEPTED_NEARBY_SECOND_ENDPOINT_POSITION_PATH;
export const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_NON_CLAIMS_PATH =
  ACCEPTED_NEARBY_SECOND_ENDPOINT_NON_CLAIMS_PATH;

export interface FirstIntakeNearbySecondEndpointSourceLineage {
  packageRoot: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_PACKAGE_ROOT;
  authorityPackagePath:
    typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_AUTHORITY_PACKAGE_PATH;
  positionPath: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_POSITION_PATH;
  nonClaimsPath: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_NON_CLAIMS_PATH;
  adapter: "adaptAcceptedNearbySecondEndpointPackageToSourceEntry";
  contractSeam: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_CONTRACT_SEAM;
}

export interface FirstIntakeNearbySecondEndpointSourceCatalog {
  entries: ReadonlyArray<NearbySecondEndpointSourceEntry>;
  adoptionMode: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_ADOPTION_MODE;
  sourceLineage: FirstIntakeNearbySecondEndpointSourceLineage;
}

function assertPlainObject(
  value: unknown,
  fieldName: string
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be a plain object.`);
  }
}

function assertNonEmptyString(
  value: unknown,
  fieldName: string
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function assertFiniteNumber(
  value: unknown,
  fieldName: string
): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }
}

function assertPositionPrecision(
  value: unknown,
  fieldName: string
): asserts value is NearbySecondEndpointPositionPrecision {
  if (
    value !== "exact" &&
    value !== "facility-known" &&
    value !== "site-level"
  ) {
    throw new Error(
      `${fieldName} must be exact, facility-known, or site-level.`
    );
  }
}

function normalizePositionProjection(
  value: unknown
): AcceptedNearbySecondEndpointPositionProjection {
  assertPlainObject(value, "nearbySecondEndpointPosition");
  assertNonEmptyString(value.packageId, "nearbySecondEndpointPosition.packageId");
  assertNonEmptyString(value.endpointId, "nearbySecondEndpointPosition.endpointId");
  assertNonEmptyString(
    value.endpointLabel,
    "nearbySecondEndpointPosition.endpointLabel"
  );
  assertNonEmptyString(
    value.endpointType,
    "nearbySecondEndpointPosition.endpointType"
  );
  assertNonEmptyString(
    value.endpointRoleForM8A,
    "nearbySecondEndpointPosition.endpointRoleForM8A"
  );
  assertNonEmptyString(
    value.geographyBucket,
    "nearbySecondEndpointPosition.geographyBucket"
  );
  assertPositionPrecision(
    value.positionPrecision,
    "nearbySecondEndpointPosition.positionPrecision"
  );
  assertNonEmptyString(
    value.coordinateReference,
    "nearbySecondEndpointPosition.coordinateReference"
  );
  assertFiniteNumber(value.lat, "nearbySecondEndpointPosition.lat");
  assertFiniteNumber(value.lon, "nearbySecondEndpointPosition.lon");
  assertNonEmptyString(
    value.coordinateSource,
    "nearbySecondEndpointPosition.coordinateSource"
  );

  if (!Array.isArray(value.sourceAuthority) || value.sourceAuthority.length === 0) {
    throw new Error(
      "nearbySecondEndpointPosition.sourceAuthority must be a non-empty array."
    );
  }

  value.sourceAuthority.forEach((entry, index) => {
    assertNonEmptyString(
      entry,
      `nearbySecondEndpointPosition.sourceAuthority[${index}]`
    );
  });

  assertNonEmptyString(
    value.precisionNotes,
    "nearbySecondEndpointPosition.precisionNotes"
  );
  assertNonEmptyString(
    value.locationNarrative,
    "nearbySecondEndpointPosition.locationNarrative"
  );
  assertNonEmptyString(
    value.relatedFirstCase,
    "nearbySecondEndpointPosition.relatedFirstCase"
  );
  assertNonEmptyString(
    value.relatedCorridorPackage,
    "nearbySecondEndpointPosition.relatedCorridorPackage"
  );

  return value as unknown as AcceptedNearbySecondEndpointPositionProjection;
}

function toNearbySecondEndpointCatalog(
  catalog: FirstIntakeNearbySecondEndpointSourceCatalog
): NearbySecondEndpointSourceCatalog {
  return createNearbySecondEndpointCatalog(catalog.entries);
}

export function adaptAcceptedNearbySecondEndpointPackageToSourceEntry(): NearbySecondEndpointSourceEntry {
  const position = normalizePositionProjection(
    ACCEPTED_NEARBY_SECOND_ENDPOINT_POSITION_PROJECTION as unknown
  );

  if (position.packageId !== ACCEPTED_NEARBY_SECOND_ENDPOINT_PACKAGE_ID) {
    throw new Error("Accepted nearby second-endpoint packageId must stay frozen.");
  }

  if (position.relatedFirstCase !== ACCEPTED_NEARBY_SECOND_ENDPOINT_SCENARIO_ID) {
    throw new Error("Accepted nearby second-endpoint package must stay on the first accepted scenario id.");
  }

  if (
    position.relatedCorridorPackage !==
    ACCEPTED_NEARBY_SECOND_ENDPOINT_CORRIDOR_PACKAGE_ID
  ) {
    throw new Error(
      "Accepted nearby second-endpoint package must stay tied to the accepted first corridor package."
    );
  }

  if (position.endpointRoleForM8A !== "nearby-fixed-second-endpoint") {
    throw new Error(
      "Accepted nearby second-endpoint package must stay on the nearby-fixed-second-endpoint role."
    );
  }

  if (position.coordinateReference !== "WGS84") {
    throw new Error(
      "Accepted nearby second-endpoint package must preserve WGS84 coordinates."
    );
  }

  return {
    scenarioId: ACCEPTED_NEARBY_SECOND_ENDPOINT_SCENARIO_ID,
    endpointId: position.endpointId,
    endpointLabel: position.endpointLabel,
    endpointType: position.endpointType,
    geographyBucket: position.geographyBucket,
    positionPrecision: position.positionPrecision,
    coordinateReference: "WGS84",
    coordinates: {
      lat: position.lat,
      lon: position.lon
    },
    narrativeRole: "nearby-fixed-second-endpoint",
    truthBoundary: {
      activeGatewayAssignment: "not-claimed",
      pairSpecificGeoTeleport: "not-claimed",
      measurementTruth: "not-claimed"
    }
  };
}

export function createFirstIntakeNearbySecondEndpointSourceCatalog(): FirstIntakeNearbySecondEndpointSourceCatalog {
  return {
    entries: [adaptAcceptedNearbySecondEndpointPackageToSourceEntry()],
    adoptionMode: FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_ADOPTION_MODE,
    sourceLineage: {
      packageRoot: FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_PACKAGE_ROOT,
      authorityPackagePath:
        FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_AUTHORITY_PACKAGE_PATH,
      positionPath: FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_POSITION_PATH,
      nonClaimsPath: FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_NON_CLAIMS_PATH,
      adapter: "adaptAcceptedNearbySecondEndpointPackageToSourceEntry",
      contractSeam: FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_CONTRACT_SEAM
    }
  };
}

export function resolveFirstIntakeNearbySecondEndpointSourceEntry(
  catalog: FirstIntakeNearbySecondEndpointSourceCatalog,
  scenarioId: NearbySecondEndpointSourceEntry["scenarioId"]
): NearbySecondEndpointSourceEntry {
  return resolveNearbySecondEndpointSourceEntry(
    toNearbySecondEndpointCatalog(catalog),
    scenarioId
  );
}
