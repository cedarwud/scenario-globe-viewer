export const ITRI_MEASURED_TRAFFIC_PACKAGE_SCHEMA_VERSION =
  "itri.f07-f09.measured-traffic-package.v1" as const;
export const ITRI_MEASURED_TRAFFIC_REVIEW_SCHEMA_VERSION =
  "itri.f07r1.measured-traffic-package-review.v1" as const;
export const ITRI_MEASURED_TRAFFIC_PACKAGE_ROOT =
  "output/validation/external-f07-f09" as const;

export const ITRI_MEASURED_TRAFFIC_REQUIREMENTS = [
  "F-07",
  "F-08",
  "F-09"
] as const;

export type ItriMeasuredTrafficRequirementId =
  (typeof ITRI_MEASURED_TRAFFIC_REQUIREMENTS)[number];

export type ItriRelatedValidationRequirementId =
  | "V-02"
  | "V-03"
  | "V-04"
  | "V-05"
  | "V-06";

export type ItriMeasuredTrafficReviewerState =
  | "importable"
  | "incomplete"
  | "redacted-reviewable"
  | "rejected"
  | "authority-pass";

export type ItriMeasuredTrafficPackageReviewState =
  | "missing"
  | ItriMeasuredTrafficReviewerState;

export type ItriMeasuredTrafficReviewGapSeverity = "blocking" | "warning";

export interface ItriMeasuredTrafficReviewGap {
  code: string;
  message: string;
  severity: ItriMeasuredTrafficReviewGapSeverity;
  path?: string;
  requirementId?: ItriMeasuredTrafficRequirementId;
}

export interface ItriMeasuredTrafficArtifactRefCheck {
  declaredRefs: ReadonlyArray<string>;
  resolvedRefs: ReadonlyArray<string>;
  unresolvedRefs: ReadonlyArray<string>;
  escapedRefs: ReadonlyArray<string>;
}

export interface ItriMeasuredTrafficRequirementReview {
  requirementId: ItriMeasuredTrafficRequirementId;
  reviewerState: ItriMeasuredTrafficReviewerState;
  evidenceScope: string;
  sourceArtifactRefs: ReadonlyArray<string>;
  parsedMetricRefs: ReadonlyArray<string>;
  thresholdRuleRefs: ReadonlyArray<string>;
  relatedValidationRequirementRefs: ReadonlyArray<ItriRelatedValidationRequirementId>;
  reviewer: {
    nameOrRole: string;
    reviewedAt: string;
    notes: ReadonlyArray<string>;
  };
  gaps: ReadonlyArray<ItriMeasuredTrafficReviewGap>;
}

export interface ItriMeasuredTrafficThresholdReview {
  externalAuthorityRequired: true;
  thresholdOwnerPresent: boolean;
  thresholdVersionPresent: boolean;
  unresolvedThresholdState: string | null;
  requirementRuleCount: number;
  notes: ReadonlyArray<string>;
}

export interface ItriMeasuredTrafficSyntheticReview {
  syntheticSourceDetected: boolean;
  detectedPaths: ReadonlyArray<string>;
  measuredPackageAllowsSyntheticSource: false | null;
  rejectMeasuredImportWhenSourceTierIsSynthetic: true | null;
}

export interface ItriMeasuredTrafficNonClaims {
  schemaImportReadinessIsMeasuredTrafficTruth: false;
  externalValidationTruthFromImport: false;
  v02ThroughV06VerdictFromTrafficOnly: false;
  dutNatTunnelPathSuccessFromSchemaOnly: false;
  itriOrbitModelIntegration: false;
  radioLayerHandover: false;
  fullItriAcceptance: false;
}

export interface ItriMeasuredTrafficPackageReview {
  schemaVersion: typeof ITRI_MEASURED_TRAFFIC_REVIEW_SCHEMA_VERSION;
  reviewedAt: string;
  packagePath: string;
  manifestPath: string;
  packageState: ItriMeasuredTrafficPackageReviewState;
  manifestSchemaVersion: string | null;
  packageId: string | null;
  runId: string | null;
  coveredRequirements: ReadonlyArray<ItriMeasuredTrafficRequirementId>;
  requirementReviews: ReadonlyArray<ItriMeasuredTrafficRequirementReview>;
  gaps: ReadonlyArray<ItriMeasuredTrafficReviewGap>;
  artifactRefSummary: ItriMeasuredTrafficArtifactRefCheck;
  thresholdAuthority: ItriMeasuredTrafficThresholdReview;
  syntheticProvenance: ItriMeasuredTrafficSyntheticReview;
  nonClaims: ItriMeasuredTrafficNonClaims;
}

export interface ItriMeasuredTrafficPackageReviewOptions {
  manifest: unknown;
  packagePath: string;
  manifestPath?: string;
  reviewedAt?: string;
  artifactRefCheck?: ItriMeasuredTrafficArtifactRefCheck;
}

export interface ItriMeasuredTrafficClosedReviewOptions {
  packagePath: string;
  manifestPath?: string;
  reviewedAt?: string;
}

export interface ItriMeasuredTrafficMalformedReviewOptions
  extends ItriMeasuredTrafficClosedReviewOptions {
  parseError: string;
}

type PlainRecord = Record<string, unknown>;

interface ReviewerVerdictLike {
  requirementId: ItriMeasuredTrafficRequirementId;
  reviewerState: ItriMeasuredTrafficReviewerState;
  evidenceScope: string;
  sourceArtifactRefs: ReadonlyArray<string>;
  parsedMetricRefs: ReadonlyArray<string>;
  thresholdRuleRefs: ReadonlyArray<string>;
  relatedValidationRequirementRefs: ReadonlyArray<ItriRelatedValidationRequirementId>;
  reviewer: {
    nameOrRole: string;
    reviewedAt: string;
    notes: ReadonlyArray<string>;
  };
}

const REQUIRED_NON_CLAIMS: ItriMeasuredTrafficNonClaims = {
  schemaImportReadinessIsMeasuredTrafficTruth: false,
  externalValidationTruthFromImport: false,
  v02ThroughV06VerdictFromTrafficOnly: false,
  dutNatTunnelPathSuccessFromSchemaOnly: false,
  itriOrbitModelIntegration: false,
  radioLayerHandover: false,
  fullItriAcceptance: false
};

const EMPTY_ARTIFACT_REF_CHECK: ItriMeasuredTrafficArtifactRefCheck = {
  declaredRefs: [],
  resolvedRefs: [],
  unresolvedRefs: [],
  escapedRefs: []
};

const REQUIRED_ROOT_FIELDS = [
  "schemaVersion",
  "packageId",
  "runId",
  "packagePath",
  "capturedAt",
  "capturedUntil",
  "timezone",
  "validationOwner",
  "redactionPolicy",
  "topologyId",
  "canonicalRoute",
  "toolVersions",
  "coveredRequirements",
  "relatedValidationRequirements",
  "topology",
  "artifactRefs",
  "parsedMetrics",
  "thresholdAuthority",
  "reviewerVerdicts",
  "syntheticFallbackBoundary",
  "nonClaims"
] as const;

