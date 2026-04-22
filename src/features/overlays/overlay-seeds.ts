export type OverlaySeedCoordinatePrecision =
  | "exact"
  | "facility-known"
  | "site-level";

export interface OverlaySeedCoordinates {
  lat: number;
  lon: number;
  precision: OverlaySeedCoordinatePrecision;
}

export type EndpointOverlayRole = "endpoint-a" | "endpoint-b";
export type EndpointOverlayMobilityKind = "fixed" | "mobile" | "logical";

export interface EndpointOverlayNode {
  endpointId: string;
  role: EndpointOverlayRole;
  entityType: string;
  positionMode: string;
  mobilityKind: EndpointOverlayMobilityKind;
  renderClass: string;
  coordinates?: OverlaySeedCoordinates;
  notes?: string;
}

export interface EndpointOverlaySeed {
  profileId: string;
  endpoints: ReadonlyArray<EndpointOverlayNode>;
}

export interface InfrastructureOverlayNode {
  nodeId: string;
  provider: string;
  nodeType: string;
  networkRoles: ReadonlyArray<string>;
  lat: number;
  lon: number;
  precision: OverlaySeedCoordinatePrecision;
  sourceAuthority?: string;
  notes?: string;
}

export interface InfrastructureOverlaySeed {
  profileId: string;
  nodes: ReadonlyArray<InfrastructureOverlayNode>;
}

const ALLOWED_COORDINATE_PRECISIONS = [
  "exact",
  "facility-known",
  "site-level"
] as const satisfies ReadonlyArray<OverlaySeedCoordinatePrecision>;

const ALLOWED_ENDPOINT_OVERLAY_SEED_KEYS = [
  "profileId",
  "endpoints"
] as const satisfies ReadonlyArray<keyof EndpointOverlaySeed>;

const ALLOWED_ENDPOINT_OVERLAY_NODE_KEYS = [
  "endpointId",
  "role",
  "entityType",
  "positionMode",
  "mobilityKind",
  "renderClass",
  "coordinates",
  "notes"
] as const satisfies ReadonlyArray<keyof EndpointOverlayNode>;

const ALLOWED_OVERLAY_SEED_COORDINATE_KEYS = [
  "lat",
  "lon",
  "precision"
] as const satisfies ReadonlyArray<keyof OverlaySeedCoordinates>;

const ALLOWED_INFRASTRUCTURE_OVERLAY_SEED_KEYS = [
  "profileId",
  "nodes"
] as const satisfies ReadonlyArray<keyof InfrastructureOverlaySeed>;

const ALLOWED_INFRASTRUCTURE_OVERLAY_NODE_KEYS = [
  "nodeId",
  "provider",
  "nodeType",
  "networkRoles",
  "lat",
  "lon",
  "precision",
  "sourceAuthority",
  "notes"
] as const satisfies ReadonlyArray<keyof InfrastructureOverlayNode>;

const ALLOWED_ENDPOINT_OVERLAY_ROLES = [
  "endpoint-a",
  "endpoint-b"
] as const satisfies ReadonlyArray<EndpointOverlayRole>;

const ALLOWED_ENDPOINT_OVERLAY_MOBILITY_KINDS = [
  "fixed",
  "mobile",
  "logical"
] as const satisfies ReadonlyArray<EndpointOverlayMobilityKind>;

function assertPlainRecord(
  value: unknown,
  label: string
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a plain object.`);
  }
}

function assertNoUnsupportedKeys(
  record: Record<string, unknown>,
  allowedKeys: ReadonlyArray<string>,
  label: string
): void {
  const unsupportedKeys = Object.keys(record).filter(
    (key) => !allowedKeys.includes(key)
  );

  if (unsupportedKeys.length > 0) {
    throw new Error(
      `${label} must not include unsupported keys: ${unsupportedKeys.join(", ")}.`
    );
  }
}

function assertStringField(
  record: Record<string, unknown>,
  fieldName: string,
  label: string
): void {
  if (typeof record[fieldName] !== "string") {
    throw new Error(`${label}.${fieldName} must be a string.`);
  }
}

function assertOptionalStringField(
  record: Record<string, unknown>,
  fieldName: string,
  label: string
): void {
  const value = record[fieldName];

  if (value !== undefined && typeof value !== "string") {
    throw new Error(`${label}.${fieldName} must be a string when provided.`);
  }
}

function assertFiniteNumberField(
  record: Record<string, unknown>,
  fieldName: string,
  label: string
): void {
  const value = record[fieldName];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label}.${fieldName} must be a finite number.`);
  }
}

