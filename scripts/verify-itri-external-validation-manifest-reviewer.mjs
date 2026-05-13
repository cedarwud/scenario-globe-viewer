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
  "src/features/external-validation-manifest/external-validation-manifest-reviewer.ts"
);
const cliPath = path.join(
  repoRoot,
  "scripts/review-itri-external-validation-manifest.mjs"
);
const packageRelativePath =
  "output/validation/external-v02-v06/2026-05-13T00-00-00Z-external-validation";

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
  const tempModuleDir = await mkdtemp(path.join(tmpdir(), "sgv-v02r1-unit-"));

  try {
    const source = await readFile(reviewerSourcePath, "utf8");
    const modulePath = path.join(tempModuleDir, "reviewer.mjs");

    await writeFile(
      modulePath,
      transpileTypeScript(source, "external-validation-manifest-reviewer.ts"),
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
    role,
    hostId: `${endpointId}-host`,
    hostnameRef: `topology/${endpointId}-hostname.txt`,
    ipCidrsRef: `topology/${endpointId}-ip.txt`,
    interfaceRefs: [`topology/${endpointId}-interface.json`],
    namespace: null,
    osRef: `topology/${endpointId}-os.txt`,
    commandTranscriptRefs: ["commands/transcript.jsonl"]
  };
}

function trafficPath(requirementId, pathId, extra = {}) {
  return {
    pathId,
    requirementIds: [requirementId],
    sourceEndpointId: "windows-host",
    targetEndpointId: "wsl-guest",
    tool: "ping",
    protocol: "icmp",
    expectedRouteRefs: [`topology/${pathId}-expected-route.json`],
    tunnelRefs: requirementId === "V-03" ? ["topology/tunnel-config.json"] : [],
    bridgeRefs: requirementId === "V-03" ? ["topology/bridge-config.json"] : [],
    natRoutingRefs: requirementId === "V-04" ? ["nat-rules/inet-nat.txt"] : [],
    dutRefs: requirementId === "V-05" ? ["dut/virtual/identity.json"] : [],
    generatorRefs: requirementId === "V-06" ? ["ne-one/profile.json"] : [],
    rawLogRefs: [`traffic/${pathId}.log`],
    resultClassification: "success",
    ...extra
  };
}

function reviewerVerdict(requirementId, sourceArtifactRefs, ownerVerdictRefs) {
  return {
    requirementId,
    reviewerState: "authority-pass",
    evidenceScope: `${requirementId} temp-only retained local package scope.`,
    sourceArtifactRefs,
    ownerVerdictRefs,
    relatedMeasuredTrafficPackageRefs: [],
    reviewer: {
      nameOrRole: "Temp V-02R1 reviewer",
      reviewedAt: "2026-05-13T00:20:00.000Z",
      notes: [
        "Temp-only package proves retained local package-review gates without live execution."
      ]
    }
  };
}