const TOPOLOGY_INDICATOR_REQUIREMENTS: ReadonlyArray<{
  key: string;
  requirementId: ItriRelatedValidationRequirementId;
}> = [
  { key: "usesWindowsWsl", requirementId: "V-02" },
  { key: "usesTunnel", requirementId: "V-03" },
  { key: "usesBridge", requirementId: "V-03" },
  { key: "usesNat", requirementId: "V-04" },
  { key: "usesEstnetInet", requirementId: "V-04" }
];

function nonClaims(): ItriMeasuredTrafficNonClaims {
  return { ...REQUIRED_NON_CLAIMS };
}

function isPlainRecord(value: unknown): value is PlainRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(record: PlainRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function stringValue(record: PlainRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function arrayValue(value: unknown): ReadonlyArray<unknown> {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: unknown): ReadonlyArray<string> {
  return arrayValue(value).filter((entry): entry is string => typeof entry === "string");
}

function recordArray(value: unknown): ReadonlyArray<PlainRecord> {
  return arrayValue(value).filter(isPlainRecord);
}

function addGap(
  gaps: ItriMeasuredTrafficReviewGap[],
  code: string,
  message: string,
  options: {
    severity?: ItriMeasuredTrafficReviewGapSeverity;
    path?: string;
    requirementId?: ItriMeasuredTrafficRequirementId;
  } = {}
): void {
  gaps.push({
    code,
    message,
    severity: options.severity ?? "blocking",
    ...(options.path ? { path: options.path } : {}),
    ...(options.requirementId ? { requirementId: options.requirementId } : {})
  });
}

function parseReviewTime(reviewedAt: string | undefined): string {
  if (reviewedAt && Number.isFinite(Date.parse(reviewedAt))) {
    return new Date(Date.parse(reviewedAt)).toISOString();
  }

  return new Date().toISOString();
}

function normalizePackagePath(packagePath: string): string {
  return packagePath.replace(/\\/g, "/").replace(/\/+$/g, "");
}

export function isAllowedItriMeasuredTrafficPackagePath(packagePath: string): boolean {
  const normalized = normalizePackagePath(packagePath);
  const root = ITRI_MEASURED_TRAFFIC_PACKAGE_ROOT;

  return (
    normalized.startsWith(`${root}/`) &&
    !normalized.includes("/../") &&
    !normalized.startsWith("../") &&
    !normalized.startsWith("/")
  );
}

function defaultManifestPath(packagePath: string): string {
  return `${normalizePackagePath(packagePath)}/manifest.json`;
}

function missingRequirementReview(
  requirementId: ItriMeasuredTrafficRequirementId,
  reviewedAt: string,
  message: string
): ItriMeasuredTrafficRequirementReview {
  return {
    requirementId,
    reviewerState: "incomplete",
    evidenceScope: "No retained measured-traffic package was imported.",
    sourceArtifactRefs: [],
    parsedMetricRefs: [],
    thresholdRuleRefs: [],
    relatedValidationRequirementRefs: [],
    reviewer: {
      nameOrRole: "F-07R1 package reviewer",
      reviewedAt,
      notes: [message]
    },
    gaps: [
      {
        code: "package.missing",
        message,
        severity: "blocking",
        requirementId
      }
    ]
  };
}

function closedReview(
  options: ItriMeasuredTrafficClosedReviewOptions & {
    packageState: ItriMeasuredTrafficPackageReviewState;
    gaps: ReadonlyArray<ItriMeasuredTrafficReviewGap>;
    manifestSchemaVersion?: string | null;
  }
): ItriMeasuredTrafficPackageReview {
  const reviewedAt = parseReviewTime(options.reviewedAt);
  const message =
    options.gaps[0]?.message ??
    "Measured-traffic package import did not reach an importable state.";

  return {
    schemaVersion: ITRI_MEASURED_TRAFFIC_REVIEW_SCHEMA_VERSION,
    reviewedAt,
    packagePath: normalizePackagePath(options.packagePath),
    manifestPath: options.manifestPath ?? defaultManifestPath(options.packagePath),
    packageState: options.packageState,
    manifestSchemaVersion: options.manifestSchemaVersion ?? null,
    packageId: null,
    runId: null,
    coveredRequirements: [...ITRI_MEASURED_TRAFFIC_REQUIREMENTS],
    requirementReviews: ITRI_MEASURED_TRAFFIC_REQUIREMENTS.map((requirementId) =>
      missingRequirementReview(requirementId, reviewedAt, message)
    ),
    gaps: options.gaps,
    artifactRefSummary: { ...EMPTY_ARTIFACT_REF_CHECK },
    thresholdAuthority: {
      externalAuthorityRequired: true,
      thresholdOwnerPresent: false,
      thresholdVersionPresent: false,
      unresolvedThresholdState: null,
      requirementRuleCount: 0,
      notes: [
        "Threshold authority remains external and was not available to this package review."
      ]
    },
    syntheticProvenance: {
      syntheticSourceDetected: false,
      detectedPaths: [],
      measuredPackageAllowsSyntheticSource: null,
      rejectMeasuredImportWhenSourceTierIsSynthetic: null
    },
    nonClaims: nonClaims()
  };
}

export function reviewMissingItriMeasuredTrafficPackage(
  options: ItriMeasuredTrafficClosedReviewOptions
): ItriMeasuredTrafficPackageReview {
  const gaps: ItriMeasuredTrafficReviewGap[] = [];
  addGap(
    gaps,
    "package.missing",
    "No retained measured-traffic package exists at the explicitly named path.",
    { path: normalizePackagePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "missing",
    gaps
  });
}

export function reviewMissingItriMeasuredTrafficManifest(
  options: ItriMeasuredTrafficClosedReviewOptions
): ItriMeasuredTrafficPackageReview {
  const gaps: ItriMeasuredTrafficReviewGap[] = [];
  addGap(
    gaps,
    "manifest.missing",
    "Package directory exists, but manifest.json was not found at the explicitly named manifest path.",
    { path: options.manifestPath ?? defaultManifestPath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "incomplete",
    gaps
  });
}

export function reviewMalformedItriMeasuredTrafficManifest(
  options: ItriMeasuredTrafficMalformedReviewOptions
): ItriMeasuredTrafficPackageReview {
  const gaps: ItriMeasuredTrafficReviewGap[] = [];
  addGap(gaps, "manifest.malformed-json", options.parseError, {
    path: options.manifestPath ?? defaultManifestPath(options.packagePath)
  });

  return closedReview({
    ...options,
    packageState: "incomplete",
    gaps
  });
}

export function reviewRejectedItriMeasuredTrafficPackagePath(
  options: ItriMeasuredTrafficClosedReviewOptions
): ItriMeasuredTrafficPackageReview {
  const gaps: ItriMeasuredTrafficReviewGap[] = [];
  addGap(
    gaps,
    "package.path-outside-retained-root",
    `Measured-traffic package path must be under ${ITRI_MEASURED_TRAFFIC_PACKAGE_ROOT}/.`,
    { path: normalizePackagePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "rejected",
    gaps
  });
}

function addRequiredRootFieldGaps(manifest: PlainRecord, gaps: ItriMeasuredTrafficReviewGap[]): void {
  for (const field of REQUIRED_ROOT_FIELDS) {
    if (!hasOwn(manifest, field)) {
      addGap(gaps, "manifest.required-field-missing", `Manifest is missing required field ${field}.`, {
        path: field
      });
    }
  }
}

function reviewSchemaVersion(manifest: PlainRecord, gaps: ItriMeasuredTrafficReviewGap[]): string | null {
  const schemaVersion = stringValue(manifest, "schemaVersion");

  if (schemaVersion !== ITRI_MEASURED_TRAFFIC_PACKAGE_SCHEMA_VERSION) {
    addGap(
      gaps,
      "manifest.schema-version",
      `Manifest schemaVersion must be ${ITRI_MEASURED_TRAFFIC_PACKAGE_SCHEMA_VERSION}.`,
      { path: "schemaVersion" }
    );
  }

  return schemaVersion;
}

function reviewPackagePath(
  manifest: PlainRecord,
  packagePath: string,
  gaps: ItriMeasuredTrafficReviewGap[]
): void {
  const normalizedPackagePath = normalizePackagePath(packagePath);
  const manifestPackagePath = stringValue(manifest, "packagePath");

  if (!isAllowedItriMeasuredTrafficPackagePath(normalizedPackagePath)) {
    addGap(
      gaps,
      "package.path-outside-retained-root",
      `Package path must be explicitly under ${ITRI_MEASURED_TRAFFIC_PACKAGE_ROOT}/.`,
      { path: "packagePath" }
    );
  }

  if (!manifestPackagePath) {
    return;
  }

  const normalizedManifestPath = normalizePackagePath(manifestPackagePath);

  if (normalizedManifestPath !== normalizedPackagePath) {
    addGap(
      gaps,
      "manifest.package-path-mismatch",
      "Manifest packagePath must match the explicitly named package path.",
      { path: "packagePath" }
    );
  }
}

function reviewTimestamp(
  manifest: PlainRecord,
  key: "capturedAt" | "capturedUntil",
  gaps: ItriMeasuredTrafficReviewGap[]
): void {
  if (key === "capturedUntil" && manifest[key] === null) {
    return;
  }

  const value = stringValue(manifest, key);

  if (!value || !Number.isFinite(Date.parse(value))) {
    addGap(gaps, "manifest.timestamp", `${key} must be an ISO-8601 timestamp or null when allowed.`, {
      path: key
    });
  }
}

function reviewOwner(manifest: PlainRecord, gaps: ItriMeasuredTrafficReviewGap[]): void {
  const owner = manifest.validationOwner;

  if (!isPlainRecord(owner)) {
    addGap(gaps, "owner.missing", "validationOwner must be an object with organization, role, and authorityScope.", {
      path: "validationOwner"
    });
    return;
  }

  for (const key of ["organization", "role"] as const) {
    if (!stringValue(owner, key)) {
      addGap(gaps, "owner.required-field-missing", `validationOwner.${key} is required.`, {
        path: `validationOwner.${key}`
      });
    }
  }

  if (stringArray(owner.authorityScope).length === 0) {
    addGap(gaps, "owner.authority-scope-missing", "validationOwner.authorityScope must name the retained review scope.", {
      path: "validationOwner.authorityScope"
    });
  }
}

function reviewRedactionPolicy(
  manifest: PlainRecord,
  gaps: ItriMeasuredTrafficReviewGap[]
): PlainRecord | null {
  const policy = manifest.redactionPolicy;

  if (!isPlainRecord(policy)) {
    addGap(gaps, "redaction-policy.missing", "redactionPolicy must be retained with owner, version, level, and auditability.", {
      path: "redactionPolicy"
    });
    return null;
  }

  for (const key of ["policyId", "policyVersion", "owner", "redactionLevel", "packetCapturePolicy", "auditability"] as const) {
    if (!stringValue(policy, key)) {
      addGap(gaps, "redaction-policy.required-field-missing", `redactionPolicy.${key} is required.`, {
        path: `redactionPolicy.${key}`
      });
    }
  }

  if (!Array.isArray(policy.redactedCategories)) {
    addGap(gaps, "redaction-policy.categories-missing", "redactionPolicy.redactedCategories must be an array, even when empty.", {
      path: "redactionPolicy.redactedCategories"
    });
  }

  return policy;
}

function reviewToolVersions(manifest: PlainRecord, gaps: ItriMeasuredTrafficReviewGap[]): void {
  const toolVersions = manifest.toolVersions;

  if (!isPlainRecord(toolVersions)) {
    addGap(gaps, "tool-versions.missing", "toolVersions must retain tool and OS provenance.", {
      path: "toolVersions"
    });
    return;
  }

  if (stringArray(toolVersions.os).length === 0) {
    addGap(gaps, "tool-versions.os-missing", "toolVersions.os must list the OS or host images involved in the package.", {
      path: "toolVersions.os"
    });
  }
}

function requirementFromUnknown(value: unknown): ItriMeasuredTrafficRequirementId | null {
  return typeof value === "string" &&
    (ITRI_MEASURED_TRAFFIC_REQUIREMENTS as ReadonlyArray<string>).includes(value)
    ? (value as ItriMeasuredTrafficRequirementId)
    : null;
}

function relatedRequirementFromUnknown(value: unknown): ItriRelatedValidationRequirementId | null {
  return typeof value === "string" &&
    ["V-02", "V-03", "V-04", "V-05", "V-06"].includes(value)
    ? (value as ItriRelatedValidationRequirementId)
    : null;
}

function reviewCoveredRequirements(
  manifest: PlainRecord,
  gaps: ItriMeasuredTrafficReviewGap[]
): ReadonlyArray<ItriMeasuredTrafficRequirementId> {
  const covered = arrayValue(manifest.coveredRequirements)
    .map(requirementFromUnknown)
    .filter((requirement): requirement is ItriMeasuredTrafficRequirementId =>
      Boolean(requirement)
    );

  if (covered.length === 0) {
    addGap(
      gaps,
      "requirements.covered-missing",
      "coveredRequirements must contain at least one of F-07, F-08, or F-09.",
      { path: "coveredRequirements" }
    );
  }

  if (arrayValue(manifest.coveredRequirements).length !== covered.length) {
    addGap(
      gaps,
      "requirements.covered-invalid",
      "coveredRequirements may contain only F-07, F-08, and F-09.",
      { path: "coveredRequirements" }
    );
  }

  return [...new Set(covered)];
}

function reviewEndpoint(
  endpoint: unknown,
  pathName: string,
  gaps: ItriMeasuredTrafficReviewGap[]
): void {
  if (!isPlainRecord(endpoint)) {
    addGap(gaps, "topology.endpoint-missing", `${pathName} endpoint must be retained.`, {
      path: pathName
    });
    return;
  }

  for (const key of ["endpointId", "hostId", "role"] as const) {
    if (!stringValue(endpoint, key)) {
      addGap(gaps, "topology.endpoint-field-missing", `${pathName}.${key} is required.`, {
        path: `${pathName}.${key}`
      });
    }
  }

  if (!Array.isArray(endpoint.interfaceRefs)) {
    addGap(gaps, "topology.endpoint-interface-refs", `${pathName}.interfaceRefs must be an array.`, {
      path: `${pathName}.interfaceRefs`
    });
  }

  if (!Array.isArray(endpoint.commandTranscriptRefs)) {
    addGap(
      gaps,
      "topology.endpoint-command-refs",
      `${pathName}.commandTranscriptRefs must be an array.`,
      { path: `${pathName}.commandTranscriptRefs` }
    );
  }
}

function reviewRelatedValidationRequirements(
  manifest: PlainRecord,
  topology: PlainRecord,
  gaps: ItriMeasuredTrafficReviewGap[]
): ReadonlyArray<ItriRelatedValidationRequirementId> {
  const relatedRecords = recordArray(manifest.relatedValidationRequirements);
  const relatedIds = relatedRecords
    .map((record) => relatedRequirementFromUnknown(record.requirementId))
    .filter((requirement): requirement is ItriRelatedValidationRequirementId =>
      Boolean(requirement)
    );
  const pathIndicators = isPlainRecord(topology.pathIndicators)
    ? topology.pathIndicators
    : null;

  if (!pathIndicators) {
    addGap(gaps, "topology.path-indicators-missing", "topology.pathIndicators must be retained.", {
      path: "topology.pathIndicators"
    });
  } else {
    for (const { key, requirementId } of TOPOLOGY_INDICATOR_REQUIREMENTS) {
      if (typeof pathIndicators[key] !== "boolean") {
        addGap(gaps, "topology.path-indicator-invalid", `topology.pathIndicators.${key} must be boolean.`, {
          path: `topology.pathIndicators.${key}`
        });
      }

      if (pathIndicators[key] === true && !relatedIds.includes(requirementId)) {
        addGap(
          gaps,
          "related-validation.missing-for-path-indicator",
          `topology.pathIndicators.${key} requires a ${requirementId} relatedValidationRequirements record.`,
          { path: "relatedValidationRequirements" }
        );
      }
    }
  }

  const dutInvolvement = isPlainRecord(topology.dutInvolvement)
    ? topology.dutInvolvement
    : null;
  const dutMode = stringValue(dutInvolvement ?? {}, "mode");

  if (!dutInvolvement) {
    addGap(gaps, "topology.dut-involvement-missing", "topology.dutInvolvement must be retained.", {
      path: "topology.dutInvolvement"
    });
  } else if (dutMode && dutMode !== "none") {
    const requiredRelation: ItriRelatedValidationRequirementId =
      dutMode === "virtual-dut" ? "V-05" : "V-06";

    if (!relatedIds.includes(requiredRelation)) {
      addGap(
        gaps,
        "related-validation.missing-for-dut",
        `topology.dutInvolvement.mode=${dutMode} requires a ${requiredRelation} relatedValidationRequirements record.`,
        { path: "relatedValidationRequirements" }
      );
    }

    if (stringArray(dutInvolvement.refs).length === 0) {
      addGap(gaps, "topology.dut-refs-missing", "DUT or traffic-generator involvement must retain refs.", {
        path: "topology.dutInvolvement.refs"
      });
    }
  }

  return [...new Set(relatedIds)];
}

function reviewTopology(
  manifest: PlainRecord,
  gaps: ItriMeasuredTrafficReviewGap[]
): ReadonlyArray<ItriRelatedValidationRequirementId> {
  const topology = manifest.topology;

  if (!isPlainRecord(topology)) {
    addGap(gaps, "topology.missing", "topology must retain source, target, direction, and path refs.", {
      path: "topology"
    });
    return [];
  }

  const packageTopologyId = stringValue(manifest, "topologyId");
  const topologyId = stringValue(topology, "topologyId");

  if (!topologyId || topologyId !== packageTopologyId) {
    addGap(gaps, "topology.id-mismatch", "topology.topologyId must match package topologyId.", {
      path: "topology.topologyId"
    });
  }

  reviewEndpoint(topology.source, "topology.source", gaps);
  reviewEndpoint(topology.target, "topology.target", gaps);

  if (!stringValue(topology, "direction")) {
    addGap(gaps, "topology.direction-missing", "topology.direction is required.", {
      path: "topology.direction"
    });
  }

  if (stringArray(topology.expectedPathRefs).length === 0) {
    addGap(gaps, "topology.expected-path-refs-missing", "topology.expectedPathRefs must retain packet-path proof refs.", {
      path: "topology.expectedPathRefs"
    });
  }

  const clockSync = topology.clockSync;

  if (!isPlainRecord(clockSync)) {
    addGap(gaps, "topology.clock-sync-missing", "topology.clockSync must retain clock source and refs.", {
      path: "topology.clockSync"
    });
  } else if (stringArray(clockSync.artifactRefs).length === 0) {
    addGap(gaps, "topology.clock-sync-refs-missing", "topology.clockSync.artifactRefs must retain time-alignment refs.", {
      path: "topology.clockSync.artifactRefs"
    });
  }

  return reviewRelatedValidationRequirements(manifest, topology, gaps);
}

function addStringRef(refs: Set<string>, value: unknown): void {
  if (typeof value === "string" && value.length > 0) {
    refs.add(value);
  }
}

function addStringRefs(refs: Set<string>, value: unknown): void {
  for (const ref of stringArray(value)) {
    refs.add(ref);
  }
}

export function collectItriMeasuredTrafficArtifactRefs(
  manifest: unknown
): ReadonlyArray<string> {
  const refs = new Set<string>();

  if (!isPlainRecord(manifest) || !isPlainRecord(manifest.artifactRefs)) {
    return [];
  }

  const artifactRefs = manifest.artifactRefs;
  addStringRef(refs, artifactRefs.commandsTranscript);
  addStringRef(refs, artifactRefs.redactions);
  addStringRefs(refs, artifactRefs.topology);

  for (const record of recordArray(artifactRefs.pingLogs)) {
    addStringRef(refs, record.ref);
  }

  for (const record of recordArray(artifactRefs.iperf3ClientLogs)) {
    addStringRef(refs, record.ref);
  }

  for (const record of recordArray(artifactRefs.iperf3ServerLogs)) {
    addStringRef(refs, record.ref);
  }

  for (const record of recordArray(artifactRefs.trafficGeneratorOutputs)) {
    addStringRef(refs, record.ref);
    addStringRef(refs, record.profileRef);
    addStringRefs(refs, record.configRefs);
  }

  if (isPlainRecord(artifactRefs.packetCaptures)) {
    addStringRefs(refs, artifactRefs.packetCaptures.captureRefs);
    addStringRef(refs, artifactRefs.packetCaptures.policyRef);
    addStringRefs(refs, artifactRefs.packetCaptures.alternatePathEvidenceRefs);
  }

  for (const relation of recordArray(manifest.relatedValidationRequirements)) {
    addStringRefs(refs, relation.artifactRefs);
  }

  return [...refs].sort();
}

function reviewArtifactRefs(
  manifest: PlainRecord,
  artifactRefCheck: ItriMeasuredTrafficArtifactRefCheck,
  gaps: ItriMeasuredTrafficReviewGap[]
): void {
  const artifactRefs = manifest.artifactRefs;

  if (!isPlainRecord(artifactRefs)) {
    addGap(gaps, "artifact-refs.missing", "artifactRefs must be retained.", {
      path: "artifactRefs"
    });
    return;
  }

  if (!stringValue(artifactRefs, "commandsTranscript")) {
    addGap(gaps, "artifact-refs.commands-transcript-missing", "artifactRefs.commandsTranscript is required.", {
      path: "artifactRefs.commandsTranscript"
    });
  }

  if (stringArray(artifactRefs.topology).length === 0) {
    addGap(gaps, "artifact-refs.topology-missing", "artifactRefs.topology must include retained topology refs.", {
      path: "artifactRefs.topology"
    });
  }

  if (!stringValue(artifactRefs, "redactions")) {
    addGap(gaps, "artifact-refs.redactions-missing", "artifactRefs.redactions is required.", {
      path: "artifactRefs.redactions"
    });
  }

  if (!isPlainRecord(artifactRefs.packetCaptures)) {
    addGap(gaps, "artifact-refs.packet-captures-missing", "artifactRefs.packetCaptures policy object is required.", {
      path: "artifactRefs.packetCaptures"
    });
  } else if (!stringValue(artifactRefs.packetCaptures, "policyRef")) {
    addGap(gaps, "artifact-refs.packet-capture-policy-missing", "artifactRefs.packetCaptures.policyRef is required.", {
      path: "artifactRefs.packetCaptures.policyRef"
    });
  }

  for (const ref of artifactRefCheck.escapedRefs) {
    addGap(gaps, "artifact-ref.escapes-package", "Artifact refs must resolve inside the retained package directory.", {
      path: ref
    });
  }

  for (const ref of artifactRefCheck.unresolvedRefs) {
    addGap(gaps, "artifact-ref.unresolved", "Declared artifact ref does not resolve inside the retained package directory.", {
      path: ref
    });
  }

  if (artifactRefCheck.declaredRefs.length === 0) {
    addGap(gaps, "artifact-ref.none-declared", "Manifest must declare package-relative raw artifact refs.", {
      path: "artifactRefs"
    });
  }
}

function metricRecordsForRequirement(
  manifest: PlainRecord,
  requirementId: ItriMeasuredTrafficRequirementId
): ReadonlyArray<PlainRecord> {
  return recordArray(manifest.parsedMetrics).filter((metric) =>
    stringArray(metric.requirementIds).includes(requirementId)
  );
}

function metricIdsForRequirement(
  manifest: PlainRecord,
  requirementId: ItriMeasuredTrafficRequirementId
): ReadonlyArray<string> {
  return metricRecordsForRequirement(manifest, requirementId)
    .map((metric) => stringValue(metric, "metricId"))
    .filter((metricId): metricId is string => Boolean(metricId));
}

function rawArtifactRefsForRequirement(
  manifest: PlainRecord,
  requirementId: ItriMeasuredTrafficRequirementId
): ReadonlyArray<string> {
  const artifactRefs = isPlainRecord(manifest.artifactRefs)
    ? manifest.artifactRefs
    : {};
  const refs = new Set<string>();

  if (requirementId === "F-07" || requirementId === "F-08") {
    for (const record of recordArray(artifactRefs.pingLogs)) {
      addStringRef(refs, record.ref);
    }
  }

  if (requirementId === "F-08" || requirementId === "F-09") {
    for (const record of recordArray(artifactRefs.iperf3ClientLogs)) {
      addStringRef(refs, record.ref);
    }
    for (const record of recordArray(artifactRefs.iperf3ServerLogs)) {
      addStringRef(refs, record.ref);
    }
    for (const record of recordArray(artifactRefs.trafficGeneratorOutputs)) {
      addStringRef(refs, record.ref);
    }
  }

  for (const metric of metricRecordsForRequirement(manifest, requirementId)) {
    addStringRefs(refs, metric.sourceArtifactRefs);
  }

  return [...refs].sort();
}

function reviewParsedMetrics(
  manifest: PlainRecord,
  coveredRequirements: ReadonlyArray<ItriMeasuredTrafficRequirementId>,
  gaps: ItriMeasuredTrafficReviewGap[]
): void {
  if (!Array.isArray(manifest.parsedMetrics)) {
    addGap(gaps, "parsed-metrics.missing", "parsedMetrics must be an array, even when the package is incomplete.", {
      path: "parsedMetrics"
    });
    return;
  }

  for (const requirementId of coveredRequirements) {
    const metrics = metricRecordsForRequirement(manifest, requirementId);

    if (metrics.length === 0) {
      addGap(
        gaps,
        "parsed-metrics.requirement-missing",
        `Parsed metrics must include at least one metric linked to ${requirementId}.`,
        { path: "parsedMetrics", requirementId }
      );
      continue;
    }

    for (const metric of metrics) {
      if (!stringValue(metric, "metricId")) {
        addGap(gaps, "parsed-metrics.metric-id-missing", "Parsed metric is missing metricId.", {
          path: "parsedMetrics.metricId",
          requirementId
        });
      }

      if (stringArray(metric.sourceArtifactRefs).length === 0) {
        addGap(
          gaps,
          "parsed-metrics.source-artifact-refs-missing",
          `Parsed metric for ${requirementId} must link back to raw sourceArtifactRefs.`,
          { path: "parsedMetrics.sourceArtifactRefs", requirementId }
        );
      }

      if (!isPlainRecord(metric.computationMethod)) {
        addGap(gaps, "parsed-metrics.computation-method-missing", "Parsed metric must retain computationMethod.", {
          path: "parsedMetrics.computationMethod",
          requirementId
        });
      }
    }
  }
}

function thresholdAuthorityRecord(manifest: PlainRecord): PlainRecord | null {
  return isPlainRecord(manifest.thresholdAuthority)
    ? manifest.thresholdAuthority
    : null;
}

function buildThresholdReview(manifest: PlainRecord): ItriMeasuredTrafficThresholdReview {
  const thresholdAuthority = thresholdAuthorityRecord(manifest);
  const unresolvedThresholdState = thresholdAuthority
    ? stringValue(thresholdAuthority, "unresolvedThresholdState")
    : null;
  const notes = thresholdAuthority
    ? stringArray(thresholdAuthority.unresolvedThresholdNotes)
    : [];

  return {
    externalAuthorityRequired: true,
    thresholdOwnerPresent: Boolean(
      thresholdAuthority && stringValue(thresholdAuthority, "thresholdOwner")
    ),
    thresholdVersionPresent: Boolean(
      thresholdAuthority && stringValue(thresholdAuthority, "thresholdVersion")
    ),
    unresolvedThresholdState,
    requirementRuleCount: thresholdAuthority
      ? recordArray(thresholdAuthority.requirementRules).length
      : 0,
    notes:
      notes.length > 0
        ? notes
        : [
            "Threshold authority is external to the importer and does not create pass/fail authority by default."
          ]
  };
}

function reviewThresholdAuthority(manifest: PlainRecord, gaps: ItriMeasuredTrafficReviewGap[]): void {
  const thresholdAuthority = thresholdAuthorityRecord(manifest);

  if (!thresholdAuthority) {
    addGap(gaps, "threshold-authority.missing", "thresholdAuthority must be retained as an external authority input object.", {
      path: "thresholdAuthority"
    });
    return;
  }

  const unresolvedState = stringValue(thresholdAuthority, "unresolvedThresholdState");

  if (!unresolvedState) {
    addGap(gaps, "threshold-authority.unresolved-state-missing", "thresholdAuthority.unresolvedThresholdState is required.", {
      path: "thresholdAuthority.unresolvedThresholdState"
    });
  }

  if (
    unresolvedState &&
    unresolvedState !== "none" &&
    stringArray(thresholdAuthority.unresolvedThresholdNotes).length === 0
  ) {
    addGap(
      gaps,
      "threshold-authority.unresolved-notes-missing",
      "thresholdAuthority.unresolvedThresholdNotes are required when thresholds are unresolved.",
      { path: "thresholdAuthority.unresolvedThresholdNotes" }
    );
  }

  if (!Array.isArray(thresholdAuthority.requirementRules)) {
    addGap(gaps, "threshold-authority.rules-missing", "thresholdAuthority.requirementRules must be an array.", {
      path: "thresholdAuthority.requirementRules"
    });
  }
}

function reviewSyntheticBoundary(
  manifest: PlainRecord,
  gaps: ItriMeasuredTrafficReviewGap[]
): ItriMeasuredTrafficSyntheticReview {
  const detectedPaths: string[] = [];
  const boundary = isPlainRecord(manifest.syntheticFallbackBoundary)
    ? manifest.syntheticFallbackBoundary
    : null;

  function visit(value: unknown, path: string): void {
    if (path.startsWith("syntheticFallbackBoundary") || path.startsWith("nonClaims")) {
      return;
    }

    if (isPlainRecord(value)) {
      if (value.sourceTier === "tier-3-synthetic") {
        detectedPaths.push(`${path}.sourceTier`);
      }

      if (hasOwn(value, "syntheticProvenance")) {
        detectedPaths.push(`${path}.syntheticProvenance`);
      }

      for (const [key, child] of Object.entries(value)) {
        visit(child, path ? `${path}.${key}` : key);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((child, index) => {
        visit(child, `${path}[${index}]`);
      });
      return;
    }

    if (
      value === "tier-3-synthetic" ||
      value === "hand-authored-shape" ||
      value === "deterministic-generated" ||
      value === "simulation-placeholder"
    ) {
      detectedPaths.push(path);
    }
  }

  visit(manifest, "");

  if (!boundary) {
    addGap(
      gaps,
      "synthetic-boundary.missing",
      "syntheticFallbackBoundary must preserve the S11 measured-package rejection rule.",
      { path: "syntheticFallbackBoundary" }
    );
  } else {
    if (
      boundary.s11ContractRef !==
      "docs/data-contracts/itri-synthetic-fallback-fixtures.md"
    ) {
      addGap(
        gaps,
        "synthetic-boundary.contract-ref",
        "syntheticFallbackBoundary.s11ContractRef must point to the S11 contract.",
        { path: "syntheticFallbackBoundary.s11ContractRef" }
      );
    }

    if (boundary.measuredPackageAllowsSyntheticSource !== false) {
      addGap(
        gaps,
        "synthetic-boundary.allows-synthetic",
        "Measured package importer must record measuredPackageAllowsSyntheticSource=false.",
        { path: "syntheticFallbackBoundary.measuredPackageAllowsSyntheticSource" }
      );
    }

    if (boundary.rejectMeasuredImportWhenSourceTierIsSynthetic !== true) {
      addGap(
        gaps,
        "synthetic-boundary.reject-rule-missing",
        "Measured package importer must reject tier-3 synthetic source tiers.",
        {
          path:
            "syntheticFallbackBoundary.rejectMeasuredImportWhenSourceTierIsSynthetic"
        }
      );
    }
  }

  for (const detectedPath of detectedPaths) {
    addGap(
      gaps,
      "synthetic-source.rejected",
      "Synthetic provenance or tier-3 source material cannot be imported as retained measured traffic evidence.",
      { path: detectedPath }
    );
  }

  return {
    syntheticSourceDetected: detectedPaths.length > 0,
    detectedPaths: [...new Set(detectedPaths)].sort(),
    measuredPackageAllowsSyntheticSource: boundary
      ? boundary.measuredPackageAllowsSyntheticSource === false
        ? false
        : null
      : null,
    rejectMeasuredImportWhenSourceTierIsSynthetic: boundary
      ? boundary.rejectMeasuredImportWhenSourceTierIsSynthetic === true
        ? true
        : null
      : null
  };
}

function reviewNonClaims(manifest: PlainRecord, gaps: ItriMeasuredTrafficReviewGap[]): void {
  const manifestNonClaims = manifest.nonClaims;

  if (!isPlainRecord(manifestNonClaims)) {
    addGap(gaps, "nonclaims.missing", "nonClaims must be present with literal false values.", {
      path: "nonClaims"
    });
    return;
  }

  for (const [key, expectedValue] of Object.entries(REQUIRED_NON_CLAIMS)) {
    if (manifestNonClaims[key] !== expectedValue) {
      addGap(gaps, "nonclaims.literal-false-missing", `nonClaims.${key} must be literal false.`, {
        path: `nonClaims.${key}`
      });
    }
  }
}

function reviewerStateFromUnknown(value: unknown): ItriMeasuredTrafficReviewerState | null {
  return typeof value === "string" &&
    ["importable", "incomplete", "redacted-reviewable", "rejected", "authority-pass"].includes(value)
    ? (value as ItriMeasuredTrafficReviewerState)
    : null;
}

function reviewerVerdicts(manifest: PlainRecord): ReadonlyArray<ReviewerVerdictLike> {
  return recordArray(manifest.reviewerVerdicts)
    .map<ReviewerVerdictLike | null>((verdict) => {
      const requirementId = requirementFromUnknown(verdict.requirementId);
      const reviewerState = reviewerStateFromUnknown(verdict.reviewerState);

      if (!requirementId || !reviewerState) {
        return null;
      }

      const reviewer = isPlainRecord(verdict.reviewer) ? verdict.reviewer : {};
      const relatedValidationRequirementRefs: ReadonlyArray<ItriRelatedValidationRequirementId> =
        stringArray(verdict.relatedValidationRequirementRefs)
          .map(relatedRequirementFromUnknown)
          .filter((requirement): requirement is ItriRelatedValidationRequirementId =>
            Boolean(requirement)
          );

      return {
        requirementId,
        reviewerState,
        evidenceScope:
          stringValue(verdict, "evidenceScope") ?? "Manifest reviewer verdict",
        sourceArtifactRefs: stringArray(verdict.sourceArtifactRefs),
        parsedMetricRefs: stringArray(verdict.parsedMetricRefs),
        thresholdRuleRefs: stringArray(verdict.thresholdRuleRefs),
        relatedValidationRequirementRefs,
        reviewer: {
          nameOrRole:
            stringValue(reviewer, "nameOrRole") ?? "F-07R1 package reviewer",
          reviewedAt:
            stringValue(reviewer, "reviewedAt") ?? new Date(0).toISOString(),
          notes: stringArray(reviewer.notes)
        }
      };
    })
    .filter((verdict): verdict is ReviewerVerdictLike => Boolean(verdict));
}

function hasPackageBlockingGaps(gaps: ReadonlyArray<ItriMeasuredTrafficReviewGap>): boolean {
  return gaps.some((gap) => gap.severity === "blocking");
}

function isRedactedReviewable(policy: PlainRecord | null): boolean {
  const level = policy ? stringValue(policy, "redactionLevel") : null;
  const auditability = policy ? stringValue(policy, "auditability") : null;

  return (
    (level === "partial" || level === "heavy") &&
    (auditability === "full" || auditability === "reviewable")
  );
}

function thresholdRuleIdsForRequirement(
  manifest: PlainRecord,
  requirementId: ItriMeasuredTrafficRequirementId
): ReadonlyArray<string> {
  const thresholdAuthority = thresholdAuthorityRecord(manifest);

  if (!thresholdAuthority) {
    return [];
  }

  return recordArray(thresholdAuthority.requirementRules)
    .filter((rule) => rule.requirementId === requirementId)
    .map((rule) => stringValue(rule, "ruleId"))
    .filter((ruleId): ruleId is string => Boolean(ruleId));
}

function hasResolvedSourceRefs(
  sourceArtifactRefs: ReadonlyArray<string>,
  artifactRefCheck: ItriMeasuredTrafficArtifactRefCheck
): boolean {
  const resolved = new Set(artifactRefCheck.resolvedRefs);

  return (
    sourceArtifactRefs.length > 0 &&
    sourceArtifactRefs.every((ref) => resolved.has(ref))
  );
}

function reviewAuthorityPassEligibility(options: {
  manifest: PlainRecord;
  requirementId: ItriMeasuredTrafficRequirementId;
  verdict: ReviewerVerdictLike;
  policy: PlainRecord | null;
  artifactRefCheck: ItriMeasuredTrafficArtifactRefCheck;
  gaps: ItriMeasuredTrafficReviewGap[];
}): void {
  const { manifest, requirementId, verdict, policy, artifactRefCheck, gaps } = options;
  const thresholdAuthority = thresholdAuthorityRecord(manifest);
  const thresholdOwner = thresholdAuthority
    ? stringValue(thresholdAuthority, "thresholdOwner")
    : null;
  const thresholdVersion = thresholdAuthority
    ? stringValue(thresholdAuthority, "thresholdVersion")
    : null;
  const unresolvedState = thresholdAuthority
    ? stringValue(thresholdAuthority, "unresolvedThresholdState")
    : null;

  if (verdict.sourceArtifactRefs.length === 0) {
    addGap(
      gaps,
      "authority-pass.source-artifact-refs-missing",
      `${requirementId} authority-pass requires retained raw sourceArtifactRefs.`,
      { requirementId, path: "reviewerVerdicts.sourceArtifactRefs" }
    );
  } else if (!hasResolvedSourceRefs(verdict.sourceArtifactRefs, artifactRefCheck)) {
    addGap(
      gaps,
      "authority-pass.source-artifact-refs-unresolved",
      `${requirementId} authority-pass sourceArtifactRefs must resolve inside the retained package.`,
      { requirementId, path: "reviewerVerdicts.sourceArtifactRefs" }
    );
  }

  if (verdict.parsedMetricRefs.length === 0) {
    addGap(
      gaps,
      "authority-pass.parsed-metric-refs-missing",
      `${requirementId} authority-pass requires parsedMetricRefs linked to raw artifacts.`,
      { requirementId, path: "reviewerVerdicts.parsedMetricRefs" }
    );
  }

  if (verdict.thresholdRuleRefs.length === 0) {
    addGap(
      gaps,
      "authority-pass.threshold-rule-refs-missing",
      `${requirementId} authority-pass requires thresholdRuleRefs from external authority rules.`,
      { requirementId, path: "reviewerVerdicts.thresholdRuleRefs" }
    );
  }

  if (!thresholdOwner) {
    addGap(
      gaps,
      "authority-pass.threshold-owner-missing",
      `${requirementId} authority-pass requires external thresholdOwner.`,
      { requirementId, path: "thresholdAuthority.thresholdOwner" }
    );
  }

  if (!thresholdVersion) {
    addGap(
      gaps,
      "authority-pass.threshold-version-missing",
      `${requirementId} authority-pass requires external thresholdVersion.`,
      { requirementId, path: "thresholdAuthority.thresholdVersion" }
    );
  }

  if (unresolvedState !== "none") {
    addGap(
      gaps,
      "authority-pass.threshold-unresolved",
      `${requirementId} authority-pass requires thresholdAuthority.unresolvedThresholdState=none.`,
      { requirementId, path: "thresholdAuthority.unresolvedThresholdState" }
    );
  }

  if (thresholdRuleIdsForRequirement(manifest, requirementId).length === 0) {
    addGap(
      gaps,
      "authority-pass.requirement-rules-missing",
      `${requirementId} authority-pass requires a thresholdAuthority.requirementRules entry for the requirement.`,
      { requirementId, path: "thresholdAuthority.requirementRules" }
    );
  }

  if (
    policy &&
    (stringValue(policy, "redactionLevel") === "audit-blocking" ||
      stringValue(policy, "auditability") === "blocked")
  ) {
    addGap(
      gaps,
      "authority-pass.redaction-auditability-blocked",
      `${requirementId} authority-pass cannot use audit-blocking redaction.`,
      { requirementId, path: "redactionPolicy.auditability" }
    );
  }
}

function buildRequirementReview(options: {
  manifest: PlainRecord;
  requirementId: ItriMeasuredTrafficRequirementId;
  packageGaps: ReadonlyArray<ItriMeasuredTrafficReviewGap>;
  policy: PlainRecord | null;
  relatedValidationRequirementRefs: ReadonlyArray<ItriRelatedValidationRequirementId>;
  artifactRefCheck: ItriMeasuredTrafficArtifactRefCheck;
  reviewedAt: string;
  syntheticSourceDetected: boolean;
}): ItriMeasuredTrafficRequirementReview {
  const {
    manifest,
    requirementId,
    packageGaps,
    policy,
    relatedValidationRequirementRefs,
    artifactRefCheck,
    reviewedAt,
    syntheticSourceDetected
  } = options;
  const rawRefs = rawArtifactRefsForRequirement(manifest, requirementId);
  const parsedMetricRefs = metricIdsForRequirement(manifest, requirementId);
  const verdict =
    reviewerVerdicts(manifest).find((candidate) => candidate.requirementId === requirementId) ??
    null;
  const gaps: ItriMeasuredTrafficReviewGap[] = packageGaps.filter(
    (gap) => !gap.requirementId || gap.requirementId === requirementId
  );

  if (rawRefs.length === 0) {
    addGap(
      gaps,
      "requirement.raw-artifact-refs-missing",
      `${requirementId} requires retained raw artifact refs before it can be imported as measured package evidence.`,
      { requirementId, path: "artifactRefs" }
    );
  }

  if (parsedMetricRefs.length === 0) {
    addGap(
      gaps,
      "requirement.parsed-metric-refs-missing",
      `${requirementId} requires parsed metrics linked to raw artifact refs.`,
      { requirementId, path: "parsedMetrics" }
    );
  }

  if (verdict?.reviewerState === "authority-pass") {
    reviewAuthorityPassEligibility({
      manifest,
      requirementId,
      verdict,
      policy,
      artifactRefCheck,
      gaps
    });
  }

  let reviewerState: ItriMeasuredTrafficReviewerState =
    verdict?.reviewerState ??
    (isRedactedReviewable(policy) ? "redacted-reviewable" : "importable");

  if (syntheticSourceDetected) {
    reviewerState = "rejected";
  } else if (gaps.some((gap) => gap.code.includes("redaction-auditability-blocked"))) {
    reviewerState = "rejected";
  } else if (hasPackageBlockingGaps(gaps)) {
    reviewerState = "incomplete";
  } else if (reviewerState === "authority-pass") {
    reviewerState = "authority-pass";
  } else if (isRedactedReviewable(policy)) {
    reviewerState = "redacted-reviewable";
  } else {
    reviewerState = "importable";
  }

  return {
    requirementId,
    reviewerState,
    evidenceScope:
      verdict?.evidenceScope ??
      "Package structure review only; no authority pass is assigned by default.",
    sourceArtifactRefs: verdict?.sourceArtifactRefs ?? rawRefs,
    parsedMetricRefs: verdict?.parsedMetricRefs ?? parsedMetricRefs,
    thresholdRuleRefs:
      verdict?.thresholdRuleRefs ?? thresholdRuleIdsForRequirement(manifest, requirementId),
    relatedValidationRequirementRefs:
      verdict?.relatedValidationRequirementRefs ?? relatedValidationRequirementRefs,
    reviewer: {
      nameOrRole: verdict?.reviewer.nameOrRole ?? "F-07R1 package reviewer",
      reviewedAt:
        verdict?.reviewer.reviewedAt &&
        Number.isFinite(Date.parse(verdict.reviewer.reviewedAt))
          ? new Date(Date.parse(verdict.reviewer.reviewedAt)).toISOString()
          : reviewedAt,
      notes:
        verdict?.reviewer.notes && verdict.reviewer.notes.length > 0
          ? verdict.reviewer.notes
          : [
              "Reviewer state is per requirement and remains a package-review state, not a runtime authority verdict."
            ]
    },
    gaps
  };
}

function packageStateFromRequirementReviews(options: {
  requirementReviews: ReadonlyArray<ItriMeasuredTrafficRequirementReview>;
  policy: PlainRecord | null;
  syntheticSourceDetected: boolean;
  escapedRefs: ReadonlyArray<string>;
}): ItriMeasuredTrafficPackageReviewState {
  const { requirementReviews, policy, syntheticSourceDetected, escapedRefs } = options;

  if (
    syntheticSourceDetected ||
    escapedRefs.length > 0 ||
    requirementReviews.some((review) => review.reviewerState === "rejected")
  ) {
    return "rejected";
  }

  if (requirementReviews.some((review) => review.reviewerState === "incomplete")) {
    return "incomplete";
  }

  if (isRedactedReviewable(policy)) {
    return "redacted-reviewable";
  }

  return "importable";
}

export function reviewItriMeasuredTrafficPackageManifest({
  manifest,
  packagePath,
  manifestPath = defaultManifestPath(packagePath),
  reviewedAt,
  artifactRefCheck
}: ItriMeasuredTrafficPackageReviewOptions): ItriMeasuredTrafficPackageReview {
  const resolvedReviewTime = parseReviewTime(reviewedAt);
  const normalizedPackagePath = normalizePackagePath(packagePath);
  const normalizedManifestPath = normalizePackagePath(manifestPath);
  const artifactSummary =
    artifactRefCheck ??
    {
      declaredRefs: collectItriMeasuredTrafficArtifactRefs(manifest),
      resolvedRefs: [],
      unresolvedRefs: [],
      escapedRefs: []
    };

  if (!isPlainRecord(manifest)) {
    const gaps: ItriMeasuredTrafficReviewGap[] = [];
    addGap(gaps, "manifest.not-object", "Manifest JSON must be an object.", {
      path: normalizedManifestPath
    });

    return closedReview({
      packagePath: normalizedPackagePath,
      manifestPath: normalizedManifestPath,
      reviewedAt: resolvedReviewTime,
      packageState: "incomplete",
      gaps
    });
  }

  const gaps: ItriMeasuredTrafficReviewGap[] = [];
  addRequiredRootFieldGaps(manifest, gaps);
  const manifestSchemaVersion = reviewSchemaVersion(manifest, gaps);
  reviewPackagePath(manifest, normalizedPackagePath, gaps);
  reviewTimestamp(manifest, "capturedAt", gaps);
  reviewTimestamp(manifest, "capturedUntil", gaps);
  reviewOwner(manifest, gaps);
  const policy = reviewRedactionPolicy(manifest, gaps);
  reviewToolVersions(manifest, gaps);
  const coveredRequirements = reviewCoveredRequirements(manifest, gaps);
  const relatedValidationRequirementRefs = reviewTopology(manifest, gaps);
  reviewArtifactRefs(manifest, artifactSummary, gaps);
  reviewParsedMetrics(manifest, coveredRequirements, gaps);
  reviewThresholdAuthority(manifest, gaps);
  const syntheticReview = reviewSyntheticBoundary(manifest, gaps);
  reviewNonClaims(manifest, gaps);

  const reviewRequirements =
    coveredRequirements.length > 0
      ? coveredRequirements
      : [...ITRI_MEASURED_TRAFFIC_REQUIREMENTS];
  const requirementReviews = reviewRequirements.map((requirementId) =>
    buildRequirementReview({
      manifest,
      requirementId,
      packageGaps: gaps,
      policy,
      relatedValidationRequirementRefs,
      artifactRefCheck: artifactSummary,
      reviewedAt: resolvedReviewTime,
      syntheticSourceDetected: syntheticReview.syntheticSourceDetected
    })
  );

  return {
    schemaVersion: ITRI_MEASURED_TRAFFIC_REVIEW_SCHEMA_VERSION,
    reviewedAt: resolvedReviewTime,
    packagePath: normalizedPackagePath,
    manifestPath: normalizedManifestPath,
    packageState: packageStateFromRequirementReviews({
      requirementReviews,
      policy,
      syntheticSourceDetected: syntheticReview.syntheticSourceDetected,
      escapedRefs: artifactSummary.escapedRefs
    }),
    manifestSchemaVersion,
    packageId: stringValue(manifest, "packageId"),
    runId: stringValue(manifest, "runId"),
    coveredRequirements: reviewRequirements,
    requirementReviews,
    gaps,
    artifactRefSummary: {
      declaredRefs: [...artifactSummary.declaredRefs],
      resolvedRefs: [...artifactSummary.resolvedRefs],
      unresolvedRefs: [...artifactSummary.unresolvedRefs],
      escapedRefs: [...artifactSummary.escapedRefs]
    },
    thresholdAuthority: buildThresholdReview(manifest),
    syntheticProvenance: syntheticReview,
    nonClaims: nonClaims()
  };
}
