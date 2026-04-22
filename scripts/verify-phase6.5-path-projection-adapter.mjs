import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const physicalInputPath = new URL(
  "../src/features/physical-input/physical-input.ts",
  import.meta.url
);
const staticProfilePath = new URL(
  "../src/features/physical-input/static-bounded-metric-profile.ts",
  import.meta.url
);
const pathProjectionAdapterPath = new URL(
  "../src/features/physical-input/path-projection-adapter.ts",
  import.meta.url
);
const physicalInputIndexPath = new URL(
  "../src/features/physical-input/index.ts",
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

function rewriteRelativeImports(source) {
  return source
    .replace(/from "(\.\.?\/[^".][^"]*)"/g, 'from "$1.mjs"')
    .replace(/from '(\.\.?\/[^'.][^']*)'/g, "from '$1.mjs'")
    .replace(/export \* from "(\.\.?\/[^".][^"]*)"/g, 'export * from "$1.mjs"')
    .replace(/export \* from '(\.\.?\/[^'.][^']*)'/g, "export * from '$1.mjs'");
}

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-path-projection-"));

try {
  const [
    physicalInputSource,
    staticProfileSource,
    pathProjectionAdapterSource,
    physicalInputIndexSource
  ] = await Promise.all([
    readFile(physicalInputPath, "utf8"),
    readFile(staticProfilePath, "utf8"),
    readFile(pathProjectionAdapterPath, "utf8"),
    readFile(physicalInputIndexPath, "utf8")
  ]);

  const requiredAdapterSourceSnippets = [
    "export const FIRST_INTAKE_PATH_PROJECTION_CANDIDATE_IDS = [",
    "export interface FirstIntakePathProjectionSeed {",
    "export function adaptFirstIntakeSeedToCandidatePhysicalInputs(",
    "export function adaptFirstIntakeSeedToPhysicalInputWindows(",
    "export function adaptFirstIntakeSeedToPhysicalInputSourceEntry(",
    "createFirstIntakePhysicalInputWindow",
    "assertMatchingCandidatePath"
  ];

  for (const snippet of requiredAdapterSourceSnippets) {
    assert(
      pathProjectionAdapterSource.includes(snippet),
      `Missing required path-projection-adapter snippet: ${snippet}`
    );
  }

  const requiredIndexSnippets = [
    "FIRST_INTAKE_PATH_PROJECTION_CANDIDATE_IDS",
    "adaptFirstIntakeSeedToCandidatePhysicalInputs",
    "adaptFirstIntakeSeedToPhysicalInputWindows",
    "adaptFirstIntakeSeedToPhysicalInputSourceEntry",
    "FirstIntakePathProjectionSeed"
  ];

  for (const snippet of requiredIndexSnippets) {
    assert(
      physicalInputIndexSource.includes(snippet),
      `Physical-input index must re-export ${snippet}.`
    );
  }

  const forbiddenAdapterPatterns = [
    {
      pattern: /\bHandoverDecisionSnapshot\b/,
      message:
        "Path projection adapter must not start the handover-policy-adapter seam."
    },
    {
      pattern: /\bdecisionModel\b|\bpreferredSignalOrder\b/,
      message:
        "Path projection adapter must not consume handover-policy vocabulary."
    },
    {
      pattern: /\bbootstrap-physical-input\b|\bbootstrap-/,
      message:
        "Path projection adapter must stay out of bootstrap runtime modules."
    },
    {
      pattern: /\bCesium\b|\bViewer\b|\bEntity\b/,
      message: "Path projection adapter must stay plain-data only."
    },
    {
      pattern: /\bendpoints\b|\bknownInfrastructureNodes\b/,
      message:
        "Path projection adapter must not start endpoint or infrastructure overlay mapping."
    }
  ];

  for (const { pattern, message } of forbiddenAdapterPatterns) {
    assert(!pattern.test(pathProjectionAdapterSource), message);
  }

  await Promise.all([
    writeFile(
      join(tempModuleDir, "physical-input.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(physicalInputSource, "physical-input.ts")
      )
    ),
    writeFile(
      join(tempModuleDir, "static-bounded-metric-profile.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(
          staticProfileSource,
          "static-bounded-metric-profile.ts"
        )
      )
    ),
    writeFile(
      join(tempModuleDir, "path-projection-adapter.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(
          pathProjectionAdapterSource,
          "path-projection-adapter.ts"
        )
      )
    )
  ]);

  const {
    FIRST_INTAKE_PATH_PROJECTION_CANDIDATE_IDS,
    adaptFirstIntakeSeedToCandidatePhysicalInputs,
    adaptFirstIntakeSeedToPhysicalInputWindows,
    adaptFirstIntakeSeedToPhysicalInputSourceEntry
  } = await import(
    pathToFileURL(join(tempModuleDir, "path-projection-adapter.mjs")).href
  );
  const {
    ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE
  } = await import(
    pathToFileURL(join(tempModuleDir, "static-bounded-metric-profile.mjs")).href
  );

  const firstIntakeSeed = JSON.parse(await readFile(firstIntakeSeedPath, "utf8"));
  const candidates = adaptFirstIntakeSeedToCandidatePhysicalInputs(
    firstIntakeSeed,
    ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE
  );
  const windows = adaptFirstIntakeSeedToPhysicalInputWindows(
    firstIntakeSeed,
    ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE
  );
  const sourceEntry = adaptFirstIntakeSeedToPhysicalInputSourceEntry(
    firstIntakeSeed,
    ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE
  );

  assert.deepEqual(FIRST_INTAKE_PATH_PROJECTION_CANDIDATE_IDS, [
    "oneweb-leo-service-path",
    "intelsat-geo-service-path"
  ]);
  assert.deepEqual(
    candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      orbitClass: candidate.orbitClass,
      pathRole: candidate.pathRole,
      pathControlMode: candidate.pathControlMode,
      infrastructureSelectionMode: candidate.infrastructureSelectionMode
    })),
    [
      {
        candidateId: "oneweb-leo-service-path",
        orbitClass: "leo",
        pathRole: "primary",
        pathControlMode: "managed_service_switching",
        infrastructureSelectionMode: "eligible-pool"
      },
      {
        candidateId: "intelsat-geo-service-path",
        orbitClass: "geo",
        pathRole: "secondary",
        pathControlMode: "managed_service_switching",
        infrastructureSelectionMode: "provider-managed"
      }
    ],
    "Path projection adapter must preserve the landed static profile path semantics."
  );
  assert.deepEqual(
    sourceEntry.provenance,
    ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE.provenance,
    "Path projection adapter must preserve bounded-proxy provenance."
  );
  assert.equal(
    sourceEntry.scenarioId,
    firstIntakeSeed.scenario.id,
    "Path projection adapter must align scenarioId with seed.scenario.id."
  );
  assert.equal(
    windows.length,
    1,
    "First-intake path projection must stay on one full-range physical-input window."
  );
  assert.deepEqual(windows, sourceEntry.windows);
  assert.deepEqual(windows[0].startRatio, 0);
  assert.deepEqual(windows[0].stopRatio, 1);
  assert(!("contextLabel" in windows[0]), "Path projection windows must stay plain-data only.");
  assert.deepEqual(
    windows[0].candidates,
    candidates,
    "Path projection adapter must materialize the same candidate set across all outputs."
  );
  assert.notStrictEqual(
    candidates[0],
    ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE.candidates[0],
    "Path projection adapter must clone profile candidates into repo-owned outputs."
  );

  const mismatchedScenarioSeed = JSON.parse(JSON.stringify(firstIntakeSeed));
  mismatchedScenarioSeed.scenario.id = "wrong-scenario-id";
  assert.throws(
    () =>
      adaptFirstIntakeSeedToPhysicalInputSourceEntry(
        mismatchedScenarioSeed,
        ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE
      ),
    /scenario\.id must match the static bounded metric profile intakeCaseId/,
    "Path projection adapter must fail fast when seed/profile scenario identity diverges."
  );

  const mismatchedCandidateSeed = JSON.parse(JSON.stringify(firstIntakeSeed));
  mismatchedCandidateSeed.candidatePaths[0].pathControlMode = "wrong-mode";
  assert.throws(
    () =>
      adaptFirstIntakeSeedToCandidatePhysicalInputs(
        mismatchedCandidateSeed,
        ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE
      ),
    /pathControlMode mismatch/,
    "Path projection adapter must fail fast when seed/profile candidate semantics diverge."
  );

  console.log("Phase 6.5 path projection adapter verification passed.");
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
