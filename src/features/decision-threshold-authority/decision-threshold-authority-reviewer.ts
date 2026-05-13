export const ITRI_F12_DECISION_THRESHOLD_AUTHORITY_PACKAGE_SCHEMA_VERSION =
  "itri.f12.decision-threshold-authority.v1" as const;
export const ITRI_F12_DECISION_THRESHOLD_AUTHORITY_REVIEW_SCHEMA_VERSION =
  "itri.f12r1.decision-threshold-authority-review.v1" as const;
export const ITRI_F12_DECISION_THRESHOLD_AUTHORITY_PACKAGE_ROOT =
  "output/validation/external-f12" as const;
export const ITRI_F12_MEASURED_TRAFFIC_PACKAGE_ROOT =
  "output/validation/external-f07-f09" as const;

export const ITRI_F12_REQUIREMENTS = ["F-12"] as const;
export const ITRI_F12_MEASURED_REQUIREMENTS = [
  "F-07",
  "F-08",
  "F-09"
] as const;
export const ITRI_F12_DECISION_INPUTS = [
  "latency",
  "jitter",
  "loss",
  "throughput",
  "networkSpeed",
  "continuity",
  "handoverWindow"
] as const;

export type ItriF12RequirementId = (typeof ITRI_F12_REQUIREMENTS)[number];
export type ItriF12MeasuredRequirementId =
  (typeof ITRI_F12_MEASURED_REQUIREMENTS)[number];
export type ItriF12DecisionInput = (typeof ITRI_F12_DECISION_INPUTS)[number];

export type ItriF12AuthorityReviewerState =
  | "schema-ready"
  | "pending-measured-fields"
  | "pending-threshold-authority"
  | "rejected"
  | "authority-ready";

export type ItriF12AuthorityPackageReviewState =
  | "missing"
  | ItriF12AuthorityReviewerState;

export type ItriF12AuthorityReviewGapSeverity = "blocking" | "warning";

export interface ItriF12AuthorityReviewGap {
  code: string;
  message: string;
  severity: ItriF12AuthorityReviewGapSeverity;
  path?: string;
  requirementId?: ItriF12RequirementId | ItriF12MeasuredRequirementId;
}

export interface ItriF12AuthorityArtifactRefCheck {
  declaredRefs: ReadonlyArray<string>;
  resolvedRefs: ReadonlyArray<string>;
  unresolvedRefs: ReadonlyArray<string>;
  escapedRefs: ReadonlyArray<string>;
}

export interface ItriF12MeasuredTrafficRequirementReviewInput {
  requirementId: string;
  reviewerState: string;
  sourceArtifactRefs?: ReadonlyArray<string>;
  parsedMetricRefs?: ReadonlyArray<string>;
  thresholdRuleRefs?: ReadonlyArray<string>;
}

export interface ItriF12MeasuredTrafficReviewInput {
  packagePath: string;
  packageState: string;
  packageId?: string | null;
  runId?: string | null;
  coveredRequirements?: ReadonlyArray<string>;
  requirementReviews?: ReadonlyArray<ItriF12MeasuredTrafficRequirementReviewInput>;
  artifactRefSummary?: {
    declaredRefs?: ReadonlyArray<string>;
    resolvedRefs?: ReadonlyArray<string>;
    unresolvedRefs?: ReadonlyArray<string>;
    escapedRefs?: ReadonlyArray<string>;
  };
  thresholdAuthority?: {
    thresholdOwnerPresent?: boolean;
    thresholdVersionPresent?: boolean;
    unresolvedThresholdState?: string | null;
    requirementRuleCount?: number;
    notes?: ReadonlyArray<string>;
  };
}

export interface ItriF12ReferencedMeasuredPackageReview {
  packagePath: string | null;
  packageId: string | null;
  referencedRequirements: ReadonlyArray<ItriF12MeasuredRequirementId>;
  sourceReviewState: string | null;
  reviewerStates: ReadonlyArray<{
    requirementId: ItriF12MeasuredRequirementId;
    reviewerState: string | null;
    sufficientForMeasuredInput: boolean;
  }>;
  thresholdAuthority: {
    thresholdOwnerPresent: boolean;
    thresholdVersionPresent: boolean;
    unresolvedThresholdState: string | null;
    requirementRuleCount: number;
    thresholdStateReady: boolean;
  };
  gaps: ReadonlyArray<ItriF12AuthorityReviewGap>;
}

export interface ItriF12ThresholdAuthorityReview {
  externalAuthorityRequired: true;
  thresholdOwnerPresent: boolean;
  thresholdVersionPresent: boolean;
  approvalRecordPresent: boolean;
  approvalRefPresent: boolean;
  requirementScopeIncludesF12: boolean;
  effectiveDatePresent: boolean;
  supersessionPolicyPresent: boolean;
  unresolvedState: string | null;
  decisionRuleCount: number;
  notes: ReadonlyArray<string>;
}

export interface ItriF12AuthoritySyntheticReview {
  syntheticSourceDetected: boolean;
  detectedPaths: ReadonlyArray<string>;
  authorityPackageAllowsSyntheticSource: false | null;
  rejectAuthorityReviewWhenSourceTierIsSynthetic: true | null;
}

export interface ItriF12AuthorityNonClaims {
  liveControl: false;
  measuredDecisionTruth: false;
  nativeRadioFrequencyHandover: false;
  externalTrafficControl: false;
  completeItriAcceptance: false;
  externalValidationVerdict: false;
  dutNatTunnelVerdict: false;
  itriOrbitModelIntegration: false;
  boundedProxyIsAuthorityRule: false;
}

export interface ItriF12AuthorityPackageReview {
  schemaVersion: typeof ITRI_F12_DECISION_THRESHOLD_AUTHORITY_REVIEW_SCHEMA_VERSION;
  reviewedAt: string;
  packagePath: string;
  manifestPath: string;
  packageState: ItriF12AuthorityPackageReviewState;
  manifestSchemaVersion: string | null;
  authorityId: string | null;
  coveredRequirements: ReadonlyArray<ItriF12RequirementId>;
  requestedReviewerState: ItriF12AuthorityReviewerState | null;
  measuredPackageReviews: ReadonlyArray<ItriF12ReferencedMeasuredPackageReview>;
  gaps: ReadonlyArray<ItriF12AuthorityReviewGap>;
  artifactRefSummary: ItriF12AuthorityArtifactRefCheck;
  thresholdAuthority: ItriF12ThresholdAuthorityReview;
  syntheticProvenance: ItriF12AuthoritySyntheticReview;
  nonClaims: ItriF12AuthorityNonClaims;
}

export interface ItriF12AuthorityPackageReviewOptions {
  manifest: unknown;
  packagePath: string;
  manifestPath?: string;
  reviewedAt?: string;
  artifactRefCheck?: ItriF12AuthorityArtifactRefCheck;
  measuredPackageReviews?: ReadonlyArray<ItriF12MeasuredTrafficReviewInput>;
}

export interface ItriF12AuthorityClosedReviewOptions {
  packagePath: string;
  manifestPath?: string;
  reviewedAt?: string;
}

export interface ItriF12AuthorityMalformedReviewOptions
  extends ItriF12AuthorityClosedReviewOptions {
  parseError: string;
}

type PlainRecord = Record<string, unknown>;

const REQUIRED_NON_CLAIMS: ItriF12AuthorityNonClaims = {
  liveControl: false,
  measuredDecisionTruth: false,
  nativeRadioFrequencyHandover: false,
  externalTrafficControl: false,
  completeItriAcceptance: false,
  externalValidationVerdict: false,
  dutNatTunnelVerdict: false,
  itriOrbitModelIntegration: false,
  boundedProxyIsAuthorityRule: false
};

