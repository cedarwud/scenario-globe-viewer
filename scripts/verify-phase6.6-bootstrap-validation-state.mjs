import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const validationStateModulePath = new URL(
  "../src/features/validation-state/validation-state.ts",
  import.meta.url
);
const validationStatePanelPath = new URL(
  "../src/features/validation-state/bootstrap-validation-state-panel.ts",
  import.meta.url
);
const validationStateSourceModulePath = new URL(
  "../src/runtime/bootstrap-validation-state-source.ts",
  import.meta.url
);
const validationStateControllerModulePath = new URL(
  "../src/runtime/bootstrap-validation-state-controller.ts",
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
      /\.\.\/features\/validation-state\.mjs/g,
      "./validation-state.mjs"
    )
    .replace(
      /\.\/bootstrap-validation-state-source\.mjs/g,
      "./bootstrap-validation-state-source.mjs"
    );
}

function createReadableMock(initialState) {
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

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-phase6.6-"));

try {
  const [
    validationStateSource,
    validationStatePanelSource,
    validationStateSourceCode,
    validationStateControllerCode,
    operatorHudSource,
    mainSource,
    bootstrapCompositionSource
  ] = await Promise.all([
    readFile(validationStateModulePath, "utf8"),
    readFile(validationStatePanelPath, "utf8"),
    readFile(validationStateSourceModulePath, "utf8"),
    readFile(validationStateControllerModulePath, "utf8"),
    readFile(operatorHudModulePath, "utf8"),
    readFile(mainPath, "utf8"),
    readFile(bootstrapCompositionPath, "utf8")
  ]);

  const requiredValidationSnippets = [
    'type ValidationEnvironmentMode =',
    '"linux-direct"',
    '"windows-wsl-tunnel"',
    '"inet-nat-bridge"',
    'type ValidationTransportKind = "direct" | "tunnel" | "nat-bridge"',
    'type ValidationDutKind = "virtual" | "physical"',
    'type ValidationAttachState = "detached" | "attached" | "bridged"',
    'type ValidationProvenanceKind = "bounded-proxy"',
    "export interface ValidationStateInput {",
    "export interface ValidationStateReport {",
    "phase6.6-bootstrap-validation-state-report.v1",
    "createValidationState"
  ];

  for (const snippet of requiredValidationSnippets) {
    assert(
      validationStateSource.includes(snippet),
      `Missing validation-state snippet: ${snippet}`
    );
  }

  assert(
    validationStatePanelSource.includes('data-validation-state-panel="bootstrap"'),
    "Validation-state HUD panel must expose a bootstrap readout surface."
  );
  assert(
    validationStateSourceCode.includes("createBootstrapValidationStateSourceCatalog"),
    "Bootstrap validation-state source catalog must exist."
  );
  assert(
    validationStateControllerCode.includes(
      "createBootstrapValidationStateController"
    ),
    "Bootstrap validation-state controller must exist."
  );
  assert(
    operatorHudSource.includes("validationStateController"),
    "Operator HUD must accept the narrow validation-state controller."
  );
  assert(
    mainSource.includes("startBootstrapComposition"),
    "main.ts must hand off bootstrap wiring to the dedicated bootstrap composition."
  );
  assert(
    bootstrapCompositionSource.includes("createBootstrapValidationStateController"),
    "Bootstrap composition must create the bootstrap validation-state controller."
  );
  assert(
    bootstrapCompositionSource.includes(
      "validationState: controllerGraph.validationStateController"
    ),
    "Bootstrap composition capture seam must expose validation-state for bounded verification."
  );

  await Promise.all([
    writeFile(
      join(tempModuleDir, "validation-state.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(validationStateSource, "validation-state.ts")
      )
    ),
    writeFile(
      join(tempModuleDir, "bootstrap-validation-state-source.mjs"),
      localizeTempImports(
        rewriteRelativeImports(
          transpileTypeScript(
            validationStateSourceCode,
            "bootstrap-validation-state-source.ts"
          )
        )
      )
    ),
    writeFile(
      join(tempModuleDir, "bootstrap-validation-state-controller.mjs"),
      localizeTempImports(
        rewriteRelativeImports(
          transpileTypeScript(
            validationStateControllerCode,
            "bootstrap-validation-state-controller.ts"
          )
        )
      )
    )
  ]);

  const {
    VALIDATION_STATE_REPORT_SCHEMA_VERSION
  } = await import(pathToFileURL(join(tempModuleDir, "validation-state.mjs")).href);
  const {
    createBootstrapValidationStateSourceCatalog,
    resolveBootstrapValidationState
  } = await import(
    pathToFileURL(join(tempModuleDir, "bootstrap-validation-state-source.mjs")).href
  );
  const { createBootstrapValidationStateController } = await import(
    pathToFileURL(
      join(tempModuleDir, "bootstrap-validation-state-controller.mjs")
    ).href
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
      id: "bootstrap-regional-real-time",
      label: "Bootstrap Regional",
      kind: "real-time",
      presentation: { presetKey: "regional" },
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
    createBootstrapValidationStateSourceCatalog(scenarioDefinitions);

  assert.equal(
    sourceCatalog.entries.length,
    scenarioDefinitions.length,
    "Bootstrap validation-state source catalog must cover every bootstrap scenario."
  );
  assert.deepEqual(
    [...new Set(sourceCatalog.entries.map((entry) => entry.environmentMode))].sort(),
    ["inet-nat-bridge", "linux-direct", "windows-wsl-tunnel"],
    "Bootstrap validation-state source catalog must expose the three locked environment modes."
  );
  assert.deepEqual(
    [...new Set(sourceCatalog.entries.map((entry) => entry.dutKind))].sort(),
    ["physical", "virtual"],
    "Bootstrap validation-state source catalog must expose both virtual and physical DUT boundaries."
  );
  assert.throws(
    () =>
      createBootstrapValidationStateSourceCatalog([
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
    "Bootstrap validation-state source catalog must reject early scenario validation attachments."
  );

  const globalState = resolveBootstrapValidationState(sourceCatalog, {
    scenarioId: "bootstrap-global-real-time",
    evaluatedAt: "2026-04-19T08:30:00.000Z",
    activeRange: {
      start: "2026-04-19T08:00:00.000Z",
      stop: "2026-04-19T09:00:00.000Z"
    },
    servingCandidateId: "global-leo-primary"
  });
  const regionalState = resolveBootstrapValidationState(sourceCatalog, {
    scenarioId: "bootstrap-regional-real-time",
    evaluatedAt: "2026-04-19T08:35:00.000Z",
    activeRange: {
      start: "2026-04-19T08:00:00.000Z",
      stop: "2026-04-19T09:00:00.000Z"
    },
    servingCandidateId: "regional-meo-bridge"
  });
  const siteState = resolveBootstrapValidationState(sourceCatalog, {
    scenarioId: "bootstrap-site-prerecorded",
    evaluatedAt: "2026-04-19T08:32:00.000Z",
    activeRange: {
      start: "2026-04-19T08:00:00.000Z",
      stop: "2026-04-19T09:00:00.000Z"
    },
    servingCandidateId: "site-leo-primary"
  });
  const siteDetachedState = resolveBootstrapValidationState(sourceCatalog, {
    scenarioId: "bootstrap-site-prerecorded",
    evaluatedAt: "2026-04-19T08:01:00.000Z",
    activeRange: {
      start: "2026-04-19T08:00:00.000Z",
      stop: "2026-04-19T09:00:00.000Z"
    },
    servingCandidateId: "site-leo-primary"
  });

  assert.equal(
    globalState.environmentMode,
    "linux-direct",
    "Global validation state must stay on the linux-direct mode."
  );
  assert.equal(
    globalState.transportKind,
    "direct",
    "Global validation state must keep transport separate from environment mode."
  );
  assert.equal(
    globalState.dutKind,
    "virtual",
    "Global validation state must expose the virtual DUT boundary explicitly."
  );
  assert.equal(
    globalState.attachState,
    "attached",
    "Global validation state must materialize an attached mid-range window."
  );
  assert.equal(
    globalState.servingCandidateId,
    "global-leo-primary",
    "Attached validation state must preserve serving-candidate context."
  );

  assert.equal(
    regionalState.environmentMode,
    "windows-wsl-tunnel",
    "Regional validation state must stay on the windows-wsl-tunnel mode."
  );
  assert.equal(
    regionalState.transportKind,
    "tunnel",
    "Regional validation state must expose tunnel transport explicitly."
  );
  assert.equal(
    regionalState.attachState,
    "attached",
    "Regional validation state must materialize an attached tunnel window."
  );

  assert.equal(
    siteState.environmentMode,
    "inet-nat-bridge",
    "Site validation state must stay on the inet-nat-bridge mode."
  );
  assert.equal(
    siteState.transportKind,
    "nat-bridge",
    "Site validation state must expose NAT bridge transport explicitly."
  );
  assert.equal(
    siteState.dutKind,
    "physical",
    "Site validation state must expose the physical DUT boundary explicitly."
  );
  assert.equal(
    siteState.attachState,
    "bridged",
    "Site validation state must materialize a bridged mid-range window."
  );
  assert.equal(
    siteDetachedState.attachState,
    "detached",
    "Early site validation state must materialize a detached window."
  );
  assert.equal(
    siteDetachedState.servingCandidateId,
    undefined,
    "Detached validation state must not claim a serving candidate."
  );
  assert.equal(
    siteState.report.schemaVersion,
    VALIDATION_STATE_REPORT_SCHEMA_VERSION,
    "Validation-state report must expose the stable Phase 6.6 schema version."
  );
  assert.match(
    siteState.ownershipNote,
    /Viewer repo owns/i,
    "Validation-state ownership note must keep viewer ownership explicit."
  );
  assert.match(
    siteState.ownershipNote,
    /external validation stack owns/i,
    "Validation-state ownership note must keep external ownership explicit."
  );
  JSON.stringify(siteState.report);

  const operatorState = createReadableMock({
    scenarioId: "bootstrap-global-real-time",
    scenarioLabel: "Bootstrap Global",
    scenePresetKey: "global",
    replayMode: "real-time",
    currentTime: "2026-04-19T08:30:00.000Z",
    startTime: "2026-04-19T08:00:00.000Z",
    stopTime: "2026-04-19T09:00:00.000Z",
    replayMultiplier: 1,
    isPlaying: false
  });
  const servingContext = createReadableMock({
    scenarioId: "bootstrap-global-real-time",
    servingCandidateId: "global-leo-primary"
  });
  const validationStateController = createBootstrapValidationStateController({
    operatorState,
    servingContext,
    scenarioCatalog: {
      definitions: scenarioDefinitions,
      options: [],
      initialScenarioId: "bootstrap-global-real-time"
    }
  });

  assert.equal(
    validationStateController.getState().servingCandidateId,
    "global-leo-primary",
    "Validation-state controller must consume the current serving candidate as bounded context."
  );

  servingContext.emit({
    scenarioId: "bootstrap-global-real-time",
    servingCandidateId: "global-meo-bridge"
  });
  assert.equal(
    validationStateController.getState().servingCandidateId,
    "global-meo-bridge",
    "Validation-state controller must react to handover state updates."
  );

  operatorState.emit({
    scenarioId: "bootstrap-site-prerecorded",
    scenarioLabel: "Bootstrap Site Replay",
    scenePresetKey: "site",
    replayMode: "prerecorded",
    currentTime: "2026-04-19T08:32:00.000Z",
    startTime: "2026-04-19T08:00:00.000Z",
    stopTime: "2026-04-19T09:00:00.000Z",
    replayMultiplier: 1,
    isPlaying: false
  });
  assert.equal(
    validationStateController.getState().servingCandidateId,
    undefined,
    "Validation-state controller must ignore stale serving candidates when the scenario changes."
  );

  servingContext.emit({
    scenarioId: "bootstrap-site-prerecorded",
    servingCandidateId: "site-leo-primary"
  });
  assert.equal(
    validationStateController.getState().attachState,
    "bridged",
    "Validation-state controller must keep the bridged site boundary after handover updates."
  );
  assert.equal(
    validationStateController.getState().servingCandidateId,
    "site-leo-primary",
    "Validation-state controller must restore serving-candidate context once the scenario matches."
  );

  operatorState.emit({
    scenarioId: "bootstrap-site-prerecorded",
    scenarioLabel: "Bootstrap Site Replay",
    scenePresetKey: "site",
    replayMode: "prerecorded",
    currentTime: "2026-04-19T08:01:00.000Z",
    startTime: "2026-04-19T08:00:00.000Z",
    stopTime: "2026-04-19T09:00:00.000Z",
    replayMultiplier: 1,
    isPlaying: false
  });
  assert.equal(
    validationStateController.getState().attachState,
    "detached",
    "Validation-state controller must materialize detached windows from evaluated time."
  );
  assert.equal(
    validationStateController.getState().servingCandidateId,
    undefined,
    "Detached validation-state controller output must clear the serving candidate."
  );

  validationStateController.dispose();

  console.log(
    `Phase 6.6 bootstrap validation-state verification passed: ${JSON.stringify({
      globalMode: globalState.environmentMode,
      regionalMode: regionalState.environmentMode,
      siteMode: siteState.environmentMode,
      siteAttachState: siteState.attachState,
      schemaVersion: siteState.report.schemaVersion
    })}`
  );
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
