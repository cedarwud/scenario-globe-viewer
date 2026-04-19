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
const physicalInputModulePath = new URL(
  "../src/features/physical-input/physical-input.ts",
  import.meta.url
);
const physicalInputSourceModulePath = new URL(
  "../src/runtime/bootstrap-physical-input-source.ts",
  import.meta.url
);
const handoverDecisionPanelPath = new URL(
  "../src/features/handover-decision/bootstrap-handover-decision-panel.ts",
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
const operatorHudModulePath = new URL(
  "../src/features/operator/bootstrap-operator-hud.ts",
  import.meta.url
);
const mainPath = new URL("../src/main.ts", import.meta.url);

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
      /\.\.\/features\/handover-decision\/handover-decision\.mjs/g,
      "./handover-decision.mjs"
    )
    .replace(
      /\.\.\/features\/physical-input\/physical-input\.mjs/g,
      "./physical-input.mjs"
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

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-phase6.4-"));

try {
  const [
    handoverDecisionSource,
    physicalInputSource,
    physicalInputSourceCode,
    handoverDecisionPanelSource,
    handoverDecisionSourceCode,
    handoverDecisionControllerCode,
    operatorHudSource,
    mainSource
  ] = await Promise.all([
    readFile(handoverDecisionModulePath, "utf8"),
    readFile(physicalInputModulePath, "utf8"),
    readFile(physicalInputSourceModulePath, "utf8"),
    readFile(handoverDecisionPanelPath, "utf8"),
    readFile(handoverDecisionSourceModulePath, "utf8"),
    readFile(handoverDecisionControllerModulePath, "utf8"),
    readFile(operatorHudModulePath, "utf8"),
    readFile(mainPath, "utf8")
  ]);

  const requiredDecisionSnippets = [
    "phase6.4-bootstrap-handover-decision-report.v1",
    "export interface HandoverDecisionSnapshot {",
    "export interface HandoverDecisionResult {",
    '"latency-better"',
    '"policy-hold"',
    '"tie-break"',
    "evaluateHandoverDecisionSnapshot"
  ];

  for (const snippet of requiredDecisionSnippets) {
    assert(
      handoverDecisionSource.includes(snippet),
      `Missing handover decision snippet: ${snippet}`
    );
  }

  assert(
    handoverDecisionPanelSource.includes('data-handover-decision-panel="bootstrap"'),
    "Handover decision HUD panel must expose a bootstrap readout surface."
  );
  assert(
    handoverDecisionSourceCode.includes(
      "createBootstrapProxyHandoverDecisionSourceCatalog"
    ),
    "Bootstrap handover decision source catalog must exist."
  );
  assert(
    handoverDecisionSourceCode.includes("resolveBootstrapPhysicalProjectedMetrics"),
    "Bootstrap handover decision source must consume projected physical-input metrics."
  );
  assert(
    physicalInputSourceCode.includes("createBootstrapPhysicalInputSourceCatalog"),
    "Bootstrap physical-input source catalog must exist for Phase 6.5 integration."
  );
  assert(
    handoverDecisionControllerCode.includes("createBootstrapHandoverDecisionController"),
    "Bootstrap handover decision controller must exist."
  );
  assert(
    operatorHudSource.includes("handoverDecisionController"),
    "Operator HUD must accept the narrow handover decision controller."
  );
  assert(
    mainSource.includes("createBootstrapHandoverDecisionController"),
    "main.ts must create the bootstrap handover decision controller."
  );
  assert(
    mainSource.includes("handoverDecision: bootstrapHandoverDecisionController"),
    "main.ts capture seam must expose handover decision state for bounded verification."
  );

  await Promise.all([
    writeFile(
      join(tempModuleDir, "handover-decision.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(handoverDecisionSource, "handover-decision.ts")
      )
    ),
    writeFile(
      join(tempModuleDir, "physical-input.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(physicalInputSource, "physical-input.ts")
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
    HANDOVER_DECISION_REPORT_SCHEMA_VERSION,
    evaluateHandoverDecisionSnapshot
  } = await import(pathToFileURL(join(tempModuleDir, "handover-decision.mjs")).href);
  const {
    BOOTSTRAP_HANDOVER_POLICY_ID,
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
  const sourceCatalog =
    createBootstrapProxyHandoverDecisionSourceCatalog(scenarioDefinitions);

  assert.equal(
    sourceCatalog.entries.length,
    scenarioDefinitions.length,
    "Bootstrap handover source catalog must cover every bootstrap scenario."
  );
  assert(
    sourceCatalog.entries.every((entry) => entry.policyId === BOOTSTRAP_HANDOVER_POLICY_ID),
    "Bootstrap handover source catalog must stay on the fixed repo-owned policy id."
  );
  assert.throws(
    () =>
      createBootstrapProxyHandoverDecisionSourceCatalog([
        {
          id: "bootstrap-invalid-validation",
          label: "Bootstrap Invalid Validation",
          kind: "real-time",
          presentation: { presetKey: "site" },
          time: { mode: "real-time" },
          sources: {
            validation: {
              mode: "too-early",
              transport: "not-allowed"
            }
          }
        }
      ]),
    /must not attach validation refs/,
    "Bootstrap handover decision source catalog must reject validation attachments."
  );

  const initialSnapshot = resolveBootstrapProxyHandoverDecisionSnapshot(sourceCatalog, {
    scenarioId: "bootstrap-global-real-time",
    evaluatedAt: "2026-04-19T08:10:00.000Z",
    activeRange: {
      start: "2026-04-19T08:00:00.000Z",
      stop: "2026-04-19T09:00:00.000Z"
    }
  });
  const initialState = evaluateHandoverDecisionSnapshot(initialSnapshot);

  assert.equal(
    initialState.result.decisionKind,
    "hold",
    "Initial handover decision must hold the seeded serving candidate."
  );
  assert.equal(
    initialState.result.reasonSignals.some((signal) => signal.code === "policy-hold"),
    true,
    "Initial handover decision must expose a repo-owned hold reason."
  );
  assert.equal(
    initialState.report.schemaVersion,
    HANDOVER_DECISION_REPORT_SCHEMA_VERSION,
    "Handover decision report must expose the stable Phase 6.4 schema version."
  );
  JSON.stringify(initialState);

  const switchingSnapshot = resolveBootstrapProxyHandoverDecisionSnapshot(sourceCatalog, {
    scenarioId: "bootstrap-global-real-time",
    evaluatedAt: "2026-04-19T08:32:00.000Z",
    activeRange: {
      start: "2026-04-19T08:00:00.000Z",
      stop: "2026-04-19T09:00:00.000Z"
    },
    currentServingCandidateId: initialState.result.servingCandidateId
  });
  const switchingState = evaluateHandoverDecisionSnapshot(switchingSnapshot);

  assert.equal(
    switchingState.result.decisionKind,
    "switch",
    "Mid-window handover decision must switch when a better candidate appears."
  );
  assert.deepEqual(
    switchingState.result.reasonSignals.map((signal) => signal.code),
    ["latency-better", "jitter-better", "network-speed-better"],
    "Switching decision must explain the better metrics directly from the evaluator."
  );

  const missingCurrentSnapshot = resolveBootstrapProxyHandoverDecisionSnapshot(sourceCatalog, {
    scenarioId: "bootstrap-global-real-time",
    evaluatedAt: "2026-04-19T08:51:00.000Z",
    activeRange: {
      start: "2026-04-19T08:00:00.000Z",
      stop: "2026-04-19T09:00:00.000Z"
    },
    currentServingCandidateId: switchingState.result.servingCandidateId
  });
  const missingCurrentState = evaluateHandoverDecisionSnapshot(missingCurrentSnapshot);

  assert.equal(
    missingCurrentState.result.reasonSignals.some(
      (signal) => signal.code === "current-link-unavailable"
    ),
    true,
    "Handover decision must flag the missing current serving candidate explicitly."
  );

  const unavailableState = evaluateHandoverDecisionSnapshot({
    scenarioId: "bootstrap-site-prerecorded",
    evaluatedAt: "2026-04-19T08:20:00.000Z",
    activeRange: {
      start: "2026-04-19T08:00:00.000Z",
      stop: "2026-04-19T09:00:00.000Z"
    },
    currentServingCandidateId: "site-leo-primary",
    policyId: BOOTSTRAP_HANDOVER_POLICY_ID,
    candidates: []
  });

  assert.equal(
    unavailableState.result.decisionKind,
    "unavailable",
    "Handover decision evaluator must support explicit unavailable output."
  );

  const operatorState = createOperatorControllerMock({
    scenarioId: "bootstrap-global-real-time",
    scenarioLabel: "Bootstrap Global",
    scenePresetKey: "global",
    replayMode: "real-time",
    currentTime: "2026-04-19T08:10:00.000Z",
    startTime: "2026-04-19T08:00:00.000Z",
    stopTime: "2026-04-19T09:00:00.000Z",
    replayMultiplier: 1,
    isPlaying: false
  });
  const handoverController = createBootstrapHandoverDecisionController({
    operatorState,
    scenarioCatalog: {
      definitions: scenarioDefinitions,
      options: [],
      initialScenarioId: "bootstrap-global-real-time"
    }
  });

  assert.equal(
    handoverController.getState().result.decisionKind,
    "hold",
    "Controller must expose the initial hold state."
  );

  operatorState.emit({
    scenarioId: "bootstrap-global-real-time",
    scenarioLabel: "Bootstrap Global",
    scenePresetKey: "global",
    replayMode: "real-time",
    currentTime: "2026-04-19T08:32:00.000Z",
    startTime: "2026-04-19T08:00:00.000Z",
    stopTime: "2026-04-19T09:00:00.000Z",
    replayMultiplier: 1,
    isPlaying: false
  });
  const controllerSwitchState = handoverController.getState();

  assert.equal(
    controllerSwitchState.result.decisionKind,
    "switch",
    "Controller must react to replay-clock driven time changes."
  );

  operatorState.emit({
    scenarioId: "bootstrap-global-real-time",
    scenarioLabel: "Bootstrap Global",
    scenePresetKey: "global",
    replayMode: "real-time",
    currentTime: "2026-04-19T08:51:00.000Z",
    startTime: "2026-04-19T08:00:00.000Z",
    stopTime: "2026-04-19T09:00:00.000Z",
    replayMultiplier: 1,
    isPlaying: false
  });
  const controllerLateState = handoverController.getState();

  assert.equal(
    controllerLateState.result.reasonSignals.some(
      (signal) => signal.code === "current-link-unavailable"
    ),
    true,
    "Controller must preserve the current-link-unavailable reason across bootstrap updates."
  );

  handoverController.dispose();

  console.log(
    `Phase 6.4 bootstrap handover decision verification passed: ${JSON.stringify({
      initialKind: initialState.result.decisionKind,
      switchKind: switchingState.result.decisionKind,
      lateReasons: missingCurrentState.result.reasonSignals.map((signal) => signal.code),
      schemaVersion: initialState.report.schemaVersion
    })}`
  );
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
