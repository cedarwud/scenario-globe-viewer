import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const physicalInputModulePath = new URL(
  "../src/features/physical-input/physical-input.ts",
  import.meta.url
);
const handoverDecisionModulePath = new URL(
  "../src/features/handover-decision/handover-decision.ts",
  import.meta.url
);
const physicalInputSourceModulePath = new URL(
  "../src/runtime/bootstrap-physical-input-source.ts",
  import.meta.url
);
const physicalInputSeedsModulePath = new URL(
  "../src/runtime/bootstrap-physical-input-seeds.ts",
  import.meta.url
);
const physicalInputControllerModulePath = new URL(
  "../src/runtime/bootstrap-physical-input-controller.ts",
  import.meta.url
);
const handoverDecisionSourceModulePath = new URL(
  "../src/runtime/bootstrap-handover-decision-source.ts",
  import.meta.url
);
const handoverDecisionControllerModulePath = new URL(
  "../src/runtime/bootstrap-handover-decision-controller.ts",
  import.meta.url
);

const ACTIVE_RANGE = {
  start: "2026-04-19T08:00:00.000Z",
  stop: "2026-04-19T09:00:00.000Z"
};
const INITIAL_BOOTSTRAP_TIME = "2026-04-19T08:10:00.000Z";
const BRIDGE_BOOTSTRAP_TIME = "2026-04-19T08:32:00.000Z";
const FIRST_INTAKE_SCENARIO_ID = "app-oneweb-intelsat-geo-aviation";
const FIRST_INTAKE_SCENARIO_LABEL = "OneWeb + Intelsat GEO Aviation Preview";

function transpileTypeScript(source, fileName) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    },
    fileName
  }).outputText;
}

function rewriteRelativeImports(source) {
  return source
    .replace(/from "(\.\.?\/[^".][^"]*)"/g, 'from "$1.mjs"')
    .replace(/from '(\.\.?\/[^'.][^']*)'/g, "from '$1.mjs'")
    .replace(/export \* from "(\.\.?\/[^".][^"]*)"/g, 'export * from "$1.mjs"')
    .replace(/export \* from '(\.\.?\/[^'.][^']*)'/g, "export * from '$1.mjs'");
}

function localizeTempImports(source) {
  return source
    .replace(
      /\.\.\/features\/physical-input\/physical-input\.mjs/g,
      "./physical-input.mjs"
    )
    .replace(
      /\.\.\/features\/handover-decision\/handover-decision\.mjs/g,
      "./handover-decision.mjs"
    )
    .replace(
      /\.\/bootstrap-physical-input-source\.mjs/g,
      "./bootstrap-physical-input-source.mjs"
    )
    .replace(
      /\.\/bootstrap-handover-decision-source\.mjs/g,
      "./bootstrap-handover-decision-source.mjs"
    );
}

function createOperatorControllerMock(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    getState() {
      return { ...state };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(nextState) {
      state = { ...nextState };

      for (const listener of listeners) {
        listener({ ...state });
      }
    }
  };
}

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-m3-slice-b-"));