const EMPTY_ARTIFACT_REF_CHECK: ItriF12AuthorityArtifactRefCheck = {
  declaredRefs: [],
  resolvedRefs: [],
  unresolvedRefs: [],
  escapedRefs: []
};

const REQUIRED_ROOT_FIELDS = [
  "schemaVersion",
  "authorityId",
  "owner",
  "receivedAt",
  "thresholdVersion",
  "ruleVersion",
  "reviewer",
  "redactionPolicy",
  "useNotes",
  "coveredRequirements",
  "measuredPackageRefs",
  "thresholdAuthority",
  "decisionRules",
  "reviewerState",
  "syntheticFallbackBoundary",
  "nonClaims"
] as const;

const BLOCKING_REJECT_CODES = [
  "package.path-outside-retained-root",
  "measured-package.path-outside-retained-root",
  "artifact-ref.escapes-package",
  "synthetic-source.rejected",
  "bounded-proxy.authority-disallowed"
] as const;

const MEASURED_REQUIREMENTS_BY_DECISION_INPUT: Record<
  ItriF12DecisionInput,
  ReadonlyArray<ItriF12MeasuredRequirementId>
> = {
  latency: ["F-07", "F-08"],
  jitter: ["F-08"],
  loss: ["F-08", "F-09"],
  throughput: ["F-09"],
  networkSpeed: ["F-09"],
  continuity: ["F-07", "F-08", "F-09"],
  handoverWindow: ["F-07", "F-08", "F-09"]
};

