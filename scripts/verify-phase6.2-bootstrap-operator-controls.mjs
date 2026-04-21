import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const bootstrapScenarioModulePath = new URL(
  "../src/runtime/resolve-bootstrap-scenario.ts",
  import.meta.url
);
const bootstrapOperatorControllerPath = new URL(
  "../src/runtime/bootstrap-operator-controller.ts",
  import.meta.url
);
const bootstrapScenarioSessionPath = new URL(
  "../src/runtime/scenario-bootstrap-session.ts",
  import.meta.url
);
const bootstrapOperatorHudPath = new URL(
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

function resolveScenarioInputs(definition) {
  return {
    scenarioId: definition.id,
    scenarioLabel: definition.label,
    scenarioKind: definition.kind,
    presentation: { presetKey: definition.presentation.presetKey },
    time: {
      mode: definition.time.mode,
      ...(definition.time.range
        ? {
            range: {
              start: definition.time.range.start,
              stop: definition.time.range.stop
            }
          }
        : {})
    }
  };
}

function createReplayClockMock(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  const emit = () => {
    const nextState = { ...state };

    for (const listener of listeners) {
      listener(nextState);
    }
  };

  return {
    getState() {
      return { ...state };
    },
    play() {
      state = { ...state, isPlaying: true };
      emit();
    },
    pause() {
      state = { ...state, isPlaying: false };
      emit();
    },
    setMultiplier(multiplier) {
      state = { ...state, multiplier };
      emit();
    },
    seek(currentTime) {
      state = { ...state, currentTime };
      emit();
    },
    setMode(mode, range) {
      state = {
        ...state,
        mode,
        ...(range
          ? {
              startTime: range.start,
              stopTime: range.stop,
              currentTime: range.start
            }
          : {})
      };
      emit();
    },
    onTick(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-phase6.2-"));

try {
  const [
    bootstrapScenarioSource,
    bootstrapOperatorControllerSource,
    bootstrapScenarioSessionSource,
    bootstrapOperatorHudSource,
    mainSource,
    bootstrapCompositionSource
  ] = await Promise.all([
    readFile(bootstrapScenarioModulePath, "utf8"),
    readFile(bootstrapOperatorControllerPath, "utf8"),
    readFile(bootstrapScenarioSessionPath, "utf8"),
    readFile(bootstrapOperatorHudPath, "utf8"),
    readFile(mainPath, "utf8"),
    readFile(bootstrapCompositionPath, "utf8")
  ]);

  const requiredScenarioSnippets = [
    "export interface BootstrapScenarioCatalog {",
    "export const BOOTSTRAP_SCENARIO_PRESET_KEYS = [",
    "export function createBootstrapScenarioCatalog(",
    "real-time\": createBootstrapScenarioId",
    "prerecorded: createBootstrapScenarioId"
  ];

  for (const snippet of requiredScenarioSnippets) {
    assert(
      bootstrapScenarioSource.includes(snippet),
      `Missing bootstrap scenario catalog snippet: ${snippet}`
    );
  }

  const requiredControllerSnippets = [
    "export const BOOTSTRAP_REPLAY_SPEED_PRESETS = [",
    "export interface BootstrapOperatorControllerState {",
    "selectScenarioPreset(",
    "selectReplayMode(",
    "selectReplaySpeed(",
    "subscribe("
  ];

  for (const snippet of requiredControllerSnippets) {
    assert(
      bootstrapOperatorControllerSource.includes(snippet),
      `Missing bootstrap operator controller snippet: ${snippet}`
    );
  }

  assert(
    bootstrapScenarioSessionSource.includes("must stay presentation/time-only"),
    "Bootstrap session guard must keep rejecting site/satellite/validation sources."
  );
  assert(
    bootstrapOperatorHudSource.includes('data-operator-control="scenario"'),
    "Operator HUD must expose scenario selection controls."
  );
  assert(
    bootstrapOperatorHudSource.includes('data-operator-control="mode"'),
    "Operator HUD must expose replay mode controls."
  );
  assert(
    bootstrapOperatorHudSource.includes('data-operator-control="speed"'),
    "Operator HUD must expose replay speed controls."
  );
  assert(
    mainSource.includes("startBootstrapComposition"),
    "main.ts must hand off bootstrap wiring to the dedicated bootstrap composition."
  );
  assert(
    bootstrapCompositionSource.includes("createBootstrapScenarioCatalog"),
    "Bootstrap composition must seed the bootstrap scenario catalog."
  );
  assert(
    bootstrapCompositionSource.includes("createBootstrapOperatorController"),
    "Bootstrap composition must use the narrow bootstrap operator controller facade."
  );
  assert(
    bootstrapCompositionSource.includes("mountBootstrapOperatorHud"),
    "Bootstrap composition must mount the operator HUD into the status panel."
  );

  await Promise.all([
    writeFile(
      join(tempModuleDir, "resolve-bootstrap-scenario.mjs"),
      transpileTypeScript(
        bootstrapScenarioSource,
        "resolve-bootstrap-scenario.ts"
      )
    ),
    writeFile(
      join(tempModuleDir, "bootstrap-operator-controller.mjs"),
      transpileTypeScript(
        bootstrapOperatorControllerSource,
        "bootstrap-operator-controller.ts"
      )
    )
  ]);

  const { createBootstrapScenarioCatalog } = await import(
    pathToFileURL(join(tempModuleDir, "resolve-bootstrap-scenario.mjs")).href
  );
  const {
    BOOTSTRAP_REPLAY_SPEED_PRESETS,
    createBootstrapOperatorController
  } = await import(
    pathToFileURL(join(tempModuleDir, "bootstrap-operator-controller.mjs")).href
  );

  const baselineTime = {
    currentTime: "2026-04-19T08:15:00.000Z",
    startTime: "2026-04-19T08:00:00.000Z",
    stopTime: "2026-04-19T09:00:00.000Z"
  };
  const scenarioCatalog = createBootstrapScenarioCatalog({
    initialScenePresetKey: "regional",
    baselineTime
  });
  const replayClock = createReplayClockMock({
    mode: "real-time",
    currentTime: baselineTime.currentTime,
    startTime: baselineTime.startTime,
    stopTime: baselineTime.stopTime,
    multiplier: 1,
    isPlaying: false
  });
  const definitionsById = new Map(
    scenarioCatalog.definitions.map((definition) => [definition.id, definition])
  );
  let currentScenarioId = scenarioCatalog.initialScenarioId;

  const scenarioSession = {
    getState() {
      return {
        scenarioIds: [...definitionsById.keys()],
        currentScenarioId
      };
    },
    listScenarios() {
      return [...definitionsById.values()];
    },
    getScenario(id) {
      const definition = definitionsById.get(id);

      if (!definition) {
        throw new Error(`Unknown scenario: ${id}`);
      }

      return definition;
    },
    previewScenario(id) {
      return resolveScenarioInputs(this.getScenario(id));
    },
    getCurrentScenario() {
      return this.previewScenario(currentScenarioId);
    },
    async selectScenario(id) {
      const definition = this.getScenario(id);
      currentScenarioId = id;
      replayClock.setMode(definition.time.mode, definition.time.range);
      return {
        state: this.getState(),
        selectedScenario: this.previewScenario(id),
        switchPlan: { toScenarioId: id, steps: [] },
        execution: { toScenarioId: id, appliedSteps: [] }
      };
    },
    async clearScenario() {
      currentScenarioId = undefined;
      return {
        state: this.getState()
      };
    }
  };

  const controller = createBootstrapOperatorController({
    replayClock,
    scenarioSession,
    scenarioCatalog
  });
  const emittedStates = [];
  const unsubscribe = controller.subscribe((state) => {
    emittedStates.push(state);
  });

  assert.equal(
    scenarioCatalog.definitions.length,
    6,
    "Bootstrap catalog must expose three preset families across real-time/prerecorded."
  );
  assert.equal(
    scenarioCatalog.options.length,
    3,
    "Bootstrap catalog must expose three scenario selection options."
  );

  for (const definition of scenarioCatalog.definitions) {
    assert.deepEqual(
      definition.sources,
      {},
      `Bootstrap scenario ${definition.id} must stay presentation/time-only.`
    );
  }

  const initialState = controller.getState();
  assert.equal(
    initialState.scenePresetKey,
    "regional",
    "Initial bootstrap scenario must honor the selected scene preset."
  );
  assert.equal(
    initialState.replayMode,
    "real-time",
    "Initial operator state must start in real-time mode."
  );
  assert.equal(initialState.replayMultiplier, 1, "Initial replay speed must start at 1x.");
  assert.deepEqual(
    controller.getReplaySpeedPresets(),
    BOOTSTRAP_REPLAY_SPEED_PRESETS,
    "Operator controller must expose bounded replay speed presets."
  );

  const prerecordedState = await controller.selectReplayMode("prerecorded");
  assert.equal(
    prerecordedState.replayMode,
    "prerecorded",
    "Replay mode control must switch the runtime into prerecorded mode."
  );
  assert.match(
    prerecordedState.scenarioId,
    /bootstrap-regional-prerecorded$/,
    "Replay mode control must stay inside the bootstrap-safe scenario family."
  );
  assert(
    Date.parse(prerecordedState.startTime) <= Date.parse(prerecordedState.currentTime),
    "Prerecorded selection must clamp currentTime inside the bounded prerecorded range."
  );
  assert(
    Date.parse(prerecordedState.currentTime) <= Date.parse(prerecordedState.stopTime),
    "Prerecorded selection must keep currentTime inside the bounded prerecorded range."
  );

  const siteState = await controller.selectScenarioPreset("site");
  assert.equal(
    siteState.scenePresetKey,
    "site",
    "Scenario selection must switch the active bootstrap scenario preset."
  );
  assert.match(
    siteState.scenarioId,
    /bootstrap-site-prerecorded$/,
    "Scenario selection must preserve the chosen replay mode."
  );

  const speedState = controller.selectReplaySpeed(4);
  assert.equal(
    speedState.replayMultiplier,
    4,
    "Replay speed control must update the runtime multiplier through the replay-clock seam."
  );

  assert.throws(
    () => controller.selectReplaySpeed(3),
    /bounded presets/,
    "Replay speed must reject out-of-band values."
  );
  assert(
    emittedStates.length >= 3,
    "Operator controller must publish state changes for mode, scenario, and speed updates."
  );

  unsubscribe();
  controller.dispose();

  console.log(
    JSON.stringify({
      status: "ok",
      scenarioIds: scenarioCatalog.definitions.map((definition) => definition.id),
      finalState: speedState
    })
  );
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
