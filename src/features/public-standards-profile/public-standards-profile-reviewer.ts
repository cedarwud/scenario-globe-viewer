export const CUSTOMER_PUBLIC_STANDARDS_PROFILE_SCHEMA_VERSION =
  "itri.public-standards-profile.v1" as const;
export const CUSTOMER_PUBLIC_STANDARDS_PROFILE_REVIEW_SCHEMA_VERSION =
  "itri.s4r1.public-standards-profile-review.v1" as const;
export const CUSTOMER_PUBLIC_STANDARDS_PROFILE_PACKAGE_ROOT =
  "output/validation/public-standards-profiles" as const;

export const CUSTOMER_PUBLIC_STANDARDS_REQUIREMENTS = [
  "F-17",
  "P-01",
  "P-02",
  "P-03"
] as const;

export const CUSTOMER_PUBLIC_STANDARDS_SELECTED_SOURCE_IDS = [
  "S4A-ITU-P618",
  "S4A-ITU-P837",
  "S4A-ITU-P838",
  "S4A-ITU-P676",
  "S4A-ITU-P839",
  "S4A-ITU-P840",
  "S4A-ITU-S465",
  "S4A-ITU-S580",
  "S4A-ITU-S1528"
] as const;

export type ItriPublicStandardsRequirementId =
  (typeof CUSTOMER_PUBLIC_STANDARDS_REQUIREMENTS)[number];
export type ItriPublicStandardsSelectedSourceId =
  (typeof CUSTOMER_PUBLIC_STANDARDS_SELECTED_SOURCE_IDS)[number];

export type ItriPublicStandardsProfileReviewerState =
  | "bounded-public-profile-ready"
  | "incomplete"
  | "rejected";

export type ItriPublicStandardsProfilePackageReviewState =
  | "missing"
  | ItriPublicStandardsProfileReviewerState;

export type ItriPublicStandardsProfileReviewGapSeverity =
  | "blocking"
  | "warning";

export interface ItriPublicStandardsProfileReviewGap {
  code: string;
  message: string;
  severity: ItriPublicStandardsProfileReviewGapSeverity;
  path?: string;
  requirementId?: ItriPublicStandardsRequirementId;
}

export interface ItriPublicStandardsRetainedPathCheck {
  declaredRefs: ReadonlyArray<string>;
  resolvedRefs: ReadonlyArray<string>;
  unresolvedRefs: ReadonlyArray<string>;
  escapedRefs: ReadonlyArray<string>;
}

export interface ItriPublicStandardsRequirementReview {
  requirementId: ItriPublicStandardsRequirementId;
  reviewerState: ItriPublicStandardsProfileReviewerState;
  evidenceScope: string;
  selectedSourceIds: ReadonlyArray<ItriPublicStandardsSelectedSourceId>;
  reviewer: {
    nameOrRole: string;
    reviewedAt: string;
    notes: ReadonlyArray<string>;
  };
  gaps: ReadonlyArray<ItriPublicStandardsProfileReviewGap>;
}

export interface ItriPublicStandardsLineageReview {
  classificationDoc: string | null;
  classificationDate: string | null;
  selectedSourceIds: ReadonlyArray<ItriPublicStandardsSelectedSourceId>;
  missingSourceLineageIds: ReadonlyArray<ItriPublicStandardsSelectedSourceId>;
  missingAccessDateIds: ReadonlyArray<ItriPublicStandardsSelectedSourceId>;
  missingVersionIds: ReadonlyArray<ItriPublicStandardsSelectedSourceId>;
  unofficialUrlIds: ReadonlyArray<string>;
}

export interface ItriPublicStandardsValidationReadinessReview {
  validationVectorsPresent: boolean;
  tolerancesPresent: boolean;
  notYetSuppliedValidationVectorsPresent: boolean;
  notYetSuppliedTolerancesPresent: boolean;
}

export interface ItriPublicStandardsAuthorityBoundaryReview {
  boundedPublicProfileOnly: boolean;
  authorityEscalationClaimed: boolean;
  retainedAuthorityMaterialAccepted: false;
  notes: ReadonlyArray<string>;
}

export interface ItriPublicStandardsSyntheticReview {
  syntheticSourceDetected: boolean;
  detectedPaths: ReadonlyArray<string>;
  rejectPublicProfileWhenSyntheticMaterialAppears: true | null;
}

export interface ItriPublicStandardsProfileNonClaims {
  itriVGroupAuthorityTruth: false;
  selectedStandardsImplyItriVGroupAcceptance: false;
  numericStandardsDerivedBehaviorImplemented: false;
  calibratedPhysicalAuthorityTruth: false;
  measuredTrafficTruth: false;
  externalValidationVerdict: false;
  dutNatTunnelVerdict: false;
  nativeRadioFrequencyHandoverVerdict: false;
  activeSatelliteGatewayOrPathTruth: false;
  currentBoundedProxyValuesAreStandardsDerived: false;
  syntheticFixtureTruth: false;
}

export interface ItriPublicStandardsProfileReview {
  schemaVersion: typeof CUSTOMER_PUBLIC_STANDARDS_PROFILE_REVIEW_SCHEMA_VERSION;
  reviewedAt: string;
  packagePath: string;
  profilePath: string;
  packageState: ItriPublicStandardsProfilePackageReviewState;
  profileSchemaVersion: string | null;
  profileId: string | null;
  sourceTier: string;
  acceptanceStatus: string | null;
  approximationLevel: string | null;
  coveredRequirements: ReadonlyArray<ItriPublicStandardsRequirementId>;
  selectedSourceIds: ReadonlyArray<ItriPublicStandardsSelectedSourceId>;
  requirementReviews: ReadonlyArray<ItriPublicStandardsRequirementReview>;
  gaps: ReadonlyArray<ItriPublicStandardsProfileReviewGap>;
  sourceLineage: ItriPublicStandardsLineageReview;
  validationReadiness: ItriPublicStandardsValidationReadinessReview;
  retainedPathSummary: ItriPublicStandardsRetainedPathCheck;
  authorityBoundary: ItriPublicStandardsAuthorityBoundaryReview;
  syntheticProvenance: ItriPublicStandardsSyntheticReview;
  nonClaims: ItriPublicStandardsProfileNonClaims;
}

