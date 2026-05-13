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
  "src/features/measured-traffic-package/measured-traffic-package-reviewer.ts"
);
const cliPath = path.join(repoRoot, "scripts/review-itri-measured-traffic-package.mjs");
const packageRelativePath =
  "output/validation/external-f07-f09/2026-05-13T00-00-00Z-measured-traffic";

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
  const tempModuleDir = await mkdtemp(path.join(tmpdir(), "sgv-f07r1-unit-"));

  try {
    const source = await readFile(reviewerSourcePath, "utf8");
    const modulePath = path.join(tempModuleDir, "reviewer.mjs");

    await writeFile(
      modulePath,
      transpileTypeScript(source, "measured-traffic-package-reviewer.ts"),
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

function endpoint(endpointId, role) {
  return {
    endpointId,
    hostId: `${endpointId}-host`,
    role,
    hostnameRef: `topology/${endpointId}-hostname.txt`,
    ipCidrsRef: `topology/${endpointId}-ip.txt`,
    interfaceRefs: [`topology/${endpointId}-interfaces.json`],
    namespace: null,
    osRef: `topology/${endpointId}-os.txt`,
    commandTranscriptRefs: ["commands/transcript.jsonl"]
  };
}

function baseManifest() {
  return {
    schemaVersion: "itri.f07-f09.measured-traffic-package.v1",
    packageId: "itri-f07r1-temp-measured-package",
    runId: "itri-f07r1-temp-run",
    packagePath: packageRelativePath,
    capturedAt: "2026-05-13T00:00:00.000Z",
    capturedUntil: "2026-05-13T00:05:00.000Z",
    timezone: "UTC",
    validationOwner: {
      organization: "Temp validation owner",
      role: "package reviewer",
      authorityScope: ["F-07", "F-08", "F-09"],
      contactRef: null
    },
    redactionPolicy: {
      policyId: "temp-none",
      policyVersion: "v1",
      owner: "Temp validation owner",
      redactionLevel: "none",
      redactedCategories: [],
      packetCapturePolicy: "not-allowed",
      auditability: "full"
    },
    topologyId: "temp-topology",
    canonicalRoute: "/?scenePreset=regional&m8aV4GroundStationScene=1",
    toolVersions: {
      ping: "test-shape only",
      iperf3: "test-shape only",
      os: ["temp-linux"],
      importer: "f07r1-temp-reviewer",
      schemaValidator: "f07r1-temp-reviewer"
    },
    coveredRequirements: ["F-07", "F-08", "F-09"],
    relatedValidationRequirements: [],
    topology: {
      topologyId: "temp-topology",
      source: endpoint("source", "source"),
      target: endpoint("target", "target"),
      direction: "source-to-target",
      expectedPathRefs: ["topology/topology.md"],
      pathIndicators: {
        usesWindowsWsl: false,
        usesTunnel: false,
        usesBridge: false,
        usesNat: false,
        usesEstnetInet: false
      },
      dutInvolvement: {
        mode: "none",
        refs: [],
        notes: []
      },
      clockSync: {
        source: "temp clock note",
        maxKnownSkewMs: null,
        artifactRefs: ["commands/transcript.jsonl"],
        notes: ["Temp-only package shape test."]
      }
    },
    artifactRefs: {
      commandsTranscript: "commands/transcript.jsonl",
      pingLogs: [
        {
          ref: "raw/ping.log",
          commandId: "cmd-ping",
          sourceEndpointId: "source",
          targetEndpointId: "target",
          direction: "source-to-target",
          runWindow: {
            startedAt: "2026-05-13T00:00:00.000Z",
            endedAt: "2026-05-13T00:05:00.000Z"
          },
          expectedSampleCount: 5
        }
      ],
      iperf3ClientLogs: [
        {
          ref: "raw/iperf-client.json",
          commandId: "cmd-iperf-client",
          protocol: "tcp",
          direction: "source-to-target",
          port: 5201,
          durationSeconds: 60,
          intervalSeconds: 1,
          parallelStreams: 1
        }
      ],
      iperf3ServerLogs: [
        {
          ref: "raw/iperf-server.json",
          commandId: "cmd-iperf-server",
          serverEndpointId: "target",
          port: 5201,
          runWindow: {
            startedAt: "2026-05-13T00:00:00.000Z",
            endedAt: "2026-05-13T00:05:00.000Z"
          }
        }
      ],
      trafficGeneratorOutputs: [],
      packetCaptures: {
        allowed: false,
        captureRefs: [],
        policyRef: "packet-capture-policy.md",
        omissionReason: "Temp package omits packet capture by policy.",
        alternatePathEvidenceRefs: ["topology/topology.md"]
      },
      topology: [
        "topology/topology.md",
        "topology/source-hostname.txt",
        "topology/source-ip.txt",
        "topology/source-interfaces.json",
        "topology/source-os.txt",
        "topology/target-hostname.txt",
        "topology/target-ip.txt",
        "topology/target-interfaces.json",
        "topology/target-os.txt"
      ],
      redactions: "redactions.md"
    },
    parsedMetrics: [
      {
        metricId: "metric-f07-f08-rtt",
        requirementIds: ["F-07", "F-08"],
        sourceArtifactRefs: ["raw/ping.log"],
        direction: "source-to-target",
        sampleCount: {
          attempted: 5,
          received: 5,
          lost: 0,
          excluded: 0
        },
        duration: {
          plannedSeconds: 60,
          observedSeconds: 60,
          startedAt: "2026-05-13T00:00:00.000Z",
          endedAt: "2026-05-13T00:01:00.000Z"
        },
        rttDistributionMs: {
          min: 1,
          avg: 2,
          median: 2,
          p95: 3,
          p99: 3,
          max: 4,
          stddev: 0.5,
          source: "ping"
        },
        loss: {
          lostPackets: 0,
          totalPackets: 5,
          lossPct: 0,
          source: "ping"
        },
        computationMethod: {
          parserVersion: "temp-parser",
          manualReviewMethod: null,
          excludedRows: [],
          redactionEffects: []
        }
      },
      {
        metricId: "metric-f09-throughput",
        requirementIds: ["F-09"],
        sourceArtifactRefs: ["raw/iperf-client.json", "raw/iperf-server.json"],
        direction: "source-to-target",
        sampleCount: {
          attempted: 60,
          received: 60,
          lost: 0,
          excluded: 0
        },
        duration: {
          plannedSeconds: 60,
          observedSeconds: 60,
          startedAt: "2026-05-13T00:00:00.000Z",
          endedAt: "2026-05-13T00:01:00.000Z"
        },
        throughputIntervals: [
          {
            startedAt: "2026-05-13T00:00:00.000Z",
            endedAt: "2026-05-13T00:00:01.000Z",
            seconds: 1,
            bitsPerSecond: 1,
            bytesTransferred: 1,
            protocol: "tcp",
            streamCount: 1,
            retransmits: 0,
            lostPackets: null,
            lossPct: null
          }
        ],
        retransmitsOrLoss: {
          retransmits: 0
        },
        computationMethod: {
          parserVersion: "temp-parser",
          manualReviewMethod: null,
          excludedRows: [],
          redactionEffects: []
        }
      }
    ],
    thresholdAuthority: {
      thresholdOwner: null,
      thresholdVersion: null,
      approvedAt: null,
      requirementRules: [],
      unresolvedThresholdState: "owner-missing",
      unresolvedThresholdNotes: [
        "Temp package has no external threshold authority and remains import readiness only."
      ]
    },
    reviewerVerdicts: [
      {
        requirementId: "F-07",
        reviewerState: "importable",
        evidenceScope: "Temp package structural review only.",
        sourceArtifactRefs: ["raw/ping.log"],
        parsedMetricRefs: ["metric-f07-f08-rtt"],
        thresholdRuleRefs: [],
        relatedValidationRequirementRefs: [],
        reviewer: {
          nameOrRole: "Temp reviewer",
          reviewedAt: "2026-05-13T00:10:00.000Z",
          notes: ["No authority pass assigned."]
        }
      },
      {
        requirementId: "F-08",
        reviewerState: "importable",
        evidenceScope: "Temp package structural review only.",
        sourceArtifactRefs: ["raw/ping.log"],
        parsedMetricRefs: ["metric-f07-f08-rtt"],
        thresholdRuleRefs: [],
        relatedValidationRequirementRefs: [],
        reviewer: {
          nameOrRole: "Temp reviewer",
          reviewedAt: "2026-05-13T00:10:00.000Z",
          notes: ["No authority pass assigned."]
        }
      },
      {
        requirementId: "F-09",
        reviewerState: "importable",
        evidenceScope: "Temp package structural review only.",
        sourceArtifactRefs: ["raw/iperf-client.json", "raw/iperf-server.json"],
        parsedMetricRefs: ["metric-f09-throughput"],
        thresholdRuleRefs: [],
        relatedValidationRequirementRefs: [],
        reviewer: {
          nameOrRole: "Temp reviewer",
          reviewedAt: "2026-05-13T00:10:00.000Z",
          notes: ["No authority pass assigned."]
        }
      }
    ],
    syntheticFallbackBoundary: {
      s11ContractRef: "docs/data-contracts/itri-synthetic-fallback-fixtures.md",
      measuredPackageAllowsSyntheticSource: false,
      allowedSyntheticUses: [
        "schema-rehearsal",
        "parser-shape-test",
        "negative-gap-rehearsal"
      ],
      rejectMeasuredImportWhenSourceTierIsSynthetic: true
    },
    nonClaims: {
      schemaImportReadinessIsMeasuredTrafficTruth: false,
      externalValidationTruthFromImport: false,
      v02ThroughV06VerdictFromTrafficOnly: false,
      dutNatTunnelPathSuccessFromSchemaOnly: false,
      itriOrbitModelIntegration: false,
      radioLayerHandover: false,
      fullItriAcceptance: false
    }
  };
}

async function writeTextFile(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents, "utf8");
}

async function writePackage(repoRootForTest, manifest) {
  const packageRoot = path.join(repoRootForTest, packageRelativePath);
  const refs = [
    "commands/transcript.jsonl",
    "raw/ping.log",
    "raw/iperf-client.json",
    "raw/iperf-server.json",
    "packet-capture-policy.md",
    "topology/topology.md",
    "topology/source-hostname.txt",
    "topology/source-ip.txt",
    "topology/source-interfaces.json",
    "topology/source-os.txt",
    "topology/target-hostname.txt",
    "topology/target-ip.txt",
    "topology/target-interfaces.json",
    "topology/target-os.txt",
    "redactions.md"
  ];

  await mkdir(packageRoot, { recursive: true });

  for (const ref of refs) {
    await writeTextFile(packageRoot, ref, `temp-only ${ref}\n`);
  }

  await writeTextFile(
    packageRoot,
    "manifest.json",
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

async function runCli(reviewPackageFromPath, repoRootForTest, packagePath = packageRelativePath) {
  const review = await reviewPackageFromPath({
    packageInput: packagePath,
    repoRoot: repoRootForTest
  });

  return {
    status:
      review.packageState === "importable" ||
      review.packageState === "redacted-reviewable"
        ? 0
        : 1,
    review
  };
}

async function withTempRepo(action) {
  const tempRepo = await mkdtemp(path.join(tmpdir(), "sgv-f07r1-repo-"));

  try {
    return await action(tempRepo);
  } finally {
    await rm(tempRepo, { recursive: true, force: true });
  }
}

function assertNoAuthorityPassByDefault(review) {
  assert(
    review.requirementReviews.every(
      (entry) => entry.reviewerState !== "authority-pass"
    ),
    "Reviewer must not assign authority-pass by default."
  );
}

async function main() {
  const { reviewer, cleanup } = await importReviewer();
  const { reviewItriMeasuredTrafficPackageFromPath } = await import(
    pathToFileURL(cliPath).href
  );

  try {
    assert.equal(
      reviewer.isAllowedItriMeasuredTrafficPackagePath(packageRelativePath),
      true,
      "Package path helper must allow retained F-07/F-09 package paths."
    );
    assert.equal(
      reviewer.isAllowedItriMeasuredTrafficPackagePath(
        "output/validation/external-v02-v06/not-this-slice"
      ),
      false,
      "Package path helper must reject unrelated validation roots."
    );

    await withTempRepo(async (tempRepo) => {
      const result = await runCli(reviewItriMeasuredTrafficPackageFromPath, tempRepo);

      assert.equal(result.status, 1, "Missing package must fail closed.");
      assert.equal(result.review.packageState, "missing");
      assert.equal(result.review.requirementReviews.length, 3);
      assertNoAuthorityPassByDefault(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = baseManifest();
      await writePackage(tempRepo, manifest);
      const result = await runCli(reviewItriMeasuredTrafficPackageFromPath, tempRepo);

      assert.equal(result.status, 0, "Importable package must review cleanly.");
      assert.equal(result.review.packageState, "importable");
      assert.deepEqual(
        result.review.requirementReviews.map((entry) => entry.requirementId),
        ["F-07", "F-08", "F-09"]
      );
      assert.deepEqual(
        result.review.requirementReviews.map((entry) => entry.reviewerState),
        ["importable", "importable", "importable"]
      );
      assert.equal(result.review.thresholdAuthority.externalAuthorityRequired, true);
      assert.equal(result.review.thresholdAuthority.thresholdOwnerPresent, false);
      assert.equal(result.review.artifactRefSummary.unresolvedRefs.length, 0);
      assertNoAuthorityPassByDefault(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      await mkdir(path.join(tempRepo, packageRelativePath), { recursive: true });
      await writeTextFile(
        path.join(tempRepo, packageRelativePath),
        "manifest.json",
        "{ not-json"
      );
      const result = await runCli(reviewItriMeasuredTrafficPackageFromPath, tempRepo);

      assert.equal(result.status, 1, "Malformed manifest must fail closed.");
      assert.equal(result.review.packageState, "incomplete");
      assert(
        result.review.gaps.some((gap) => gap.code === "manifest.malformed-json"),
        "Malformed manifest must produce an actionable parse gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = {
        schemaVersion: "itri.f07-f09.measured-traffic-package.v1",
        packagePath: packageRelativePath,
        coveredRequirements: ["F-07"]
      };
      await writePackage(tempRepo, manifest);
      const result = await runCli(reviewItriMeasuredTrafficPackageFromPath, tempRepo);

      assert.equal(result.status, 1, "Incomplete manifest must fail closed.");
      assert.equal(result.review.packageState, "incomplete");
      assert(
        result.review.gaps.some(
          (gap) => gap.code === "manifest.required-field-missing"
        ),
        "Incomplete manifest must list missing required fields."
      );
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = {
        ...baseManifest(),
        sourceTier: "tier-3-synthetic",
        syntheticProvenance: {
          kind: "hand-authored-shape",
          generator: "verify script",
          seed: null,
          inputAssumptions: [],
          lineageNotes: [],
          reviewedBy: null
        }
      };
      await writePackage(tempRepo, manifest);
      const result = await runCli(reviewItriMeasuredTrafficPackageFromPath, tempRepo);

      assert.equal(result.status, 1, "Synthetic provenance must be rejected.");
      assert.equal(result.review.packageState, "rejected");
      assert.equal(result.review.syntheticProvenance.syntheticSourceDetected, true);
      assert(
        result.review.requirementReviews.every(
          (entry) => entry.reviewerState === "rejected"
        ),
        "Synthetic provenance must reject every measured requirement review."
      );
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = baseManifest();
      manifest.artifactRefs.pingLogs[0].ref = "../escaped-ping.log";
      await writePackage(tempRepo, manifest);
      const result = await runCli(reviewItriMeasuredTrafficPackageFromPath, tempRepo);

      assert.equal(result.status, 1, "Escaping artifact ref must be rejected.");
      assert.equal(result.review.packageState, "rejected");
      assert.deepEqual(result.review.artifactRefSummary.escapedRefs, [
        "../escaped-ping.log"
      ]);
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = baseManifest();
      manifest.reviewerVerdicts[2] = {
        ...manifest.reviewerVerdicts[2],
        reviewerState: "authority-pass",
        sourceArtifactRefs: [],
        thresholdRuleRefs: []
      };
      await writePackage(tempRepo, manifest);
      const result = await runCli(reviewItriMeasuredTrafficPackageFromPath, tempRepo);
      const f09Review = result.review.requirementReviews.find(
        (entry) => entry.requirementId === "F-09"
      );

      assert.equal(
        result.status,
        1,
        "Authority-pass request without raw refs and threshold authority must fail."
      );
      assert.equal(result.review.packageState, "incomplete");
      assert.equal(f09Review.reviewerState, "incomplete");
      assert(
        f09Review.gaps.some(
          (gap) => gap.code === "authority-pass.source-artifact-refs-missing"
        ),
        "Authority-pass request must require raw source artifact refs."
      );
      assert(
        f09Review.gaps.some(
          (gap) => gap.code === "authority-pass.threshold-owner-missing"
        ),
        "Authority-pass request must require external threshold owner."
      );
    });

    await withTempRepo(async (tempRepo) => {
      const result = await runCli(
        reviewItriMeasuredTrafficPackageFromPath,
        tempRepo,
        "output/validation/external-v02-v06/not-f07"
      );

      assert.equal(result.status, 1, "Wrong retained root must fail closed.");
      assert.equal(result.review.packageState, "rejected");
      assert(
        result.review.gaps.some(
          (gap) => gap.code === "package.path-outside-retained-root"
        ),
        "Wrong retained root must produce a path-boundary gap."
      );
    });
  } finally {
    await cleanup();
  }

  console.log(
    "F-07R1 measured-traffic package reviewer verifier passed: missing, malformed, incomplete, synthetic, escaping-ref, importable, authority-gated, and path-boundary cases covered."
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
