export const CUSTOMER_EXTERNAL_VALIDATION_MANIFEST_SCHEMA_VERSION =
  "itri.v02-v06.external-validation-manifest.v1" as const;
export const CUSTOMER_EXTERNAL_VALIDATION_MANIFEST_REVIEW_SCHEMA_VERSION =
  "itri.v02r1.external-validation-manifest-review.v1" as const;
export const CUSTOMER_EXTERNAL_VALIDATION_PACKAGE_ROOT =
  "output/validation/external-v02-v06" as const;

export const CUSTOMER_EXTERNAL_VALIDATION_REQUIREMENTS = [
  "V-02",
  "V-03",
  "V-04",
  "V-05",
  "V-06"
] as const;

export type ItriExternalValidationRequirementId =
  (typeof CUSTOMER_EXTERNAL_VALIDATION_REQUIREMENTS)[number];

export type ItriExternalValidationReviewerState =
  | "importable"
  | "incomplete"
  | "redacted-reviewable"
  | "rejected"
  | "authority-pass";

export type ItriExternalValidationPackageReviewState =
  | "missing"
  | ItriExternalValidationReviewerState;

export type ItriExternalValidationReviewGapSeverity = "blocking" | "warning";

export interface ItriExternalValidationReviewGap {
  code: string;
  message: string;
  severity: ItriExternalValidationReviewGapSeverity;
  path?: string;
  requirementId?: ItriExternalValidationRequirementId;
}

export interface ItriExternalValidationArtifactRefCheck {
  declaredRefs: ReadonlyArray<string>;
  resolvedRefs: ReadonlyArray<string>;
  unresolvedRefs: ReadonlyArray<string>;
  escapedRefs: ReadonlyArray<string>;
  externalRefs: ReadonlyArray<string>;
}

export interface ItriExternalValidationRequirementReview {
  requirementId: ItriExternalValidationRequirementId;
  reviewerState: ItriExternalValidationReviewerState;
  evidenceScope: string;
  sourceArtifactRefs: ReadonlyArray<string>;
  ownerVerdictRefs: ReadonlyArray<string>;
  relatedMeasuredTrafficPackageRefs: ReadonlyArray<string>;
  reviewer: {
    nameOrRole: string;
    reviewedAt: string;
    notes: ReadonlyArray<string>;
  };
  gaps: ReadonlyArray<ItriExternalValidationReviewGap>;
}

export interface ItriExternalValidationRedactionReview {
  policyPresent: boolean;
  redactionLevel: string | null;
  auditability: string | null;
  auditabilityBlocked: boolean;
  notes: ReadonlyArray<string>;
}

export interface ItriExternalValidationSyntheticReview {
  syntheticSourceDetected: boolean;
  detectedPaths: ReadonlyArray<string>;
  externalManifestAllowsSyntheticSource: false | null;
  rejectExternalImportWhenSourceTierIsSynthetic: true | null;
}

export interface ItriExternalValidationRelatedMeasuredTrafficReview {
  relationCount: number;
  relationRefs: ReadonlyArray<string>;
  relationOnly: true;
  measuredTrafficTruthPromoted: boolean;
  detectedPromotionPaths: ReadonlyArray<string>;
}

export interface ItriExternalValidationNonClaims {
  externalValidationTruthFromSchema: false;
  schemaAloneCreatesV02V06Pass: false;
  natTunnelBridgeDutSuccessFromSchema: false;
  natTunnelBridgeDutValidationFromSchema: false;
  measuredTrafficTruth: false;
  itriOrbitModelIntegration: false;
  nativeRadioFrequencyHandover: false;
  fullItriAcceptance: false;
}

export interface ItriExternalValidationManifestReview {
  schemaVersion: typeof CUSTOMER_EXTERNAL_VALIDATION_MANIFEST_REVIEW_SCHEMA_VERSION;
  reviewedAt: string;
  packagePath: string;
  manifestPath: string;
  packageState: ItriExternalValidationPackageReviewState;
  manifestSchemaVersion: string | null;
  packageId: string | null;
  runId: string | null;
  coveredRequirements: ReadonlyArray<ItriExternalValidationRequirementId>;
  requirementReviews: ReadonlyArray<ItriExternalValidationRequirementReview>;
  gaps: ReadonlyArray<ItriExternalValidationReviewGap>;
  artifactRefSummary: ItriExternalValidationArtifactRefCheck;
  redaction: ItriExternalValidationRedactionReview;
  syntheticProvenance: ItriExternalValidationSyntheticReview;
  relatedMeasuredTrafficPackages: ItriExternalValidationRelatedMeasuredTrafficReview;
  nonClaims: ItriExternalValidationNonClaims;
}

export interface ItriExternalValidationManifestReviewOptions {
  manifest: unknown;
  packagePath: string;
  manifestPath?: string;
  reviewedAt?: string;
  artifactRefCheck?: ItriExternalValidationArtifactRefCheck;
}

export interface ItriExternalValidationClosedReviewOptions {
  packagePath: string;
  manifestPath?: string;
  reviewedAt?: string;
}

export interface ItriExternalValidationMalformedReviewOptions
  extends ItriExternalValidationClosedReviewOptions {
  parseError: string;
}

type PlainRecord = Record<string, unknown>;

interface ReviewerVerdictLike {
  requirementId: ItriExternalValidationRequirementId;
  reviewerState: ItriExternalValidationReviewerState;
  evidenceScope: string;
  sourceArtifactRefs: ReadonlyArray<string>;
  ownerVerdictRefs: ReadonlyArray<string>;
  relatedMeasuredTrafficPackageRefs: ReadonlyArray<string>;
  reviewer: {
    nameOrRole: string;
    reviewedAt: string;
    notes: ReadonlyArray<string>;
  };
}

const REQUIRED_NON_CLAIMS: ItriExternalValidationNonClaims = {
  externalValidationTruthFromSchema: false,
  schemaAloneCreatesV02V06Pass: false,
  natTunnelBridgeDutSuccessFromSchema: false,
  natTunnelBridgeDutValidationFromSchema: false,
  measuredTrafficTruth: false,
  itriOrbitModelIntegration: false,
  nativeRadioFrequencyHandover: false,
  fullItriAcceptance: false
};

const EMPTY_ARTIFACT_REF_CHECK: ItriExternalValidationArtifactRefCheck = {
  declaredRefs: [],
  resolvedRefs: [],
  unresolvedRefs: [],
  escapedRefs: [],
  externalRefs: []
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
  "reviewer",
  "coveredRequirements",
  "environment",
  "topology",
  "dut",
  "trafficGenerator",
  "trafficProfile",
  "artifactRefs",
  "relatedMeasuredTrafficPackages",
  "reviewerVerdicts",
  "syntheticFallbackBoundary",
  "nonClaims"
] as const;

const BLOCKING_REJECT_CODES = [
  "package.path-outside-retained-root",
  "manifest.path-outside-package",
  "artifact-ref.escapes-package",
  "artifact-ref.external-url",
  "synthetic-source.rejected",
  "redaction-policy.auditability-blocked",
  "related-measured-traffic.truth-promotion"
] as const;

