import trajectoryReplayGeoJsonRaw from "./fixtures/first-intake-aircraft-corridor/trajectory-replay.geojson?raw";
import trajectorySourceRecordJson from "./fixtures/first-intake-aircraft-corridor/trajectory-source-record.json";

import {
  createMobileEndpointTrajectoryCatalog,
  resolveMobileEndpointTrajectorySourceEntry,
  type MobileEndpointTrajectoryPoint,
  type MobileEndpointTrajectorySourceCatalog,
  type MobileEndpointTrajectorySourceEntry
} from "../features/mobile-endpoint-trajectory/mobile-endpoint-trajectory";

export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_ADOPTION_MODE =
  "accepted-corridor-package-ingestion";
export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_CONTRACT_SEAM =
  "MobileEndpointTrajectorySourceEntry";
export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_ENDPOINT_ID =
  "aircraft-stack";
export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_ENDPOINT_ROLE =
  "endpoint-a";
export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_PACKAGE_ROOT =
  "itri/multi-orbit/download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21";
export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_FREEZE_RECORD_PATH =
  `${FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_PACKAGE_ROOT}/freeze-record.md`;
export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_SOURCE_RECORD_PATH =
  `${FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_PACKAGE_ROOT}/trajectory-source-record.json`;
export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_TRUTH_BOUNDARY_PATH =
  `${FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_PACKAGE_ROOT}/notes/truth-boundary.md`;
export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_ARTIFACT_PATH =
  "download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21/artifacts/normalized/trajectory-replay.geojson";
export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_REPLAY_ARTIFACT_EVIDENCE_PATH =
  `${FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_PACKAGE_ROOT}/artifacts/normalized/trajectory-replay.geojson`;

interface TrajectorySourceRecordJson {
  recordId: string;
  seedId: string;
  upstreamDataFamily: string;
  windowStartUtc: string;
  windowEndUtc: string;
  coordinateReference: string;
  waypointCount: number;
  primaryArtifactType: string;
  primaryArtifactPath: string;
  primaryArtifactHashSha256: string;
}

interface TrajectoryReplayFeatureJson {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    sequence: number;
    point_time_utc: string;
    offset_seconds: number;
    on_ground: boolean;
    altitude_baro_ft: number | null;
    altitude_geom_ft: number | null;
    ground_speed_kt: number | null;
    heading_deg: number | null;
    baro_rate_fpm: number | null;
    source_code: string;
  };
}

interface TrajectoryReplayFeatureCollectionJson {
  type: string;
  metadata: {
    record_id: string;
    seed_id: string;
    coordinate_reference: string;
    source_family: string;
    source_service: string;
    window_start_utc: string;
    window_end_utc: string;
  };
  features: ReadonlyArray<TrajectoryReplayFeatureJson>;
}

export interface FirstIntakeMobileEndpointTrajectorySourceLineage {
  packageRoot: typeof FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_PACKAGE_ROOT;
  freezeRecordPath: typeof FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_FREEZE_RECORD_PATH;
  sourceRecordPath: typeof FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_SOURCE_RECORD_PATH;
  truthBoundaryPath: typeof FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_TRUTH_BOUNDARY_PATH;
  replayArtifactPath:
    typeof FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_REPLAY_ARTIFACT_EVIDENCE_PATH;
  adapter: "adaptAcceptedCorridorPackageToMobileEndpointTrajectorySourceEntry";
  contractSeam: typeof FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_CONTRACT_SEAM;
}

export interface FirstIntakeMobileEndpointTrajectorySourceCatalog {
  entries: ReadonlyArray<MobileEndpointTrajectorySourceEntry>;
  adoptionMode: typeof FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_ADOPTION_MODE;
  sourceLineage: FirstIntakeMobileEndpointTrajectorySourceLineage;
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

function assertNullableNumber(
  value: unknown,
  fieldName: string
): asserts value is number | null {
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`${fieldName} must be a finite number or null.`);
  }
}

