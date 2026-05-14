export const ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_SCHEMA_VERSION =
  "itri.f03-f15.external-source-package-intake.v1" as const;
export const ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REVIEW_SCHEMA_VERSION =
  "itri.f03-f15r1.external-source-package-intake-review.v1" as const;
export const ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_PACKAGE_ROOT =
  "output/validation/external-f03-f15" as const;
export const ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REQUIREMENTS = ["F-03", "F-15"] as const;

export const ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REVIEWER_NAME =
  "S12-D external source-package-intake reviewer" as const;

export type ItriExternalSourcePackageIntakeRequirementId =
  (typeof ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REQUIREMENTS)[number];

export type ItriExternalSourcePackageIntakeReviewerState =
  | "ready-for-intake"
  | "incomplete"
  | "rejected";

export type ItriExternalSourcePackageIntakePackageState =
  | "missing"
  | ItriExternalSourcePackageIntakeReviewerState;

export type ItriExternalSourcePackageIntakeGapSeverity = "blocking" | "warning";

export interface ItriExternalSourcePackageIntakeReviewGap {
  code: string;
  message: string;
  severity: ItriExternalSourcePackageIntakeGapSeverity;
  path?: string;
  requirementId?: ItriExternalSourcePackageIntakeRequirementId;
}

export interface ItriExternalSourcePackageIntakeSourceArtifactRefCheck {
  declaredRefIds: ReadonlyArray<string>;
  resolvedRefIds: ReadonlyArray<string>;
  unknownRefIds: ReadonlyArray<string>;
}

export interface ItriExternalSourcePackageIntakeArtifactPathCheck {
  declaredPaths: ReadonlyArray<string>;
  resolvedPaths: ReadonlyArray<string>;
  unresolvedPaths: ReadonlyArray<string>;
  escapedPaths: ReadonlyArray<string>;
}

export interface ItriExternalSourcePackageIntakeRequirementReview {
  requirementId: ItriExternalSourcePackageIntakeRequirementId;
  reviewerState: ItriExternalSourcePackageIntakeReviewerState;
  evidenceScope: string;
  sourceArtifactIds: ReadonlyArray<string>;
  reviewer: {
    nameOrRole: string;
    reviewedAt: string;
    notes: ReadonlyArray<string>;
  };
  gaps: ReadonlyArray<ItriExternalSourcePackageIntakeReviewGap>;
}

export interface ItriExternalSourcePackageIntakeSyntheticReview {
  syntheticSourceDetected: boolean;
  detectedPaths: ReadonlyArray<string>;
  rejected: boolean;
}

export interface ItriExternalSourcePackageIntakeNonClaims {
  closesF01ItriOrbitModelIntegration: false;
  arbitraryExternalSourceAcceptance: false;
  liveRealTimeFeedExecution: false;
  measuredTrafficNetworkTruth: false;
  natTunnelDutValidation: false;
  nativeRfHandoverTruth: false;
  completeItriAcceptance: false;
  publicCelesTrakOrSpaceTrackSubstitutesForItriPrivateSourceAuthorityWithoutOwnerEvidence: false;
}

export interface ItriExternalSourcePackageIntakeReview {
  schemaVersion: typeof ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REVIEW_SCHEMA_VERSION;
  reviewedAt: string;
  packagePath: string;
  manifestPath: string;
  packageState: ItriExternalSourcePackageIntakePackageState;
  manifestSchemaVersion: string | null;
  packageIdentityId: string | null;
  coveredRequirements: ReadonlyArray<ItriExternalSourcePackageIntakeRequirementId>;
  requirementReviews: ReadonlyArray<ItriExternalSourcePackageIntakeRequirementReview>;
  gaps: ReadonlyArray<ItriExternalSourcePackageIntakeReviewGap>;
  sourceArtifactRefSummary: ItriExternalSourcePackageIntakeSourceArtifactRefCheck;
  packageArtifactPathSummary: ItriExternalSourcePackageIntakeArtifactPathCheck;
  synthetic: ItriExternalSourcePackageIntakeSyntheticReview;
  nonClaims: ItriExternalSourcePackageIntakeNonClaims;
}

export interface ItriExternalSourcePackageIntakeReviewOptions {
  manifest: unknown;
  packagePath: string;
  manifestPath?: string;
  reviewedAt?: string;
  sourceArtifactRefCheck?: ItriExternalSourcePackageIntakeSourceArtifactRefCheck;
  artifactPathCheck?: ItriExternalSourcePackageIntakeArtifactPathCheck;
}

export interface ItriExternalSourcePackageIntakeClosedReviewOptions {
  packagePath: string;
  manifestPath?: string;
  reviewedAt?: string;
}

export interface ItriExternalSourcePackageIntakeMalformedReviewOptions
  extends ItriExternalSourcePackageIntakeClosedReviewOptions {
  parseError: string;
}

type PlainRecord = Record<string, unknown>;

const REQUIRED_ROOT_FIELDS = [
  "schemaVersion",
  "packageIdentity",
  "ownerIdentity",
  "sourceAuthority",
  "sourceLocator",
  "catalog",
  "modeRules",
  "temporalRules",
  "licenseRedistributionPolicy",
  "checksumPolicy",
  "retentionPolicy",
  "packageArtifacts",
  "scenarioMapping",
  "orbitClassCoverage",
  "satelliteCountDeclarations",
  "parsedReviewedFields",
  "reviewGate",
  "nonClaims"
] as const;

const REQUIRED_NON_CLAIMS: ItriExternalSourcePackageIntakeNonClaims = {
  closesF01ItriOrbitModelIntegration: false,
  arbitraryExternalSourceAcceptance: false,
  liveRealTimeFeedExecution: false,
  measuredTrafficNetworkTruth: false,
  natTunnelDutValidation: false,
  nativeRfHandoverTruth: false,
  completeItriAcceptance: false,
  publicCelesTrakOrSpaceTrackSubstitutesForItriPrivateSourceAuthorityWithoutOwnerEvidence: false
};

const SOURCE_TIER_ENUM = [
  "tier-1-itri-or-owner-authority",
  "tier-2-public-official-source",
  "tier-3-synthetic-rehearsal",
  "tier-4-readiness-placeholder"
] as const;

const SOURCE_AUTHORITY_CLASSIFICATION_ENUM = [
  "itri-private-authority",
  "source-owner-private-authority",
  "official-public-source",
  "bounded-public-profile",
  "synthetic-rehearsal-only",
  "owner-defined-source-pending-review"
] as const;

const SOURCE_LOCATOR_TYPES = [
  "public-url",
  "private-drop",
  "mixed-public-and-private",
  "owner-system-reference"
] as const;

const SOURCE_ARTIFACT_SCOPE_ENUM = [
  "raw-source",
  "source-metadata",
  "checksum-manifest",
  "license-or-redistribution-policy",
  "owner-approval",
  "scenario-mapping",
  "parsed-field-review",
  "redaction-note",
  "other"
] as const;

const CATALOG_TYPES = [
  "public-tle",
  "private-tle",
  "derived-catalog",
  "synthetic-rehearsal-only",
  "other-owner-defined-source"
] as const;

const RETENTION_CLASS_ENUM = [
  "repo-retainable",
  "private-owner-retained",
  "metadata-only",
  "redacted-retainable"
] as const;

const CHECKSUM_ALGORITHMS = ["sha256", "sha384", "sha512", "owner-defined"] as const;

const CADENCE_KIND_ENUM = [
  "periodic",
  "event-driven",
  "owner-drop",
  "fixed-prerecorded",
  "unknown-pending-owner"
] as const;

const STALE_BEHAVIOR_ENUM = [
  "reject-package",
  "quarantine-records",
  "mark-incomplete",
  "owner-review-required"
] as const;

const STALE_REVIEW_STATE_ENUM = ["intake-gap", "rejected", "owner-review-required"] as const;

const REVIEW_STATE_ENUM = [
  "not-reviewed",
  "intake-gap",
  "structurally-reviewable",
  "owner-source-scope-approved",
  "rejected",
  "superseded"
] as const;

const REVIEW_FAILURE_DISPOSITION_ENUM = ["fail-closed", "owner-review-required", "not-yet-reviewed"] as const;

const RETAINED_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._@+\-/]+$/u;
const PATH_BOUNDARY_CLAIM =
  "retainedPath must be package-relative, must not start with '/', and must not contain '..' path segments";
const REQUIRED_PACKAGE_ROOT = ".";

const RETAINED_PATH_BOUNDARY_ERROR =
  "packageArtifactPathSummary.paths-escape-root";
const SYNTHETIC_SOURCE_BOUNDARY_ERROR = "sourceAuthority.synthetic-boundary";

const EMPTY_SOURCE_ARTIFACT_REF_CHECK: ItriExternalSourcePackageIntakeSourceArtifactRefCheck = {
  declaredRefIds: [],
  resolvedRefIds: [],
  unknownRefIds: []
};

const EMPTY_ARTIFACT_PATH_CHECK: ItriExternalSourcePackageIntakeArtifactPathCheck = {
  declaredPaths: [],
  resolvedPaths: [],
  unresolvedPaths: [],
  escapedPaths: []
};

function nonClaims(): ItriExternalSourcePackageIntakeNonClaims {
  return { ...REQUIRED_NON_CLAIMS };
}

function parseReviewTime(reviewedAt: string | undefined): string {
  if (reviewedAt && Number.isFinite(Date.parse(reviewedAt))) {
    return new Date(reviewedAt).toISOString();
  }

  return new Date().toISOString();
}

function normalizePackagePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/g, "");
}