function nonClaims(): ItriF12AuthorityNonClaims {
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
  gaps: ItriF12AuthorityReviewGap[],
  code: string,
  message: string,
  options: {
    severity?: ItriF12AuthorityReviewGapSeverity;
    path?: string;
    requirementId?: ItriF12RequirementId | ItriF12MeasuredRequirementId;
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

export function isAllowedItriF12DecisionThresholdAuthorityPackagePath(
  packagePath: string
): boolean {
  const normalized = normalizePackagePath(packagePath);
  const root = ITRI_F12_DECISION_THRESHOLD_AUTHORITY_PACKAGE_ROOT;

  return (
    normalized.startsWith(`${root}/`) &&
    !normalized.includes("/../") &&
    !normalized.startsWith("../") &&
    !normalized.startsWith("/")
  );
}

export function isAllowedItriF12ReferencedMeasuredTrafficPackagePath(
  packagePath: string
): boolean {
  const normalized = normalizePackagePath(packagePath);
  const root = ITRI_F12_MEASURED_TRAFFIC_PACKAGE_ROOT;

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

function closedReview(
  options: ItriF12AuthorityClosedReviewOptions & {
    packageState: ItriF12AuthorityPackageReviewState;
    gaps: ReadonlyArray<ItriF12AuthorityReviewGap>;
    manifestSchemaVersion?: string | null;
  }
): ItriF12AuthorityPackageReview {
  const reviewedAt = parseReviewTime(options.reviewedAt);

  return {
    schemaVersion: ITRI_F12_DECISION_THRESHOLD_AUTHORITY_REVIEW_SCHEMA_VERSION,
    reviewedAt,
    packagePath: normalizePackagePath(options.packagePath),
    manifestPath: options.manifestPath ?? defaultManifestPath(options.packagePath),
    packageState: options.packageState,
    manifestSchemaVersion: options.manifestSchemaVersion ?? null,
    authorityId: null,
    coveredRequirements: ["F-12"],
    requestedReviewerState: null,
    measuredPackageReviews: [],
    gaps: options.gaps,
    artifactRefSummary: { ...EMPTY_ARTIFACT_REF_CHECK },
    thresholdAuthority: {
      externalAuthorityRequired: true,
      thresholdOwnerPresent: false,
      thresholdVersionPresent: false,
      approvalRecordPresent: false,
      approvalRefPresent: false,
      requirementScopeIncludesF12: false,
      effectiveDatePresent: false,
      supersessionPolicyPresent: false,
      unresolvedState: null,
      decisionRuleCount: 0,
      notes: [
        "F-12 threshold authority remains external and was not available to this package review."
      ]
    },
    syntheticProvenance: {
      syntheticSourceDetected: false,
      detectedPaths: [],
      authorityPackageAllowsSyntheticSource: null,
      rejectAuthorityReviewWhenSourceTierIsSynthetic: null
    },
    nonClaims: nonClaims()
  };
}

export function reviewMissingItriF12DecisionThresholdAuthorityPackage(
  options: ItriF12AuthorityClosedReviewOptions
): ItriF12AuthorityPackageReview {
  const gaps: ItriF12AuthorityReviewGap[] = [];
  addGap(
    gaps,
    "package.missing",
    "No retained F-12 decision-threshold authority package exists at the explicitly named path.",
    { path: normalizePackagePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "missing",
    gaps
  });
}

export function reviewMissingItriF12DecisionThresholdAuthorityManifest(
  options: ItriF12AuthorityClosedReviewOptions
): ItriF12AuthorityPackageReview {
  const gaps: ItriF12AuthorityReviewGap[] = [];
  addGap(
    gaps,
    "manifest.missing",
    "Package directory exists, but manifest.json was not found at the explicitly named manifest path.",
    { path: options.manifestPath ?? defaultManifestPath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "pending-measured-fields",
    gaps
  });
}

export function reviewMalformedItriF12DecisionThresholdAuthorityManifest(
  options: ItriF12AuthorityMalformedReviewOptions
): ItriF12AuthorityPackageReview {
  const gaps: ItriF12AuthorityReviewGap[] = [];
  addGap(gaps, "manifest.malformed-json", options.parseError, {
    path: options.manifestPath ?? defaultManifestPath(options.packagePath)
  });

  return closedReview({
    ...options,
    packageState: "pending-measured-fields",
    gaps
  });
}

export function reviewRejectedItriF12DecisionThresholdAuthorityPackagePath(
  options: ItriF12AuthorityClosedReviewOptions
): ItriF12AuthorityPackageReview {
  const gaps: ItriF12AuthorityReviewGap[] = [];
  addGap(
    gaps,
    "package.path-outside-retained-root",
    `F-12 authority package path must be under ${ITRI_F12_DECISION_THRESHOLD_AUTHORITY_PACKAGE_ROOT}/.`,
    { path: normalizePackagePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "rejected",
    gaps
  });
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

function addApprovalRefs(refs: Set<string>, approvalRecord: unknown): void {
  if (!isPlainRecord(approvalRecord)) {
    return;
  }

  addStringRef(refs, approvalRecord.approvalRef);
  addStringRefs(refs, approvalRecord.approvalRefs);
  addStringRefs(refs, approvalRecord.retainedRefs);
  addStringRefs(refs, approvalRecord.sourceArtifactRefs);
}

export function collectItriF12DecisionThresholdAuthorityArtifactRefs(
  manifest: unknown
): ReadonlyArray<string> {
  const refs = new Set<string>();

  if (!isPlainRecord(manifest)) {
    return [];
  }

  addStringRefs(refs, manifest.sourceArtifactRefs);
  addStringRefs(refs, manifest.approvalRefs);
  addStringRefs(refs, manifest.reviewerVerdictRefs);
  addStringRefs(refs, manifest.parsedMetricRefs);
  addStringRefs(refs, manifest.thresholdRuleRefs);
  addStringRefs(refs, manifest.handoverEventRefs);

  for (const measuredRef of recordArray(manifest.measuredPackageRefs)) {
    addStringRefs(refs, measuredRef.sourceArtifactRefs);
    addStringRefs(refs, measuredRef.reviewerVerdictRefs);
    addStringRefs(refs, measuredRef.parsedMetricRefs);
    addStringRefs(refs, measuredRef.thresholdRuleRefs);
    addStringRefs(refs, measuredRef.handoverEventRefs);
  }

  if (isPlainRecord(manifest.thresholdAuthority)) {
    addApprovalRefs(refs, manifest.thresholdAuthority.approvalRecord);
  }

  for (const rule of recordArray(manifest.decisionRules)) {
    addStringRef(refs, rule.measuredFieldRef);
    addStringRefs(refs, rule.sourceArtifactRefs);
    addStringRefs(refs, rule.thresholdRuleRefs);
    addStringRefs(refs, rule.reviewerVerdictRefs);

    if (isPlainRecord(rule.sampleWindowBasis)) {
      addStringRefs(refs, rule.sampleWindowBasis.eventRefs);
      addStringRef(refs, rule.sampleWindowBasis.clockSyncRef);
    }
  }

  return [...refs].sort();
}

function addRequiredRootFieldGaps(manifest: PlainRecord, gaps: ItriF12AuthorityReviewGap[]): void {
  for (const field of REQUIRED_ROOT_FIELDS) {
    if (!hasOwn(manifest, field)) {
      addGap(gaps, "manifest.required-field-missing", `Manifest is missing required field ${field}.`, {
        path: field
      });
    }
  }
}

function reviewSchemaVersion(manifest: PlainRecord, gaps: ItriF12AuthorityReviewGap[]): string | null {
  const schemaVersion = stringValue(manifest, "schemaVersion");

  if (schemaVersion !== ITRI_F12_DECISION_THRESHOLD_AUTHORITY_PACKAGE_SCHEMA_VERSION) {
    addGap(
      gaps,
      "manifest.schema-version",
      `Manifest schemaVersion must be ${ITRI_F12_DECISION_THRESHOLD_AUTHORITY_PACKAGE_SCHEMA_VERSION}.`,
      { path: "schemaVersion" }
    );
  }

  return schemaVersion;
}

function reviewPackagePath(
  manifest: PlainRecord,
  packagePath: string,
  gaps: ItriF12AuthorityReviewGap[]
): void {
  const normalizedPackagePath = normalizePackagePath(packagePath);

  if (!isAllowedItriF12DecisionThresholdAuthorityPackagePath(normalizedPackagePath)) {
    addGap(
      gaps,
      "package.path-outside-retained-root",
      `Package path must be explicitly under ${ITRI_F12_DECISION_THRESHOLD_AUTHORITY_PACKAGE_ROOT}/.`,
      { path: "packagePath" }
    );
  }

  const packagePathFromManifest = stringValue(manifest, "packagePath");

  if (packagePathFromManifest) {
    addGap(
      gaps,
      "manifest.package-path-ignored",
      "F-12 authority package scope is the explicitly named retained path; manifest packagePath is metadata only for this contract.",
      { severity: "warning", path: "packagePath" }
    );
  }
}

function reviewTimestamp(
  manifest: PlainRecord,
  key: "receivedAt",
  gaps: ItriF12AuthorityReviewGap[]
): void {
  const value = stringValue(manifest, key);

  if (!value || !Number.isFinite(Date.parse(value))) {
    addGap(gaps, "manifest.timestamp", `${key} must be an ISO-8601 timestamp.`, {
      path: key
    });
  }
}

function reviewOwner(manifest: PlainRecord, gaps: ItriF12AuthorityReviewGap[]): void {
  const owner = manifest.owner;

  if (!isPlainRecord(owner)) {
    addGap(gaps, "owner.missing", "owner must be an object with organization, role, and authorityScope.", {
      path: "owner"
    });
    return;
  }

  for (const key of ["organization", "role"] as const) {
    if (!stringValue(owner, key)) {
      addGap(gaps, "owner.required-field-missing", `owner.${key} is required.`, {
        path: `owner.${key}`
      });
    }
  }

  if (stringArray(owner.authorityScope).length === 0) {
    addGap(gaps, "owner.authority-scope-missing", "owner.authorityScope must name the retained authority scope.", {
      path: "owner.authorityScope"
    });
  }
}

function reviewReviewer(manifest: PlainRecord, gaps: ItriF12AuthorityReviewGap[]): void {
  const reviewer = manifest.reviewer;

  if (!isPlainRecord(reviewer)) {
    addGap(gaps, "reviewer.missing", "reviewer must retain nameOrRole, reviewScope, and reviewedAt.", {
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

  if (!stringArray(reviewer.reviewScope).includes("F-12")) {
    addGap(gaps, "reviewer.scope-missing", "reviewer.reviewScope must include F-12.", {
      path: "reviewer.reviewScope"
    });
  }
}

function reviewRedactionPolicy(
  manifest: PlainRecord,
  gaps: ItriF12AuthorityReviewGap[]
): PlainRecord | null {
  const policy = manifest.redactionPolicy;

  if (!isPlainRecord(policy)) {
    addGap(gaps, "redaction-policy.missing", "redactionPolicy must be retained with owner, version, and auditability.", {
      path: "redactionPolicy"
    });
    return null;
  }

  for (const key of ["policyId", "policyVersion", "owner", "auditability"] as const) {
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

  if (stringValue(policy, "auditability") === "blocked") {
    addGap(gaps, "redaction-policy.auditability-blocked", "Audit-blocking redaction cannot support F-12 authority review.", {
      path: "redactionPolicy.auditability"
    });
  }

  return policy;
}

function reviewCoveredRequirements(
  manifest: PlainRecord,
  gaps: ItriF12AuthorityReviewGap[]
): ReadonlyArray<ItriF12RequirementId> {
  const covered = stringArray(manifest.coveredRequirements).filter(
    (requirement): requirement is ItriF12RequirementId => requirement === "F-12"
  );

  if (!covered.includes("F-12")) {
    addGap(gaps, "requirements.covered-missing", "coveredRequirements must include F-12.", {
      path: "coveredRequirements"
    });
  }

  if (arrayValue(manifest.coveredRequirements).length !== covered.length) {
    addGap(gaps, "requirements.covered-invalid", "coveredRequirements may contain only F-12 for this reviewer.", {
      path: "coveredRequirements"
    });
  }

  return [...new Set(covered)];
}

function reviewerStateFromUnknown(value: unknown): ItriF12AuthorityReviewerState | null {
  return typeof value === "string" &&
    [
      "schema-ready",
      "pending-measured-fields",
      "pending-threshold-authority",
      "rejected",
      "authority-ready"
    ].includes(value)
    ? (value as ItriF12AuthorityReviewerState)
    : null;
}

function measuredRequirementFromUnknown(value: unknown): ItriF12MeasuredRequirementId | null {
  return typeof value === "string" &&
    (ITRI_F12_MEASURED_REQUIREMENTS as ReadonlyArray<string>).includes(value)
    ? (value as ItriF12MeasuredRequirementId)
    : null;
}

function reviewRequestedReviewerState(
  manifest: PlainRecord,
  gaps: ItriF12AuthorityReviewGap[]
): ItriF12AuthorityReviewerState | null {
  const reviewerState = reviewerStateFromUnknown(manifest.reviewerState);

  if (!reviewerState) {
    addGap(
      gaps,
      "reviewer-state.invalid",
      "reviewerState must be one of schema-ready, pending-measured-fields, pending-threshold-authority, rejected, or authority-ready.",
      { path: "reviewerState" }
    );
  }

  return reviewerState;
}

function hasBlockingGaps(gaps: ReadonlyArray<ItriF12AuthorityReviewGap>): boolean {
  return gaps.some((gap) => gap.severity === "blocking");
}

function hasRejectGap(gaps: ReadonlyArray<ItriF12AuthorityReviewGap>): boolean {
  return gaps.some((gap) =>
    (BLOCKING_REJECT_CODES as ReadonlyArray<string>).includes(gap.code)
  );
}

function reviewArtifactRefs(
  artifactRefCheck: ItriF12AuthorityArtifactRefCheck,
  gaps: ItriF12AuthorityReviewGap[]
): void {
  for (const ref of artifactRefCheck.escapedRefs) {
    addGap(gaps, "artifact-ref.escapes-package", "Authority package refs must resolve inside the retained F-12 package directory.", {
      path: ref
    });
  }

  for (const ref of artifactRefCheck.unresolvedRefs) {
    addGap(gaps, "artifact-ref.unresolved", "Declared authority package ref does not resolve inside the retained F-12 package directory.", {
      path: ref
    });
  }

  if (artifactRefCheck.declaredRefs.length === 0) {
    addGap(gaps, "artifact-ref.none-declared", "Manifest must declare retained authority package refs for approval, measured mappings, rules, and review fields.", {
      path: "measuredPackageRefs"
    });
  }
}

function measuredReviewByPath(
  reviews: ReadonlyArray<ItriF12MeasuredTrafficReviewInput>
): Map<string, ItriF12MeasuredTrafficReviewInput> {
  return new Map(
    reviews.map((review) => [normalizePackagePath(review.packagePath), review])
  );
}

function measuredRequirementReviews(
  review: ItriF12MeasuredTrafficReviewInput
): ReadonlyArray<ItriF12MeasuredTrafficRequirementReviewInput> {
  return review.requirementReviews ?? [];
}

function measuredReviewStateIsSufficient(state: string | null): boolean {
  return (
    state === "importable" ||
    state === "redacted-reviewable" ||
    state === "authority-pass"
  );
}

function measuredPackageStateIsSufficient(state: string | null): boolean {
  return state === "importable" || state === "redacted-reviewable";
}

function addReviewedRefCoverage(
  coverage: Map<string, Set<ItriF12MeasuredRequirementId>>,
  ref: string,
  requirementId: ItriF12MeasuredRequirementId
): void {
  const coveredRequirements = coverage.get(ref) ?? new Set<ItriF12MeasuredRequirementId>();

  coveredRequirements.add(requirementId);
  coverage.set(ref, coveredRequirements);
}

function sufficientReviewedRefCoverage(
  review: ItriF12MeasuredTrafficReviewInput,
  requirementIds: ReadonlyArray<ItriF12MeasuredRequirementId>
): {
  parsedMetricRefs: Map<string, Set<ItriF12MeasuredRequirementId>>;
  thresholdRuleRefs: Map<string, Set<ItriF12MeasuredRequirementId>>;
} {
  const allowedRequirements = new Set(requirementIds);
  const parsedMetricRefs = new Map<string, Set<ItriF12MeasuredRequirementId>>();
  const thresholdRuleRefs = new Map<string, Set<ItriF12MeasuredRequirementId>>();

  for (const requirementReview of measuredRequirementReviews(review)) {
    const requirementId = measuredRequirementFromUnknown(requirementReview.requirementId);

    if (
      !requirementId ||
      !allowedRequirements.has(requirementId) ||
      !measuredReviewStateIsSufficient(requirementReview.reviewerState ?? null)
    ) {
      continue;
    }

    for (const ref of requirementReview.parsedMetricRefs ?? []) {
      addReviewedRefCoverage(parsedMetricRefs, ref, requirementId);
    }

    for (const ref of requirementReview.thresholdRuleRefs ?? []) {
      addReviewedRefCoverage(thresholdRuleRefs, ref, requirementId);
    }
  }

  return {
    parsedMetricRefs,
    thresholdRuleRefs
  };
}

function hasCoverageForAnyRequirement(
  coverage: Map<string, Set<ItriF12MeasuredRequirementId>>,
  ref: string,
  requirementIds: ReadonlyArray<ItriF12MeasuredRequirementId>
): boolean {
  const coveredRequirements = coverage.get(ref);

  return Boolean(
    coveredRequirements &&
      requirementIds.some((requirementId) => coveredRequirements.has(requirementId))
  );
}

function reviewMeasuredPackageRefs(
  manifest: PlainRecord,
  measuredPackageReviews: ReadonlyArray<ItriF12MeasuredTrafficReviewInput>,
  gaps: ItriF12AuthorityReviewGap[]
): ReadonlyArray<ItriF12ReferencedMeasuredPackageReview> {
  const reviewMap = measuredReviewByPath(measuredPackageReviews);
  const measuredRefs = recordArray(manifest.measuredPackageRefs);
  const result: ItriF12ReferencedMeasuredPackageReview[] = [];

  if (measuredRefs.length === 0) {
    addGap(
      gaps,
      "measured-package-refs.missing",
      "measuredPackageRefs must name at least one retained F-07/F-08/F-09 package before F-12 authority review can proceed.",
      { path: "measuredPackageRefs" }
    );
  }

  for (let index = 0; index < measuredRefs.length; index += 1) {
    const measuredRef = measuredRefs[index];
    const refPath = `measuredPackageRefs[${index}]`;
    const packagePath = stringValue(measuredRef, "packagePath");
    const normalizedPackagePath = packagePath ? normalizePackagePath(packagePath) : null;
    const review = normalizedPackagePath ? reviewMap.get(normalizedPackagePath) ?? null : null;
    const refGaps: ItriF12AuthorityReviewGap[] = [];
    const requirementIds = stringArray(measuredRef.requirementIds)
      .map(measuredRequirementFromUnknown)
      .filter((requirement): requirement is ItriF12MeasuredRequirementId =>
        Boolean(requirement)
      );

    if (!packagePath) {
      addGap(refGaps, "measured-package.package-path-missing", "measuredPackageRefs[].packagePath is required.", {
        path: `${refPath}.packagePath`
      });
    } else if (!isAllowedItriF12ReferencedMeasuredTrafficPackagePath(packagePath)) {
      addGap(
        refGaps,
        "measured-package.path-outside-retained-root",
        `Referenced measured package paths must remain under ${ITRI_F12_MEASURED_TRAFFIC_PACKAGE_ROOT}/.`,
        { path: `${refPath}.packagePath` }
      );
    }

    if (requirementIds.length === 0) {
      addGap(refGaps, "measured-package.requirements-missing", "measuredPackageRefs[].requirementIds must name F-07, F-08, or F-09.", {
        path: `${refPath}.requirementIds`
      });
    }

    for (const key of [
      "sourceArtifactRefs",
      "reviewerVerdictRefs",
      "parsedMetricRefs",
      "thresholdRuleRefs",
      "handoverEventRefs"
    ] as const) {
      if (!Array.isArray(measuredRef[key])) {
        addGap(refGaps, "measured-package.ref-array-missing", `${refPath}.${key} must be an array.`, {
          path: `${refPath}.${key}`
        });
      }
    }

    if (stringArray(measuredRef.sourceArtifactRefs).length === 0) {
      addGap(refGaps, "measured-package.source-artifact-refs-missing", "F-12 measured refs must retain sourceArtifactRefs.", {
        path: `${refPath}.sourceArtifactRefs`
      });
    }

    if (stringArray(measuredRef.parsedMetricRefs).length === 0) {
      addGap(refGaps, "measured-package.parsed-metric-refs-missing", "F-12 measured refs must retain parsedMetricRefs.", {
        path: `${refPath}.parsedMetricRefs`
      });
    }

    if (stringArray(measuredRef.reviewerVerdictRefs).length === 0) {
      addGap(refGaps, "measured-package.reviewer-verdict-refs-missing", "F-12 measured refs must retain reviewerVerdictRefs.", {
        path: `${refPath}.reviewerVerdictRefs`
      });
    }

    if (stringArray(measuredRef.thresholdRuleRefs).length === 0) {
      addGap(refGaps, "measured-package.threshold-rule-refs-missing", "F-12 measured refs must retain thresholdRuleRefs.", {
        path: `${refPath}.thresholdRuleRefs`
      });
    }

    if (!review) {
      addGap(
        refGaps,
        "measured-package.review-missing",
        "Referenced measured package must be reviewed through the existing F-07R1 reviewer surface.",
        { path: `${refPath}.packagePath` }
      );
    } else if (!measuredPackageStateIsSufficient(review.packageState)) {
      addGap(
        refGaps,
        review.packageState === "rejected"
          ? "measured-package.review-rejected"
          : "measured-package.review-state-insufficient",
        "Referenced F-07R1 package review state is not sufficient for F-12 measured input gating.",
        { path: `${refPath}.packagePath` }
      );
    }

    const reviewerStates = requirementIds.map((requirementId) => {
      const requirementReview =
        review
          ? measuredRequirementReviews(review).find(
              (candidate) => candidate.requirementId === requirementId
            ) ?? null
          : null;
      const reviewerState = requirementReview?.reviewerState ?? null;
      const sufficientForMeasuredInput = measuredReviewStateIsSufficient(reviewerState);

      if (!reviewerState) {
        addGap(
          refGaps,
          "measured-package.requirement-review-missing",
          `Referenced measured package review must include ${requirementId}.`,
          { path: `${refPath}.requirementIds`, requirementId }
        );
      } else if (!sufficientForMeasuredInput) {
        addGap(
          refGaps,
          reviewerState === "rejected"
            ? "measured-package.requirement-rejected"
            : "measured-package.requirement-state-insufficient",
          `${requirementId} F-07R1 reviewerState=${reviewerState} is not sufficient for F-12 measured input gating.`,
          { path: `${refPath}.requirementIds`, requirementId }
        );
      }

      return {
        requirementId,
        reviewerState,
        sufficientForMeasuredInput
      };
    });

    if (review) {
      const resolvedMeasuredRefs = new Set(review.artifactRefSummary?.resolvedRefs ?? []);
      const unresolvedMeasuredRefs = [
        ...(review.artifactRefSummary?.unresolvedRefs ?? []),
        ...(review.artifactRefSummary?.escapedRefs ?? [])
      ];

      if (unresolvedMeasuredRefs.length > 0) {
        addGap(
          refGaps,
          "measured-package.artifact-boundary-unresolved",
          "Referenced measured package still has unresolved or escaping artifact refs under the F-07R1 reviewer.",
          { path: `${refPath}.packagePath` }
        );
      }

      for (const sourceRef of stringArray(measuredRef.sourceArtifactRefs)) {
        if (!resolvedMeasuredRefs.has(sourceRef)) {
          addGap(
            refGaps,
            "measured-package.source-artifact-ref-not-reviewed",
            "F-12 sourceArtifactRefs must match refs resolved by the F-07R1 reviewer for the measured package.",
            { path: `${refPath}.sourceArtifactRefs` }
          );
          break;
        }
      }

      const reviewedRefCoverage = sufficientReviewedRefCoverage(review, requirementIds);

      for (const parsedMetricRef of stringArray(measuredRef.parsedMetricRefs)) {
        if (!reviewedRefCoverage.parsedMetricRefs.has(parsedMetricRef)) {
          addGap(
            refGaps,
            "measured-package.parsed-metric-ref-not-reviewed",
            "Every F-12 parsedMetricRef must be present in a sufficient F-07R1 requirement review for the referenced measured package.",
            { path: `${refPath}.parsedMetricRefs` }
          );
        }
      }

      for (const thresholdRuleRef of stringArray(measuredRef.thresholdRuleRefs)) {
        if (!reviewedRefCoverage.thresholdRuleRefs.has(thresholdRuleRef)) {
          addGap(
            refGaps,
            "measured-package.threshold-rule-ref-not-reviewed",
            "Every F-12 thresholdRuleRef must be present in a sufficient F-07R1 requirement review for the referenced measured package.",
            { path: `${refPath}.thresholdRuleRefs` }
          );
        }
      }
    }

    const thresholdOwnerPresent =
      review?.thresholdAuthority?.thresholdOwnerPresent === true;
    const thresholdVersionPresent =
      review?.thresholdAuthority?.thresholdVersionPresent === true;
    const unresolvedThresholdState =
      review?.thresholdAuthority &&
      hasOwn(review.thresholdAuthority, "unresolvedThresholdState")
        ? review.thresholdAuthority.unresolvedThresholdState ?? null
        : null;
    const requirementRuleCount =
      review?.thresholdAuthority?.requirementRuleCount ?? 0;

    if (unresolvedThresholdState !== "none") {
      addGap(
        refGaps,
        "measured-package.threshold-unresolved-state-not-none",
        "Referenced F-07R1 package must have thresholdAuthority.unresolvedThresholdState present and exactly none before it can support F-12 authority-ready.",
        { path: `${refPath}.packagePath` }
      );
    }

    if (!thresholdOwnerPresent) {
      addGap(
        refGaps,
        "measured-package.threshold-owner-missing",
        "Referenced F-07R1 package must expose thresholdOwnerPresent=true before it can support F-12 authority-ready.",
        { path: `${refPath}.packagePath` }
      );
    }

    if (!thresholdVersionPresent) {
      addGap(
        refGaps,
        "measured-package.threshold-version-missing",
        "Referenced F-07R1 package must expose thresholdVersionPresent=true before it can support F-12 authority-ready.",
        { path: `${refPath}.packagePath` }
      );
    }

    if (requirementRuleCount === 0) {
      addGap(
        refGaps,
        "measured-package.threshold-rules-missing",
        "Referenced F-07R1 package must expose retained threshold rules before it can support F-12 authority-ready.",
        { path: `${refPath}.packagePath` }
      );
    }

    gaps.push(...refGaps);
    result.push({
      packagePath: normalizedPackagePath,
      packageId: typeof measuredRef.packageId === "string" ? measuredRef.packageId : null,
      referencedRequirements: [...new Set(requirementIds)],
      sourceReviewState: review?.packageState ?? null,
      reviewerStates,
      thresholdAuthority: {
        thresholdOwnerPresent,
        thresholdVersionPresent,
        unresolvedThresholdState,
        requirementRuleCount,
        thresholdStateReady:
          thresholdOwnerPresent &&
          thresholdVersionPresent &&
          unresolvedThresholdState === "none" &&
          requirementRuleCount > 0
      },
      gaps: refGaps
    });
  }

  return result;
}

function thresholdAuthorityRecord(manifest: PlainRecord): PlainRecord | null {
  return isPlainRecord(manifest.thresholdAuthority)
    ? manifest.thresholdAuthority
    : null;
}

function buildThresholdReview(manifest: PlainRecord): ItriF12ThresholdAuthorityReview {
  const thresholdAuthority = thresholdAuthorityRecord(manifest);
  const approvalRecord = thresholdAuthority && isPlainRecord(thresholdAuthority.approvalRecord)
    ? thresholdAuthority.approvalRecord
    : null;
  const unresolvedState = thresholdAuthority
    ? stringValue(thresholdAuthority, "unresolvedState")
    : null;
  const notes = thresholdAuthority
    ? stringArray(thresholdAuthority.unresolvedNotes)
    : [];

  return {
    externalAuthorityRequired: true,
    thresholdOwnerPresent: Boolean(
      thresholdAuthority && stringValue(thresholdAuthority, "owner")
    ),
    thresholdVersionPresent: Boolean(
      thresholdAuthority && stringValue(thresholdAuthority, "version")
    ),
    approvalRecordPresent: Boolean(approvalRecord),
    approvalRefPresent: Boolean(approvalRecord && stringValue(approvalRecord, "approvalRef")),
    requirementScopeIncludesF12: Boolean(
      thresholdAuthority && stringArray(thresholdAuthority.requirementScope).includes("F-12")
    ),
    effectiveDatePresent: Boolean(
      thresholdAuthority && stringValue(thresholdAuthority, "effectiveDate")
    ),
    supersessionPolicyPresent: Boolean(
      thresholdAuthority && stringValue(thresholdAuthority, "supersessionPolicy")
    ),
    unresolvedState,
    decisionRuleCount: recordArray(manifest.decisionRules).length,
    notes:
      notes.length > 0
        ? notes
        : [
            "Threshold authority is external to F-12 runtime behavior and does not change handover decisions."
          ]
  };
}

function reviewThresholdAuthority(manifest: PlainRecord, gaps: ItriF12AuthorityReviewGap[]): void {
  const thresholdAuthority = thresholdAuthorityRecord(manifest);

  if (!thresholdAuthority) {
    addGap(gaps, "threshold-authority.missing", "thresholdAuthority must be retained as an external authority input object.", {
      path: "thresholdAuthority"
    });
    return;
  }

  const approvalRecord = isPlainRecord(thresholdAuthority.approvalRecord)
    ? thresholdAuthority.approvalRecord
    : null;
  const unresolvedState = stringValue(thresholdAuthority, "unresolvedState");

  if (!stringValue(thresholdAuthority, "owner")) {
    addGap(gaps, "threshold-authority.owner-missing", "thresholdAuthority.owner is required for F-12 authority-ready.", {
      path: "thresholdAuthority.owner"
    });
  }

  if (!stringValue(thresholdAuthority, "version")) {
    addGap(gaps, "threshold-authority.version-missing", "thresholdAuthority.version is required for F-12 authority-ready.", {
      path: "thresholdAuthority.version"
    });
  }

  if (!approvalRecord) {
    addGap(gaps, "threshold-authority.approval-record-missing", "thresholdAuthority.approvalRecord is required for F-12 authority-ready.", {
      path: "thresholdAuthority.approvalRecord"
    });
  } else {
    if (!stringValue(approvalRecord, "approver")) {
      addGap(gaps, "threshold-authority.approver-missing", "thresholdAuthority.approvalRecord.approver is required.", {
        path: "thresholdAuthority.approvalRecord.approver"
      });
    }

    if (!stringValue(approvalRecord, "approvalRef")) {
      addGap(gaps, "threshold-authority.approval-ref-missing", "thresholdAuthority.approvalRecord.approvalRef must retain the approval artifact ref.", {
        path: "thresholdAuthority.approvalRecord.approvalRef"
      });
    }

    const approvedAt = stringValue(approvalRecord, "approvedAt");

    if (!approvedAt || !Number.isFinite(Date.parse(approvedAt))) {
      addGap(gaps, "threshold-authority.approved-at-missing", "thresholdAuthority.approvalRecord.approvedAt must be an ISO-8601 timestamp.", {
        path: "thresholdAuthority.approvalRecord.approvedAt"
      });
    }

    if (!stringArray(approvalRecord.requirementScope).includes("F-12")) {
      addGap(gaps, "threshold-authority.approval-scope-missing", "thresholdAuthority.approvalRecord.requirementScope must include F-12.", {
        path: "thresholdAuthority.approvalRecord.requirementScope"
      });
    }
  }

  if (!stringArray(thresholdAuthority.requirementScope).includes("F-12")) {
    addGap(gaps, "threshold-authority.scope-missing", "thresholdAuthority.requirementScope must include F-12.", {
      path: "thresholdAuthority.requirementScope"
    });
  }

  if (!stringValue(thresholdAuthority, "effectiveDate")) {
    addGap(gaps, "threshold-authority.effective-date-missing", "thresholdAuthority.effectiveDate is required for F-12 authority-ready.", {
      path: "thresholdAuthority.effectiveDate"
    });
  }

  if (!stringValue(thresholdAuthority, "supersessionPolicy")) {
    addGap(gaps, "threshold-authority.supersession-policy-missing", "thresholdAuthority.supersessionPolicy is required for F-12 authority-ready.", {
      path: "thresholdAuthority.supersessionPolicy"
    });
  }

  if (unresolvedState !== "none") {
    addGap(gaps, "threshold-authority.unresolved-state-not-none", "thresholdAuthority.unresolvedState must be present and exactly none for F-12 authority-ready.", {
      path: "thresholdAuthority.unresolvedState"
    });
  }

  if (
    unresolvedState &&
    unresolvedState !== "none" &&
    stringArray(thresholdAuthority.unresolvedNotes).length === 0
  ) {
    addGap(
      gaps,
      "threshold-authority.unresolved-notes-missing",
      "thresholdAuthority.unresolvedNotes are required when unresolvedState is not none.",
      { path: "thresholdAuthority.unresolvedNotes" }
    );
  }
}

function decisionInputFromUnknown(value: unknown): ItriF12DecisionInput | null {
  return typeof value === "string" &&
    (ITRI_F12_DECISION_INPUTS as ReadonlyArray<string>).includes(value)
    ? (value as ItriF12DecisionInput)
    : null;
}

function reviewSampleWindowBasis(
  basis: unknown,
  pathName: string,
  gaps: ItriF12AuthorityReviewGap[]
): void {
  if (!isPlainRecord(basis)) {
    addGap(gaps, "decision-rule.sample-window-missing", "decisionRules[].sampleWindowBasis is required.", {
      path: pathName
    });
    return;
  }

  for (const key of ["windowId", "startedAt", "endedAt", "timezone", "basis", "aggregation"] as const) {
    if (!stringValue(basis, key)) {
      addGap(gaps, "decision-rule.sample-window-field-missing", `${pathName}.${key} is required.`, {
        path: `${pathName}.${key}`
      });
    }
  }

  if (!Array.isArray(basis.eventRefs)) {
    addGap(gaps, "decision-rule.sample-window-event-refs-missing", `${pathName}.eventRefs must be an array.`, {
      path: `${pathName}.eventRefs`
    });
  }

  if (!stringValue(basis, "clockSyncRef")) {
    addGap(gaps, "decision-rule.sample-window-clock-ref-missing", `${pathName}.clockSyncRef is required.`, {
      path: `${pathName}.clockSyncRef`
    });
  }

  for (const key of ["durationSeconds", "sampleCount"] as const) {
    if (!isPlainRecord(basis[key])) {
      addGap(gaps, "decision-rule.sample-window-object-missing", `${pathName}.${key} must be retained.`, {
        path: `${pathName}.${key}`
      });
    }
  }
}

function reviewedParsedMetricCoverageForDecisionRules(
  manifest: PlainRecord,
  measuredPackageReviews: ReadonlyArray<ItriF12MeasuredTrafficReviewInput>
): Map<string, Set<ItriF12MeasuredRequirementId>> {
  const reviewMap = measuredReviewByPath(measuredPackageReviews);
  const reviewedParsedMetricRefs = new Map<string, Set<ItriF12MeasuredRequirementId>>();

  for (const measuredRef of recordArray(manifest.measuredPackageRefs)) {
    const packagePath = stringValue(measuredRef, "packagePath");
    const normalizedPackagePath = packagePath ? normalizePackagePath(packagePath) : null;
    const review = normalizedPackagePath ? reviewMap.get(normalizedPackagePath) ?? null : null;
    const declaredParsedMetricRefs = new Set(stringArray(measuredRef.parsedMetricRefs));
    const requirementIds = stringArray(measuredRef.requirementIds)
      .map(measuredRequirementFromUnknown)
      .filter((requirement): requirement is ItriF12MeasuredRequirementId =>
        Boolean(requirement)
      );

    if (!review) {
      continue;
    }

    const coverage = sufficientReviewedRefCoverage(review, requirementIds);

    for (const [parsedMetricRef, coveredRequirements] of coverage.parsedMetricRefs) {
      if (!declaredParsedMetricRefs.has(parsedMetricRef)) {
        continue;
      }

      for (const requirementId of coveredRequirements) {
        addReviewedRefCoverage(
          reviewedParsedMetricRefs,
          parsedMetricRef,
          requirementId
        );
      }
    }
  }

  return reviewedParsedMetricRefs;
}

function containsBoundedProxyAuthorityTerm(value: unknown): boolean {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    return (
      normalized.includes("handoverpolicydescriptor") ||
      normalized.includes("handoverruleconfig") ||
      normalized.includes("bounded-proxy") ||
      normalized.includes("bounded proxy")
    );
  }

  if (Array.isArray(value)) {
    return value.some(containsBoundedProxyAuthorityTerm);
  }

  if (isPlainRecord(value)) {
    return Object.values(value).some(containsBoundedProxyAuthorityTerm);
  }

  return false;
}

function reviewDecisionRules(
  manifest: PlainRecord,
  measuredPackageReviews: ReadonlyArray<ItriF12MeasuredTrafficReviewInput>,
  gaps: ItriF12AuthorityReviewGap[]
): void {
  const rules = recordArray(manifest.decisionRules);
  const declaredParsedMetricRefs = new Set<string>();
  const reviewedParsedMetricRefs = reviewedParsedMetricCoverageForDecisionRules(
    manifest,
    measuredPackageReviews
  );

  for (const measuredRef of recordArray(manifest.measuredPackageRefs)) {
    addStringRefs(declaredParsedMetricRefs, measuredRef.parsedMetricRefs);
  }

  if (!Array.isArray(manifest.decisionRules) || rules.length === 0) {
    addGap(gaps, "decision-rules.missing", "decisionRules must contain at least one retained F-12 rule.", {
      path: "decisionRules"
    });
    return;
  }

  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules[index];
    const pathName = `decisionRules[${index}]`;
    const inputField = decisionInputFromUnknown(rule.inputField);
    const measuredFieldRef = stringValue(rule, "measuredFieldRef");
    const relevantMeasuredRequirements = inputField
      ? MEASURED_REQUIREMENTS_BY_DECISION_INPUT[inputField]
      : ITRI_F12_MEASURED_REQUIREMENTS;

    for (const key of ["ruleId", "ruleVersion", "comparator", "priority", "missingFieldBehavior"] as const) {
      if (!stringValue(rule, key)) {
        addGap(gaps, "decision-rule.field-missing", `${pathName}.${key} is required.`, {
          path: `${pathName}.${key}`
        });
      }
    }

    if (!inputField) {
      addGap(gaps, "decision-rule.input-field-invalid", `${pathName}.inputField must name a supported F-12 input.`, {
        path: `${pathName}.inputField`
      });
    }

    if (!measuredFieldRef) {
      addGap(gaps, "decision-rule.measured-field-ref-missing", `${pathName}.measuredFieldRef is required.`, {
        path: `${pathName}.measuredFieldRef`
      });
    } else if (!declaredParsedMetricRefs.has(measuredFieldRef)) {
      addGap(
        gaps,
        "decision-rule.measured-field-ref-unlinked",
        `${pathName}.measuredFieldRef must be named by measuredPackageRefs.parsedMetricRefs before it can support F-12 authority-ready.`,
        { path: `${pathName}.measuredFieldRef` }
      );
    } else if (
      !hasCoverageForAnyRequirement(
        reviewedParsedMetricRefs,
        measuredFieldRef,
        relevantMeasuredRequirements
      )
    ) {
      addGap(
        gaps,
        "decision-rule.measured-field-ref-not-reviewed",
        `${pathName}.measuredFieldRef must be covered by a sufficient F-07R1 requirement review for the F-12 ${inputField ?? "decision"} input.`,
        {
          path: `${pathName}.measuredFieldRef`,
          ...(relevantMeasuredRequirements.length === 1
            ? { requirementId: relevantMeasuredRequirements[0] }
            : {})
        }
      );
    }

    if (
      (rule.thresholdValue === null || typeof rule.thresholdValue === "undefined") &&
      !["rank-ascending", "rank-descending"].includes(stringValue(rule, "comparator") ?? "")
    ) {
      addGap(gaps, "decision-rule.threshold-value-missing", `${pathName}.thresholdValue is required unless the comparator is approved ranking-only.`, {
        path: `${pathName}.thresholdValue`
      });
    }

    if (!stringValue(rule, "unit")) {
      addGap(gaps, "decision-rule.unit-missing", `${pathName}.unit is required for retained rule semantics.`, {
        path: `${pathName}.unit`
      });
    }

    if (!hasOwn(rule, "weight")) {
      addGap(gaps, "decision-rule.weight-missing", `${pathName}.weight must be retained as a number or null.`, {
        path: `${pathName}.weight`
      });
    } else if (
      rule.weight !== null &&
      (typeof rule.weight !== "number" || !Number.isFinite(rule.weight))
    ) {
      addGap(gaps, "decision-rule.weight-invalid", `${pathName}.weight must be a finite number or null.`, {
        path: `${pathName}.weight`
      });
    }

    if (!Array.isArray(rule.tieBreaker)) {
      addGap(gaps, "decision-rule.tie-breaker-missing", `${pathName}.tieBreaker must be an array.`, {
        path: `${pathName}.tieBreaker`
      });
    }

    if (!isPlainRecord(rule.hysteresis)) {
      addGap(gaps, "decision-rule.hysteresis-missing", `${pathName}.hysteresis must be retained.`, {
        path: `${pathName}.hysteresis`
      });
    } else if (!stringValue(rule.hysteresis, "mode")) {
      addGap(gaps, "decision-rule.hysteresis-mode-missing", `${pathName}.hysteresis.mode is required.`, {
        path: `${pathName}.hysteresis.mode`
      });
    }

    if (!isPlainRecord(rule.fallback)) {
      addGap(gaps, "decision-rule.fallback-missing", `${pathName}.fallback must be retained.`, {
        path: `${pathName}.fallback`
      });
    } else if (!stringValue(rule.fallback, "behavior")) {
      addGap(gaps, "decision-rule.fallback-behavior-missing", `${pathName}.fallback.behavior is required.`, {
        path: `${pathName}.fallback.behavior`
      });
    } else if (containsBoundedProxyAuthorityTerm(rule.fallback)) {
      addGap(
        gaps,
        "bounded-proxy.authority-disallowed",
        `${pathName}.fallback must not silently substitute bounded proxy metrics for measured authority fields.`,
        { path: `${pathName}.fallback` }
      );
    }

    reviewSampleWindowBasis(rule.sampleWindowBasis, `${pathName}.sampleWindowBasis`, gaps);

    if (stringArray(rule.applicability).length === 0) {
      addGap(gaps, "decision-rule.applicability-missing", `${pathName}.applicability must name the exact retained scope.`, {
        path: `${pathName}.applicability`
      });
    }
  }
}

function reviewSyntheticBoundary(
  manifest: PlainRecord,
  gaps: ItriF12AuthorityReviewGap[]
): ItriF12AuthoritySyntheticReview {
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
      "syntheticFallbackBoundary must preserve the S11 F-12 authority rejection rule.",
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

    if (boundary.authorityPackageAllowsSyntheticSource !== false) {
      addGap(
        gaps,
        "synthetic-boundary.allows-synthetic",
        "F-12 authority package reviewer must record authorityPackageAllowsSyntheticSource=false.",
        { path: "syntheticFallbackBoundary.authorityPackageAllowsSyntheticSource" }
      );
    }

    if (boundary.rejectAuthorityReviewWhenSourceTierIsSynthetic !== true) {
      addGap(
        gaps,
        "synthetic-boundary.reject-rule-missing",
        "F-12 authority package reviewer must reject tier-3 synthetic source tiers.",
        {
          path:
            "syntheticFallbackBoundary.rejectAuthorityReviewWhenSourceTierIsSynthetic"
        }
      );
    }
  }

  for (const detectedPath of detectedPaths) {
    addGap(
      gaps,
      "synthetic-source.rejected",
      "Synthetic provenance or tier-3 source material cannot support F-12 threshold authority review.",
      { path: detectedPath }
    );
  }

  return {
    syntheticSourceDetected: detectedPaths.length > 0,
    detectedPaths: [...new Set(detectedPaths)].sort(),
    authorityPackageAllowsSyntheticSource: boundary
      ? boundary.authorityPackageAllowsSyntheticSource === false
        ? false
        : null
      : null,
    rejectAuthorityReviewWhenSourceTierIsSynthetic: boundary
      ? boundary.rejectAuthorityReviewWhenSourceTierIsSynthetic === true
        ? true
        : null
      : null
  };
}

function reviewNonClaims(manifest: PlainRecord, gaps: ItriF12AuthorityReviewGap[]): void {
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

function reviewBoundedProxySeparation(
  manifest: PlainRecord,
  gaps: ItriF12AuthorityReviewGap[]
): void {
  const rules = recordArray(manifest.decisionRules);

  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules[index];
    const measuredFieldRef = stringValue(rule, "measuredFieldRef") ?? "";
    const pathName = `decisionRules[${index}]`;

    if (containsBoundedProxyAuthorityTerm(measuredFieldRef)) {
      addGap(
        gaps,
        "bounded-proxy.authority-disallowed",
        "Bounded proxy F-12 policy or rule config refs must not be treated as threshold authority or behavior change.",
        { path: `${pathName}.measuredFieldRef` }
      );
    }
  }
}

function packageStateFromGaps(options: {
  gaps: ReadonlyArray<ItriF12AuthorityReviewGap>;
  requestedReviewerState: ItriF12AuthorityReviewerState | null;
  syntheticSourceDetected: boolean;
  escapedRefs: ReadonlyArray<string>;
}): ItriF12AuthorityPackageReviewState {
  const { gaps, requestedReviewerState, syntheticSourceDetected, escapedRefs } = options;

  if (
    syntheticSourceDetected ||
    escapedRefs.length > 0 ||
    hasRejectGap(gaps) ||
    requestedReviewerState === "rejected"
  ) {
    return "rejected";
  }

  if (!hasBlockingGaps(gaps)) {
    return requestedReviewerState === "authority-ready"
      ? "authority-ready"
      : requestedReviewerState ?? "schema-ready";
  }

  if (
    gaps.some((gap) =>
      gap.code.startsWith("measured-package") ||
      gap.code.startsWith("decision-rule.measured") ||
      gap.code.startsWith("artifact-ref")
    )
  ) {
    return "pending-measured-fields";
  }

  if (
    gaps.some((gap) =>
      gap.code.startsWith("threshold-authority") ||
      gap.code.startsWith("decision-rule") ||
      gap.code.startsWith("nonclaims")
    )
  ) {
    return "pending-threshold-authority";
  }

  return "pending-measured-fields";
}

export function reviewItriF12DecisionThresholdAuthorityManifest({
  manifest,
  packagePath,
  manifestPath = defaultManifestPath(packagePath),
  reviewedAt,
  artifactRefCheck,
  measuredPackageReviews = []
}: ItriF12AuthorityPackageReviewOptions): ItriF12AuthorityPackageReview {
  const resolvedReviewTime = parseReviewTime(reviewedAt);
  const normalizedPackagePath = normalizePackagePath(packagePath);
  const normalizedManifestPath = normalizePackagePath(manifestPath);
  const artifactSummary =
    artifactRefCheck ??
    {
      declaredRefs: collectItriF12DecisionThresholdAuthorityArtifactRefs(manifest),
      resolvedRefs: [],
      unresolvedRefs: [],
      escapedRefs: []
    };

  if (!isPlainRecord(manifest)) {
    const gaps: ItriF12AuthorityReviewGap[] = [];
    addGap(gaps, "manifest.not-object", "Manifest JSON must be an object.", {
      path: normalizedManifestPath
    });

    return closedReview({
      packagePath: normalizedPackagePath,
      manifestPath: normalizedManifestPath,
      reviewedAt: resolvedReviewTime,
      packageState: "pending-measured-fields",
      gaps
    });
  }

  const gaps: ItriF12AuthorityReviewGap[] = [];
  addRequiredRootFieldGaps(manifest, gaps);
  const manifestSchemaVersion = reviewSchemaVersion(manifest, gaps);
  reviewPackagePath(manifest, normalizedPackagePath, gaps);
  reviewTimestamp(manifest, "receivedAt", gaps);
  reviewOwner(manifest, gaps);
  reviewReviewer(manifest, gaps);
  reviewRedactionPolicy(manifest, gaps);

  if (!stringValue(manifest, "thresholdVersion")) {
    addGap(gaps, "manifest.threshold-version-missing", "thresholdVersion is required.", {
      path: "thresholdVersion"
    });
  }

  if (!stringValue(manifest, "ruleVersion")) {
    addGap(gaps, "manifest.rule-version-missing", "ruleVersion is required.", {
      path: "ruleVersion"
    });
  }

  if (stringArray(manifest.useNotes).length === 0) {
    addGap(gaps, "manifest.use-notes-missing", "useNotes must describe permitted use and retained scope.", {
      path: "useNotes"
    });
  }

  const coveredRequirements = reviewCoveredRequirements(manifest, gaps);
  const requestedReviewerState = reviewRequestedReviewerState(manifest, gaps);
  reviewArtifactRefs(artifactSummary, gaps);
  const measuredPackageReviewResults = reviewMeasuredPackageRefs(
    manifest,
    measuredPackageReviews,
    gaps
  );
  reviewThresholdAuthority(manifest, gaps);
  reviewDecisionRules(manifest, measuredPackageReviews, gaps);
  reviewBoundedProxySeparation(manifest, gaps);
  const syntheticReview = reviewSyntheticBoundary(manifest, gaps);
  reviewNonClaims(manifest, gaps);

  return {
    schemaVersion: ITRI_F12_DECISION_THRESHOLD_AUTHORITY_REVIEW_SCHEMA_VERSION,
    reviewedAt: resolvedReviewTime,
    packagePath: normalizedPackagePath,
    manifestPath: normalizedManifestPath,
    packageState: packageStateFromGaps({
      gaps,
      requestedReviewerState,
      syntheticSourceDetected: syntheticReview.syntheticSourceDetected,
      escapedRefs: artifactSummary.escapedRefs
    }),
    manifestSchemaVersion,
    authorityId: stringValue(manifest, "authorityId"),
    coveredRequirements:
      coveredRequirements.length > 0 ? coveredRequirements : ["F-12"],
    requestedReviewerState,
    measuredPackageReviews: measuredPackageReviewResults,
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