function normalizeTrajectorySourceRecord(
  value: unknown
): TrajectorySourceRecordJson {
  assertPlainObject(value, "trajectorySourceRecord");
  assertNonEmptyString(value.recordId, "trajectorySourceRecord.recordId");
  assertNonEmptyString(value.seedId, "trajectorySourceRecord.seedId");
  assertNonEmptyString(
    value.upstreamDataFamily,
    "trajectorySourceRecord.upstreamDataFamily"
  );
  assertNonEmptyString(
    value.windowStartUtc,
    "trajectorySourceRecord.windowStartUtc"
  );
  assertNonEmptyString(value.windowEndUtc, "trajectorySourceRecord.windowEndUtc");
  assertNonEmptyString(
    value.coordinateReference,
    "trajectorySourceRecord.coordinateReference"
  );
  assertFiniteNumber(value.waypointCount, "trajectorySourceRecord.waypointCount");
  assertNonEmptyString(
    value.primaryArtifactType,
    "trajectorySourceRecord.primaryArtifactType"
  );
  assertNonEmptyString(
    value.primaryArtifactPath,
    "trajectorySourceRecord.primaryArtifactPath"
  );
  assertNonEmptyString(
    value.primaryArtifactHashSha256,
    "trajectorySourceRecord.primaryArtifactHashSha256"
  );

  return value as unknown as TrajectorySourceRecordJson;
}

function normalizeTrajectoryReplayCollection(
  value: unknown
): TrajectoryReplayFeatureCollectionJson {
  assertPlainObject(value, "trajectoryReplayCollection");

  if (value.type !== "FeatureCollection") {
    throw new Error("trajectoryReplayCollection.type must be FeatureCollection.");
  }

  assertPlainObject(value.metadata, "trajectoryReplayCollection.metadata");
  assertNonEmptyString(
    value.metadata.record_id,
    "trajectoryReplayCollection.metadata.record_id"
  );
  assertNonEmptyString(
    value.metadata.seed_id,
    "trajectoryReplayCollection.metadata.seed_id"
  );
  assertNonEmptyString(
    value.metadata.coordinate_reference,
    "trajectoryReplayCollection.metadata.coordinate_reference"
  );
  assertNonEmptyString(
    value.metadata.source_family,
    "trajectoryReplayCollection.metadata.source_family"
  );
  assertNonEmptyString(
    value.metadata.source_service,
    "trajectoryReplayCollection.metadata.source_service"
  );
  assertNonEmptyString(
    value.metadata.window_start_utc,
    "trajectoryReplayCollection.metadata.window_start_utc"
  );
  assertNonEmptyString(
    value.metadata.window_end_utc,
    "trajectoryReplayCollection.metadata.window_end_utc"
  );

  if (!Array.isArray(value.features)) {
    throw new Error("trajectoryReplayCollection.features must be an array.");
  }

  value.features.forEach((feature, index) => {
    assertPlainObject(feature, `trajectoryReplayCollection.features[${index}]`);

    if (feature.type !== "Feature") {
      throw new Error(
        `trajectoryReplayCollection.features[${index}].type must be Feature.`
      );
    }

    assertPlainObject(
      feature.geometry,
      `trajectoryReplayCollection.features[${index}].geometry`
    );

    if (feature.geometry.type !== "Point") {
      throw new Error(
        `trajectoryReplayCollection.features[${index}].geometry.type must be Point.`
      );
    }

    if (
      !Array.isArray(feature.geometry.coordinates) ||
      feature.geometry.coordinates.length !== 2
    ) {
      throw new Error(
        `trajectoryReplayCollection.features[${index}].geometry.coordinates must contain [lon, lat].`
      );
    }

    assertFiniteNumber(
      feature.geometry.coordinates[0],
      `trajectoryReplayCollection.features[${index}].geometry.coordinates[0]`
    );
    assertFiniteNumber(
      feature.geometry.coordinates[1],
      `trajectoryReplayCollection.features[${index}].geometry.coordinates[1]`
    );

    assertPlainObject(
      feature.properties,
      `trajectoryReplayCollection.features[${index}].properties`
    );
    assertFiniteNumber(
      feature.properties.sequence,
      `trajectoryReplayCollection.features[${index}].properties.sequence`
    );
    assertNonEmptyString(
      feature.properties.point_time_utc,
      `trajectoryReplayCollection.features[${index}].properties.point_time_utc`
    );
    assertFiniteNumber(
      feature.properties.offset_seconds,
      `trajectoryReplayCollection.features[${index}].properties.offset_seconds`
    );

    if (typeof feature.properties.on_ground !== "boolean") {
      throw new Error(
        `trajectoryReplayCollection.features[${index}].properties.on_ground must be boolean.`
      );
    }

    assertNullableNumber(
      feature.properties.altitude_baro_ft,
      `trajectoryReplayCollection.features[${index}].properties.altitude_baro_ft`
    );
    assertNullableNumber(
      feature.properties.altitude_geom_ft,
      `trajectoryReplayCollection.features[${index}].properties.altitude_geom_ft`
    );
    assertNullableNumber(
      feature.properties.ground_speed_kt,
      `trajectoryReplayCollection.features[${index}].properties.ground_speed_kt`
    );
    assertNullableNumber(
      feature.properties.heading_deg,
      `trajectoryReplayCollection.features[${index}].properties.heading_deg`
    );
    assertNullableNumber(
      feature.properties.baro_rate_fpm,
      `trajectoryReplayCollection.features[${index}].properties.baro_rate_fpm`
    );
    assertNonEmptyString(
      feature.properties.source_code,
      `trajectoryReplayCollection.features[${index}].properties.source_code`
    );
  });

  return value as unknown as TrajectoryReplayFeatureCollectionJson;
}

