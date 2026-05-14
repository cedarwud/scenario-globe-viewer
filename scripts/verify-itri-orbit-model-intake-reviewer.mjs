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
  "src/features/orbit-model-intake/orbit-model-intake-reviewer.ts"
);
const cliPath = path.join(repoRoot, "scripts/review-itri-orbit-model-intake.mjs");
const packageRelativePath =
  "output/validation/external-f01-orbit-model/2026-05-14T00-00-00Z-orbit-model-intake";

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
  const tempModuleDir = await mkdtemp(path.join(tmpdir(), "sgv-f01r1-unit-"));

  try {
    const source = await readFile(reviewerSourcePath, "utf8");
    const modulePath = path.join(tempModuleDir, "reviewer.mjs");

    await writeFile(
      modulePath,
      transpileTypeScript(source, "orbit-model-intake-reviewer.ts"),
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

function nonClaims() {
  return {
    modelPackagePresentInRepo: false,
    runtimeAdapterImplementedByThisContract: false,
    publicTleSubstitutesForItriModel: false,
    syntheticDataProvidesOrbitalTruth: false,
    measuredTrafficTruth: false,
    externalStackVerdict: false,
    fullItriAcceptance: false
  };
}

function baseManifest() {
  return {
    schemaVersion: "itri.f01.orbit-model-intake.v1",
    packageId: "itri-f01r1-temp-orbit-model-intake",
    owner: {
      organization: "Temp ITRI orbit-model owner",
      role: "orbit model authority package owner",
      authorityScope: ["F-01"],
      contactRef: "owner/contact.md"
    },
    receivedAt: "2026-05-14T00:00:00.000Z",
    sourceTier: "tier-1-itri-authority",
    sourcePackageRefs: ["source/package-inventory.md"],
    checksumRefs: ["checksums/model.sha256"],
    redistributionPolicy: {
      policyId: "temp-f01r1-policy",
      retainedPackageAllowed: true,
      projectedArtifactsAllowed: true,
      notes: [
        "Projected artifacts are allowed only for adapter design-review planning."
      ]
    },
    licenseUseNotes: [
      "Temp-only verifier package; no model implementation, equations, or vendor tool output are retained."
    ],
    reviewer: {
      nameOrRole: "Temp F-01R1 reviewer",
      reviewedAt: "2026-05-14T00:10:00.000Z",
      reviewScope: ["F-01"],
      notes: [
        "Temp-only package checks intake readiness without runtime integration."
      ]
    },
    modelIdentity: {
      modelName: "Temp ITRI owner orbit model",
      modelVersion: "owner-temp-v1",
      propagationMethod: "owner-defined-propagation-method",
      coordinateFrames: {
        inputFrames: ["ECI"],
        outputFrames: ["ECEF"],
        frameDefinitionRefs: ["model/frame-definitions.md"]
      },
      timeSystem: "UTC",
      epochRules: {
        acceptedEpochFormats: ["ISO-8601"],
        epochSource: "inputContract.scenarioTime.timestamp",
        relativeTimeAllowed: false
      }
    },
    inputContract: {
      scenarioTime: {
        timestamp: "ISO-8601",
        timeSystem: "UTC",
        epochId: "scenario-epoch",
        sampleCadenceSeconds: 60
      },
      satelliteIdentity: {
        satelliteId: "owner-catalog-id",
        modelCatalogKey: "owner-model-catalog-key",
        orbitClass: "leo",
        identityVersion: "owner-temp-v1"
      },
      orbitStateInputs: {
        stateKind: "owner-position-velocity-state",
        values: {
          position: "x/y/z",
          velocity: "vx/vy/vz"
        }
      },
      units: {
        distance: "meters",
        velocity: "meters-per-second",
        angle: "degrees",
        time: "seconds",
        uncertainty: "meters"
      }
    },
    outputContract: {
      sampleOutputShape: {
        satelliteId: "string",
        sampleTime: "ISO-8601",
        position: {
          frame: "ECEF",
          units: "meters"
        },
        velocity: {
          frame: "ECEF",
          units: "meters-per-second"
        }
      },
      frameTimeLabels: {
        outputFrame: "ECEF",
        timeSystem: "UTC",
        epochId: "scenario-epoch"
      },
      uncertainty: {
        positionMeters: 5,
        velocityMetersPerSecond: 0.01,
        timingSeconds: 0.1
      },
      tolerances: {
        positionMeters: 5,
        velocityMetersPerSecond: 0.01,
        timingSeconds: 0.1
      }
    },
    validationVectors: [
      {
        caseId: "leo-owner-vector-001",
        casePurpose: "LEO sample propagation envelope and frame label check.",
        retainedInputRef: "vectors/leo-input.json",
        retainedOutputRef: "vectors/leo-output.json",
        tolerances: {
          positionMeters: 5,
          velocityMetersPerSecond: 0.01,
          timingSeconds: 0.1
        },
        comparisonMethod: {
          method: "component-wise",
          sampleMatching: "exact timestamp",
          frameConversion: "owner-declared ECI to ECEF reference"
        },
        failureHandling: {
          missingFields: "block-review",
          outOfTolerance: "block-review",
          redactedData: "owner-escalation"
        }
      }
    ],
    status: {
      contractStatus: "docs-only-intake-contract",
      authorityPackageStatus: "vectors-complete",
      adapterPlanningStatus: "ready-for-design-review",
      implementationStatus: "separate-slice-required",
      acceptanceLimitations: [
        "F-01R1 reaches intake readiness only.",
        "Runtime adapter implementation remains a separate slice.",
        "Public TLE and synthetic fallback material remain separate boundaries."
      ],
      nonClaims: nonClaims()
    }
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function writeTextFile(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents, "utf8");
}

function isPrivateOwnerSystemRef(ref) {
  return /^(owner-system|private-owner-system|itri-owner-system):/i.test(ref);
}

function isWritableRef(ref) {
  return !path.isAbsolute(ref) &&
    !ref.startsWith("../") &&
    !ref.includes("/../") &&
    !/^[a-z][a-z0-9+.-]*:\/\//i.test(ref) &&
    !isPrivateOwnerSystemRef(ref);
}

async function writePackage(repoRootForTest, manifest, reviewer, options = {}) {
  const packageRoot = path.join(repoRootForTest, packageRelativePath);
  const skipRefs = new Set(options.skipRefs ?? []);
  const refs = reviewer.collectItriOrbitModelIntakeRetainedRefs(manifest);

  await mkdir(packageRoot, { recursive: true });

  for (const ref of refs) {
    if (!isWritableRef(ref) || skipRefs.has(ref)) {
      continue;
    }

    await writeTextFile(packageRoot, ref, `temp-only ${ref}\n`);
  }

  await writeTextFile(
    packageRoot,
    "manifest.json",
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

async function runCli(
  reviewItriOrbitModelIntakeFromPath,
  repoRootForTest,
  options = {}
) {
  const review = await reviewItriOrbitModelIntakeFromPath({
    packageInput: options.packagePath ?? packageRelativePath,
    manifestInput: options.manifestPath,
    repoRoot: repoRootForTest
  });

  return {
    status: review.packageState === "ready-for-design-review" ? 0 : 1,
    review
  };
}

async function withTempRepo(action) {
  const tempRepo = await mkdtemp(path.join(tmpdir(), "sgv-f01r1-repo-"));

  try {
    return await action(tempRepo);
  } finally {
    await rm(tempRepo, { recursive: true, force: true });
  }
}

function assertGap(review, code) {
  assert(
    review.gaps.some((gap) => gap.code === code) ||
      review.requirementReviews.some((entry) =>
        entry.gaps.some((gap) => gap.code === code)
      ),
    `Expected gap code ${code}.`
  );
}

function assertNoAuthorityOrRuntimeClaim(review) {
  assert.notEqual(
    review.packageState,
    "authority-pass",
    "F-01R1 package state must never be authority-pass."
  );
  assert(
    review.requirementReviews.every(
      (entry) => entry.reviewerState !== "authority-pass"
    ),
    "F-01R1 requirement review must never emit authority-pass."
  );
  assert.equal(
    review.nonClaims.modelPackagePresentInRepo,
    false,
    "Reviewer output must preserve model-package-present nonclaim."
  );
  assert.equal(
    review.nonClaims.runtimeAdapterImplementedByThisContract,
    false,
    "Reviewer output must preserve runtime-adapter nonclaim."
  );
  assert.equal(
    review.nonClaims.publicTleSubstitutesForItriModel,
    false,
    "Reviewer output must preserve public-TLE nonclaim."
  );
  assert.equal(
    review.nonClaims.syntheticDataProvidesOrbitalTruth,
    false,
    "Reviewer output must preserve synthetic orbital-truth nonclaim."
  );
}

async function expectFailClosed(reviewFromPath, reviewer, label, mutate, expectedCode) {
  await withTempRepo(async (tempRepo) => {
    const manifest = baseManifest();
    mutate(manifest, tempRepo);
    await writePackage(tempRepo, manifest, reviewer);
    const result = await runCli(reviewFromPath, tempRepo);

    assert.equal(result.status, 1, `${label} must fail closed.`);
    assertGap(result.review, expectedCode);
    assertNoAuthorityOrRuntimeClaim(result.review);
  });
}

async function main() {
  const { reviewer, cleanup } = await importReviewer();
  const { reviewItriOrbitModelIntakeFromPath } = await import(
    pathToFileURL(cliPath).href
  );

  try {
    assert.equal(
      reviewer.isAllowedItriOrbitModelIntakePackagePath(packageRelativePath),
      true,
      "Package path helper must allow F-01 orbit-model intake package paths."
    );
    assert.equal(
      reviewer.isAllowedItriOrbitModelIntakePackagePath(
        "output/validation/external-f07-f09/not-f01"
      ),
      false,
      "Package path helper must reject unrelated validation roots."
    );

    await withTempRepo(async (tempRepo) => {
      const result = await runCli(reviewItriOrbitModelIntakeFromPath, tempRepo);

      assert.equal(result.status, 1, "Missing package must fail closed.");
      assert.equal(result.review.packageState, "missing");
      assertGap(result.review, "package.missing");
      assertNoAuthorityOrRuntimeClaim(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      const result = await runCli(reviewItriOrbitModelIntakeFromPath, tempRepo, {
        packagePath: "output/validation/external-f07-f09/not-f01"
      });

      assert.equal(result.status, 1, "Wrong root must fail closed.");
      assert.equal(result.review.packageState, "rejected");
      assertGap(result.review, "package.path-outside-retained-root");
      assertNoAuthorityOrRuntimeClaim(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      await mkdir(path.join(tempRepo, packageRelativePath), { recursive: true });
      const result = await runCli(reviewItriOrbitModelIntakeFromPath, tempRepo);

      assert.equal(result.status, 1, "Missing manifest must fail closed.");
      assert.equal(result.review.packageState, "incomplete");
      assertGap(result.review, "manifest.missing");
      assertNoAuthorityOrRuntimeClaim(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      await mkdir(path.join(tempRepo, packageRelativePath), { recursive: true });
      await writeTextFile(
        path.join(tempRepo, packageRelativePath),
        "manifest.json",
        "{ not-json"
      );
      const result = await runCli(reviewItriOrbitModelIntakeFromPath, tempRepo);

      assert.equal(result.status, 1, "Malformed JSON must fail closed.");
      assert.equal(result.review.packageState, "incomplete");
      assertGap(result.review, "manifest.malformed-json");
      assertNoAuthorityOrRuntimeClaim(result.review);
    });

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "Wrong schemaVersion",
      (manifest) => {
        manifest.schemaVersion = "itri.f01.orbit-model-intake.v0";
      },
      "manifest.schema-version"
    );

    await withTempRepo(async (tempRepo) => {
      const manifest = baseManifest();
      await writePackage(tempRepo, manifest, reviewer);
      await writeTextFile(tempRepo, "outside-manifest.json", "{}\n");
      const result = await runCli(reviewItriOrbitModelIntakeFromPath, tempRepo, {
        manifestPath: "outside-manifest.json"
      });

      assert.equal(
        result.status,
        1,
        "Explicit --manifest outside package must fail closed."
      );
      assert.equal(result.review.packageState, "rejected");
      assertGap(result.review, "manifest.path-outside-package");
      assertNoAuthorityOrRuntimeClaim(result.review);
    });

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "Missing required metadata",
      (manifest) => {
        delete manifest.owner;
      },
      "metadata.required-field-missing"
    );

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "Public TLE sourceTier promoted as ITRI model authority",
      (manifest) => {
        manifest.sourceTier = "tier-2-public-tle-celestrak";
      },
      "source-tier.public-tle-promoted"
    );

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "Missing model identity",
      (manifest) => {
        delete manifest.modelIdentity;
      },
      "model-identity.missing"
    );

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "Missing coordinate frame refs",
      (manifest) => {
        manifest.modelIdentity.coordinateFrames.frameDefinitionRefs = [];
      },
      "model-identity.frame-definition-refs-missing"
    );

    await withTempRepo(async (tempRepo) => {
      const manifest = baseManifest();
      delete manifest.modelIdentity.timeSystem;
      delete manifest.modelIdentity.epochRules;
      await writePackage(tempRepo, manifest, reviewer);
      const result = await runCli(reviewItriOrbitModelIntakeFromPath, tempRepo);

      assert.equal(result.status, 1, "Missing time system / epoch rules must fail closed.");
      assertGap(result.review, "model-identity.time-system-missing");
      assertGap(result.review, "model-identity.epoch-rules-missing");
      assertNoAuthorityOrRuntimeClaim(result.review);
    });

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "Missing input units",
      (manifest) => {
        delete manifest.inputContract.units;
      },
      "input-contract.units-missing"
    );

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "Missing output frame/time labels",
      (manifest) => {
        delete manifest.outputContract.frameTimeLabels;
      },
      "output-contract.frame-time-labels-missing"
    );

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "Missing validation vectors",
      (manifest) => {
        manifest.validationVectors = [];
      },
      "validation-vectors.missing"
    );

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "Validation vector missing tolerances",
      (manifest) => {
        delete manifest.validationVectors[0].tolerances;
      },
      "validation-vector.tolerances-missing"
    );

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "Validation vector missing comparisonMethod",
      (manifest) => {
        delete manifest.validationVectors[0].comparisonMethod;
      },
      "validation-vector.comparison-method-missing"
    );

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "Validation vector using public TLE as substitute",
      (manifest) => {
        manifest.validationVectors[0].expectedOutput = {
          source: "CelesTrak public TLE output substitute"
        };
        delete manifest.validationVectors[0].retainedOutputRef;
      },
      "validation-vector.public-tle-substitute"
    );

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "Synthetic provenance/source tier",
      (manifest) => {
        manifest.sourceTier = "tier-3-synthetic";
        manifest.syntheticProvenance = {
          kind: "hand-authored-shape",
          generator: "verify script",
          seed: null
        };
      },
      "synthetic-source.rejected"
    );

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "nonClaims missing",
      (manifest) => {
        delete manifest.status.nonClaims;
      },
      "nonclaims.missing"
    );

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "nonClaims true",
      (manifest) => {
        manifest.status.nonClaims.publicTleSubstitutesForItriModel = true;
      },
      "nonclaims.field-must-be-false"
    );

    await expectFailClosed(
      reviewItriOrbitModelIntakeFromPath,
      reviewer,
      "retainedPath escaping package",
      (manifest) => {
        manifest.validationVectors[0].retainedInputRef = "../outside-input.json";
      },
      "retained-ref.escapes-package"
    );

    await withTempRepo(async (tempRepo) => {
      const manifest = clone(baseManifest());
      await writePackage(tempRepo, manifest, reviewer);
      const result = await runCli(reviewItriOrbitModelIntakeFromPath, tempRepo);

      assert.equal(
        result.status,
        0,
        "Positive temp-only package must reach ready-for-design-review."
      );
      assert.equal(result.review.packageState, "ready-for-design-review");
      assert.equal(result.review.sourceTier, "tier-1-itri-authority");
      assert.equal(result.review.status.adapterPlanningStatus, "ready-for-design-review");
      assert.equal(result.review.status.implementationStatus, "separate-slice-required");
      assert.equal(result.review.status.runtimeImplementationClaimed, false);
      assert.equal(result.review.status.authorityPassClaimed, false);
      assert.equal(result.review.validationVectors.vectorCount, 1);
      assert.equal(result.review.validationVectors.completeVectorCount, 1);
      assert.equal(result.review.retainedRefSummary.escapedRefs.length, 0);
      assert.equal(result.review.retainedRefSummary.unresolvedRefs.length, 0);
      assertNoAuthorityOrRuntimeClaim(result.review);
    });
  } finally {
    await cleanup();
  }

  console.log(
    "F-01R1 orbit-model intake reviewer verifier passed: missing package, wrong root, missing manifest, malformed JSON, wrong schemaVersion, manifest-outside-package, missing metadata, public TLE sourceTier promotion, missing model identity, missing coordinate frame refs, missing time system/epoch rules, missing input units, missing output frame/time labels, missing validation vectors, vector tolerances/comparisonMethod gaps, public TLE vector substitution, synthetic provenance/source tier, nonClaims missing/true, retainedPath escaping, and positive temp-only ready-for-design-review without runtime integration cases covered."
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
