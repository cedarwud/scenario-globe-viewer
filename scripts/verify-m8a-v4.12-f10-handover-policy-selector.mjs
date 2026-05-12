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

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-f10-policy-"));

try {
  const handoverDecisionSource = await readFile(handoverDecisionModulePath, "utf8");

  for (const snippet of [
    "HandoverPolicyDescriptor",
    "bootstrap-balanced-v1",
    "bootstrap-latency-priority-v1",
    "bootstrap-throughput-priority-v1",
    "policy-weighted-override",
    "policyTieBreak"
  ]) {
    assert(
      handoverDecisionSource.includes(snippet),
      `Missing F-10 handover policy snippet: ${snippet}`
    );
  }

  await writeFile(
    join(tempModuleDir, "handover-decision.mjs"),
    transpileTypeScript(handoverDecisionSource, "handover-decision.ts")
  );

  const {
    DEFAULT_HANDOVER_POLICY_ID,
    HANDOVER_DECISION_PROXY_PROVENANCE,
    HANDOVER_POLICY_DESCRIPTORS,
    evaluateHandoverDecisionSnapshot,
    isSelectableHandoverPolicyId,
    listHandoverPolicyDescriptors,
    resolveHandoverPolicyDescriptor
  } = await import(pathToFileURL(join(tempModuleDir, "handover-decision.mjs")).href);

  const expectedPolicyIds = [
    "bootstrap-balanced-v1",
    "bootstrap-latency-priority-v1",
    "bootstrap-throughput-priority-v1"
  ];

  assert.equal(
    DEFAULT_HANDOVER_POLICY_ID,
    "bootstrap-balanced-v1",
    "F-10 default policy must stay balanced."
  );
  assert.deepEqual(
    HANDOVER_POLICY_DESCRIPTORS.map((descriptor) => descriptor.id),
    expectedPolicyIds,
    "F-10 must expose exactly the three locked selectable policy variants."
  );
  assert.deepEqual(
    listHandoverPolicyDescriptors().map((descriptor) => descriptor.id),
    expectedPolicyIds,
    "F-10 list helper must expose the same selectable variants."
  );

  for (const policyId of expectedPolicyIds) {
    assert.equal(
      isSelectableHandoverPolicyId(policyId),
      true,
      `${policyId} must be selectable.`
    );
    const descriptor = resolveHandoverPolicyDescriptor(policyId);
    assert.equal(descriptor.id, policyId, `${policyId} descriptor id must round-trip.`);
    assert(
      descriptor.tieBreak.length > 0,
      `${policyId} must define a deterministic tie-break order.`
    );
  }

  assert.equal(
    isSelectableHandoverPolicyId("bootstrap-unsupported-scenario-noop-v1"),
    false,
    "Internal unsupported no-op policy must not be operator selectable."
  );

  const baseSnapshot = {
    scenarioId: "f10-policy-fixture",
    evaluatedAt: "2026-04-19T08:30:00.000Z",
    activeRange: {
      start: "2026-04-19T08:00:00.000Z",
      stop: "2026-04-19T09:00:00.000Z"
    },
    currentServingCandidateId: "candidate-latency",
    policyId: DEFAULT_HANDOVER_POLICY_ID,
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
    "Balanced policy must preserve equal-metric-win behavior on the fixture."
  );
  assert.equal(
    balancedState.report.policyId,
    "bootstrap-balanced-v1",
    "Report must expose the active balanced policy id."
  );
  assert.equal(
    balancedState.report.policyLabel,
    "Balanced handover policy",
    "Report must expose the active policy label."
  );
  assert.deepEqual(
    balancedState.report.policyTieBreak,
    ["latency", "jitter", "speed", "stable-serving"],
    "Balanced policy tie-break must match the Phase 1 lock-in."
  );
  assert.equal(
    balancedState.result.reasonSignals.some(
      (signal) => signal.code === "policy-weighted-override"
    ),
    false,
    "Balanced policy must not emit the weighted override reason."
  );

  const throughputState = evaluateHandoverDecisionSnapshot({
    ...baseSnapshot,
    policyId: "bootstrap-throughput-priority-v1"
  });

  assert.equal(
    throughputState.result.servingCandidateId,
    "candidate-throughput",
    "Throughput policy must deterministically alter the ranking outcome."
  );
  assert.deepEqual(
    throughputState.result.reasonSignals.map((signal) => signal.code),
    ["network-speed-better", "policy-weighted-override"],
    "Throughput policy must explain both the better modeled speed and policy override."
  );
  assert.deepEqual(
    throughputState.report.policyTieBreak,
    ["speed", "latency", "jitter", "stable-serving"],
    "Throughput policy tie-break must match the Phase 1 lock-in."
  );

  const latencyState = evaluateHandoverDecisionSnapshot({
    ...baseSnapshot,
    policyId: "bootstrap-latency-priority-v1"
  });

  assert.equal(
    latencyState.result.servingCandidateId,
    "candidate-latency",
    "Latency policy must prioritize the lowest-latency bounded candidate."
  );

  const serialized = JSON.stringify([balancedState, throughputState, latencyState]);

  assert(
    !/live network control|live rf handover|policy applied to real satellite|policy verified by iperf|policy verified by ping|production handover controller|policy ratified by itri|policy meets 3gpp|policy enforces operator sla|policy ensures >=500 leo|policy closes v-02/i.test(
      serialized.toLowerCase()
    ),
    "F-10 policy contract must not include forbidden live-control or external-truth claims."
  );

  console.log(
    `M8A V4.12 F-10 handover policy selector contract verification passed: ${JSON.stringify({
      policyIds: expectedPolicyIds,
      balancedServing: balancedState.result.servingCandidateId,
      throughputServing: throughputState.result.servingCandidateId,
      throughputReasons: throughputState.result.reasonSignals.map(
        (signal) => signal.code
      )
    })}`
  );
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
