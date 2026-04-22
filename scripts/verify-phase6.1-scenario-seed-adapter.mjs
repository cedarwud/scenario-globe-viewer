import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const scenarioShapePath = new URL(
  "../src/features/scenario/scenario.ts",
  import.meta.url
);
const scenarioSeedAdapterPath = new URL(
  "../src/features/scenario/scenario-seed-adapter.ts",
  import.meta.url
);
const scenarioIndexPath = new URL(
  "../src/features/scenario/index.ts",
  import.meta.url
);
const firstIntakeSeedPath = new URL(
  "../../itri/multi-orbit/prep/seeds/oneweb-intelsat-geo-aviation.seed.json",
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

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-scenario-seed-"));

try {
  const [scenarioShapeSource, scenarioSeedAdapterSource, scenarioIndexSource] =
    await Promise.all([
      readFile(scenarioShapePath, "utf8"),
      readFile(scenarioSeedAdapterPath, "utf8"),
      readFile(scenarioIndexPath, "utf8")
    ]);

  const requiredAdapterSourceSnippets = [
    "export interface FirstIntakeScenarioSeed {",
    "export function adaptFirstIntakeScenarioSeedToDefinition(",
    "FIRST_INTAKE_ENDPOINT_OVERLAY_PROFILE_ID",
    "FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_PROFILE_ID",
    "sources: {}"
  ];

  for (const snippet of requiredAdapterSourceSnippets) {
    assert(
      scenarioSeedAdapterSource.includes(snippet),
      `Missing required scenario seed adapter snippet: ${snippet}`
    );
  }

  const requiredIndexSnippets = [
    "FirstIntakeScenarioSeed",
    "ScenarioSeedRecommendedMode",
    "adaptFirstIntakeScenarioSeedToDefinition",
    "FIRST_INTAKE_ENDPOINT_OVERLAY_PROFILE_ID",
    "FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_PROFILE_ID"
  ];

  for (const snippet of requiredIndexSnippets) {
    assert(
      scenarioIndexSource.includes(snippet),
      `Scenario module boundary must re-export ${snippet}.`
    );
  }

  const forbiddenAdapterPatterns = [
    {
      pattern: /\bCandidatePhysicalInputs\b/,
      message: "Scenario seed adapter must not materialize physical-input candidates."
    },
    {
      pattern: /\bPhysicalInputWindow\b/,
      message: "Scenario seed adapter must not materialize physical-input windows."
    },
    {
      pattern: /\bHandoverDecisionSnapshot\b/,
      message: "Scenario seed adapter must not start the handover-decision seam."
    },
    {
      pattern: /\bcandidatePaths\b/,
      message: "Scenario seed adapter must not read candidate path projection inputs."
    },
    {
      pattern: /\bendpoints\b/,
      message: "Scenario seed adapter must not start endpoint overlay mapping."
    },
    {
      pattern: /\bknownInfrastructureNodes\b/,
      message: "Scenario seed adapter must not start infrastructure overlay mapping."
    },
    {
      pattern: /\bCesium\b|\bViewer\b|\bEntity\b/,
      message: "Scenario seed adapter must stay plain-data only."
    }
  ];

  for (const { pattern, message } of forbiddenAdapterPatterns) {
    assert(!pattern.test(scenarioSeedAdapterSource), message);
  }

  await Promise.all([
    writeFile(
      join(tempModuleDir, "scenario"),
      transpileTypeScript(scenarioShapeSource, "scenario.ts")
    ),
    writeFile(
      join(tempModuleDir, "scenario-seed-adapter"),
      transpileTypeScript(
        scenarioSeedAdapterSource,
        "scenario-seed-adapter.ts"
      )
    )
  ]);

  const {
    adaptFirstIntakeScenarioSeedToDefinition,
    FIRST_INTAKE_ENDPOINT_OVERLAY_PROFILE_ID,
    FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_PROFILE_ID
  } = await import(
    pathToFileURL(join(tempModuleDir, "scenario-seed-adapter")).href
  );
  const { assertScenarioDefinitionContext } = await import(
    pathToFileURL(join(tempModuleDir, "scenario")).href
  );
  const firstIntakeSeed = JSON.parse(await readFile(firstIntakeSeedPath, "utf8"));
  const definition = adaptFirstIntakeScenarioSeedToDefinition(firstIntakeSeed);

  assert.equal(definition.id, firstIntakeSeed.scenario.id);
  assert.equal(definition.label, firstIntakeSeed.scenario.label);
  assert.equal(
    definition.presentation.presetKey,
    firstIntakeSeed.scenario.presentation.presetKey
  );
  assert.equal(definition.kind, firstIntakeSeed.scenario.time.recommendedMode);
  assert.equal(definition.time.mode, firstIntakeSeed.scenario.time.recommendedMode);
  assert.deepEqual(definition.time, {
    mode: firstIntakeSeed.scenario.time.recommendedMode
  });
  assert.deepEqual(definition.context, {
    vertical: firstIntakeSeed.scenario.vertical,
    truthBoundaryLabel: firstIntakeSeed.handoverPolicy.truthBoundaryLabel,
    endpointProfileId: FIRST_INTAKE_ENDPOINT_OVERLAY_PROFILE_ID,
    infrastructureProfileId: FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_PROFILE_ID
  });
  assert.deepEqual(
    definition.sources,
    {},
    "Scenario seed adapter must keep sources as the minimum stub only."
  );
  assert(!("range" in definition.time), "Scenario seed adapter must not create time ranges.");
  assert.equal(
    Object.keys(definition.sources).length,
    0,
    "Scenario seed adapter must not add source-family wiring."
  );

  assert.doesNotThrow(() => assertScenarioDefinitionContext(definition));

  assert.throws(
    () =>
      adaptFirstIntakeScenarioSeedToDefinition({
        ...firstIntakeSeed,
        scenario: {
          ...firstIntakeSeed.scenario,
          time: {
            recommendedMode: "site-dataset"
          }
        }
      }),
    /recommendedMode must be real-time or prerecorded/,
    "Scenario seed adapter must only accept replay-mode recommendations."
  );

  assert.throws(
    () =>
      adaptFirstIntakeScenarioSeedToDefinition({
        ...firstIntakeSeed,
        handoverPolicy: {
          ...firstIntakeSeed.handoverPolicy,
          truthBoundaryLabel: "wrong-boundary"
        }
      }),
    /context.truthBoundaryLabel must be real-pairing-bounded-runtime-projection/,
    "Scenario seed adapter must preserve the accepted truth-boundary label only."
  );

  console.log("Phase 6.1 scenario seed adapter verification passed.");
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
