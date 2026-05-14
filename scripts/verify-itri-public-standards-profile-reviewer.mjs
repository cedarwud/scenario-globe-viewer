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
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const reviewerSourcePath = path.join(
  repoRoot,
  "src/features/public-standards-profile/public-standards-profile-reviewer.ts"
);
const cliPath = path.join(repoRoot, "scripts/review-itri-public-standards-profile.mjs");
const packageRelativePath =
  "output/validation/public-standards-profiles/itri-f17-p01-p02-p03-public-standards-v1";

const sourceExpectations = {
  "S4A-ITU-P618": {
    recommendationId: "ITU-R P.618",
    versionId: "ITU-R P.618-14 (08/2023)",
    url: "https://www.itu.int/rec/R-REC-P.618-14-202308-I/en",
    mappedRequirements: ["F-17", "P-02", "P-03"],
    selectedRole: "core rain-attenuation propagation candidate"
  },
  "S4A-ITU-P837": {
    recommendationId: "ITU-R P.837",
    versionId: "ITU-R P.837-8 (09/2025)",
    url: "https://www.itu.int/rec/R-REC-P.837-8-202509-I/en",
    mappedRequirements: ["P-02", "P-03"],
    selectedRole: "rain-rate source candidate"
  },
  "S4A-ITU-P838": {
    recommendationId: "ITU-R P.838",
    versionId: "ITU-R P.838-3 (03/2005)",
    url: "https://www.itu.int/rec/R-REC-P.838-3-200503-I/en",
    mappedRequirements: ["P-02", "P-03"],
    selectedRole: "specific rain attenuation candidate"
  },
  "S4A-ITU-P676": {
    recommendationId: "ITU-R P.676",
    versionId: "ITU-R P.676-13 (08/2022)",
    url: "https://www.itu.int/rec/R-REC-P.676-13-202208-I/en",
    mappedRequirements: ["F-17", "P-03"],
    selectedRole: "atmospheric gas candidate"
  },
  "S4A-ITU-P839": {
    recommendationId: "ITU-R P.839",
    versionId: "ITU-R P.839-4 (09/2013)",
    url: "https://www.itu.int/rec/R-REC-P.839-4-201309-I/en",
    mappedRequirements: ["P-02", "P-03"],
    selectedRole: "rain-height source candidate"
  },
  "S4A-ITU-P840": {
    recommendationId: "ITU-R P.840",
    versionId: "ITU-R P.840-9 (08/2023)",
    url: "https://www.itu.int/rec/R-REC-P.840-9-202308-I/en",
    mappedRequirements: ["F-17", "P-03"],
    selectedRole: "cloud/fog attenuation candidate"
  },
  "S4A-ITU-S465": {
    recommendationId: "ITU-R S.465",
    versionId: "ITU-R S.465-6 (01/2010)",
    url: "https://www.itu.int/rec/R-REC-S.465-6-201001-I/en",
    mappedRequirements: ["P-01", "P-03"],
    selectedRole: "earth-station antenna-pattern candidate"
  },
  "S4A-ITU-S580": {
    recommendationId: "ITU-R S.580",
    versionId: "ITU-R S.580-6 (01/2004)",
    url: "https://www.itu.int/rec/R-REC-S.580-6-200401-I/en",
    mappedRequirements: ["P-01", "P-03"],
    selectedRole: "GEO earth-station antenna objective candidate"
  },
  "S4A-ITU-S1528": {
    recommendationId: "ITU-R S.1528",
    versionId: "ITU-R S.1528-0 (06/2001)",
    url: "https://www.itu.int/rec/R-REC-S.1528-0-200106-I/en",
    mappedRequirements: ["P-01", "P-03"],
    selectedRole: "non-GSO satellite antenna-pattern candidate"
  }
};

function transpileTypeScript(source, fileName) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    },
    fileName
  }).outputText;
}

async function importReviewer() {
  const tempModuleDir = await mkdtemp(path.join(tmpdir(), "sgv-s4r1-unit-"));

  try {
    const source = await readFile(reviewerSourcePath, "utf8");
    const modulePath = path.join(tempModuleDir, "reviewer.mjs");

    await writeFile(
      modulePath,
      transpileTypeScript(source, "public-standards-profile-reviewer.ts"),
      "utf8"
    );

    return {
      reviewer: await import(pathToFileURL(modulePath).href),
      cleanup: async () => {
        await rm(tempModuleDir, { recursive: true, force: true });
      }
    };
  } catch (error) {
    await rm(tempModuleDir, { recursive: true, force: true });
    throw error;
  }
}

function sourceIds() {
  return Object.keys(sourceExpectations);
}

