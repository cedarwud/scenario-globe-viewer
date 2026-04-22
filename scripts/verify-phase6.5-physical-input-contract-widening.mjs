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
const physicalInputIndexPath = new URL(
  "../src/features/physical-input/index.ts",
  import.meta.url
);
const physicalInputDocPath = new URL(
  "../docs/data-contracts/physical-input.md",
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

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-phase6.5-contract-"));

try {
  const [
    physicalInputSource,
    staticProfileSource,
    physicalInputIndexSource,
    physicalInputDoc
  ] = await Promise.all([
    readFile(physicalInputPath, "utf8"),
    readFile(staticProfilePath, "utf8"),
    readFile(physicalInputIndexPath, "utf8"),
    readFile(physicalInputDocPath, "utf8")
  ]);

  const requiredPhysicalInputSnippets = [
    'export type PhysicalInputPathRole = "primary" | "secondary" | "contrast";',
    "export const PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE =",
    "export type PathControlMode =",
    'pathRole?: PhysicalInputPathRole;',
    'pathControlMode?: PathControlMode;',
    'infrastructureSelectionMode?: InfrastructureSelectionMode;',
    "export function assertRepoOwnedPathControlMode("
  ];

  for (const snippet of requiredPhysicalInputSnippets) {
    assert(
      physicalInputSource.includes(snippet),
      `Missing physical-input contract widening snippet: ${snippet}`
    );
  }

  const requiredStaticProfileSnippets = [
    "export interface PhysicalInputStaticBoundedMetricProfile {",
    "export type FirstIntakePhysicalInputCaseId =",
    '"app-oneweb-intelsat-geo-aviation"',
    'export type StaticBoundedMetricCalibrationState = "non-calibrated";',
    "measurementTruth: false;",
    "PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE",
    "eligible-pool",
    "provider-managed",
    "assertPhysicalInputStaticBoundedMetricProfile"
  ];

  for (const snippet of requiredStaticProfileSnippets) {
    assert(
      staticProfileSource.includes(snippet),
      `Missing static bounded metric profile snippet: ${snippet}`
    );
  }

  const requiredIndexSnippets = [
    "PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE",
    "assertRepoOwnedPathControlMode",
    "PhysicalInputPathRole",
    "PathControlMode",
    "InfrastructureSelectionMode",
    "ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE",
    "assertPhysicalInputStaticBoundedMetricProfile"
  ];

  for (const snippet of requiredIndexSnippets) {
    assert(
      physicalInputIndexSource.includes(snippet),
      `Physical-input index must re-export ${snippet}.`
    );
  }

  const requiredDocSnippets = [
    "src/features/physical-input/static-bounded-metric-profile.ts",
    "pathRole",
    "pathControlMode",
    "infrastructureSelectionMode",
    "managed_service_switching",
    "app-oneweb-intelsat-geo-aviation",
    "non-calibrated",
    "not measurement truth"
  ];

  for (const snippet of requiredDocSnippets) {
    assert(
      physicalInputDoc.includes(snippet),
      `Physical-input contract doc must mention ${snippet}.`
    );
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
    )
  ]);

  const {
    PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE,
    assertRepoOwnedPathControlMode,
    createPhysicalInputState
  } = await import(pathToFileURL(join(tempModuleDir, "physical-input.mjs")).href);
  const {
    ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE,
    assertPhysicalInputStaticBoundedMetricProfile
  } = await import(
    pathToFileURL(join(tempModuleDir, "static-bounded-metric-profile.mjs")).href
  );

  assert.doesNotThrow(() =>
    assertPhysicalInputStaticBoundedMetricProfile(
      ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE
    )
  );

  assert.doesNotThrow(() =>
    assertRepoOwnedPathControlMode(PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE)
  );
  assert.throws(
    () => assertRepoOwnedPathControlMode("sdwan_orchestrated_switching"),
    /managed_service_switching/,
    "Only the first repo-owned pathControlMode may be validated in this slice."
  );

  const physicalInputState = createPhysicalInputState({
    scenario: {
      id: "multi-orbit-oneweb-intelsat-aviation-prerecorded",
      label: "OneWeb + Intelsat GEO Aviation"
    },
    activeRange: {
      start: "2026-04-21T00:00:00.000Z",
      stop: "2026-04-21T00:20:00.000Z"
    },
    evaluatedAt: "2026-04-21T00:10:00.000Z",
    activeContextLabel: "Aviation ingress over OneWeb-preferred corridor",
    sourceEntry: {
      scenarioId: "multi-orbit-oneweb-intelsat-aviation-prerecorded",
      windows: [
        {
          startRatio: 0,
          stopRatio: 1,
          candidates:
            ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE.candidates
        }
      ],
      provenance:
        ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE.provenance
    }
  });

  assert.deepEqual(
    physicalInputState.candidates.map((candidate) => ({
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
    "Static bounded profile must preserve the first-intake path semantics."
  );

  assert.deepEqual(
    physicalInputState.report.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      pathRole: candidate.pathRole,
      pathControlMode: candidate.pathControlMode,
      infrastructureSelectionMode: candidate.infrastructureSelectionMode
    })),
    [
      {
        candidateId: "oneweb-leo-service-path",
        pathRole: "primary",
        pathControlMode: "managed_service_switching",
        infrastructureSelectionMode: "eligible-pool"
      },
      {
        candidateId: "intelsat-geo-service-path",
        pathRole: "secondary",
        pathControlMode: "managed_service_switching",
        infrastructureSelectionMode: "provider-managed"
      }
    ],
    "Physical-input report must carry the widened path semantics without touching handover-decision."
  );

  assert(
    physicalInputState.projectedMetrics.every((candidate) => candidate.provenanceKind === "bounded-proxy"),
    "Projected physical-input metrics must stay bounded-proxy."
  );
  assert(
    physicalInputState.report.candidates.some((candidate) => {
      return (
        candidate.baseMetrics.latencyMs !== candidate.projectedMetrics.latencyMs ||
        candidate.baseMetrics.jitterMs !== candidate.projectedMetrics.jitterMs ||
        candidate.baseMetrics.networkSpeedMbps !==
          candidate.projectedMetrics.networkSpeedMbps
      );
    }),
    "Static bounded profile candidates must still project into bounded decision metrics."
  );
  assert(
    /not final physical-layer truth/i.test(physicalInputState.disclaimer),
    "Physical-input boundary note must stay explicit."
  );

  console.log("Phase 6.5 physical-input contract widening verification passed.");
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