function toTrajectoryPoint(feature: TrajectoryReplayFeatureJson): MobileEndpointTrajectoryPoint {
  return {
    sequence: feature.properties.sequence,
    pointTimeUtc: feature.properties.point_time_utc,
    offsetSeconds: feature.properties.offset_seconds,
    lon: feature.geometry.coordinates[0],
    lat: feature.geometry.coordinates[1],
    onGround: feature.properties.on_ground,
    altitudeBaroFt: feature.properties.altitude_baro_ft,
    altitudeGeomFt: feature.properties.altitude_geom_ft,
    groundSpeedKt: feature.properties.ground_speed_kt,
    headingDeg: feature.properties.heading_deg,
    baroRateFpm: feature.properties.baro_rate_fpm,
    sourceCode: feature.properties.source_code
  };
}

function toMobileEndpointTrajectoryCatalog(
  catalog: FirstIntakeMobileEndpointTrajectorySourceCatalog
): MobileEndpointTrajectorySourceCatalog {
  return createMobileEndpointTrajectoryCatalog(catalog.entries);
}

export function adaptAcceptedCorridorPackageToMobileEndpointTrajectorySourceEntry(): MobileEndpointTrajectorySourceEntry {
  const sourceRecord = normalizeTrajectorySourceRecord(trajectorySourceRecordJson);
  const replayCollection = normalizeTrajectoryReplayCollection(
    JSON.parse(trajectoryReplayGeoJsonRaw) as unknown
  );

  if (sourceRecord.coordinateReference !== "WGS84") {
    throw new Error("Accepted corridor package must preserve WGS84 coordinates.");
  }

  if (sourceRecord.primaryArtifactType !== "GeoJSON") {
    throw new Error("Accepted corridor package must preserve a GeoJSON artifact.");
  }

  if (sourceRecord.primaryArtifactPath !== FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_ARTIFACT_PATH) {
    throw new Error("Accepted corridor package must preserve the frozen artifact path.");
  }

  if (replayCollection.metadata.record_id !== sourceRecord.recordId) {
    throw new Error("Accepted corridor package recordId mismatch between source record and replay artifact.");
  }

  if (replayCollection.metadata.seed_id !== sourceRecord.seedId) {
    throw new Error("Accepted corridor package seedId mismatch between source record and replay artifact.");
  }

  if (
    replayCollection.metadata.coordinate_reference !== sourceRecord.coordinateReference
  ) {
    throw new Error(
      "Accepted corridor package coordinate reference mismatch between source record and replay artifact."
    );
  }

  if (replayCollection.metadata.window_start_utc !== sourceRecord.windowStartUtc) {
    throw new Error(
      "Accepted corridor package windowStartUtc mismatch between source record and replay artifact."
    );
  }

  if (replayCollection.metadata.window_end_utc !== sourceRecord.windowEndUtc) {
    throw new Error(
      "Accepted corridor package windowEndUtc mismatch between source record and replay artifact."
    );
  }

  const points = replayCollection.features.map((feature) => toTrajectoryPoint(feature));

  if (points.length !== sourceRecord.waypointCount) {
    throw new Error(
      "Accepted corridor package waypointCount must match replay artifact point count."
    );
  }

  return {
    scenarioId: sourceRecord.seedId,
    endpointId: FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_ENDPOINT_ID,
    endpointRole: FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_ENDPOINT_ROLE,
    mobilityKind: "mobile",
    trajectory: {
      recordId: sourceRecord.recordId,
      seedId: sourceRecord.seedId,
      truthKind: "historical-corridor-package",
      coordinateReference: "WGS84",
      waypointCount: sourceRecord.waypointCount,
      windowStartUtc: sourceRecord.windowStartUtc,
      windowEndUtc: sourceRecord.windowEndUtc,
      sourceFamily: sourceRecord.upstreamDataFamily,
      sourceService: replayCollection.metadata.source_service,
      artifactType: "GeoJSON",
      artifactPath: sourceRecord.primaryArtifactPath,
      artifactHashSha256: sourceRecord.primaryArtifactHashSha256,
      points
    },
    truthBoundary: {
      corridorTruth: "replayable-historical-trajectory-package",
      equipageTruth: "not-proven-at-tail-level",
      serviceTruth: "not-proven-active-on-this-flight",
      identifierSemantics: "audit-only",
      onewebGatewaySemantics: "eligible-pool-only",
      geoAnchorSemantics: "provider-managed-anchor",
      activeGatewayAssignment: "not-claimed",
      pairSpecificGeoTeleport: "not-claimed"
    }
  };
}