function selectedRecommendations() {
  return Object.entries(sourceExpectations).map(([sourceId, source]) => ({
    sourceId,
    recommendationId: source.recommendationId,
    versionId: source.versionId,
    url: source.url,
    accessDate: "2026-05-13",
    mappedRequirements: source.mappedRequirements,
    selectedRole: source.selectedRole,
    status: "selected-for-bounded-profile",
    notes: [
      "Temp-only S4R1 verifier profile; source-lineage review readiness only."
    ]
  }));
}

function keyedBySource(field) {
  return Object.fromEntries(
    Object.entries(sourceExpectations).map(([sourceId, source]) => [
      sourceId,
      source[field]
    ])
  );
}

function replacementRules() {
  return [
    "itri-official-parameters-arrive",
    "itri-validation-vectors-arrive",
    "itri-tolerances-arrive",
    "itri-rejects-public-profile",
    "recommendation-version-superseded",
    "license-or-use-boundary-changes"
  ].map((trigger) => ({
    trigger,
    requiredAction:
      "Freeze or reclassify the bounded public profile before any authority escalation.",
    profileStatusAfterAction:
      trigger === "itri-rejects-public-profile"
        ? "rejected-by-itri-vgroup"
        : "needs-reclassification"
  }));
}

function nonClaims() {
  return {
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
}

function baseProfile() {
  return {
    schemaVersion: "itri.public-standards-profile.v1",
    profileId: "itri-f17-p01-p02-p03-public-standards-v1",
    profileDate: "2026-05-14",
    coveredRequirements: ["F-17", "P-01", "P-02", "P-03"],
    profileScope:
      "Bounded public standards lineage profile for review readiness only.",
    sourceTier: "tier-2-public-authority-candidate",
    selectedRecommendations: selectedRecommendations(),
    sourceLineage: {
      classificationDoc: "itri-public-standards-source-classification.md",
      classificationDate: "2026-05-13",
      sourceIds: sourceIds(),
      inheritedUseNotes: [
        "Official ITU pages are retained as public authority candidates only."
      ],
      notes: [
        "Method/context source IDs remain in notes and licenseUseNotes only."
      ]
    },
    accessDates: Object.fromEntries(sourceIds().map((sourceId) => [sourceId, "2026-05-13"])),
    versionIds: keyedBySource("versionId"),
    licenseUseNotes: [
      "Use by citation/source lineage only; no ITU method text, equations, tables, or components are copied."
    ],
    frequencyBands: [
      {
        bandId: "not-yet-selected",
        label: "customer/V-group frequency bands not yet supplied",
        sourceIds: ["S4A-ITU-P618"],
        notes: ["No numeric band is inferred from current bounded proxy values."]
      }
    ],
    geography: {
      geographyId: "not-yet-selected",
      label: "customer/V-group geography not yet supplied",
      sourceIds: ["S4A-ITU-P837", "S4A-ITU-P839"],
      notes: ["No location parameter is invented by the public profile."]
    },
    rainRateSource: {
      sourceId: "S4A-ITU-P837",
      label: "Candidate rain-rate source, pending authority selection",
      parameterIds: [],
      notes: ["No component data is copied into the profile."]
    },
    rainHeightSource: {
      sourceId: "S4A-ITU-P839",
      label: "Candidate rain-height source, pending authority selection",
      parameterIds: [],
      notes: ["No component data is copied into the profile."]
    },
    pathGeometry: {
      geometryId: "not-yet-selected",
      pathRole: "slant-path",
      notes: ["Path geometry remains explicit and not authority-selected."]
    },
    elevationAngle: {
      basis: "not-selected",
      notes: ["No elevation angle is inferred."]
    },
    polarization: {
      value: "not-selected",
      basis: "not-selected",
      notes: ["No polarization value is inferred."]
    },
    antennaClass: {
      classId: "not-yet-selected",
      terminalRole: "earth-station",
      selectedPatternSourceIds: ["S4A-ITU-S465", "S4A-ITU-S580"],
      notes: ["Antenna geometry remains pending customer/V-group input."]
    },
    pointingAssumptions: [
      "No pointing assumption is selected beyond bounded public profile review."
    ],
    outputUnits: {
      decisionImpact: "not-derived",
      notes: ["No conversion or numeric standards-derived behavior is implemented."]
    },
    approximationLevel: "index-only",
    validationVectors: [
      {
        vectorId: "itri-validation-vectors-not-yet-supplied",
        source: "not-yet-supplied",
        coveredRequirements: ["F-17", "P-01", "P-02", "P-03"],
        inputSummary: "customer/V-group validation vectors are not retained.",
        notes: ["Placeholder request only; not a synthetic fixture."]
      }
    ],
    tolerances: [
      {
        toleranceId: "itri-tolerances-not-yet-supplied",
        appliesTo: "F-17/P-01/P-02/P-03 public profile",
        source: "not-yet-supplied",
        notes: ["No tolerance value is invented."]
      }
    ],
    reviewer: {
      role: "repo-maintainer",
      notes: ["Bounded public profile review readiness only."]
    },
    acceptanceStatus: "bounded-public-profile-only",
    nonClaims: nonClaims(),
    replacementRules: replacementRules()
  };
}

async function writeTextFile(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents, "utf8");
}