try {
  const [
    physicalInputSource,
    handoverDecisionSource,
    physicalInputSourceCode,
    physicalInputSeedsCode,
    physicalInputControllerCode,
    handoverDecisionSourceCode,
    handoverDecisionControllerCode
  ] = await Promise.all([
    readFile(physicalInputModulePath, "utf8"),
    readFile(handoverDecisionModulePath, "utf8"),
    readFile(physicalInputSourceModulePath, "utf8"),
    readFile(physicalInputSeedsModulePath, "utf8"),
    readFile(physicalInputControllerModulePath, "utf8"),
    readFile(handoverDecisionSourceModulePath, "utf8"),
    readFile(handoverDecisionControllerModulePath, "utf8")
  ]);

  await Promise.all([
    writeFile(
      join(tempModuleDir, "physical-input.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(physicalInputSource, "physical-input.ts")
      )
    ),
    writeFile(
      join(tempModuleDir, "handover-decision.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(handoverDecisionSource, "handover-decision.ts")
      )
    ),
    writeFile(
      join(tempModuleDir, "bootstrap-physical-input-source.mjs"),
      localizeTempImports(
        rewriteRelativeImports(
          transpileTypeScript(
            physicalInputSourceCode,
            "bootstrap-physical-input-source.ts"
          )
        )
      )
    ),
    writeFile(
      join(tempModuleDir, "bootstrap-physical-input-seeds.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(
          physicalInputSeedsCode,
          "bootstrap-physical-input-seeds.ts"
        )
      )
    ),
    writeFile(
      join(tempModuleDir, "bootstrap-physical-input-controller.mjs"),
      localizeTempImports(
        rewriteRelativeImports(
          transpileTypeScript(
            physicalInputControllerCode,
            "bootstrap-physical-input-controller.ts"
          )
        )
      )
    ),
    writeFile(
      join(tempModuleDir, "bootstrap-handover-decision-source.mjs"),
      localizeTempImports(
        rewriteRelativeImports(
          transpileTypeScript(
            handoverDecisionSourceCode,
            "bootstrap-handover-decision-source.ts"
          )
        )
      )
    ),
    writeFile(
      join(tempModuleDir, "bootstrap-handover-decision-controller.mjs"),
      localizeTempImports(
        rewriteRelativeImports(
          transpileTypeScript(
            handoverDecisionControllerCode,
            "bootstrap-handover-decision-controller.ts"
          )
        )
      )
    )
  ]);

  const {
    BOOTSTRAP_PHYSICAL_INPUT_INACTIVE_CONTEXT_LABEL,
    createBootstrapPhysicalInputSourceCatalog,
    resolveBootstrapPhysicalInputState
  } = await import(
    pathToFileURL(join(tempModuleDir, "bootstrap-physical-input-source.mjs")).href
  );
  const { createBootstrapPhysicalInputController } = await import(
    pathToFileURL(join(tempModuleDir, "bootstrap-physical-input-controller.mjs")).href
  );
  const { evaluateHandoverDecisionSnapshot } = await import(
    pathToFileURL(join(tempModuleDir, "handover-decision.mjs")).href
  );
  const {
    BOOTSTRAP_HANDOVER_POLICY_ID,
    BOOTSTRAP_HANDOVER_UNSUPPORTED_POLICY_ID,
    createBootstrapProxyHandoverDecisionSourceCatalog,
    resolveBootstrapProxyHandoverDecisionSnapshot
  } = await import(
    pathToFileURL(join(tempModuleDir, "bootstrap-handover-decision-source.mjs")).href
  );
  const { createBootstrapHandoverDecisionController } = await import(
    pathToFileURL(join(tempModuleDir, "bootstrap-handover-decision-controller.mjs")).href
  );

  const scenarioDefinitions = [
    {
      id: "bootstrap-global-real-time",
      label: "Bootstrap Global",
      kind: "real-time",
      presentation: { presetKey: "global" },
      time: { mode: "real-time" },
      sources: {}
    },
    {
      id: "bootstrap-site-prerecorded",
      label: "Bootstrap Site Replay",
      kind: "prerecorded",
      presentation: { presetKey: "site" },
      time: { mode: "prerecorded" },
      sources: {}
    }
  ];

  const physicalCatalog =
    createBootstrapPhysicalInputSourceCatalog(scenarioDefinitions);
  const bootstrapPhysicalState = resolveBootstrapPhysicalInputState(physicalCatalog, {
    scenarioId: "bootstrap-global-real-time",
    scenarioLabel: "Bootstrap Global",
    evaluatedAt: BRIDGE_BOOTSTRAP_TIME,
    activeRange: ACTIVE_RANGE
  });

  assert.equal(
    bootstrapPhysicalState.activeWindow.contextLabel,
    "Global rain-stressed bridge",
    "Bootstrap physical-input context must stay unchanged for the global bridge window."
  );
  assert.deepEqual(
    bootstrapPhysicalState.candidates.map((candidate) => candidate.candidateId),
    ["global-leo-primary", "global-meo-bridge", "global-geo-anchor"],
    "Bootstrap physical-input candidates must stay on the existing bootstrap-owned catalog."
  );

  const handoverCatalog =
    createBootstrapProxyHandoverDecisionSourceCatalog(scenarioDefinitions);
  const bootstrapHandoverState = evaluateHandoverDecisionSnapshot(
    resolveBootstrapProxyHandoverDecisionSnapshot(handoverCatalog, {
      scenarioId: "bootstrap-global-real-time",
      evaluatedAt: BRIDGE_BOOTSTRAP_TIME,
      activeRange: ACTIVE_RANGE,
      currentServingCandidateId: "global-leo-primary"
    })
  );

  assert.equal(
    bootstrapHandoverState.snapshot.policyId,
    BOOTSTRAP_HANDOVER_POLICY_ID,
    "Bootstrap handover must stay on the existing fixed policy id."
  );
  assert.equal(
    bootstrapHandoverState.snapshot.decisionModel,
    undefined,
    "Bootstrap handover must not fabricate first-intake decisionModel semantics."
  );
  assert.equal(
    bootstrapHandoverState.snapshot.isNativeRfHandover,
    undefined,
    "Bootstrap handover must not fabricate first-intake native-RF semantics."
  );
  assert.deepEqual(
    Object.keys(bootstrapHandoverState.result.semanticsBridge),
    ["truthState"],
    "Bootstrap handover must not widen semanticsBridge beyond the existing truthState seam."
  );
  assert.equal(
    bootstrapHandoverState.result.decisionKind,
    "switch",
    "Bootstrap handover must keep the existing bridge-window switch behavior."
  );
  assert.equal(
    bootstrapHandoverState.result.servingCandidateId,
    "global-meo-bridge",
    "Bootstrap handover must keep the existing serving candidate outcome."
  );
  assert.deepEqual(
    bootstrapHandoverState.result.reasonSignals.map((signal) => signal.code),
    ["latency-better", "jitter-better", "network-speed-better"],
    "Bootstrap handover reasons must stay unchanged for the bridge window."
  );

  const unsupportedPhysicalState = resolveBootstrapPhysicalInputState(physicalCatalog, {
    scenarioId: FIRST_INTAKE_SCENARIO_ID,
    scenarioLabel: FIRST_INTAKE_SCENARIO_LABEL,
    evaluatedAt: BRIDGE_BOOTSTRAP_TIME,
    activeRange: ACTIVE_RANGE
  });

  assert.equal(
    unsupportedPhysicalState.scenario.id,
    FIRST_INTAKE_SCENARIO_ID,
    "Unsupported physical-input state must keep the incoming non-bootstrap scenario id."
  );
  assert.equal(
    unsupportedPhysicalState.activeWindow.contextLabel,
    BOOTSTRAP_PHYSICAL_INPUT_INACTIVE_CONTEXT_LABEL,
    "Unsupported physical-input state must expose an explicit inactive guard label."
  );
  assert.equal(
    unsupportedPhysicalState.candidates.length,
    0,
    "Unsupported physical-input state must stay on a no-op candidate set."
  );
  assert.equal(
    unsupportedPhysicalState.projectedMetrics.length,
    0,
    "Unsupported physical-input state must not project bootstrap metrics for a non-bootstrap scenario."
  );
  assert.equal(
    unsupportedPhysicalState.report.candidates.length,
    0,
    "Unsupported physical-input report must stay empty instead of silently adopting bootstrap candidates."
  );

  const unsupportedHandoverSnapshot = resolveBootstrapProxyHandoverDecisionSnapshot(
    handoverCatalog,
    {
      scenarioId: FIRST_INTAKE_SCENARIO_ID,
      evaluatedAt: BRIDGE_BOOTSTRAP_TIME,
      activeRange: ACTIVE_RANGE
    }
  );
  const unsupportedHandoverState = evaluateHandoverDecisionSnapshot(
    unsupportedHandoverSnapshot
  );

  assert.equal(
    unsupportedHandoverSnapshot.scenarioId,
    FIRST_INTAKE_SCENARIO_ID,
    "Unsupported handover snapshot must keep the incoming non-bootstrap scenario id."
  );
  assert.equal(
    unsupportedHandoverSnapshot.policyId,
    BOOTSTRAP_HANDOVER_UNSUPPORTED_POLICY_ID,
    "Unsupported handover snapshot must expose the repo-owned no-op policy id."
  );
  assert.equal(
    unsupportedHandoverSnapshot.decisionModel,
    undefined,
    "Unsupported bootstrap handover snapshots must not invent first-intake decision semantics."
  );
  assert.equal(
    unsupportedHandoverSnapshot.isNativeRfHandover,
    undefined,
    "Unsupported bootstrap handover snapshots must not invent first-intake RF semantics."
  );
  assert.equal(
    unsupportedHandoverSnapshot.candidates.length,
    0,
    "Unsupported handover snapshot must stay empty instead of falling back to a bootstrap candidate catalog."
  );
  assert.equal(
    unsupportedHandoverState.result.decisionKind,
    "unavailable",
    "Unsupported handover evaluation must resolve to an explicit unavailable state."
  );
  assert.equal(
    unsupportedHandoverState.result.semanticsBridge.truthState,
    "unavailable",
    "Unsupported handover evaluation must stay isolated behind the unavailable truth-state bridge."
  );
  assert.deepEqual(
    Object.keys(unsupportedHandoverState.result.semanticsBridge),
    ["truthState"],
    "Unsupported bootstrap handover evaluation must not fabricate widened semanticsBridge metadata."
  );
  assert.equal(
    unsupportedHandoverState.result.reasonSignals.length,
    0,
    "Unsupported handover evaluation must stay a no-op instead of inventing bootstrap reasons."
  );

  const operatorState = createOperatorControllerMock({
    scenarioId: "bootstrap-global-real-time",
    scenarioLabel: "Bootstrap Global",
    scenePresetKey: "global",
    replayMode: "real-time",
    currentTime: INITIAL_BOOTSTRAP_TIME,
    startTime: ACTIVE_RANGE.start,
    stopTime: ACTIVE_RANGE.stop,
    replayMultiplier: 1,
    isPlaying: false
  });
  const scenarioCatalog = {
    definitions: scenarioDefinitions,
    options: [],
    initialScenarioId: "bootstrap-global-real-time"
  };
  const physicalController = createBootstrapPhysicalInputController({
    operatorState,
    scenarioCatalog
  });
  const handoverController = createBootstrapHandoverDecisionController({
    operatorState,
    scenarioCatalog
  });

  assert.equal(
    handoverController.getState().result.servingCandidateId,
    "global-leo-primary",
    "Bootstrap handover controller must keep the initial bootstrap serving candidate."
  );

  operatorState.emit({
    scenarioId: FIRST_INTAKE_SCENARIO_ID,
    scenarioLabel: FIRST_INTAKE_SCENARIO_LABEL,
    scenePresetKey: "global",
    replayMode: "real-time",
    currentTime: BRIDGE_BOOTSTRAP_TIME,
    startTime: ACTIVE_RANGE.start,
    stopTime: ACTIVE_RANGE.stop,
    replayMultiplier: 1,
    isPlaying: false
  });

  const unsupportedControllerPhysicalState = physicalController.getState();
  const unsupportedControllerHandoverState = handoverController.getState();

  assert.equal(
    unsupportedControllerPhysicalState.scenario.id,
    FIRST_INTAKE_SCENARIO_ID,
    "Physical-input controller must keep the non-bootstrap scenario id instead of silently falling back."
  );
  assert.equal(
    unsupportedControllerPhysicalState.activeWindow.contextLabel,
    BOOTSTRAP_PHYSICAL_INPUT_INACTIVE_CONTEXT_LABEL,
    "Physical-input controller must expose the inactive guard seam for non-bootstrap scenario ids."
  );
  assert.equal(
    unsupportedControllerPhysicalState.projectedMetrics.length,
    0,
    "Physical-input controller must not project bootstrap metrics for the preview-only first intake."
  );
  assert.equal(
    unsupportedControllerHandoverState.snapshot.scenarioId,
    FIRST_INTAKE_SCENARIO_ID,
    "Handover controller must keep the non-bootstrap scenario id instead of silently falling back."
  );
  assert.equal(
    unsupportedControllerHandoverState.snapshot.policyId,
    BOOTSTRAP_HANDOVER_UNSUPPORTED_POLICY_ID,
    "Handover controller must expose the repo-owned no-op policy for unsupported scenario ids."
  );
  assert.equal(
    unsupportedControllerHandoverState.snapshot.decisionModel,
    undefined,
    "Bootstrap handover controller must not fabricate first-intake decisionModel semantics on the guard lane."
  );
  assert.equal(
    unsupportedControllerHandoverState.snapshot.isNativeRfHandover,
    undefined,
    "Bootstrap handover controller must not fabricate first-intake RF semantics on the guard lane."
  );
  assert.deepEqual(
    Object.keys(unsupportedControllerHandoverState.result.semanticsBridge),
    ["truthState"],
    "Bootstrap handover controller must keep the guard lane free of invented semanticsBridge metadata."
  );
  assert.equal(
    unsupportedControllerHandoverState.result.decisionKind,
    "unavailable",
    "Handover controller must stay on the explicit unavailable no-op path for unsupported scenario ids."
  );

  operatorState.emit({
    scenarioId: "bootstrap-global-real-time",
    scenarioLabel: "Bootstrap Global",
    scenePresetKey: "global",
    replayMode: "real-time",
    currentTime: BRIDGE_BOOTSTRAP_TIME,
    startTime: ACTIVE_RANGE.start,
    stopTime: ACTIVE_RANGE.stop,
    replayMultiplier: 1,
    isPlaying: false
  });

  const resumedPhysicalState = physicalController.getState();
  const resumedHandoverState = handoverController.getState();

  assert.equal(
    resumedPhysicalState.activeWindow.contextLabel,
    "Global rain-stressed bridge",
    "Bootstrap physical-input controller must resume the unchanged bootstrap catalog after an unsupported scenario id."
  );
  assert.deepEqual(
    resumedPhysicalState.candidates.map((candidate) => candidate.candidateId),
    ["global-leo-primary", "global-meo-bridge", "global-geo-anchor"],
    "Bootstrap physical-input controller must keep the bootstrap candidate set unchanged after the guard path."
  );
  assert.equal(
    resumedHandoverState.result.decisionKind,
    "switch",
    "Bootstrap handover controller must resume the unchanged bootstrap switch behavior after the guard path."
  );
  assert.equal(
    resumedHandoverState.result.servingCandidateId,
    "global-meo-bridge",
    "Bootstrap handover controller must keep the existing bootstrap serving-candidate outcome after the guard path."
  );

  physicalController.dispose();
  handoverController.dispose();

  console.log(
    `M3 Slice B bootstrap runtime guard verification passed: ${JSON.stringify({
      bootstrapPhysicalContext: bootstrapPhysicalState.activeWindow.contextLabel,
      bootstrapHandoverServingCandidateId:
        bootstrapHandoverState.result.servingCandidateId,
      unsupportedPhysicalContext:
        unsupportedControllerPhysicalState.activeWindow.contextLabel,
      unsupportedHandoverPolicyId:
        unsupportedControllerHandoverState.snapshot.policyId,
      unsupportedHandoverKind: unsupportedControllerHandoverState.result.decisionKind
    })}`
  );
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