export interface ItriPublicStandardsProfileReviewOptions {
  profile: unknown;
  packagePath: string;
  profilePath?: string;
  reviewedAt?: string;
  retainedPathCheck?: ItriPublicStandardsRetainedPathCheck;
}

export interface ItriPublicStandardsProfileClosedReviewOptions {
  packagePath: string;
  profilePath?: string;
  reviewedAt?: string;
}

export interface ItriPublicStandardsProfileMalformedReviewOptions
  extends ItriPublicStandardsProfileClosedReviewOptions {
  parseError: string;
}

type PlainRecord = Record<string, unknown>;

const S4A_METHOD_CONTEXT_SOURCE_IDS = [
  "S4A-ITU-PUB-ACCESS",
  "S4A-ITU-TERMS",
  "S4A-ITU-COPYRIGHT"
] as const;

const SOURCE_EXPECTATIONS: Record<
  ItriPublicStandardsSelectedSourceId,
  {
    url: string;
    versionId: string;
    accessDate: "2026-05-13";
    mappedRequirements: ReadonlyArray<ItriPublicStandardsRequirementId>;
  }
> = {
  "S4A-ITU-P618": {
    url: "https://www.itu.int/rec/R-REC-P.618-14-202308-I/en",
    versionId: "ITU-R P.618-14 (08/2023)",
    accessDate: "2026-05-13",
    mappedRequirements: ["F-17", "P-02", "P-03"]
  },
  "S4A-ITU-P837": {
    url: "https://www.itu.int/rec/R-REC-P.837-8-202509-I/en",
    versionId: "ITU-R P.837-8 (09/2025)",
    accessDate: "2026-05-13",
    mappedRequirements: ["P-02", "P-03"]
  },
  "S4A-ITU-P838": {
    url: "https://www.itu.int/rec/R-REC-P.838-3-200503-I/en",
    versionId: "ITU-R P.838-3 (03/2005)",
    accessDate: "2026-05-13",
    mappedRequirements: ["P-02", "P-03"]
  },
  "S4A-ITU-P676": {
    url: "https://www.itu.int/rec/R-REC-P.676-13-202208-I/en",
    versionId: "ITU-R P.676-13 (08/2022)",
    accessDate: "2026-05-13",
    mappedRequirements: ["F-17", "P-03"]
  },
  "S4A-ITU-P839": {
    url: "https://www.itu.int/rec/R-REC-P.839-4-201309-I/en",
    versionId: "ITU-R P.839-4 (09/2013)",
    accessDate: "2026-05-13",
    mappedRequirements: ["P-02", "P-03"]
  },
  "S4A-ITU-P840": {
    url: "https://www.itu.int/rec/R-REC-P.840-9-202308-I/en",
    versionId: "ITU-R P.840-9 (08/2023)",
    accessDate: "2026-05-13",
    mappedRequirements: ["F-17", "P-03"]
  },
  "S4A-ITU-S465": {
    url: "https://www.itu.int/rec/R-REC-S.465-6-201001-I/en",
    versionId: "ITU-R S.465-6 (01/2010)",
    accessDate: "2026-05-13",
    mappedRequirements: ["P-01", "P-03"]
  },
  "S4A-ITU-S580": {
    url: "https://www.itu.int/rec/R-REC-S.580-6-200401-I/en",
    versionId: "ITU-R S.580-6 (01/2004)",
    accessDate: "2026-05-13",
    mappedRequirements: ["P-01", "P-03"]
  },
  "S4A-ITU-S1528": {
    url: "https://www.itu.int/rec/R-REC-S.1528-0-200106-I/en",
    versionId: "ITU-R S.1528-0 (06/2001)",
    accessDate: "2026-05-13",
    mappedRequirements: ["P-01", "P-03"]
  }
};

const REQUIRED_NON_CLAIMS: ItriPublicStandardsProfileNonClaims = {
  itriVGroupAuthorityTruth: false,
  selectedStandardsImplyItriVGroupAcceptance: false,
  numericStandardsDerivedBehaviorImplemented: false,
  calibratedPhysicalAuthorityTruth: false,
  measuredTrafficTruth: false,
  externalValidationVerdict: false,
  dutNatTunnelVerdict: false,
  nativeRadioFrequencyHandoverVerdict: false,
  activeSatelliteGatewayOrPathTruth: false,
  currentBoundedProxyValuesAreStandardsDerived: false,
  syntheticFixtureTruth: false
};

const EMPTY_RETAINED_PATH_CHECK: ItriPublicStandardsRetainedPathCheck = {
  declaredRefs: [],
  resolvedRefs: [],
  unresolvedRefs: [],
  escapedRefs: []
};

const REQUIRED_ROOT_FIELDS = [
  "schemaVersion",
  "profileId",
  "profileDate",
  "coveredRequirements",
  "profileScope",
  "selectedRecommendations",
  "sourceLineage",
  "accessDates",
  "versionIds",
  "licenseUseNotes",
  "frequencyBands",
  "geography",
  "rainRateSource",
  "rainHeightSource",
  "pathGeometry",
  "elevationAngle",
  "polarization",
  "antennaClass",
  "pointingAssumptions",
  "outputUnits",
  "approximationLevel",
  "validationVectors",
  "tolerances",
  "reviewer",
  "acceptanceStatus",
  "nonClaims",
  "replacementRules"
] as const;

const MANDATORY_REPLACEMENT_TRIGGERS = [
  "itri-official-parameters-arrive",
  "itri-validation-vectors-arrive",
  "itri-tolerances-arrive",
  "itri-rejects-public-profile",
  "recommendation-version-superseded",
  "license-or-use-boundary-changes"
] as const;

