import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const scenarioModulePath = new URL(
  "../src/features/scenario/resolve-scenario-inputs.ts",
  import.meta.url
);
const scenarioFacadePath = new URL(
  "../src/features/scenario/scenario-facade.ts",
  import.meta.url
);
const scenarioPlanRunnerPath = new URL(
  "../src/features/scenario/scenario-plan-runner.ts",
  import.meta.url
);
const scenarioSessionPath = new URL(
  "../src/features/scenario/scenario-session.ts",
  import.meta.url
);
const scenarioRuntimePlanDriverPath = new URL(
  "../src/runtime/scenario-runtime-plan-driver.ts",
  import.meta.url
);
const scenarioRuntimeSessionPath = new URL(
  "../src/runtime/scenario-runtime-session.ts",
  import.meta.url
);
const scenarioBootstrapSessionPath = new URL(
  "../src/runtime/scenario-bootstrap-session.ts",
  import.meta.url
);
const resolveBootstrapScenarioPath = new URL(
  "../src/runtime/resolve-bootstrap-scenario.ts",
  import.meta.url
);
const scenarioShapePath = new URL(
  "../src/features/scenario/scenario.ts",
  import.meta.url
);
const scenarioIndexPath = new URL(
  "../src/features/scenario/index.ts",
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

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-phase6.1-"));

await Promise.all([
  mkdir(join(tempModuleDir, "features/globe"), { recursive: true }),
  mkdir(join(tempModuleDir, "runtime"), { recursive: true })
]);

const [
  scenarioShapeSource,
  scenarioModuleSource,
  scenarioFacadeSource,
  scenarioPlanRunnerSource,
  scenarioSessionSource,
  scenarioRuntimePlanDriverSource,
  scenarioRuntimeSessionSource,
  scenarioBootstrapSessionSource,
  resolveBootstrapScenarioSource,
  scenarioIndexSource,
  mainSource,
  bootstrapCompositionSource
] = await Promise.all([
  readFile(scenarioShapePath, "utf8"),
  readFile(scenarioModulePath, "utf8"),
  readFile(scenarioFacadePath, "utf8"),
  readFile(scenarioPlanRunnerPath, "utf8"),
  readFile(scenarioSessionPath, "utf8"),
  readFile(scenarioRuntimePlanDriverPath, "utf8"),
  readFile(scenarioRuntimeSessionPath, "utf8"),
  readFile(scenarioBootstrapSessionPath, "utf8"),
  readFile(resolveBootstrapScenarioPath, "utf8"),
  readFile(scenarioIndexPath, "utf8"),
  readFile(mainPath, "utf8"),
  readFile(bootstrapCompositionPath, "utf8")
]);

await Promise.all([
  writeFile(
    join(tempModuleDir, "scenario"),
    transpileTypeScript(scenarioShapeSource, "scenario.ts")
  ),
  writeFile(
    join(tempModuleDir, "resolve-scenario-inputs"),
    transpileTypeScript(scenarioModuleSource, "resolve-scenario-inputs.ts")
  ),
  writeFile(
    join(tempModuleDir, "scenario-facade"),
    transpileTypeScript(scenarioFacadeSource, "scenario-facade.ts")
  ),
  writeFile(
    join(tempModuleDir, "scenario-plan-runner"),
    transpileTypeScript(scenarioPlanRunnerSource, "scenario-plan-runner.ts")
  ),
  writeFile(
    join(tempModuleDir, "scenario-session"),
    transpileTypeScript(scenarioSessionSource, "scenario-session.ts")
  ),
  writeFile(
    join(tempModuleDir, "runtime/scenario-runtime-plan-driver"),
    transpileTypeScript(
      scenarioRuntimePlanDriverSource,
      "runtime/scenario-runtime-plan-driver.ts"
    )
  ),
  writeFile(
    join(tempModuleDir, "runtime/scenario-runtime-session"),
    transpileTypeScript(
      scenarioRuntimeSessionSource,
      "runtime/scenario-runtime-session.ts"
    )
  ),
  writeFile(
    join(tempModuleDir, "runtime/scenario-bootstrap-session"),
    transpileTypeScript(
      scenarioBootstrapSessionSource,
      "runtime/scenario-bootstrap-session.ts"
    )
  ),
  writeFile(
    join(tempModuleDir, "runtime/resolve-bootstrap-scenario"),
    transpileTypeScript(
      resolveBootstrapScenarioSource,
      "runtime/resolve-bootstrap-scenario.ts"
    )
  ),
  writeFile(
    join(tempModuleDir, "features/scenario"),
    ['export { createScenarioSession } from "../scenario-session";'].join("\n")
  ),
  writeFile(
    join(tempModuleDir, "features/globe/scene-preset"),
    [
      "export function getScenePreset(key) {",
      "  return { id: `preset-${key}`, label: key };",
      "}"
    ].join("\n")
  ),
  writeFile(
    join(tempModuleDir, "features/globe/scene-preset-runtime"),
    [
      "export const SCENE_PRESET_RUNTIME_CALLS = [];",
      "export function applyScenePreset(viewer, preset, options = {}) {",
      "  SCENE_PRESET_RUNTIME_CALLS.push({ viewer, preset, options });",
      "}"
    ].join("\n")
  )
]);

const {
  createScenarioUnloadPlan,
  createScenarioSwitchPlan,
  resolveScenarioInputs,
  resolveScenarioPresentationRef,
  resolveScenarioSatelliteSource,
  resolveScenarioSiteDatasetRef,
  resolveScenarioTimeInput,
  resolveScenarioValidationRef
} = await import(pathToFileURL(join(tempModuleDir, "resolve-scenario-inputs")).href);
const { createScenarioFacade } = await import(
  pathToFileURL(join(tempModuleDir, "scenario-facade")).href
);
const { executeScenarioSwitchPlan, executeScenarioUnloadPlan } = await import(
  pathToFileURL(join(tempModuleDir, "scenario-plan-runner")).href
);
const { createScenarioSession } = await import(
  pathToFileURL(join(tempModuleDir, "scenario-session")).href
);
const {
  createRuntimeSatellitePlanBinding,
  createScenarioRuntimePlanDriver,
  createViewerScenarioRuntimePlanDriver
} = await import(
  pathToFileURL(join(tempModuleDir, "runtime/scenario-runtime-plan-driver")).href
);
const {
  createScenarioRuntimeSession,
  createViewerScenarioRuntimeSession
} = await import(
  pathToFileURL(join(tempModuleDir, "runtime/scenario-runtime-session")).href
);
const { createBootstrapScenarioSession } = await import(
  pathToFileURL(join(tempModuleDir, "runtime/scenario-bootstrap-session")).href
);
const { createBootstrapScenarioDefinition } = await import(
  pathToFileURL(join(tempModuleDir, "runtime/resolve-bootstrap-scenario")).href
);
const { assertScenarioDefinitionContext } = await import(
  pathToFileURL(join(tempModuleDir, "scenario")).href
);
const { SCENE_PRESET_RUNTIME_CALLS } = await import(
  pathToFileURL(join(tempModuleDir, "features/globe/scene-preset-runtime")).href
);

const requiredScenarioShapeSnippets = [
  "export type ScenarioTruthBoundaryLabel",
  "export interface ScenarioContextRef {",
  "context?: ScenarioContextRef;",
  "export function assertScenarioDefinitionContext("
];

for (const snippet of requiredScenarioShapeSnippets) {
  assert(
    scenarioShapeSource.includes(snippet),
    `Missing required scenario shape snippet: ${snippet}`
  );
}

const requiredScenarioModuleSnippets = [
  "export interface ScenarioResolvedInputs {",
  "export type ScenarioSwitchPlanStep =",
  "export interface ScenarioUnloadPlan {",
  'kind: "detach-satellite-source"',
  'kind: "set-presentation";',
  'kind: "set-time";',
  'kind: "attach-site-dataset";',
  "export function createScenarioUnloadPlan(",
  "export function resolveScenarioPresentationRef(",
  "export function resolveScenarioTimeInput(",
  "export function resolveScenarioSatelliteSource(",
  "export function resolveScenarioSiteDatasetRef(",
  "export function resolveScenarioValidationRef(",
  "export function resolveScenarioInputs(",
  "export function createScenarioSwitchPlan("
];

for (const snippet of requiredScenarioModuleSnippets) {
  assert(
    scenarioModuleSource.includes(snippet),
    `Missing required scenario coordination snippet: ${snippet}`
  );
}

const requiredScenarioFacadeSnippets = [
  "export interface ScenarioFacadeState {",
  "export interface ScenarioSelectionResult {",
  "export interface ScenarioClearResult {",
  "export interface ScenarioFacade {",
  "getState(): ScenarioFacadeState;",
  "listScenarios(): ReadonlyArray<ScenarioDefinition>;",
  "previewScenario(id: string): ScenarioResolvedInputs;",
  "selectScenario(id: string): ScenarioSelectionResult;",
  "clearScenario(): ScenarioClearResult;",
  "export function createScenarioFacade("
];

for (const snippet of requiredScenarioFacadeSnippets) {
  assert(
    scenarioFacadeSource.includes(snippet),
    `Missing required scenario facade snippet: ${snippet}`
  );
}

const requiredScenarioPlanRunnerSnippets = [
  "export interface ScenarioPlanDriver {",
  "detachValidation(): Promise<void> | void;",
  "setPresentation(presentation: ScenarioPresentationRef): Promise<void> | void;",
  "setTime(time: ScenarioResolvedTimeInput): Promise<void> | void;",
  "attachSatelliteSource(",
  "export interface ScenarioSwitchExecutionResult {",
  "export interface ScenarioUnloadExecutionResult {",
  "async function executeScenarioStep(",
  "export async function executeScenarioSwitchPlan(",
  "export async function executeScenarioUnloadPlan("
];

for (const snippet of requiredScenarioPlanRunnerSnippets) {
  assert(
    scenarioPlanRunnerSource.includes(snippet),
    `Missing required scenario plan-runner snippet: ${snippet}`
  );
}

const requiredScenarioSessionSnippets = [
  "export interface ScenarioSessionState {",
  "export interface ScenarioSessionSelectResult {",
  "export interface ScenarioSessionClearResult {",
  "export interface ScenarioSession {",
  "getCurrentScenario(): ScenarioResolvedInputs | undefined;",
  "selectScenario(id: string): Promise<ScenarioSessionSelectResult>;",
  "clearScenario(): Promise<ScenarioSessionClearResult>;",
  "export function createScenarioSession("
];

for (const snippet of requiredScenarioSessionSnippets) {
  assert(
    scenarioSessionSource.includes(snippet),
    `Missing required scenario session snippet: ${snippet}`
  );
}

const requiredScenarioRuntimeDriverSnippets = [
  "export interface ScenarioRuntimePlanBindings {",
  "export interface ScenarioRuntimePlanDriverOptions {",
  "export interface ScenarioRuntimeSatelliteBindingOptions {",
  "export function createScenarioRuntimePlanDriver(",
  "export function createRuntimeSatellitePlanBinding(",
  "export function createViewerScenarioRuntimePlanDriver(",
  "Scenario runtime plan driver does not support"
];

for (const snippet of requiredScenarioRuntimeDriverSnippets) {
  assert(
    scenarioRuntimePlanDriverSource.includes(snippet),
    `Missing required scenario runtime driver snippet: ${snippet}`
  );
}

const requiredScenarioRuntimeSessionSnippets = [
  "export interface ScenarioRuntimeSessionOptions {",
  "export interface ViewerScenarioRuntimeSessionOptions",
  "initialScenarioId?: string;",
  "export function createScenarioRuntimeSession(",
  "export function createViewerScenarioRuntimeSession(",
  "first bounded runtime consumer of the Phase 6.1 scenario session"
];

for (const snippet of requiredScenarioRuntimeSessionSnippets) {
  assert(
    scenarioRuntimeSessionSource.includes(snippet),
    `Missing required scenario runtime session snippet: ${snippet}`
  );
}

const requiredScenarioBootstrapSessionSnippets = [
  "export interface BootstrapScenarioDefinition",
  "export interface BootstrapScenarioSessionOptions",
  "function assertBootstrapScenarioSources(",
  "export function createBootstrapScenarioSession(",
  "must stay presentation/time-only"
];

for (const snippet of requiredScenarioBootstrapSessionSnippets) {
  assert(
    scenarioBootstrapSessionSource.includes(snippet),
    `Missing required scenario bootstrap-session snippet: ${snippet}`
  );
}

const requiredResolveBootstrapScenarioSnippetGroups = [
  ["export interface BootstrapScenarioSeedOptions {"],
  ['mode?: "real-time" | "prerecorded";', "mode?: BootstrapScenarioMode;"],
  ["export function createBootstrapScenarioDefinition("],
  ['`bootstrap-${scenePresetKey}-${mode}`', "createBootstrapScenarioId("]
];

for (const snippetGroup of requiredResolveBootstrapScenarioSnippetGroups) {
  assert(
    snippetGroup.some((snippet) => resolveBootstrapScenarioSource.includes(snippet)),
    `Missing required bootstrap scenario resolver snippet: ${snippetGroup.join(" OR ")}`
  );
}

const requiredScenarioIndexSnippets = [
  "ScenarioContextRef",
  "ScenarioResolvedInputs",
  "ScenarioSwitchPlan",
  "ScenarioSwitchPlanStep",
  "ScenarioUnloadPlan",
  "ScenarioUnloadPlanStep",
  "ScenarioTruthBoundaryLabel",
  "ScenarioFacade",
  "ScenarioFacadeState",
  "ScenarioSelectionResult",
  "ScenarioClearResult",
  "ScenarioPlanDriver",
  "ScenarioPlanExecutionTraceStep",
  "ScenarioSwitchExecutionResult",
  "ScenarioUnloadExecutionResult",
  "ScenarioSession",
  "ScenarioSessionState",
  "ScenarioSessionSelectResult",
  "ScenarioSessionClearResult",
  "createScenarioFacade",
  "createScenarioSession",
  "createScenarioUnloadPlan",
  "createScenarioSwitchPlan",
  "executeScenarioSwitchPlan",
  "executeScenarioUnloadPlan",
  "resolveScenarioInputs",
  "resolveScenarioPresentationRef",
  "resolveScenarioSatelliteSource",
  "resolveScenarioSiteDatasetRef",
  "resolveScenarioTimeInput",
  "resolveScenarioValidationRef"
];

for (const snippet of requiredScenarioIndexSnippets) {
  assert(
    scenarioIndexSource.includes(snippet),
    `Scenario module boundary must re-export ${snippet}.`
  );
}

const forbiddenScenarioPatterns = [
  {
    pattern: /from\s+["']cesium["']/,
    message: "Scenario coordination module must not import from cesium."
  },
  {
    pattern: /\bViewer\b/,
    message: "Scenario coordination module must not mention Viewer."
  },
  {
    pattern: /\bJulianDate\b/,
    message: "Scenario coordination module must not mention JulianDate."
  },
  {
    pattern: /applyScenePreset/,
    message: "Scenario coordination module must not take over scene-preset apply logic."
  },
  {
    pattern: /\.setMode\(/,
    message: "Scenario coordination module must not take over replay-clock API calls."
  },
  {
    pattern: /loadFixture\(/,
    message: "Scenario coordination module must not take over satellite fixture ingestion."
  }
];

for (const { pattern, message } of forbiddenScenarioPatterns) {
  assert(!pattern.test(scenarioModuleSource), message);
  assert(!pattern.test(scenarioFacadeSource), `Scenario facade: ${message}`);
  assert(!pattern.test(scenarioPlanRunnerSource), `Scenario plan-runner: ${message}`);
  assert(!pattern.test(scenarioSessionSource), `Scenario session: ${message}`);
}

assert(
  !/\bscenario-runtime-plan-driver\b/.test(mainSource),
  "Phase 6.1 runtime adapter must stay off the live runtime path for now."
);
assert(
  !/\bscenario-runtime-session\b/.test(mainSource),
  "Phase 6.1 runtime session host must stay off the live runtime path for now."
);
assert(
  /\bstartBootstrapComposition\b/.test(mainSource),
  "main.ts should hand off bootstrap wiring to the dedicated bootstrap composition."
);
assert(
  /\bscenario-bootstrap-session\b/.test(bootstrapCompositionSource),
  "Phase 6.1 bootstrap scenario helper should now be the only scenario-side module referenced from the bootstrap composition."
);
assert(
  /\bresolve-bootstrap-scenario\b/.test(bootstrapCompositionSource),
  "Bootstrap composition should route bootstrap scenario definition through the dedicated resolver."
);
assert(
  /createBootstrapScenarioSession/.test(bootstrapCompositionSource),
  "Bootstrap composition should create a bootstrap-owned scenario session."
);
assert(
  /bootstrapScenarioId/.test(bootstrapCompositionSource) ||
    /mountBootstrapOperatorHud/.test(bootstrapCompositionSource),
  "Bootstrap composition should keep bootstrap scenario id synchronization on a narrow repo-owned surface."
);
assert(
  /scenarioSession/.test(bootstrapCompositionSource),
  "Bootstrap composition should keep the bootstrap scenario session on the narrow capture seam."
);

const liveScenario = {
  id: "ops-live",
  label: "Ops Live",
  kind: "real-time",
  presentation: {
    presetKey: "global"
  },
  time: {
    mode: "real-time"
  },
  sources: {
    satellite: {
      kind: "feed-ref",
      feedId: "ops-feed"
    }
  }
};

const siteReviewScenario = {
  id: "site-review",
  label: "Site Review",
  kind: "site-dataset",
  presentation: {
    presetKey: "site"
  },
  time: {
    mode: "prerecorded",
    range: {
      start: "2026-04-18T00:00:00.000Z",
      stop: "2026-04-18T00:10:00.000Z"
    }
  },
  sources: {
    siteDataset: {
      source: "configured-url",
      datasetRef: "formal-site-mvp"
    }
  }
};

const validationScenario = {
  id: "validation-smoke",
  label: "Validation Smoke",
  kind: "validation-bridge",
  presentation: {
    presetKey: "regional"
  },
  time: {
    mode: "prerecorded",
    range: {
      start: 1_744_934_800_000,
      stop: 1_744_935_100_000
    }
  },
  sources: {
    validation: {
      mode: "virtual-dut-placeholder",
      transport: "bridge-placeholder"
    }
  }
};

const multiOrbitScenario = {
  id: "multi-orbit-oneweb-intelsat-aviation",
  label: "OneWeb + Intelsat GEO Aviation",
  kind: "prerecorded",
  presentation: {
    presetKey: "global"
  },
  time: {
    mode: "prerecorded"
  },
  context: {
    vertical: "commercial_aviation",
    truthBoundaryLabel: "real-pairing-bounded-runtime-projection",
    endpointProfileId: "aviation-endpoint-overlay-profile",
    infrastructureProfileId: "oneweb-gateway-pool-profile"
  },
  sources: {}
};

const livePresentation = resolveScenarioPresentationRef(liveScenario);
assert.deepEqual(livePresentation, { presetKey: "global" });
assert.notStrictEqual(livePresentation, liveScenario.presentation);

const liveTimeInput = resolveScenarioTimeInput(liveScenario);
assert.deepEqual(liveTimeInput, { mode: "real-time" });

const liveInputs = resolveScenarioInputs(liveScenario);
assert.equal(
  Object.hasOwn(liveInputs, "context"),
  false,
  "Scenario inputs should omit context when the definition does not provide it."
);

const liveSatelliteSource = resolveScenarioSatelliteSource(liveScenario);
assert.deepEqual(liveSatelliteSource, {
  kind: "feed-ref",
  feedId: "ops-feed"
});
assert.notStrictEqual(liveSatelliteSource, liveScenario.sources.satellite);

const siteTimeInput = resolveScenarioTimeInput(siteReviewScenario);
assert.deepEqual(siteTimeInput, {
  mode: "prerecorded",
  range: {
    start: "2026-04-18T00:00:00.000Z",
    stop: "2026-04-18T00:10:00.000Z"
  }
});
assert.notStrictEqual(siteTimeInput.range, siteReviewScenario.time.range);

const siteDatasetRef = resolveScenarioSiteDatasetRef(siteReviewScenario);
assert.deepEqual(siteDatasetRef, {
  source: "configured-url",
  datasetRef: "formal-site-mvp"
});
assert.notStrictEqual(siteDatasetRef, siteReviewScenario.sources.siteDataset);

const validationRef = resolveScenarioValidationRef(validationScenario);
assert.deepEqual(validationRef, {
  mode: "virtual-dut-placeholder",
  transport: "bridge-placeholder"
});
assert.notStrictEqual(validationRef, validationScenario.sources.validation);

const validationInputs = resolveScenarioInputs(validationScenario);
assert.deepEqual(validationInputs, {
  scenarioId: "validation-smoke",
  scenarioLabel: "Validation Smoke",
  scenarioKind: "validation-bridge",
  presentation: {
    presetKey: "regional"
  },
  time: {
    mode: "prerecorded",
    range: {
      start: 1_744_934_800_000,
      stop: 1_744_935_100_000
    }
  },
  validation: {
    mode: "virtual-dut-placeholder",
    transport: "bridge-placeholder"
  }
});

assert.doesNotThrow(
  () => assertScenarioDefinitionContext(multiOrbitScenario),
  "Scenario context validation should accept the first narrow multi-orbit context shape."
);

const multiOrbitInputs = resolveScenarioInputs(multiOrbitScenario);
assert.deepEqual(multiOrbitInputs.context, {
  vertical: "commercial_aviation",
  truthBoundaryLabel: "real-pairing-bounded-runtime-projection",
  endpointProfileId: "aviation-endpoint-overlay-profile",
  infrastructureProfileId: "oneweb-gateway-pool-profile"
});
assert.notStrictEqual(multiOrbitInputs.context, multiOrbitScenario.context);

assert.throws(
  () =>
    resolveScenarioTimeInput({
      id: "bad-mode",
      label: "Bad Mode",
      kind: "real-time",
      presentation: {
        presetKey: "global"
      },
      time: {
        mode: "prerecorded"
      },
      sources: {}
    }),
  /must agree with time\.mode/u,
  "Confirmed time-family scenario kinds must agree with time.mode."
);

const invalidTruthBoundaryScenario = {
  ...multiOrbitScenario,
  id: "multi-orbit-invalid-truth-boundary",
  context: {
    ...multiOrbitScenario.context,
    truthBoundaryLabel: "open-string-not-allowed"
  }
};

assert.throws(
  () => assertScenarioDefinitionContext(invalidTruthBoundaryScenario),
  /context\.truthBoundaryLabel must be real-pairing-bounded-runtime-projection/u,
  "Scenario context validation must keep truthBoundaryLabel closed to the accepted single value."
);
assert.throws(
  () => resolveScenarioInputs(invalidTruthBoundaryScenario),
  /context\.truthBoundaryLabel must be real-pairing-bounded-runtime-projection/u,
  "Scenario input resolution must reject invalid truthBoundaryLabel values."
);
assert.throws(
  () => createScenarioFacade([invalidTruthBoundaryScenario]),
  /context\.truthBoundaryLabel must be real-pairing-bounded-runtime-projection/u,
  "Scenario facade should fail fast on invalid context truth-boundary values."
);

const invalidExtraContextKeyScenario = {
  ...multiOrbitScenario,
  id: "multi-orbit-invalid-extra-context-key",
  context: {
    ...multiOrbitScenario.context,
    extraField: "not-allowed"
  }
};

assert.throws(
  () => assertScenarioDefinitionContext(invalidExtraContextKeyScenario),
  /context must not include unsupported keys: extraField/u,
  "Scenario context validation must reject unknown context keys."
);
assert.throws(
  () => resolveScenarioInputs(invalidExtraContextKeyScenario),
  /context must not include unsupported keys: extraField/u,
  "Scenario input resolution must reject unknown context keys."
);
assert.throws(
  () => createScenarioFacade([invalidExtraContextKeyScenario]),
  /context must not include unsupported keys: extraField/u,
  "Scenario facade should fail fast on unknown context keys."
);

const firstLoadPlan = createScenarioSwitchPlan(undefined, liveScenario);
assert.deepEqual(
  firstLoadPlan.steps.map((step) => step.kind),
  ["set-presentation", "set-time", "attach-satellite-source"],
  "First load plan must stay deterministic and attach only the target inputs."
);

const siteSwitchPlan = createScenarioSwitchPlan(liveScenario, siteReviewScenario);
assert.deepEqual(
  siteSwitchPlan.steps.map((step) => step.kind),
  ["detach-satellite-source", "set-presentation", "set-time", "attach-site-dataset"],
  "Switching from live to site-review must detach first, then set shell/time inputs, then attach the next source."
);

const reverseSwitchPlan = createScenarioSwitchPlan(
  siteReviewScenario,
  validationScenario
);
assert.deepEqual(
  reverseSwitchPlan.steps.map((step) => step.kind),
  ["detach-site-dataset", "set-presentation", "set-time", "attach-validation"],
  "Switching between placeholder families must remain deterministic and must reset time only when the target time input differs."
);

const sameScenarioPlan = createScenarioSwitchPlan(liveScenario, liveScenario);
assert.equal(
  sameScenarioPlan.steps.length,
  0,
  "Switching to the same resolved scenario should not fabricate work."
);

const unloadPlan = createScenarioUnloadPlan(siteReviewScenario);
assert.deepEqual(
  unloadPlan,
  {
    fromScenarioId: "site-review",
    steps: [{ kind: "detach-site-dataset" }]
  },
  "Unload planning must stay narrow and detach only the current scenario-owned attachments."
);

const facade = createScenarioFacade(
  [liveScenario, siteReviewScenario, validationScenario],
  {
    initialScenarioId: "ops-live"
  }
);

assert.deepEqual(facade.getState(), {
  scenarioIds: ["ops-live", "site-review", "validation-smoke"],
  currentScenarioId: "ops-live"
});

assert.equal(
  facade.listScenarios().length,
  3,
  "Scenario facade must retain a repo-owned list of available scenarios."
);

assert.deepEqual(facade.previewScenario("site-review"), resolveScenarioInputs(siteReviewScenario));

const facadeSwitch = facade.selectScenario("site-review");
assert.deepEqual(facadeSwitch.state, {
  scenarioIds: ["ops-live", "site-review", "validation-smoke"],
  currentScenarioId: "site-review"
});
assert.deepEqual(
  facadeSwitch.switchPlan.steps.map((step) => step.kind),
  ["detach-satellite-source", "set-presentation", "set-time", "attach-site-dataset"]
);

const facadeClear = facade.clearScenario();
assert.deepEqual(facadeClear.state, {
  scenarioIds: ["ops-live", "site-review", "validation-smoke"]
});
assert.deepEqual(facadeClear.unloadPlan, {
  fromScenarioId: "site-review",
  steps: [{ kind: "detach-site-dataset" }]
});

const emptyClear = facade.clearScenario();
assert.deepEqual(emptyClear, {
  state: {
    scenarioIds: ["ops-live", "site-review", "validation-smoke"]
  }
});

assert.throws(
  () => createScenarioFacade([liveScenario, liveScenario]),
  /Duplicate scenario id/u,
  "Scenario facade must reject duplicate ids."
);
assert.throws(
  () => facade.getScenario("missing-scenario"),
  /Unknown scenario id/u,
  "Scenario facade must reject unknown scenario ids."
);

const driverCalls = [];
const fakeDriver = {
  detachValidation() {
    driverCalls.push("detach-validation");
  },
  detachSiteDataset() {
    driverCalls.push("detach-site-dataset");
  },
  detachSatelliteSource() {
    driverCalls.push("detach-satellite-source");
  },
  setPresentation(presentation) {
    driverCalls.push(`set-presentation:${presentation.presetKey}`);
  },
  setTime(time) {
    driverCalls.push(`set-time:${time.mode}`);
  },
  attachSatelliteSource(satellite) {
    driverCalls.push(`attach-satellite:${satellite.kind}`);
  },
  attachSiteDataset(siteDataset) {
    driverCalls.push(`attach-site-dataset:${siteDataset.datasetRef}`);
  },
  attachValidation(validation) {
    driverCalls.push(`attach-validation:${validation.mode}`);
  }
};

const switchExecutionResult = await executeScenarioSwitchPlan(
  siteSwitchPlan,
  fakeDriver
);
assert.deepEqual(driverCalls, [
  "detach-satellite-source",
  "set-presentation:site",
  "set-time:prerecorded",
  "attach-site-dataset:formal-site-mvp"
]);
assert.deepEqual(switchExecutionResult, {
  fromScenarioId: "ops-live",
  toScenarioId: "site-review",
  appliedSteps: [
    { kind: "detach-satellite-source" },
    { kind: "set-presentation" },
    { kind: "set-time" },
    { kind: "attach-site-dataset" }
  ]
});

driverCalls.length = 0;

const unloadExecutionResult = await executeScenarioUnloadPlan(
  unloadPlan,
  fakeDriver
);
assert.deepEqual(driverCalls, ["detach-site-dataset"]);
assert.deepEqual(unloadExecutionResult, {
  fromScenarioId: "site-review",
  appliedSteps: [{ kind: "detach-site-dataset" }]
});

driverCalls.length = 0;

const session = createScenarioSession(
  [liveScenario, siteReviewScenario, validationScenario],
  fakeDriver,
  {
    initialScenarioId: "ops-live"
  }
);

assert.deepEqual(session.getState(), {
  scenarioIds: ["ops-live", "site-review", "validation-smoke"],
  currentScenarioId: "ops-live",
  currentScenario: resolveScenarioInputs(liveScenario)
});
assert.deepEqual(session.getCurrentScenario(), resolveScenarioInputs(liveScenario));

const sessionSwitch = await session.selectScenario("site-review");
assert.deepEqual(driverCalls, [
  "detach-satellite-source",
  "set-presentation:site",
  "set-time:prerecorded",
  "attach-site-dataset:formal-site-mvp"
]);
assert.deepEqual(sessionSwitch.state, {
  scenarioIds: ["ops-live", "site-review", "validation-smoke"],
  currentScenarioId: "site-review",
  currentScenario: resolveScenarioInputs(siteReviewScenario)
});

driverCalls.length = 0;

const sessionClear = await session.clearScenario();
assert.deepEqual(driverCalls, ["detach-site-dataset"]);
assert.deepEqual(sessionClear.state, {
  scenarioIds: ["ops-live", "site-review", "validation-smoke"]
});
assert.equal(session.getCurrentScenario(), undefined);

const failingDriver = {
  ...fakeDriver,
  setTime() {
    throw new Error("time-step-failed");
  }
};
const failingSession = createScenarioSession(
  [liveScenario, siteReviewScenario],
  failingDriver,
  {
    initialScenarioId: "ops-live"
  }
);

await assert.rejects(
  () => failingSession.selectScenario("site-review"),
  /time-step-failed/u,
  "Scenario session must surface driver failures."
);
assert.deepEqual(
  failingSession.getState(),
  {
    scenarioIds: ["ops-live", "site-review"],
    currentScenarioId: "ops-live",
    currentScenario: resolveScenarioInputs(liveScenario)
  },
  "Scenario session must not commit current-scenario state before driver execution succeeds."
);

const runtimeDriverCalls = [];
const runtimeDriver = createScenarioRuntimePlanDriver({
  setPresentation(presentation) {
    runtimeDriverCalls.push(`set-presentation:${presentation.presetKey}`);
  },
  setTime(time) {
    runtimeDriverCalls.push(`set-time:${time.mode}`);
  }
});

runtimeDriver.setPresentation({ presetKey: "regional" });
runtimeDriver.setTime({
  mode: "prerecorded",
  range: {
    start: "2026-04-18T00:00:00.000Z",
    stop: "2026-04-18T00:10:00.000Z"
  }
});
assert.deepEqual(runtimeDriverCalls, [
  "set-presentation:regional",
  "set-time:prerecorded"
]);

assert.throws(
  () =>
    runtimeDriver.attachSiteDataset({
      source: "configured-url",
      datasetRef: "formal-site-mvp"
    }),
  /does not support site dataset attach/u,
  "Minimal runtime adapter must keep site-dataset attach unsupported until an explicit binding is supplied."
);
assert.throws(
  () => runtimeDriver.detachSiteDataset(),
  /does not support site dataset detach/u,
  "Minimal runtime adapter must keep site-dataset detach unsupported until an explicit binding is supplied."
);
assert.throws(
  () =>
    runtimeDriver.attachSatelliteSource({
      kind: "feed-ref",
      feedId: "ops-feed"
    }),
  /does not support satellite attach/u,
  "Minimal runtime adapter must keep satellite attach unsupported until an explicit binding is supplied."
);
assert.throws(
  () => runtimeDriver.detachSatelliteSource(),
  /does not support satellite detach/u,
  "Minimal runtime adapter must keep satellite detach unsupported until an explicit binding is supplied."
);
assert.throws(
  () =>
    runtimeDriver.attachValidation({
      mode: "placeholder",
      transport: "placeholder"
    }),
  /does not support validation attach/u,
  "Minimal runtime adapter must keep validation attach unsupported until an explicit binding is supplied."
);

const siteDatasetCalls = [];
const siteDatasetRuntimeDriver = createScenarioRuntimePlanDriver({
  setPresentation() {},
  setTime() {},
  attachSiteDataset(siteDataset) {
    siteDatasetCalls.push(`attach:${siteDataset.datasetRef}`);
  },
  detachSiteDataset() {
    siteDatasetCalls.push("detach");
  }
});

siteDatasetRuntimeDriver.attachSiteDataset({
  source: "configured-url",
  datasetRef: "formal-site-mvp"
});
siteDatasetRuntimeDriver.detachSiteDataset();
assert.deepEqual(siteDatasetCalls, [
  "attach:formal-site-mvp",
  "detach"
]);

const satelliteOverlayCalls = [];
const satelliteBinding = createRuntimeSatellitePlanBinding({
  satelliteOverlay: {
    setMode(mode) {
      satelliteOverlayCalls.push(mode);
      return Promise.resolve({
        mode,
        status: mode === "off" ? "disabled" : "ready"
      });
    }
  },
  resolveMode(satellite) {
    if (satellite.kind === "fixture-ref") {
      return "walker-points";
    }
    return "off";
  }
});

await satelliteBinding.attach({
  kind: "fixture-ref",
  fixtureType: "tle",
  fixtureId: "walker-o6-s3-i45-h698"
});
await satelliteBinding.detach();
assert.deepEqual(satelliteOverlayCalls, ["walker-points", "off"]);

const replayClockCalls = [];
const fakeViewer = { id: "viewer-handle" };
const fakeReplayClock = {
  setMode(mode, range) {
    replayClockCalls.push({ mode, range });
  }
};

const viewerRuntimeDriver = createViewerScenarioRuntimePlanDriver({
  viewer: fakeViewer,
  replayClock: fakeReplayClock,
  scenePresetRuntime: {
    buildingShowcaseKey: "off"
  }
});

viewerRuntimeDriver.setPresentation({ presetKey: "site" });
viewerRuntimeDriver.setTime({
  mode: "prerecorded",
  range: {
    start: 1_744_934_800_000,
    stop: 1_744_935_100_000
  }
});

assert.deepEqual(SCENE_PRESET_RUNTIME_CALLS, [
  {
    viewer: fakeViewer,
    preset: {
      id: "preset-site",
      label: "site"
    },
    options: {
      buildingShowcaseKey: "off"
    }
  }
]);
assert.deepEqual(replayClockCalls, [
  {
    mode: "prerecorded",
    range: {
      start: 1_744_934_800_000,
      stop: 1_744_935_100_000
    }
  }
]);

const runtimeSessionCalls = [];
const runtimeSession = createScenarioRuntimeSession({
  definitions: [siteReviewScenario],
  bindings: {
    setPresentation(presentation) {
      runtimeSessionCalls.push(`set-presentation:${presentation.presetKey}`);
    },
    setTime(time) {
      runtimeSessionCalls.push(`set-time:${time.mode}`);
    },
    attachSiteDataset(siteDataset) {
      runtimeSessionCalls.push(`attach-site-dataset:${siteDataset.datasetRef}`);
    },
    detachSiteDataset() {
      runtimeSessionCalls.push("detach-site-dataset");
    }
  }
});

const runtimeSessionSelect = await runtimeSession.selectScenario("site-review");
assert.deepEqual(runtimeSessionCalls, [
  "set-presentation:site",
  "set-time:prerecorded",
  "attach-site-dataset:formal-site-mvp"
]);
assert.deepEqual(runtimeSessionSelect.state, {
  scenarioIds: ["site-review"],
  currentScenarioId: "site-review",
  currentScenario: resolveScenarioInputs(siteReviewScenario)
});

runtimeSessionCalls.length = 0;

const runtimeSessionClear = await runtimeSession.clearScenario();
assert.deepEqual(runtimeSessionCalls, ["detach-site-dataset"]);
assert.deepEqual(runtimeSessionClear.state, {
  scenarioIds: ["site-review"]
});

SCENE_PRESET_RUNTIME_CALLS.length = 0;
replayClockCalls.length = 0;

const viewerRuntimeSession = createViewerScenarioRuntimeSession({
  definitions: [
    {
      id: "shell-preview",
      label: "Shell Preview",
      kind: "prerecorded",
      presentation: {
        presetKey: "regional"
      },
      time: {
        mode: "prerecorded",
        range: {
          start: "2026-04-18T00:00:00.000Z",
          stop: "2026-04-18T00:10:00.000Z"
        }
      },
      sources: {}
    }
  ],
  viewer: fakeViewer,
  replayClock: fakeReplayClock,
  scenePresetRuntime: {
    buildingShowcaseKey: "off"
  }
});

const viewerRuntimeSessionSelect = await viewerRuntimeSession.selectScenario(
  "shell-preview"
);
assert.deepEqual(viewerRuntimeSessionSelect.switchPlan.steps.map((step) => step.kind), [
  "set-presentation",
  "set-time"
]);
assert.deepEqual(viewerRuntimeSessionSelect.state, {
  scenarioIds: ["shell-preview"],
  currentScenarioId: "shell-preview",
  currentScenario: resolveScenarioInputs({
    id: "shell-preview",
    label: "Shell Preview",
    kind: "prerecorded",
    presentation: {
      presetKey: "regional"
    },
    time: {
      mode: "prerecorded",
      range: {
        start: "2026-04-18T00:00:00.000Z",
        stop: "2026-04-18T00:10:00.000Z"
      }
    },
    sources: {}
  })
});
assert.deepEqual(SCENE_PRESET_RUNTIME_CALLS, [
  {
    viewer: fakeViewer,
    preset: {
      id: "preset-regional",
      label: "regional"
    },
    options: {
      buildingShowcaseKey: "off"
    }
  }
]);
assert.deepEqual(replayClockCalls, [
  {
    mode: "prerecorded",
    range: {
      start: "2026-04-18T00:00:00.000Z",
      stop: "2026-04-18T00:10:00.000Z"
    }
  }
]);

await assert.rejects(
  () =>
    createViewerScenarioRuntimeSession({
      definitions: [siteReviewScenario],
      viewer: fakeViewer,
      replayClock: fakeReplayClock
    }).selectScenario("site-review"),
  /does not support site dataset attach/u,
  "Viewer runtime session must fail fast when a selected source family has no runtime binding yet."
);

SCENE_PRESET_RUNTIME_CALLS.length = 0;
replayClockCalls.length = 0;

const bootstrapScenario = {
  id: "bootstrap-shell-preview",
  label: "Bootstrap Shell Preview",
  kind: "prerecorded",
  presentation: {
    presetKey: "global"
  },
  time: {
    mode: "prerecorded",
    range: {
      start: "2026-04-18T00:20:00.000Z",
      stop: "2026-04-18T00:25:00.000Z"
    }
  },
  sources: {}
};

const bootstrapSession = createBootstrapScenarioSession({
  definitions: [bootstrapScenario],
  viewer: fakeViewer,
  replayClock: fakeReplayClock
});

const bootstrapSelect = await bootstrapSession.selectScenario(
  "bootstrap-shell-preview"
);
assert.deepEqual(bootstrapSelect.switchPlan.steps.map((step) => step.kind), [
  "set-presentation",
  "set-time"
]);
assert.deepEqual(bootstrapSelect.state, {
  scenarioIds: ["bootstrap-shell-preview"],
  currentScenarioId: "bootstrap-shell-preview",
  currentScenario: resolveScenarioInputs(bootstrapScenario)
});
assert.deepEqual(SCENE_PRESET_RUNTIME_CALLS, [
  {
    viewer: fakeViewer,
    preset: {
      id: "preset-global",
      label: "global"
    },
    options: {}
  }
]);
assert.deepEqual(replayClockCalls, [
  {
    mode: "prerecorded",
    range: {
      start: "2026-04-18T00:20:00.000Z",
      stop: "2026-04-18T00:25:00.000Z"
    }
  }
]);

assert.throws(
  () =>
    createBootstrapScenarioSession({
      definitions: [siteReviewScenario],
      viewer: fakeViewer,
      replayClock: fakeReplayClock
    }),
  /cannot attach site datasets yet/u,
  "Bootstrap scenario helper must reject any source family beyond presentation/time."
);

const regionalBootstrapScenario = createBootstrapScenarioDefinition({
  scenePresetKey: "regional"
});

assert.equal(regionalBootstrapScenario.id, "bootstrap-regional-real-time");
assert(
  regionalBootstrapScenario.label === "Bootstrap regional" ||
    regionalBootstrapScenario.label === "Bootstrap Regional",
  "Bootstrap real-time label should stay repo-owned and human-readable."
);
assert.equal(regionalBootstrapScenario.kind, "real-time");
assert.deepEqual(regionalBootstrapScenario.presentation, {
  presetKey: "regional"
});
assert.deepEqual(regionalBootstrapScenario.time, {
  mode: "real-time"
});
assert.deepEqual(regionalBootstrapScenario.sources, {});

const prerecordedBootstrapScenario = createBootstrapScenarioDefinition({
  scenePresetKey: "site",
  mode: "prerecorded",
  range: {
    start: "2026-04-18T01:00:00.000Z",
    stop: "2026-04-18T01:05:00.000Z"
  }
});

assert.equal(prerecordedBootstrapScenario.id, "bootstrap-site-prerecorded");
assert(
  prerecordedBootstrapScenario.label === "Bootstrap site Replay" ||
    prerecordedBootstrapScenario.label === "Bootstrap Site Replay",
  "Bootstrap prerecorded label should stay repo-owned and human-readable."
);
assert.equal(prerecordedBootstrapScenario.kind, "prerecorded");
assert.deepEqual(prerecordedBootstrapScenario.presentation, {
  presetKey: "site"
});
assert.deepEqual(prerecordedBootstrapScenario.time, {
  mode: "prerecorded",
  range: {
    start: "2026-04-18T01:00:00.000Z",
    stop: "2026-04-18T01:05:00.000Z"
  }
});
assert.deepEqual(prerecordedBootstrapScenario.sources, {});

assert(
  !/\bruntime\/scenario-runtime-session\b/.test(mainSource),
  "main.ts should not skip the bootstrap helper and import the generic runtime session factory directly."
);
assert(
  !/\bruntime\/scenario-runtime-plan-driver\b/.test(mainSource),
  "main.ts should not import the runtime plan driver directly."
);
assert(
  !/\bfeatures\/scenario\b/.test(mainSource),
  "main.ts should not import feature-level scenario modules directly."
);

await rm(tempModuleDir, { recursive: true, force: true });

console.log("Phase 6.1 scenario coordination verification passed.");
