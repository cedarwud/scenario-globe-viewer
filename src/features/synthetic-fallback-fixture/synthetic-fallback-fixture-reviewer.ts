export const CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_SCHEMA_VERSION =
  "itri.synthetic-fallback-fixture.v1" as const;
export const CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_REVIEW_SCHEMA_VERSION =
  "itri.s11r1.synthetic-fallback-fixture-review.v1" as const;
export const CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_PACKAGE_ROOT =
  "output/validation/synthetic-fallback-fixtures" as const;

export const CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_LANES = [
  "F-01",
  "F-07",
  "F-08",
  "F-09",
  "F-12",
  "F-17",
  "P-01",
  "P-02",
  "P-03",
  "V-02",
  "V-03",
  "V-04",
  "V-05",
  "V-06"
] as const;

export const CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_INTENDED_CONSUMERS = [
  "ui-preview",
  "schema-rehearsal",
  "parser-shape-test",
  "smoke-selector",
  "negative-gap-rehearsal",
  "demo-placeholder"
] as const;

export const CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_REQUIRED_FORBIDDEN_CONSUMERS = [
  "authority-verdict",
  "acceptance-report-closure",
  "measured-evidence-package",
  "external-validation-verdict",
  "physical-layer-verdict",
  "runtime-live-traffic-claim"
] as const;

export type ItriSyntheticFallbackFixtureLane =
  (typeof CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_LANES)[number];
export type ItriSyntheticFallbackFixtureConsumer =
  (typeof CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_INTENDED_CONSUMERS)[number];
export type ItriSyntheticFallbackFixtureForbiddenConsumer =
  (typeof CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_REQUIRED_FORBIDDEN_CONSUMERS)[number];

export type ItriSyntheticFallbackFixtureReviewerState =
  | "bounded-synthetic-fixture-ready"
  | "incomplete"
  | "rejected";

export type ItriSyntheticFallbackFixturePackageReviewState =
  | "missing"
  | ItriSyntheticFallbackFixtureReviewerState;

export type ItriSyntheticFallbackFixtureReviewGapSeverity =
  | "blocking"
  | "warning";

export interface ItriSyntheticFallbackFixtureReviewGap {
  code: string;
  message: string;
  severity: ItriSyntheticFallbackFixtureReviewGapSeverity;
  path?: string;
  lane?: ItriSyntheticFallbackFixtureLane;
}

export interface ItriSyntheticFallbackFixtureRetainedRefCheck {
  declaredRefs: ReadonlyArray<string>;
  resolvedRefs: ReadonlyArray<string>;
  unresolvedRefs: ReadonlyArray<string>;
  escapedRefs: ReadonlyArray<string>;
  externalRefs: ReadonlyArray<string>;
}

export interface ItriSyntheticFallbackFixtureProvenanceReview {
  provenancePresent: boolean;
  kind: string | null;
  generator: string | null;
  seedPresent: boolean;
  inputAssumptionsCount: number;
  lineageNotesCount: number;
  reviewedByPresent: boolean;
}

export interface ItriSyntheticFallbackFixtureConsumerBoundaryReview {
  intendedConsumers: ReadonlyArray<ItriSyntheticFallbackFixtureConsumer>;
  rejectedIntendedConsumers: ReadonlyArray<string>;
  forbiddenConsumers: ReadonlyArray<string>;
  missingForbiddenConsumers: ReadonlyArray<ItriSyntheticFallbackFixtureForbiddenConsumer>;
}

export interface ItriSyntheticFallbackFixtureLaneReview {
  lane: ItriSyntheticFallbackFixtureLane;
  reviewerState: ItriSyntheticFallbackFixtureReviewerState;
  evidenceScope: string;
  reviewer: {
    nameOrRole: string;
    reviewedAt: string;
    notes: ReadonlyArray<string>;
  };
  gaps: ReadonlyArray<ItriSyntheticFallbackFixtureReviewGap>;
}

export interface ItriSyntheticFallbackFixtureNonClaims {
  externalValidationTruth: false;
  measuredTrafficTruth: false;
  physicalLayerTruth: false;
  itriOrbitModelIntegration: false;
  dutNatTunnelPassStatus: false;
  nativeRadioFrequencyHandover: false;
  fullItriAcceptance: false;
  activeSatelliteGatewayOrPathTruth: false;
  standardsBackedPhysicalTruth: false;
}

