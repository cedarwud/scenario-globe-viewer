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
const physicalInputPanelPath = new URL(
  "../src/features/physical-input/bootstrap-physical-input-panel.ts",
  import.meta.url
);
const physicalInputSourceModulePath = new URL(
  "../src/runtime/bootstrap-physical-input-source.ts",
  import.meta.url
);
const physicalInputControllerModulePath = new URL(
  "../src/runtime/bootstrap-physical-input-controller.ts",
  import.meta.url
);
const handoverDecisionModulePath = new URL(
  "../src/features/handover-decision/handover-decision.ts",
  import.meta.url
);
const handoverDecisionSourceModulePath = new URL(
  "../src/runtime/bootstrap-handover-decision-source.ts",
  import.meta.url
);
const operatorHudModulePath = new URL(
  "../src/features/operator/bootstrap-operator-hud.ts",
  import.meta.url
);
const mainPath = new URL("../src/main.ts", import.meta.url);
const bootstrapCompositionPath = new URL(
  "../src/runtime/bootstrap/composition.ts",
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

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-phase6.5-"));

try {
  const [
    physicalInputSource,
    physicalInputPanelSource,
    physicalInputSourceCode,
    physicalInputControllerCode,
    handoverDecisionSource,
    handoverDecisionSourceCode,
    operatorHudSource,
    mainSource,
    bootstrapCompositionSource
  ] = await Promise.all([
    readFile(physicalInputModulePath, "utf8"),
    readFile(physicalInputPanelPath, "utf8"),
    readFile(physicalInputSourceModulePath, "utf8"),
    readFile(physicalInputControllerModulePath, "utf8"),
    readFile(handoverDecisionModulePath, "utf8"),
    readFile(handoverDecisionSourceModulePath, "utf8"),
    readFile(operatorHudModulePath, "utf8"),
    readFile(mainPath, "utf8"),
    readFile(bootstrapCompositionPath, "utf8")
  ]);

  const requiredPhysicalInputSnippets = [
    'type PhysicalInputFamily = "antenna" | "rain-attenuation" | "itu-style"',
    'type PhysicalInputProvenanceKind = "bounded-proxy"',
    "export interface CandidatePhysicalInputs {",
    "export interface PhysicalInputSourceCatalog {",
    "export interface PhysicalInputState {",
    "phase6.5-bootstrap-physical-input-report.v1",
    "createPhysicalInputState",
    "Projected into latencyMs / jitterMs / networkSpeedMbps"
  ];

  for (const snippet of requiredPhysicalInputSnippets) {
    assert(
      physicalInputSource.includes(snippet),
      `Missing physical-input snippet: ${snippet}`
    );
  }

  assert(
    physicalInputPanelSource.includes('data-physical-input-panel="bootstrap"'),
    "Physical-input HUD panel must expose a bootstrap readout surface."
  );
  assert(
    physicalInputSourceCode.includes("createBootstrapPhysicalInputSourceCatalog"),
    "Bootstrap physical-input source catalog must exist."
  );
  assert(
    physicalInputControllerCode.includes("createBootstrapPhysicalInputController"),
    "Bootstrap physical-input controller must exist."
  );
  assert(
    handoverDecisionSourceCode.includes("resolveBootstrapPhysicalProjectedMetrics"),
    "Handover decision source must consume projected physical-input metrics."
  );
  assert(
    operatorHudSource.includes("physicalInputController"),
    "Operator HUD must accept the narrow physical-input controller."
  );
  assert(
    mainSource.includes("startBootstrapComposition"),
    "main.ts must hand off bootstrap wiring to the dedicated bootstrap composition."
  );
  assert(
    bootstrapCompositionSource.includes("createBootstrapPhysicalInputController"),
    "Bootstrap composition must create the bootstrap physical-input controller."
  );
  assert(
    bootstrapCompositionSource.includes(
      "physicalInput: controllerGraph.physicalInputController"
    ),
    "Bootstrap composition capture seam must expose physical-input state for bounded verification."
  );

  await Promise.all([
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
      join(tempModuleDir, "handover-decision.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(handoverDecisionSource, "handover-decision.ts")
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
    )
  ]);

  const {
    PHYSICAL_INPUT_REPORT_SCHEMA_VERSION
  } = await import(pathToFileURL(join(tempModuleDir, "physical-input.mjs")).href);
  const {
    createBootstrapPhysicalInputSourceCatalog,
    resolveBootstrapPhysicalInputState
  } = await import(
    pathToFileURL(join(tempModuleDir, "bootstrap-physical-input-source.mjs")).href
  );
  const { createBootstrapPhysicalInputController } = await import(
    pathToFileURL(join(tempModuleDir, "bootstrap-physical-input-controller.mjs")).href
  );
  const {
    createBootstrapProxyHandoverDecisionSourceCatalog,
    resolveBootstrapProxyHandoverDecisionSnapshot
  } = await import(
    pathToFileURL(join(tempModuleDir, "bootstrap-handover-decision-source.mjs")).href
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
  const physicalSourceCatalog =
    createBootstrapPhysicalInputSourceCatalog(scenarioDefinitions);

  assert.equal(
    physicalSourceCatalog.entries.length,
    scenarioDefinitions.length,
    "Bootstrap physical-input source catalog must cover every bootstrap scenario."
  );
  assert.deepEqual(
    physicalSourceCatalog.entries[0].provenance.map((entry) => entry.family),
    ["antenna", "rain-attenuation", "itu-style"],
    "Physical-input provenance must stay explicit for antenna, rain, and ITU-style families."
  );
  assert(
    physicalSourceCatalog.entries.every((entry) =>
      entry.provenance.every((provenance) => provenance.kind === "bounded-proxy")
    ),
    "Physical-input provenance families must stay bounded-proxy in the first slice."
  );
  assert.throws(
    () =>
      createBootstrapPhysicalInputSourceCatalog([
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
    "Bootstrap physical-input source catalog must reject 6.6+ validation attachments."
  );

  const physicalState = resolveBootstrapPhysicalInputState(physicalSourceCatalog, {
    scenarioId: "bootstrap-global-real-time",
    scenarioLabel: "Bootstrap Global",
    evaluatedAt: "2026-04-19T08:32:00.000Z",
    activeRange: {
      start: "2026-04-19T08:00:00.000Z",
      stop: "2026-04-19T09:00:00.000Z"
    }
  });

  assert.equal(
    physicalState.report.schemaVersion,
    PHYSICAL_INPUT_REPORT_SCHEMA_VERSION,
    "Physical-input report schema version must stay stable."
  );
  assert.match(
    physicalState.activeWindow.contextLabel,
    /bridge/i,
    "Mid-range physical input selection must resolve the bridge context window."
  );
  assert(
    /bounded proxy physical inputs; not final physical-layer truth/i.test(
      physicalState.disclaimer
    ),
    "Physical-input state must keep the bounded-proxy disclaimer explicit."
  );
  assert(
    /latencyMs \/ jitterMs \/ networkSpeedMbps/i.test(
      physicalState.projectionTarget
    ),
    "Physical-input state must keep the deterministic projection target explicit."
  );
  assert.equal(
    physicalState.projectedMetrics.length,
    physicalState.candidates.length,
    "Projected physical metrics must cover every active candidate."
  );
  assert(
    physicalState.report.candidates.some((candidate) => {
      return (
        candidate.baseMetrics.latencyMs !== candidate.projectedMetrics.latencyMs ||
        candidate.baseMetrics.jitterMs !== candidate.projectedMetrics.jitterMs ||
        candidate.baseMetrics.networkSpeedMbps !==
          candidate.projectedMetrics.networkSpeedMbps
      );
    }),
    "Projected physical metrics must materially differ from bounded proxy baselines."
  );

  const handoverSourceCatalog =
    createBootstrapProxyHandoverDecisionSourceCatalog(scenarioDefinitions);
  const handoverSnapshot = resolveBootstrapProxyHandoverDecisionSnapshot(
    handoverSourceCatalog,
    {
      scenarioId: "bootstrap-global-real-time",
      evaluatedAt: "2026-04-19T08:32:00.000Z",
      activeRange: {
        start: "2026-04-19T08:00:00.000Z",
        stop: "2026-04-19T09:00:00.000Z"
      }
    }
  );

  assert.deepEqual(
    handoverSnapshot.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      latencyMs: candidate.latencyMs,
      jitterMs: candidate.jitterMs,
      networkSpeedMbps: candidate.networkSpeedMbps
    })),
    physicalState.projectedMetrics.map((candidate) => ({
      candidateId: candidate.candidateId,
      latencyMs: candidate.latencyMs,
      jitterMs: candidate.jitterMs,
      networkSpeedMbps: candidate.networkSpeedMbps
    })),
    "Handover decision snapshot must consume the projected physical metrics deterministically."
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
    isPlaying: true
  });
  const controller = createBootstrapPhysicalInputController({
    operatorState,
    scenarioCatalog: {
      definitions: scenarioDefinitions,
      options: [],
      initialScenarioId: "bootstrap-global-real-time"
    }
  });
  const controllerStates = [];
  const unsubscribe = controller.subscribe((state) => {
    controllerStates.push(state);
  });

  operatorState.emit({
    scenarioId: "bootstrap-site-prerecorded",
    scenarioLabel: "Bootstrap Site Replay",
    scenePresetKey: "site",
    replayMode: "prerecorded",
    currentTime: "2026-04-19T08:40:00.000Z",
    startTime: "2026-04-19T08:00:00.000Z",
    stopTime: "2026-04-19T09:00:00.000Z",
    replayMultiplier: 0.5,
    isPlaying: false
  });

  assert.equal(
    controller.getState().scenario.id,
    "bootstrap-site-prerecorded",
    "Physical-input controller must follow bootstrap scenario changes."
  );
  assert.equal(
    controllerStates.at(-1)?.report.schemaVersion,
    PHYSICAL_INPUT_REPORT_SCHEMA_VERSION,
    "Physical-input controller must emit the stable report schema on updates."
  );

  unsubscribe();
  controller.dispose();

  JSON.stringify(physicalState.report);
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
