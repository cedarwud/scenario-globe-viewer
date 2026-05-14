export const CUSTOMER_ORBIT_MODEL_INTAKE_PACKAGE_SCHEMA_VERSION =
  "itri.f01.orbit-model-intake.v1" as const;
export const CUSTOMER_ORBIT_MODEL_INTAKE_REVIEW_SCHEMA_VERSION =
  "itri.f01r1.orbit-model-intake-review.v1" as const;
export const CUSTOMER_ORBIT_MODEL_INTAKE_PACKAGE_ROOT =
  "output/validation/external-f01-orbit-model" as const;

export const CUSTOMER_ORBIT_MODEL_INTAKE_REQUIREMENTS = ["F-01"] as const;

export type ItriOrbitModelIntakeRequirementId =
  (typeof CUSTOMER_ORBIT_MODEL_INTAKE_REQUIREMENTS)[number];

export type ItriOrbitModelIntakeReviewerState =
  | "ready-for-design-review"
  | "incomplete"
  | "rejected";

export type ItriOrbitModelIntakePackageReviewState =
  | "missing"
  | ItriOrbitModelIntakeReviewerState;

export type ItriOrbitModelIntakeReviewGapSeverity = "blocking" | "warning";

export interface ItriOrbitModelIntakeReviewGap {
  code: string;
  message: string;
  severity: ItriOrbitModelIntakeReviewGapSeverity;
  path?: string;
  requirementId?: ItriOrbitModelIntakeRequirementId;
}

export interface ItriOrbitModelIntakeRetainedRefCheck {
  declaredRefs: ReadonlyArray<string>;
  resolvedRefs: ReadonlyArray<string>;
  unresolvedRefs: ReadonlyArray<string>;
  escapedRefs: ReadonlyArray<string>;
  privateOwnerSystemRefs: ReadonlyArray<string>;
}

export interface ItriOrbitModelIntakeRequirementReview {
  requirementId: ItriOrbitModelIntakeRequirementId;
  reviewerState: ItriOrbitModelIntakeReviewerState;
  evidenceScope: string;
  reviewer: {
    nameOrRole: string;
    reviewedAt: string;
    notes: ReadonlyArray<string>;
  };
  gaps: ReadonlyArray<ItriOrbitModelIntakeReviewGap>;
}

export interface ItriOrbitModelIntakeValidationVectorReview {
  vectorCount: number;
  completeVectorCount: number;
  publicTleSubstitutionDetected: boolean;
  detectedPublicTlePaths: ReadonlyArray<string>;
}

export interface ItriOrbitModelIntakeStatusReview {
  statusPresent: boolean;
  contractStatus: string | null;
  authorityPackageStatus: string | null;
  adapterPlanningStatus: string | null;
  implementationStatus: string | null;
  acceptanceLimitationsPresent: boolean;
  readyForDesignReview: boolean;
  runtimeImplementationClaimed: boolean;
  authorityPassClaimed: boolean;
}

export interface ItriOrbitModelIntakeSyntheticReview {
  syntheticSourceDetected: boolean;
  detectedPaths: ReadonlyArray<string>;
  rejectIntakeWhenSourceTierIsSynthetic: true | null;
}

export interface ItriOrbitModelIntakeNonClaims {
  modelPackagePresentInRepo: false;
  runtimeAdapterImplementedByThisContract: false;
  publicTleSubstitutesForItriModel: false;
  syntheticDataProvidesOrbitalTruth: false;
  measuredTrafficTruth: false;
  externalStackVerdict: false;
  fullItriAcceptance: false;
}

export interface ItriOrbitModelIntakeReview {
  schemaVersion: typeof CUSTOMER_ORBIT_MODEL_INTAKE_REVIEW_SCHEMA_VERSION;
  reviewedAt: string;
  packagePath: string;
  manifestPath: string;
  packageState: ItriOrbitModelIntakePackageReviewState;
  manifestSchemaVersion: string | null;
  packageId: string | null;
  sourceTier: string | null;
  coveredRequirements: ReadonlyArray<ItriOrbitModelIntakeRequirementId>;
  requirementReviews: ReadonlyArray<ItriOrbitModelIntakeRequirementReview>;
  gaps: ReadonlyArray<ItriOrbitModelIntakeReviewGap>;
  validationVectors: ItriOrbitModelIntakeValidationVectorReview;
  retainedRefSummary: ItriOrbitModelIntakeRetainedRefCheck;
  status: ItriOrbitModelIntakeStatusReview;
  syntheticProvenance: ItriOrbitModelIntakeSyntheticReview;
  nonClaims: ItriOrbitModelIntakeNonClaims;
}

export interface ItriOrbitModelIntakeReviewOptions {
  manifest: unknown;
  packagePath: string;
  manifestPath?: string;
  reviewedAt?: string;
  retainedRefCheck?: ItriOrbitModelIntakeRetainedRefCheck;
}

export interface ItriOrbitModelIntakeClosedReviewOptions {
  packagePath: string;
  manifestPath?: string;
  reviewedAt?: string;
}

export interface ItriOrbitModelIntakeMalformedReviewOptions
  extends ItriOrbitModelIntakeClosedReviewOptions {
  parseError: string;
}

type PlainRecord = Record<string, unknown>;

const REQUIRED_METADATA_FIELDS = [
  "packageId",
  "owner",
  "receivedAt",
  "redistributionPolicy",
  "licenseUseNotes",
  "reviewer"
] as const;