export interface ItriSyntheticFallbackFixtureReview {
  schemaVersion: typeof CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_REVIEW_SCHEMA_VERSION;
  reviewedAt: string;
  packagePath: string;
  manifestPath: string;
  packageState: ItriSyntheticFallbackFixturePackageReviewState;
  manifestSchemaVersion: string | null;
  fixtureId: string | null;
  category: string | null;
  generatedAt: string | null;
  sourceTier: string | null;
  coveredLanes: ReadonlyArray<ItriSyntheticFallbackFixtureLane>;
  laneReviews: ReadonlyArray<ItriSyntheticFallbackFixtureLaneReview>;
  intendedConsumers: ReadonlyArray<ItriSyntheticFallbackFixtureConsumer>;
  forbiddenConsumers: ReadonlyArray<string>;
  maximumClaim: string | null;
  knownGapsCount: number;
  replacementTriggerPresent: boolean;
  gaps: ReadonlyArray<ItriSyntheticFallbackFixtureReviewGap>;
  syntheticProvenance: ItriSyntheticFallbackFixtureProvenanceReview;
  consumerBoundary: ItriSyntheticFallbackFixtureConsumerBoundaryReview;
  retainedRefSummary: ItriSyntheticFallbackFixtureRetainedRefCheck;
  nonClaims: ItriSyntheticFallbackFixtureNonClaims;
}

export interface ItriSyntheticFallbackFixtureReviewOptions {
  manifest: unknown;
  packagePath: string;
  manifestPath?: string;
  reviewedAt?: string;
  retainedRefCheck?: ItriSyntheticFallbackFixtureRetainedRefCheck;
}

export interface ItriSyntheticFallbackFixtureClosedReviewOptions {
  packagePath: string;
  manifestPath?: string;
  reviewedAt?: string;
}

export interface ItriSyntheticFallbackFixtureMalformedReviewOptions
  extends ItriSyntheticFallbackFixtureClosedReviewOptions {
  parseError: string;
}

type PlainRecord = Record<string, unknown>;

const REQUIRED_ROOT_FIELDS = [
  "schemaVersion",
  "fixtureId",
  "lanes",
  "category",
  "generatedAt",
  "sourceTier",
  "syntheticProvenance",
  "intendedConsumers",
  "forbiddenConsumers",
  "maximumClaim",
  "knownGaps",
  "replacementTrigger",
  "nonClaims"
] as const;

const REQUIRED_PROVENANCE_FIELDS = [
  "kind",
  "generator",
  "seed",
  "inputAssumptions",
  "lineageNotes",
  "reviewedBy"
] as const;

const ALLOWED_PROVENANCE_KINDS = [
  "deterministic-generated",
  "hand-authored-shape",
  "simulation-placeholder"
] as const;

const REQUIRED_NON_CLAIMS: ItriSyntheticFallbackFixtureNonClaims = {
  externalValidationTruth: false,
  measuredTrafficTruth: false,
  physicalLayerTruth: false,
  itriOrbitModelIntegration: false,
  dutNatTunnelPassStatus: false,
  nativeRadioFrequencyHandover: false,
  fullItriAcceptance: false,
  activeSatelliteGatewayOrPathTruth: false,
  standardsBackedPhysicalTruth: false
};

const EMPTY_RETAINED_REF_CHECK: ItriSyntheticFallbackFixtureRetainedRefCheck = {
  declaredRefs: [],
  resolvedRefs: [],
  unresolvedRefs: [],
  escapedRefs: [],
  externalRefs: []
};

const REJECT_GAP_CODES = [
  "package.path-outside-retained-root",
  "manifest.path-outside-package",
  "source-tier.not-tier-3-synthetic",
  "intended-consumers.not-bounded",
  "retained-ref.escapes-package",
  "retained-ref.external-url"
] as const;

const RETAINED_REF_KEY_NAMES = new Set([
  "retainedpath",
  "retainedpaths",
  "artifactref",
  "artifactrefs",
  "sourceartifactref",
  "sourceartifactrefs",
  "rawref",
  "rawrefs"
]);

const SAFE_MAXIMUM_CLAIM_MARKERS = [
  "readiness",
  "parser",
  "schema",
  "smoke",
  "demo",
  "placeholder",
  "ui",
  "shape",
  "rehearsal"
] as const;

