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
const staticProfileModulePath = new URL(
  "../src/features/physical-input/static-bounded-metric-profile.ts",
  import.meta.url
);
const pathProjectionModulePath = new URL(
  "../src/features/physical-input/path-projection-adapter.ts",
  import.meta.url
);
const firstIntakePhysicalInputSourceModulePath = new URL(
  "../src/runtime/first-intake-physical-input-source.ts",
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

function localizeTempImports(source) {
  return source
    .replace(
      /\.\.\/features\/physical-input\/physical-input\.mjs/g,
      "./physical-input.mjs"
    )
    .replace(
      /\.\.\/features\/physical-input\/path-projection-adapter\.mjs/g,
      "./path-projection-adapter.mjs"
    )
    .replace(
      /\.\.\/features\/physical-input\/static-bounded-metric-profile\.mjs/g,
      "./static-bounded-metric-profile.mjs"
    );
}

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-m3-slice-c-"));

try {
  const [
    physicalInputSource,
    staticProfileSource,
    pathProjectionSource,
    firstIntakePhysicalInputSource,
    firstIntakeSeedRaw
  ] = await Promise.all([
    readFile(physicalInputModulePath, "utf8"),
    readFile(staticProfileModulePath, "utf8"),
    readFile(pathProjectionModulePath, "utf8"),
    readFile(firstIntakePhysicalInputSourceModulePath, "utf8"),
    readFile(firstIntakeSeedPath, "utf8")
  ]);

  for (const snippet of [
    "adaptFirstIntakeSeedToPhysicalInputSourceEntry",
    "ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE",
    'FIRST_INTAKE_PHYSICAL_INPUT_ADOPTION_MODE =',
    'FIRST_INTAKE_PHYSICAL_INPUT_BOOTSTRAP_FALLBACK = "not-used"'
  ]) {
    assert(
      firstIntakePhysicalInputSource.includes(snippet),
      `First-intake physical-input source must include ${snippet}.`
    );
  }

  assert(
    !firstIntakePhysicalInputSource.includes("BOOTSTRAP_PHYSICAL_SOURCE_SEEDS"),
    "First-intake physical-input source must not reference BOOTSTRAP_PHYSICAL_SOURCE_SEEDS."
  );

  await Promise.all([
    writeFile(
      join(tempModuleDir, "physical-input.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(physicalInputSource, "physical-input.ts")
      )
    ),
    writeFile(
      join(tempModuleDir, "static-bounded-metric-profile.mjs"),
      localizeTempImports(
        rewriteRelativeImports(
          transpileTypeScript(
            staticProfileSource,
            "static-bounded-metric-profile.ts"
          )
        )
      )
    ),
    writeFile(
      join(tempModuleDir, "path-projection-adapter.mjs"),
      localizeTempImports(
        rewriteRelativeImports(
          transpileTypeScript(
            pathProjectionSource,
            "path-projection-adapter.ts"
          )
        )
      )
    ),
    writeFile(
      join(tempModuleDir, "first-intake-physical-input-source.mjs"),
      localizeTempImports(
        rewriteRelativeImports(
          transpileTypeScript(
            firstIntakePhysicalInputSource,
            "first-intake-physical-input-source.ts"
          )
        )
      )
    )
  ]);

  const {
    FIRST_INTAKE_PHYSICAL_INPUT_ADOPTION_MODE,
    FIRST_INTAKE_PHYSICAL_INPUT_BOOTSTRAP_FALLBACK,
    FIRST_INTAKE_PHYSICAL_INPUT_CONTEXT_LABEL,
    FIRST_INTAKE_PHYSICAL_INPUT_SEED_PATH,
    createFirstIntakePhysicalInputSourceCatalog,
    resolveFirstIntakePhysicalInputSourceEntry
  } = await import(
    pathToFileURL(join(tempModuleDir, "first-intake-physical-input-source.mjs"))
      .href
  );

  const firstIntakeSeed = JSON.parse(firstIntakeSeedRaw);
  const catalog = createFirstIntakePhysicalInputSourceCatalog([firstIntakeSeed]);
  const sourceEntry = resolveFirstIntakePhysicalInputSourceEntry(
    catalog,
    "app-oneweb-intelsat-geo-aviation"
  );

  assert.equal(
    catalog.adoptionMode,
    FIRST_INTAKE_PHYSICAL_INPUT_ADOPTION_MODE,
    "First-intake physical-input catalog must expose the dedicated non-bootstrap adoption mode."
  );
  assert.equal(
    catalog.sourceLineage.seedPath,
    FIRST_INTAKE_PHYSICAL_INPUT_SEED_PATH,
    "First-intake physical-input catalog must expose the seed-path lineage."
  );
  assert.equal(
    catalog.sourceLineage.bootstrapFallback,
    FIRST_INTAKE_PHYSICAL_INPUT_BOOTSTRAP_FALLBACK,
    "First-intake physical-input catalog must explicitly reject bootstrap fallback."
  );
  assert.equal(
    sourceEntry.scenarioId,
    "app-oneweb-intelsat-geo-aviation",
    "First-intake physical-input source entry must stay on the first accepted scenario id."
  );
  assert.deepEqual(
    sourceEntry.windows.map((window) => ({
      startRatio: window.startRatio,
      stopRatio: window.stopRatio,
      candidateIds: window.candidates.map((candidate) => candidate.candidateId)
    })),
    [
      {
        startRatio: 0,
        stopRatio: 1,
        candidateIds: [
          "oneweb-leo-service-path",
          "intelsat-geo-service-path"
        ]
      }
    ],
    "First-intake physical-input source entry must stay on the path-projected OneWeb LEO + Intelsat GEO candidate set."
  );
  assert.deepEqual(
    sourceEntry.windows[0].candidates.map((candidate) => ({
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
    "First-intake physical-input source entry must preserve the bounded truth-boundary path semantics."
  );
  assert.deepEqual(
    sourceEntry.provenance.map((entry) => entry.family),
    ["antenna", "rain-attenuation", "itu-style"],
    "First-intake physical-input source entry must preserve all required provenance families."
  );
  assert.equal(
    FIRST_INTAKE_PHYSICAL_INPUT_CONTEXT_LABEL,
    "First-intake bounded service-switching proxy",
    "First-intake physical-input context label must stay slice-specific and repo-owned."
  );

  console.log(
    `M3 Slice C first-intake physical-input source verification passed: ${JSON.stringify({
      scenarioId: sourceEntry.scenarioId,
      adoptionMode: catalog.adoptionMode,
      candidateIds: sourceEntry.windows[0].candidates.map(
        (candidate) => candidate.candidateId
      ),
      bootstrapFallback: catalog.sourceLineage.bootstrapFallback
    })}`
  );
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
