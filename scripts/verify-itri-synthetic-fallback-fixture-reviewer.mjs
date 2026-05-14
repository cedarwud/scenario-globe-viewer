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
  "src/features/synthetic-fallback-fixture/synthetic-fallback-fixture-reviewer.ts"
);
const cliPath = path.join(
  repoRoot,
  "scripts/review-itri-synthetic-fallback-fixture.mjs"
);
const packageRelativePath =
  "output/validation/synthetic-fallback-fixtures/itri-s11r1-temp-fixture";

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
  const tempModuleDir = await mkdtemp(path.join(tmpdir(), "sgv-s11r1-unit-"));

  try {
    const source = await readFile(reviewerSourcePath, "utf8");
    const modulePath = path.join(tempModuleDir, "reviewer.mjs");

    await writeFile(
      modulePath,
      transpileTypeScript(source, "synthetic-fallback-fixture-reviewer.ts"),
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

function forbiddenConsumers() {
  return [
    "authority-verdict",
    "acceptance-report-closure",
    "measured-evidence-package",
    "external-validation-verdict",
    "physical-layer-verdict",
    "runtime-live-traffic-claim"
  ];
}

function nonClaims() {
  return {
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
}

function baseManifest() {
  return {
    schemaVersion: "itri.synthetic-fallback-fixture.v1",
    fixtureId: "itri-f07-f08-temp-synthetic-shape-v1",
    lanes: ["F-07", "F-08"],
    category: "parser-shape",
    generatedAt: "2026-05-14T00:00:00.000Z",
    sourceTier: "tier-3-synthetic",
    syntheticProvenance: {
      kind: "deterministic-generated",
      generator: "scripts/verify-itri-synthetic-fallback-fixture-reviewer.mjs",
      seed: "s11r1-temp-seed",
      inputAssumptions: [
        "Temp-only verifier manifest exercises fixture-readiness metadata."
      ],
      lineageNotes: [
        "Higher-tier material is absent from this temp-only verifier package."
      ],
      reviewedBy: "S11R1 temp reviewer"
    },
    intendedConsumers: [
      "ui-preview",
      "schema-rehearsal",
      "parser-shape-test",
      "smoke-selector",
      "negative-gap-rehearsal",
      "demo-placeholder"
    ],
    forbiddenConsumers: forbiddenConsumers(),
    maximumClaim:
      "deterministic synthetic readiness fixture for UI/schema/parser rehearsal",
    knownGaps: [
      "No higher-tier package material is present in this temp-only verifier."
    ],
    replacementTrigger:
      "Retire this fixture when higher-tier package material is supplied for the same lane.",
    nonClaims: nonClaims(),
    retainedPath: "fixtures/shape.json",
    artifactRefs: {
      notes: ["artifacts/notes.md"]
    },
    sourceArtifactRefs: ["source/source-shape.md"],
    rawRefs: ["raw/raw-placeholder.txt"]
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

function isWritableRef(ref) {
  return !path.isAbsolute(ref) &&
    !ref.startsWith("../") &&
    !ref.includes("/../") &&
    !/^[a-z][a-z0-9+.-]*:\/\//i.test(ref);
}

async function writePackage(repoRootForTest, manifest, reviewer, options = {}) {
  const packageRoot = path.join(repoRootForTest, packageRelativePath);
  const skipRefs = new Set(options.skipRefs ?? []);
  const refs = reviewer.collectItriSyntheticFallbackFixtureRetainedRefs(manifest);

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
  reviewItriSyntheticFallbackFixtureFromPath,
  repoRootForTest,
  options = {}
) {
  const review = await reviewItriSyntheticFallbackFixtureFromPath({
    packageInput: options.packagePath ?? packageRelativePath,
    manifestInput: options.manifestPath,
    repoRoot: repoRootForTest
  });

  return {
    status: review.packageState === "bounded-synthetic-fixture-ready" ? 0 : 1,
    review
  };
}

async function withTempRepo(action) {
  const tempRepo = await mkdtemp(path.join(tmpdir(), "sgv-s11r1-repo-"));

  try {
    return await action(tempRepo);
  } finally {
    await rm(tempRepo, { recursive: true, force: true });
  }
}

function assertGap(review, code) {
  assert(
    review.gaps.some((gap) => gap.code === code) ||
      review.laneReviews.some((entry) =>
        entry.gaps.some((gap) => gap.code === code)
      ),
    `Expected gap code ${code}.`
  );
}

function assertReviewStatesBounded(review) {
  const allowedStates = [
    "bounded-synthetic-fixture-ready",
    "incomplete",
    "missing",
    "rejected"
  ];

  assert(
    allowedStates.includes(review.packageState),
    `Unexpected package state ${review.packageState}.`
  );
  assert(
    review.laneReviews.every((entry) => allowedStates.includes(entry.reviewerState)),
    "Lane review states must stay inside the S11R1 bounded state set."
  );
}

function assertNonClaimsPreserved(review) {
  for (const [key, expectedValue] of Object.entries(nonClaims())) {
    assert.equal(
      review.nonClaims[key],
      expectedValue,
      `Reviewer output nonClaims.${key} must remain literal false.`
    );
  }
}

async function expectFailClosed(reviewFromPath, reviewer, label, mutate, expectedCode) {
  await withTempRepo(async (tempRepo) => {
    const manifest = baseManifest();
    mutate(manifest, tempRepo);
    await writePackage(tempRepo, manifest, reviewer);
    const result = await runCli(reviewFromPath, tempRepo);

    assert.equal(result.status, 1, `${label} must fail closed.`);
    assertGap(result.review, expectedCode);
    assertReviewStatesBounded(result.review);
    assertNonClaimsPreserved(result.review);
  });
}

async function main() {
  const { reviewer, cleanup } = await importReviewer();
  const { reviewItriSyntheticFallbackFixtureFromPath } = await import(
    pathToFileURL(cliPath).href
  );

  try {
    assert.equal(
      reviewer.isAllowedItriSyntheticFallbackFixturePackagePath(packageRelativePath),
      true,
      "Package path helper must allow S11 synthetic fallback fixture package paths."
    );
    assert.equal(
      reviewer.isAllowedItriSyntheticFallbackFixturePackagePath(
        "output/validation/external-f07-f09/not-s11"
      ),
      false,
      "Package path helper must reject unrelated validation roots."
    );

    await withTempRepo(async (tempRepo) => {
      const result = await runCli(reviewItriSyntheticFallbackFixtureFromPath, tempRepo);

      assert.equal(result.status, 1, "Missing package must fail closed.");
      assert.equal(result.review.packageState, "missing");
      assertGap(result.review, "package.missing");
      assertReviewStatesBounded(result.review);
      assertNonClaimsPreserved(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      const result = await runCli(reviewItriSyntheticFallbackFixtureFromPath, tempRepo, {
        packagePath: "output/validation/external-f07-f09/not-s11"
      });

      assert.equal(result.status, 1, "Wrong root must fail closed.");
      assert.equal(result.review.packageState, "rejected");
      assertGap(result.review, "package.path-outside-retained-root");
      assertReviewStatesBounded(result.review);
      assertNonClaimsPreserved(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      await mkdir(path.join(tempRepo, packageRelativePath), { recursive: true });
      const result = await runCli(reviewItriSyntheticFallbackFixtureFromPath, tempRepo);

      assert.equal(result.status, 1, "Missing manifest must fail closed.");
      assert.equal(result.review.packageState, "incomplete");
      assertGap(result.review, "manifest.missing");
      assertReviewStatesBounded(result.review);
      assertNonClaimsPreserved(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      await mkdir(path.join(tempRepo, packageRelativePath), { recursive: true });
      await writeTextFile(
        path.join(tempRepo, packageRelativePath),
        "manifest.json",
        "{ not-json"
      );
      const result = await runCli(reviewItriSyntheticFallbackFixtureFromPath, tempRepo);

      assert.equal(result.status, 1, "Malformed JSON must fail closed.");
      assert.equal(result.review.packageState, "incomplete");
      assertGap(result.review, "manifest.malformed-json");
      assertReviewStatesBounded(result.review);
      assertNonClaimsPreserved(result.review);
    });

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "Wrong schemaVersion",
      (manifest) => {
        manifest.schemaVersion = "itri.synthetic-fallback-fixture.v0";
      },
      "manifest.schema-version"
    );

    await withTempRepo(async (tempRepo) => {
      const manifest = baseManifest();
      await writePackage(tempRepo, manifest, reviewer);
      await writeTextFile(tempRepo, "outside-manifest.json", "{}\n");
      const result = await runCli(reviewItriSyntheticFallbackFixtureFromPath, tempRepo, {
        manifestPath: "outside-manifest.json"
      });

      assert.equal(
        result.status,
        1,
        "Explicit --manifest outside package must fail closed."
      );
      assert.equal(result.review.packageState, "rejected");
      assertGap(result.review, "manifest.path-outside-package");
      assertReviewStatesBounded(result.review);
      assertNonClaimsPreserved(result.review);
    });

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "Missing required metadata",
      (manifest) => {
        delete manifest.fixtureId;
      },
      "metadata.required-field-missing"
    );

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "Invalid lane",
      (manifest) => {
        manifest.lanes = ["F-99"];
      },
      "lanes.invalid"
    );

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "sourceTier outside S11 fallback tier",
      (manifest) => {
        manifest.sourceTier = "tier-1-itri-authority";
      },
      "source-tier.not-tier-3-synthetic"
    );

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "Missing syntheticProvenance fields",
      (manifest) => {
        delete manifest.syntheticProvenance.generator;
      },
      "synthetic-provenance.field-missing"
    );

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "Out-of-bound intendedConsumers",
      (manifest) => {
        manifest.intendedConsumers = [
          "schema-rehearsal",
          "authority-verdict",
          "measured-evidence-package"
        ];
      },
      "intended-consumers.not-bounded"
    );

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "Missing required forbiddenConsumers",
      (manifest) => {
        manifest.forbiddenConsumers = forbiddenConsumers().filter(
          (consumer) => consumer !== "authority-verdict"
        );
      },
      "forbidden-consumers.required-missing"
    );

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "maximumClaim too strong",
      (manifest) => {
        manifest.maximumClaim = "ready for accepted verdict";
      },
      "maximum-claim.too-strong"
    );

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "Empty knownGaps",
      (manifest) => {
        manifest.knownGaps = [];
      },
      "known-gaps.empty"
    );

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "Missing replacementTrigger",
      (manifest) => {
        delete manifest.replacementTrigger;
      },
      "replacement-trigger.missing"
    );

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "Missing nonClaims",
      (manifest) => {
        delete manifest.nonClaims;
      },
      "nonclaims.missing"
    );

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "nonClaims true",
      (manifest) => {
        manifest.nonClaims.externalValidationTruth = true;
      },
      "nonclaims.field-must-be-false"
    );

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "retainedPath escaping package",
      (manifest) => {
        manifest.retainedPath = "../outside.json";
      },
      "retained-ref.escapes-package"
    );

    await withTempRepo(async (tempRepo) => {
      const manifest = clone(baseManifest());
      await writePackage(tempRepo, manifest, reviewer, {
        skipRefs: ["fixtures/shape.json"]
      });
      const result = await runCli(reviewItriSyntheticFallbackFixtureFromPath, tempRepo);

      assert.equal(result.status, 1, "Unresolved retainedPath must fail closed.");
      assertGap(result.review, "retained-ref.unresolved");
      assertReviewStatesBounded(result.review);
      assertNonClaimsPreserved(result.review);
    });

    await expectFailClosed(
      reviewItriSyntheticFallbackFixtureFromPath,
      reviewer,
      "External URL retained ref",
      (manifest) => {
        manifest.retainedPath = "https://example.invalid/fixture.json";
      },
      "retained-ref.external-url"
    );

    await withTempRepo(async (tempRepo) => {
      const manifest = clone(baseManifest());
      await writePackage(tempRepo, manifest, reviewer);
      const result = await runCli(reviewItriSyntheticFallbackFixtureFromPath, tempRepo);

      assert.equal(
        result.status,
        0,
        "Positive temp-only manifest must reach bounded-synthetic-fixture-ready."
      );
      assert.equal(result.review.packageState, "bounded-synthetic-fixture-ready");
      assert.deepEqual(result.review.coveredLanes, ["F-07", "F-08"]);
      assert.equal(result.review.sourceTier, "tier-3-synthetic");
      assert.equal(result.review.syntheticProvenance.provenancePresent, true);
      assert.equal(result.review.consumerBoundary.missingForbiddenConsumers.length, 0);
      assert.equal(result.review.retainedRefSummary.escapedRefs.length, 0);
      assert.equal(result.review.retainedRefSummary.externalRefs.length, 0);
      assert.equal(result.review.retainedRefSummary.unresolvedRefs.length, 0);
      assert(
        result.review.laneReviews.every(
          (entry) => entry.reviewerState === "bounded-synthetic-fixture-ready"
        ),
        "Positive lane reviews must use only the bounded ready state."
      );
      assertReviewStatesBounded(result.review);
      assertNonClaimsPreserved(result.review);
    });
  } finally {
    await cleanup();
  }

  console.log(
    "S11R1 synthetic fallback fixture reviewer verifier passed: missing package, wrong root, missing manifest, malformed JSON, wrong schemaVersion, manifest-outside-package, metadata, lane, sourceTier, provenance, consumer, maximumClaim, knownGaps, replacementTrigger, nonClaims, retained-ref, and positive temp-only cases covered."
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
