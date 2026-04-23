import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const nearbySecondEndpointModulePath = new URL(
  "../src/features/nearby-second-endpoint/nearby-second-endpoint.ts",
  import.meta.url
);
const acceptedNearbySecondEndpointSourceDataModulePath = new URL(
  "../src/features/nearby-second-endpoint/accepted-nearby-second-endpoint-source-data.ts",
  import.meta.url
);
const firstIntakeNearbySecondEndpointSourceModulePath = new URL(
  "../src/runtime/first-intake-nearby-second-endpoint-source.ts",
  import.meta.url
);
const nearbySecondEndpointPositionPath = new URL(
  "../../itri/multi-orbit/download/nearby-second-endpoints/m8a-yka-operations-office-2026-04-23/position.json",
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
    /\.\.\/features\/nearby-second-endpoint\/nearby-second-endpoint\.mjs/g,
    "./nearby-second-endpoint.mjs"
  ).replace(
    /\.\.\/features\/nearby-second-endpoint\/accepted-nearby-second-endpoint-source-data\.mjs/g,
    "./accepted-nearby-second-endpoint-source-data.mjs"
  );
}

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-m8a2-source-"));

try {
  const [
    nearbySecondEndpointSource,
    acceptedNearbySecondEndpointSourceDataSource,
    firstIntakeNearbySecondEndpointSource,
    nearbySecondEndpointPositionRaw
  ] = await Promise.all([
    readFile(nearbySecondEndpointModulePath, "utf8"),
    readFile(acceptedNearbySecondEndpointSourceDataModulePath, "utf8"),
    readFile(firstIntakeNearbySecondEndpointSourceModulePath, "utf8"),
    readFile(nearbySecondEndpointPositionPath, "utf8")
  ]);

  for (const snippet of [
    "createNearbySecondEndpointCatalog",
    "resolveNearbySecondEndpointSourceEntry",
    'FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_ADOPTION_MODE =',
    'FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_CONTRACT_SEAM ='
  ]) {
    assert(
      firstIntakeNearbySecondEndpointSource.includes(snippet),
      `First-intake nearby second-endpoint source must include ${snippet}.`
    );
  }

  assert(
    firstIntakeNearbySecondEndpointSource.includes(
      "../features/nearby-second-endpoint/accepted-nearby-second-endpoint-source-data"
    ),
    "First-intake nearby second-endpoint source must import the repo-owned plain-data seam."
  );
  assert(
    !firstIntakeNearbySecondEndpointSource.includes(
      'from "../../../itri/multi-orbit/download/nearby-second-endpoints/'
    ),
    "First-intake nearby second-endpoint source must not import raw itri nearby-second-endpoint package files at runtime."
  );

  await Promise.all([
    writeFile(
      join(tempModuleDir, "nearby-second-endpoint.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(
          nearbySecondEndpointSource,
          "nearby-second-endpoint.ts"
        )
      )
    ),
    writeFile(
      join(tempModuleDir, "accepted-nearby-second-endpoint-source-data.mjs"),
      rewriteRelativeImports(
        transpileTypeScript(
          acceptedNearbySecondEndpointSourceDataSource,
          "accepted-nearby-second-endpoint-source-data.ts"
        )
      )
    ),
    writeFile(
      join(tempModuleDir, "first-intake-nearby-second-endpoint-source.mjs"),
      localizeTempImports(
        rewriteRelativeImports(
          transpileTypeScript(
            firstIntakeNearbySecondEndpointSource,
            "first-intake-nearby-second-endpoint-source.ts"
          )
        )
      )
    )
  ]);

  const {
    ACCEPTED_NEARBY_SECOND_ENDPOINT_POSITION_PROJECTION
  } = await import(
    pathToFileURL(
      join(tempModuleDir, "accepted-nearby-second-endpoint-source-data.mjs")
    ).href
  );
  const {
    FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_ADOPTION_MODE,
    FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_CONTRACT_SEAM,
    FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_PACKAGE_ROOT,
    FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_POSITION_PATH,
    FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_NON_CLAIMS_PATH,
    createFirstIntakeNearbySecondEndpointSourceCatalog,
    resolveFirstIntakeNearbySecondEndpointSourceEntry
  } = await import(
    pathToFileURL(
      join(tempModuleDir, "first-intake-nearby-second-endpoint-source.mjs")
    ).href
  );
  const rawPosition = JSON.parse(nearbySecondEndpointPositionRaw);

  const catalog = createFirstIntakeNearbySecondEndpointSourceCatalog();
  const sourceEntry = resolveFirstIntakeNearbySecondEndpointSourceEntry(
    catalog,
    "app-oneweb-intelsat-geo-aviation"
  );

  assert.deepEqual(
    ACCEPTED_NEARBY_SECOND_ENDPOINT_POSITION_PROJECTION,
    rawPosition,
    "Repo-owned plain-data projection must stay synchronized with the accepted itri position package."
  );

  assert.equal(
    catalog.adoptionMode,
    FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_ADOPTION_MODE,
    "Nearby second-endpoint catalog must expose the dedicated first-intake adoption mode."
  );
  assert.equal(
    catalog.sourceLineage.contractSeam,
    FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_CONTRACT_SEAM,
    "Nearby second-endpoint catalog must expose the dedicated contract seam."
  );
  assert.equal(
    catalog.sourceLineage.packageRoot,
    FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_PACKAGE_ROOT,
    "Nearby second-endpoint catalog must expose the accepted package root."
  );
  assert.equal(
    catalog.sourceLineage.positionPath,
    FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_POSITION_PATH,
    "Nearby second-endpoint catalog must expose the accepted position path."
  );
  assert.equal(
    catalog.sourceLineage.nonClaimsPath,
    FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_NON_CLAIMS_PATH,
    "Nearby second-endpoint catalog must expose the accepted non-claims path."
  );
  assert.deepEqual(
    {
      scenarioId: sourceEntry.scenarioId,
      endpointId: sourceEntry.endpointId,
      endpointLabel: sourceEntry.endpointLabel,
      endpointType: sourceEntry.endpointType,
      geographyBucket: sourceEntry.geographyBucket,
      positionPrecision: sourceEntry.positionPrecision,
      coordinateReference: sourceEntry.coordinateReference,
      narrativeRole: sourceEntry.narrativeRole,
      coordinates: sourceEntry.coordinates,
      truthBoundary: sourceEntry.truthBoundary
    },
    {
      scenarioId: "app-oneweb-intelsat-geo-aviation",
      endpointId: "endpoint-yka-operations-office",
      endpointLabel: "YKA Kamloops Airport Operations Office",
      endpointType: "airport-adjacent-fixed-service-endpoint",
      geographyBucket: "interior-bc-corridor-adjacent",
      positionPrecision: "facility-known",
      coordinateReference: "WGS84",
      narrativeRole: "nearby-fixed-second-endpoint",
      coordinates: {
        lat: 50.703,
        lon: -120.4486
      },
      truthBoundary: {
        activeGatewayAssignment: "not-claimed",
        pairSpecificGeoTeleport: "not-claimed",
        measurementTruth: "not-claimed"
      }
    },
    "Nearby second-endpoint source entry must preserve the accepted YKA identity, precision, and truth boundary."
  );
  assert.throws(
    () =>
      resolveFirstIntakeNearbySecondEndpointSourceEntry(
        catalog,
        "unsupported-scenario"
      ),
    /No nearby-second-endpoint source entry exists/,
    "Nearby second-endpoint source catalog must stay first-case-only."
  );

  console.log(
    `M8A.2 nearby second-endpoint source verification passed: ${JSON.stringify({
      scenarioId: sourceEntry.scenarioId,
      endpointId: sourceEntry.endpointId,
      adoptionMode: catalog.adoptionMode,
      contractSeam: catalog.sourceLineage.contractSeam
    })}`
  );
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
