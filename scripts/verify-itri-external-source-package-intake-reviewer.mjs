import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  reviewItriExternalSourcePackageIntakeFromPath
} from "./review-itri-external-source-package-intake.mjs";

const packageRelativePath =
  "output/validation/external-f03-f15/2026-05-14T00-00-00Z-s12r1-external-source-intake";

function sourceArtifactRef(id, purpose) {
  return { artifactId: id, refPurpose: purpose };
}

function makeArtifact(id, artifactKind, retainedPath) {
  return {
    artifactId: id,
    artifactKind,
    retainedPath,
    checksum: {
      algorithm: "sha256",
      value: `fake-${id}`
    },
    retentionClass: "repo-retainable",
    sourceRole: "owner"
  };
}

function baseManifest() {
  const refs = {
    ownerEvidence: "owner-evidence",
    ownerApproval: "owner-approval",
    catalogSource: "catalog-source",
    modeRealTime: "mode-real-time",
    modePrerecorded: "mode-prerecorded",
    modeSelection: "mode-selection",
    stalePolicy: "stale-policy",
    temporalArtifact: "temporal-artifact",
    licensePolicy: "license-policy",
    checksumManifest: "checksum-manifest",
    scenarioMapping: "scenario-mapping",
    scenarioRule: "scenario-rule",
    orbitCoverage: "orbit-coverage",
    satelliteCount: "satellite-count",
    countByOrbit: "count-by-orbit",
    parsedField: "parsed-field",
    reviewGate: "review-gate",
    reviewNote: "review-note",
    deriverInput: "derivation-input"
  };

  return {
    schemaVersion: "itri.f03-f15.external-source-package-intake.v1",
    packageIdentity: {
      packageId: "sgv-s12r1-temp",
      packageFamily: "itri-f03-f15-external-source-package",
      packageVersion: "1.0.0",
      coveredRequirements: ["F-03", "F-15"],
      receivedAt: "2026-05-14T00:00:00.000Z",
      declaredScope: "pilot",
      packageStatus: "owner-supplied-for-intake"
    },
    ownerIdentity: {
      sourceOwner: {
        organization: "Temp source owner",
        role: "owner",
        authorityScope: ["F-03", "F-15"]
      },
      packageOwner: {
        organization: "Temp package owner",
        role: "package-owner",
        authorityScope: ["F-03", "F-15"]
      },
      authorityOwner: {
        organization: "Temp authority owner",
        role: "authority-owner",
        authorityScope: ["F-03", "F-15"]
      },
      reviewContactRef: "contacts/reviewer.md",
      ownerEvidenceRefs: [sourceArtifactRef(refs.ownerEvidence, "owner-evidence")]
    },
    sourceAuthority: {
      sourceTier: "tier-1-itri-or-owner-authority",
      sourceAuthorityClassification: "source-owner-private-authority",
      authorityScope: ["F-03", "F-15"],
      authorityLimitations: ["No live runtime assertions."],
      ownerApprovalRequiredForAuthorityUse: true,
      ownerApprovalRefs: [sourceArtifactRef(refs.ownerApproval, "owner-approval")]
    },
    sourceLocator: {
      locatorType: "private-drop",
      networkAccessRequiredForIntakeReview: false,
      privateDrop: {
        ownerSystemRef: "owner-system://owner/itri-f03-f15/source-drop-2026-05-14",
        dropId: "s12r1-owner-drop-2026-05-14",
        receivedAt: "2026-05-14T00:00:00.000Z",
        offlineReviewMaterialRefs: [sourceArtifactRef(refs.ownerEvidence, "drop-material")],
        confidentialityNotes: []
      }
    },
    catalog: {
      catalogType: "private-tle",
      catalogName: "temp-catalog",
      catalogVersion: "1.0",
      catalogFormat: "json",
      sourceRecordIdentityPolicy: "satelliteId",
      sourceArtifactRefs: [sourceArtifactRef(refs.catalogSource, "catalog")],
      derivation: {
        derived: false,
        method: "none",
        inputArtifactRefs: [sourceArtifactRef(refs.deriverInput, "derivation")],
        reviewNotes: ["No derivation from owner catalog."]
      }
    },
    modeRules: {
      realTime: {
        supported: false,
        allowedUse: "owner-accepted",
        executionRequiredForIntakeReview: false,
        unavailableBehavior: "mark-incomplete",
        malformedDataBehavior: "owner-review-required",
        outsideEpochBehavior: "owner-review-required",
        sourceArtifactRefs: [sourceArtifactRef(refs.modeRealTime, "mode")]
      },
      prerecorded: {
        supported: true,
        allowedUse: "prerecorded-default",
        executionRequiredForIntakeReview: false,
        unavailableBehavior: "mark-incomplete",
        malformedDataBehavior: "owner-review-required",
        outsideEpochBehavior: "owner-review-required",
        sourceArtifactRefs: [sourceArtifactRef(refs.modePrerecorded, "mode")]
      },
      defaultMode: "prerecorded",
      modeSelectionArtifactRefs: [sourceArtifactRef(refs.modeSelection, "mode-selection")]
    },
    temporalRules: {
      epoch: {
        epochFormat: "ISO-8601",
        epochStart: "2026-05-14T00:00:00Z",
        epochEnd: null,
        epochSource: "owner-scenario"
      },
      timeSystem: {
        name: "UTC",
        leapSecondPolicy: "none",
        clockMappingRule: "none"
      },
      updateCadence: {
        cadenceKind: "periodic",
        nominalCadenceSeconds: 60,
        maximumGapSeconds: 600,
        cadenceSource: "owner-policy"
      },
      staleDataPolicy: {
        maximumAgeSeconds: 3600,
        staleBehavior: "owner-review-required",
        reviewStateWhenStale: "owner-review-required",
        policyArtifactRefs: [sourceArtifactRef(refs.stalePolicy, "stale-policy")]
      },
      temporalArtifactRefs: [sourceArtifactRef(refs.temporalArtifact, "temporal")]
    },
    licenseRedistributionPolicy: {
      licenseName: "MIT",
      licenseVersionOrRef: "MIT",
      redistributionAllowed: false,
      repoRetentionAllowed: true,
      derivedArtifactsAllowed: true,
      publicSummaryAllowed: false,
      policyArtifactRefs: [sourceArtifactRef(refs.licensePolicy, "license")],
      restrictions: []
    },
    checksumPolicy: {
      requiredAlgorithms: ["sha256"],
      allRetainedArtifactsRequireChecksum: true,
      checksumManifestRefs: [sourceArtifactRef(refs.checksumManifest, "checksum-manifest")]
    },
    retentionPolicy: {
      packageRoot: ".",
      retentionOwner: "temp-owner",
      retentionClass: "repo-retainable",
      artifactListRequired: true,
      pathBoundaryRule:
        "retainedPath must be package-relative, must not start with '/', and must not contain '..' path segments",
      redactionPolicy: {
        redactionLevel: "none",
        redactedCategories: [],
        auditability: "full"
      }
    },
    packageArtifacts: [
      makeArtifact(refs.ownerEvidence, "source-metadata", "artifacts/owner-evidence.json"),
      makeArtifact(refs.ownerApproval, "owner-approval", "artifacts/owner-approval.json"),
      makeArtifact(refs.catalogSource, "source-metadata", "artifacts/catalog-source.json"),
      makeArtifact(refs.deriverInput, "source-metadata", "artifacts/derivation-input.json"),
      makeArtifact(refs.modeRealTime, "parsed-field-review", "artifacts/mode-real-time.json"),
      makeArtifact(refs.modePrerecorded, "parsed-field-review", "artifacts/mode-prerecorded.json"),
      makeArtifact(refs.modeSelection, "other", "artifacts/mode-selection.json"),
      makeArtifact(refs.stalePolicy, "parsed-field-review", "artifacts/stale-policy.json"),
      makeArtifact(refs.temporalArtifact, "parsed-field-review", "artifacts/temporal-artifact.json"),
      makeArtifact(refs.licensePolicy, "license-or-redistribution-policy", "artifacts/license-policy.json"),
      makeArtifact(refs.checksumManifest, "checksum-manifest", "artifacts/checksum-manifest.json"),
      makeArtifact(refs.scenarioMapping, "scenario-mapping", "artifacts/scenario-mapping.json"),
      makeArtifact(refs.scenarioRule, "scenario-mapping", "artifacts/scenario-rule.json"),
      makeArtifact(refs.orbitCoverage, "scenario-mapping", "artifacts/orbit-coverage.json"),
      makeArtifact(refs.satelliteCount, "scenario-mapping", "artifacts/satellite-count.json"),
      makeArtifact(refs.countByOrbit, "scenario-mapping", "artifacts/count-by-orbit.json"),
      makeArtifact(refs.parsedField, "parsed-field-review", "artifacts/parsed-field.json"),
      makeArtifact(refs.reviewGate, "parsed-field-review", "artifacts/review-gate.json"),
      makeArtifact(refs.reviewNote, "parsed-field-review", "artifacts/review-note.json")
    ],
    scenarioMapping: {
      mappingId: "scenario-mapping-01",
      targetScenarioIds: ["S-01"],
      routeVisibleScenarioIds: ["S-01"],
      recordToScenarioRules: [
        {
          ruleId: "scenario-rule-01",
          sourceField: "satellite-id",
          targetField: "satelliteId",
          rule: "identity-preserve",
          sourceArtifactRefs: [sourceArtifactRef(refs.scenarioRule, "scenario-rule")]
        }
      ],
      modeMappingRules: [
        {
          ruleId: "mode-rule-01",
          sourceField: "mode",
          targetField: "effective-mode",
          rule: "mode-preserve",
          sourceArtifactRefs: [sourceArtifactRef(refs.scenarioRule, "mode-rule")]
        }
      ],
      sourceArtifactRefs: [sourceArtifactRef(refs.scenarioMapping, "scenario-mapping")]
    },
    orbitClassCoverage: [
      {
        orbitClass: "leo",
        coverageDeclared: true,
        coverageBasis: "catalog",
        classificationRule: "owner-reviewed",
        sourceArtifactRefs: [sourceArtifactRef(refs.orbitCoverage, "orbit")]
      }
    ],
    satelliteCountDeclarations: {
      totalDeclared: 1,
      countBasis: "raw-record-count",
      byOrbitClass: [
        {
          orbitClass: "leo",
          declaredCount: 1,
          sourceArtifactRefs: [sourceArtifactRef(refs.countByOrbit, "count")]
        }
      ],
      duplicateHandling: "satelliteId-wins",
      uniqueIdentityRule: "satellite-id",
      sourceArtifactRefs: [sourceArtifactRef(refs.satelliteCount, "satellite")]
    },
    parsedReviewedFields: [
      {
        fieldPath: "satelliteId",
        fieldPurpose: "validation",
        reviewedValueKind: "identity",
        reviewRule: "match-identity",
        sourceArtifactRefs: [sourceArtifactRef(refs.parsedField, "parsed")]
      }
    ],
    reviewGate: {
      reviewState: "structurally-reviewable",
      reviewer: "temp-s12r1-reviewer",
      reviewedAt: "2026-05-14T00:00:00.000Z",
      failureDisposition: "fail-closed",
      sourceArtifactRefs: [sourceArtifactRef(refs.reviewGate, "review-gate")],
      reviewNotes: [
        {
          noteId: "note-01",
          note: "temp",
          sourceArtifactRefs: [sourceArtifactRef(refs.reviewNote, "review-note")]
        }
      ]
    },
    nonClaims: {
      closesF01ItriOrbitModelIntegration: false,
      arbitraryExternalSourceAcceptance: false,
      liveRealTimeFeedExecution: false,
      measuredTrafficNetworkTruth: false,
      natTunnelDutValidation: false,
      nativeRfHandoverTruth: false,
      completeItriAcceptance: false,
      publicCelesTrakOrSpaceTrackSubstitutesForItriPrivateSourceAuthorityWithoutOwnerEvidence: false
    }
  };
}