const REF_KEY_NAMES = new Set([
  "commandsTranscript",
  "redactions",
  "ref",
  "rawRef",
  "processRef",
  "commandLineRef",
  "imageRef",
  "testbenchRef",
  "profileRef",
  "policyRef",
  "clockSyncRef",
  "measuredFieldRef"
]);

function nonClaims(): ItriExternalValidationNonClaims {
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
  gaps: ItriExternalValidationReviewGap[],
  code: string,
  message: string,
  options: {
    severity?: ItriExternalValidationReviewGapSeverity;
    path?: string;
    requirementId?: ItriExternalValidationRequirementId;
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

export function isAllowedItriExternalValidationPackagePath(packagePath: string): boolean {
  const normalized = normalizePackagePath(packagePath);
  const root = CUSTOMER_EXTERNAL_VALIDATION_PACKAGE_ROOT;

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
  requirementId: ItriExternalValidationRequirementId,
  reviewedAt: string,
  message: string
): ItriExternalValidationRequirementReview {
  return {
    requirementId,
    reviewerState: "incomplete",
    evidenceScope: "No retained external-validation manifest was imported.",
    sourceArtifactRefs: [],
    ownerVerdictRefs: [],
    relatedMeasuredTrafficPackageRefs: [],
    reviewer: {
      nameOrRole: "V-02R1 external validation manifest reviewer",
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
  options: ItriExternalValidationClosedReviewOptions & {
    packageState: ItriExternalValidationPackageReviewState;
    gaps: ReadonlyArray<ItriExternalValidationReviewGap>;
    manifestSchemaVersion?: string | null;
  }
): ItriExternalValidationManifestReview {
  const reviewedAt = parseReviewTime(options.reviewedAt);
  const message =
    options.gaps[0]?.message ??
    "External-validation manifest review did not reach an importable state.";

  return {
    schemaVersion: CUSTOMER_EXTERNAL_VALIDATION_MANIFEST_REVIEW_SCHEMA_VERSION,
    reviewedAt,
    packagePath: normalizePackagePath(options.packagePath),
    manifestPath: options.manifestPath ?? defaultManifestPath(options.packagePath),
    packageState: options.packageState,
    manifestSchemaVersion: options.manifestSchemaVersion ?? null,
    packageId: null,
    runId: null,
    coveredRequirements: [...CUSTOMER_EXTERNAL_VALIDATION_REQUIREMENTS],
    requirementReviews: CUSTOMER_EXTERNAL_VALIDATION_REQUIREMENTS.map((requirementId) =>
      missingRequirementReview(requirementId, reviewedAt, message)
    ),
    gaps: options.gaps,
    artifactRefSummary: { ...EMPTY_ARTIFACT_REF_CHECK },
    redaction: {
      policyPresent: false,
      redactionLevel: null,
      auditability: null,
      auditabilityBlocked: false,
      notes: [
        "No retained redaction policy was available to this closed review."
      ]
    },
    syntheticProvenance: {
      syntheticSourceDetected: false,
      detectedPaths: [],
      externalManifestAllowsSyntheticSource: null,
      rejectExternalImportWhenSourceTierIsSynthetic: null
    },
    relatedMeasuredTrafficPackages: {
      relationCount: 0,
      relationRefs: [],
      relationOnly: true,
      measuredTrafficTruthPromoted: false,
      detectedPromotionPaths: []
    },
    nonClaims: nonClaims()
  };
}

export function reviewMissingItriExternalValidationPackage(
  options: ItriExternalValidationClosedReviewOptions
): ItriExternalValidationManifestReview {
  const gaps: ItriExternalValidationReviewGap[] = [];
  addGap(
    gaps,
    "package.missing",
    "No retained external-validation package exists at the explicitly named path.",
    { path: normalizePackagePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "missing",
    gaps
  });
}

export function reviewMissingItriExternalValidationManifest(
  options: ItriExternalValidationClosedReviewOptions
): ItriExternalValidationManifestReview {
  const gaps: ItriExternalValidationReviewGap[] = [];
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

export function reviewMalformedItriExternalValidationManifest(
  options: ItriExternalValidationMalformedReviewOptions
): ItriExternalValidationManifestReview {
  const gaps: ItriExternalValidationReviewGap[] = [];
  addGap(gaps, "manifest.malformed-json", options.parseError, {
    path: options.manifestPath ?? defaultManifestPath(options.packagePath)
  });

  return closedReview({
    ...options,
    packageState: "incomplete",
    gaps
  });
}

export function reviewRejectedItriExternalValidationPackagePath(
  options: ItriExternalValidationClosedReviewOptions
): ItriExternalValidationManifestReview {
  const gaps: ItriExternalValidationReviewGap[] = [];
  addGap(
    gaps,
    "package.path-outside-retained-root",
    `External-validation package path must be under ${CUSTOMER_EXTERNAL_VALIDATION_PACKAGE_ROOT}/.`,
    { path: normalizePackagePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "rejected",
    gaps
  });
}

export function reviewRejectedItriExternalValidationManifestPath(
  options: ItriExternalValidationClosedReviewOptions
): ItriExternalValidationManifestReview {
  const gaps: ItriExternalValidationReviewGap[] = [];
  addGap(
    gaps,
    "manifest.path-outside-package",
    "Explicit manifest path must resolve inside the explicitly named external-validation package directory.",
    { path: options.manifestPath ?? defaultManifestPath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "rejected",
    gaps
  });
}

function addRequiredRootFieldGaps(
  manifest: PlainRecord,
  gaps: ItriExternalValidationReviewGap[]
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
  gaps: ItriExternalValidationReviewGap[]
): string | null {
  const schemaVersion = stringValue(manifest, "schemaVersion");

  if (schemaVersion !== CUSTOMER_EXTERNAL_VALIDATION_MANIFEST_SCHEMA_VERSION) {
    addGap(
      gaps,
      "manifest.schema-version",
      `Manifest schemaVersion must be ${CUSTOMER_EXTERNAL_VALIDATION_MANIFEST_SCHEMA_VERSION}.`,
      { path: "schemaVersion" }
    );
  }

  return schemaVersion;
}

function reviewPackagePath(
  manifest: PlainRecord,
  packagePath: string,
  gaps: ItriExternalValidationReviewGap[]
): void {
  const normalizedPackagePath = normalizePackagePath(packagePath);
  const manifestPackagePath = stringValue(manifest, "packagePath");

  if (!isAllowedItriExternalValidationPackagePath(normalizedPackagePath)) {
    addGap(
      gaps,
      "package.path-outside-retained-root",
      `Package path must be explicitly under ${CUSTOMER_EXTERNAL_VALIDATION_PACKAGE_ROOT}/.`,
      { path: "packagePath" }
    );
  }

  if (!manifestPackagePath) {
    return;
  }

  if (normalizePackagePath(manifestPackagePath) !== normalizedPackagePath) {
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
  gaps: ItriExternalValidationReviewGap[]
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

function reviewOwner(manifest: PlainRecord, gaps: ItriExternalValidationReviewGap[]): void {
  const owner = manifest.validationOwner;

  if (!isPlainRecord(owner)) {
    addGap(gaps, "owner.missing", "validationOwner must be an object with organization, role, authorityScope, and ownerVerdictRefs.", {
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
    addGap(gaps, "owner.authority-scope-missing", "validationOwner.authorityScope must name the retained authority scope.", {
      path: "validationOwner.authorityScope"
    });
  }

  if (!Array.isArray(owner.ownerVerdictRefs)) {
    addGap(gaps, "owner.verdict-refs-missing", "validationOwner.ownerVerdictRefs must be an array, even when lane verdict refs are per requirement.", {
      path: "validationOwner.ownerVerdictRefs"
    });
  }
}

function reviewReviewer(manifest: PlainRecord, gaps: ItriExternalValidationReviewGap[]): void {
  const reviewer = manifest.reviewer;

  if (!isPlainRecord(reviewer)) {
    addGap(gaps, "reviewer.missing", "reviewer must retain nameOrRole, reviewedAt, and reviewScope.", {
      path: "reviewer"
    });
    return;
  }

  if (!stringValue(reviewer, "nameOrRole")) {
    addGap(gaps, "reviewer.name-missing", "reviewer.nameOrRole is required.", {
      path: "reviewer.nameOrRole"
    });
  }

  const reviewedAt = stringValue(reviewer, "reviewedAt");

  if (!reviewedAt || !Number.isFinite(Date.parse(reviewedAt))) {
    addGap(gaps, "reviewer.reviewed-at-missing", "reviewer.reviewedAt must be an ISO-8601 timestamp.", {
      path: "reviewer.reviewedAt"
    });
  }

  if (stringArray(reviewer.reviewScope).length === 0) {
    addGap(gaps, "reviewer.scope-missing", "reviewer.reviewScope must name reviewed V requirements.", {
      path: "reviewer.reviewScope"
    });
  }
}

function reviewRedactionPolicy(
  manifest: PlainRecord,
  gaps: ItriExternalValidationReviewGap[]
): PlainRecord | null {
  const policy = manifest.redactionPolicy;

  if (!isPlainRecord(policy)) {
    addGap(gaps, "redaction-policy.missing", "redactionPolicy must be retained with owner, version, level, packet-capture policy, and auditability.", {
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

  if (!stringValue(policy, "policyRef")) {
    addGap(gaps, "redaction-policy.policy-ref-missing", "redactionPolicy.policyRef must point to retained redaction policy notes.", {
      path: "redactionPolicy.policyRef"
    });
  }

  if (
    stringValue(policy, "redactionLevel") === "audit-blocking" ||
    stringValue(policy, "auditability") === "blocked"
  ) {
    addGap(
      gaps,
      "redaction-policy.auditability-blocked",
      "Audit-blocking redaction cannot support external-validation authority review.",
      { path: "redactionPolicy.auditability" }
    );
  }

  return policy;
}

function buildRedactionReview(policy: PlainRecord | null): ItriExternalValidationRedactionReview {
  const redactionLevel = policy ? stringValue(policy, "redactionLevel") : null;
  const auditability = policy ? stringValue(policy, "auditability") : null;

  return {
    policyPresent: Boolean(policy),
    redactionLevel,
    auditability,
    auditabilityBlocked:
      redactionLevel === "audit-blocking" || auditability === "blocked",
    notes:
      policy && stringArray(policy.redactionNotes).length > 0
        ? stringArray(policy.redactionNotes)
        : [
            "Redaction is reviewed only for package auditability and does not create external validation truth."
          ]
  };
}

function requirementFromUnknown(value: unknown): ItriExternalValidationRequirementId | null {
  return typeof value === "string" &&
    (CUSTOMER_EXTERNAL_VALIDATION_REQUIREMENTS as ReadonlyArray<string>).includes(value)
    ? (value as ItriExternalValidationRequirementId)
    : null;
}

function reviewCoveredRequirements(
  manifest: PlainRecord,
  gaps: ItriExternalValidationReviewGap[]
): ReadonlyArray<ItriExternalValidationRequirementId> {
  const covered = arrayValue(manifest.coveredRequirements)
    .map(requirementFromUnknown)
    .filter((requirement): requirement is ItriExternalValidationRequirementId =>
      Boolean(requirement)
    );

  if (covered.length === 0) {
    addGap(
      gaps,
      "requirements.covered-missing",
      "coveredRequirements must contain at least one of V-02, V-03, V-04, V-05, or V-06.",
      { path: "coveredRequirements" }
    );
  }

  if (arrayValue(manifest.coveredRequirements).length !== covered.length) {
    addGap(
      gaps,
      "requirements.covered-invalid",
      "coveredRequirements may contain only V-02, V-03, V-04, V-05, and V-06.",
      { path: "coveredRequirements" }
    );
  }

  return [...new Set(covered)];
}

function fieldLooksLikeRef(key: string): boolean {
  return (
    REF_KEY_NAMES.has(key) ||
    key.endsWith("Ref") ||
    key.endsWith("Refs") ||
    key.endsWith("ArtifactRefs") ||
    key.endsWith("OutputRefs") ||
    key.endsWith("CommandRefs") ||
    key.endsWith("LogRefs")
  );
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

function collectRefLikeValues(value: unknown, refs: Set<string>, pathName = ""): void {
  if (pathName.startsWith("syntheticFallbackBoundary") || pathName.startsWith("nonClaims")) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectRefLikeValues(entry, refs, `${pathName}[${index}]`));
    return;
  }

  if (!isPlainRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = pathName ? `${pathName}.${key}` : key;

    if (fieldLooksLikeRef(key)) {
      if (typeof child === "string") {
        addStringRef(refs, child);
        continue;
      }

      if (Array.isArray(child)) {
        addStringRefs(refs, child);
      }
    }

    collectRefLikeValues(child, refs, childPath);
  }
}

export function collectItriExternalValidationArtifactRefs(
  manifest: unknown
): ReadonlyArray<string> {
  const refs = new Set<string>();

  if (!isPlainRecord(manifest)) {
    return [];
  }

  if (isPlainRecord(manifest.validationOwner)) {
    addStringRefs(refs, manifest.validationOwner.ownerVerdictRefs);
  }

  for (const key of [
    "redactionPolicy",
    "environment",
    "topology",
    "dut",
    "trafficGenerator",
    "trafficProfile",
    "artifactRefs",
    "reviewerVerdicts"
  ] as const) {
    collectRefLikeValues(manifest[key], refs, key);
  }

  for (const relation of recordArray(manifest.relatedMeasuredTrafficPackages)) {
    addStringRefs(refs, relation.sharedRawTrafficRefs);
    addStringRefs(refs, relation.artifactRefs);
    addStringRefs(refs, relation.sourceArtifactRefs);
  }

  return [...refs].sort();
}

function reviewArtifactRefs(
  manifest: PlainRecord,
  artifactRefCheck: ItriExternalValidationArtifactRefCheck,
  gaps: ItriExternalValidationReviewGap[]
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

  for (const key of ["configs", "logs", "routeTables", "natTables", "trafficResults", "dutOutputs", "screenshots"] as const) {
    if (!Array.isArray(artifactRefs[key])) {
      addGap(gaps, "artifact-refs.array-missing", `artifactRefs.${key} must be an array, even when empty.`, {
        path: `artifactRefs.${key}`
      });
    }
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

  if (!stringValue(artifactRefs, "redactions")) {
    addGap(gaps, "artifact-refs.redactions-missing", "artifactRefs.redactions is required.", {
      path: "artifactRefs.redactions"
    });
  }

  for (const ref of artifactRefCheck.escapedRefs) {
    addGap(gaps, "artifact-ref.escapes-package", "Artifact refs must resolve inside the retained external-validation package directory.", {
      path: ref
    });
  }

  for (const ref of artifactRefCheck.externalRefs) {
    addGap(gaps, "artifact-ref.external-url", "External URLs are supplemental only and cannot satisfy retained local artifact requirements.", {
      path: ref
    });
  }

  for (const ref of artifactRefCheck.unresolvedRefs) {
    addGap(gaps, "artifact-ref.unresolved", "Declared artifact ref does not resolve inside the retained external-validation package directory.", {
      path: ref
    });
  }

  if (artifactRefCheck.declaredRefs.length === 0) {
    addGap(gaps, "artifact-ref.none-declared", "Manifest must declare package-relative retained artifact refs.", {
      path: "artifactRefs"
    });
  }
}

function reviewerStateFromUnknown(value: unknown): ItriExternalValidationReviewerState | null {
  return typeof value === "string" &&
    ["importable", "incomplete", "redacted-reviewable", "rejected", "authority-pass"].includes(value)
    ? (value as ItriExternalValidationReviewerState)
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

      return {
        requirementId,
        reviewerState,
        evidenceScope:
          stringValue(verdict, "evidenceScope") ?? "Manifest reviewer verdict",
        sourceArtifactRefs: stringArray(verdict.sourceArtifactRefs),
        ownerVerdictRefs: stringArray(verdict.ownerVerdictRefs),
        relatedMeasuredTrafficPackageRefs: stringArray(verdict.relatedMeasuredTrafficPackageRefs),
        reviewer: {
          nameOrRole:
            stringValue(reviewer, "nameOrRole") ??
            "V-02R1 external validation manifest reviewer",
          reviewedAt:
            stringValue(reviewer, "reviewedAt") ?? new Date(0).toISOString(),
          notes: stringArray(reviewer.notes)
        }
      };
    })
    .filter((verdict): verdict is ReviewerVerdictLike => Boolean(verdict));
}

function reviewReviewerVerdictsShape(
  manifest: PlainRecord,
  coveredRequirements: ReadonlyArray<ItriExternalValidationRequirementId>,
  gaps: ItriExternalValidationReviewGap[]
): void {
  if (!Array.isArray(manifest.reviewerVerdicts)) {
    addGap(gaps, "reviewer-verdicts.missing", "reviewerVerdicts must be an array, even when no authority pass is assigned.", {
      path: "reviewerVerdicts"
    });
    return;
  }

  for (const requirementId of coveredRequirements) {
    if (!reviewerVerdicts(manifest).some((verdict) => verdict.requirementId === requirementId)) {
      addGap(
        gaps,
        "reviewer-verdicts.requirement-missing",
        `${requirementId} must have an explicit package-review verdict record.`,
        { path: "reviewerVerdicts", requirementId }
      );
    }
  }
}

function reviewSyntheticBoundary(
  manifest: PlainRecord,
  gaps: ItriExternalValidationReviewGap[]
): ItriExternalValidationSyntheticReview {
  const detectedPaths: string[] = [];
  const boundary = isPlainRecord(manifest.syntheticFallbackBoundary)
    ? manifest.syntheticFallbackBoundary
    : null;

  function visit(value: unknown, pathName: string): void {
    if (pathName.startsWith("syntheticFallbackBoundary") || pathName.startsWith("nonClaims")) {
      return;
    }

    if (isPlainRecord(value)) {
      if (value.sourceTier === "tier-3-synthetic") {
        detectedPaths.push(`${pathName}.sourceTier`);
      }

      if (hasOwn(value, "syntheticProvenance")) {
        detectedPaths.push(`${pathName}.syntheticProvenance`);
      }

      for (const [key, child] of Object.entries(value)) {
        visit(child, pathName ? `${pathName}.${key}` : key);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((child, index) => {
        visit(child, `${pathName}[${index}]`);
      });
      return;
    }

    if (
      value === "tier-3-synthetic" ||
      value === "hand-authored-shape" ||
      value === "deterministic-generated" ||
      value === "simulation-placeholder"
    ) {
      detectedPaths.push(pathName);
    }
  }

  visit(manifest, "");

  if (!boundary) {
    addGap(
      gaps,
      "synthetic-boundary.missing",
      "syntheticFallbackBoundary must preserve the S11 external-validation rejection rule.",
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

    if (boundary.externalManifestAllowsSyntheticSource !== false) {
      addGap(
        gaps,
        "synthetic-boundary.allows-synthetic",
        "External validation manifest reviewer must record externalManifestAllowsSyntheticSource=false.",
        { path: "syntheticFallbackBoundary.externalManifestAllowsSyntheticSource" }
      );
    }

    if (boundary.rejectExternalImportWhenSourceTierIsSynthetic !== true) {
      addGap(
        gaps,
        "synthetic-boundary.reject-rule-missing",
        "External validation manifest reviewer must reject tier-3 synthetic source tiers.",
        {
          path:
            "syntheticFallbackBoundary.rejectExternalImportWhenSourceTierIsSynthetic"
        }
      );
    }
  }

  for (const detectedPath of detectedPaths) {
    addGap(
      gaps,
      "synthetic-source.rejected",
      "Synthetic provenance or tier-3 source material cannot support retained external validation authority.",
      { path: detectedPath }
    );
  }

  return {
    syntheticSourceDetected: detectedPaths.length > 0,
    detectedPaths: [...new Set(detectedPaths)].sort(),
    externalManifestAllowsSyntheticSource: boundary
      ? boundary.externalManifestAllowsSyntheticSource === false
        ? false
        : null
      : null,
    rejectExternalImportWhenSourceTierIsSynthetic: boundary
      ? boundary.rejectExternalImportWhenSourceTierIsSynthetic === true
        ? true
        : null
      : null
  };
}

function reviewNonClaims(manifest: PlainRecord, gaps: ItriExternalValidationReviewGap[]): void {
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

function promotionValueDetected(value: unknown): boolean {
  if (value === true) {
    return true;
  }

  if (typeof value === "string") {
    return [
      "authority-pass",
      "measured-traffic-truth",
      "promotes-v-lanes",
      "promotes-validation-authority",
      "closes-v-lanes"
    ].includes(value);
  }

  return false;
}

function reviewRelatedMeasuredTrafficPackages(
  manifest: PlainRecord,
  gaps: ItriExternalValidationReviewGap[]
): ItriExternalValidationRelatedMeasuredTrafficReview {
  const relations = recordArray(manifest.relatedMeasuredTrafficPackages);
  const detectedPromotionPaths: string[] = [];
  const relationRefs = new Set<string>();
  const promotionKeys = [
    "measuredTrafficTruth",
    "promotesMeasuredTrafficTruth",
    "promotesValidationAuthority",
    "promotesVLanes",
    "authorityPassFromMeasuredTraffic",
    "closesExternalValidation",
    "vLaneAuthorityPromoted"
  ];

  if (!Array.isArray(manifest.relatedMeasuredTrafficPackages)) {
    addGap(
      gaps,
      "related-measured-traffic.missing",
      "relatedMeasuredTrafficPackages must be an array, even when empty.",
      { path: "relatedMeasuredTrafficPackages" }
    );
  }

  relations.forEach((relation, index) => {
    const pathName = `relatedMeasuredTrafficPackages[${index}]`;

    addStringRefs(relationRefs, relation.sharedRawTrafficRefs);
    addStringRefs(relationRefs, relation.artifactRefs);
    addStringRefs(relationRefs, relation.sourceArtifactRefs);

    for (const key of promotionKeys) {
      if (promotionValueDetected(relation[key])) {
        detectedPromotionPaths.push(`${pathName}.${key}`);
      }
    }

    if (stringArray(relation.coveredRequirements).some((requirement) => requirement.startsWith("V-"))) {
      detectedPromotionPaths.push(`${pathName}.coveredRequirements`);
    }
  });

  for (const detectedPath of detectedPromotionPaths) {
    addGap(
      gaps,
      "related-measured-traffic.truth-promotion",
      "relatedMeasuredTrafficPackages is relation metadata only and must not imply measured traffic truth or promote V-lane authority.",
      { path: detectedPath }
    );
  }

  return {
    relationCount: relations.length,
    relationRefs: [...relationRefs].sort(),
    relationOnly: true,
    measuredTrafficTruthPromoted: detectedPromotionPaths.length > 0,
    detectedPromotionPaths: [...new Set(detectedPromotionPaths)].sort()
  };
}

function artifactRefsRecord(manifest: PlainRecord): PlainRecord {
  return isPlainRecord(manifest.artifactRefs) ? manifest.artifactRefs : {};
}

function topologyRecord(manifest: PlainRecord): PlainRecord {
  return isPlainRecord(manifest.topology) ? manifest.topology : {};
}

function environmentRecord(manifest: PlainRecord): PlainRecord {
  return isPlainRecord(manifest.environment) ? manifest.environment : {};
}

function dutRecord(manifest: PlainRecord): PlainRecord {
  return isPlainRecord(manifest.dut) ? manifest.dut : {};
}

function trafficGeneratorRecord(manifest: PlainRecord): PlainRecord {
  return isPlainRecord(manifest.trafficGenerator) ? manifest.trafficGenerator : {};
}

function trafficProfileRecord(manifest: PlainRecord): PlainRecord {
  return isPlainRecord(manifest.trafficProfile) ? manifest.trafficProfile : {};
}

function artifactStringRefs(manifest: PlainRecord, key: string): ReadonlyArray<string> {
  return stringArray(artifactRefsRecord(manifest)[key]);
}

function packetCaptureRefs(manifest: PlainRecord): ReadonlyArray<string> {
  const packetCaptures = artifactRefsRecord(manifest).packetCaptures;

  if (!isPlainRecord(packetCaptures)) {
    return [];
  }

  return [
    ...stringArray(packetCaptures.captureRefs),
    ...stringArray(packetCaptures.alternatePathEvidenceRefs)
  ];
}

function screenshotRefs(manifest: PlainRecord): ReadonlyArray<string> {
  return recordArray(artifactRefsRecord(manifest).screenshots)
    .map((screenshot) => stringValue(screenshot, "ref"))
    .filter((ref): ref is string => Boolean(ref));
}

function refsFromRecords(
  records: ReadonlyArray<PlainRecord>,
  keys: ReadonlyArray<string>
): ReadonlyArray<string> {
  const refs = new Set<string>();

  for (const record of records) {
    for (const key of keys) {
      addStringRef(refs, record[key]);
      addStringRefs(refs, record[key]);
    }
  }

  return [...refs].sort();
}

function hostCommandRefs(host: unknown): ReadonlyArray<string> {
  if (!isPlainRecord(host)) {
    return [];
  }

  return stringArray(host.sourceCommandRefs);
}

function trafficPathRecordsForRequirement(
  manifest: PlainRecord,
  requirementId: ItriExternalValidationRequirementId
): ReadonlyArray<PlainRecord> {
  return recordArray(topologyRecord(manifest).trafficPaths).filter((trafficPath) =>
    stringArray(trafficPath.requirementIds).includes(requirementId)
  );
}

function trafficPathProofRefs(
  manifest: PlainRecord,
  requirementId: ItriExternalValidationRequirementId
): ReadonlyArray<string> {
  return refsFromRecords(trafficPathRecordsForRequirement(manifest, requirementId), [
    "expectedRouteRefs",
    "tunnelRefs",
    "bridgeRefs",
    "natRoutingRefs",
    "dutRefs",
    "generatorRefs",
    "rawLogRefs"
  ]);
}

function commonRawTrafficRefs(
  manifest: PlainRecord,
  requirementId: ItriExternalValidationRequirementId
): ReadonlyArray<string> {
  return [
    ...artifactStringRefs(manifest, "trafficResults"),
    ...packetCaptureRefs(manifest),
    ...trafficPathProofRefs(manifest, requirementId)
  ].filter((ref, index, refs) => refs.indexOf(ref) === index);
}

function ownerVerdictRefsForRequirement(
  manifest: PlainRecord,
  requirementId: ItriExternalValidationRequirementId
): ReadonlyArray<string> {
  const refs = new Set<string>();
  const verdict = reviewerVerdicts(manifest).find(
    (candidate) => candidate.requirementId === requirementId
  );

  addStringRefs(refs, verdict?.ownerVerdictRefs);

  if (isPlainRecord(manifest.validationOwner)) {
    addStringRefs(refs, manifest.validationOwner.ownerVerdictRefs);
  }

  const dut = dutRecord(manifest);
  const virtualDut = isPlainRecord(dut.virtual) ? dut.virtual : null;
  const physicalDut = isPlainRecord(dut.physical) ? dut.physical : null;

  if (requirementId === "V-05" && virtualDut) {
    addStringRefs(refs, virtualDut.ownerVerdictRefs);
  }

  if (requirementId === "V-06" && physicalDut) {
    addStringRefs(refs, physicalDut.ownerVerdictRefs);
  }

  return [...refs].sort();
}

function rawArtifactRefsForRequirement(
  manifest: PlainRecord,
  requirementId: ItriExternalValidationRequirementId
): ReadonlyArray<string> {
  const refs = new Set<string>();
  const env = environmentRecord(manifest);
  const topology = topologyRecord(manifest);
  const dut = dutRecord(manifest);
  const trafficGenerator = trafficGeneratorRecord(manifest);
  const trafficProfile = trafficProfileRecord(manifest);

  addStringRef(refs, artifactRefsRecord(manifest).commandsTranscript);
  addStringRefs(refs, artifactStringRefs(manifest, "logs"));
  addStringRefs(refs, commonRawTrafficRefs(manifest, requirementId));

  if (requirementId === "V-02") {
    addStringRefs(refs, hostCommandRefs(env.windows));
    addStringRefs(refs, hostCommandRefs(env.wsl));
    addStringRefs(refs, refsFromRecords(recordArray(env.interfaces), ["sourceCommandRef"]));
    addStringRefs(refs, refsFromRecords(recordArray(env.routes), ["sourceCommandRef"]));
    addStringRefs(refs, artifactStringRefs(manifest, "routeTables"));
  }

  if (requirementId === "V-03") {
    addStringRefs(refs, refsFromRecords(recordArray(topology.tunnelRefs), ["processRef", "configRefs", "logRefs"]));
    addStringRefs(refs, refsFromRecords(recordArray(topology.bridgeRefs), ["processRef", "commandLineRef", "configRefs", "logRefs"]));
    addStringRefs(refs, artifactStringRefs(manifest, "configs"));
  }

  if (requirementId === "V-04") {
    addStringRefs(refs, refsFromRecords(recordArray(topology.natRoutingRefs), ["sourceCommandRef", "rawRef"]));
    addStringRefs(refs, refsFromRecords(recordArray(topology.estnetInetScenarioRefs), ["moduleMapRefs", "runParameterRefs", "nodeRefs", "logRefs"]));
    addStringRefs(refs, refsFromRecords(recordArray(topology.gatewayMapping), ["natRuleRefs", "routeRefs", "hostInterfaceRefs", "simulatedNodeRefs"]));
    addStringRefs(refs, artifactStringRefs(manifest, "routeTables"));
    addStringRefs(refs, artifactStringRefs(manifest, "natTables"));
  }

  if (requirementId === "V-05" && isPlainRecord(dut.virtual)) {
    addStringRef(refs, dut.virtual.imageRef);
    addStringRef(refs, dut.virtual.testbenchRef);
    addStringRefs(refs, dut.virtual.configRefs);
    addStringRefs(refs, dut.virtual.commandRefs);
    addStringRefs(refs, dut.virtual.interfaceRefs);
    addStringRefs(refs, dut.virtual.routeRefs);
    addStringRefs(refs, dut.virtual.trafficProfileRefs);
    addStringRefs(refs, dut.virtual.outputRefs);
    addStringRefs(refs, artifactStringRefs(manifest, "dutOutputs"));
  }

  if (requirementId === "V-06") {
    if (isPlainRecord(dut.physical)) {
      addStringRefs(refs, dut.physical.portMappingRefs);
      addStringRefs(refs, dut.physical.cablingRefs);
      addStringRefs(refs, dut.physical.logRefs);
    }

    if (isPlainRecord(trafficGenerator.neOne)) {
      addStringRef(refs, trafficGenerator.neOne.profileRef);
      addStringRefs(refs, trafficGenerator.neOne.scenarioRefs);
      addStringRefs(refs, trafficGenerator.neOne.configRefs);
      addStringRefs(refs, trafficGenerator.neOne.timingRefs);
      addStringRefs(refs, trafficGenerator.neOne.outputRefs);
    }

    for (const generator of recordArray(trafficGenerator.other)) {
      addStringRef(refs, generator.profileRef);
      addStringRefs(refs, generator.scenarioRefs);
      addStringRefs(refs, generator.configRefs);
      addStringRefs(refs, generator.timingRefs);
      addStringRefs(refs, generator.outputRefs);
    }

    addStringRefs(refs, trafficProfile.successCriteriaRefs);
    addStringRefs(refs, trafficProfile.pathRefs);
    addStringRefs(refs, trafficProfile.rawOutputRefs);
    addStringRefs(refs, artifactStringRefs(manifest, "dutOutputs"));
  }

  return [...refs].sort();
}

function hasAny(refs: ReadonlyArray<string>): boolean {
  return refs.length > 0;
}

function addLaneGap(
  gaps: ItriExternalValidationReviewGap[],
  requirementId: ItriExternalValidationRequirementId,
  code: string,
  message: string,
  pathName: string
): void {
  addGap(gaps, code, message, {
    requirementId,
    path: pathName
  });
}

function reviewLaneMaterial(
  manifest: PlainRecord,
  requirementId: ItriExternalValidationRequirementId,
  gaps: ItriExternalValidationReviewGap[]
): void {
  const env = environmentRecord(manifest);
  const topology = topologyRecord(manifest);
  const dut = dutRecord(manifest);
  const trafficGenerator = trafficGeneratorRecord(manifest);
  const trafficProfile = trafficProfileRecord(manifest);
  const rawTrafficRefs = commonRawTrafficRefs(manifest, requirementId);

  if (requirementId === "V-02") {
    if (!hasAny(hostCommandRefs(env.windows)) || !hasAny(hostCommandRefs(env.wsl))) {
      addLaneGap(gaps, requirementId, "lane.v02.windows-wsl-evidence-missing", "V-02 requires retained Windows and WSL command/source refs.", "environment.windows");
    }

    if (
      !hasAny(refsFromRecords(recordArray(env.interfaces), ["sourceCommandRef"])) ||
      !hasAny(refsFromRecords(recordArray(env.routes), ["sourceCommandRef"]))
    ) {
      addLaneGap(gaps, requirementId, "lane.v02.interface-route-refs-missing", "V-02 requires retained interface and route command refs.", "environment.interfaces");
    }

    if (!stringValue(artifactRefsRecord(manifest), "commandsTranscript")) {
      addLaneGap(gaps, requirementId, "lane.v02.command-transcript-missing", "V-02 requires command transcript refs for inventory and traffic proof.", "artifactRefs.commandsTranscript");
    }

    if (!hasAny(rawTrafficRefs)) {
      addLaneGap(gaps, requirementId, "lane.v02.traffic-path-proof-missing", "V-02 requires retained traffic/path proof refs.", "artifactRefs.trafficResults");
    }
  }

  if (requirementId === "V-03") {
    const tunnelRefs = recordArray(topology.tunnelRefs);
    const bridgeRefs = recordArray(topology.bridgeRefs);
    const configRefs = refsFromRecords([...tunnelRefs, ...bridgeRefs], ["configRefs", "commandLineRef", "processRef"]);
    const logRefs = refsFromRecords([...tunnelRefs, ...bridgeRefs], ["logRefs"]);

    if (tunnelRefs.length === 0 && bridgeRefs.length === 0) {
      addLaneGap(gaps, requirementId, "lane.v03.tunnel-bridge-refs-missing", "V-03 requires retained tunnel or bridge refs.", "topology.tunnelRefs");
    }

    if (!hasAny(configRefs) || !hasAny(logRefs)) {
      addLaneGap(gaps, requirementId, "lane.v03.config-log-refs-missing", "V-03 requires retained tunnel/bridge config and log refs.", "topology.bridgeRefs");
    }

    if (!hasAny(rawTrafficRefs)) {
      addLaneGap(gaps, requirementId, "lane.v03.traffic-path-proof-missing", "V-03 requires traffic path proof across the expected tunnel or bridge path.", "topology.trafficPaths");
    }
  }

  if (requirementId === "V-04") {
    if (
      recordArray(topology.natRoutingRefs).length === 0 ||
      recordArray(topology.estnetInetScenarioRefs).length === 0 ||
      recordArray(topology.gatewayMapping).length === 0
    ) {
      addLaneGap(gaps, requirementId, "lane.v04.nat-estnet-inet-refs-missing", "V-04 requires NAT, ESTNeT/INET scenario, and gateway mapping refs.", "topology.natRoutingRefs");
    }

    if (
      !hasAny(artifactStringRefs(manifest, "routeTables")) ||
      !hasAny(artifactStringRefs(manifest, "natTables"))
    ) {
      addLaneGap(gaps, requirementId, "lane.v04.route-nat-table-refs-missing", "V-04 requires retained route table and NAT table refs.", "artifactRefs.natTables");
    }

    if (!hasAny(rawTrafficRefs)) {
      addLaneGap(gaps, requirementId, "lane.v04.raw-traffic-logs-missing", "V-04 requires raw traffic logs tied to the simulated-to-real path.", "artifactRefs.trafficResults");
    }
  }

  if (requirementId === "V-05") {
    const virtualDut = isPlainRecord(dut.virtual) ? dut.virtual : null;

    if (!virtualDut) {
      addLaneGap(gaps, requirementId, "lane.v05.virtual-dut-missing", "V-05 requires retained virtual DUT identity.", "dut.virtual");
      return;
    }

    if (!stringValue(virtualDut, "imageRef") || !stringValue(virtualDut, "testbenchRef")) {
      addLaneGap(gaps, requirementId, "lane.v05.testbench-refs-missing", "V-05 requires virtual DUT image and testbench refs.", "dut.virtual.testbenchRef");
    }

    if (!hasAny(stringArray(virtualDut.configRefs)) || !hasAny(stringArray(virtualDut.outputRefs))) {
      addLaneGap(gaps, requirementId, "lane.v05.config-output-refs-missing", "V-05 requires virtual DUT config and output refs.", "dut.virtual.outputRefs");
    }

    if (!hasAny(ownerVerdictRefsForRequirement(manifest, requirementId))) {
      addLaneGap(gaps, requirementId, "lane.v05.owner-verdict-refs-missing", "V-05 requires virtual DUT owner verdict refs.", "dut.virtual.ownerVerdictRefs");
    }
  }

  if (requirementId === "V-06") {
    const physicalDut = isPlainRecord(dut.physical) ? dut.physical : null;
    const neOne = isPlainRecord(trafficGenerator.neOne) ? trafficGenerator.neOne : null;
    const otherGenerators = recordArray(trafficGenerator.other);
    const generatorRecords = neOne ? [neOne, ...otherGenerators] : otherGenerators;

    if (!physicalDut && generatorRecords.length === 0) {
      addLaneGap(gaps, requirementId, "lane.v06.dut-generator-missing", "V-06 requires physical DUT or traffic-generator identity.", "dut.physical");
      return;
    }

    if (
      !hasAny(stringArray(topology.diagramRefs)) &&
      !(physicalDut && (hasAny(stringArray(physicalDut.portMappingRefs)) || hasAny(stringArray(physicalDut.cablingRefs))))
    ) {
      addLaneGap(gaps, requirementId, "lane.v06.topology-cabling-refs-missing", "V-06 requires topology, cabling, or port-mapping refs.", "topology.diagramRefs");
    }

    if (
      !hasAny(refsFromRecords(generatorRecords, ["profileRef", "configRefs"])) &&
      !hasAny(stringArray(trafficProfile.successCriteriaRefs))
    ) {
      addLaneGap(gaps, requirementId, "lane.v06.profile-refs-missing", "V-06 requires traffic-generator or traffic-profile refs.", "trafficGenerator.neOne.profileRef");
    }

    if (
      !hasAny(refsFromRecords(generatorRecords, ["outputRefs"])) &&
      !(physicalDut && hasAny(stringArray(physicalDut.logRefs))) &&
      !hasAny(artifactStringRefs(manifest, "dutOutputs"))
    ) {
      addLaneGap(gaps, requirementId, "lane.v06.raw-output-refs-missing", "V-06 requires physical DUT or generator raw output refs.", "trafficGenerator.neOne.outputRefs");
    }

    if (!hasAny(ownerVerdictRefsForRequirement(manifest, requirementId))) {
      addLaneGap(gaps, requirementId, "lane.v06.owner-verdict-refs-missing", "V-06 requires physical DUT, generator, or lab owner verdict refs.", "reviewerVerdicts.ownerVerdictRefs");
    }
  }
}

function hasBlockingGaps(gaps: ReadonlyArray<ItriExternalValidationReviewGap>): boolean {
  return gaps.some((gap) => gap.severity === "blocking");
}

function hasRejectGap(gaps: ReadonlyArray<ItriExternalValidationReviewGap>): boolean {
  return gaps.some((gap) =>
    (BLOCKING_REJECT_CODES as ReadonlyArray<string>).includes(gap.code)
  );
}

function isRedactedReviewable(policy: PlainRecord | null): boolean {
  const level = policy ? stringValue(policy, "redactionLevel") : null;
  const auditability = policy ? stringValue(policy, "auditability") : null;

  return (
    (level === "partial" || level === "heavy") &&
    (auditability === "full" || auditability === "reviewable")
  );
}

function refsResolved(
  refs: ReadonlyArray<string>,
  artifactRefCheck: ItriExternalValidationArtifactRefCheck
): boolean {
  const resolved = new Set(artifactRefCheck.resolvedRefs);

  return refs.length > 0 && refs.every((ref) => resolved.has(ref));
}

function allRefsAreScreenshots(
  refs: ReadonlyArray<string>,
  manifest: PlainRecord
): boolean {
  const screenshots = new Set(screenshotRefs(manifest));

  return refs.length > 0 && refs.every((ref) => screenshots.has(ref));
}

function reviewAuthorityPassEligibility(options: {
  manifest: PlainRecord;
  requirementId: ItriExternalValidationRequirementId;
  verdict: ReviewerVerdictLike;
  policy: PlainRecord | null;
  artifactRefCheck: ItriExternalValidationArtifactRefCheck;
  gaps: ItriExternalValidationReviewGap[];
}): void {
  const { manifest, requirementId, verdict, policy, artifactRefCheck, gaps } = options;

  if (verdict.sourceArtifactRefs.length === 0) {
    addGap(
      gaps,
      "authority-pass.source-artifact-refs-missing",
      `${requirementId} authority-pass requires retained raw sourceArtifactRefs.`,
      { requirementId, path: "reviewerVerdicts.sourceArtifactRefs" }
    );
  } else if (!refsResolved(verdict.sourceArtifactRefs, artifactRefCheck)) {
    addGap(
      gaps,
      "authority-pass.source-artifact-refs-unresolved",
      `${requirementId} authority-pass sourceArtifactRefs must resolve inside the retained package.`,
      { requirementId, path: "reviewerVerdicts.sourceArtifactRefs" }
    );
  }

  if (allRefsAreScreenshots(verdict.sourceArtifactRefs, manifest)) {
    addGap(
      gaps,
      "authority-pass.screenshot-only-evidence",
      `${requirementId} authority-pass cannot be supported by screenshot refs without retained raw artifacts.`,
      { requirementId, path: "reviewerVerdicts.sourceArtifactRefs" }
    );
  }

  if (verdict.ownerVerdictRefs.length === 0) {
    addGap(
      gaps,
      "authority-pass.owner-verdict-refs-missing",
      `${requirementId} authority-pass requires validation-owner verdict refs.`,
      { requirementId, path: "reviewerVerdicts.ownerVerdictRefs" }
    );
  } else if (!refsResolved(verdict.ownerVerdictRefs, artifactRefCheck)) {
    addGap(
      gaps,
      "authority-pass.owner-verdict-refs-unresolved",
      `${requirementId} authority-pass ownerVerdictRefs must resolve inside the retained package.`,
      { requirementId, path: "reviewerVerdicts.ownerVerdictRefs" }
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
  requirementId: ItriExternalValidationRequirementId;
  packageGaps: ReadonlyArray<ItriExternalValidationReviewGap>;
  policy: PlainRecord | null;
  artifactRefCheck: ItriExternalValidationArtifactRefCheck;
  reviewedAt: string;
  syntheticSourceDetected: boolean;
}): ItriExternalValidationRequirementReview {
  const {
    manifest,
    requirementId,
    packageGaps,
    policy,
    artifactRefCheck,
    reviewedAt,
    syntheticSourceDetected
  } = options;
  const verdict =
    reviewerVerdicts(manifest).find((candidate) => candidate.requirementId === requirementId) ??
    null;
  const gaps: ItriExternalValidationReviewGap[] = packageGaps.filter(
    (gap) => !gap.requirementId || gap.requirementId === requirementId
  );
  const rawRefs = rawArtifactRefsForRequirement(manifest, requirementId);
  const ownerVerdictRefs = ownerVerdictRefsForRequirement(manifest, requirementId);

  reviewLaneMaterial(manifest, requirementId, gaps);

  if (rawRefs.length === 0) {
    addGap(
      gaps,
      "requirement.raw-artifact-refs-missing",
      `${requirementId} requires retained raw artifact refs before it can support external validation review.`,
      { requirementId, path: "artifactRefs" }
    );
  } else if (allRefsAreScreenshots(rawRefs, manifest)) {
    addGap(
      gaps,
      "requirement.screenshot-only-evidence",
      `${requirementId} raw evidence cannot be satisfied by screenshots alone.`,
      { requirementId, path: "artifactRefs.screenshots" }
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

  let reviewerState: ItriExternalValidationReviewerState =
    verdict?.reviewerState ??
    (isRedactedReviewable(policy) ? "redacted-reviewable" : "importable");

  if (
    syntheticSourceDetected ||
    gaps.some((gap) => gap.code === "related-measured-traffic.truth-promotion") ||
    gaps.some((gap) => gap.code === "redaction-policy.auditability-blocked") ||
    gaps.some((gap) => gap.code === "artifact-ref.escapes-package") ||
    gaps.some((gap) => gap.code === "artifact-ref.external-url") ||
    verdict?.reviewerState === "rejected"
  ) {
    reviewerState = "rejected";
  } else if (hasBlockingGaps(gaps)) {
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
    ownerVerdictRefs: verdict?.ownerVerdictRefs ?? ownerVerdictRefs,
    relatedMeasuredTrafficPackageRefs:
      verdict?.relatedMeasuredTrafficPackageRefs ?? [],
    reviewer: {
      nameOrRole:
        verdict?.reviewer.nameOrRole ??
        "V-02R1 external validation manifest reviewer",
      reviewedAt:
        verdict?.reviewer.reviewedAt &&
        Number.isFinite(Date.parse(verdict.reviewer.reviewedAt))
          ? new Date(Date.parse(verdict.reviewer.reviewedAt)).toISOString()
          : reviewedAt,
      notes:
        verdict?.reviewer.notes && verdict.reviewer.notes.length > 0
          ? verdict.reviewer.notes
          : [
              "Reviewer state is per V requirement and remains a package-review state, not a runtime authority verdict."
            ]
    },
    gaps
  };
}

function packageStateFromRequirementReviews(options: {
  requirementReviews: ReadonlyArray<ItriExternalValidationRequirementReview>;
  policy: PlainRecord | null;
  syntheticSourceDetected: boolean;
  gaps: ReadonlyArray<ItriExternalValidationReviewGap>;
}): ItriExternalValidationPackageReviewState {
  const { requirementReviews, policy, syntheticSourceDetected, gaps } = options;

  if (
    syntheticSourceDetected ||
    hasRejectGap(gaps) ||
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

export function reviewItriExternalValidationManifest({
  manifest,
  packagePath,
  manifestPath = defaultManifestPath(packagePath),
  reviewedAt,
  artifactRefCheck
}: ItriExternalValidationManifestReviewOptions): ItriExternalValidationManifestReview {
  const resolvedReviewTime = parseReviewTime(reviewedAt);
  const normalizedPackagePath = normalizePackagePath(packagePath);
  const normalizedManifestPath = normalizePackagePath(manifestPath);
  const artifactSummary =
    artifactRefCheck ??
    {
      declaredRefs: collectItriExternalValidationArtifactRefs(manifest),
      resolvedRefs: [],
      unresolvedRefs: [],
      escapedRefs: [],
      externalRefs: []
    };

  if (!isPlainRecord(manifest)) {
    const gaps: ItriExternalValidationReviewGap[] = [];
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

  const gaps: ItriExternalValidationReviewGap[] = [];
  addRequiredRootFieldGaps(manifest, gaps);
  const manifestSchemaVersion = reviewSchemaVersion(manifest, gaps);
  reviewPackagePath(manifest, normalizedPackagePath, gaps);
  reviewTimestamp(manifest, "capturedAt", gaps);
  reviewTimestamp(manifest, "capturedUntil", gaps);
  reviewOwner(manifest, gaps);
  reviewReviewer(manifest, gaps);
  const policy = reviewRedactionPolicy(manifest, gaps);
  const coveredRequirements = reviewCoveredRequirements(manifest, gaps);
  reviewArtifactRefs(manifest, artifactSummary, gaps);
  reviewReviewerVerdictsShape(manifest, coveredRequirements, gaps);
  const syntheticReview = reviewSyntheticBoundary(manifest, gaps);
  reviewNonClaims(manifest, gaps);
  const relatedMeasuredTrafficReview = reviewRelatedMeasuredTrafficPackages(
    manifest,
    gaps
  );
  const reviewRequirements =
    coveredRequirements.length > 0
      ? coveredRequirements
      : [...CUSTOMER_EXTERNAL_VALIDATION_REQUIREMENTS];
  const requirementReviews = reviewRequirements.map((requirementId) =>
    buildRequirementReview({
      manifest,
      requirementId,
      packageGaps: gaps,
      policy,
      artifactRefCheck: artifactSummary,
      reviewedAt: resolvedReviewTime,
      syntheticSourceDetected: syntheticReview.syntheticSourceDetected
    })
  );

  return {
    schemaVersion: CUSTOMER_EXTERNAL_VALIDATION_MANIFEST_REVIEW_SCHEMA_VERSION,
    reviewedAt: resolvedReviewTime,
    packagePath: normalizedPackagePath,
    manifestPath: normalizedManifestPath,
    packageState: packageStateFromRequirementReviews({
      requirementReviews,
      policy,
      syntheticSourceDetected: syntheticReview.syntheticSourceDetected,
      gaps
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
      escapedRefs: [...artifactSummary.escapedRefs],
      externalRefs: [...artifactSummary.externalRefs]
    },
    redaction: buildRedactionReview(policy),
    syntheticProvenance: syntheticReview,
    relatedMeasuredTrafficPackages: relatedMeasuredTrafficReview,
    nonClaims: nonClaims()
  };
}