const REQUIRED_ROOT_FIELDS = [
  "schemaVersion",
  "packageId",
  "owner",
  "receivedAt",
  "redistributionPolicy",
  "licenseUseNotes",
  "reviewer",
  "sourceTier",
  "modelIdentity",
  "inputContract",
  "outputContract",
  "validationVectors",
  "status"
] as const;

const ACCEPTED_AUTHORITY_SOURCE_TIERS = [
  "tier-1-itri-authority",
  "tier-1-owner-approved-orbit-model-authority"
] as const;

const REQUIRED_NON_CLAIMS: ItriOrbitModelIntakeNonClaims = {
  modelPackagePresentInRepo: false,
  runtimeAdapterImplementedByThisContract: false,
  publicTleSubstitutesForItriModel: false,
  syntheticDataProvidesOrbitalTruth: false,
  measuredTrafficTruth: false,
  externalStackVerdict: false,
  fullItriAcceptance: false
};

const EMPTY_RETAINED_REF_CHECK: ItriOrbitModelIntakeRetainedRefCheck = {
  declaredRefs: [],
  resolvedRefs: [],
  unresolvedRefs: [],
  escapedRefs: [],
  privateOwnerSystemRefs: []
};

const REJECT_GAP_CODES = [
  "package.path-outside-retained-root",
  "manifest.path-outside-package",
  "source-tier.public-tle-promoted",
  "source-tier.synthetic",
  "synthetic-source.rejected",
  "retained-ref.escapes-package",
  "retained-ref.unresolved",
  "validation-vector.public-tle-substitute",
  "status.authority-pass-claimed",
  "status.runtime-implementation-claimed",
  "nonclaims.field-must-be-false"
] as const;

const RETAINED_REF_KEY_NAMES = new Set([
  "checksumref",
  "checksumrefs",
  "expectedoutputref",
  "expectedoutputrefs",
  "framedefinitionref",
  "framedefinitionrefs",
  "inputref",
  "inputrefs",
  "outputref",
  "outputrefs",
  "packageref",
  "packagerefs",
  "retainedinputref",
  "retainedinputrefs",
  "retainedoutputref",
  "retainedoutputrefs",
  "retainedpath",
  "retainedpaths",
  "retainedref",
  "retainedrefs",
  "sourcepackagelocation",
  "sourcepackageref",
  "sourcepackagerefs"
]);