async function withTempRepo(action) {
  const tempRepo = await mkdtemp(path.join(tmpdir(), "sgv-s12r1-test-"));

  try {
    return await action(tempRepo);
  } finally {
    await rm(tempRepo, { recursive: true, force: true });
  }
}

async function writeTextFile(root, relativePath, contents) {
  const absolute = path.join(root, relativePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, contents, "utf8");
}

function collectArtifactIdsFromManifest(manifest) {
  return manifest.packageArtifacts
    .map((artifact) => artifact && artifact.artifactId)
    .filter((artifactId) => typeof artifactId === "string" && artifactId.length > 0);
}

async function writePackageCandidate(tempRepo, manifest, options = {}) {
  const packageRoot = path.join(tempRepo, packageRelativePath);
  await mkdir(packageRoot, { recursive: true });

  if (!options.skipManifest) {
    await writeTextFile(
      packageRoot,
      "manifest.json",
      `${JSON.stringify(manifest, null, 2)}\n`
    );
  }

  if (options.writeArtifacts !== false) {
    for (const artifact of manifest.packageArtifacts) {
      if (artifact && typeof artifact.artifactId === "string") {
        const keepFile = options.invalidArtifactPath ? !artifact.retainedPath.includes("../") : true;
        if (artifact.retainedPath && keepFile) {
          const absolutePath = path.join(packageRoot, artifact.retainedPath);
          await mkdir(path.dirname(absolutePath), { recursive: true });
          await writeFile(absolutePath, `temp artifact ${artifact.artifactId}\n`, "utf8");
        }
      }
    }
  }

  return packageRoot;
}