function assertStringArrayField(
  record: Record<string, unknown>,
  fieldName: string,
  label: string
): void {
  const value = record[fieldName];

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label}.${fieldName} must be an array of strings.`);
  }
}

function assertOverlaySeedPrecision(
  value: unknown,
  label: string
): asserts value is OverlaySeedCoordinatePrecision {
  if (
    typeof value !== "string" ||
    !ALLOWED_COORDINATE_PRECISIONS.includes(value as OverlaySeedCoordinatePrecision)
  ) {
    throw new Error(
      `${label} must be one of ${ALLOWED_COORDINATE_PRECISIONS.join(", ")}.`
    );
  }
}

function assertLatitude(value: number, label: string): void {
  if (value < -90 || value > 90) {
    throw new Error(`${label} must be between -90 and 90.`);
  }
}

function assertLongitude(value: number, label: string): void {
  if (value < -180 || value > 180) {
    throw new Error(`${label} must be between -180 and 180.`);
  }
}

function assertOverlaySeedCoordinates(
  value: unknown,
  label: string
): void {
  assertPlainRecord(value, label);
  assertNoUnsupportedKeys(
    value,
    ALLOWED_OVERLAY_SEED_COORDINATE_KEYS,
    label
  );
  assertFiniteNumberField(value, "lat", label);
  assertFiniteNumberField(value, "lon", label);
  assertLatitude(value.lat as number, `${label}.lat`);
  assertLongitude(value.lon as number, `${label}.lon`);
  assertOverlaySeedPrecision(value.precision, `${label}.precision`);
}

function assertEndpointOverlayRole(
  value: unknown,
  label: string
): asserts value is EndpointOverlayRole {
  if (
    typeof value !== "string" ||
    !ALLOWED_ENDPOINT_OVERLAY_ROLES.includes(value as EndpointOverlayRole)
  ) {
    throw new Error(
      `${label} must be one of ${ALLOWED_ENDPOINT_OVERLAY_ROLES.join(", ")}.`
    );
  }
}

function assertEndpointOverlayMobilityKind(
  value: unknown,
  label: string
): asserts value is EndpointOverlayMobilityKind {
  if (
    typeof value !== "string" ||
    !ALLOWED_ENDPOINT_OVERLAY_MOBILITY_KINDS.includes(
      value as EndpointOverlayMobilityKind
    )
  ) {
    throw new Error(
      `${label} must be one of ${ALLOWED_ENDPOINT_OVERLAY_MOBILITY_KINDS.join(", ")}.`
    );
  }
}

function assertEndpointOverlayNode(value: unknown, index: number): void {
  const label = `Endpoint overlay seed endpoints[${index}]`;

  assertPlainRecord(value, label);
  assertNoUnsupportedKeys(value, ALLOWED_ENDPOINT_OVERLAY_NODE_KEYS, label);
  assertStringField(value, "endpointId", label);
  assertEndpointOverlayRole(value.role, `${label}.role`);
  assertStringField(value, "entityType", label);
  assertStringField(value, "positionMode", label);
  assertEndpointOverlayMobilityKind(value.mobilityKind, `${label}.mobilityKind`);
  assertStringField(value, "renderClass", label);
  assertOptionalStringField(value, "notes", label);

  if (value.coordinates !== undefined) {
    assertOverlaySeedCoordinates(value.coordinates, `${label}.coordinates`);
  }
}

function assertInfrastructureOverlayNode(value: unknown, index: number): void {
  const label = `Infrastructure overlay seed nodes[${index}]`;

  assertPlainRecord(value, label);
  assertNoUnsupportedKeys(
    value,
    ALLOWED_INFRASTRUCTURE_OVERLAY_NODE_KEYS,
    label
  );
  assertStringField(value, "nodeId", label);
  assertStringField(value, "provider", label);
  assertStringField(value, "nodeType", label);
  assertStringArrayField(value, "networkRoles", label);
  assertFiniteNumberField(value, "lat", label);
  assertFiniteNumberField(value, "lon", label);
  assertLatitude(value.lat as number, `${label}.lat`);
  assertLongitude(value.lon as number, `${label}.lon`);
  assertOverlaySeedPrecision(value.precision, `${label}.precision`);
  assertOptionalStringField(value, "sourceAuthority", label);
  assertOptionalStringField(value, "notes", label);
}

export function assertEndpointOverlaySeed(seed: EndpointOverlaySeed): void {
  const rawSeed = seed as unknown;
  const label = "Endpoint overlay seed";

  assertPlainRecord(rawSeed, label);
  assertNoUnsupportedKeys(rawSeed, ALLOWED_ENDPOINT_OVERLAY_SEED_KEYS, label);
  assertStringField(rawSeed, "profileId", label);

  if (!Array.isArray(rawSeed.endpoints)) {
    throw new Error(`${label}.endpoints must be an array.`);
  }

  rawSeed.endpoints.forEach((node, index) => {
    assertEndpointOverlayNode(node, index);
  });
}

export function assertInfrastructureOverlaySeed(
  seed: InfrastructureOverlaySeed
): void {
  const rawSeed = seed as unknown;
  const label = "Infrastructure overlay seed";

  assertPlainRecord(rawSeed, label);
  assertNoUnsupportedKeys(
    rawSeed,
    ALLOWED_INFRASTRUCTURE_OVERLAY_SEED_KEYS,
    label
  );
  assertStringField(rawSeed, "profileId", label);

  if (!Array.isArray(rawSeed.nodes)) {
    throw new Error(`${label}.nodes must be an array.`);
  }

  rawSeed.nodes.forEach((node, index) => {
    assertInfrastructureOverlayNode(node, index);
  });
}