function nonClaims(): ItriOrbitModelIntakeNonClaims {
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
  gaps: ItriOrbitModelIntakeReviewGap[],
  code: string,
  message: string,
  options: {
    severity?: ItriOrbitModelIntakeReviewGapSeverity;
    path?: string;
    requirementId?: ItriOrbitModelIntakeRequirementId;
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

export function isAllowedItriOrbitModelIntakePackagePath(
  packagePath: string
): boolean {
  const normalized = normalizePackagePath(packagePath);
  const root = CUSTOMER_ORBIT_MODEL_INTAKE_PACKAGE_ROOT;

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

function closedRequirementReview(
  reviewedAt: string,
  message: string,
  reviewerState: ItriOrbitModelIntakeReviewerState
): ItriOrbitModelIntakeRequirementReview {
  return {
    requirementId: "F-01",
    reviewerState,
    evidenceScope:
      "No F-01 orbit-model intake package reached ready-for-design-review.",
    reviewer: {
      nameOrRole: "F-01R1 orbit-model intake reviewer",
      reviewedAt,
      notes: [message]
    },
    gaps: [
      {
        code: reviewerState === "rejected" ? "package.rejected" : "package.missing",
        message,
        severity: "blocking",
        requirementId: "F-01"
      }
    ]
  };
}

function emptyValidationVectorReview(): ItriOrbitModelIntakeValidationVectorReview {
  return {
    vectorCount: 0,
    completeVectorCount: 0,
    publicTleSubstitutionDetected: false,
    detectedPublicTlePaths: []
  };
}

function emptyStatusReview(): ItriOrbitModelIntakeStatusReview {
  return {
    statusPresent: false,
    contractStatus: null,
    authorityPackageStatus: null,
    adapterPlanningStatus: null,
    implementationStatus: null,
    acceptanceLimitationsPresent: false,
    readyForDesignReview: false,
    runtimeImplementationClaimed: false,
    authorityPassClaimed: false
  };
}

function closedReview(
  options: ItriOrbitModelIntakeClosedReviewOptions & {
    packageState: ItriOrbitModelIntakePackageReviewState;
    gaps: ReadonlyArray<ItriOrbitModelIntakeReviewGap>;
    manifestSchemaVersion?: string | null;
  }
): ItriOrbitModelIntakeReview {
  const reviewedAt = parseReviewTime(options.reviewedAt);
  const message =
    options.gaps[0]?.message ??
    "Orbit-model intake review did not reach ready-for-design-review.";
  const reviewerState: ItriOrbitModelIntakeReviewerState =
    options.packageState === "rejected" ? "rejected" : "incomplete";

  return {
    schemaVersion: CUSTOMER_ORBIT_MODEL_INTAKE_REVIEW_SCHEMA_VERSION,
    reviewedAt,
    packagePath: normalizePackagePath(options.packagePath),
    manifestPath: options.manifestPath ?? defaultManifestPath(options.packagePath),
    packageState: options.packageState,
    manifestSchemaVersion: options.manifestSchemaVersion ?? null,
    packageId: null,
    sourceTier: null,
    coveredRequirements: ["F-01"],
    requirementReviews: [
      closedRequirementReview(reviewedAt, message, reviewerState)
    ],
    gaps: options.gaps,
    validationVectors: emptyValidationVectorReview(),
    retainedRefSummary: { ...EMPTY_RETAINED_REF_CHECK },
    status: emptyStatusReview(),
    syntheticProvenance: {
      syntheticSourceDetected: false,
      detectedPaths: [],
      rejectIntakeWhenSourceTierIsSynthetic: null
    },
    nonClaims: nonClaims()
  };
}

export function reviewMissingItriOrbitModelIntakePackage(
  options: ItriOrbitModelIntakeClosedReviewOptions
): ItriOrbitModelIntakeReview {
  const gaps: ItriOrbitModelIntakeReviewGap[] = [];
  addGap(
    gaps,
    "package.missing",
    "No retained F-01 orbit-model intake package exists at the explicitly named path.",
    { path: normalizePackagePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "missing",
    gaps
  });
}

export function reviewMissingItriOrbitModelIntakeManifest(
  options: ItriOrbitModelIntakeClosedReviewOptions
): ItriOrbitModelIntakeReview {
  const gaps: ItriOrbitModelIntakeReviewGap[] = [];
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

export function reviewMalformedItriOrbitModelIntakeManifest(
  options: ItriOrbitModelIntakeMalformedReviewOptions
): ItriOrbitModelIntakeReview {
  const gaps: ItriOrbitModelIntakeReviewGap[] = [];
  addGap(gaps, "manifest.malformed-json", options.parseError, {
    path: options.manifestPath ?? defaultManifestPath(options.packagePath)
  });

  return closedReview({
    ...options,
    packageState: "incomplete",
    gaps
  });
}

export function reviewRejectedItriOrbitModelIntakePackagePath(
  options: ItriOrbitModelIntakeClosedReviewOptions
): ItriOrbitModelIntakeReview {
  const gaps: ItriOrbitModelIntakeReviewGap[] = [];
  addGap(
    gaps,
    "package.path-outside-retained-root",
    `Orbit-model intake package path must be under ${CUSTOMER_ORBIT_MODEL_INTAKE_PACKAGE_ROOT}/.`,
    { path: normalizePackagePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "rejected",
    gaps
  });
}

export function reviewRejectedItriOrbitModelIntakeManifestPath(
  options: ItriOrbitModelIntakeClosedReviewOptions
): ItriOrbitModelIntakeReview {
  const gaps: ItriOrbitModelIntakeReviewGap[] = [];
  addGap(
    gaps,
    "manifest.path-outside-package",
    "Explicit manifest path must resolve inside the explicitly named orbit-model intake package directory.",
    { path: options.manifestPath ?? defaultManifestPath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "rejected",
    gaps
  });
}

function hasMeaningfulValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isPlainRecord(value)) {
    return Object.keys(value).length > 0;
  }

  return false;
}

function addRequiredRootFieldGaps(
  manifest: PlainRecord,
  gaps: ItriOrbitModelIntakeReviewGap[]
): void {
  for (const field of REQUIRED_ROOT_FIELDS) {
    if (!hasOwn(manifest, field)) {
      addGap(gaps, "manifest.required-field-missing", `Manifest is missing required field ${field}.`, {
        path: field
      });
    }
  }
}

function reviewSchemaVersion(
  manifest: PlainRecord,
  gaps: ItriOrbitModelIntakeReviewGap[]
): string | null {
  const schemaVersion = stringValue(manifest, "schemaVersion");

  if (schemaVersion !== CUSTOMER_ORBIT_MODEL_INTAKE_PACKAGE_SCHEMA_VERSION) {
    addGap(
      gaps,
      "manifest.schema-version",
      `Manifest schemaVersion must be ${CUSTOMER_ORBIT_MODEL_INTAKE_PACKAGE_SCHEMA_VERSION}.`,
      { path: "schemaVersion" }
    );
  }

  return schemaVersion;
}

function reviewPackagePath(
  packagePath: string,
  gaps: ItriOrbitModelIntakeReviewGap[]
): void {
  const normalizedPackagePath = normalizePackagePath(packagePath);

  if (!isAllowedItriOrbitModelIntakePackagePath(normalizedPackagePath)) {
    addGap(
      gaps,
      "package.path-outside-retained-root",
      `Package path must be explicitly under ${CUSTOMER_ORBIT_MODEL_INTAKE_PACKAGE_ROOT}/.`,
      { path: "packagePath" }
    );
  }
}

function reviewRequiredMetadata(
  manifest: PlainRecord,
  gaps: ItriOrbitModelIntakeReviewGap[]
): void {
  for (const field of REQUIRED_METADATA_FIELDS) {
    if (!hasMeaningfulValue(manifest[field])) {
      addGap(gaps, "metadata.required-field-missing", `Manifest metadata field ${field} is required.`, {
        path: field
      });
    }
  }

  const receivedAt = stringValue(manifest, "receivedAt");
  if (!receivedAt || !Number.isFinite(Date.parse(receivedAt))) {
    addGap(gaps, "metadata.received-at-invalid", "receivedAt must be an ISO-8601 timestamp.", {
      path: "receivedAt"
    });
  }
}

function reviewRedistributionPolicy(
  manifest: PlainRecord,
  gaps: ItriOrbitModelIntakeReviewGap[]
): void {
  const policy = manifest.redistributionPolicy;

  if (!hasMeaningfulValue(policy)) {
    return;
  }

  if (isPlainRecord(policy)) {
    const projectedArtifactsAllowed =
      typeof policy.projectedArtifactsAllowed === "boolean" ||
      typeof policy.projectionAllowed === "boolean";

    if (!projectedArtifactsAllowed) {
      addGap(
        gaps,
        "redistribution-policy.projected-artifacts-unspecified",
        "redistributionPolicy must explicitly say whether projected artifacts are allowed.",
        { path: "redistributionPolicy.projectedArtifactsAllowed" }
      );
    }
    return;
  }

  if (typeof policy === "string") {
    const lowerPolicy = policy.toLowerCase();
    const mentionsProjectedArtifacts = lowerPolicy.includes("projected artifact");
    const statesAllowed =
      lowerPolicy.includes("allowed") ||
      lowerPolicy.includes("not allowed") ||
      lowerPolicy.includes("disallowed") ||
      lowerPolicy.includes("prohibited");

    if (!mentionsProjectedArtifacts || !statesAllowed) {
      addGap(
        gaps,
        "redistribution-policy.projected-artifacts-unspecified",
        "redistributionPolicy text must explicitly say whether projected artifacts are allowed.",
        { path: "redistributionPolicy" }
      );
    }
  }
}

function sourceTierLooksPublicTle(sourceTier: string | null): boolean {
  if (!sourceTier) {
    return false;
  }

  return /\b(public[- ]?tle|celestrak|space[- ]track|tle)\b/iu.test(sourceTier);
}

function reviewSourceTier(
  manifest: PlainRecord,
  gaps: ItriOrbitModelIntakeReviewGap[]
): string | null {
  const sourceTier = stringValue(manifest, "sourceTier");

  if (!sourceTier) {
    addGap(gaps, "source-tier.missing", "sourceTier must name a retained Tier 1 authority context.", {
      path: "sourceTier"
    });
    return null;
  }

  if (sourceTier === "tier-3-synthetic") {
    addGap(
      gaps,
      "source-tier.synthetic",
      "Tier-3 synthetic source material cannot support F-01 orbit-model intake readiness.",
      { path: "sourceTier" }
    );
    return sourceTier;
  }

  if (sourceTierLooksPublicTle(sourceTier)) {
    addGap(
      gaps,
      "source-tier.public-tle-promoted",
      "Public TLE, CelesTrak, or Space-Track source tiers must not be promoted to customer orbit-model authority.",
      { path: "sourceTier" }
    );
    return sourceTier;
  }

  if (
    !(ACCEPTED_AUTHORITY_SOURCE_TIERS as ReadonlyArray<string>).includes(sourceTier)
  ) {
    addGap(
      gaps,
      "source-tier.not-retained-authority",
      "sourceTier must indicate retained customer or owner-approved orbit-model authority context.",
      { path: "sourceTier" }
    );
  }

  return sourceTier;
}

function reviewStringArrayField(
  record: PlainRecord,
  key: string,
  code: string,
  message: string,
  gaps: ItriOrbitModelIntakeReviewGap[],
  pathPrefix = ""
): void {
  if (stringArray(record[key]).length === 0) {
    addGap(gaps, code, message, {
      path: pathPrefix ? `${pathPrefix}.${key}` : key
    });
  }
}

function reviewModelIdentity(
  manifest: PlainRecord,
  gaps: ItriOrbitModelIntakeReviewGap[]
): void {
  const modelIdentity = manifest.modelIdentity;

  if (!isPlainRecord(modelIdentity)) {
    addGap(gaps, "model-identity.missing", "modelIdentity must be an object.", {
      path: "modelIdentity"
    });
    return;
  }

  for (const key of ["modelName", "modelVersion", "propagationMethod"] as const) {
    if (!stringValue(modelIdentity, key)) {
      addGap(gaps, "model-identity.field-missing", `modelIdentity.${key} is required.`, {
        path: `modelIdentity.${key}`
      });
    }
  }

  const coordinateFrames = modelIdentity.coordinateFrames;
  if (!isPlainRecord(coordinateFrames)) {
    addGap(
      gaps,
      "model-identity.coordinate-frames-missing",
      "modelIdentity.coordinateFrames must declare input/output frames and definition refs.",
      { path: "modelIdentity.coordinateFrames" }
    );
  } else {
    reviewStringArrayField(
      coordinateFrames,
      "inputFrames",
      "model-identity.input-frames-missing",
      "modelIdentity.coordinateFrames.inputFrames must be non-empty.",
      gaps,
      "modelIdentity.coordinateFrames"
    );
    reviewStringArrayField(
      coordinateFrames,
      "outputFrames",
      "model-identity.output-frames-missing",
      "modelIdentity.coordinateFrames.outputFrames must be non-empty.",
      gaps,
      "modelIdentity.coordinateFrames"
    );
    reviewStringArrayField(
      coordinateFrames,
      "frameDefinitionRefs",
      "model-identity.frame-definition-refs-missing",
      "modelIdentity.coordinateFrames.frameDefinitionRefs must be non-empty.",
      gaps,
      "modelIdentity.coordinateFrames"
    );
  }

  if (!stringValue(modelIdentity, "timeSystem")) {
    addGap(gaps, "model-identity.time-system-missing", "modelIdentity.timeSystem is required.", {
      path: "modelIdentity.timeSystem"
    });
  }

  const epochRules = modelIdentity.epochRules;
  if (!isPlainRecord(epochRules)) {
    addGap(gaps, "model-identity.epoch-rules-missing", "modelIdentity.epochRules is required.", {
      path: "modelIdentity.epochRules"
    });
    return;
  }

  reviewStringArrayField(
    epochRules,
    "acceptedEpochFormats",
    "model-identity.epoch-formats-missing",
    "modelIdentity.epochRules.acceptedEpochFormats must be non-empty.",
    gaps,
    "modelIdentity.epochRules"
  );

  if (!stringValue(epochRules, "epochSource")) {
    addGap(
      gaps,
      "model-identity.epoch-source-missing",
      "modelIdentity.epochRules.epochSource is required.",
      { path: "modelIdentity.epochRules.epochSource" }
    );
  }

  if (typeof epochRules.relativeTimeAllowed !== "boolean") {
    addGap(
      gaps,
      "model-identity.relative-time-allowed-missing",
      "modelIdentity.epochRules.relativeTimeAllowed must be boolean.",
      { path: "modelIdentity.epochRules.relativeTimeAllowed" }
    );
  }
}

function reviewInputContract(
  manifest: PlainRecord,
  gaps: ItriOrbitModelIntakeReviewGap[]
): void {
  const inputContract = manifest.inputContract;

  if (!isPlainRecord(inputContract)) {
    addGap(gaps, "input-contract.missing", "inputContract must be an object.", {
      path: "inputContract"
    });
    return;
  }

  for (const key of ["scenarioTime", "satelliteIdentity", "orbitStateInputs"] as const) {
    if (!isPlainRecord(inputContract[key])) {
      addGap(gaps, "input-contract.section-missing", `inputContract.${key} is required.`, {
        path: `inputContract.${key}`
      });
    }
  }

  const units = inputContract.units;
  if (!isPlainRecord(units) || Object.keys(units).length === 0) {
    addGap(
      gaps,
      "input-contract.units-missing",
      "inputContract.units must declare units for model-facing numeric inputs.",
      { path: "inputContract.units" }
    );
  }
}

function outputHasSampleShape(outputContract: PlainRecord): boolean {
  const sampleOutputShape = isPlainRecord(outputContract.sampleOutputShape)
    ? outputContract.sampleOutputShape
    : null;
  const samples = recordArray(outputContract.samples);

  return (
    Boolean(sampleOutputShape && isPlainRecord(sampleOutputShape.position)) ||
    samples.some((sample) => isPlainRecord(sample.position))
  );
}

function outputHasUncertaintyOrTolerance(outputContract: PlainRecord): boolean {
  if (
    isPlainRecord(outputContract.uncertainty) ||
    isPlainRecord(outputContract.tolerances) ||
    recordArray(outputContract.tolerances).length > 0
  ) {
    return true;
  }

  return recordArray(outputContract.samples).some(
    (sample) => isPlainRecord(sample.uncertainty) || isPlainRecord(sample.tolerance)
  );
}

function reviewOutputContract(
  manifest: PlainRecord,
  gaps: ItriOrbitModelIntakeReviewGap[]
): void {
  const outputContract = manifest.outputContract;

  if (!isPlainRecord(outputContract)) {
    addGap(gaps, "output-contract.missing", "outputContract must be an object.", {
      path: "outputContract"
    });
    return;
  }

  if (!outputHasSampleShape(outputContract)) {
    addGap(
      gaps,
      "output-contract.sample-shape-missing",
      "outputContract must include position/velocity samples or a sample output shape.",
      { path: "outputContract.samples" }
    );
  }

  const labels = outputContract.frameTimeLabels;
  if (!isPlainRecord(labels)) {
    addGap(
      gaps,
      "output-contract.frame-time-labels-missing",
      "outputContract.frameTimeLabels must declare output frame and time labels.",
      { path: "outputContract.frameTimeLabels" }
    );
  } else {
    for (const key of ["outputFrame", "timeSystem", "epochId"] as const) {
      if (!stringValue(labels, key)) {
        addGap(
          gaps,
          "output-contract.frame-time-label-missing",
          `outputContract.frameTimeLabels.${key} is required.`,
          { path: `outputContract.frameTimeLabels.${key}` }
        );
      }
    }
  }

  if (!outputHasUncertaintyOrTolerance(outputContract)) {
    addGap(
      gaps,
      "output-contract.uncertainty-tolerance-missing",
      "outputContract must include uncertainty or tolerance fields.",
      { path: "outputContract.uncertainty" }
    );
  }
}

function hasInputOrRetainedInputRef(vector: PlainRecord): boolean {
  return (
    hasMeaningfulValue(vector.input) ||
    hasMeaningfulValue(vector.retainedInputRef) ||
    hasMeaningfulValue(vector.inputRef)
  );
}

function hasExpectedOutputOrRetainedOutputRef(vector: PlainRecord): boolean {
  return (
    hasMeaningfulValue(vector.expectedOutput) ||
    hasMeaningfulValue(vector.retainedOutputRef) ||
    hasMeaningfulValue(vector.expectedOutputRef) ||
    hasMeaningfulValue(vector.outputRef)
  );
}

function publicTlePathMatches(value: string): boolean {
  return /\b(celestrak|space[- ]track|public[- ]tle|public tle|tle substitute|tle output)\b/iu.test(value);
}

function collectPublicTleSubstitutionPaths(
  value: unknown,
  paths: string[],
  pathName = ""
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectPublicTleSubstitutionPaths(entry, paths, `${pathName}[${index}]`)
    );
    return;
  }

  if (!isPlainRecord(value)) {
    if (typeof value === "string" && publicTlePathMatches(value)) {
      paths.push(pathName);
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = pathName ? `${pathName}.${key}` : key;

    if (key === "sourceTier" && typeof child === "string" && sourceTierLooksPublicTle(child)) {
      paths.push(childPath);
    }

    collectPublicTleSubstitutionPaths(child, paths, childPath);
  }
}

function reviewValidationVectors(
  manifest: PlainRecord,
  gaps: ItriOrbitModelIntakeReviewGap[]
): ItriOrbitModelIntakeValidationVectorReview {
  const validationVectors = manifest.validationVectors;
  const vectorRecords = recordArray(validationVectors);
  const detectedPublicTlePaths: string[] = [];
  let completeVectorCount = 0;

  if (!Array.isArray(validationVectors) || vectorRecords.length === 0) {
    addGap(
      gaps,
      "validation-vectors.missing",
      "validationVectors must include owner-approved retained vectors for adapter planning readiness.",
      { path: "validationVectors" }
    );
    return {
      vectorCount: 0,
      completeVectorCount: 0,
      publicTleSubstitutionDetected: false,
      detectedPublicTlePaths: []
    };
  }

  arrayValue(validationVectors).forEach((entry, index) => {
    if (!isPlainRecord(entry)) {
      addGap(
        gaps,
        "validation-vector.entry-invalid",
        "Each validationVectors entry must be an object.",
        { path: `validationVectors[${index}]` }
      );
      return;
    }

    const vectorGapsBefore = gaps.length;

    if (!stringValue(entry, "caseId")) {
      addGap(gaps, "validation-vector.case-id-missing", "validation vector caseId is required.", {
        path: `validationVectors[${index}].caseId`
      });
    }

    if (!stringValue(entry, "casePurpose")) {
      addGap(
        gaps,
        "validation-vector.case-purpose-missing",
        "validation vector casePurpose is required.",
        { path: `validationVectors[${index}].casePurpose` }
      );
    }

    if (!hasInputOrRetainedInputRef(entry)) {
      addGap(
        gaps,
        "validation-vector.input-missing",
        "validation vector must include input or retained input ref.",
        { path: `validationVectors[${index}].input` }
      );
    }

    if (!hasExpectedOutputOrRetainedOutputRef(entry)) {
      addGap(
        gaps,
        "validation-vector.expected-output-missing",
        "validation vector must include expectedOutput or retained output ref.",
        { path: `validationVectors[${index}].expectedOutput` }
      );
    }

    if (!hasMeaningfulValue(entry.tolerances)) {
      addGap(
        gaps,
        "validation-vector.tolerances-missing",
        "validation vector tolerances are required.",
        { path: `validationVectors[${index}].tolerances` }
      );
    }

    if (!hasMeaningfulValue(entry.comparisonMethod)) {
      addGap(
        gaps,
        "validation-vector.comparison-method-missing",
        "validation vector comparisonMethod is required.",
        { path: `validationVectors[${index}].comparisonMethod` }
      );
    }

    if (!hasMeaningfulValue(entry.failureHandling)) {
      addGap(
        gaps,
        "validation-vector.failure-handling-missing",
        "validation vector failureHandling is required.",
        { path: `validationVectors[${index}].failureHandling` }
      );
    }

    collectPublicTleSubstitutionPaths(entry, detectedPublicTlePaths, `validationVectors[${index}]`);

    if (vectorGapsBefore === gaps.length) {
      completeVectorCount += 1;
    }
  });

  for (const detectedPath of detectedPublicTlePaths) {
    addGap(
      gaps,
      "validation-vector.public-tle-substitute",
      "Validation vectors must not be replaced by public TLE, CelesTrak, or Space-Track output.",
      { path: detectedPath }
    );
  }

  return {
    vectorCount: vectorRecords.length,
    completeVectorCount,
    publicTleSubstitutionDetected: detectedPublicTlePaths.length > 0,
    detectedPublicTlePaths: [...new Set(detectedPublicTlePaths)].sort()
  };
}

function reviewStatus(
  manifest: PlainRecord,
  gaps: ItriOrbitModelIntakeReviewGap[]
): ItriOrbitModelIntakeStatusReview {
  const status = manifest.status;

  if (!isPlainRecord(status)) {
    addGap(gaps, "status.missing", "status must carry intake readiness status and nonClaims.", {
      path: "status"
    });
    return emptyStatusReview();
  }

  const contractStatus = stringValue(status, "contractStatus");
  const authorityPackageStatus = stringValue(status, "authorityPackageStatus");
  const adapterPlanningStatus = stringValue(status, "adapterPlanningStatus");
  const implementationStatus = stringValue(status, "implementationStatus");
  const statusValues = [
    contractStatus,
    authorityPackageStatus,
    adapterPlanningStatus,
    implementationStatus
  ].filter((value): value is string => Boolean(value));
  const authorityPassClaimed = statusValues.some((value) =>
    /authority[- ]?pass|accepted-authority|full-authority/iu.test(value)
  );
  const runtimeImplementationClaimed =
    implementationStatus !== "not-authorized" &&
    implementationStatus !== "separate-slice-required";

  if (!contractStatus) {
    addGap(gaps, "status.contract-status-missing", "status.contractStatus is required.", {
      path: "status.contractStatus"
    });
  }

  if (authorityPackageStatus !== "vectors-complete") {
    addGap(
      gaps,
      "status.authority-package-not-vectors-complete",
      "status.authorityPackageStatus must be vectors-complete for F-01R1 design-review readiness.",
      { path: "status.authorityPackageStatus" }
    );
  }

  if (adapterPlanningStatus !== "ready-for-design-review") {
    addGap(
      gaps,
      "status.adapter-planning-not-ready",
      "status.adapterPlanningStatus must be ready-for-design-review for the positive F-01R1 state.",
      { path: "status.adapterPlanningStatus" }
    );
  }

  if (runtimeImplementationClaimed) {
    addGap(
      gaps,
      "status.runtime-implementation-claimed",
      "F-01R1 may not claim runtime adapter implementation or integration.",
      { path: "status.implementationStatus" }
    );
  }

  if (authorityPassClaimed) {
    addGap(
      gaps,
      "status.authority-pass-claimed",
      "F-01R1 may not emit authority-pass or full-authority reviewer states.",
      { path: "status" }
    );
  }

  if (stringArray(status.acceptanceLimitations).length === 0) {
    addGap(
      gaps,
      "status.acceptance-limitations-missing",
      "status.acceptanceLimitations must preserve review limitations.",
      { path: "status.acceptanceLimitations" }
    );
  }

  return {
    statusPresent: true,
    contractStatus,
    authorityPackageStatus,
    adapterPlanningStatus,
    implementationStatus,
    acceptanceLimitationsPresent: stringArray(status.acceptanceLimitations).length > 0,
    readyForDesignReview: adapterPlanningStatus === "ready-for-design-review",
    runtimeImplementationClaimed,
    authorityPassClaimed
  };
}

function statusNonClaimsRecord(manifest: PlainRecord): PlainRecord | null {
  const status = isPlainRecord(manifest.status) ? manifest.status : null;
  const statusNonClaims = status && isPlainRecord(status.nonClaims)
    ? status.nonClaims
    : null;

  return statusNonClaims;
}

function reviewNonClaims(
  manifest: PlainRecord,
  gaps: ItriOrbitModelIntakeReviewGap[]
): void {
  const manifestNonClaims = statusNonClaimsRecord(manifest);

  if (!manifestNonClaims) {
    addGap(
      gaps,
      "nonclaims.missing",
      "status.nonClaims must be present with literal false values.",
      { path: "status.nonClaims" }
    );
    return;
  }

  for (const [key, expectedValue] of Object.entries(REQUIRED_NON_CLAIMS)) {
    if (!hasOwn(manifestNonClaims, key)) {
      addGap(gaps, "nonclaims.field-missing", `status.nonClaims.${key} is required.`, {
        path: `status.nonClaims.${key}`
      });
      continue;
    }

    if (manifestNonClaims[key] !== expectedValue) {
      addGap(
        gaps,
        "nonclaims.field-must-be-false",
        `status.nonClaims.${key} must be literal false.`,
        { path: `status.nonClaims.${key}` }
      );
    }
  }
}

function collectSyntheticPaths(
  value: unknown,
  paths: string[],
  pathName = ""
): void {
  if (pathName.startsWith("status.nonClaims")) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectSyntheticPaths(entry, paths, `${pathName}[${index}]`));
    return;
  }

  if (!isPlainRecord(value)) {
    if (
      value === "tier-3-synthetic" ||
      value === "hand-authored-shape" ||
      value === "deterministic-generated" ||
      value === "simulation-placeholder"
    ) {
      paths.push(pathName);
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = pathName ? `${pathName}.${key}` : key;

    if (key === "syntheticProvenance") {
      paths.push(childPath);
    }

    if (key === "sourceTier" && child === "tier-3-synthetic") {
      paths.push(childPath);
    }

    collectSyntheticPaths(child, paths, childPath);
  }
}