async function writePackage(repoRootForTest, profile, profileRelativePath = "profile.json") {
  const packageRoot = path.join(repoRootForTest, packageRelativePath);

  await mkdir(packageRoot, { recursive: true });
  await writeTextFile(
    packageRoot,
    profileRelativePath,
    `${JSON.stringify(profile, null, 2)}\n`
  );
}

async function runCli(
  reviewProfileFromPath,
  repoRootForTest,
  options = {}
) {
  const review = await reviewProfileFromPath({
    packageInput: options.packagePath ?? packageRelativePath,
    profileInput: options.profilePath,
    repoRoot: repoRootForTest
  });

  return {
    status: review.packageState === "bounded-public-profile-ready" ? 0 : 1,
    review
  };
}

async function withTempRepo(action) {
  const tempRepo = await mkdtemp(path.join(tmpdir(), "sgv-s4r1-repo-"));

  try {
    return await action(tempRepo);
  } finally {
    await rm(tempRepo, { recursive: true, force: true });
  }
}

function assertNoAuthorityState(review) {
  assert.notEqual(
    review.packageState,
    "authority-pass",
    "S4R1 package state must never be global authority-pass."
  );
  assert(
    review.requirementReviews.every(
      (entry) => entry.reviewerState !== "authority-pass"
    ),
    "S4R1 requirement reviews must never emit authority-pass."
  );
  assert.equal(
    review.authorityBoundary.retainedAuthorityMaterialAccepted,
    false,
    "S4R1 reviewer must not accept retained authority material."
  );
}

function assertGap(review, code) {
  assert(
    review.gaps.some((gap) => gap.code === code),
    `Expected gap code ${code}.`
  );
}

async function expectFailClosed(reviewProfileFromPath, label, mutate, expectedCode) {
  await withTempRepo(async (tempRepo) => {
    const profile = baseProfile();
    mutate(profile, tempRepo);
    await writePackage(tempRepo, profile);
    const result = await runCli(reviewProfileFromPath, tempRepo);

    assert.equal(result.status, 1, `${label} must fail closed.`);
    assertGap(result.review, expectedCode);
    assertNoAuthorityState(result.review);
  });
}

