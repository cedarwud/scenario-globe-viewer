import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const scenarioModulePath = new URL(
  "../src/features/scenario/resolve-scenario-inputs.ts",
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

const [
  scenarioShapeSource,
  scenarioModuleSource,
  scenarioIndexSource,
  mainSource
] = await Promise.all([
  readFile(scenarioShapePath, "utf8"),
  readFile(scenarioModulePath, "utf8"),
  readFile(scenarioIndexPath, "utf8"),
  readFile(mainPath, "utf8")
]);

await Promise.all([
  writeFile(
    join(tempModuleDir, "scenario"),
    transpileTypeScript(scenarioShapeSource, "scenario.ts")
  ),
  writeFile(
    join(tempModuleDir, "resolve-scenario-inputs"),
    transpileTypeScript(scenarioModuleSource, "resolve-scenario-inputs.ts")
  )
]);

const {
  createScenarioSwitchPlan,
  resolveScenarioInputs,
  resolveScenarioPresentationRef,
  resolveScenarioSatelliteSource,
  resolveScenarioSiteDatasetRef,
  resolveScenarioTimeInput,
  resolveScenarioValidationRef
} = await import(pathToFileURL(join(tempModuleDir, "resolve-scenario-inputs")).href);

const requiredScenarioModuleSnippets = [
  "export interface ScenarioResolvedInputs {",
  "export type ScenarioSwitchPlanStep =",
  'kind: "detach-satellite-source"',
  'kind: "set-presentation";',
  'kind: "set-time";',
  'kind: "attach-site-dataset";',
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

const requiredScenarioIndexSnippets = [
  "ScenarioResolvedInputs",
  "ScenarioSwitchPlan",
  "ScenarioSwitchPlanStep",
  "createScenarioSwitchPlan",
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
}

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

const livePresentation = resolveScenarioPresentationRef(liveScenario);
assert.deepEqual(livePresentation, { presetKey: "global" });
assert.notStrictEqual(livePresentation, liveScenario.presentation);

const liveTimeInput = resolveScenarioTimeInput(liveScenario);
assert.deepEqual(liveTimeInput, { mode: "real-time" });

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

assert(
  !/\bfeatures\/scenario\b/.test(mainSource),
  "Phase 6.1 bounded coordination must stay off the live runtime path for now."
);

await rm(tempModuleDir, { recursive: true, force: true });

console.log("Phase 6.1 scenario coordination verification passed.");