function reviewSyntheticBoundary(
  manifest: PlainRecord,
  gaps: ItriOrbitModelIntakeReviewGap[]
): ItriOrbitModelIntakeSyntheticReview {
  const detectedPaths: string[] = [];
  collectSyntheticPaths(manifest, detectedPaths);

  for (const detectedPath of detectedPaths) {
    addGap(
      gaps,
      "synthetic-source.rejected",
      "Synthetic provenance or Tier-3 source material cannot support F-01 orbit-model authority intake readiness.",
      { path: detectedPath }
    );
  }

  return {
    syntheticSourceDetected: detectedPaths.length > 0,
    detectedPaths: [...new Set(detectedPaths)].sort(),
    rejectIntakeWhenSourceTierIsSynthetic: detectedPaths.length > 0 ? true : null
  };
}

function retainedRefKey(key: string): boolean {
  return RETAINED_REF_KEY_NAMES.has(key.toLowerCase());
}

function addRetainedRefValue(refs: Set<string>, value: unknown): void {
  if (typeof value === "string" && value.length > 0) {
    refs.add(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string" && entry.length > 0) {
        refs.add(entry);
      }
    }
  }
}

function collectRetainedRefValues(value: unknown, refs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectRetainedRefValues(entry, refs);
    }
    return;
  }

  if (!isPlainRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (retainedRefKey(key)) {
      addRetainedRefValue(refs, child);
    }

    collectRetainedRefValues(child, refs);
  }
}