function assertGap(review, gapCode) {
  const found =
    review.gaps.some((gap) => gap.code === gapCode) ||
    review.requirementReviews.some((entry) =>
      entry.gaps.some((gap) => gap.code === gapCode)
    );

  assert(found, `Expected gap ${gapCode}.`);
}

async function runReviewFromTemp(repoRoot) {
  return reviewItriExternalSourcePackageIntakeFromPath({
    packageInput: packageRelativePath,
    repoRoot
  });
}

function expectReady(review) {
  assert.equal(review.packageState, "ready-for-intake", "expected reviewer to be ready-for-intake");
  assert.equal(review.packagePath, packageRelativePath);
  assert.equal(review.gaps.length, 0);
}

function expectFail(review, expectedCode) {
  assert.equal(review.packageState === "ready-for-intake", false, "expected not-ready review");
  assert.equal(review.packageState, "incomplete");
  assertGap(review, expectedCode);
}

function withMutations(mutations) {
  const manifest = baseManifest();
  const cloned = JSON.parse(JSON.stringify(manifest));
  for (const mutate of mutations) {
    mutate(cloned);
  }
  return cloned;
}

function collectAllRefs(manifest) {
  const ids = collectArtifactIdsFromManifest(manifest);
  const set = new Set(ids);
  return set;
}

