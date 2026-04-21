import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const communicationTimeModulePath = new URL(
  "../src/features/communication-time/communication-time.ts",
  import.meta.url
);
const communicationSourceModulePath = new URL(
  "../src/runtime/bootstrap-communication-time-source.ts",
  import.meta.url
);
const communicationControllerModulePath = new URL(
  "../src/runtime/bootstrap-communication-time-controller.ts",
  import.meta.url
);
const communicationHudModulePath = new URL(
  "../src/features/communication-time/bootstrap-communication-time-panel.ts",
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
  return source.replace(
    /\.\.\/features\/communication-time\/communication-time\.mjs/g,
    "./communication-time.mjs"
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

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-phase6.3-"));

try {
  const [
    communicationTimeSource,
    communicationSourceCode,
    communicationControllerCode,
    communicationHudSource,
    operatorHudSource,
    mainSource,
    bootstrapCompositionSource
  ] = await Promise.all([
    readFile(communicationTimeModulePath, "utf8"),
    readFile(communicationSourceModulePath, "utf8"),
    readFile(communicationControllerModulePath, "utf8"),
    readFile(communicationHudModulePath, "utf8"),
    readFile(operatorHudModulePath, "utf8"),
    readFile(mainPath, "utf8"),
    readFile(bootstrapCompositionPath, "utf8")
  ]);

  const requiredCommunicationSnippets = [
    "BOOTSTRAP_PROXY_PROVENANCE_DETAIL",
    "export interface CommunicationTimeState {",
    "export interface CommunicationTimeReport {",
    "export function createCommunicationTimeState(",
    "phase6.3-bootstrap-communication-time-report.v1",
    "bootstrap-proxy"
  ];

  for (const snippet of requiredCommunicationSnippets) {
    assert(
      communicationTimeSource.includes(snippet),
      `Missing communication-time snippet: ${snippet}`
    );
  }

  assert(
    communicationSourceCode.includes("createBootstrapProxyCommunicationTimeSourceCatalog"),
    "Bootstrap proxy source catalog must exist."
  );
  assert(
    communicationControllerCode.includes("createBootstrapCommunicationTimeController"),
    "Bootstrap communication-time controller must exist."
  );
  assert(
    communicationHudSource.includes('data-communication-panel="bootstrap"'),
    "Communication-time HUD panel must expose a bootstrap readout surface."
  );
  assert(
    operatorHudSource.includes("communicationTimeController"),
    "Operator HUD must accept the narrow communication-time controller."
  );
  assert(
    mainSource.includes("startBootstrapComposition"),
    "main.ts must hand off bootstrap wiring to the dedicated bootstrap composition."
  );
  assert(
    bootstrapCompositionSource.includes("createBootstrapCommunicationTimeController"),
    "Bootstrap composition must create the bootstrap communication-time controller."
  );
  assert(
    bootstrapCompositionSource.includes(
      "communicationTime: controllerGraph.communicationTimeController"
    ),
    "Bootstrap composition capture seam must expose communication-time state for bounded verification."
  );

  await Promise.all([
    writeFile(
      join(tempModuleDir, "communication-time.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(communicationTimeSource, "communication-time.ts")
      )
    ),
    writeFile(
      join(tempModuleDir, "bootstrap-communication-time-source.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(
          communicationSourceCode,
          "bootstrap-communication-time-source.ts"
        )
      )
    ),
    writeFile(
      join(tempModuleDir, "bootstrap-communication-time-controller.mjs"),
      localizeTempImports(
        rewriteRelativeImports(
        transpileTypeScript(
          communicationControllerCode,
          "bootstrap-communication-time-controller.ts"
        )
        )
      )
    )
  ]);

  const {
    COMMUNICATION_TIME_REPORT_SCHEMA_VERSION,
    createCommunicationTimeState
  } = await import(pathToFileURL(join(tempModuleDir, "communication-time.mjs")).href);
  const {
    createBootstrapProxyCommunicationTimeSourceCatalog
  } = await import(
    pathToFileURL(join(tempModuleDir, "bootstrap-communication-time-source.mjs")).href
  );
  const { createBootstrapCommunicationTimeController } = await import(
    pathToFileURL(join(tempModuleDir, "bootstrap-communication-time-controller.mjs")).href
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
    createBootstrapProxyCommunicationTimeSourceCatalog(scenarioDefinitions);

  assert.equal(
    sourceCatalog.entries.length,
    scenarioDefinitions.length,
    "Bootstrap proxy source catalog must cover every bootstrap scenario."
  );
  assert(
    sourceCatalog.entries.every((entry) => entry.sourceKind === "bootstrap-proxy"),
    "Bootstrap proxy source catalog must stay provenance-tagged."
  );
  assert.throws(
    () =>
      createBootstrapProxyCommunicationTimeSourceCatalog([
        {
          id: "bootstrap-invalid-site-dataset",
          label: "Bootstrap Invalid Site Dataset",
          kind: "real-time",
          presentation: { presetKey: "site" },
          time: { mode: "real-time" },
          sources: {
            siteDataset: {
              source: "none",
              datasetRef: "should-not-attach"
            }
          }
        }
      ]),
    /must not attach site datasets/,
    "Bootstrap communication-time source catalog must reject site-dataset attachments."
  );

  const directState = createCommunicationTimeState({
    scenario: {
      id: "bootstrap-global-real-time",
      label: "Bootstrap Global",
      presetKey: "global",
      mode: "real-time"
    },
    activeRange: {
      start: "2026-04-19T08:00:00.000Z",
      stop: "2026-04-19T09:00:00.000Z"
    },
    currentTime: "2026-04-19T08:12:00.000Z",
    sourceKind: "bootstrap-proxy",
    windowTemplates: sourceCatalog.entries[0].windowTemplates
  });

  assert.equal(
    directState.provenance.sourceKind,
    "bootstrap-proxy",
    "Communication-time state must preserve bootstrap proxy provenance."
  );
  assert.equal(
    directState.provenance.detail.includes("not a real network measurement"),
    true,
    "Communication-time provenance must explicitly describe the bootstrap proxy boundary."
  );
  assert.equal(
    directState.report.schemaVersion,
    COMMUNICATION_TIME_REPORT_SCHEMA_VERSION,
    "Communication-time report must expose the stable Phase 6.3 schema version."
  );
  assert.equal(
    directState.report.scenario.id,
    directState.scenario.id,
    "Communication-time report must stay aligned with the active scenario id."
  );
  assert(
    directState.summary.totalCommunicatingMs > 0,
    "Communication-time summary must report bounded communicating duration."
  );
  assert.equal(
    directState.summary.totalRangeMs,
    directState.summary.totalCommunicatingMs + directState.summary.totalUnavailableMs,
    "Communication-time summary must preserve communicating/unavailable complements."
  );
  assert.equal(
    directState.report.provenance.detail.includes("active scenario range"),
    true,
    "Export-ready report must retain the explicit bootstrap proxy provenance detail."
  );
  JSON.stringify(directState);

  const operatorController = createOperatorControllerMock({
    scenarioId: "bootstrap-global-real-time",
    scenarioLabel: "Bootstrap Global",
    scenePresetKey: "global",
    replayMode: "real-time",
    currentTime: "2026-04-19T08:12:00.000Z",
    startTime: "2026-04-19T08:00:00.000Z",
    stopTime: "2026-04-19T09:00:00.000Z",
    replayMultiplier: 1,
    isPlaying: false
  });
  const controller = createBootstrapCommunicationTimeController({
    operatorState: operatorController,
    scenarioCatalog: {
      definitions: scenarioDefinitions,
      options: [],
      initialScenarioId: "bootstrap-global-real-time"
    }
  });
  const observedStates = [];
  const unsubscribe = controller.subscribe((state) => {
    observedStates.push(state);
  });

  assert.equal(
    controller.getState().scenario.id,
    "bootstrap-global-real-time",
    "Communication-time controller must seed from the active operator scenario."
  );

  operatorController.emit({
    scenarioId: "bootstrap-site-prerecorded",
    scenarioLabel: "Bootstrap Site Replay",
    scenePresetKey: "site",
    replayMode: "prerecorded",
    currentTime: "2026-04-19T08:47:00.000Z",
    startTime: "2026-04-19T08:30:00.000Z",
    stopTime: "2026-04-19T08:50:00.000Z",
    replayMultiplier: 2,
    isPlaying: false
  });

  assert.equal(
    observedStates.at(-1)?.scenario.id,
    "bootstrap-site-prerecorded",
    "Communication-time controller must follow scenario changes from the operator controller."
  );
  assert.equal(
    observedStates.at(-1)?.report.scenario.mode,
    "prerecorded",
    "Communication-time controller must keep the export-ready report aligned with replay mode."
  );
  assert(
    observedStates.at(-1)?.report.windows.every(
      (window) => window.sourceKind === "bootstrap-proxy"
    ),
    "Communication-time report windows must preserve bootstrap proxy provenance."
  );
  assert.equal(
    observedStates.at(-1)?.report.provenance.detail.includes("not a real network measurement"),
    true,
    "Communication-time controller must keep provenance detail aligned with export-ready report state."
  );
  JSON.stringify(observedStates.at(-1));

  unsubscribe();
  controller.dispose();

  console.log(
    `Phase 6.3 bootstrap communication-time verification passed: ${JSON.stringify({
      directState: {
        scenarioId: directState.scenario.id,
        sourceKind: directState.provenance.sourceKind,
        schemaVersion: directState.report.schemaVersion,
        totalCommunicatingMs: directState.summary.totalCommunicatingMs
      },
      observedStates: observedStates.map((state) => ({
        scenarioId: state.scenario.id,
        mode: state.report.scenario.mode,
        sourceKind: state.provenance.sourceKind
      }))
    })}`
  );
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