export function collectItriOrbitModelIntakeRetainedRefs(
  manifest: unknown
): ReadonlyArray<string> {
  const refs = new Set<string>();
  collectRetainedRefValues(manifest, refs);

  return [...refs].sort();
}

function reviewRetainedRefs(
  retainedRefCheck: ItriOrbitModelIntakeRetainedRefCheck,
  gaps: ItriOrbitModelIntakeReviewGap[]
): void {
  for (const ref of retainedRefCheck.escapedRefs) {
    addGap(
      gaps,
      "retained-ref.escapes-package",
      "Retained refs, checksum refs, and source-package refs must resolve inside the explicitly named package unless they use a private owner-system ref.",
      { path: ref }
    );
  }

  for (const ref of retainedRefCheck.unresolvedRefs) {
    addGap(
      gaps,
      "retained-ref.unresolved",
      "Repo-local retained refs, checksum refs, and source-package refs must resolve inside the explicitly named package.",
      { path: ref }
    );
  }
}

function hasBlockingGaps(
  gaps: ReadonlyArray<ItriOrbitModelIntakeReviewGap>
): boolean {
  return gaps.some((gap) => gap.severity === "blocking");
}

function hasRejectGap(gaps: ReadonlyArray<ItriOrbitModelIntakeReviewGap>): boolean {
  return gaps.some((gap) =>
    (REJECT_GAP_CODES as ReadonlyArray<string>).includes(gap.code)
  );
}

