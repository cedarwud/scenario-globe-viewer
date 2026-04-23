export type MobileEndpointTrajectoryTruthKind = "historical-corridor-package";
export type MobileEndpointTrajectoryCoordinateReference = "WGS84";
export type MobileEndpointTrajectoryArtifactType = "GeoJSON";
export type MobileEndpointTrajectoryEndpointRole = "endpoint-a" | "endpoint-b";
export type MobileEndpointTrajectoryMobilityKind = "mobile";

export interface MobileEndpointTrajectoryPoint {
  sequence: number;
  pointTimeUtc: string;
  offsetSeconds: number;
  lon: number;
  lat: number;
  onGround: boolean;
  altitudeBaroFt: number | null;
  altitudeGeomFt: number | null;
  groundSpeedKt: number | null;
  headingDeg: number | null;
  baroRateFpm: number | null;
  sourceCode: string;
}

export interface MobileEndpointTrajectoryPackage {
  recordId: string;
  seedId: string;
  truthKind: MobileEndpointTrajectoryTruthKind;
  coordinateReference: MobileEndpointTrajectoryCoordinateReference;
  waypointCount: number;
  windowStartUtc: string;
  windowEndUtc: string;
  sourceFamily: string;
  sourceService: string;
  artifactType: MobileEndpointTrajectoryArtifactType;
  artifactPath: string;
  artifactHashSha256: string;
  points: ReadonlyArray<MobileEndpointTrajectoryPoint>;
}

export interface MobileEndpointTrajectoryTruthBoundary {
  corridorTruth: "replayable-historical-trajectory-package";
  equipageTruth: "not-proven-at-tail-level";
  serviceTruth: "not-proven-active-on-this-flight";
  identifierSemantics: "audit-only";
  onewebGatewaySemantics: "eligible-pool-only";
  geoAnchorSemantics: "provider-managed-anchor";
  activeGatewayAssignment: "not-claimed";
  pairSpecificGeoTeleport: "not-claimed";
}

export interface MobileEndpointTrajectorySourceEntry {
  scenarioId: string;
  endpointId: string;
  endpointRole: MobileEndpointTrajectoryEndpointRole;
  mobilityKind: MobileEndpointTrajectoryMobilityKind;
  trajectory: MobileEndpointTrajectoryPackage;
  truthBoundary: MobileEndpointTrajectoryTruthBoundary;
}

export interface MobileEndpointTrajectorySourceCatalog {
  entries: ReadonlyArray<MobileEndpointTrajectorySourceEntry>;
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

function assertNullableNumber(
  value: unknown,
  fieldName: string
): asserts value is number | null {
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`${fieldName} must be a finite number or null.`);
  }
}

function assertMobileEndpointTrajectoryPoint(
  point: MobileEndpointTrajectoryPoint,
  index: number
): void {
  assertFiniteNumber(point.sequence, `points[${index}].sequence`);
  assertNonEmptyString(point.pointTimeUtc, `points[${index}].pointTimeUtc`);
  assertFiniteNumber(point.offsetSeconds, `points[${index}].offsetSeconds`);
  assertFiniteNumber(point.lon, `points[${index}].lon`);
  assertFiniteNumber(point.lat, `points[${index}].lat`);

  if (typeof point.onGround !== "boolean") {
    throw new Error(`points[${index}].onGround must be boolean.`);
  }

  assertNullableNumber(point.altitudeBaroFt, `points[${index}].altitudeBaroFt`);
  assertNullableNumber(point.altitudeGeomFt, `points[${index}].altitudeGeomFt`);
  assertNullableNumber(point.groundSpeedKt, `points[${index}].groundSpeedKt`);
  assertNullableNumber(point.headingDeg, `points[${index}].headingDeg`);
  assertNullableNumber(point.baroRateFpm, `points[${index}].baroRateFpm`);
  assertNonEmptyString(point.sourceCode, `points[${index}].sourceCode`);
}

function clonePoint(point: MobileEndpointTrajectoryPoint): MobileEndpointTrajectoryPoint {
  return {
    sequence: point.sequence,
    pointTimeUtc: point.pointTimeUtc,
    offsetSeconds: point.offsetSeconds,
    lon: point.lon,
    lat: point.lat,
    onGround: point.onGround,
    altitudeBaroFt: point.altitudeBaroFt,
    altitudeGeomFt: point.altitudeGeomFt,
    groundSpeedKt: point.groundSpeedKt,
    headingDeg: point.headingDeg,
    baroRateFpm: point.baroRateFpm,
    sourceCode: point.sourceCode
  };
}