function baseManifest() {
  return {
    schemaVersion: "itri.v02-v06.external-validation-manifest.v1",
    packageId: "itri-v02r1-temp-external-validation",
    runId: "itri-v02r1-temp-run",
    packagePath: packageRelativePath,
    capturedAt: "2026-05-13T00:00:00.000Z",
    capturedUntil: "2026-05-13T00:10:00.000Z",
    timezone: "UTC",
    validationOwner: {
      organization: "Temp validation owner",
      role: "external validation owner",
      authorityScope: ["V-02", "V-03", "V-04", "V-05", "V-06"],
      contactRef: null,
      ownerVerdictRefs: ["owner/common-verdict.md"]
    },
    redactionPolicy: {
      policyId: "temp-none",
      policyVersion: "v1",
      owner: "Temp validation owner",
      redactionLevel: "none",
      redactedCategories: [],
      packetCapturePolicy: "not-allowed",
      auditability: "full",
      policyRef: "redactions/policy.md",
      redactionNotes: ["Temp package has no redaction."]
    },
    reviewer: {
      nameOrRole: "Temp V-02R1 reviewer",
      reviewedAt: "2026-05-13T00:20:00.000Z",
      reviewScope: ["V-02", "V-03", "V-04", "V-05", "V-06"],
      notes: ["Temp-only package review."]
    },
    coveredRequirements: ["V-02", "V-03", "V-04", "V-05", "V-06"],
    environment: {
      windows: {
        hostId: "windows-host",
        osName: "Windows",
        osVersion: "temp",
        build: "temp-build",
        architecture: "x64",
        hostnameRef: "environment/windows-hostname.txt",
        timezone: "UTC",
        sourceCommandRefs: ["environment/windows-version.txt"]
      },
      wsl: {
        hostId: "wsl-guest",
        osName: "Ubuntu",
        osVersion: "temp",
        build: null,
        architecture: "x64",
        hostnameRef: "environment/wsl-hostname.txt",
        timezone: "UTC",
        sourceCommandRefs: ["environment/wsl-version.txt"],
        distroName: "Ubuntu",
        distroRelease: "temp",
        wslVersion: "2",
        wslMode: "nat",
        kernelVersion: "temp-kernel"
      },
      linux: {
        hostId: "linux-helper",
        osName: "Linux",
        osVersion: "temp",
        build: null,
        architecture: "x64",
        hostnameRef: "environment/linux-hostname.txt",
        timezone: "UTC",
        sourceCommandRefs: ["environment/linux-version.txt"]
      },
      interfaces: [
        {
          interfaceId: "win-iface",
          hostId: "windows-host",
          interfaceName: "Ethernet",
          kind: "ethernet",
          macAddressRef: "interfaces/windows-mac.txt",
          ipCidrsRef: "interfaces/windows-ip.txt",
          mtu: 1500,
          state: "up",
          namespace: null,
          sourceCommandRef: "interfaces/windows.json"
        },
        {
          interfaceId: "wsl-iface",
          hostId: "wsl-guest",
          interfaceName: "eth0",
          kind: "virtual",
          macAddressRef: "interfaces/wsl-mac.txt",
          ipCidrsRef: "interfaces/wsl-ip.txt",
          mtu: 1500,
          state: "up",
          namespace: "wsl",
          sourceCommandRef: "interfaces/wsl.json"
        }
      ],
      routes: [
        {
          routeId: "win-default",
          hostId: "windows-host",
          destination: "0.0.0.0/0",
          gateway: "redacted",
          interfaceName: "Ethernet",
          metric: 10,
          table: null,
          namespace: null,
          sourceCommandRef: "routes/windows.json"
        },
        {
          routeId: "wsl-default",
          hostId: "wsl-guest",
          destination: "0.0.0.0/0",
          gateway: "redacted",
          interfaceName: "eth0",
          metric: 10,
          table: "main",
          namespace: "wsl",
          sourceCommandRef: "routes/wsl.json"
        }
      ],
      toolVersions: {
        ping: "temp ping",
        iperf3: "temp iperf3",
        packetCapture: "temp capture",
        natTooling: ["temp nat"],
        tunnelBridge: ["temp bridge"],
        estnet: "temp estnet",
        omnetpp: "temp omnetpp",
        inet: "temp inet",
        dutTestbench: "temp dut",
        neOne: "temp ne-one",
        importer: "v02r1 temp reviewer",
        schemaValidator: "v02r1 temp reviewer"
      },
      clockSync: {
        source: "temp",
        maxKnownSkewMs: 1,
        artifactRefs: ["environment/clock-sync.txt"],
        notes: ["Temp-only clock sync note."]
      }
    },
    topology: {
      topologyId: "temp-topology",
      diagramRefs: ["topology/topology.md"],
      endpoints: [
        endpoint("windows-host", "windows-host"),
        endpoint("wsl-guest", "wsl"),
        endpoint("sim-node", "simulation-node"),
        endpoint("virtual-dut", "virtual-dut"),
        endpoint("physical-dut", "physical-dut"),
        endpoint("generator", "traffic-generator")
      ],
      tunnelRefs: [
        {
          tunnelId: "temp-tunnel",
          localEndpoint: "windows-host",
          remoteEndpoint: "wsl-guest",
          bindAddressRef: "topology/tunnel-bind.txt",
          remoteAddressRef: "topology/tunnel-remote.txt",
          protocol: "udp",
          port: 5000,
          processRef: "topology/tunnel-process.txt",
          configRefs: ["topology/tunnel-config.json"],
          logRefs: ["logs/tunnel.log"]
        }
      ],
      bridgeRefs: [
        {
          bridgeId: "temp-bridge",
          processRef: "topology/bridge-process.txt",
          commandLineRef: "topology/bridge-command.txt",
          configRefs: ["topology/bridge-config.json"],
          interfaceRefs: ["topology/bridge-interfaces.json"],
          namespace: "wsl",
          versionOrCommit: "temp",
          logRefs: ["logs/bridge.log"],
          expectedDirection: "source-to-target"
        }
      ],
      natRoutingRefs: [
        {
          ruleId: "inet-nat",
          hostId: "sim-node",
          tool: "inet-config",
          table: "nat",
          chain: "postrouting",
          matchSummary: "temp",
          actionSummary: "temp",
          sourceCommandRef: "nat-rules/inet-command.txt",
          rawRef: "nat-rules/inet-nat.txt"
        }
      ],
      estnetInetScenarioRefs: [
        {
          scenarioId: "temp-estnet",
          estnetVersion: "temp",
          omnetppVersion: "temp",
          inetVersion: "temp",
          moduleMapRefs: ["estnet/module-map.json"],
          runParameterRefs: ["estnet/run-params.json"],
          nodeRefs: ["estnet/nodes.json"],
          logRefs: ["logs/estnet.log"]
        }
      ],
      gatewayMapping: [
        {
          gatewayId: "temp-gateway",
          sourceSubnetRef: "topology/source-subnet.txt",
          destinationSubnetRef: "topology/destination-subnet.txt",
          natRuleRefs: ["nat-rules/inet-nat.txt"],
          routeRefs: ["routes/estnet-inet.json"],
          hostInterfaceRefs: ["interfaces/windows.json"],
          simulatedNodeRefs: ["estnet/nodes.json"],
          ownerNotes: ["Temp mapping."]
        }
      ],
      trafficPaths: [
        trafficPath("V-02", "v02-windows-wsl"),
        trafficPath("V-03", "v03-tunnel-bridge"),
        trafficPath("V-04", "v04-nat-estnet"),
        trafficPath("V-05", "v05-virtual-dut"),
        trafficPath("V-06", "v06-physical-dut")
      ]
    },
    dut: {
      virtual: {
        dutId: "virtual-dut",
        owner: "Temp DUT owner",
        imageRef: "dut/virtual/image.txt",
        imageVersion: "temp",
        testbenchRef: "dut/virtual/testbench.txt",
        testbenchVersionOrCommit: "temp",
        configRefs: ["dut/virtual/config.json"],
        commandRefs: ["dut/virtual/command.txt"],
        interfaceRefs: ["dut/virtual/interface.json"],
        routeRefs: ["dut/virtual/routes.json"],
        trafficProfileRefs: ["dut/virtual/traffic-profile.json"],
        outputRefs: ["dut/virtual/output.log"],
        ownerVerdictRefs: ["owner/v05-verdict.md"]
      },
      physical: {
        dutIdOrRedactedAssetRef: "dut/physical/redacted-asset.txt",
        model: "Temp physical DUT",
        firmwareVersion: "temp",
        softwareVersion: "temp",
        serialPolicy: "redacted",
        portMappingRefs: ["dut/physical/ports.json"],
        cablingRefs: ["dut/physical/cabling.md"],
        operator: "Temp operator",
        logRefs: ["dut/physical/dut.log"],
        ownerVerdictRefs: ["owner/v06-verdict.md"]
      }
    },
    trafficGenerator: {
      neOne: {
        generatorId: "ne-one",
        toolName: "NE-ONE",
        model: "temp",
        softwareVersion: "temp",
        profileRef: "ne-one/profile.json",
        scenarioRefs: ["ne-one/scenario.json"],
        configRefs: ["ne-one/config.json"],
        timingRefs: ["ne-one/timing.json"],
        outputRefs: ["ne-one/output.log"],
        ownerNotes: ["Temp generator."]
      },
      other: []
    },
    trafficProfile: {
      profileId: "temp-profile",
      protocol: "icmp/tcp",
      ports: [5201],
      direction: "source-to-target",
      durationSeconds: 60,
      packetSizeBytes: 64,
      bandwidthSetting: "temp",
      intervalSeconds: 1,
      payloadNotes: ["Temp package."],
      successCriteriaRefs: ["traffic/success-criteria.md"],
      thresholdOwnerRefs: ["owner/traffic-threshold-owner.md"],
      pathRefs: ["topology/topology.md"],
      rawOutputRefs: ["traffic/v06-physical-dut.log"]
    },
    artifactRefs: {
      commandsTranscript: "commands/transcript.jsonl",
      configs: [
        "topology/tunnel-config.json",
        "topology/bridge-config.json",
        "dut/virtual/config.json",
        "ne-one/config.json"
      ],
      logs: [
        "logs/tunnel.log",
        "logs/bridge.log",
        "logs/estnet.log"
      ],
      routeTables: [
        "routes/windows.json",
        "routes/wsl.json",
        "routes/estnet-inet.json"
      ],
      natTables: ["nat-rules/inet-nat.txt"],
      packetCaptures: {
        allowed: false,
        captureRefs: [],
        policyRef: "packet-capture-policy.md",
        omissionReason: "Temp package omits packet captures by policy.",
        alternatePathEvidenceRefs: ["logs/bridge.log", "nat-rules/inet-nat.txt"]
      },
      trafficResults: [
        "traffic/v02-windows-wsl.log",
        "traffic/v03-tunnel-bridge.log",
        "traffic/v04-nat-estnet.log",
        "traffic/v05-virtual-dut.log",
        "traffic/v06-physical-dut.log"
      ],
      dutOutputs: [
        "dut/virtual/output.log",
        "dut/physical/dut.log",
        "ne-one/output.log"
      ],
      screenshots: [
        {
          ref: "screenshots/v02.png",
          supplementalOnly: true,
          illustratesRefs: ["traffic/v02-windows-wsl.log"],
          sourceArtifactRefs: ["commands/transcript.jsonl"]
        }
      ],
      redactions: "redactions.md"
    },
    relatedMeasuredTrafficPackages: [
      {
        measuredPackageId: "temp-measured-package",
        measuredPackagePath:
          "output/validation/external-f07-f09/2026-05-13T00-00-00Z-measured-traffic",
        measuredRunId: "temp-measured-run",
        coveredRequirements: ["F-07", "F-08", "F-09"],
        sharedRawTrafficRefs: ["traffic/v02-windows-wsl.log"],
        relationNotes: [
          "Relation metadata only; it does not promote V-lane authority."
        ]
      }
    ],
    reviewerVerdicts: [
      reviewerVerdict("V-02", ["traffic/v02-windows-wsl.log"], ["owner/v02-verdict.md"]),
      reviewerVerdict("V-03", ["traffic/v03-tunnel-bridge.log"], ["owner/v03-verdict.md"]),
      reviewerVerdict("V-04", ["traffic/v04-nat-estnet.log"], ["owner/v04-verdict.md"]),
      reviewerVerdict("V-05", ["traffic/v05-virtual-dut.log"], ["owner/v05-verdict.md"]),
      reviewerVerdict("V-06", ["traffic/v06-physical-dut.log"], ["owner/v06-verdict.md"])
    ],
    syntheticFallbackBoundary: {
      s11ContractRef: "docs/data-contracts/itri-synthetic-fallback-fixtures.md",
      externalManifestAllowsSyntheticSource: false,
      allowedSyntheticUses: [
        "schema-rehearsal",
        "parser-shape-test",
        "negative-gap-rehearsal"
      ],
      rejectExternalImportWhenSourceTierIsSynthetic: true
    },
    nonClaims: {
      externalValidationTruthFromSchema: false,
      schemaAloneCreatesV02V06Pass: false,
      natTunnelBridgeDutSuccessFromSchema: false,
      natTunnelBridgeDutValidationFromSchema: false,
      measuredTrafficTruth: false,
      itriOrbitModelIntegration: false,
      nativeRadioFrequencyHandover: false,
      fullItriAcceptance: false
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

function isWritableRef(ref) {
  return !path.isAbsolute(ref) &&
    !ref.startsWith("../") &&
    !ref.includes("/../") &&
    !/^https?:\/\//i.test(ref);
}

async function writePackage(repoRootForTest, manifest, reviewer, options = {}) {
  const packageRoot = path.join(repoRootForTest, packageRelativePath);
  const skipRefs = new Set(options.skipRefs ?? []);
  const refs = reviewer.collectItriExternalValidationArtifactRefs(manifest);

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
  reviewItriExternalValidationManifestFromPath,
  repoRootForTest,
  packagePath = packageRelativePath
) {
  const review = await reviewItriExternalValidationManifestFromPath({
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
  const tempRepo = await mkdtemp(path.join(tmpdir(), "sgv-v02r1-repo-"));

  try {
    return await action(tempRepo);
  } finally {
    await rm(tempRepo, { recursive: true, force: true });
  }
}

function assertNoGlobalAuthorityPass(review) {
  assert.notEqual(
    review.packageState,
    "authority-pass",
    "Reviewer must not assign a global authority-pass package state."
  );
}

function assertHasGap(review, code, message) {
  assert(
    review.gaps.some((gap) => gap.code === code) ||
      review.requirementReviews.some((entry) =>
        entry.gaps.some((gap) => gap.code === code)
      ),
    message
  );
}

async function main() {
  const { reviewer, cleanup } = await importReviewer();
  const { reviewItriExternalValidationManifestFromPath } = await import(
    pathToFileURL(cliPath).href
  );

  try {
    assert.equal(
      reviewer.isAllowedItriExternalValidationPackagePath(packageRelativePath),
      true,
      "External validation package path helper must allow retained V-02/V-06 package paths."
    );
    assert.equal(
      reviewer.isAllowedItriExternalValidationPackagePath(
        "output/validation/external-f07-f09/not-v02"
      ),
      false,
      "External validation package path helper must reject unrelated validation roots."
    );

    await withTempRepo(async (tempRepo) => {
      const result = await runCli(reviewItriExternalValidationManifestFromPath, tempRepo);

      assert.equal(result.status, 1, "Missing package must fail closed.");
      assert.equal(result.review.packageState, "missing");
      assertNoGlobalAuthorityPass(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      await mkdir(path.join(tempRepo, packageRelativePath), { recursive: true });
      const result = await runCli(reviewItriExternalValidationManifestFromPath, tempRepo);

      assert.equal(result.status, 1, "Missing manifest must fail closed.");
      assert.equal(result.review.packageState, "incomplete");
      assertHasGap(
        result.review,
        "manifest.missing",
        "Missing manifest must produce a manifest.missing gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      await mkdir(path.join(tempRepo, packageRelativePath), { recursive: true });
      await writeTextFile(
        path.join(tempRepo, packageRelativePath),
        "manifest.json",
        "{ not-json"
      );
      const result = await runCli(reviewItriExternalValidationManifestFromPath, tempRepo);

      assert.equal(result.status, 1, "Malformed manifest must fail closed.");
      assert.equal(result.review.packageState, "incomplete");
      assertHasGap(
        result.review,
        "manifest.malformed-json",
        "Malformed manifest must produce an actionable parse gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = clone(baseManifest());
      manifest.schemaVersion = "wrong.schema";
      await writePackage(tempRepo, manifest, reviewer);
      const result = await runCli(reviewItriExternalValidationManifestFromPath, tempRepo);

      assert.equal(result.status, 1, "Wrong schemaVersion must fail closed.");
      assert.equal(result.review.packageState, "incomplete");
      assertHasGap(
        result.review,
        "manifest.schema-version",
        "Wrong schemaVersion must produce a schema-version gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = {
        ...clone(baseManifest()),
        sourceTier: "tier-3-synthetic",
        syntheticProvenance: {
          kind: "hand-authored-shape",
          generator: "verify script",
          seed: null
        }
      };
      await writePackage(tempRepo, manifest, reviewer);
      const result = await runCli(reviewItriExternalValidationManifestFromPath, tempRepo);

      assert.equal(result.status, 1, "Synthetic provenance must be rejected.");
      assert.equal(result.review.packageState, "rejected");
      assert.equal(result.review.syntheticProvenance.syntheticSourceDetected, true);
      assert(
        result.review.requirementReviews.every(
          (entry) => entry.reviewerState === "rejected"
        ),
        "Synthetic provenance must reject every V-lane review."
      );
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = clone(baseManifest());
      manifest.reviewerVerdicts[0].sourceArtifactRefs = ["../escaped-v02.log"];
      await writePackage(tempRepo, manifest, reviewer);
      const result = await runCli(reviewItriExternalValidationManifestFromPath, tempRepo);

      assert.equal(result.status, 1, "Escaping artifact ref must be rejected.");
      assert.equal(result.review.packageState, "rejected");
      assert.deepEqual(result.review.artifactRefSummary.escapedRefs, [
        "../escaped-v02.log"
      ]);
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = clone(baseManifest());
      manifest.reviewerVerdicts[1].sourceArtifactRefs = ["traffic/missing-v03.log"];
      await writePackage(tempRepo, manifest, reviewer, {
        skipRefs: ["traffic/missing-v03.log"]
      });
      const result = await runCli(reviewItriExternalValidationManifestFromPath, tempRepo);
      const v03Review = result.review.requirementReviews.find(
        (entry) => entry.requirementId === "V-03"
      );

      assert.equal(
        result.status,
        1,
        "Nested reviewerVerdicts sourceArtifactRefs must resolve."
      );
      assert.equal(result.review.packageState, "incomplete");
      assert(v03Review, "V-03 review must exist.");
      assert.equal(v03Review.reviewerState, "incomplete");
      assert(
        v03Review.gaps.some(
          (gap) => gap.code === "authority-pass.source-artifact-refs-unresolved"
        ),
        "Unresolved nested sourceArtifactRefs must block authority-pass."
      );
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = clone(baseManifest());
      manifest.reviewerVerdicts[4].ownerVerdictRefs = ["owner/missing-v06.md"];
      await writePackage(tempRepo, manifest, reviewer, {
        skipRefs: ["owner/missing-v06.md"]
      });
      const result = await runCli(reviewItriExternalValidationManifestFromPath, tempRepo);
      const v06Review = result.review.requirementReviews.find(
        (entry) => entry.requirementId === "V-06"
      );

      assert.equal(result.status, 1, "ownerVerdictRefs must resolve.");
      assert.equal(result.review.packageState, "incomplete");
      assert(v06Review, "V-06 review must exist.");
      assert(
        v06Review.gaps.some(
          (gap) => gap.code === "authority-pass.owner-verdict-refs-unresolved"
        ),
        "Unresolved ownerVerdictRefs must block authority-pass."
      );
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = clone(baseManifest());
      manifest.redactionPolicy.redactionLevel = "audit-blocking";
      manifest.redactionPolicy.auditability = "blocked";
      await writePackage(tempRepo, manifest, reviewer);
      const result = await runCli(reviewItriExternalValidationManifestFromPath, tempRepo);

      assert.equal(result.status, 1, "Audit-blocking redaction must fail closed.");
      assert.equal(result.review.packageState, "rejected");
      assert(
        result.review.requirementReviews.every(
          (entry) => entry.reviewerState !== "authority-pass"
        ),
        "Audit-blocking redaction must prevent authority-pass."
      );
      assertHasGap(
        result.review,
        "redaction-policy.auditability-blocked",
        "Audit-blocking redaction must produce an auditability gap."
      );
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = clone(baseManifest());
      manifest.reviewerVerdicts[0].sourceArtifactRefs = ["screenshots/v02.png"];
      await writePackage(tempRepo, manifest, reviewer);
      const result = await runCli(reviewItriExternalValidationManifestFromPath, tempRepo);
      const v02Review = result.review.requirementReviews.find(
        (entry) => entry.requirementId === "V-02"
      );

      assert.equal(result.status, 1, "Screenshot-only authority evidence must fail closed.");
      assert.equal(result.review.packageState, "incomplete");
      assert(v02Review, "V-02 review must exist.");
      assert(
        v02Review.gaps.some(
          (gap) => gap.code === "authority-pass.screenshot-only-evidence"
        ),
        "Screenshot-only sourceArtifactRefs must block authority-pass."
      );
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = clone(baseManifest());
      manifest.relatedMeasuredTrafficPackages[0].measuredTrafficTruth = true;
      await writePackage(tempRepo, manifest, reviewer);
      const result = await runCli(reviewItriExternalValidationManifestFromPath, tempRepo);

      assert.equal(
        result.status,
        1,
        "relatedMeasuredTrafficPackages truth promotion must fail closed."
      );
      assert.equal(result.review.packageState, "rejected");
      assert.equal(
        result.review.relatedMeasuredTrafficPackages.measuredTrafficTruthPromoted,
        true
      );
      assertHasGap(
        result.review,
        "related-measured-traffic.truth-promotion",
        "Measured traffic relation must not promote measured truth or V authority."
      );
    });

    await withTempRepo(async (tempRepo) => {
      const manifest = clone(baseManifest());
      await writePackage(tempRepo, manifest, reviewer);
      const result = await runCli(reviewItriExternalValidationManifestFromPath, tempRepo);

      assert.equal(
        result.status,
        0,
        "Fully retained temp-only package must pass package review."
      );
      assert.equal(result.review.packageState, "importable");
      assert.deepEqual(
        result.review.requirementReviews.map((entry) => entry.requirementId),
        ["V-02", "V-03", "V-04", "V-05", "V-06"]
      );
      assert.deepEqual(
        result.review.requirementReviews.map((entry) => entry.reviewerState),
        [
          "authority-pass",
          "authority-pass",
          "authority-pass",
          "authority-pass",
          "authority-pass"
        ]
      );
      assert.equal(result.review.artifactRefSummary.unresolvedRefs.length, 0);
      assert.equal(result.review.artifactRefSummary.escapedRefs.length, 0);
      assert.equal(result.review.artifactRefSummary.externalRefs.length, 0);
      assertNoGlobalAuthorityPass(result.review);
    });

    await withTempRepo(async (tempRepo) => {
      const result = await runCli(
        reviewItriExternalValidationManifestFromPath,
        tempRepo,
        "output/validation/external-f07-f09/not-v02"
      );

      assert.equal(result.status, 1, "Wrong retained root must fail closed.");
      assert.equal(result.review.packageState, "rejected");
      assertHasGap(
        result.review,
        "package.path-outside-retained-root",
        "Wrong retained root must produce a path-boundary gap."
      );
    });
  } finally {
    await cleanup();
  }

  console.log(
    "V-02R1 external-validation manifest reviewer verifier passed: missing package, wrong root, missing manifest, malformed manifest, wrong schemaVersion, synthetic/tier-3, escaping ref, nested sourceArtifactRefs, ownerVerdictRefs, audit-blocking redaction, screenshot-only evidence, related measured truth promotion, and temp-only per-lane authority-pass cases covered."
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