function isPlainRecord(value: unknown): value is PlainRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(record: PlainRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function arrayValue(value: unknown): ReadonlyArray<unknown> {
  return Array.isArray(value) ? value : [];
}

function stringValue(record: unknown, key: string): string | null {
  if (!isPlainRecord(record)) {
    return null;
  }

  const value = record[key];
  return typeof value === "string" ? value : null;
}

function booleanValue(record: PlainRecord, key: string): boolean | null {
  const value = record[key];
  return typeof value === "boolean" ? value : null;
}

function numberValue(record: PlainRecord, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nonEmptyStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

function asSourceArtifactId(value: unknown): string | null {
  if (isPlainRecord(value) && typeof value.artifactId === "string") {
    const id = value.artifactId.trim();
    if (id.length > 0) {
      return id;
    }
  }

  return null;
}

function addGap(
  gaps: ItriExternalSourcePackageIntakeReviewGap[],
  code: string,
  message: string,
  options: {
    severity?: ItriExternalSourcePackageIntakeGapSeverity;
    path?: string;
    requirementId?: ItriExternalSourcePackageIntakeRequirementId;
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

function isAllowedPackagePath(packagePath: string): boolean {
  const normalized = normalizePackagePath(packagePath);
  if (normalized.length === 0) {
    return false;
  }

  if (normalized.startsWith("/")) {
    return false;
  }

  if (normalized.startsWith("../") || normalized.includes("/../") || normalized.endsWith("/..")) {
    return false;
  }

  return normalized.startsWith(`${ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_PACKAGE_ROOT}/`);
}

function valueOrNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return `${value}`;
}

function inEnum(value: unknown, values: readonly string[]): boolean {
  return typeof value === "string" && values.includes(value);
}

function readRequirementIds(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): string[] {
  const requirements = nonEmptyStringArray(manifest.coveredRequirements);
  if (requirements.length === 0) {
    addGap(
      gaps,
      "requirements.missing",
      "packageIdentity.coveredRequirements must include at least one requirement id.",
      { path: "packageIdentity.coveredRequirements" }
    );
    return [];
  }

  const declaredSet = new Set<string>();
  for (const requirement of requirements) {
    if ((ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REQUIREMENTS as readonly string[]).includes(requirement)) {
      declaredSet.add(requirement);
      continue;
    }

    addGap(
      gaps,
      "requirements.unknown",
      `Unknown requirement id in packageIdentity.coveredRequirements: ${requirement}`,
      { path: "packageIdentity.coveredRequirements" }
    );
  }

  return [...declaredSet];
}

function closedReview(
  options: ItriExternalSourcePackageIntakeClosedReviewOptions & {
    packageState: ItriExternalSourcePackageIntakePackageState;
    gaps: ReadonlyArray<ItriExternalSourcePackageIntakeReviewGap>;
    manifestSchemaVersion?: string | null;
    packageIdentityId?: string | null;
    sourceArtifactRefSummary?: ItriExternalSourcePackageIntakeSourceArtifactRefCheck;
    packageArtifactPathSummary?: ItriExternalSourcePackageIntakeArtifactPathCheck;
  }
): ItriExternalSourcePackageIntakeReview {
  const reviewedAt = parseReviewTime(options.reviewedAt);
  const packagePath = normalizePackagePath(options.packagePath);
  const manifestPath = options.manifestPath ?? `${packagePath}/manifest.json`;
  const requirementState: ItriExternalSourcePackageIntakeReviewerState =
    options.packageState === "ready-for-intake" ? "ready-for-intake" : options.packageState === "rejected" ? "rejected" : "incomplete";

  const gaps = [...options.gaps];
  const topMessage = gaps[0]?.message ?? "Source-package intake review did not reach readiness.";

  const evidenceScope =
    "S12 source-package intake readiness for F-03/F-15 (structural, boundary, and nonclaim checks).";

  return {
    schemaVersion: ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REVIEW_SCHEMA_VERSION,
    reviewedAt,
    packagePath,
    manifestPath,
    packageState: options.packageState,
    manifestSchemaVersion: options.manifestSchemaVersion ?? null,
    packageIdentityId: options.packageIdentityId ?? null,
    coveredRequirements: [...ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REQUIREMENTS],
    requirementReviews: ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REQUIREMENTS.map((requirementId) => ({
      requirementId,
      reviewerState: requirementState,
      evidenceScope,
      sourceArtifactIds: options.sourceArtifactRefSummary ? options.sourceArtifactRefSummary.declaredRefIds : [],
      reviewer: {
        nameOrRole: ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REVIEWER_NAME,
        reviewedAt,
        notes: [
          options.packageState === "ready-for-intake"
            ? "Source package passes bounded intake readiness checks."
            : topMessage
        ]
      },
      gaps
    })),
    gaps,
    sourceArtifactRefSummary: options.sourceArtifactRefSummary ?? { ...EMPTY_SOURCE_ARTIFACT_REF_CHECK },
    packageArtifactPathSummary: options.packageArtifactPathSummary ?? { ...EMPTY_ARTIFACT_PATH_CHECK },
    synthetic: {
      syntheticSourceDetected: false,
      detectedPaths: [],
      rejected: options.packageState === "rejected"
    },
    nonClaims: nonClaims()
  };
}

function collectItriExternalSourcePackageIntakeArtifacts(manifest: unknown): PlainRecord[] {
  if (!isPlainRecord(manifest)) {
    return [];
  }

  const artifacts = manifest.packageArtifacts;
  if (!Array.isArray(artifacts)) {
    return [];
  }

  return arrayValue(artifacts).filter(isPlainRecord);
}

export function collectItriExternalSourcePackageIntakeArtifactPaths(
  manifest: unknown
): ReadonlyArray<string> {
  const set = new Set<string>();

  for (const artifact of collectItriExternalSourcePackageIntakeArtifacts(manifest)) {
    const retainedPath = stringValue(artifact, "retainedPath");
    if (retainedPath !== null) {
      set.add(retainedPath);
    }
  }

  return [...set].sort();
}

function collectSourceArtifactRefIdsFromManifest(
  manifest: PlainRecord,
  gaps: ItriExternalSourcePackageIntakeReviewGap[]
): string[] {
  const ids: string[] = [];
  const addId = (value: unknown, pathName: string, required: boolean, gaps: ItriExternalSourcePackageIntakeReviewGap[]) => {
    if (!Array.isArray(value)) {
      if (required) {
        addGap(
          gaps,
          "source-artifact-refs.missing",
          `Missing or non-array source-artifact refs at ${pathName}.`,
          { path: pathName }
        );
      }
      return;
    }

    if (required && value.length === 0) {
      addGap(
        gaps,
        "source-artifact-refs.empty",
        `Source-artifact ref array at ${pathName} must be non-empty.`,
        { path: pathName }
      );
      return;
    }

    for (const entry of arrayValue(value)) {
      const id = asSourceArtifactId(entry);
      if (id === null) {
        addGap(
          gaps,
          "source-artifact-refs.malformed",
          `Source-artifact entry at ${pathName} must include non-empty artifactId.`,
          { path: pathName }
        );
        continue;
      }

      ids.push(id);
    }
  };

  const manifestModeRules = isPlainRecord(manifest.modeRules) ? manifest.modeRules : null;
  const realTimeRule = manifestModeRules && isPlainRecord(manifestModeRules.realTime) ? manifestModeRules.realTime : null;
  const preRecordedRule = manifestModeRules && isPlainRecord(manifestModeRules.prerecorded) ? manifestModeRules.prerecorded : null;

  const manifestTemporal = isPlainRecord(manifest.temporalRules) ? manifest.temporalRules : null;
  const stalePolicy = manifestTemporal && isPlainRecord(manifestTemporal.staleDataPolicy) ? manifestTemporal.staleDataPolicy : null;

  const catalog = isPlainRecord(manifest.catalog) ? manifest.catalog : {};
  const catalogDerivation = catalog && isPlainRecord(catalog.derivation) ? catalog.derivation : null;
  const sourceAuthority = isPlainRecord(manifest.sourceAuthority) ? manifest.sourceAuthority : null;
  const ownerIdentity = isPlainRecord(manifest.ownerIdentity) ? manifest.ownerIdentity : null;
  const licenseRedistributionPolicy = isPlainRecord(manifest.licenseRedistributionPolicy) ? manifest.licenseRedistributionPolicy : null;
  const checksumPolicy = isPlainRecord(manifest.checksumPolicy) ? manifest.checksumPolicy : null;
  const scenarioMapping = isPlainRecord(manifest.scenarioMapping) ? manifest.scenarioMapping : null;
  const reviewGate = isPlainRecord(manifest.reviewGate) ? manifest.reviewGate : null;

  const ownerEvidenceRefs = ownerIdentity && ownerIdentity.ownerEvidenceRefs;
  addId(ownerEvidenceRefs, "ownerIdentity.ownerEvidenceRefs", true, gaps);

  addId(isPlainRecord(sourceAuthority) ? sourceAuthority.ownerApprovalRefs : null, "sourceAuthority.ownerApprovalRefs", true, gaps);

  addId(catalog ? catalog.sourceArtifactRefs : null, "catalog.sourceArtifactRefs", true, gaps);
  addId(catalogDerivation ? catalogDerivation.inputArtifactRefs : null, "catalog.derivation.inputArtifactRefs", false, gaps);

  addId(realTimeRule ? realTimeRule.sourceArtifactRefs : null, "modeRules.realTime.sourceArtifactRefs", true, gaps);
  addId(preRecordedRule ? preRecordedRule.sourceArtifactRefs : null, "modeRules.prerecorded.sourceArtifactRefs", true, gaps);
  addId(manifestModeRules ? manifestModeRules.modeSelectionArtifactRefs : null, "modeRules.modeSelectionArtifactRefs", true, gaps);

  addId(stalePolicy ? stalePolicy.policyArtifactRefs : null, "temporalRules.staleDataPolicy.policyArtifactRefs", true, gaps);
  addId(manifestTemporal ? manifestTemporal.temporalArtifactRefs : null, "temporalRules.temporalArtifactRefs", true, gaps);

  addId(licenseRedistributionPolicy ? licenseRedistributionPolicy.policyArtifactRefs : null, "licenseRedistributionPolicy.policyArtifactRefs", true, gaps);
  addId(checksumPolicy ? checksumPolicy.checksumManifestRefs : null, "checksumPolicy.checksumManifestRefs", true, gaps);

  addId(scenarioMapping ? scenarioMapping.sourceArtifactRefs : null, "scenarioMapping.sourceArtifactRefs", true, gaps);

  for (const rule of arrayValue(scenarioMapping?.recordToScenarioRules)) {
    if (isPlainRecord(rule)) {
      addId(rule.sourceArtifactRefs, "scenarioMapping.recordToScenarioRules[].sourceArtifactRefs", true, gaps);
    }
  }
  for (const rule of arrayValue(scenarioMapping?.modeMappingRules)) {
    if (isPlainRecord(rule)) {
      addId(rule.sourceArtifactRefs, "scenarioMapping.modeMappingRules[].sourceArtifactRefs", true, gaps);
    }
  }

  for (const orbit of arrayValue(manifest.orbitClassCoverage)) {
    if (isPlainRecord(orbit)) {
      addId(orbit.sourceArtifactRefs, "orbitClassCoverage[].sourceArtifactRefs", true, gaps);
    }
  }

  const satellite = isPlainRecord(manifest.satelliteCountDeclarations) ? manifest.satelliteCountDeclarations : null;
  addId(satellite ? satellite.sourceArtifactRefs : null, "satelliteCountDeclarations.sourceArtifactRefs", true, gaps);
  for (const item of arrayValue(satellite?.byOrbitClass)) {
    if (isPlainRecord(item)) {
      addId(item.sourceArtifactRefs, "satelliteCountDeclarations.byOrbitClass[].sourceArtifactRefs", true, gaps);
    }
  }

  for (const field of arrayValue(manifest.parsedReviewedFields)) {
    if (isPlainRecord(field)) {
      addId(field.sourceArtifactRefs, "parsedReviewedFields[].sourceArtifactRefs", true, gaps);
    }
  }

  addId(reviewGate ? reviewGate.sourceArtifactRefs : null, "reviewGate.sourceArtifactRefs", true, gaps);

  const ownerAuthorityPromotion = isPlainRecord(sourceAuthority?.ownerAuthorityPromotion) ? sourceAuthority?.ownerAuthorityPromotion : null;
  addId(ownerAuthorityPromotion ? ownerAuthorityPromotion.approvalArtifactRefs : null, "ownerAuthorityPromotion.approvalArtifactRefs", false, gaps);

  const notes = reviewGate && Array.isArray(reviewGate.reviewNotes)
    ? reviewGate.reviewNotes
    : [];
  for (const note of arrayValue(notes)) {
    if (isPlainRecord(note)) {
      addId(note.sourceArtifactRefs, "reviewGate.reviewNotes[].sourceArtifactRefs", false, gaps);
    }
  }

  return [...new Set(ids)].sort();
}

function reviewMissingRootFields(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  for (const field of REQUIRED_ROOT_FIELDS) {
    if (!hasOwn(manifest, field)) {
      addGap(gaps, "manifest.required-field", `Manifest is missing required root field ${field}.`, {
        path: field
      });
    }
  }
}

function reviewSchemaVersion(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): string | null {
  const schemaVersion = stringValue(manifest, "schemaVersion");
  if (schemaVersion !== ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_SCHEMA_VERSION) {
    addGap(
      gaps,
      "manifest.schema-version",
      `manifest.schemaVersion must be ${ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_SCHEMA_VERSION}.`,
      { path: "schemaVersion" }
    );
    return schemaVersion;
  }

  return schemaVersion;
}

function reviewPackagePath(packagePath: string, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  if (!isAllowedPackagePath(packagePath)) {
    addGap(
      gaps,
      "package.path-outside-retained-root",
      `Package path must be under ${ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_PACKAGE_ROOT}/.`,
      { path: "packagePath" }
    );
  }
}

function reviewPackageIdentity(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const packageIdentity = manifest.packageIdentity;
  if (!isPlainRecord(packageIdentity)) {
    addGap(gaps, "package-identity.missing", "packageIdentity must be an object.", { path: "packageIdentity" });
    return;
  }

  const identityFields = ["packageId", "packageFamily", "packageVersion", "coveredRequirements", "receivedAt", "declaredScope", "packageStatus"];
  for (const field of identityFields) {
    if (!hasOwn(packageIdentity, field)) {
      addGap(gaps, "package-identity.required", `packageIdentity.${field} is required.`, { path: `packageIdentity.${field}` });
    }
  }

  if (!nonEmptyStringArray(packageIdentity.coveredRequirements).some((value) => value.length > 0)) {
    addGap(gaps, "package-identity.covered-requirements", "packageIdentity.coveredRequirements must be non-empty.", {
      path: "packageIdentity.coveredRequirements"
    });
  }

  const packageFamily = stringValue(packageIdentity, "packageFamily");
  if (packageFamily !== "itri-f03-f15-external-source-package") {
    addGap(gaps, "package-identity.package-family", "packageIdentity.packageFamily must be itri-f03-f15-external-source-package.", {
      path: "packageIdentity.packageFamily"
    });
  }

  const receivedAt = stringValue(packageIdentity, "receivedAt");
  if (!receivedAt || !Number.isFinite(Date.parse(receivedAt))) {
    addGap(gaps, "package-identity.received-at", "packageIdentity.receivedAt must be ISO-8601.", {
      path: "packageIdentity.receivedAt"
    });
  }

  const packageStatus = stringValue(packageIdentity, "packageStatus");
  if (!inEnum(packageStatus, [
    "owner-supplied-for-intake",
    "metadata-only-request",
    "blocked-missing-material",
    "superseded"
  ])) {
    addGap(gaps, "package-identity.package-status", "packageIdentity.packageStatus is invalid.", {
      path: "packageIdentity.packageStatus"
    });
  }
}

function reviewOwnerRecord(pathName: string, value: unknown, gaps: ItriExternalSourcePackageIntakeReviewGap[]) {
  if (!isPlainRecord(value)) {
    addGap(gaps, `${pathName}.missing`, `${pathName} must be an object.`, { path: pathName });
    return;
  }

  for (const field of ["organization", "role", "authorityScope"]) {
    if (!hasOwn(value, field)) {
      addGap(gaps, `${pathName}.required`, `${pathName}.${field} is required.`, { path: `${pathName}.${field}` });
    }
  }

  const organization = stringValue(value, "organization");
  if (!organization || organization.trim().length === 0) {
    addGap(gaps, `${pathName}.organization`, `${pathName}.organization must be non-empty text.`, {
      path: `${pathName}.organization`
    });
  }

  const role = stringValue(value, "role");
  if (!role || role.trim().length === 0) {
    addGap(gaps, `${pathName}.role`, `${pathName}.role must be non-empty text.`, {
      path: `${pathName}.role`
    });
  }

  const authorityScope = nonEmptyStringArray(value.authorityScope);
  if (authorityScope.length === 0) {
    addGap(
      gaps,
      `${pathName}.authority-scope`,
      `${pathName}.authorityScope must be a non-empty array.`,
      { path: `${pathName}.authorityScope` }
    );
  }
}

function reviewOwnerIdentity(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const ownerIdentity = manifest.ownerIdentity;

  if (!isPlainRecord(ownerIdentity)) {
    addGap(gaps, "owner-identity.missing", "ownerIdentity must be an object.", { path: "ownerIdentity" });
    return;
  }

  reviewOwnerRecord("ownerIdentity.sourceOwner", ownerIdentity.sourceOwner, gaps);
  reviewOwnerRecord("ownerIdentity.packageOwner", ownerIdentity.packageOwner, gaps);
  reviewOwnerRecord("ownerIdentity.authorityOwner", ownerIdentity.authorityOwner, gaps);

  const reviewContactRef = valueOrNull(ownerIdentity.reviewContactRef);
  if (!hasOwn(ownerIdentity, "reviewContactRef")) {
    addGap(gaps, "owner-identity.review-contact", "ownerIdentity.reviewContactRef is required and may be string or null.", {
      path: "ownerIdentity.reviewContactRef"
    });
  } else if (reviewContactRef !== null && typeof ownerIdentity.reviewContactRef !== "string") {
    addGap(gaps, "owner-identity.review-contact", "ownerIdentity.reviewContactRef must be a string or null.", {
      path: "ownerIdentity.reviewContactRef"
    });
  }

  const ownerEvidenceRefs = arrayValue(ownerIdentity.ownerEvidenceRefs);
  if (ownerEvidenceRefs.length === 0) {
    addGap(gaps, "owner-identity.owner-evidence", "ownerIdentity.ownerEvidenceRefs must be a non-empty array.", {
      path: "ownerIdentity.ownerEvidenceRefs"
    });
    return;
  }

  for (const item of ownerEvidenceRefs) {
    const id = asSourceArtifactId(item);
    if (!id) {
      addGap(gaps, "owner-identity.owner-evidence-format", "ownerIdentity.ownerEvidenceRefs item must include artifactId.", {
        path: "ownerIdentity.ownerEvidenceRefs"
      });
    }
  }
}

function reviewSourceAuthority(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const sourceAuthority = manifest.sourceAuthority;

  if (!isPlainRecord(sourceAuthority)) {
    addGap(gaps, "source-authority.missing", "sourceAuthority must be an object.", { path: "sourceAuthority" });
    return;
  }

  const sourceTier = stringValue(sourceAuthority, "sourceTier");
  const sourceClassification = stringValue(sourceAuthority, "sourceAuthorityClassification");
  const catalog = isPlainRecord(manifest.catalog) ? manifest.catalog : null;
  const catalogType = stringValue(catalog, "catalogType");
  const isSyntheticSourceAuthority = sourceClassification === "synthetic-rehearsal-only";
  const isSyntheticCatalog = catalogType === "synthetic-rehearsal-only";

  if (!inEnum(sourceTier, [...SOURCE_TIER_ENUM])) {
    addGap(gaps, "source-authority.source-tier", "sourceAuthority.sourceTier is required and must be one of the contract enum values.", {
      path: "sourceAuthority.sourceTier"
    });
  }

  if (!inEnum(sourceClassification, [...SOURCE_AUTHORITY_CLASSIFICATION_ENUM])) {
    addGap(
      gaps,
      "source-authority.classification",
      "sourceAuthority.sourceAuthorityClassification is required and must be known.",
      { path: "sourceAuthority.sourceAuthorityClassification" }
    );
  }

  if (sourceTier === "tier-1-itri-or-owner-authority") {
    if (sourceClassification !== "itri-private-authority" && sourceClassification !== "source-owner-private-authority") {
      addGap(gaps, "source-authority.mapping", "tier-1 sourceAuthority must map to itri/private-owner authority classification.", {
        path: "sourceAuthority.sourceAuthorityClassification"
      });
    }
  }

  if (sourceTier === "tier-2-public-official-source") {
    if (sourceClassification !== "official-public-source" && sourceClassification !== "bounded-public-profile") {
      addGap(gaps, "source-authority.mapping", "tier-2 sourceAuthority must map to official/bounded public classification.", {
        path: "sourceAuthority.sourceAuthorityClassification"
      });
    }
  }

  if (sourceTier === "tier-3-synthetic-rehearsal") {
    if (sourceClassification !== "synthetic-rehearsal-only") {
      addGap(gaps, "source-authority.mapping", "tier-3 sourceAuthority must use synthetic-rehearsal-only classification.", {
        path: "sourceAuthority.sourceAuthorityClassification"
      });
    }
  }

  if (sourceTier === "tier-4-readiness-placeholder") {
    if (sourceClassification !== "owner-defined-source-pending-review") {
      addGap(gaps, "source-authority.mapping", "tier-4 sourceAuthority must use owner-defined-source-pending-review classification.", {
        path: "sourceAuthority.sourceAuthorityClassification"
      });
    }
  }

  if (!isSyntheticSourceAuthority && isSyntheticCatalog) {
    addGap(
      gaps,
      SYNTHETIC_SOURCE_BOUNDARY_ERROR,
      "synthetic-rehearsal-only catalog must not be used as owner-source authority.",
      { path: "catalog.catalogType" }
    );
  }

  if (isSyntheticSourceAuthority && sourceTier !== "tier-3-synthetic-rehearsal") {
    addGap(gaps, SYNTHETIC_SOURCE_BOUNDARY_ERROR, "Synthetic authority classification requires tier-3-synthetic-rehearsal.", {
      path: "sourceAuthority.sourceTier"
    });
  }

  if (isSyntheticSourceAuthority && sourceTier === "tier-3-synthetic-rehearsal" && !isSyntheticCatalog) {
    addGap(gaps, SYNTHETIC_SOURCE_BOUNDARY_ERROR, "Synthetic authority classification requires synthetic-rehearsal-only catalog.", {
      path: "sourceAuthority.sourceAuthorityClassification"
    });
  }

  const authorityScope = nonEmptyStringArray(sourceAuthority.authorityScope);
  if (authorityScope.length === 0) {
    addGap(gaps, "source-authority.scope", "sourceAuthority.authorityScope must be a non-empty array.", {
      path: "sourceAuthority.authorityScope"
    });
  }

  const authorityLimitations = nonEmptyStringArray(sourceAuthority.authorityLimitations);
  if (authorityLimitations.length === 0) {
    addGap(gaps, "source-authority.limitations", "sourceAuthority.authorityLimitations must be a non-empty array.", {
      path: "sourceAuthority.authorityLimitations"
    });
  }

  const ownerApprovalRequired = booleanValue(sourceAuthority, "ownerApprovalRequiredForAuthorityUse");
  if (ownerApprovalRequired === null) {
    addGap(
      gaps,
      "source-authority.owner-approval-required",
      "sourceAuthority.ownerApprovalRequiredForAuthorityUse must be boolean.",
      { path: "sourceAuthority.ownerApprovalRequiredForAuthorityUse" }
    );
  }

  const ownerApprovalRefs = arrayValue(sourceAuthority.ownerApprovalRefs);
  if (ownerApprovalRefs.length === 0) {
    addGap(gaps, "source-authority.owner-approval-refs", "sourceAuthority.ownerApprovalRefs must be non-empty.", {
      path: "sourceAuthority.ownerApprovalRefs"
    });
  }

  const ownerEvidencePublic = catalog !== null && stringValue(catalog, "catalogType") === "public-tle";

  if ((sourceClassification === "itri-private-authority" || sourceClassification === "source-owner-private-authority") && ownerApprovalRequired === false) {
    addGap(
      gaps,
      "source-authority.owner-approval-missing",
      "Private authority classification must not mark owner approval as false.",
      { path: "sourceAuthority.ownerApprovalRequiredForAuthorityUse" }
    );
  }

  const ownerAuthorityPromotion = isPlainRecord(sourceAuthority.ownerAuthorityPromotion)
    ? sourceAuthority.ownerAuthorityPromotion
    : null;

  const needsOwnerAuthorityPromotion = ownerEvidencePublic &&
    sourceClassification !== null &&
    sourceClassification !== "official-public-source" &&
    sourceClassification !== "bounded-public-profile";

  if (needsOwnerAuthorityPromotion) {
    if (!ownerAuthorityPromotion) {
      addGap(
        gaps,
        "source-authority.owner-promotion.missing",
        "Public catalog with owner/private authority classification must include ownerAuthorityPromotion.",
        { path: "sourceAuthority.ownerAuthorityPromotion" }
      );
    } else {
      if (booleanValue(ownerAuthorityPromotion, "explicitOwnerEvidence") !== true) {
        addGap(
          gaps,
          "source-authority.owner-promotion.evidence",
          "ownerAuthorityPromotion.explicitOwnerEvidence must be true for public to private authority promotion.",
          { path: "sourceAuthority.ownerAuthorityPromotion.explicitOwnerEvidence" }
        );
      }

      const approvedBy = stringValue(ownerAuthorityPromotion, "approvedBy");
      if (!approvedBy) {
        addGap(
          gaps,
          "source-authority.owner-promotion.approved-by",
          "ownerAuthorityPromotion.approvedBy is required.",
          { path: "sourceAuthority.ownerAuthorityPromotion.approvedBy" }
        );
      }

      const approvedAt = stringValue(ownerAuthorityPromotion, "approvedAt");
      if (!approvedAt || !Number.isFinite(Date.parse(approvedAt))) {
        addGap(
          gaps,
          "source-authority.owner-promotion.approved-at",
          "ownerAuthorityPromotion.approvedAt must be ISO-8601.",
          { path: "sourceAuthority.ownerAuthorityPromotion.approvedAt" }
        );
      }

      const promotionScope = stringValue(ownerAuthorityPromotion, "promotionScope");
      if (!promotionScope) {
        addGap(
          gaps,
          "source-authority.owner-promotion.scope",
          "ownerAuthorityPromotion.promotionScope is required.",
          { path: "sourceAuthority.ownerAuthorityPromotion.promotionScope" }
        );
      }

      const approvalArtifactRefs = arrayValue(ownerAuthorityPromotion.approvalArtifactRefs);
      if (approvalArtifactRefs.length === 0) {
        addGap(
          gaps,
          "source-authority.owner-promotion.refs",
          "ownerAuthorityPromotion.approvalArtifactRefs is required and non-empty.",
          { path: "sourceAuthority.ownerAuthorityPromotion.approvalArtifactRefs" }
        );
      }
    }
  }
}

function reviewSourceLocator(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const sourceLocator = manifest.sourceLocator;
  if (!isPlainRecord(sourceLocator)) {
    addGap(gaps, "source-locator.missing", "sourceLocator must be an object.", { path: "sourceLocator" });
    return;
  }

  const locatorType = stringValue(sourceLocator, "locatorType");
  if (!inEnum(locatorType, [...SOURCE_LOCATOR_TYPES])) {
    addGap(gaps, "source-locator.type", "sourceLocator.locatorType must be one of the allowed values.", {
      path: "sourceLocator.locatorType"
    });
  }

  const networkAccessRequired = booleanValue(sourceLocator, "networkAccessRequiredForIntakeReview");
  if (networkAccessRequired === null) {
    addGap(gaps, "source-locator.network", "sourceLocator.networkAccessRequiredForIntakeReview must be boolean.", {
      path: "sourceLocator.networkAccessRequiredForIntakeReview"
    });
    return;
  }

  if (networkAccessRequired === true) {
    addGap(
      gaps,
      "source-locator.network",
      "networkAccessRequiredForIntakeReview must be false to satisfy intake boundary (no live external execution).",
      { path: "sourceLocator.networkAccessRequiredForIntakeReview" }
    );
  }

  const publicSource = sourceLocator.publicSource;
  const privateDrop = sourceLocator.privateDrop;

  if (locatorType === "public-url") {
    if (!isPlainRecord(publicSource)) {
      addGap(
        gaps,
        "source-locator.public-source",
        "sourceLocator.publicSource is required when locatorType is public-url.",
        { path: "sourceLocator.publicSource" }
      );
    } else {
      if (!stringValue(publicSource, "sourceUrl")) {
        addGap(gaps, "source-locator.public-source", "sourceLocator.publicSource.sourceUrl is required.", {
          path: "sourceLocator.publicSource.sourceUrl"
        });
      }

      const accessedAt = stringValue(publicSource, "accessedAt");
      if (!accessedAt || !Number.isFinite(Date.parse(accessedAt))) {
        addGap(gaps, "source-locator.public-source", "sourceLocator.publicSource.accessedAt must be ISO-8601.", {
          path: "sourceLocator.publicSource.accessedAt"
        });
      }

      if (!stringValue(publicSource, "accessMethod")) {
        addGap(gaps, "source-locator.public-source", "sourceLocator.publicSource.accessMethod is required.", {
          path: "sourceLocator.publicSource.accessMethod"
        });
      }

      const retainedMetadataRefs = arrayValue(publicSource.retainedMetadataRefs);
      if (retainedMetadataRefs.length === 0) {
        addGap(
          gaps,
          "source-locator.public-source",
          "sourceLocator.publicSource.retainedMetadataRefs is required.",
          { path: "sourceLocator.publicSource.retainedMetadataRefs" }
        );
      }
    }
  }

  if (locatorType === "private-drop") {
    if (!isPlainRecord(privateDrop)) {
      addGap(
        gaps,
        "source-locator.private-drop",
        "sourceLocator.privateDrop is required when locatorType is private-drop.",
        { path: "sourceLocator.privateDrop" }
      );
    } else {
      if (!stringValue(privateDrop, "ownerSystemRef")) {
        addGap(gaps, "source-locator.private-drop", "sourceLocator.privateDrop.ownerSystemRef is required.", {
          path: "sourceLocator.privateDrop.ownerSystemRef"
        });
      }

      if (!stringValue(privateDrop, "dropId")) {
        addGap(gaps, "source-locator.private-drop", "sourceLocator.privateDrop.dropId is required.", {
          path: "sourceLocator.privateDrop.dropId"
        });
      }

      const receivedAt = stringValue(privateDrop, "receivedAt");
      if (!receivedAt || !Number.isFinite(Date.parse(receivedAt))) {
        addGap(gaps, "source-locator.private-drop", "sourceLocator.privateDrop.receivedAt must be ISO-8601.", {
          path: "sourceLocator.privateDrop.receivedAt"
        });
      }

      const offlineReviewMaterialRefs = arrayValue(privateDrop.offlineReviewMaterialRefs);
      if (offlineReviewMaterialRefs.length === 0) {
        addGap(
          gaps,
          "source-locator.private-drop",
          "sourceLocator.privateDrop.offlineReviewMaterialRefs is required.",
          { path: "sourceLocator.privateDrop.offlineReviewMaterialRefs" }
        );
      }

      if (!Array.isArray(privateDrop.confidentialityNotes)) {
        addGap(gaps, "source-locator.private-drop", "sourceLocator.privateDrop.confidentialityNotes must be an array.", {
          path: "sourceLocator.privateDrop.confidentialityNotes"
        });
      }
    }
  }

  if (locatorType === "mixed-public-and-private" || locatorType === "owner-system-reference") {
    if (!isPlainRecord(publicSource) && !isPlainRecord(privateDrop)) {
      addGap(
        gaps,
        "source-locator.hybrid",
        "sourceLocator must include publicSource or privateDrop for mixed-owner locatorType.",
        { path: "sourceLocator" }
      );
    }
  }
}

function reviewCatalog(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const catalog = manifest.catalog;
  if (!isPlainRecord(catalog)) {
    addGap(gaps, "catalog.missing", "catalog must be an object.", { path: "catalog" });
    return;
  }

  const catalogType = stringValue(catalog, "catalogType");
  if (!inEnum(catalogType, [...CATALOG_TYPES])) {
    addGap(gaps, "catalog.type", "catalog.catalogType must be a known value.", { path: "catalog.catalogType" });
  }

  const catalogArtifactRefs = arrayValue(catalog.sourceArtifactRefs);
  if (catalogArtifactRefs.length === 0) {
    addGap(gaps, "catalog.source-artifact-refs", "catalog.sourceArtifactRefs is required and must be non-empty.", {
      path: "catalog.sourceArtifactRefs"
    });
  }

  const derivation = isPlainRecord(catalog.derivation) ? catalog.derivation : null;
  if (derivation) {
    const derived = booleanValue(derivation, "derived");
    if (derived === null) {
      addGap(gaps, "catalog.derivation.derived", "catalog.derivation.derived must be boolean.", { path: "catalog.derivation.derived" });
    }

    const method = stringValue(derivation, "method");
    if (!method || method.trim().length === 0) {
      addGap(gaps, "catalog.derivation.method", "catalog.derivation.method is required.", { path: "catalog.derivation.method" });
    }

    const inputArtifactRefs = arrayValue(derivation.inputArtifactRefs);
    if (inputArtifactRefs.length === 0) {
      addGap(gaps, "catalog.derivation.input-artifact-refs", "catalog.derivation.inputArtifactRefs is required.", {
        path: "catalog.derivation.inputArtifactRefs"
      });
    }

    const reviewNotes = arrayValue(derivation.reviewNotes);
    if (reviewNotes.length === 0) {
      addGap(gaps, "catalog.derivation.review-notes", "catalog.derivation.reviewNotes is required.", {
        path: "catalog.derivation.reviewNotes"
      });
    }
  }
}

function reviewModeRuleSection(modeRules: unknown, pathName: string, required: boolean, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  if (!isPlainRecord(modeRules)) {
    if (required) {
      addGap(gaps, `${pathName}.missing`, `${pathName} must be an object.`, { path: pathName });
    }
    return;
  }

  const supported = booleanValue(modeRules, "supported");
  if (supported === null) {
    addGap(gaps, `${pathName}.supported`, `${pathName}.supported must be boolean.`, { path: `${pathName}.supported` });
  }

  if (!stringValue(modeRules, "allowedUse")) {
    addGap(gaps, `${pathName}.allowed-use`, `${pathName}.allowedUse is required.`, { path: `${pathName}.allowedUse` });
  }

  const executionRequired = booleanValue(modeRules, "executionRequiredForIntakeReview");
  if (executionRequired === null) {
    addGap(gaps, `${pathName}.execution-required`, `${pathName}.executionRequiredForIntakeReview is required.`, {
      path: `${pathName}.executionRequiredForIntakeReview`
    });
  } else if (executionRequired === true) {
    addGap(
      gaps,
      `${pathName}.execution-required`,
      `${pathName}.executionRequiredForIntakeReview must be false for package intake readiness.`,
      { path: `${pathName}.executionRequiredForIntakeReview` }
    );
  }

  const sourceArtifactRefs = arrayValue(modeRules.sourceArtifactRefs);
  if (sourceArtifactRefs.length === 0) {
    addGap(gaps, `${pathName}.source-artifact-refs`, `${pathName}.sourceArtifactRefs must be non-empty.`, {
      path: `${pathName}.sourceArtifactRefs`
    });
  }

  const unavailable = stringValue(modeRules, "unavailableBehavior");
  if (!inEnum(unavailable, ["reject-package", "mark-incomplete", "fallback-to-prerecorded-only", "owner-review-required"])) {
    addGap(gaps, `${pathName}.unavailable-behavior`, `${pathName}.unavailableBehavior is invalid.`, {
      path: `${pathName}.unavailableBehavior`
    });
  }

  const malformedData = stringValue(modeRules, "malformedDataBehavior");
  if (!inEnum(malformedData, ["reject-record", "reject-package", "quarantine-records", "owner-review-required"])) {
    addGap(
      gaps,
      `${pathName}.malformed-data-behavior`,
      `${pathName}.malformedDataBehavior is invalid.`,
      { path: `${pathName}.malformedDataBehavior` }
    );
  }

  const outsideEpoch = stringValue(modeRules, "outsideEpochBehavior");
  if (!inEnum(outsideEpoch, ["reject-record", "reject-package", "mark-stale", "owner-review-required"])) {
    addGap(
      gaps,
      `${pathName}.outside-epoch-behavior`,
      `${pathName}.outsideEpochBehavior is invalid.`,
      { path: `${pathName}.outsideEpochBehavior` }
    );
  }
}

function reviewModeRules(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const modeRules = manifest.modeRules;

  if (!isPlainRecord(modeRules)) {
    addGap(gaps, "mode-rules.missing", "modeRules must be an object.", { path: "modeRules" });
    return;
  }

  reviewModeRuleSection(modeRules.realTime, "modeRules.realTime", true, gaps);
  reviewModeRuleSection(modeRules.prerecorded, "modeRules.prerecorded", true, gaps);

  const defaultMode = stringValue(modeRules, "defaultMode");
  if (!inEnum(defaultMode, ["real-time", "prerecorded", "owner-selected-at-review"])) {
    addGap(gaps, "mode-rules.default-mode", "modeRules.defaultMode must be valid.", {
      path: "modeRules.defaultMode"
    });
  }

  const modeSelectionArtifactRefs = arrayValue(modeRules.modeSelectionArtifactRefs);
  if (modeSelectionArtifactRefs.length === 0) {
    addGap(gaps, "mode-rules.mode-selection", "modeRules.modeSelectionArtifactRefs must be non-empty.", {
      path: "modeRules.modeSelectionArtifactRefs"
    });
  }
}

function reviewTemporalRules(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const temporalRules = manifest.temporalRules;
  if (!isPlainRecord(temporalRules)) {
    addGap(gaps, "temporal-rules.missing", "temporalRules must be an object.", { path: "temporalRules" });
    return;
  }

  const epoch = temporalRules.epoch;
  if (!isPlainRecord(epoch)) {
    addGap(gaps, "temporal-rules.epoch", "temporalRules.epoch is required.", { path: "temporalRules.epoch" });
  } else {
    if (!stringValue(epoch, "epochFormat")) {
      addGap(gaps, "temporal-rules.epoch", "temporalRules.epoch.epochFormat is required.", {
        path: "temporalRules.epoch.epochFormat"
      });
    }

    if (!hasOwn(epoch, "epochStart")) {
      addGap(gaps, "temporal-rules.epoch", "temporalRules.epoch.epochStart is required.", {
        path: "temporalRules.epoch.epochStart"
      });
    } else if (epoch.epochStart !== null && !stringValue(epoch, "epochStart")) {
      addGap(gaps, "temporal-rules.epoch", "temporalRules.epoch.epochStart must be date-time string or null.", {
        path: "temporalRules.epoch.epochStart"
      });
    }

    if (!hasOwn(epoch, "epochEnd")) {
      addGap(gaps, "temporal-rules.epoch", "temporalRules.epoch.epochEnd is required.", {
        path: "temporalRules.epoch.epochEnd"
      });
    } else if (epoch.epochEnd !== null && !stringValue(epoch, "epochEnd")) {
      addGap(gaps, "temporal-rules.epoch", "temporalRules.epoch.epochEnd must be date-time string or null.", {
        path: "temporalRules.epoch.epochEnd"
      });
    }

    if (!stringValue(epoch, "epochSource")) {
      addGap(gaps, "temporal-rules.epoch", "temporalRules.epoch.epochSource is required.", {
        path: "temporalRules.epoch.epochSource"
      });
    }
  }

  const timeSystem = temporalRules.timeSystem;
  if (!isPlainRecord(timeSystem)) {
    addGap(gaps, "temporal-rules.time-system", "temporalRules.timeSystem is required.", {
      path: "temporalRules.timeSystem"
    });
  } else {
    for (const field of ["name", "leapSecondPolicy", "clockMappingRule"]) {
      const value = stringValue(timeSystem, field);
      if (!value) {
        addGap(gaps, "temporal-rules.time-system", `temporalRules.timeSystem.${field} is required.`, {
          path: `temporalRules.timeSystem.${field}`
        });
      }
    }
  }

  const updateCadence = temporalRules.updateCadence;
  if (!isPlainRecord(updateCadence)) {
    addGap(gaps, "temporal-rules.update-cadence", "temporalRules.updateCadence is required.", {
      path: "temporalRules.updateCadence"
    });
  } else {
    const cadenceKind = stringValue(updateCadence, "cadenceKind");
    if (!inEnum(cadenceKind, [...CADENCE_KIND_ENUM])) {
      addGap(gaps, "temporal-rules.update-cadence", "temporalRules.updateCadence.cadenceKind is invalid.", {
        path: "temporalRules.updateCadence.cadenceKind"
      });
    }

    const nominalCadenceSeconds = numberValue(updateCadence, "nominalCadenceSeconds");
    if (nominalCadenceSeconds !== null && nominalCadenceSeconds < 0) {
      addGap(gaps, "temporal-rules.nominal-cadence", "temporalRules.updateCadence.nominalCadenceSeconds must be >= 0.", {
        path: "temporalRules.updateCadence.nominalCadenceSeconds"
      });
    }

    const maximumGapSeconds = numberValue(updateCadence, "maximumGapSeconds");
    if (maximumGapSeconds !== null && maximumGapSeconds < 0) {
      addGap(gaps, "temporal-rules.maximum-gap", "temporalRules.updateCadence.maximumGapSeconds must be >= 0.", {
        path: "temporalRules.updateCadence.maximumGapSeconds"
      });
    }

    const cadenceSource = stringValue(updateCadence, "cadenceSource");
    if (!cadenceSource) {
      addGap(gaps, "temporal-rules.cadence-source", "temporalRules.updateCadence.cadenceSource is required.", {
        path: "temporalRules.updateCadence.cadenceSource"
      });
    }
  }

  const stalePolicy = temporalRules.staleDataPolicy;
  if (!isPlainRecord(stalePolicy)) {
    addGap(gaps, "temporal-rules.stale-data", "temporalRules.staleDataPolicy is required.", {
      path: "temporalRules.staleDataPolicy"
    });
  } else {
    if (!inEnum(stringValue(stalePolicy, "staleBehavior"), [...STALE_BEHAVIOR_ENUM])) {
      addGap(gaps, "temporal-rules.stale-behavior", "temporalRules.staleDataPolicy.staleBehavior is invalid.", {
        path: "temporalRules.staleDataPolicy.staleBehavior"
      });
    }

    if (!inEnum(stringValue(stalePolicy, "reviewStateWhenStale"), [...STALE_REVIEW_STATE_ENUM])) {
      addGap(
        gaps,
        "temporal-rules.review-state-when-stale",
        "temporalRules.staleDataPolicy.reviewStateWhenStale is invalid.",
        { path: "temporalRules.staleDataPolicy.reviewStateWhenStale" }
      );
    }

    if (!Array.isArray(stalePolicy.policyArtifactRefs) || stalePolicy.policyArtifactRefs.length === 0) {
      addGap(
        gaps,
        "temporal-rules.stale-artifact-refs",
        "temporalRules.staleDataPolicy.policyArtifactRefs is required and must be non-empty.",
        { path: "temporalRules.staleDataPolicy.policyArtifactRefs" }
      );
    }
  }

  if (!Array.isArray(temporalRules.temporalArtifactRefs) || temporalRules.temporalArtifactRefs.length === 0) {
    addGap(
      gaps,
      "temporal-rules.temporal-artifact-refs",
      "temporalRules.temporalArtifactRefs is required and must be non-empty.",
      { path: "temporalRules.temporalArtifactRefs" }
    );
  }
}

function reviewLicenseRedistribution(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const policy = manifest.licenseRedistributionPolicy;

  if (!isPlainRecord(policy)) {
    addGap(gaps, "license.policy.missing", "licenseRedistributionPolicy must be an object.", {
      path: "licenseRedistributionPolicy"
    });
    return;
  }

  const requiredFields = [
    "licenseName",
    "licenseVersionOrRef",
    "redistributionAllowed",
    "repoRetentionAllowed",
    "derivedArtifactsAllowed",
    "publicSummaryAllowed",
    "policyArtifactRefs",
    "restrictions"
  ];

  for (const field of requiredFields) {
    if (!hasOwn(policy, field)) {
      addGap(gaps, "license.policy.required", `licenseRedistributionPolicy.${field} is required.`, {
        path: `licenseRedistributionPolicy.${field}`
      });
    }
  }

  for (const field of ["licenseName", "licenseVersionOrRef"]) {
    if (!stringValue(policy, field)) {
      addGap(gaps, "license.policy.text", `licenseRedistributionPolicy.${field} must be text.`, {
        path: `licenseRedistributionPolicy.${field}`
      });
    }
  }

  for (const field of ["redistributionAllowed", "repoRetentionAllowed", "derivedArtifactsAllowed", "publicSummaryAllowed"]) {
    if (typeof policy[field] !== "boolean") {
      addGap(
        gaps,
        "license.policy.boolean",
        `licenseRedistributionPolicy.${field} must be boolean.`,
        { path: `licenseRedistributionPolicy.${field}` }
      );
    }
  }

  if (!Array.isArray(policy.policyArtifactRefs) || policy.policyArtifactRefs.length === 0) {
    addGap(gaps, "license.policy.ref", "licenseRedistributionPolicy.policyArtifactRefs is required.", {
      path: "licenseRedistributionPolicy.policyArtifactRefs"
    });
  }
}

function reviewChecksumPolicy(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const checksumPolicy = manifest.checksumPolicy;
  if (!isPlainRecord(checksumPolicy)) {
    addGap(gaps, "checksum.policy.missing", "checksumPolicy must be an object.", { path: "checksumPolicy" });
    return;
  }

  const algorithms = nonEmptyStringArray(checksumPolicy.requiredAlgorithms);
  if (algorithms.length === 0) {
    addGap(gaps, "checksum.policy.algorithms", "checksumPolicy.requiredAlgorithms must be non-empty.", {
      path: "checksumPolicy.requiredAlgorithms"
    });
  }

  for (const algorithm of algorithms) {
    if (!inEnum(algorithm, [...CHECKSUM_ALGORITHMS])) {
      addGap(gaps, "checksum.policy.algorithm", `checksumPolicy.requiredAlgorithms contains unsupported value ${algorithm}.`, {
        path: "checksumPolicy.requiredAlgorithms"
      });
    }
  }

  if (booleanValue(checksumPolicy, "allRetainedArtifactsRequireChecksum") !== true) {
    addGap(
      gaps,
      "checksum.policy.all-required",
      "checksumPolicy.allRetainedArtifactsRequireChecksum must be true.",
      { path: "checksumPolicy.allRetainedArtifactsRequireChecksum" }
    );
  }

  const checksumManifestRefs = arrayValue(checksumPolicy.checksumManifestRefs);
  if (checksumManifestRefs.length === 0) {
    addGap(gaps, "checksum.policy.manifest-refs", "checksumPolicy.checksumManifestRefs is required.", {
      path: "checksumPolicy.checksumManifestRefs"
    });
  }
}

function readChecksumPolicyAlgorithms(
  manifest: PlainRecord
): Set<string> | null {
  const checksumPolicy = isPlainRecord(manifest.checksumPolicy) ? manifest.checksumPolicy : null;
  if (!checksumPolicy) {
    return null;
  }

  const algorithms = nonEmptyStringArray(checksumPolicy.requiredAlgorithms);
  if (algorithms.length === 0) {
    return null;
  }

  const normalized = new Set<string>();
  for (const algorithm of algorithms) {
    if (inEnum(algorithm, [...CHECKSUM_ALGORITHMS])) {
      normalized.add(algorithm);
    }
  }

  return normalized.size > 0 ? normalized : null;
}

function reviewRetentionPolicy(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const retentionPolicy = manifest.retentionPolicy;
  if (!isPlainRecord(retentionPolicy)) {
    addGap(gaps, "retention.policy.missing", "retentionPolicy must be an object.", { path: "retentionPolicy" });
    return;
  }

  const packageRoot = stringValue(retentionPolicy, "packageRoot");
  if (!packageRoot) {
    addGap(gaps, "retention.package-root", "retentionPolicy.packageRoot is required.", { path: "retentionPolicy.packageRoot" });
  } else if (packageRoot !== REQUIRED_PACKAGE_ROOT) {
    addGap(gaps, "retention.package-root", "retentionPolicy.packageRoot must be '.'.", {
      path: "retentionPolicy.packageRoot"
    });
  } else if (!RETAINED_PATH_PATTERN.test(packageRoot)) {
    addGap(gaps, "retention.package-root", "retentionPolicy.packageRoot must be a package-relative path.", {
      path: "retentionPolicy.packageRoot"
    });
  }

  const retentionOwner = stringValue(retentionPolicy, "retentionOwner");
  if (!retentionOwner) {
    addGap(gaps, "retention.owner", "retentionPolicy.retentionOwner is required.", {
      path: "retentionPolicy.retentionOwner"
    });
  }

  const retentionClass = stringValue(retentionPolicy, "retentionClass");
  if (!inEnum(retentionClass, [...RETENTION_CLASS_ENUM])) {
    addGap(gaps, "retention.class", "retentionPolicy.retentionClass is invalid.", {
      path: "retentionPolicy.retentionClass"
    });
  }

  if (retentionPolicy.artifactListRequired !== true) {
    addGap(
      gaps,
      "retention.artifact-list",
      "retentionPolicy.artifactListRequired must be true.",
      { path: "retentionPolicy.artifactListRequired" }
    );
  }

  if (stringValue(retentionPolicy, "pathBoundaryRule") !== PATH_BOUNDARY_CLAIM) {
    addGap(
      gaps,
      "retention.path-boundary-rule",
      `retentionPolicy.pathBoundaryRule must equal '${PATH_BOUNDARY_CLAIM}'.`,
      { path: "retentionPolicy.pathBoundaryRule" }
    );
  }

  const redactionPolicy = retentionPolicy.redactionPolicy;
  if (!isPlainRecord(redactionPolicy)) {
    addGap(gaps, "retention.redaction", "retentionPolicy.redactionPolicy is required.", {
      path: "retentionPolicy.redactionPolicy"
    });
    return;
  }

  const redactionLevel = stringValue(redactionPolicy, "redactionLevel");
  if (!inEnum(redactionLevel, ["none", "partial", "metadata-only", "audit-blocking"])) {
    addGap(gaps, "retention.redaction-level", "retentionPolicy.redactionPolicy.redactionLevel is invalid.", {
      path: "retentionPolicy.redactionPolicy.redactionLevel"
    });
  }

  if (!Array.isArray(redactionPolicy.redactedCategories)) {
    addGap(
      gaps,
      "retention.redacted-categories",
      "retentionPolicy.redactionPolicy.redactedCategories must be an array.",
      { path: "retentionPolicy.redactionPolicy.redactedCategories" }
    );
  }

  if (!inEnum(stringValue(redactionPolicy, "auditability"), ["full", "reviewable", "blocked"])) {
    addGap(gaps, "retention.auditability", "retentionPolicy.redactionPolicy.auditability is invalid.", {
      path: "retentionPolicy.redactionPolicy.auditability"
    });
  }
}

function reviewScenarioMapping(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const scenarioMapping = manifest.scenarioMapping;
  if (!isPlainRecord(scenarioMapping)) {
    addGap(gaps, "scenario.mapping.missing", "scenarioMapping must be an object.", { path: "scenarioMapping" });
    return;
  }

  if (!stringValue(scenarioMapping, "mappingId")) {
    addGap(gaps, "scenario.mapping.id", "scenarioMapping.mappingId is required.", { path: "scenarioMapping.mappingId" });
  }

  const targetScenarioIds = nonEmptyStringArray(scenarioMapping.targetScenarioIds);
  const routeVisibleScenarioIds = nonEmptyStringArray(scenarioMapping.routeVisibleScenarioIds);
  if (targetScenarioIds.length === 0) {
    addGap(gaps, "scenario.mapping.target", "scenarioMapping.targetScenarioIds is required.", {
      path: "scenarioMapping.targetScenarioIds"
    });
  }
  if (routeVisibleScenarioIds.length === 0) {
    addGap(gaps, "scenario.mapping.route-visible", "scenarioMapping.routeVisibleScenarioIds is required.", {
      path: "scenarioMapping.routeVisibleScenarioIds"
    });
  }

  const recordRules = arrayValue(scenarioMapping.recordToScenarioRules);
  if (recordRules.length === 0) {
    addGap(gaps, "scenario.mapping.record-rules", "scenarioMapping.recordToScenarioRules must be non-empty.", {
      path: "scenarioMapping.recordToScenarioRules"
    });
  }

  for (const rule of recordRules) {
    if (!isPlainRecord(rule)) {
      addGap(gaps, "scenario.mapping.record-rule", "scenarioMapping.recordToScenarioRules item must be object.", {
        path: "scenarioMapping.recordToScenarioRules"
      });
      continue;
    }

    for (const field of ["ruleId", "sourceField", "targetField", "rule"]) {
      if (!stringValue(rule, field)) {
        addGap(gaps, "scenario.mapping.record-rule-fields", `scenarioMapping.recordToScenarioRules[].${field} is required.`, {
          path: "scenarioMapping.recordToScenarioRules"
        });
      }
    }
  }

  const modeRules = arrayValue(scenarioMapping.modeMappingRules);
  if (modeRules.length === 0) {
    addGap(gaps, "scenario.mapping.mode-rules", "scenarioMapping.modeMappingRules must be non-empty.", {
      path: "scenarioMapping.modeMappingRules"
    });
  }

  for (const rule of modeRules) {
    if (!isPlainRecord(rule)) {
      addGap(gaps, "scenario.mapping.mode-rule", "scenarioMapping.modeMappingRules item must be object.", {
        path: "scenarioMapping.modeMappingRules"
      });
    }
  }
}

function reviewOrbitClassCoverage(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const entries = arrayValue(manifest.orbitClassCoverage);
  if (entries.length === 0) {
    addGap(gaps, "orbit.coverage.missing", "orbitClassCoverage must contain at least one entry.", {
      path: "orbitClassCoverage"
    });
    return;
  }

  for (const item of entries) {
    if (!isPlainRecord(item)) {
      addGap(gaps, "orbit.coverage.item", "orbitClassCoverage item must be object.", {
        path: "orbitClassCoverage"
      });
      continue;
    }

    const orbitClass = stringValue(item, "orbitClass");
    if (!inEnum(orbitClass, ["leo", "meo", "geo", "heo", "unknown", "owner-defined"])) {
      addGap(gaps, "orbit.coverage.orbit-class", "orbitClassCoverage.orbitClass is invalid.", {
        path: "orbitClassCoverage.orbitClass"
      });
    }

    if (typeof item.coverageDeclared !== "boolean") {
      addGap(gaps, "orbit.coverage.declared", "orbitClassCoverage.coverageDeclared must be boolean.", {
        path: "orbitClassCoverage.coverageDeclared"
      });
    }

    if (!stringValue(item, "coverageBasis")) {
      addGap(gaps, "orbit.coverage.basis", "orbitClassCoverage.coverageBasis is required.", {
        path: "orbitClassCoverage.coverageBasis"
      });
    }

    if (!stringValue(item, "classificationRule")) {
      addGap(gaps, "orbit.coverage.rule", "orbitClassCoverage.classificationRule is required.", {
        path: "orbitClassCoverage.classificationRule"
      });
    }

    if (!Array.isArray(item.sourceArtifactRefs) || arrayValue(item.sourceArtifactRefs).length === 0) {
      addGap(gaps, "orbit.coverage.source-refs", "orbitClassCoverage.sourceArtifactRefs is required.", {
        path: "orbitClassCoverage.sourceArtifactRefs"
      });
    }
  }
}

function reviewSatelliteCountDeclarations(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const declaration = isPlainRecord(manifest.satelliteCountDeclarations) ? manifest.satelliteCountDeclarations : null;
  if (!declaration) {
    addGap(gaps, "satellite-count.missing", "satelliteCountDeclarations is required.", {
      path: "satelliteCountDeclarations"
    });
    return;
  }

  const countBasis = stringValue(declaration, "countBasis");
  if (!inEnum(countBasis, ["raw-record-count", "unique-satellite-id-count", "reviewer-filtered-count", "owner-declared-count", "unknown-pending-review"])) {
    addGap(gaps, "satellite-count.basis", "satelliteCountDeclarations.countBasis is invalid.", {
      path: "satelliteCountDeclarations.countBasis"
    });
  }

  const byOrbitClass = arrayValue(declaration.byOrbitClass);
  if (byOrbitClass.length === 0) {
    addGap(gaps, "satellite-count.by-orbit-class", "satelliteCountDeclarations.byOrbitClass is required.", {
      path: "satelliteCountDeclarations.byOrbitClass"
    });
  }

  for (const item of byOrbitClass) {
    if (!isPlainRecord(item)) {
      addGap(gaps, "satellite-count.item", "satelliteCountDeclarations.byOrbitClass item must be object.", {
        path: "satelliteCountDeclarations.byOrbitClass"
      });
      continue;
    }

    const orbitClass = stringValue(item, "orbitClass");
    if (!inEnum(orbitClass, ["leo", "meo", "geo", "heo", "unknown", "owner-defined"])) {
      addGap(gaps, "satellite-count.orbit-class", "satelliteCountDeclarations.byOrbitClass.orbitClass is invalid.", {
        path: "satelliteCountDeclarations.byOrbitClass.orbitClass"
      });
    }

    const declaredCount = numberValue(item, "declaredCount");
    if (declaredCount !== null && declaredCount < 0) {
      addGap(
        gaps,
        "satellite-count.declared-count",
        "satelliteCountDeclarations.byOrbitClass.declaredCount must be >= 0.",
        { path: "satelliteCountDeclarations.byOrbitClass.declaredCount" }
      );
    }

    if (!Array.isArray(item.sourceArtifactRefs) || arrayValue(item.sourceArtifactRefs).length === 0) {
      addGap(gaps, "satellite-count.source-refs", "satelliteCountDeclarations.byOrbitClass.sourceArtifactRefs is required.", {
        path: "satelliteCountDeclarations.byOrbitClass.sourceArtifactRefs"
      });
    }
  }

  if (!stringValue(declaration, "duplicateHandling")) {
    addGap(gaps, "satellite-count.duplicate", "satelliteCountDeclarations.duplicateHandling is required.", {
      path: "satelliteCountDeclarations.duplicateHandling"
    });
  }

  if (!stringValue(declaration, "uniqueIdentityRule")) {
    addGap(gaps, "satellite-count.identity-rule", "satelliteCountDeclarations.uniqueIdentityRule is required.", {
      path: "satelliteCountDeclarations.uniqueIdentityRule"
    });
  }

  if (!Array.isArray(declaration.sourceArtifactRefs) || arrayValue(declaration.sourceArtifactRefs).length === 0) {
    addGap(gaps, "satellite-count.top-source-refs", "satelliteCountDeclarations.sourceArtifactRefs is required.", {
      path: "satelliteCountDeclarations.sourceArtifactRefs"
    });
  }
}

function reviewParsedReviewedFields(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const fields = arrayValue(manifest.parsedReviewedFields);
  if (fields.length === 0) {
    addGap(gaps, "parsed.fields.missing", "parsedReviewedFields is required and must contain at least one entry.", {
      path: "parsedReviewedFields"
    });
    return;
  }

  for (const field of fields) {
    if (!isPlainRecord(field)) {
      addGap(gaps, "parsed.fields.item", "parsedReviewedFields item must be object.", {
        path: "parsedReviewedFields"
      });
      continue;
    }

    for (const key of ["fieldPath", "fieldPurpose", "reviewedValueKind", "reviewRule"]) {
      if (!stringValue(field, key)) {
        addGap(gaps, "parsed.fields.required", `parsedReviewedFields.${key} is required.`, {
          path: `parsedReviewedFields.${key}`
        });
      }
    }

    const sourceRefs = arrayValue(field.sourceArtifactRefs);
    if (sourceRefs.length === 0) {
      addGap(gaps, "parsed.fields.source-refs", "parsedReviewedFields.sourceArtifactRefs is required.", {
        path: "parsedReviewedFields.sourceArtifactRefs"
      });
    }
  }
}

function reviewReviewGate(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const reviewGate = manifest.reviewGate;
  if (!isPlainRecord(reviewGate)) {
    addGap(gaps, "review-gate.missing", "reviewGate is required.", { path: "reviewGate" });
    return;
  }

  const reviewState = stringValue(reviewGate, "reviewState");
  if (!inEnum(reviewState, [...REVIEW_STATE_ENUM])) {
    addGap(gaps, "review-gate.review-state", "reviewGate.reviewState is invalid.", {
      path: "reviewGate.reviewState"
    });
  }

  if (!stringValue(reviewGate, "reviewer")) {
    addGap(gaps, "review-gate.reviewer", "reviewGate.reviewer is required.", {
      path: "reviewGate.reviewer"
    });
  }

  if (!inEnum(stringValue(reviewGate, "failureDisposition"), [...REVIEW_FAILURE_DISPOSITION_ENUM])) {
    addGap(gaps, "review-gate.failure-disposition", "reviewGate.failureDisposition is invalid.", {
      path: "reviewGate.failureDisposition"
    });
  }

  const reviewedAt = stringValue(reviewGate, "reviewedAt");
  if (reviewedAt !== null && !Number.isFinite(Date.parse(reviewedAt))) {
    addGap(gaps, "review-gate.reviewed-at", "reviewGate.reviewedAt must be date-time or null.", {
      path: "reviewGate.reviewedAt"
    });
  }

  if (!Array.isArray(reviewGate.sourceArtifactRefs) || arrayValue(reviewGate.sourceArtifactRefs).length === 0) {
    addGap(gaps, "review-gate.source-refs", "reviewGate.sourceArtifactRefs is required and non-empty.", {
      path: "reviewGate.sourceArtifactRefs"
    });
  }
}

function reviewPackageArtifacts(
  manifest: PlainRecord,
  gaps: ItriExternalSourcePackageIntakeReviewGap[],
  requiredChecksumAlgorithms: Set<string> | null
): Set<string> {
  const artifactIds = new Set<string>();
  const packageArtifacts = arrayValue(manifest.packageArtifacts);

  if (packageArtifacts.length === 0) {
    addGap(gaps, "package-artifacts.missing", "packageArtifacts must include at least one artifact.", {
      path: "packageArtifacts"
    });
    return artifactIds;
  }

  for (const artifact of arrayValue(packageArtifacts)) {
    if (!isPlainRecord(artifact)) {
      addGap(gaps, "package-artifacts.item", "packageArtifacts item must be object.", {
        path: "packageArtifacts"
      });
      continue;
    }

    const artifactId = stringValue(artifact, "artifactId");
    if (!artifactId) {
      addGap(gaps, "package-artifacts.artifact-id", "packageArtifact.artifactId is required.", {
        path: "packageArtifacts.artifactId"
      });
      continue;
    }

    if (artifactIds.has(artifactId)) {
      addGap(gaps, "package-artifacts.artifact-duplicate", `packageArtifact.artifactId ${artifactId} is duplicated.`, {
        path: "packageArtifacts.artifactId"
      });
    }
    artifactIds.add(artifactId);

    const artifactKind = stringValue(artifact, "artifactKind");
    if (!inEnum(artifactKind, [...SOURCE_ARTIFACT_SCOPE_ENUM])) {
      addGap(gaps, "package-artifacts.artifact-kind", "packageArtifact.artifactKind is invalid.", {
        path: "packageArtifacts.artifactKind"
      });
    }

    const retainedPath = stringValue(artifact, "retainedPath");
    if (!retainedPath) {
      addGap(gaps, "package-artifacts.retained-path", "packageArtifact.retainedPath is required.", {
        path: "packageArtifacts.retainedPath"
      });
    } else if (!RETAINED_PATH_PATTERN.test(retainedPath)) {
      addGap(gaps, RETAINED_PATH_BOUNDARY_ERROR, "packageArtifact.retainedPath must stay package-relative and cannot contain '..'.", {
        path: "packageArtifacts.retainedPath"
      });
    }

    const retentionClass = stringValue(artifact, "retentionClass");
    if (!inEnum(retentionClass, [...RETENTION_CLASS_ENUM])) {
      addGap(gaps, "package-artifacts.retention-class", "packageArtifact.retentionClass is invalid.", {
        path: "packageArtifacts.retentionClass"
      });
    }

    if (typeof artifact.sourceRole !== "string" || artifact.sourceRole.trim().length === 0) {
      addGap(gaps, "package-artifacts.source-role", "packageArtifact.sourceRole is required.", {
        path: "packageArtifacts.sourceRole"
      });
    }

    const checksum = artifact.checksum;
    if (!isPlainRecord(checksum)) {
      addGap(gaps, "package-artifacts.checksum", "packageArtifact.checksum is required.", {
        path: "packageArtifacts.checksum"
      });
    } else {
      const algorithm = stringValue(checksum, "algorithm");
      if (!inEnum(algorithm, [...CHECKSUM_ALGORITHMS])) {
        addGap(gaps, "package-artifacts.checksum-algorithm", "packageArtifact.checksum.algorithm is invalid.", {
          path: "packageArtifacts.checksum.algorithm"
        });
      } else if (algorithm !== null && requiredChecksumAlgorithms !== null && !requiredChecksumAlgorithms.has(algorithm)) {
        addGap(
          gaps,
          "package-artifacts.checksum-policy-algorithm",
          "packageArtifact.checksum.algorithm must be declared in checksumPolicy.requiredAlgorithms.",
          { path: "packageArtifacts.checksum.algorithm" }
        );
      }

      const value = stringValue(checksum, "value");
      if (!value) {
        addGap(gaps, "package-artifacts.checksum-value", "packageArtifact.checksum.value is required.", {
          path: "packageArtifacts.checksum.value"
        });
      }
    }
  }

  return artifactIds;
}

function reviewSourceArtifactRefs(manifest: PlainRecord, declaredArtifactIds: ReadonlySet<string>, gaps: ItriExternalSourcePackageIntakeReviewGap[]): ItriExternalSourcePackageIntakeSourceArtifactRefCheck {
  const declaredRefIds = collectSourceArtifactRefIdsFromManifest(manifest, gaps);

  const resolvedRefIds: string[] = [];
  const unknownRefIds: string[] = [];

  for (const artifactId of declaredRefIds) {
    if (declaredArtifactIds.has(artifactId)) {
      resolvedRefIds.push(artifactId);
    } else {
      unknownRefIds.push(artifactId);
    }
  }

  if (unknownRefIds.length > 0) {
    addGap(
      gaps,
      "source-artifact-refs.unknown",
      "Some sourceArtifactRefs reference artifactIds not declared in packageArtifacts.",
      { path: "packageArtifacts" }
    );
  }

  if (declaredRefIds.length === 0) {
    addGap(
      gaps,
      "source-artifact-refs.empty",
      "No sourceArtifactRefs were found in required parsed/review fields.",
      { path: "packageArtifacts" }
    );
  }

  return {
    declaredRefIds,
    resolvedRefIds: [...resolvedRefIds].sort(),
    unknownRefIds: [...new Set(unknownRefIds)].sort()
  };
}

function reviewArtifactPathSummary(packagePathSummary: ItriExternalSourcePackageIntakeArtifactPathCheck | undefined, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  if (!packagePathSummary) {
    addGap(gaps, "artifact-path.summary-missing", "No artifact path summary was provided to reviewer.", {
      path: "packageArtifacts"
    });
    return;
  }

  if (packagePathSummary.escapedPaths.length > 0) {
    addGap(
      gaps,
      RETAINED_PATH_BOUNDARY_ERROR,
      "One or more package artifact paths escape the package boundary.",
      { path: "packageArtifacts" }
    );
  }

  if (packagePathSummary.unresolvedPaths.length > 0) {
    addGap(
      gaps,
      "artifact-path.unresolved",
      "One or more declared packageArtifacts are missing in the package directory.",
      { path: "packageArtifacts" }
    );
  }
}

function reviewNonClaims(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): void {
  const claims = isPlainRecord(manifest.nonClaims) ? manifest.nonClaims : null;
  if (!claims) {
    addGap(gaps, "nonclaims.missing", "nonClaims must exist and contain all false claims.", { path: "nonClaims" });
    return;
  }

  for (const key of Object.keys(REQUIRED_NON_CLAIMS)) {
    if ((claims as PlainRecord)[key] === undefined) {
      addGap(gaps, "nonclaims.missing", `nonClaims.${key} is required.`, { path: `nonClaims.${key}` });
      continue;
    }

    if ((claims as PlainRecord)[key] !== false) {
      addGap(
        gaps,
        "nonclaims.must-be-false",
        `nonClaims.${key} must be false.`,
        { path: `nonClaims.${key}` }
      );
    }
  }
}

function reviewSyntheticReadiness(manifest: PlainRecord, gaps: ItriExternalSourcePackageIntakeReviewGap[]): string[] {
  const detectedPaths: string[] = [];
  const catalog = isPlainRecord(manifest.catalog) ? manifest.catalog : null;
  const sourceAuthority = isPlainRecord(manifest.sourceAuthority) ? manifest.sourceAuthority : null;

  const catalogType = stringValue(catalog ?? {}, "catalogType");
  const sourceAuthorityClassification = stringValue(sourceAuthority ?? {}, "sourceAuthorityClassification");

  if (catalogType === "synthetic-rehearsal-only" || sourceAuthorityClassification === "synthetic-rehearsal-only") {
    detectedPaths.push("catalogType:synthetic");
    addGap(gaps, "synthetic.source-rejected", "Synthetic-rehearsal source cannot satisfy F-03/F-15 source-package intake readiness.", {
      path: "sourceAuthority"
    });
  }

  return detectedPaths;
}

export function reviewMissingItriExternalSourcePackageIntakePackagePath(
  options: ItriExternalSourcePackageIntakeClosedReviewOptions
): ItriExternalSourcePackageIntakeReview {
  const gaps: ItriExternalSourcePackageIntakeReviewGap[] = [];
  addGap(gaps, "package.path-missing", "Package path argument is required and must be explicitly set.", {
    path: "packagePath"
  });

  return closedReview({
    ...options,
    packageState: "missing",
    gaps,
    manifestSchemaVersion: null
  });
}

export function reviewMissingItriExternalSourcePackageIntakePackage(
  options: ItriExternalSourcePackageIntakeClosedReviewOptions
): ItriExternalSourcePackageIntakeReview {
  const gaps: ItriExternalSourcePackageIntakeReviewGap[] = [];
  addGap(gaps, "package.missing", "No retained external source package exists at the named path.", {
    path: options.packagePath
  });

  return closedReview({
    ...options,
    packageState: "missing",
    gaps,
    manifestSchemaVersion: null
  });
}

export function reviewMissingItriExternalSourcePackageIntakeManifest(
  options: ItriExternalSourcePackageIntakeClosedReviewOptions
): ItriExternalSourcePackageIntakeReview {
  const gaps: ItriExternalSourcePackageIntakeReviewGap[] = [];
  addGap(
    gaps,
    "manifest.missing",
    "Package exists, but manifest.json was not found at the explicitly named manifest path.",
    { path: options.manifestPath ?? `${normalizePackagePath(options.packagePath)}/manifest.json` }
  );

  return closedReview({
    ...options,
    packageState: "incomplete",
    gaps,
    manifestSchemaVersion: null
  });
}

export function reviewMalformedItriExternalSourcePackageIntakeManifest(
  options: ItriExternalSourcePackageIntakeMalformedReviewOptions
): ItriExternalSourcePackageIntakeReview {
  const gaps: ItriExternalSourcePackageIntakeReviewGap[] = [];
  addGap(gaps, "manifest.malformed-json", options.parseError, {
    path: options.manifestPath ?? `${normalizePackagePath(options.packagePath)}/manifest.json`
  });

  return closedReview({
    ...options,
    packageState: "incomplete",
    gaps,
    manifestSchemaVersion: null
  });
}

export function reviewRejectedItriExternalSourcePackageIntakePackagePath(
  options: ItriExternalSourcePackageIntakeClosedReviewOptions
): ItriExternalSourcePackageIntakeReview {
  const gaps: ItriExternalSourcePackageIntakeReviewGap[] = [];
  addGap(
    gaps,
    "package.path-outside-retained-root",
    `Package path must be under ${ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_PACKAGE_ROOT}/.`,
    { path: "packagePath" }
  );

  return closedReview({
    ...options,
    packageState: "rejected",
    gaps,
    manifestSchemaVersion: null
  });
}

export function reviewRejectedItriExternalSourcePackageIntakeManifestPath(
  options: ItriExternalSourcePackageIntakeClosedReviewOptions
): ItriExternalSourcePackageIntakeReview {
  const gaps: ItriExternalSourcePackageIntakeReviewGap[] = [];
  addGap(
    gaps,
    "manifest.path-outside-package",
    "Explicit manifest path must resolve inside the explicitly named package directory.",
    { path: options.manifestPath ?? `${normalizePackagePath(options.packagePath)}/manifest.json` }
  );

  return closedReview({
    ...options,
    packageState: "rejected",
    gaps,
    manifestSchemaVersion: null
  });
}

export function reviewItriExternalSourcePackageIntakeManifest(
  options: ItriExternalSourcePackageIntakeReviewOptions
): ItriExternalSourcePackageIntakeReview {
  const reviewedAt = parseReviewTime(options.reviewedAt);
  const packagePath = normalizePackagePath(options.packagePath);
  const manifestPath = options.manifestPath ?? `${packagePath}/manifest.json`;

  const gaps: ItriExternalSourcePackageIntakeReviewGap[] = [];

  if (!isPlainRecord(options.manifest)) {
    addGap(gaps, "manifest.invalid", "Manifest must be a JSON object.", {
      path: manifestPath
    });

    return closedReview({
      packagePath,
      manifestPath,
      reviewedAt,
      packageState: "incomplete",
      gaps,
      manifestSchemaVersion: null
    });
  }

  const manifest = options.manifest;

  reviewPackagePath(packagePath, gaps);
  reviewMissingRootFields(manifest, gaps);

  const manifestSchemaVersion = reviewSchemaVersion(manifest, gaps);
  reviewChecksumPolicy(manifest, gaps);
  const requiredChecksumAlgorithms = readChecksumPolicyAlgorithms(manifest);
  const declaredRefCheck = reviewSourceArtifactRefs(
    manifest,
    reviewPackageArtifacts(manifest, gaps, requiredChecksumAlgorithms),
    gaps
  );
  reviewArtifactPathSummary(options.artifactPathCheck, gaps);
  reviewPackageIdentity(manifest, gaps);
  reviewOwnerIdentity(manifest, gaps);
  reviewSourceAuthority(manifest, gaps);
  reviewSourceLocator(manifest, gaps);
  reviewCatalog(manifest, gaps);
  reviewModeRules(manifest, gaps);
  reviewTemporalRules(manifest, gaps);
  reviewLicenseRedistribution(manifest, gaps);
  reviewRetentionPolicy(manifest, gaps);
  reviewScenarioMapping(manifest, gaps);
  reviewOrbitClassCoverage(manifest, gaps);
  reviewSatelliteCountDeclarations(manifest, gaps);
  reviewParsedReviewedFields(manifest, gaps);
  reviewReviewGate(manifest, gaps);
  reviewNonClaims(manifest, gaps);

  const syntheticPaths = reviewSyntheticReadiness(manifest, gaps);

  const packageIdentity = isPlainRecord(manifest.packageIdentity) ? manifest.packageIdentity : null;
  const packageIdentityId = packageIdentity && stringValue(packageIdentity, "packageId");
  const packageState: ItriExternalSourcePackageIntakePackageState =
    gaps.length === 0 ? "ready-for-intake" : "incomplete";

  const coveredRequirements = readRequirementIds(packageIdentity as PlainRecord, gaps);

  const requirementReviews: ItriExternalSourcePackageIntakeRequirementReview[] =
    ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REQUIREMENTS.map((requirementId) => ({
      requirementId,
      reviewerState: packageState === "ready-for-intake" ? "ready-for-intake" : "incomplete",
      evidenceScope:
        "F-03/F-15 source-package intake structural and boundary review for external source contracts.",
      sourceArtifactIds: declaredRefCheck.resolvedRefIds,
      reviewer: {
        nameOrRole: ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REVIEWER_NAME,
        reviewedAt,
        notes:
          gaps.length === 0
            ? ["Manifest and referenced files satisfy S12 readiness boundary checks."]
            : ["Manifest has blocking gaps and is not ready for intake."]
      },
      gaps
    }));

  return {
    schemaVersion: ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REVIEW_SCHEMA_VERSION,
    reviewedAt,
    packagePath,
    manifestPath,
    packageState,
    manifestSchemaVersion: manifestSchemaVersion ?? null,
    packageIdentityId: packageIdentityId ?? null,
    coveredRequirements:
      coveredRequirements.length > 0
        ? (coveredRequirements as ReadonlyArray<ItriExternalSourcePackageIntakeRequirementId>)
        : [...ITRI_EXTERNAL_SOURCE_PACKAGE_INTAKE_REQUIREMENTS],
    requirementReviews,
    gaps,
    sourceArtifactRefSummary: {
      declaredRefIds: declaredRefCheck.declaredRefIds,
      resolvedRefIds: declaredRefCheck.resolvedRefIds,
      unknownRefIds: declaredRefCheck.unknownRefIds
    },
    packageArtifactPathSummary: options.artifactPathCheck ?? { ...EMPTY_ARTIFACT_PATH_CHECK },
    synthetic: {
      syntheticSourceDetected: syntheticPaths.length > 0,
      detectedPaths: syntheticPaths,
      rejected: syntheticPaths.length > 0
    },
    nonClaims: nonClaims()
  };
}
