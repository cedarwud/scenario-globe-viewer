import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const handoverDecisionModulePath = new URL(
  "../src/features/handover-decision/handover-decision.ts",
  import.meta.url
);

function transpileTypeScript(source, fileName) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    },
    fileName
  }).outputText;
}

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-f11-rule-"));

try {
  const handoverDecisionSource = await readFile(
    handoverDecisionModulePath,
    "utf8"
  );

  for (const snippet of [
    "HandoverRuleConfig",
    "DEFAULT_HANDOVER_RULE_CONFIGS",
    "validateHandoverRuleConfig",
    "minDwellTicks",
    "hysteresisMargin",
    "appliedRuleConfig"
  ]) {
    assert(
      handoverDecisionSource.includes(snippet),
      `Missing F-11 handover rule snippet: ${snippet}`
    );
  }

  await writeFile(
    join(tempModuleDir, "handover-decision.mjs"),
    transpileTypeScript(handoverDecisionSource, "handover-decision.ts")
  );

  const {
    DEFAULT_HANDOVER_POLICY_ID,
    DEFAULT_HANDOVER_RULE_CONFIGS,
    HANDOVER_DECISION_PROXY_PROVENANCE,
    HANDOVER_POLICY_DESCRIPTORS,
    HANDOVER_RULE_CONFIG_SCHEMA_VERSION,
    evaluateHandoverDecisionSnapshot,
    listDefaultHandoverRuleConfigs,
    resolveDefaultHandoverRuleConfig,
    validateHandoverRuleConfig
  } = await import(pathToFileURL(join(tempModuleDir, "handover-decision.mjs")).href);

  const expectedPolicyIds = HANDOVER_POLICY_DESCRIPTORS.map(
    (descriptor) => descriptor.id
  );

  assert.equal(
    HANDOVER_RULE_CONFIG_SCHEMA_VERSION,
    "m8a-v4.12-f11-handover-rule-config.v1",
    "F-11 rule config schema version must be locked."
  );
  assert.deepEqual(
    DEFAULT_HANDOVER_RULE_CONFIGS.map((config) => config.policyId),
    expectedPolicyIds,
    "F-11 must expose one default rule config per selectable F-10 policy."
  );
  assert.deepEqual(
    listDefaultHandoverRuleConfigs().map((config) => config.policyId),
    expectedPolicyIds,
    "F-11 default config list helper must clone selectable defaults."
  );

  for (const policy of HANDOVER_POLICY_DESCRIPTORS) {
    const config = resolveDefaultHandoverRuleConfig(policy.id);

    assert.deepEqual(
      config.weights,
      policy.weights,
      `${policy.id}: default rule weights must derive from F-10 descriptor.`
    );
    assert.deepEqual(
      config.tieBreakOrder,
      policy.tieBreak,
      `${policy.id}: default tie-break order must derive from F-10 descriptor.`
    );
    assert.equal(
      config.provenanceKind,
      HANDOVER_DECISION_PROXY_PROVENANCE,
      `${policy.id}: rule config provenance must stay bounded-proxy.`
    );
    assert.deepEqual(
      validateHandoverRuleConfig(config),
      [],
      `${policy.id}: default rule config must validate.`
    );
  }

  const invalidIssues = validateHandoverRuleConfig({
    ...resolveDefaultHandoverRuleConfig(DEFAULT_HANDOVER_POLICY_ID),
    weights: {
      latencyMs: 10.25,
      jitterMs: 0,
      networkSpeedMbps: 0
    },
    tieBreakOrder: ["latency", "latency", "speed", "stable-serving"],
    minDwellTicks: 61,
    hysteresisMargin: 11
  });

  assert(
    invalidIssues.some((issue) => issue.field === "weights.latencyMs") &&
      invalidIssues.some((issue) => issue.field === "tieBreakOrder") &&
      invalidIssues.some((issue) => issue.field === "minDwellTicks") &&
      invalidIssues.some((issue) => issue.field === "hysteresisMargin"),
    `Invalid F-11 config must report field-level issues: ${JSON.stringify(
      invalidIssues
    )}`
  );

  const baseRuleConfig = resolveDefaultHandoverRuleConfig(
    DEFAULT_HANDOVER_POLICY_ID,
    "2026-05-12T00:00:00.000Z"
  );
  const baseSnapshot = {
    scenarioId: "f11-rule-fixture",
    evaluatedAt: "2026-04-19T08:30:00.000Z",
    activeRange: {
      start: "2026-04-19T08:00:00.000Z",
      stop: "2026-04-19T09:00:00.000Z"
    },
    currentServingCandidateId: "candidate-latency",
    policyId: DEFAULT_HANDOVER_POLICY_ID,
    appliedRuleConfig: baseRuleConfig,
    candidates: [
      {
        candidateId: "candidate-latency",
        orbitClass: "leo",
        latencyMs: 10,
        jitterMs: 8,
        networkSpeedMbps: 100,
        provenance: HANDOVER_DECISION_PROXY_PROVENANCE
      },
      {
        candidateId: "candidate-throughput",
        orbitClass: "meo",
        latencyMs: 14,
        jitterMs: 9,
        networkSpeedMbps: 200,
        provenance: HANDOVER_DECISION_PROXY_PROVENANCE
      },
      {
        candidateId: "candidate-anchor",
        orbitClass: "geo",
        latencyMs: 80,
        jitterMs: 12,
        networkSpeedMbps: 120,
        provenance: HANDOVER_DECISION_PROXY_PROVENANCE
      }
    ]
  };

  const balancedState = evaluateHandoverDecisionSnapshot(baseSnapshot);

  assert.equal(
    balancedState.result.servingCandidateId,
    "candidate-latency",
    "Default F-11 balanced rule config must preserve F-10 balanced behavior."
  );
  assert.equal(
    balancedState.report.appliedRuleConfig.policyId,
    DEFAULT_HANDOVER_POLICY_ID,
    "Report must include the applied F-11 rule config."
  );

  const throughputRuleConfig = {
    ...baseRuleConfig,
    weights: {
      latencyMs: 0,
      jitterMs: 0,
      networkSpeedMbps: 10
    },
    tieBreakOrder: ["speed", "latency", "jitter", "stable-serving"],
    appliedAt: "2026-05-12T00:01:00.000Z"
  };
  const throughputState = evaluateHandoverDecisionSnapshot({
    ...baseSnapshot,
    appliedRuleConfig: throughputRuleConfig
  });

  assert.equal(
    throughputState.result.servingCandidateId,
    "candidate-throughput",
    "Editable F-11 speed weight must deterministically alter ranking."
  );
  assert.deepEqual(
    throughputState.result.reasonSignals.map((signal) => signal.code),
    ["network-speed-better", "policy-weighted-override"],
    "F-11 weighted override must stay explainable without adding live-control claims."
  );

  const dwellHoldState = evaluateHandoverDecisionSnapshot({
    ...baseSnapshot,
    appliedRuleConfig: {
      ...throughputRuleConfig,
      minDwellTicks: 60,
      appliedAt: "2026-05-12T00:02:00.000Z"
    }
  });

  assert.equal(
    dwellHoldState.result.decisionKind,
    "hold",
    "Minimum dwell ticks must hold the current candidate inside the bounded dwell window."
  );
  assert.equal(
    dwellHoldState.result.servingCandidateId,
    "candidate-latency",
    "Minimum dwell hold must preserve the current serving candidate."
  );

  const hysteresisHoldState = evaluateHandoverDecisionSnapshot({
    ...baseSnapshot,
    appliedRuleConfig: {
      ...throughputRuleConfig,
      weights: {
        latencyMs: 0,
        jitterMs: 0,
        networkSpeedMbps: 1
      },
      hysteresisMargin: 2,
      appliedAt: "2026-05-12T00:03:00.000Z"
    }
  });

  assert.equal(
    hysteresisHoldState.result.decisionKind,
    "hold",
    "Hysteresis margin must hold when the modeled score gap is inside the bounded margin."
  );

  const serialized = JSON.stringify([
    balancedState,
    throughputState,
    dwellHoldState,
    hysteresisHoldState
  ]).toLowerCase();

  assert(
    !/production handover rule|live network rule applied|rule applied to real satellite|rule verified by iperf|rule verified by ping|rule meets 3gpp|rule enforces operator sla|rule validates dut|rule closes v-02|rule closes >=500 leo/.test(
      serialized
    ),
    "F-11 rule config contract must not include forbidden live-control or external-truth claims."
  );

  console.log(
    `M8A V4.12 F-11 handover rule config contract verification passed: ${JSON.stringify({
      policyIds: expectedPolicyIds,
      balancedServing: balancedState.result.servingCandidateId,
      throughputServing: throughputState.result.servingCandidateId,
      dwellHoldKind: dwellHoldState.result.decisionKind,
      hysteresisHoldKind: hysteresisHoldState.result.decisionKind
    })}`
  );
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