export function createFirstIntakeMobileEndpointTrajectorySourceCatalog(): FirstIntakeMobileEndpointTrajectorySourceCatalog {
  return {
    entries: [adaptAcceptedCorridorPackageToMobileEndpointTrajectorySourceEntry()],
    adoptionMode: FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_ADOPTION_MODE,
    sourceLineage: {
      packageRoot: FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_PACKAGE_ROOT,
      freezeRecordPath: FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_FREEZE_RECORD_PATH,
      sourceRecordPath: FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_SOURCE_RECORD_PATH,
      truthBoundaryPath:
        FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_TRUTH_BOUNDARY_PATH,
      replayArtifactPath:
        FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_REPLAY_ARTIFACT_EVIDENCE_PATH,
      adapter: "adaptAcceptedCorridorPackageToMobileEndpointTrajectorySourceEntry",
      contractSeam: FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_CONTRACT_SEAM
    }
  };
}

export function resolveFirstIntakeMobileEndpointTrajectorySourceEntry(
  catalog: FirstIntakeMobileEndpointTrajectorySourceCatalog,
  scenarioId: string
): MobileEndpointTrajectorySourceEntry {
  return resolveMobileEndpointTrajectorySourceEntry(
    toMobileEndpointTrajectoryCatalog(catalog),
    scenarioId
  );
}