async function writeMalformedManifest(tempRepo) {
  const packageRoot = path.join(tempRepo, packageRelativePath);
  await mkdir(packageRoot, { recursive: true });
  await writeTextFile(packageRoot, "manifest.json", "{ bad json");
}

async function main() {
  await withTempRepo(async (tempRepo) => {
    // Missing package path
    const missingPathReview = await reviewItriExternalSourcePackageIntakeFromPath({
      packageInput: "",
      repoRoot: tempRepo
    });
    assert.equal(missingPathReview.packageState, "missing");
    assertGap(missingPathReview, "package.path-missing");

    // Package path outside retained root
    const outsideReview = await reviewItriExternalSourcePackageIntakeFromPath({
      packageInput: "output/validation/other/outside-root",
      repoRoot: tempRepo
    });
    assert.equal(outsideReview.packageState, "rejected");
    assertGap(outsideReview, "package.path-outside-retained-root");

    // Missing manifest path
    const missingPathBase = packageRelativePath;
    await withTempRepo(async (tempRepoForMissingManifest) => {
      await mkdir(path.join(tempRepoForMissingManifest, missingPathBase), { recursive: true });
      const review = await reviewItriExternalSourcePackageIntakeFromPath({
        packageInput: missingPathBase,
        repoRoot: tempRepoForMissingManifest
      });
      assert.equal(review.packageState, "incomplete");
      assertGap(review, "manifest.missing");
    });

    // Malformed JSON
    await withTempRepo(async (tempRepoForMalformed) => {
      const manifest = baseManifest();
      await writePackageCandidate(tempRepoForMalformed, manifest, { skipManifest: true, writeArtifacts: false });
      await writeMalformedManifest(tempRepoForMalformed);
      const review = await runReviewFromTemp(tempRepoForMalformed);
      expectFail(review, "manifest.malformed-json");
    });

    // Wrong schema
    await withTempRepo(async (tempRepoForSchema) => {
      const manifest = withMutations([
        (candidate) => {
          candidate.schemaVersion = "wrong.version";
        }
      ]);
      await writePackageCandidate(tempRepoForSchema, manifest);
      const review = await runReviewFromTemp(tempRepoForSchema);
      expectFail(review, "manifest.schema-version");
    });

    // Missing owner/source authority fields
    await withTempRepo(async (tempRepoForOwnerAuthority) => {
      const manifest = withMutations([
        (candidate) => {
          delete candidate.ownerIdentity;
          delete candidate.sourceAuthority;
        }
      ]);
      await writePackageCandidate(tempRepoForOwnerAuthority, manifest);
      const review = await runReviewFromTemp(tempRepoForOwnerAuthority);
      assert(review.packageState !== "ready-for-intake");
      assert(
        review.gaps.some((gap) => gap.code === "owner-identity.missing") ||
          review.gaps.some((gap) => gap.code === "source-authority.missing"),
        "Expected missing owner/source authority gap."
      );
    });

    // Missing package-owner identity record
    await withTempRepo(async (tempRepoForPackageOwner) => {
      const manifest = withMutations([
        (candidate) => {
          delete candidate.ownerIdentity.packageOwner;
        }
      ]);
      await writePackageCandidate(tempRepoForPackageOwner, manifest);
      const review = await runReviewFromTemp(tempRepoForPackageOwner);
      assert(
        review.gaps.some((gap) => gap.code === "ownerIdentity.packageOwner.missing") ||
          review.gaps.some((gap) => gap.code === "ownerIdentity.packageOwner.required") ||
          review.gaps.some((gap) => gap.code === "owner-identity.required"),
        "Expected package-owner missing gap."
      );
    });

    // Missing source catalogue/update rules
    await withTempRepo(async (tempRepoForCatalogue) => {
      const manifest = withMutations([
        (candidate) => {
          delete candidate.catalog;
          delete candidate.modeRules;
        }
      ]);
      await writePackageCandidate(tempRepoForCatalogue, manifest);
      const review = await runReviewFromTemp(tempRepoForCatalogue);
      expectFail(review, "manifest.required-field");
    });

    // Missing scenario mapping
    await withTempRepo(async (tempRepoForScenario) => {
      const manifest = withMutations([
        (candidate) => {
          delete candidate.scenarioMapping;
        }
      ]);
      await writePackageCandidate(tempRepoForScenario, manifest);
      const review = await runReviewFromTemp(tempRepoForScenario);
      expectFail(review, "scenario.mapping.missing");
    });

    // Missing update cadence / stale policy
    await withTempRepo(async (tempRepoForTemporal) => {
      const manifest = withMutations([
        (candidate) => {
          delete candidate.temporalRules.updateCadence;
          delete candidate.temporalRules.staleDataPolicy;
        }
      ]);
      await writePackageCandidate(tempRepoForTemporal, manifest);
      const review = await runReviewFromTemp(tempRepoForTemporal);
      assert(
        review.gaps.some((gap) => gap.code === "temporal-rules.update-cadence") ||
          review.gaps.some((gap) => gap.code === "temporal-rules.stale-data"),
        "Expected stale / update cadence gap."
      );
    });

    // Missing time system metadata
    await withTempRepo(async (tempRepoForTimeSystem) => {
      const manifest = withMutations([
        (candidate) => {
          delete candidate.temporalRules.timeSystem;
        }
      ]);
      await writePackageCandidate(tempRepoForTimeSystem, manifest);
      const review = await runReviewFromTemp(tempRepoForTimeSystem);
      assert(
        review.gaps.some((gap) => gap.code === "temporal-rules.time-system"),
        "Expected time-system gap."
      );
    });

    // Missing redistribution / license policy
    await withTempRepo(async (tempRepoForLicense) => {
      const manifest = withMutations([
        (candidate) => {
          delete candidate.licenseRedistributionPolicy;
          delete candidate.checksumPolicy;
        }
      ]);
      await writePackageCandidate(tempRepoForLicense, manifest);
      const review = await runReviewFromTemp(tempRepoForLicense);
      assert(
        review.gaps.some((gap) => gap.code === "license.policy.missing") ||
          review.gaps.some((gap) => gap.code === "checksum.policy.missing"),
        "Expected license/checksum policy gap."
      );
    });

    // Missing checksums and integrity artifacts
    await withTempRepo(async (tempRepoForIntegrity) => {
      const manifest = withMutations([
        (candidate) => {
          delete candidate.packageArtifacts[0].checksum;
          candidate.checksumPolicy.checksumManifestRefs = [];
        }
      ]);
      await writePackageCandidate(tempRepoForIntegrity, manifest);
      const review = await runReviewFromTemp(tempRepoForIntegrity);
      assert(
        review.gaps.some((gap) => gap.code === "package-artifacts.checksum") ||
          review.gaps.some((gap) => gap.code === "checksum.policy.checksum-manifest-refs") ||
          review.gaps.some((gap) => gap.code === "checksum.policy.manifest-refs"),
        "Expected integrity policy / checksum gap."
      );
    });

    // Package artifact checksum algorithm must be declared in checksum policy
    await withTempRepo(async (tempRepoForPolicyAlgorithm) => {
      const manifest = withMutations([
        (candidate) => {
          candidate.checksumPolicy.requiredAlgorithms = ["sha256"];
          candidate.packageArtifacts[0].checksum.algorithm = "sha384";
        }
      ]);
      await writePackageCandidate(tempRepoForPolicyAlgorithm, manifest);
      const review = await runReviewFromTemp(tempRepoForPolicyAlgorithm);
      assert(
        review.gaps.some((gap) => gap.code === "package-artifacts.checksum-policy-algorithm"),
        "Expected checksum-policy algorithm gap."
      );
    });

    // Missing sourceArtifactRefs in parsed/review fields
    await withTempRepo(async (tempRepoForRefs) => {
      const manifest = withMutations([
        (candidate) => {
          candidate.parsedReviewedFields[0].sourceArtifactRefs = [];
          candidate.reviewGate.sourceArtifactRefs = [];
        }
      ]);
      await writePackageCandidate(tempRepoForRefs, manifest);
      const review = await runReviewFromTemp(tempRepoForRefs);
      assert(
        review.gaps.some((gap) => gap.code === "parsed.fields.source-refs") ||
          review.gaps.some((gap) => gap.code === "review-gate.source-refs"),
        "Expected parsed/review sourceArtifactRefs gap."
      );
    });

    // Unknown sourceArtifactRefs must fail
    await withTempRepo(async (tempRepoForUnknownRefs) => {
      const manifest = withMutations([
        (candidate) => {
          candidate.parsedReviewedFields[0].sourceArtifactRefs.push(sourceArtifactRef("no-such-artifact", "scenario-mapping"));
        }
      ]);
      await writePackageCandidate(tempRepoForUnknownRefs, manifest);
      const review = await runReviewFromTemp(tempRepoForUnknownRefs);
      assert(
        review.gaps.some((gap) => gap.code === "source-artifact-refs.unknown"),
        "Expected unknown sourceArtifactRefs gap."
      );
    });

    // Owner identity metadata must be non-empty text
    await withTempRepo(async (tempRepoForOwnerMetadata) => {
      const manifest = withMutations([
        (candidate) => {
          candidate.ownerIdentity.sourceOwner.organization = "";
          candidate.ownerIdentity.packageOwner.role = "   ";
        }
      ]);
      await writePackageCandidate(tempRepoForOwnerMetadata, manifest);
      const review = await runReviewFromTemp(tempRepoForOwnerMetadata);
      assert(
        review.gaps.some((gap) => gap.code === "ownerIdentity.sourceOwner.organization") ||
          review.gaps.some((gap) => gap.code === "ownerIdentity.packageOwner.role"),
        "Expected owner metadata text gap."
      );
    });

    // Wrong retention packageRoot must fail boundary checks
    await withTempRepo(async (tempRepoForPackageRoot) => {
      const manifest = withMutations([
        (candidate) => {
          candidate.retentionPolicy.packageRoot = "artifacts";
        }
      ]);
      await writePackageCandidate(tempRepoForPackageRoot, manifest);
      const review = await runReviewFromTemp(tempRepoForPackageRoot);
      assert(
        review.gaps.some((gap) => gap.code === "retention.package-root"),
        "Expected retention packageRoot gap."
      );
    });

    // Artifact path boundary fail
    await withTempRepo(async (tempRepoForBoundary) => {
      const manifest = withMutations([
        (candidate) => {
          candidate.packageArtifacts[0].retainedPath = "../outside/owner-evidence.json";
        }
      ]);
      await writePackageCandidate(tempRepoForBoundary, manifest);
      const review = await runReviewFromTemp(tempRepoForBoundary);
      assert(
        review.gaps.some((gap) => gap.code === "package-artifacts.retained-path") ||
          review.gaps.some((gap) => gap.code === "package-artifact-paths.path-escape") ||
          review.gaps.some((gap) => gap.code === "packageArtifactPathSummary.paths-escape-root"),
        "Expected artifact boundary gap."
      );
    });

    // Source package incorrectly marked owner-authoritative
    await withTempRepo(async (tempRepoForAuthority) => {
      const manifest = withMutations([
        (candidate) => {
          candidate.sourceAuthority.sourceTier = "tier-2-public-official-source";
          candidate.sourceAuthority.sourceAuthorityClassification = "itri-private-authority";
        }
      ]);
      await writePackageCandidate(tempRepoForAuthority, manifest);
      const review = await runReviewFromTemp(tempRepoForAuthority);
      assert(
        review.gaps.some((gap) => gap.code === "source-authority.mapping"),
        "Expected owner-authoritative mismatch gap."
      );
    });

    // Empty / unknown source tier classification
    await withTempRepo(async (tempRepoForUnknown) => {
      const manifest = withMutations([
        (candidate) => {
          candidate.sourceAuthority.sourceTier = "tier-unknown";
        }
      ]);
      await writePackageCandidate(tempRepoForUnknown, manifest);
      const review = await runReviewFromTemp(tempRepoForUnknown);
      assert(
        review.gaps.some((gap) => "source-authority.source-tier" === gap.code || "source-authority.mapping" === gap.code),
        "Expected unknown source-tier gap."
      );
    });

    // Synthetic-only catalogue cannot close source-package intake readiness
    await withTempRepo(async (tempRepoForSynthetic) => {
      const manifest = withMutations([
        (candidate) => {
          candidate.catalog.catalogType = "synthetic-rehearsal-only";
          candidate.sourceAuthority.sourceTier = "tier-3-synthetic-rehearsal";
          candidate.sourceAuthority.sourceAuthorityClassification = "synthetic-rehearsal-only";
        }
      ]);
      await writePackageCandidate(tempRepoForSynthetic, manifest);
      const review = await runReviewFromTemp(tempRepoForSynthetic);
      assert(
        review.gaps.some((gap) => gap.code === "synthetic.source-rejected"),
        "Expected synthetic-only rejection gap."
      );
    });

    // Synthetic-only data should not be treated as owner authority
    await withTempRepo(async (tempRepoForSyntheticBoundary) => {
      const manifest = withMutations([
        (candidate) => {
          candidate.catalog.catalogType = "synthetic-rehearsal-only";
          candidate.sourceAuthority.sourceTier = "tier-1-itri-or-owner-authority";
          candidate.sourceAuthority.sourceAuthorityClassification = "itri-private-authority";
        }
      ]);
      await writePackageCandidate(tempRepoForSyntheticBoundary, manifest);
      const review = await runReviewFromTemp(tempRepoForSyntheticBoundary);
      assert(
        review.gaps.some((gap) => gap.code === "sourceAuthority.synthetic-boundary") ||
          review.gaps.some((gap) => gap.code === "synthetic.source-rejected"),
        "Expected synthetic boundary rejection gap."
      );
    });

    // Positive ready case
    await withTempRepo(async (tempRepoForReady) => {
      const manifest = baseManifest();
      await writePackageCandidate(tempRepoForReady, manifest);
      const review = await runReviewFromTemp(tempRepoForReady);
      expectReady(review);
      assert.equal(review.packageArtifactPathSummary.resolvedPaths.length, manifest.packageArtifacts.length);
      assert.equal(review.sourceArtifactRefSummary.unknownRefIds.length, 0);
    });
  });

  console.log("S12-B external-source-package-intake reviewer verifier passed.");
}

await main();