const REJECT_GAP_CODES = [
  "package.path-outside-retained-root",
  "profile.path-outside-package",
  "source.unknown-selected",
  "source.method-context-promoted",
  "source.url-unofficial",
  "source.synthetic-material",
  "source.authority-selected",
  "source-tier.authority-without-retained-material",
  "authority.acceptance-without-retained-material",
  "authority.implementation-ready-without-retained-material",
  "reviewer.authority-role-without-retained-material",
  "retained-path.escapes-package",
  "retained-path.unresolved"
] as const;

function nonClaims(): ItriPublicStandardsProfileNonClaims {
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
  gaps: ItriPublicStandardsProfileReviewGap[],
  code: string,
  message: string,
  options: {
    severity?: ItriPublicStandardsProfileReviewGapSeverity;
    path?: string;
    requirementId?: ItriPublicStandardsRequirementId;
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

export function isAllowedItriPublicStandardsProfilePackagePath(
  packagePath: string
): boolean {
  const normalized = normalizePackagePath(packagePath);
  const root = CUSTOMER_PUBLIC_STANDARDS_PROFILE_PACKAGE_ROOT;

  return (
    normalized.startsWith(`${root}/`) &&
    !normalized.includes("/../") &&
    !normalized.startsWith("../") &&
    !normalized.startsWith("/")
  );
}

function defaultProfilePath(packagePath: string): string {
  return `${normalizePackagePath(packagePath)}/profile.json`;
}

function closedRequirementReview(
  requirementId: ItriPublicStandardsRequirementId,
  reviewedAt: string,
  message: string
): ItriPublicStandardsRequirementReview {
  return {
    requirementId,
    reviewerState: "incomplete",
    evidenceScope: "No bounded public standards profile was imported.",
    selectedSourceIds: [],
    reviewer: {
      nameOrRole: "S4R1 public standards profile reviewer",
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

function emptyLineageReview(): ItriPublicStandardsLineageReview {
  return {
    classificationDoc: null,
    classificationDate: null,
    selectedSourceIds: [],
    missingSourceLineageIds: [],
    missingAccessDateIds: [],
    missingVersionIds: [],
    unofficialUrlIds: []
  };
}

function closedReview(
  options: ItriPublicStandardsProfileClosedReviewOptions & {
    packageState: ItriPublicStandardsProfilePackageReviewState;
    gaps: ReadonlyArray<ItriPublicStandardsProfileReviewGap>;
    profileSchemaVersion?: string | null;
  }
): ItriPublicStandardsProfileReview {
  const reviewedAt = parseReviewTime(options.reviewedAt);
  const message =
    options.gaps[0]?.message ??
    "Public standards profile review did not reach bounded readiness.";

  return {
    schemaVersion: CUSTOMER_PUBLIC_STANDARDS_PROFILE_REVIEW_SCHEMA_VERSION,
    reviewedAt,
    packagePath: normalizePackagePath(options.packagePath),
    profilePath: options.profilePath ?? defaultProfilePath(options.packagePath),
    packageState: options.packageState,
    profileSchemaVersion: options.profileSchemaVersion ?? null,
    profileId: null,
    sourceTier: "tier-2-public-authority-candidate",
    acceptanceStatus: null,
    approximationLevel: null,
    coveredRequirements: [...CUSTOMER_PUBLIC_STANDARDS_REQUIREMENTS],
    selectedSourceIds: [],
    requirementReviews: CUSTOMER_PUBLIC_STANDARDS_REQUIREMENTS.map((requirementId) =>
      closedRequirementReview(requirementId, reviewedAt, message)
    ),
    gaps: options.gaps,
    sourceLineage: emptyLineageReview(),
    validationReadiness: {
      validationVectorsPresent: false,
      tolerancesPresent: false,
      notYetSuppliedValidationVectorsPresent: false,
      notYetSuppliedTolerancesPresent: false
    },
    retainedPathSummary: { ...EMPTY_RETAINED_PATH_CHECK },
    authorityBoundary: {
      boundedPublicProfileOnly: false,
      authorityEscalationClaimed: false,
      retainedAuthorityMaterialAccepted: false,
      notes: [
        "Closed review did not import a bounded public standards profile."
      ]
    },
    syntheticProvenance: {
      syntheticSourceDetected: false,
      detectedPaths: [],
      rejectPublicProfileWhenSyntheticMaterialAppears: null
    },
    nonClaims: nonClaims()
  };
}

export function reviewMissingItriPublicStandardsProfilePackage(
  options: ItriPublicStandardsProfileClosedReviewOptions
): ItriPublicStandardsProfileReview {
  const gaps: ItriPublicStandardsProfileReviewGap[] = [];
  addGap(
    gaps,
    "package.missing",
    "No retained public standards profile package exists at the explicitly named path.",
    { path: normalizePackagePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "missing",
    gaps
  });
}

export function reviewMissingItriPublicStandardsProfile(
  options: ItriPublicStandardsProfileClosedReviewOptions
): ItriPublicStandardsProfileReview {
  const gaps: ItriPublicStandardsProfileReviewGap[] = [];
  addGap(
    gaps,
    "profile.missing",
    "Package directory exists, but profile.json was not found at the explicitly named profile path.",
    { path: options.profilePath ?? defaultProfilePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "incomplete",
    gaps
  });
}

export function reviewMalformedItriPublicStandardsProfile(
  options: ItriPublicStandardsProfileMalformedReviewOptions
): ItriPublicStandardsProfileReview {
  const gaps: ItriPublicStandardsProfileReviewGap[] = [];
  addGap(gaps, "profile.malformed-json", options.parseError, {
    path: options.profilePath ?? defaultProfilePath(options.packagePath)
  });

  return closedReview({
    ...options,
    packageState: "incomplete",
    gaps
  });
}

export function reviewRejectedItriPublicStandardsProfilePackagePath(
  options: ItriPublicStandardsProfileClosedReviewOptions
): ItriPublicStandardsProfileReview {
  const gaps: ItriPublicStandardsProfileReviewGap[] = [];
  addGap(
    gaps,
    "package.path-outside-retained-root",
    `Public standards profile package path must be under ${CUSTOMER_PUBLIC_STANDARDS_PROFILE_PACKAGE_ROOT}/.`,
    { path: normalizePackagePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "rejected",
    gaps
  });
}

export function reviewRejectedItriPublicStandardsProfilePath(
  options: ItriPublicStandardsProfileClosedReviewOptions
): ItriPublicStandardsProfileReview {
  const gaps: ItriPublicStandardsProfileReviewGap[] = [];
  addGap(
    gaps,
    "profile.path-outside-package",
    "Explicit profile path must resolve inside the explicitly named public standards profile package directory.",
    { path: options.profilePath ?? defaultProfilePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "rejected",
    gaps
  });
}

function addRequiredRootFieldGaps(
  profile: PlainRecord,
  gaps: ItriPublicStandardsProfileReviewGap[]
): void {
  for (const field of REQUIRED_ROOT_FIELDS) {
    if (!hasOwn(profile, field)) {
      addGap(gaps, "profile.required-field-missing", `Profile is missing required field ${field}.`, {
        path: field
      });
    }
  }
}

function reviewSchemaVersion(
  profile: PlainRecord,
  gaps: ItriPublicStandardsProfileReviewGap[]
): string | null {
  const schemaVersion = stringValue(profile, "schemaVersion");

  if (schemaVersion !== CUSTOMER_PUBLIC_STANDARDS_PROFILE_SCHEMA_VERSION) {
    addGap(
      gaps,
      "profile.schema-version",
      `Profile schemaVersion must be ${CUSTOMER_PUBLIC_STANDARDS_PROFILE_SCHEMA_VERSION}.`,
      { path: "schemaVersion" }
    );
  }

  return schemaVersion;
}

function reviewPackagePath(
  packagePath: string,
  gaps: ItriPublicStandardsProfileReviewGap[]
): void {
  const normalizedPackagePath = normalizePackagePath(packagePath);

  if (!isAllowedItriPublicStandardsProfilePackagePath(normalizedPackagePath)) {
    addGap(
      gaps,
      "package.path-outside-retained-root",
      `Package path must be explicitly under ${CUSTOMER_PUBLIC_STANDARDS_PROFILE_PACKAGE_ROOT}/.`,
      { path: "packagePath" }
    );
  }
}

function requirementFromUnknown(value: unknown): ItriPublicStandardsRequirementId | null {
  return typeof value === "string" &&
    (CUSTOMER_PUBLIC_STANDARDS_REQUIREMENTS as ReadonlyArray<string>).includes(value)
    ? (value as ItriPublicStandardsRequirementId)
    : null;
}

function selectedSourceIdFromUnknown(
  value: unknown
): ItriPublicStandardsSelectedSourceId | null {
  return typeof value === "string" &&
    (CUSTOMER_PUBLIC_STANDARDS_SELECTED_SOURCE_IDS as ReadonlyArray<string>).includes(value)
    ? (value as ItriPublicStandardsSelectedSourceId)
    : null;
}

function reviewCoveredRequirements(
  profile: PlainRecord,
  gaps: ItriPublicStandardsProfileReviewGap[]
): ReadonlyArray<ItriPublicStandardsRequirementId> {
  const covered = arrayValue(profile.coveredRequirements)
    .map(requirementFromUnknown)
    .filter((requirement): requirement is ItriPublicStandardsRequirementId =>
      Boolean(requirement)
    );

  if (covered.length === 0) {
    addGap(
      gaps,
      "requirements.covered-missing",
      "coveredRequirements must contain at least one of F-17, P-01, P-02, or P-03.",
      { path: "coveredRequirements" }
    );
  }

  if (arrayValue(profile.coveredRequirements).length !== covered.length) {
    addGap(
      gaps,
      "requirements.covered-invalid",
      "coveredRequirements may contain only F-17, P-01, P-02, and P-03.",
      { path: "coveredRequirements" }
    );
  }

  return [...new Set(covered)];
}

function reviewSourceTier(
  profile: PlainRecord,
  gaps: ItriPublicStandardsProfileReviewGap[]
): string {
  const sourceTier = stringValue(profile, "sourceTier") ??
    "tier-2-public-authority-candidate";

  if (
    sourceTier !== "tier-2-public-authority-candidate" &&
    sourceTier !== "tier-1-itri-or-official-authority"
  ) {
    addGap(gaps, "source-tier.invalid", "sourceTier must use the S4-B tier vocabulary.", {
      path: "sourceTier"
    });
  }

  if (sourceTier === "tier-1-itri-or-official-authority") {
    addGap(
      gaps,
      "source-tier.authority-without-retained-material",
      "S4R1 cannot promote a public profile to tier-1 authority without retained authority material.",
      { path: "sourceTier" }
    );
  }

  return sourceTier;
}

function reviewSelectedRecommendations(
  profile: PlainRecord,
  coveredRequirements: ReadonlyArray<ItriPublicStandardsRequirementId>,
  gaps: ItriPublicStandardsProfileReviewGap[]
): ReadonlyArray<ItriPublicStandardsSelectedSourceId> {
  const recommendations = recordArray(profile.selectedRecommendations);
  const selectedSourceIds: ItriPublicStandardsSelectedSourceId[] = [];

  if (recommendations.length === 0) {
    addGap(
      gaps,
      "source.selected-missing",
      "selectedRecommendations must contain at least one S4-A public authority candidate.",
      { path: "selectedRecommendations" }
    );
  }

  arrayValue(profile.selectedRecommendations).forEach((entry, index) => {
    if (!isPlainRecord(entry)) {
      addGap(gaps, "source.selected-entry-invalid", "Each selectedRecommendations entry must be an object.", {
        path: `selectedRecommendations[${index}]`
      });
      return;
    }

    const sourceId = stringValue(entry, "sourceId");

    if (!sourceId) {
      addGap(gaps, "source.source-id-missing", "selectedRecommendations[].sourceId is required.", {
        path: `selectedRecommendations[${index}].sourceId`
      });
      return;
    }

    if ((S4A_METHOD_CONTEXT_SOURCE_IDS as ReadonlyArray<string>).includes(sourceId)) {
      addGap(
        gaps,
        "source.method-context-promoted",
        "S4-A method/context source IDs must not appear as selected physical recommendations.",
        { path: `selectedRecommendations[${index}].sourceId` }
      );
      return;
    }

    const selectedSourceId = selectedSourceIdFromUnknown(sourceId);

    if (!selectedSourceId) {
      addGap(
        gaps,
        "source.unknown-selected",
        "selectedRecommendations may use only S4-A public authority candidate IDs.",
        { path: `selectedRecommendations[${index}].sourceId` }
      );
      return;
    }

    selectedSourceIds.push(selectedSourceId);
    const expected = SOURCE_EXPECTATIONS[selectedSourceId];

    if (stringValue(entry, "url") !== expected.url) {
      addGap(
        gaps,
        "source.url-unofficial",
        "selectedRecommendations[].url must match the retained official ITU S4-A source URL.",
        { path: `selectedRecommendations[${index}].url` }
      );
    }

    if (stringValue(entry, "versionId") !== expected.versionId) {
      addGap(
        gaps,
        "source.version-mismatch",
        "selectedRecommendations[].versionId must match the retained S4-A recommendation version.",
        { path: `selectedRecommendations[${index}].versionId` }
      );
    }

    if (stringValue(entry, "accessDate") !== expected.accessDate) {
      addGap(
        gaps,
        "source.access-date-mismatch",
        "selectedRecommendations[].accessDate must match the retained S4-A access date.",
        { path: `selectedRecommendations[${index}].accessDate` }
      );
    }

    if (stringValue(entry, "status") === "authority-selected") {
      addGap(
        gaps,
        "source.authority-selected",
        "S4R1 accepts selected-for-bounded-profile/candidate status only; authority-selected requires retained authority review outside this bounded reviewer.",
        { path: `selectedRecommendations[${index}].status` }
      );
    }

    const mappedRequirements = arrayValue(entry.mappedRequirements)
      .map(requirementFromUnknown)
      .filter((requirement): requirement is ItriPublicStandardsRequirementId =>
        Boolean(requirement)
      );

    if (mappedRequirements.length === 0) {
      addGap(
        gaps,
        "source.mapped-requirements-missing",
        "selectedRecommendations[].mappedRequirements must name at least one covered S4 requirement.",
        { path: `selectedRecommendations[${index}].mappedRequirements` }
      );
    }

    if (arrayValue(entry.mappedRequirements).length !== mappedRequirements.length) {
      addGap(
        gaps,
        "source.mapped-requirements-invalid",
        "selectedRecommendations[].mappedRequirements may contain only F-17, P-01, P-02, and P-03.",
        { path: `selectedRecommendations[${index}].mappedRequirements` }
      );
    }

    for (const requirement of mappedRequirements) {
      if (!expected.mappedRequirements.includes(requirement)) {
        addGap(
          gaps,
          "source.mapped-requirement-outside-s4a-lineage",
          "selectedRecommendations[].mappedRequirements must stay within the retained S4-A requirement mapping.",
          {
            path: `selectedRecommendations[${index}].mappedRequirements`,
            requirementId: requirement
          }
        );
      }

      if (coveredRequirements.length > 0 && !coveredRequirements.includes(requirement)) {
        addGap(
          gaps,
          "source.mapped-requirement-not-covered",
          "A selected recommendation maps to a requirement not listed in coveredRequirements.",
          {
            severity: "warning",
            path: `selectedRecommendations[${index}].mappedRequirements`,
            requirementId: requirement
          }
        );
      }
    }
  });

  return [...new Set(selectedSourceIds)];
}

function reviewSourceLineage(
  profile: PlainRecord,
  selectedSourceIds: ReadonlyArray<ItriPublicStandardsSelectedSourceId>,
  gaps: ItriPublicStandardsProfileReviewGap[]
): ItriPublicStandardsLineageReview {
  const lineage = isPlainRecord(profile.sourceLineage) ? profile.sourceLineage : null;
  const accessDates = isPlainRecord(profile.accessDates) ? profile.accessDates : {};
  const versionIds = isPlainRecord(profile.versionIds) ? profile.versionIds : {};
  const lineageSourceIds = lineage ? stringArray(lineage.sourceIds) : [];
  const missingSourceLineageIds: ItriPublicStandardsSelectedSourceId[] = [];
  const missingAccessDateIds: ItriPublicStandardsSelectedSourceId[] = [];
  const missingVersionIds: ItriPublicStandardsSelectedSourceId[] = [];

  if (!lineage) {
    addGap(gaps, "source-lineage.missing", "sourceLineage must be an object.", {
      path: "sourceLineage"
    });
  } else {
    if (stringValue(lineage, "classificationDoc") !== "itri-public-standards-source-classification.md") {
      addGap(
        gaps,
        "source-lineage.classification-doc",
        "sourceLineage.classificationDoc must point to itri-public-standards-source-classification.md.",
        { path: "sourceLineage.classificationDoc" }
      );
    }

    if (stringValue(lineage, "classificationDate") !== "2026-05-13") {
      addGap(
        gaps,
        "source-lineage.classification-date",
        "sourceLineage.classificationDate must match the retained S4-A classification date.",
        { path: "sourceLineage.classificationDate" }
      );
    }
  }

  for (const sourceId of lineageSourceIds) {
    if ((S4A_METHOD_CONTEXT_SOURCE_IDS as ReadonlyArray<string>).includes(sourceId)) {
      addGap(
        gaps,
        "source-lineage.method-context-source-id",
        "S4-A method/context source IDs may appear only in licenseUseNotes or sourceLineage.notes, not sourceLineage.sourceIds.",
        { path: "sourceLineage.sourceIds" }
      );
      continue;
    }

    if (!selectedSourceIdFromUnknown(sourceId)) {
      addGap(
        gaps,
        "source-lineage.unknown-source-id",
        "sourceLineage.sourceIds may include only selected S4-A candidate IDs plus method/context IDs in notes.",
        { path: "sourceLineage.sourceIds" }
      );
    }
  }

  for (const sourceId of selectedSourceIds) {
    const expected = SOURCE_EXPECTATIONS[sourceId];

    if (!lineageSourceIds.includes(sourceId)) {
      missingSourceLineageIds.push(sourceId);
      addGap(
        gaps,
        "source-lineage.selected-id-missing",
        "sourceLineage.sourceIds must cover every selected recommendation sourceId.",
        { path: "sourceLineage.sourceIds" }
      );
    }

    if (accessDates[sourceId] !== expected.accessDate) {
      missingAccessDateIds.push(sourceId);
      addGap(
        gaps,
        "source-lineage.access-date-missing",
        "accessDates must cover every selected sourceId with the retained S4-A access date.",
        { path: `accessDates.${sourceId}` }
      );
    }

    if (versionIds[sourceId] !== expected.versionId) {
      missingVersionIds.push(sourceId);
      addGap(
        gaps,
        "source-lineage.version-id-missing",
        "versionIds must cover every selected sourceId with the retained S4-A version id.",
        { path: `versionIds.${sourceId}` }
      );
    }
  }

  return {
    classificationDoc: lineage ? stringValue(lineage, "classificationDoc") : null,
    classificationDate: lineage ? stringValue(lineage, "classificationDate") : null,
    selectedSourceIds: [...selectedSourceIds],
    missingSourceLineageIds,
    missingAccessDateIds,
    missingVersionIds,
    unofficialUrlIds: gaps
      .filter((gap) => gap.code === "source.url-unofficial")
      .map((gap) => gap.path ?? "selectedRecommendations")
  };
}

function reviewValidationReadiness(
  profile: PlainRecord,
  gaps: ItriPublicStandardsProfileReviewGap[]
): ItriPublicStandardsValidationReadinessReview {
  const validationVectors = recordArray(profile.validationVectors);
  const tolerances = recordArray(profile.tolerances);
  const validationVectorsPresent = validationVectors.length > 0;
  const tolerancesPresent = tolerances.length > 0;
  const notYetSuppliedValidationVectorsPresent = validationVectors.some(
    (entry) => stringValue(entry, "source") === "not-yet-supplied"
  );
  const notYetSuppliedTolerancesPresent = tolerances.some(
    (entry) => stringValue(entry, "source") === "not-yet-supplied"
  );

  if (!validationVectorsPresent) {
    addGap(
      gaps,
      "validation-vectors.missing",
      "validationVectors must be present; use a not-yet-supplied entry instead of inventing vectors.",
      { path: "validationVectors" }
    );
  }

  if (!tolerancesPresent) {
    addGap(
      gaps,
      "tolerances.missing",
      "tolerances must be present; use a not-yet-supplied entry instead of inventing tolerances.",
      { path: "tolerances" }
    );
  }

  if (validationVectorsPresent && !notYetSuppliedValidationVectorsPresent) {
    addGap(
      gaps,
      "validation-vectors.not-yet-supplied-missing",
      "S4R1 public readiness requires a not-yet-supplied validation-vector entry unless retained authority vectors are in scope.",
      { path: "validationVectors" }
    );
  }

  if (tolerancesPresent && !notYetSuppliedTolerancesPresent) {
    addGap(
      gaps,
      "tolerances.not-yet-supplied-missing",
      "S4R1 public readiness requires a not-yet-supplied tolerance entry unless retained authority tolerances are in scope.",
      { path: "tolerances" }
    );
  }

  return {
    validationVectorsPresent,
    tolerancesPresent,
    notYetSuppliedValidationVectorsPresent,
    notYetSuppliedTolerancesPresent
  };
}

function reviewReviewer(
  profile: PlainRecord,
  gaps: ItriPublicStandardsProfileReviewGap[]
): void {
  const reviewer = profile.reviewer;

  if (!isPlainRecord(reviewer)) {
    addGap(gaps, "reviewer.missing", "reviewer must be an object with role and notes.", {
      path: "reviewer"
    });
    return;
  }

  const role = stringValue(reviewer, "role");

  if (!["repo-maintainer", "unassigned", "itri-vgroup-owner", "external-authority-reviewer"].includes(role ?? "")) {
    addGap(gaps, "reviewer.role-invalid", "reviewer.role must use the S4-B reviewer role vocabulary.", {
      path: "reviewer.role"
    });
  }

  if (role === "itri-vgroup-owner" || role === "external-authority-reviewer") {
    addGap(
      gaps,
      "reviewer.authority-role-without-retained-material",
      "S4R1 public readiness cannot use authority reviewer roles without retained authority material.",
      { path: "reviewer.role" }
    );
  }

  if (!Array.isArray(reviewer.notes)) {
    addGap(gaps, "reviewer.notes-missing", "reviewer.notes must be an array, even when empty.", {
      path: "reviewer.notes"
    });
  }
}

function reviewAcceptanceAndApproximation(
  profile: PlainRecord,
  gaps: ItriPublicStandardsProfileReviewGap[]
): ItriPublicStandardsAuthorityBoundaryReview {
  const acceptanceStatus = stringValue(profile, "acceptanceStatus");
  const approximationLevel = stringValue(profile, "approximationLevel");
  const authorityEscalationClaimed =
    acceptanceStatus !== null && acceptanceStatus !== "bounded-public-profile-only" ||
    approximationLevel === "implementation-ready-after-authority-review";

  if (acceptanceStatus !== "bounded-public-profile-only") {
    addGap(
      gaps,
      "authority.acceptance-without-retained-material",
      "acceptanceStatus must remain bounded-public-profile-only for S4R1 public readiness.",
      { path: "acceptanceStatus" }
    );
  }

  if (
    approximationLevel !== "index-only" &&
    approximationLevel !== "parameter-profile" &&
    approximationLevel !== "reference-vector-ready" &&
    approximationLevel !== "implementation-ready-after-authority-review"
  ) {
    addGap(
      gaps,
      "approximation-level.invalid",
      "approximationLevel must use the S4-B approximation-level vocabulary.",
      { path: "approximationLevel" }
    );
  }

  if (approximationLevel === "implementation-ready-after-authority-review") {
    addGap(
      gaps,
      "authority.implementation-ready-without-retained-material",
      "implementation-ready-after-authority-review cannot be emitted without retained authority material.",
      { path: "approximationLevel" }
    );
  }

  return {
    boundedPublicProfileOnly: acceptanceStatus === "bounded-public-profile-only",
    authorityEscalationClaimed,
    retainedAuthorityMaterialAccepted: false,
    notes: [
      "S4R1 is bounded public profile review readiness only.",
      "No customer/V-group acceptance or standards-derived runtime implementation is accepted by this reviewer."
    ]
  };
}

function reviewNonClaims(
  profile: PlainRecord,
  gaps: ItriPublicStandardsProfileReviewGap[]
): void {
  const nonClaimsRecord = profile.nonClaims;

  if (!isPlainRecord(nonClaimsRecord)) {
    addGap(gaps, "nonclaims.missing", "nonClaims must be present and contain literal false values.", {
      path: "nonClaims"
    });
    return;
  }

  for (const [key, expectedValue] of Object.entries(REQUIRED_NON_CLAIMS)) {
    if (!hasOwn(nonClaimsRecord, key)) {
      addGap(gaps, "nonclaims.field-missing", `nonClaims.${key} is required.`, {
        path: `nonClaims.${key}`
      });
      continue;
    }

    if (nonClaimsRecord[key] !== expectedValue) {
      addGap(gaps, "nonclaims.field-must-be-false", `nonClaims.${key} must be literal false.`, {
        path: `nonClaims.${key}`
      });
    }
  }
}

function reviewReplacementRules(
  profile: PlainRecord,
  gaps: ItriPublicStandardsProfileReviewGap[]
): void {
  const rules = recordArray(profile.replacementRules);
  const triggers = rules
    .map((rule) => stringValue(rule, "trigger"))
    .filter((trigger): trigger is string => Boolean(trigger));

  if (rules.length === 0) {
    addGap(
      gaps,
      "replacement-rules.missing",
      "replacementRules must include the mandatory S4-B replacement triggers.",
      { path: "replacementRules" }
    );
  }

  for (const trigger of MANDATORY_REPLACEMENT_TRIGGERS) {
    if (!triggers.includes(trigger)) {
      addGap(
        gaps,
        "replacement-rules.trigger-missing",
        `replacementRules must include trigger ${trigger}.`,
        { path: "replacementRules" }
      );
    }
  }
}

function retainedPathKey(key: string): boolean {
  const lowerKey = key.toLowerCase();

  return lowerKey === "retainedpath" || lowerKey === "retainedpaths";
}

function addRetainedPathValue(refs: Set<string>, value: unknown): void {
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

function collectRetainedPathValues(
  value: unknown,
  refs: Set<string>
): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectRetainedPathValues(entry, refs);
    }
    return;
  }

  if (!isPlainRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (retainedPathKey(key)) {
      addRetainedPathValue(refs, child);
    }

    collectRetainedPathValues(child, refs);
  }
}

export function collectItriPublicStandardsProfileRetainedPaths(
  profile: unknown
): ReadonlyArray<string> {
  const refs = new Set<string>();
  collectRetainedPathValues(profile, refs);

  return [...refs].sort();
}

function reviewRetainedPaths(
  retainedPathCheck: ItriPublicStandardsRetainedPathCheck,
  gaps: ItriPublicStandardsProfileReviewGap[]
): void {
  if (retainedPathCheck.escapedRefs.length > 0) {
    addGap(
      gaps,
      "retained-path.escapes-package",
      "retainedPath-like fields must resolve inside the explicitly named package.",
      { path: "retainedPath" }
    );
  }

  if (retainedPathCheck.unresolvedRefs.length > 0) {
    addGap(
      gaps,
      "retained-path.unresolved",
      "retainedPath-like fields must resolve to files inside the explicitly named package.",
      { path: "retainedPath" }
    );
  }
}

function collectSyntheticPaths(
  value: unknown,
  paths: string[],
  pathName = ""
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectSyntheticPaths(entry, paths, `${pathName}[${index}]`));
    return;
  }

  if (!isPlainRecord(value)) {
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

    if (key === "syntheticFixtureTruth" && child !== false) {
      paths.push(childPath);
    }

    collectSyntheticPaths(child, paths, childPath);
  }
}

function reviewSyntheticBoundary(
  profile: PlainRecord,
  gaps: ItriPublicStandardsProfileReviewGap[]
): ItriPublicStandardsSyntheticReview {
  const detectedPaths: string[] = [];
  collectSyntheticPaths(profile, detectedPaths);

  if (detectedPaths.length > 0) {
    addGap(
      gaps,
      "source.synthetic-material",
      "Tier-3 synthetic provenance, source material, or synthetic fixture truth cannot be promoted into a public standards profile.",
      { path: detectedPaths[0] }
    );
  }

  return {
    syntheticSourceDetected: detectedPaths.length > 0,
    detectedPaths: [...new Set(detectedPaths)].sort(),
    rejectPublicProfileWhenSyntheticMaterialAppears:
      detectedPaths.length > 0 ? true : null
  };
}

function hasBlockingGaps(
  gaps: ReadonlyArray<ItriPublicStandardsProfileReviewGap>
): boolean {
  return gaps.some((gap) => gap.severity === "blocking");
}

function hasRejectGap(gaps: ReadonlyArray<ItriPublicStandardsProfileReviewGap>): boolean {
  return gaps.some((gap) =>
    (REJECT_GAP_CODES as ReadonlyArray<string>).includes(gap.code)
  );
}

function packageStateFromGaps(options: {
  gaps: ReadonlyArray<ItriPublicStandardsProfileReviewGap>;
  syntheticSourceDetected: boolean;
  retainedPathCheck: ItriPublicStandardsRetainedPathCheck;
}): ItriPublicStandardsProfilePackageReviewState {
  const { gaps, syntheticSourceDetected, retainedPathCheck } = options;

  if (
    syntheticSourceDetected ||
    retainedPathCheck.escapedRefs.length > 0 ||
    hasRejectGap(gaps)
  ) {
    return "rejected";
  }

  if (hasBlockingGaps(gaps)) {
    return "incomplete";
  }

  return "bounded-public-profile-ready";
}

function requirementSelectedSources(
  profile: PlainRecord,
  requirementId: ItriPublicStandardsRequirementId
): ReadonlyArray<ItriPublicStandardsSelectedSourceId> {
  const selected: ItriPublicStandardsSelectedSourceId[] = [];

  for (const recommendation of recordArray(profile.selectedRecommendations)) {
    const sourceId = selectedSourceIdFromUnknown(stringValue(recommendation, "sourceId"));
    const mappedRequirements = arrayValue(recommendation.mappedRequirements)
      .map(requirementFromUnknown)
      .filter((requirement): requirement is ItriPublicStandardsRequirementId =>
        Boolean(requirement)
      );

    if (sourceId && mappedRequirements.includes(requirementId)) {
      selected.push(sourceId);
    }
  }

  return [...new Set(selected)];
}

function buildRequirementReview(options: {
  profile: PlainRecord;
  requirementId: ItriPublicStandardsRequirementId;
  packageState: ItriPublicStandardsProfilePackageReviewState;
  packageGaps: ReadonlyArray<ItriPublicStandardsProfileReviewGap>;
  reviewedAt: string;
}): ItriPublicStandardsRequirementReview {
  const { profile, requirementId, packageState, packageGaps, reviewedAt } = options;
  const selectedSourceIds = requirementSelectedSources(profile, requirementId);
  const gaps = packageGaps.filter((gap) => gap.requirementId === requirementId);

  return {
    requirementId,
    reviewerState:
      packageState === "bounded-public-profile-ready"
        ? "bounded-public-profile-ready"
        : packageState === "rejected"
          ? "rejected"
          : "incomplete",
    evidenceScope:
      "Bounded public standards profile review readiness only; no authority truth or runtime implementation.",
    selectedSourceIds,
    reviewer: {
      nameOrRole: "S4R1 public standards profile reviewer",
      reviewedAt,
      notes: [
        "Requirement review is bounded to source-lineage, nonclaim, validation-readiness, and replacement-rule checks."
      ]
    },
    gaps
  };
}

export function reviewItriPublicStandardsProfile({
  profile,
  packagePath,
  profilePath = defaultProfilePath(packagePath),
  reviewedAt,
  retainedPathCheck
}: ItriPublicStandardsProfileReviewOptions): ItriPublicStandardsProfileReview {
  const resolvedReviewTime = parseReviewTime(reviewedAt);
  const normalizedPackagePath = normalizePackagePath(packagePath);
  const normalizedProfilePath = normalizePackagePath(profilePath);
  const retainedPathSummary =
    retainedPathCheck ??
    {
      declaredRefs: collectItriPublicStandardsProfileRetainedPaths(profile),
      resolvedRefs: [],
      unresolvedRefs: [],
      escapedRefs: []
    };

  if (!isPlainRecord(profile)) {
    const gaps: ItriPublicStandardsProfileReviewGap[] = [];
    addGap(gaps, "profile.not-object", "Profile JSON must be an object.", {
      path: normalizedProfilePath
    });

    return closedReview({
      packagePath: normalizedPackagePath,
      profilePath: normalizedProfilePath,
      reviewedAt: resolvedReviewTime,
      packageState: "incomplete",
      gaps
    });
  }

  const gaps: ItriPublicStandardsProfileReviewGap[] = [];
  addRequiredRootFieldGaps(profile, gaps);
  const profileSchemaVersion = reviewSchemaVersion(profile, gaps);
  reviewPackagePath(normalizedPackagePath, gaps);
  const coveredRequirements = reviewCoveredRequirements(profile, gaps);
  const sourceTier = reviewSourceTier(profile, gaps);
  const selectedSourceIds = reviewSelectedRecommendations(
    profile,
    coveredRequirements,
    gaps
  );
  const sourceLineage = reviewSourceLineage(profile, selectedSourceIds, gaps);
  const validationReadiness = reviewValidationReadiness(profile, gaps);
  reviewReviewer(profile, gaps);
  const authorityBoundary = reviewAcceptanceAndApproximation(profile, gaps);
  reviewNonClaims(profile, gaps);
  reviewReplacementRules(profile, gaps);
  reviewRetainedPaths(retainedPathSummary, gaps);
  const syntheticReview = reviewSyntheticBoundary(profile, gaps);
  const packageState = packageStateFromGaps({
    gaps,
    syntheticSourceDetected: syntheticReview.syntheticSourceDetected,
    retainedPathCheck: retainedPathSummary
  });
  const reviewRequirements =
    coveredRequirements.length > 0
      ? coveredRequirements
      : [...CUSTOMER_PUBLIC_STANDARDS_REQUIREMENTS];

  return {
    schemaVersion: CUSTOMER_PUBLIC_STANDARDS_PROFILE_REVIEW_SCHEMA_VERSION,
    reviewedAt: resolvedReviewTime,
    packagePath: normalizedPackagePath,
    profilePath: normalizedProfilePath,
    packageState,
    profileSchemaVersion,
    profileId: stringValue(profile, "profileId"),
    sourceTier,
    acceptanceStatus: stringValue(profile, "acceptanceStatus"),
    approximationLevel: stringValue(profile, "approximationLevel"),
    coveredRequirements: reviewRequirements,
    selectedSourceIds,
    requirementReviews: reviewRequirements.map((requirementId) =>
      buildRequirementReview({
        profile,
        requirementId,
        packageState,
        packageGaps: gaps,
        reviewedAt: resolvedReviewTime
      })
    ),
    gaps,
    sourceLineage,
    validationReadiness,
    retainedPathSummary: {
      declaredRefs: [...retainedPathSummary.declaredRefs],
      resolvedRefs: [...retainedPathSummary.resolvedRefs],
      unresolvedRefs: [...retainedPathSummary.unresolvedRefs],
      escapedRefs: [...retainedPathSummary.escapedRefs]
    },
    authorityBoundary,
    syntheticProvenance: syntheticReview,
    nonClaims: nonClaims()
  };
}