function packageStateFromGaps(
  gaps: ReadonlyArray<ItriOrbitModelIntakeReviewGap>
): ItriOrbitModelIntakePackageReviewState {
  if (hasRejectGap(gaps)) {
    return "rejected";
  }

  if (hasBlockingGaps(gaps)) {
    return "incomplete";
  }

  return "ready-for-design-review";
}

function buildRequirementReview(options: {
  packageState: ItriOrbitModelIntakePackageReviewState;
  packageGaps: ReadonlyArray<ItriOrbitModelIntakeReviewGap>;
  reviewedAt: string;
}): ItriOrbitModelIntakeRequirementReview {
  const { packageState, packageGaps, reviewedAt } = options;
  const reviewerState: ItriOrbitModelIntakeReviewerState =
    packageState === "ready-for-design-review"
      ? "ready-for-design-review"
      : packageState === "rejected"
        ? "rejected"
        : "incomplete";

  return {
    requirementId: "F-01",
    reviewerState,
    evidenceScope:
      "F-01 orbit-model intake readiness only; no runtime adapter, propagation implementation, public-TLE substitution, or authority acceptance.",
    reviewer: {
      nameOrRole: "F-01R1 orbit-model intake reviewer",
      reviewedAt,
      notes: [
        "Review is bounded to package intake fields, validation-vector readiness, nonclaims, and package-local retained refs."
      ]
    },
    gaps: packageGaps
  };
}

