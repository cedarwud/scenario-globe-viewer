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
  "src/features/decision-threshold-authority/decision-threshold-authority-reviewer.ts"
);
const cliPath = path.join(
  repoRoot,
  "scripts/review-itri-f12-decision-threshold-authority.mjs"
);
const f12PackageRelativePath =
  "output/validation/external-f12/2026-05-13T00-00-00Z-decision-threshold-authority";
const measuredPackageRelativePath =
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
  const tempModuleDir = await mkdtemp(path.join(tmpdir(), "sgv-f12r1-unit-"));

  try {
    const source = await readFile(reviewerSourcePath, "utf8");
    const modulePath = path.join(tempModuleDir, "reviewer.mjs");

    await writeFile(
      modulePath,
      transpileTypeScript(source, "decision-threshold-authority-reviewer.ts"),
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

function measuredManifest({
  includeUnresolvedThresholdState = true,
  unresolvedThresholdState = "none"
} = {}) {
  const thresholdAuthority = {
    thresholdOwner: "Temp measured threshold owner",
    thresholdVersion: "f07r1-temp-thresholds-v1",
    approvedAt: "2026-05-13T00:06:00.000Z",
    requirementRules: [
      {
        ruleId: "rule-f07-rtt",
        requirementId: "F-07",
        metricName: "rttDistributionMs.avg",
        comparator: "<=",
        value: 50,
        unit: "ms",
        direction: "source-to-target",
        durationAssumption: "60s",
        sampleCountAssumption: "5 samples",
        artifactRefs: ["raw/ping.log"]
      },
      {
        ruleId: "rule-f08-jitter",
        requirementId: "F-08",
        metricName: "jitter.avgMs",
        comparator: "<=",
        value: 10,
        unit: "ms",
        direction: "source-to-target",
        durationAssumption: "60s",
        sampleCountAssumption: "5 samples",
        artifactRefs: ["raw/ping.log"]
      },
      {
        ruleId: "rule-f09-throughput",
        requirementId: "F-09",
        metricName: "throughputIntervals.bitsPerSecond",
        comparator: ">=",
        value: 1000000,
        unit: "bps",
        direction: "source-to-target",
        durationAssumption: "60s",
        sampleCountAssumption: "60 intervals",
        artifactRefs: ["raw/iperf-client.json", "raw/iperf-server.json"]
      }
    ],
    unresolvedThresholdNotes:
      unresolvedThresholdState === "none"
        ? []
        : ["Temp negative case leaves measured thresholds unresolved."]
  };

  if (includeUnresolvedThresholdState) {
    thresholdAuthority.unresolvedThresholdState = unresolvedThresholdState;
  }

  return {
    schemaVersion: "itri.f07-f09.measured-traffic-package.v1",
    packageId: "itri-f07r1-temp-measured-package",
    runId: "itri-f07r1-temp-run",
    packagePath: measuredPackageRelativePath,
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
        jitter: {
          minMs: 0.5,
          avgMs: 1,
          maxMs: 2,
          jitterSource: "owner-approved-log",
          methodNotes: ["Temp-only shape."]
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
            bitsPerSecond: 1000000,
            bytesTransferred: 125000,
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
    thresholdAuthority,
    reviewerVerdicts: [
      {
        requirementId: "F-07",
        reviewerState: "importable",
        evidenceScope: "Temp package structural review only.",
        sourceArtifactRefs: ["raw/ping.log"],
        parsedMetricRefs: ["metric-f07-f08-rtt"],
        thresholdRuleRefs: ["rule-f07-rtt"],
        relatedValidationRequirementRefs: [],
        reviewer: {
          nameOrRole: "Temp reviewer",
          reviewedAt: "2026-05-13T00:10:00.000Z",
          notes: ["No measured decision truth assigned."]
        }
      },
      {
        requirementId: "F-08",
        reviewerState: "importable",
        evidenceScope: "Temp package structural review only.",
        sourceArtifactRefs: ["raw/ping.log"],
        parsedMetricRefs: ["metric-f07-f08-rtt"],
        thresholdRuleRefs: ["rule-f08-jitter"],
        relatedValidationRequirementRefs: [],
        reviewer: {
          nameOrRole: "Temp reviewer",
          reviewedAt: "2026-05-13T00:10:00.000Z",
          notes: ["No measured decision truth assigned."]
        }
      },
      {
        requirementId: "F-09",
        reviewerState: "importable",
        evidenceScope: "Temp package structural review only.",
        sourceArtifactRefs: ["raw/iperf-client.json", "raw/iperf-server.json"],
        parsedMetricRefs: ["metric-f09-throughput"],
        thresholdRuleRefs: ["rule-f09-throughput"],
        relatedValidationRequirementRefs: [],
        reviewer: {
          nameOrRole: "Temp reviewer",
          reviewedAt: "2026-05-13T00:10:00.000Z",
          notes: ["No measured decision truth assigned."]
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

function f12Manifest({ reviewerState = "schema-ready" } = {}) {
  return {
    schemaVersion: "itri.f12.decision-threshold-authority.v1",
    authorityId: "itri-f12r1-temp-authority",
    owner: {
      organization: "Temp authority owner",
      role: "threshold authority",
      authorityScope: ["F-12"],
      contactRef: null
    },
    receivedAt: "2026-05-13T00:20:00.000Z",
    thresholdVersion: "f12-temp-thresholds-v1",
    ruleVersion: "f12-temp-rules-v1",
    reviewer: {
      nameOrRole: "Temp F-12 reviewer",
      organization: "Temp review org",
      reviewedAt: "2026-05-13T00:30:00.000Z",
      reviewScope: ["F-12"],
      notes: ["Temp-only F-12 package review."]
    },
    redactionPolicy: {
      policyId: "temp-none",
      policyVersion: "v1",
      owner: "Temp authority owner",
      redactedCategories: [],
      auditability: "full",
      useRestrictions: []
    },
    useNotes: ["Temp package-review state only."],
    coveredRequirements: ["F-12"],
    measuredPackageRefs: [
      {
        packageId: "itri-f07r1-temp-measured-package",
        packagePath: measuredPackageRelativePath,
        requirementIds: ["F-07", "F-08", "F-09"],
        reviewerVerdictRefs: [
          "reviews/f07.json",
          "reviews/f08.json",
          "reviews/f09.json"
        ],
        parsedMetricRefs: ["metric-f07-f08-rtt", "metric-f09-throughput"],
        sourceArtifactRefs: [
          "raw/ping.log",
          "raw/iperf-client.json",
          "raw/iperf-server.json"
        ],
        thresholdRuleRefs: [
          "rule-f07-rtt",
          "rule-f08-jitter",
          "rule-f09-throughput"
        ],
        handoverEventRefs: ["events/handover-events.json"],
        notes: ["Temp F-12 package points to F-07R1 review states."]
      }
    ],
    thresholdAuthority: {
      owner: "Temp F-12 threshold owner",
      version: "f12-temp-thresholds-v1",
      approvalRecord: {
        approver: "Temp approver",
        approvedAt: "2026-05-13T00:25:00.000Z",
        approvalRef: "authority/approval.md",
        requirementScope: ["F-12"]
      },
      requirementScope: ["F-12"],
      effectiveDate: "2026-05-13T00:00:00.000Z",
      supersessionPolicy: "Temp package supersedes no production authority.",
      redactionUseNotes: [],
      unresolvedState: "none",
      unresolvedNotes: []
    },
    decisionRules: [
      {
        ruleId: "f12-latency-temp",
        ruleVersion: "f12-temp-rules-v1",
        inputField: "latency",
        measuredFieldRef: "metric-f07-f08-rtt",
        comparator: "<=",
        thresholdValue: 50,
        unit: "ms",
        weight: 1,
        priority: "1",
        tieBreaker: ["stable-serving"],
        hysteresis: {
          mode: "none",
          value: null,
          unit: null,
          notes: []
        },
        fallback: {
          behavior: "reject-rule",
          notes: ["Fail closed when measured RTT is unavailable."]
        },
        missingFieldBehavior: "reject-rule",
        sampleWindowBasis: {
          windowId: "window-f12-temp",
          startedAt: "2026-05-13T00:00:00.000Z",
          endedAt: "2026-05-13T00:05:00.000Z",
          timezone: "UTC",
          basis: "fixed-duration",
          durationSeconds: {
            planned: 300,
            observed: 300
          },
          sampleCount: {
            attempted: 5,
            received: 5,
            lost: 0,
            excluded: 0
          },
          aggregation: "avg",
          direction: "source-to-target",
          eventRefs: ["events/handover-events.json"],
          clockSyncRef: "commands/transcript.jsonl"
        },
        applicability: ["temp retained package scope"],
        reviewNotes: ["Temp authority package review only."]
      },
      {
        ruleId: "f12-network-speed-temp",
        ruleVersion: "f12-temp-rules-v1",
        inputField: "networkSpeed",
        measuredFieldRef: "metric-f09-throughput",
        comparator: ">=",
        thresholdValue: 1000000,
        unit: "bps",
        weight: 1,
        priority: "2",
        tieBreaker: ["stable-serving"],
        hysteresis: {
          mode: "none",
          value: null,
          unit: null,
          notes: []
        },
        fallback: {
          behavior: "reject-rule",
          notes: ["Fail closed when measured throughput is unavailable."]
        },
        missingFieldBehavior: "reject-rule",
        sampleWindowBasis: {
          windowId: "window-f12-temp",
          startedAt: "2026-05-13T00:00:00.000Z",
          endedAt: "2026-05-13T00:05:00.000Z",
          timezone: "UTC",
          basis: "fixed-duration",
          durationSeconds: {
            planned: 300,
            observed: 300
          },
          sampleCount: {
            attempted: 60,
            received: 60,
            lost: 0,
            excluded: 0
          },
          aggregation: "interval mean",
          direction: "source-to-target",
          eventRefs: ["events/handover-events.json"],
          clockSyncRef: "commands/transcript.jsonl"
        },
        applicability: ["temp retained package scope"],
        reviewNotes: ["Temp authority package review only."]
      }
    ],
    reviewerState,
    syntheticFallbackBoundary: {
      s11ContractRef: "docs/data-contracts/itri-synthetic-fallback-fixtures.md",
      authorityPackageAllowsSyntheticSource: false,
      allowedSyntheticUses: [
        "schema-rehearsal",
        "negative-gap-rehearsal",
        "ranking-shape-example"
      ],
      rejectAuthorityReviewWhenSourceTierIsSynthetic: true
    },
    nonClaims: {
      liveControl: false,
      measuredDecisionTruth: false,
      nativeRadioFrequencyHandover: false,
      externalTrafficControl: false,
      completeItriAcceptance: false,
      externalValidationVerdict: false,
      dutNatTunnelVerdict: false,
      itriOrbitModelIntegration: false,
      boundedProxyIsAuthorityRule: false
    }
  };
}

async function writeTextFile(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents, "utf8");
}

async function writeMeasuredPackage(repoRootForTest, manifest) {
  const packageRoot = path.join(repoRootForTest, measuredPackageRelativePath);
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

async function writeF12Package(repoRootForTest, manifest) {
  const packageRoot = path.join(repoRootForTest, f12PackageRelativePath);
  const refs = [
    "authority/approval.md",
    "reviews/f07.json",
    "reviews/f08.json",
    "reviews/f09.json",
    "events/handover-events.json",
    "raw/ping.log",
    "raw/iperf-client.json",
    "raw/iperf-server.json",
    "metric-f07-f08-rtt",
    "metric-f09-throughput",
    "metric-unreviewed-extra",
    "metric-unreviewed-latency",
    "rule-f07-rtt",
    "rule-f08-jitter",
    "rule-f09-throughput",
    "rule-unreviewed-extra",
    "commands/transcript.jsonl"
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

async function runCli(
  reviewItriF12DecisionThresholdAuthorityFromPath,
  repoRootForTest,
  packagePath = f12PackageRelativePath
) {
  const review = await reviewItriF12DecisionThresholdAuthorityFromPath({
    packageInput: packagePath,
    repoRoot: repoRootForTest
  });

  return {
    status:
      review.packageState === "schema-ready" ||
      review.packageState === "authority-ready"
        ? 0
        : 1,
    review
  };
}

async function withTempRepo(action) {
  const tempRepo = await mkdtemp(path.join(tmpdir(), "sgv-f12r1-repo-"));

  try {
    return await action(tempRepo);
  } finally {
    await rm(tempRepo, { recursive: true, force: true });
  }
}

function assertNoAuthorityReadyByDefault(review) {
  assert.notEqual(
    review.packageState,
    "authority-ready",
    "Reviewer must not assign authority-ready by default."
  );
}

function assertHasGap(review, code, message) {
  assert(
    review.gaps.some((gap) => gap.code === code),
    message
  );
}

async function main() {
  const { reviewer, cleanup } = await importReviewer();
  const { reviewItriF12DecisionThresholdAuthorityFromPath } = await import(
    pathToFileURL(cliPath).href
  );

  try {
    assert.equal(
      reviewer.isAllowedItriF12DecisionThresholdAuthorityPackagePath(
        f12PackageRelativePath
      ),
      true,
      "F-12 package path helper must allow retained external-f12 package paths."
    );
    assert.equal(
      reviewer.isAllowedItriF12DecisionThresholdAuthorityPackagePath(
        measuredPackageRelativePath
      ),
      false,
      "F-12 package path helper must reject measured package roots."
    );
    assert.equal(
      reviewer.isAllowedItriF12ReferencedMeasuredTrafficPackagePath(
        measuredPackageRelativePath
      ),
      true,
      "F-12 measured ref helper must allow retained F-07/F-09 package paths."
    );

    await withTempRepo(async (tempRepo) => {
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(result.status, 1, "Missing F-12 package must fail closed.");
      assert.equal(result.review.packageState, "missing");
      assertNoAuthorityReadyByDefault(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      await mkdir(path.join(tempRepo, f12PackageRelativePath), { recursive: true });
      await writeTextFile(
        path.join(tempRepo, f12PackageRelativePath),
        "manifest.json",
        "{ not-json"
      );
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(result.status, 1, "Malformed F-12 manifest must fail closed.");
      assert.equal(result.review.packageState, "pending-measured-fields");
      assert(
        result.review.gaps.some((gap) => gap.code === "manifest.malformed-json"),
        "Malformed F-12 manifest must produce an actionable parse gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeF12Package(tempRepo, {
        schemaVersion: "itri.f12.decision-threshold-authority.v1",
        authorityId: "incomplete"
      });
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(result.status, 1, "Incomplete F-12 manifest must fail closed.");
      assert(
        result.review.gaps.some(
          (gap) => gap.code === "manifest.required-field-missing"
        ),
        "Incomplete F-12 manifest must list missing required fields."
      );
      assertNoAuthorityReadyByDefault(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      await writeF12Package(tempRepo, f12Manifest());
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(result.status, 0, "Schema-ready package must review cleanly.");
      assert.equal(result.review.packageState, "schema-ready");
      assertNoAuthorityReadyByDefault(result.review);
      assert.equal(result.review.measuredPackageReviews.length, 1);
      assert.equal(
        result.review.measuredPackageReviews[0].thresholdAuthority.unresolvedThresholdState,
        "none"
      );
      assert.equal(result.review.artifactRefSummary.unresolvedRefs.length, 0);
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      await writeF12Package(tempRepo, f12Manifest({ reviewerState: "authority-ready" }));
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(
        result.status,
        0,
        "Explicit authority-ready package with sufficient F-07R1 gates must pass review."
      );
      assert.equal(result.review.packageState, "authority-ready");
      assert.equal(result.review.thresholdAuthority.unresolvedState, "none");
      assert(
        result.review.measuredPackageReviews.every(
          (entry) => entry.thresholdAuthority.thresholdStateReady
        ),
        "Referenced measured packages must expose thresholdStateReady=true."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      const manifest = f12Manifest({ reviewerState: "authority-ready" });
      manifest.measuredPackageRefs[0].parsedMetricRefs.push(
        "metric-unreviewed-extra"
      );
      await writeF12Package(tempRepo, manifest);
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(
        result.status,
        1,
        "Extra unreviewed parsedMetricRef mixed with reviewed refs must fail closed."
      );
      assert.notEqual(result.review.packageState, "authority-ready");
      assertHasGap(
        result.review,
        "measured-package.parsed-metric-ref-not-reviewed",
        "Mixed reviewed and unreviewed parsedMetricRefs must produce an exhaustive coverage gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      const manifest = f12Manifest({ reviewerState: "authority-ready" });
      manifest.measuredPackageRefs[0].thresholdRuleRefs.push(
        "rule-unreviewed-extra"
      );
      await writeF12Package(tempRepo, manifest);
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(
        result.status,
        1,
        "Extra unreviewed thresholdRuleRef mixed with reviewed refs must fail closed."
      );
      assert.notEqual(result.review.packageState, "authority-ready");
      assertHasGap(
        result.review,
        "measured-package.threshold-rule-ref-not-reviewed",
        "Mixed reviewed and unreviewed thresholdRuleRefs must produce an exhaustive coverage gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      const manifest = f12Manifest({ reviewerState: "authority-ready" });
      manifest.measuredPackageRefs[0].parsedMetricRefs.push(
        "metric-unreviewed-latency"
      );
      manifest.decisionRules[0].measuredFieldRef = "metric-unreviewed-latency";
      await writeF12Package(tempRepo, manifest);
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(
        result.status,
        1,
        "Decision rule measuredFieldRef pointing to an unreviewed metric must fail closed even when another valid metric exists."
      );
      assert.notEqual(result.review.packageState, "authority-ready");
      assertHasGap(
        result.review,
        "decision-rule.measured-field-ref-not-reviewed",
        "Unreviewed decisionRules[].measuredFieldRef must produce a rule-level coverage gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      const manifest = f12Manifest({ reviewerState: "authority-ready" });
      manifest.measuredPackageRefs[0].requirementIds = ["F-07", "F-08"];
      await writeF12Package(tempRepo, manifest);
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(
        result.status,
        1,
        "Throughput/networkSpeed rules that reference an F-09 metric while measuredPackageRefs omits F-09 must fail closed."
      );
      assert.notEqual(result.review.packageState, "authority-ready");
      assertHasGap(
        result.review,
        "decision-rule.measured-field-ref-not-reviewed",
        "F-09 throughput coverage must be required for networkSpeed measuredFieldRef authority readiness."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      const manifest = f12Manifest({ reviewerState: "authority-ready" });
      delete manifest.decisionRules[0].unit;
      await writeF12Package(tempRepo, manifest);
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(result.status, 1, "Missing decision rule unit must fail closed.");
      assert.equal(result.review.packageState, "pending-threshold-authority");
      assertHasGap(
        result.review,
        "decision-rule.unit-missing",
        "Missing decisionRules[].unit must produce a rule semantics gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      const manifest = f12Manifest({ reviewerState: "authority-ready" });
      delete manifest.decisionRules[0].weight;
      await writeF12Package(tempRepo, manifest);
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(result.status, 1, "Missing decision rule weight must fail closed.");
      assert.equal(result.review.packageState, "pending-threshold-authority");
      assertHasGap(
        result.review,
        "decision-rule.weight-missing",
        "Missing decisionRules[].weight must produce a rule semantics gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      const manifest = f12Manifest({ reviewerState: "authority-ready" });
      manifest.decisionRules[0].fallback = {
        behavior: "use-bounded-proxy",
        notes: ["Unsafe bounded-proxy fallback must fail closed."]
      };
      await writeF12Package(tempRepo, manifest);
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(
        result.status,
        1,
        "Unsafe bounded-proxy fallback behavior must fail closed."
      );
      assert.equal(result.review.packageState, "rejected");
      assertHasGap(
        result.review,
        "bounded-proxy.authority-disallowed",
        "Bounded-proxy fallback must produce an authority disallowed gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(
        tempRepo,
        measuredManifest({ includeUnresolvedThresholdState: false })
      );
      await writeF12Package(tempRepo, f12Manifest({ reviewerState: "authority-ready" }));
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(
        result.status,
        1,
        "Referenced F-07R1 package with missing unresolved threshold state must fail closed."
      );
      assert.notEqual(result.review.packageState, "authority-ready");
      assert(
        result.review.gaps.some(
          (gap) => gap.code === "measured-package.threshold-unresolved-state-not-none"
        ),
        "Missing measured unresolvedThresholdState must produce a blocking F-12 gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(
        tempRepo,
        measuredManifest({ unresolvedThresholdState: "pending-review" })
      );
      await writeF12Package(tempRepo, f12Manifest({ reviewerState: "authority-ready" }));
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(
        result.status,
        1,
        "Referenced F-07R1 package with non-none unresolved threshold state must fail closed."
      );
      assert.notEqual(result.review.packageState, "authority-ready");
      assert(
        result.review.gaps.some(
          (gap) => gap.code === "measured-package.threshold-unresolved-state-not-none"
        ),
        "Non-none measured unresolvedThresholdState must produce a blocking F-12 gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      const manifest = f12Manifest({ reviewerState: "authority-ready" });
      delete manifest.thresholdAuthority.unresolvedState;
      await writeF12Package(tempRepo, manifest);
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(
        result.status,
        1,
        "F-12 authority package with missing unresolvedState must fail closed."
      );
      assert.equal(result.review.packageState, "pending-threshold-authority");
      assert(
        result.review.gaps.some(
          (gap) => gap.code === "threshold-authority.unresolved-state-not-none"
        ),
        "Missing F-12 thresholdAuthority.unresolvedState must produce a blocking gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      const manifest = {
        ...f12Manifest({ reviewerState: "authority-ready" }),
        sourceTier: "tier-3-synthetic",
        syntheticProvenance: {
          kind: "hand-authored-shape",
          generator: "verify script"
        }
      };
      await writeF12Package(tempRepo, manifest);
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(result.status, 1, "Synthetic F-12 package must be rejected.");
      assert.equal(result.review.packageState, "rejected");
      assert.equal(result.review.syntheticProvenance.syntheticSourceDetected, true);
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      const manifest = f12Manifest({ reviewerState: "authority-ready" });
      manifest.measuredPackageRefs[0].packagePath =
        "output/validation/external-v02-v06/not-f07";
      await writeF12Package(tempRepo, manifest);
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(
        result.status,
        1,
        "Measured package path outside external-f07-f09 must fail closed."
      );
      assert.equal(result.review.packageState, "rejected");
      assert(
        result.review.gaps.some(
          (gap) => gap.code === "measured-package.path-outside-retained-root"
        ),
        "Wrong measured package root must produce a path-boundary gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await writeMeasuredPackage(tempRepo, measuredManifest());
      const manifest = f12Manifest({ reviewerState: "authority-ready" });
      manifest.measuredPackageRefs[0].reviewerVerdictRefs = ["../escaped-review.json"];
      await writeF12Package(tempRepo, manifest);
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo
      );

      assert.equal(result.status, 1, "Escaping F-12 artifact ref must be rejected.");
      assert.equal(result.review.packageState, "rejected");
      assert.deepEqual(result.review.artifactRefSummary.escapedRefs, [
        "../escaped-review.json"
      ]);
    });

    await withTempRepo(async (tempRepo) => {
      const result = await runCli(
        reviewItriF12DecisionThresholdAuthorityFromPath,
        tempRepo,
        "output/validation/external-f07-f09/not-f12"
      );

      assert.equal(result.status, 1, "Wrong retained F-12 root must fail closed.");
      assert.equal(result.review.packageState, "rejected");
      assert(
        result.review.gaps.some(
          (gap) => gap.code === "package.path-outside-retained-root"
        ),
        "Wrong retained F-12 root must produce a path-boundary gap."
      );
    });
  } finally {
    await cleanup();
  }

  console.log(
    "F-12R1 decision-threshold authority reviewer verifier passed: missing, malformed, incomplete, schema-ready, explicit authority-ready, exhaustive measured refs, rule measuredFieldRef coverage, F-09 omission, rule semantics, synthetic, unresolved-threshold, escaping-ref, and path-boundary cases covered."
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
