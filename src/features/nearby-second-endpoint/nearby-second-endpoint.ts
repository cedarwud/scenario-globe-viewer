export type NearbySecondEndpointScenarioId =
  "app-oneweb-intelsat-geo-aviation";
export type NearbySecondEndpointPositionPrecision =
  | "exact"
  | "facility-known"
  | "site-level";
export type NearbySecondEndpointCoordinateReference = "WGS84";
export type NearbySecondEndpointNarrativeRole =
  "nearby-fixed-second-endpoint";

export interface NearbySecondEndpointCoordinates {
  lat: number;
  lon: number;
}

export interface NearbySecondEndpointTruthBoundary {
  activeGatewayAssignment: "not-claimed";
  pairSpecificGeoTeleport: "not-claimed";
  measurementTruth: "not-claimed";
}

export interface NearbySecondEndpointSourceEntry {
  scenarioId: NearbySecondEndpointScenarioId;
  endpointId: string;
  endpointLabel: string;
  endpointType: string;
  geographyBucket: string;
  positionPrecision: NearbySecondEndpointPositionPrecision;
  coordinateReference: NearbySecondEndpointCoordinateReference;
  coordinates: NearbySecondEndpointCoordinates;
  narrativeRole: NearbySecondEndpointNarrativeRole;
  truthBoundary: NearbySecondEndpointTruthBoundary;
}

export interface NearbySecondEndpointSourceCatalog {
  entries: ReadonlyArray<NearbySecondEndpointSourceEntry>;
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

function assertScenarioId(
  value: unknown,
  fieldName: string
): asserts value is NearbySecondEndpointScenarioId {
  if (value !== "app-oneweb-intelsat-geo-aviation") {
    throw new Error(
      `${fieldName} must stay app-oneweb-intelsat-geo-aviation.`
    );
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

function assertCoordinateReference(
  value: unknown,
  fieldName: string
): asserts value is NearbySecondEndpointCoordinateReference {
  if (value !== "WGS84") {
    throw new Error(`${fieldName} must stay WGS84.`);
  }
}

function assertNarrativeRole(
  value: unknown,
  fieldName: string
): asserts value is NearbySecondEndpointNarrativeRole {
  if (value !== "nearby-fixed-second-endpoint") {
    throw new Error(
      `${fieldName} must stay nearby-fixed-second-endpoint.`
    );
  }
}

function assertLatitude(value: number, fieldName: string): void {
  if (value < -90 || value > 90) {
    throw new Error(`${fieldName} must stay within [-90, 90].`);
  }
}

function assertLongitude(value: number, fieldName: string): void {
  if (value < -180 || value > 180) {
    throw new Error(`${fieldName} must stay within [-180, 180].`);
  }
}

function cloneEntry(
  entry: NearbySecondEndpointSourceEntry
): NearbySecondEndpointSourceEntry {
  return {
    scenarioId: entry.scenarioId,
    endpointId: entry.endpointId,
    endpointLabel: entry.endpointLabel,
    endpointType: entry.endpointType,
    geographyBucket: entry.geographyBucket,
    positionPrecision: entry.positionPrecision,
    coordinateReference: entry.coordinateReference,
    coordinates: {
      lat: entry.coordinates.lat,
      lon: entry.coordinates.lon
    },
    narrativeRole: entry.narrativeRole,
    truthBoundary: {
      activeGatewayAssignment: entry.truthBoundary.activeGatewayAssignment,
      pairSpecificGeoTeleport: entry.truthBoundary.pairSpecificGeoTeleport,
      measurementTruth: entry.truthBoundary.measurementTruth
    }
  };
}

export function assertNearbySecondEndpointSourceEntry(
  entry: NearbySecondEndpointSourceEntry
): void {
  assertScenarioId(entry.scenarioId, "scenarioId");
  assertNonEmptyString(entry.endpointId, "endpointId");
  assertNonEmptyString(entry.endpointLabel, "endpointLabel");
  assertNonEmptyString(entry.endpointType, "endpointType");
  assertNonEmptyString(entry.geographyBucket, "geographyBucket");
  assertPositionPrecision(entry.positionPrecision, "positionPrecision");
  assertCoordinateReference(entry.coordinateReference, "coordinateReference");
  assertFiniteNumber(entry.coordinates.lat, "coordinates.lat");
  assertFiniteNumber(entry.coordinates.lon, "coordinates.lon");
  assertLatitude(entry.coordinates.lat, "coordinates.lat");
  assertLongitude(entry.coordinates.lon, "coordinates.lon");
  assertNarrativeRole(entry.narrativeRole, "narrativeRole");

  if (entry.truthBoundary.activeGatewayAssignment !== "not-claimed") {
    throw new Error(
      "truthBoundary.activeGatewayAssignment must stay not-claimed."
    );
  }

  if (entry.truthBoundary.pairSpecificGeoTeleport !== "not-claimed") {
    throw new Error(
      "truthBoundary.pairSpecificGeoTeleport must stay not-claimed."
    );
  }

  if (entry.truthBoundary.measurementTruth !== "not-claimed") {
    throw new Error(
      "truthBoundary.measurementTruth must stay not-claimed."
    );
  }
}

export function createNearbySecondEndpointCatalog(
  entries: ReadonlyArray<NearbySecondEndpointSourceEntry>
): NearbySecondEndpointSourceCatalog {
  entries.forEach((entry) => {
    assertNearbySecondEndpointSourceEntry(entry);
  });

  return {
    entries: entries.map((entry) => cloneEntry(entry))
  };
}

export function resolveNearbySecondEndpointSourceEntry(
  catalog: NearbySecondEndpointSourceCatalog,
  scenarioId: NearbySecondEndpointScenarioId
): NearbySecondEndpointSourceEntry {
  const entry = catalog.entries.find((candidate) => candidate.scenarioId === scenarioId);

  if (!entry) {
    throw new Error(
      `No nearby-second-endpoint source entry exists for scenario ${scenarioId}.`
    );
  }

  return cloneEntry(entry);
}