export function reviewItriOrbitModelIntakeManifest({
  manifest,
  packagePath,
  manifestPath = defaultManifestPath(packagePath),
  reviewedAt,
  retainedRefCheck
}: ItriOrbitModelIntakeReviewOptions): ItriOrbitModelIntakeReview {
  const resolvedReviewTime = parseReviewTime(reviewedAt);
  const normalizedPackagePath = normalizePackagePath(packagePath);
  const normalizedManifestPath = normalizePackagePath(manifestPath);
  const retainedRefSummary =
    retainedRefCheck ??
    {
      declaredRefs: collectItriOrbitModelIntakeRetainedRefs(manifest),
      resolvedRefs: [],
      unresolvedRefs: [],
      escapedRefs: [],
      privateOwnerSystemRefs: []
    };

  if (!isPlainRecord(manifest)) {
    const gaps: ItriOrbitModelIntakeReviewGap[] = [];
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

  const gaps: ItriOrbitModelIntakeReviewGap[] = [];
  addRequiredRootFieldGaps(manifest, gaps);
  const manifestSchemaVersion = reviewSchemaVersion(manifest, gaps);
  reviewPackagePath(normalizedPackagePath, gaps);
  reviewRequiredMetadata(manifest, gaps);
  reviewRedistributionPolicy(manifest, gaps);
  const sourceTier = reviewSourceTier(manifest, gaps);
  reviewModelIdentity(manifest, gaps);
  reviewInputContract(manifest, gaps);
  reviewOutputContract(manifest, gaps);
  const validationVectorReview = reviewValidationVectors(manifest, gaps);
  const statusReview = reviewStatus(manifest, gaps);
  reviewNonClaims(manifest, gaps);
  reviewRetainedRefs(retainedRefSummary, gaps);
  const syntheticReview = reviewSyntheticBoundary(manifest, gaps);
  const packageState = packageStateFromGaps(gaps);

  return {
    schemaVersion: CUSTOMER_ORBIT_MODEL_INTAKE_REVIEW_SCHEMA_VERSION,
    reviewedAt: resolvedReviewTime,
    packagePath: normalizedPackagePath,
    manifestPath: normalizedManifestPath,
    packageState,
    manifestSchemaVersion,
    packageId: stringValue(manifest, "packageId"),
    sourceTier,
    coveredRequirements: ["F-01"],
    requirementReviews: [
      buildRequirementReview({
        packageState,
        packageGaps: gaps,
        reviewedAt: resolvedReviewTime
      })
    ],
    gaps,
    validationVectors: validationVectorReview,
    retainedRefSummary: {
      declaredRefs: [...retainedRefSummary.declaredRefs],
      resolvedRefs: [...retainedRefSummary.resolvedRefs],
      unresolvedRefs: [...retainedRefSummary.unresolvedRefs],
      escapedRefs: [...retainedRefSummary.escapedRefs],
      privateOwnerSystemRefs: [...retainedRefSummary.privateOwnerSystemRefs]
    },
    status: statusReview,
    syntheticProvenance: syntheticReview,
    nonClaims: nonClaims()
  };
}