const STRONG_MAXIMUM_CLAIM_TERMS = [
  "authority",
  "acceptance",
  "accepted",
  "verdict",
  "pass",
  "closed",
  "closure",
  "truth",
  "measured",
  "measurement",
  "validated",
  "validation",
  "live",
  "integration",
  "integrated",
  "complete",
  "full"
] as const;

const ACTIONABLE_REPLACEMENT_MARKERS = [
  "retire",
  "replace",
  "quarantine",
  "supersede",
  "remove",
  "freeze",
  "reclassify",
  "downgrade",
  "arrive",
  "arrival",
  "approve",
  "owner",
  "retain",
  "supply"
] as const;

function nonClaims(): ItriSyntheticFallbackFixtureNonClaims {
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

function stringArray(value: unknown): ReadonlyArray<string> {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function addGap(
  gaps: ItriSyntheticFallbackFixtureReviewGap[],
  code: string,
  message: string,
  options: {
    severity?: ItriSyntheticFallbackFixtureReviewGapSeverity;
    path?: string;
    lane?: ItriSyntheticFallbackFixtureLane;
  } = {}
): void {
  gaps.push({
    code,
    message,
    severity: options.severity ?? "blocking",
    ...(options.path ? { path: options.path } : {}),
    ...(options.lane ? { lane: options.lane } : {})
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

export function isAllowedItriSyntheticFallbackFixturePackagePath(
  packagePath: string
): boolean {
  const normalized = normalizePackagePath(packagePath);
  const root = CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_PACKAGE_ROOT;

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

function emptyProvenanceReview(): ItriSyntheticFallbackFixtureProvenanceReview {
  return {
    provenancePresent: false,
    kind: null,
    generator: null,
    seedPresent: false,
    inputAssumptionsCount: 0,
    lineageNotesCount: 0,
    reviewedByPresent: false
  };
}

function emptyConsumerBoundary(): ItriSyntheticFallbackFixtureConsumerBoundaryReview {
  return {
    intendedConsumers: [],
    rejectedIntendedConsumers: [],
    forbiddenConsumers: [],
    missingForbiddenConsumers: [
      ...CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_REQUIRED_FORBIDDEN_CONSUMERS
    ]
  };
}

function closedLaneReviews(
  reviewedAt: string,
  reviewerState: ItriSyntheticFallbackFixtureReviewerState,
  message: string
): ReadonlyArray<ItriSyntheticFallbackFixtureLaneReview> {
  return CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_LANES.map((lane) => ({
    lane,
    reviewerState,
    evidenceScope:
      "S11 fixture-readiness review only; no higher-tier closure is inferred.",
    reviewer: {
      nameOrRole: "S11R1 synthetic fallback fixture reviewer",
      reviewedAt,
      notes: [message]
    },
    gaps: [
      {
        code: reviewerState === "rejected" ? "package.rejected" : "package.missing",
        message,
        severity: "blocking",
        lane
      }
    ]
  }));
}

function closedReview(
  options: ItriSyntheticFallbackFixtureClosedReviewOptions & {
    packageState: ItriSyntheticFallbackFixturePackageReviewState;
    gaps: ReadonlyArray<ItriSyntheticFallbackFixtureReviewGap>;
    manifestSchemaVersion?: string | null;
  }
): ItriSyntheticFallbackFixtureReview {
  const reviewedAt = parseReviewTime(options.reviewedAt);
  const message =
    options.gaps[0]?.message ??
    "Synthetic fallback fixture review did not reach bounded readiness.";
  const reviewerState: ItriSyntheticFallbackFixtureReviewerState =
    options.packageState === "rejected" ? "rejected" : "incomplete";

  return {
    schemaVersion: CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_REVIEW_SCHEMA_VERSION,
    reviewedAt,
    packagePath: normalizePackagePath(options.packagePath),
    manifestPath: normalizePackagePath(
      options.manifestPath ?? defaultManifestPath(options.packagePath)
    ),
    packageState: options.packageState,
    manifestSchemaVersion: options.manifestSchemaVersion ?? null,
    fixtureId: null,
    category: null,
    generatedAt: null,
    sourceTier: null,
    coveredLanes: [],
    laneReviews: closedLaneReviews(reviewedAt, reviewerState, message),
    intendedConsumers: [],
    forbiddenConsumers: [],
    maximumClaim: null,
    knownGapsCount: 0,
    replacementTriggerPresent: false,
    gaps: options.gaps,
    syntheticProvenance: emptyProvenanceReview(),
    consumerBoundary: emptyConsumerBoundary(),
    retainedRefSummary: { ...EMPTY_RETAINED_REF_CHECK },
    nonClaims: nonClaims()
  };
}

export function reviewMissingItriSyntheticFallbackFixturePackage(
  options: ItriSyntheticFallbackFixtureClosedReviewOptions
): ItriSyntheticFallbackFixtureReview {
  const gaps: ItriSyntheticFallbackFixtureReviewGap[] = [];
  addGap(
    gaps,
    "package.missing",
    "No synthetic fallback fixture package exists at the explicitly named path.",
    { path: normalizePackagePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "missing",
    gaps
  });
}

export function reviewMissingItriSyntheticFallbackFixtureManifest(
  options: ItriSyntheticFallbackFixtureClosedReviewOptions
): ItriSyntheticFallbackFixtureReview {
  const gaps: ItriSyntheticFallbackFixtureReviewGap[] = [];
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

export function reviewMalformedItriSyntheticFallbackFixtureManifest(
  options: ItriSyntheticFallbackFixtureMalformedReviewOptions
): ItriSyntheticFallbackFixtureReview {
  const gaps: ItriSyntheticFallbackFixtureReviewGap[] = [];
  addGap(gaps, "manifest.malformed-json", options.parseError, {
    path: options.manifestPath ?? defaultManifestPath(options.packagePath)
  });

  return closedReview({
    ...options,
    packageState: "incomplete",
    gaps
  });
}

export function reviewRejectedItriSyntheticFallbackFixturePackagePath(
  options: ItriSyntheticFallbackFixtureClosedReviewOptions
): ItriSyntheticFallbackFixtureReview {
  const gaps: ItriSyntheticFallbackFixtureReviewGap[] = [];
  addGap(
    gaps,
    "package.path-outside-retained-root",
    `Synthetic fallback fixture package path must be under ${CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_PACKAGE_ROOT}/.`,
    { path: normalizePackagePath(options.packagePath) }
  );

  return closedReview({
    ...options,
    packageState: "rejected",
    gaps
  });
}

export function reviewRejectedItriSyntheticFallbackFixtureManifestPath(
  options: ItriSyntheticFallbackFixtureClosedReviewOptions
): ItriSyntheticFallbackFixtureReview {
  const gaps: ItriSyntheticFallbackFixtureReviewGap[] = [];
  addGap(
    gaps,
    "manifest.path-outside-package",
    "Explicit manifest path must resolve inside the explicitly named synthetic fallback fixture package directory.",
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
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): void {
  for (const field of REQUIRED_ROOT_FIELDS) {
    if (!hasOwn(manifest, field)) {
      addGap(gaps, "manifest.required-field-missing", `Manifest is missing required field ${field}.`, {
        path: field
      });
    }
  }
}

function reviewRequiredMetadata(
  manifest: PlainRecord,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): void {
  for (const field of REQUIRED_ROOT_FIELDS) {
    if (field === "schemaVersion") {
      continue;
    }

    if (!hasMeaningfulValue(manifest[field])) {
      addGap(gaps, "metadata.required-field-missing", `Manifest metadata field ${field} is required.`, {
        path: field
      });
    }
  }
}

function reviewSchemaVersion(
  manifest: PlainRecord,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): string | null {
  const schemaVersion = stringValue(manifest, "schemaVersion");

  if (schemaVersion !== CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_SCHEMA_VERSION) {
    addGap(
      gaps,
      "manifest.schema-version",
      `Manifest schemaVersion must be ${CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_SCHEMA_VERSION}.`,
      { path: "schemaVersion" }
    );
  }

  return schemaVersion;
}

function reviewPackagePath(
  packagePath: string,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): void {
  const normalizedPackagePath = normalizePackagePath(packagePath);

  if (!isAllowedItriSyntheticFallbackFixturePackagePath(normalizedPackagePath)) {
    addGap(
      gaps,
      "package.path-outside-retained-root",
      `Package path must be explicitly under ${CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_PACKAGE_ROOT}/.`,
      { path: "packagePath" }
    );
  }
}

function laneFromUnknown(value: unknown): ItriSyntheticFallbackFixtureLane | null {
  return typeof value === "string" &&
    (CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_LANES as ReadonlyArray<string>).includes(value)
    ? (value as ItriSyntheticFallbackFixtureLane)
    : null;
}

function reviewLanes(
  manifest: PlainRecord,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): ReadonlyArray<ItriSyntheticFallbackFixtureLane> {
  const lanes = manifest.lanes;

  if (!Array.isArray(lanes) || lanes.length === 0) {
    addGap(gaps, "lanes.missing", "lanes must be a non-empty array.", {
      path: "lanes"
    });
    return [];
  }

  const validLanes: ItriSyntheticFallbackFixtureLane[] = [];

  lanes.forEach((entry, index) => {
    const lane = laneFromUnknown(entry);

    if (!lane) {
      addGap(gaps, "lanes.invalid", "lanes may contain only approved S11 lane IDs.", {
        path: `lanes[${index}]`
      });
      return;
    }

    validLanes.push(lane);
  });

  return [...new Set(validLanes)];
}

function reviewGeneratedAt(
  manifest: PlainRecord,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): string | null {
  const generatedAt = stringValue(manifest, "generatedAt");

  if (!generatedAt || !Number.isFinite(Date.parse(generatedAt))) {
    addGap(gaps, "generated-at.invalid", "generatedAt must be an ISO-8601 timestamp.", {
      path: "generatedAt"
    });
  }

  return generatedAt;
}

function reviewSourceTier(
  manifest: PlainRecord,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): string | null {
  const sourceTier = stringValue(manifest, "sourceTier");

  if (sourceTier !== "tier-3-synthetic") {
    addGap(
      gaps,
      "source-tier.not-tier-3-synthetic",
      "sourceTier must be exactly tier-3-synthetic for S11 fallback fixture readiness.",
      { path: "sourceTier" }
    );
  }

  return sourceTier;
}

function reviewSyntheticProvenance(
  manifest: PlainRecord,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): ItriSyntheticFallbackFixtureProvenanceReview {
  const provenance = manifest.syntheticProvenance;

  if (!isPlainRecord(provenance)) {
    addGap(
      gaps,
      "synthetic-provenance.missing",
      "syntheticProvenance must be an object with the required S11 review shape.",
      { path: "syntheticProvenance" }
    );
    return emptyProvenanceReview();
  }

  for (const field of REQUIRED_PROVENANCE_FIELDS) {
    if (!hasOwn(provenance, field)) {
      addGap(
        gaps,
        "synthetic-provenance.field-missing",
        `syntheticProvenance.${field} is required.`,
        { path: `syntheticProvenance.${field}` }
      );
    }
  }

  const kind = stringValue(provenance, "kind");
  if (
    !kind ||
    !(ALLOWED_PROVENANCE_KINDS as ReadonlyArray<string>).includes(kind)
  ) {
    addGap(
      gaps,
      "synthetic-provenance.kind-invalid",
      "syntheticProvenance.kind must use the S11 fixture provenance vocabulary.",
      { path: "syntheticProvenance.kind" }
    );
  }

  const generator = stringValue(provenance, "generator");
  if (!generator) {
    addGap(
      gaps,
      "synthetic-provenance.generator-missing",
      "syntheticProvenance.generator must name the local generation method.",
      { path: "syntheticProvenance.generator" }
    );
  }

  if (!hasOwn(provenance, "seed")) {
    addGap(
      gaps,
      "synthetic-provenance.seed-missing",
      "syntheticProvenance.seed must be present, with null allowed only for hand-authored shape fixtures.",
      { path: "syntheticProvenance.seed" }
    );
  } else if (
    provenance.seed !== null &&
    (typeof provenance.seed !== "string" || provenance.seed.trim().length === 0)
  ) {
    addGap(
      gaps,
      "synthetic-provenance.seed-invalid",
      "syntheticProvenance.seed must be a non-empty string or null.",
      { path: "syntheticProvenance.seed" }
    );
  }

  const inputAssumptions = stringArray(provenance.inputAssumptions).filter(
    (entry) => entry.trim().length > 0
  );
  if (inputAssumptions.length === 0) {
    addGap(
      gaps,
      "synthetic-provenance.input-assumptions-missing",
      "syntheticProvenance.inputAssumptions must be a non-empty string array.",
      { path: "syntheticProvenance.inputAssumptions" }
    );
  }

  const lineageNotes = stringArray(provenance.lineageNotes).filter(
    (entry) => entry.trim().length > 0
  );
  if (lineageNotes.length === 0) {
    addGap(
      gaps,
      "synthetic-provenance.lineage-notes-missing",
      "syntheticProvenance.lineageNotes must be a non-empty string array.",
      { path: "syntheticProvenance.lineageNotes" }
    );
  }

  const reviewedByPresent =
    hasOwn(provenance, "reviewedBy") &&
    (provenance.reviewedBy === null ||
      (typeof provenance.reviewedBy === "string" &&
        provenance.reviewedBy.trim().length > 0));

  if (!reviewedByPresent) {
    addGap(
      gaps,
      "synthetic-provenance.reviewed-by-missing",
      "syntheticProvenance.reviewedBy must be present as a role/name or null.",
      { path: "syntheticProvenance.reviewedBy" }
    );
  }

  return {
    provenancePresent: true,
    kind,
    generator,
    seedPresent: hasOwn(provenance, "seed"),
    inputAssumptionsCount: inputAssumptions.length,
    lineageNotesCount: lineageNotes.length,
    reviewedByPresent
  };
}

function intendedConsumerFromUnknown(
  value: unknown
): ItriSyntheticFallbackFixtureConsumer | null {
  return typeof value === "string" &&
    (CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_INTENDED_CONSUMERS as ReadonlyArray<string>).includes(value)
    ? (value as ItriSyntheticFallbackFixtureConsumer)
    : null;
}

function reviewConsumers(
  manifest: PlainRecord,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): ItriSyntheticFallbackFixtureConsumerBoundaryReview {
  const intended = manifest.intendedConsumers;
  const forbidden = manifest.forbiddenConsumers;
  const acceptedIntended: ItriSyntheticFallbackFixtureConsumer[] = [];
  const rejectedIntended: string[] = [];

  if (!Array.isArray(intended) || intended.length === 0) {
    addGap(
      gaps,
      "intended-consumers.missing",
      "intendedConsumers must list bounded readiness consumers.",
      { path: "intendedConsumers" }
    );
  } else {
    intended.forEach((entry, index) => {
      const consumer = intendedConsumerFromUnknown(entry);

      if (!consumer) {
        rejectedIntended.push(String(entry));
        addGap(
          gaps,
          "intended-consumers.not-bounded",
          "intendedConsumers may contain only the S11 bounded readiness consumer set.",
          { path: `intendedConsumers[${index}]` }
        );
        return;
      }

      acceptedIntended.push(consumer);
    });
  }

  const forbiddenConsumers = stringArray(forbidden);
  const missingForbiddenConsumers: ItriSyntheticFallbackFixtureForbiddenConsumer[] = [];

  if (!Array.isArray(forbidden)) {
    addGap(
      gaps,
      "forbidden-consumers.missing",
      "forbiddenConsumers must list all required blocker consumers.",
      { path: "forbiddenConsumers" }
    );
  }

  for (const consumer of CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_REQUIRED_FORBIDDEN_CONSUMERS) {
    if (!forbiddenConsumers.includes(consumer)) {
      missingForbiddenConsumers.push(consumer);
      addGap(
        gaps,
        "forbidden-consumers.required-missing",
        `forbiddenConsumers must include ${consumer}.`,
        { path: "forbiddenConsumers" }
      );
    }
  }

  return {
    intendedConsumers: [...new Set(acceptedIntended)],
    rejectedIntendedConsumers: [...new Set(rejectedIntended)].sort(),
    forbiddenConsumers,
    missingForbiddenConsumers
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWord(value: string, term: string): boolean {
  return new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(value);
}

function reviewMaximumClaim(
  manifest: PlainRecord,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): string | null {
  const maximumClaim = stringValue(manifest, "maximumClaim");

  if (!maximumClaim) {
    addGap(gaps, "maximum-claim.missing", "maximumClaim must be a non-empty string.", {
      path: "maximumClaim"
    });
    return null;
  }

  const hasSafeMarker = SAFE_MAXIMUM_CLAIM_MARKERS.some((marker) =>
    containsWord(maximumClaim, marker)
  );
  if (!hasSafeMarker) {
    addGap(
      gaps,
      "maximum-claim.not-bounded",
      "maximumClaim must stay within S11 readiness, parser, schema, smoke, demo, placeholder, or UI use.",
      { path: "maximumClaim" }
    );
  }

  for (const term of STRONG_MAXIMUM_CLAIM_TERMS) {
    if (containsWord(maximumClaim, term)) {
      addGap(
        gaps,
        "maximum-claim.too-strong",
        "maximumClaim contains claim language beyond S11 readiness and rehearsal use.",
        { path: "maximumClaim" }
      );
      break;
    }
  }

  return maximumClaim;
}

function reviewKnownGaps(
  manifest: PlainRecord,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): number {
  const knownGaps = stringArray(manifest.knownGaps).filter(
    (entry) => entry.trim().length > 0
  );

  if (knownGaps.length === 0) {
    addGap(gaps, "known-gaps.empty", "knownGaps must contain at least one explicit gap.", {
      path: "knownGaps"
    });
  }

  return knownGaps.length;
}

function reviewReplacementTrigger(
  manifest: PlainRecord,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): boolean {
  const replacementTrigger = stringValue(manifest, "replacementTrigger");

  if (!replacementTrigger) {
    addGap(
      gaps,
      "replacement-trigger.missing",
      "replacementTrigger must be present and actionable.",
      { path: "replacementTrigger" }
    );
    return false;
  }

  const actionable = ACTIONABLE_REPLACEMENT_MARKERS.some((marker) =>
    containsWord(replacementTrigger, marker)
  );

  if (!actionable) {
    addGap(
      gaps,
      "replacement-trigger.not-actionable",
      "replacementTrigger must name an actionable retirement, replacement, review, or owner-supplied event.",
      { path: "replacementTrigger" }
    );
  }

  return actionable;
}

function reviewNonClaims(
  manifest: PlainRecord,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): void {
  const nonClaimsRecord = manifest.nonClaims;

  if (!isPlainRecord(nonClaimsRecord)) {
    addGap(gaps, "nonclaims.missing", "nonClaims must be present with literal false values.", {
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

function retainedRefKey(key: string): boolean {
  return RETAINED_REF_KEY_NAMES.has(key.toLowerCase());
}

function collectStringLeaves(value: unknown, refs: Set<string>): void {
  if (typeof value === "string" && value.length > 0) {
    refs.add(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectStringLeaves(entry, refs);
    }
    return;
  }

  if (isPlainRecord(value)) {
    for (const child of Object.values(value)) {
      collectStringLeaves(child, refs);
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
      collectStringLeaves(child, refs);
    }

    collectRetainedRefValues(child, refs);
  }
}

export function collectItriSyntheticFallbackFixtureRetainedRefs(
  manifest: unknown
): ReadonlyArray<string> {
  const refs = new Set<string>();
  collectRetainedRefValues(manifest, refs);

  return [...refs].sort();
}

function reviewRetainedRefs(
  retainedRefCheck: ItriSyntheticFallbackFixtureRetainedRefCheck,
  gaps: ItriSyntheticFallbackFixtureReviewGap[]
): void {
  for (const ref of retainedRefCheck.escapedRefs) {
    addGap(
      gaps,
      "retained-ref.escapes-package",
      "Package-local retained refs must resolve inside the explicitly named package.",
      { path: ref }
    );
  }

  for (const ref of retainedRefCheck.externalRefs) {
    addGap(
      gaps,
      "retained-ref.external-url",
      "Package-local retained refs must not use external URLs.",
      { path: ref }
    );
  }

  for (const ref of retainedRefCheck.unresolvedRefs) {
    addGap(
      gaps,
      "retained-ref.unresolved",
      "Package-local retained refs must resolve to files inside the explicitly named package.",
      { path: ref }
    );
  }
}

function hasBlockingGaps(
  gaps: ReadonlyArray<ItriSyntheticFallbackFixtureReviewGap>
): boolean {
  return gaps.some((gap) => gap.severity === "blocking");
}

function hasRejectGap(gaps: ReadonlyArray<ItriSyntheticFallbackFixtureReviewGap>): boolean {
  return gaps.some((gap) =>
    (REJECT_GAP_CODES as ReadonlyArray<string>).includes(gap.code)
  );
}

function packageStateFromGaps(
  gaps: ReadonlyArray<ItriSyntheticFallbackFixtureReviewGap>
): ItriSyntheticFallbackFixturePackageReviewState {
  if (hasRejectGap(gaps)) {
    return "rejected";
  }

  if (hasBlockingGaps(gaps)) {
    return "incomplete";
  }

  return "bounded-synthetic-fixture-ready";
}

function buildLaneReview(options: {
  lane: ItriSyntheticFallbackFixtureLane;
  packageState: ItriSyntheticFallbackFixturePackageReviewState;
  packageGaps: ReadonlyArray<ItriSyntheticFallbackFixtureReviewGap>;
  reviewedAt: string;
}): ItriSyntheticFallbackFixtureLaneReview {
  const { lane, packageState, packageGaps, reviewedAt } = options;
  const reviewerState: ItriSyntheticFallbackFixtureReviewerState =
    packageState === "bounded-synthetic-fixture-ready"
      ? "bounded-synthetic-fixture-ready"
      : packageState === "rejected"
        ? "rejected"
        : "incomplete";
  const laneGaps = packageGaps.filter((gap) => !gap.lane || gap.lane === lane);

  return {
    lane,
    reviewerState,
    evidenceScope:
      "S11 fixture-readiness review only; retained refs and consumers remain package-bounded.",
    reviewer: {
      nameOrRole: "S11R1 synthetic fallback fixture reviewer",
      reviewedAt,
      notes: [
        "Review is bounded to fixture metadata, provenance, consumers, nonclaims, replacement trigger, and package-local retained refs."
      ]
    },
    gaps: laneGaps
  };
}

export function reviewItriSyntheticFallbackFixtureManifest({
  manifest,
  packagePath,
  manifestPath = defaultManifestPath(packagePath),
  reviewedAt,
  retainedRefCheck
}: ItriSyntheticFallbackFixtureReviewOptions): ItriSyntheticFallbackFixtureReview {
  const resolvedReviewTime = parseReviewTime(reviewedAt);
  const normalizedPackagePath = normalizePackagePath(packagePath);
  const normalizedManifestPath = normalizePackagePath(manifestPath);
  const retainedRefSummary =
    retainedRefCheck ??
    {
      declaredRefs: collectItriSyntheticFallbackFixtureRetainedRefs(manifest),
      resolvedRefs: [],
      unresolvedRefs: [],
      escapedRefs: [],
      externalRefs: []
    };

  if (!isPlainRecord(manifest)) {
    const gaps: ItriSyntheticFallbackFixtureReviewGap[] = [];
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

  const gaps: ItriSyntheticFallbackFixtureReviewGap[] = [];
  addRequiredRootFieldGaps(manifest, gaps);
  reviewRequiredMetadata(manifest, gaps);
  const manifestSchemaVersion = reviewSchemaVersion(manifest, gaps);
  reviewPackagePath(normalizedPackagePath, gaps);
  const coveredLanes = reviewLanes(manifest, gaps);
  const generatedAt = reviewGeneratedAt(manifest, gaps);
  const sourceTier = reviewSourceTier(manifest, gaps);
  const syntheticProvenance = reviewSyntheticProvenance(manifest, gaps);
  const consumerBoundary = reviewConsumers(manifest, gaps);
  const maximumClaim = reviewMaximumClaim(manifest, gaps);
  const knownGapsCount = reviewKnownGaps(manifest, gaps);
  const replacementTriggerPresent = reviewReplacementTrigger(manifest, gaps);
  reviewNonClaims(manifest, gaps);
  reviewRetainedRefs(retainedRefSummary, gaps);
  const packageState = packageStateFromGaps(gaps);

  return {
    schemaVersion: CUSTOMER_SYNTHETIC_FALLBACK_FIXTURE_REVIEW_SCHEMA_VERSION,
    reviewedAt: resolvedReviewTime,
    packagePath: normalizedPackagePath,
    manifestPath: normalizedManifestPath,
    packageState,
    manifestSchemaVersion,
    fixtureId: stringValue(manifest, "fixtureId"),
    category: stringValue(manifest, "category"),
    generatedAt,
    sourceTier,
    coveredLanes,
    laneReviews: coveredLanes.map((lane) =>
      buildLaneReview({
        lane,
        packageState,
        packageGaps: gaps,
        reviewedAt: resolvedReviewTime
      })
    ),
    intendedConsumers: consumerBoundary.intendedConsumers,
    forbiddenConsumers: consumerBoundary.forbiddenConsumers,
    maximumClaim,
    knownGapsCount,
    replacementTriggerPresent,
    gaps,
    syntheticProvenance,
    consumerBoundary,
    retainedRefSummary: {
      declaredRefs: [...retainedRefSummary.declaredRefs],
      resolvedRefs: [...retainedRefSummary.resolvedRefs],
      unresolvedRefs: [...retainedRefSummary.unresolvedRefs],
      escapedRefs: [...retainedRefSummary.escapedRefs],
      externalRefs: [...retainedRefSummary.externalRefs]
    },
    nonClaims: nonClaims()
  };
}