function cloneEntry(
  entry: MobileEndpointTrajectorySourceEntry
): MobileEndpointTrajectorySourceEntry {
  return {
    scenarioId: entry.scenarioId,
    endpointId: entry.endpointId,
    endpointRole: entry.endpointRole,
    mobilityKind: entry.mobilityKind,
    trajectory: {
      recordId: entry.trajectory.recordId,
      seedId: entry.trajectory.seedId,
      truthKind: entry.trajectory.truthKind,
      coordinateReference: entry.trajectory.coordinateReference,
      waypointCount: entry.trajectory.waypointCount,
      windowStartUtc: entry.trajectory.windowStartUtc,
      windowEndUtc: entry.trajectory.windowEndUtc,
      sourceFamily: entry.trajectory.sourceFamily,
      sourceService: entry.trajectory.sourceService,
      artifactType: entry.trajectory.artifactType,
      artifactPath: entry.trajectory.artifactPath,
      artifactHashSha256: entry.trajectory.artifactHashSha256,
      points: entry.trajectory.points.map((point) => clonePoint(point))
    },
    truthBoundary: {
      corridorTruth: entry.truthBoundary.corridorTruth,
      equipageTruth: entry.truthBoundary.equipageTruth,
      serviceTruth: entry.truthBoundary.serviceTruth,
      identifierSemantics: entry.truthBoundary.identifierSemantics,
      onewebGatewaySemantics: entry.truthBoundary.onewebGatewaySemantics,
      geoAnchorSemantics: entry.truthBoundary.geoAnchorSemantics,
      activeGatewayAssignment: entry.truthBoundary.activeGatewayAssignment,
      pairSpecificGeoTeleport: entry.truthBoundary.pairSpecificGeoTeleport
    }
  };
}

export function assertMobileEndpointTrajectorySourceEntry(
  entry: MobileEndpointTrajectorySourceEntry
): void {
  assertNonEmptyString(entry.scenarioId, "scenarioId");
  assertNonEmptyString(entry.endpointId, "endpointId");

  if (entry.endpointRole !== "endpoint-a" && entry.endpointRole !== "endpoint-b") {
    throw new Error("endpointRole must be endpoint-a or endpoint-b.");
  }

  if (entry.mobilityKind !== "mobile") {
    throw new Error("mobilityKind must be mobile.");
  }

  assertNonEmptyString(entry.trajectory.recordId, "trajectory.recordId");
  assertNonEmptyString(entry.trajectory.seedId, "trajectory.seedId");

  if (entry.trajectory.truthKind !== "historical-corridor-package") {
    throw new Error(
      "trajectory.truthKind must be historical-corridor-package."
    );
  }

  if (entry.trajectory.coordinateReference !== "WGS84") {
    throw new Error("trajectory.coordinateReference must be WGS84.");
  }

  if (entry.trajectory.artifactType !== "GeoJSON") {
    throw new Error("trajectory.artifactType must be GeoJSON.");
  }

  assertFiniteNumber(entry.trajectory.waypointCount, "trajectory.waypointCount");
  assertNonEmptyString(entry.trajectory.windowStartUtc, "trajectory.windowStartUtc");
  assertNonEmptyString(entry.trajectory.windowEndUtc, "trajectory.windowEndUtc");
  assertNonEmptyString(entry.trajectory.sourceFamily, "trajectory.sourceFamily");
  assertNonEmptyString(entry.trajectory.sourceService, "trajectory.sourceService");
  assertNonEmptyString(entry.trajectory.artifactPath, "trajectory.artifactPath");
  assertNonEmptyString(
    entry.trajectory.artifactHashSha256,
    "trajectory.artifactHashSha256"
  );

  if (entry.trajectory.points.length !== entry.trajectory.waypointCount) {
    throw new Error("trajectory.points length must match trajectory.waypointCount.");
  }

  entry.trajectory.points.forEach((point, index) => {
    assertMobileEndpointTrajectoryPoint(point, index);

    if (point.sequence !== index) {
      throw new Error(
        `trajectory.points[${index}] must preserve sequence ordering.`
      );
    }
  });

  if (
    entry.truthBoundary.corridorTruth !==
    "replayable-historical-trajectory-package"
  ) {
    throw new Error(
      "truthBoundary.corridorTruth must stay replayable-historical-trajectory-package."
    );
  }

  if (entry.truthBoundary.equipageTruth !== "not-proven-at-tail-level") {
    throw new Error(
      "truthBoundary.equipageTruth must stay not-proven-at-tail-level."
    );
  }

  if (entry.truthBoundary.serviceTruth !== "not-proven-active-on-this-flight") {
    throw new Error(
      "truthBoundary.serviceTruth must stay not-proven-active-on-this-flight."
    );
  }

  if (entry.truthBoundary.identifierSemantics !== "audit-only") {
    throw new Error("truthBoundary.identifierSemantics must stay audit-only.");
  }

  if (entry.truthBoundary.onewebGatewaySemantics !== "eligible-pool-only") {
    throw new Error(
      "truthBoundary.onewebGatewaySemantics must stay eligible-pool-only."
    );
  }

  if (entry.truthBoundary.geoAnchorSemantics !== "provider-managed-anchor") {
    throw new Error(
      "truthBoundary.geoAnchorSemantics must stay provider-managed-anchor."
    );
  }

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
}

export function createMobileEndpointTrajectoryCatalog(
  entries: ReadonlyArray<MobileEndpointTrajectorySourceEntry>
): MobileEndpointTrajectorySourceCatalog {
  entries.forEach((entry) => {
    assertMobileEndpointTrajectorySourceEntry(entry);
  });

  return {
    entries: entries.map((entry) => cloneEntry(entry))
  };
}

export function resolveMobileEndpointTrajectorySourceEntry(
  catalog: MobileEndpointTrajectorySourceCatalog,
  scenarioId: string
): MobileEndpointTrajectorySourceEntry {
  const entry = catalog.entries.find((candidate) => candidate.scenarioId === scenarioId);

  if (!entry) {
    throw new Error(
      `No mobile-endpoint trajectory source entry exists for scenario ${scenarioId}.`
    );
  }

  return cloneEntry(entry);
}