async function main() {
  const { reviewer, cleanup } = await importReviewer();
  const { reviewItriPublicStandardsProfileFromPath } = await import(
    pathToFileURL(cliPath).href
  );

  try {
    assert.equal(
      reviewer.isAllowedItriPublicStandardsProfilePackagePath(packageRelativePath),
      true,
      "Package path helper must allow public standards profile package paths."
    );
    assert.equal(
      reviewer.isAllowedItriPublicStandardsProfilePackagePath(
        "output/validation/external-v02-v06/not-this-slice"
      ),
      false,
      "Package path helper must reject unrelated validation roots."
    );

    await withTempRepo(async (tempRepo) => {
      const result = await runCli(reviewItriPublicStandardsProfileFromPath, tempRepo);

      assert.equal(result.status, 1, "Missing package must fail closed.");
      assert.equal(result.review.packageState, "missing");
      assertGap(result.review, "package.missing");
      assertNoAuthorityState(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      const result = await runCli(reviewItriPublicStandardsProfileFromPath, tempRepo, {
        packagePath: "output/validation/external-v02-v06/not-this-slice"
      });

      assert.equal(result.status, 1, "Wrong root must fail closed.");
      assert.equal(result.review.packageState, "rejected");
      assertGap(result.review, "package.path-outside-retained-root");
      assertNoAuthorityState(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      await mkdir(path.join(tempRepo, packageRelativePath), { recursive: true });
      const result = await runCli(reviewItriPublicStandardsProfileFromPath, tempRepo);

      assert.equal(result.status, 1, "Missing profile.json must fail closed.");
      assert.equal(result.review.packageState, "incomplete");
      assertGap(result.review, "profile.missing");
      assertNoAuthorityState(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      await mkdir(path.join(tempRepo, packageRelativePath), { recursive: true });
      await writeTextFile(
        path.join(tempRepo, packageRelativePath),
        "profile.json",
        "{ not-json"
      );
      const result = await runCli(reviewItriPublicStandardsProfileFromPath, tempRepo);

      assert.equal(result.status, 1, "Malformed JSON must fail closed.");
      assert.equal(result.review.packageState, "incomplete");
      assertGap(result.review, "profile.malformed-json");
      assertNoAuthorityState(result.review);
    });

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "Wrong schemaVersion",
      (profile) => {
        profile.schemaVersion = "itri.public-standards-profile.v0";
      },
      "profile.schema-version"
    );

    await withTempRepo(async (tempRepo) => {
      await writePackage(tempRepo, baseProfile());
      await writeTextFile(tempRepo, "outside-profile.json", "{}\n");
      const result = await runCli(reviewItriPublicStandardsProfileFromPath, tempRepo, {
        profilePath: "outside-profile.json"
      });

      assert.equal(result.status, 1, "Explicit --profile outside package must fail closed.");
      assert.equal(result.review.packageState, "rejected");
      assertGap(result.review, "profile.path-outside-package");
      assertNoAuthorityState(result.review);
    });

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "Unknown selected sourceId",
      (profile) => {
        profile.selectedRecommendations[0].sourceId = "S4A-ITU-UNKNOWN";
      },
      "source.unknown-selected"
    );

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "Method/context source promoted as selected recommendation",
      (profile) => {
        profile.selectedRecommendations[0].sourceId = "S4A-ITU-PUB-ACCESS";
      },
      "source.method-context-promoted"
    );

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "Secondary source URL",
      (profile) => {
        profile.selectedRecommendations[0].url = "https://example.com/mirror/P618";
      },
      "source.url-unofficial"
    );

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "Missing nonClaims field",
      (profile) => {
        delete profile.nonClaims.measuredTrafficTruth;
      },
      "nonclaims.field-missing"
    );

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "True nonClaims field",
      (profile) => {
        profile.nonClaims.itriVGroupAuthorityTruth = true;
      },
      "nonclaims.field-must-be-false"
    );

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "Synthetic provenance/source tier",
      (profile) => {
        profile.sourceTier = "tier-3-synthetic";
        profile.syntheticProvenance = {
          kind: "hand-authored-shape",
          generator: "verify script",
          seed: null
        };
      },
      "source.synthetic-material"
    );

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "Authority acceptance without retained material",
      (profile) => {
        profile.acceptanceStatus = "accepted-by-itri-vgroup-with-retained-record";
      },
      "authority.acceptance-without-retained-material"
    );

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "Implementation-ready approximation without retained material",
      (profile) => {
        profile.approximationLevel = "implementation-ready-after-authority-review";
      },
      "authority.implementation-ready-without-retained-material"
    );

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "Missing validationVectors",
      (profile) => {
        delete profile.validationVectors;
      },
      "validation-vectors.missing"
    );

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "Missing tolerances",
      (profile) => {
        delete profile.tolerances;
      },
      "tolerances.missing"
    );

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "Missing replacementRules trigger",
      (profile) => {
        profile.replacementRules = profile.replacementRules.filter(
          (rule) => rule.trigger !== "itri-tolerances-arrive"
        );
      },
      "replacement-rules.trigger-missing"
    );

    await expectFailClosed(
      reviewItriPublicStandardsProfileFromPath,
      "Retained path escapes package",
      (profile) => {
        profile.validationVectors[0].retainedPath = "../outside-vector.json";
      },
      "retained-path.escapes-package"
    );

    await withTempRepo(async (tempRepo) => {
      const profile = baseProfile();
      await writePackage(tempRepo, profile);
      const result = await runCli(reviewItriPublicStandardsProfileFromPath, tempRepo);

      assert.equal(result.status, 0, "Bounded public profile must review cleanly.");
      assert.equal(result.review.packageState, "bounded-public-profile-ready");
      assert.deepEqual(result.review.coveredRequirements, [
        "F-17",
        "P-01",
        "P-02",
        "P-03"
      ]);
      assert.equal(result.review.selectedSourceIds.length, sourceIds().length);
      assert.equal(result.review.gaps.length, 0);
      assert.equal(result.review.acceptanceStatus, "bounded-public-profile-only");
      assert.equal(result.review.sourceTier, "tier-2-public-authority-candidate");
      assert.equal(
        result.review.validationReadiness.notYetSuppliedValidationVectorsPresent,
        true
      );
      assert.equal(
        result.review.validationReadiness.notYetSuppliedTolerancesPresent,
        true
      );
      assertNoAuthorityState(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      const profile = baseProfile();
      delete profile.sourceTier;
      await writePackage(tempRepo, profile);
      const result = await runCli(reviewItriPublicStandardsProfileFromPath, tempRepo);

      assert.equal(result.status, 0, "Missing sourceTier must default to Tier 2.");
      assert.equal(result.review.packageState, "bounded-public-profile-ready");
      assert.equal(result.review.sourceTier, "tier-2-public-authority-candidate");
      assertNoAuthorityState(result.review);
    });
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
