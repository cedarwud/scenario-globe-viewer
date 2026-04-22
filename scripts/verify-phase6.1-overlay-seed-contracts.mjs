import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const overlaySeedsPath = new URL(
  "../src/features/overlays/overlay-seeds.ts",
  import.meta.url
);
const overlayIndexPath = new URL(
  "../src/features/overlays/index.ts",
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

const tempModuleDir = await mkdtemp(join(tmpdir(), "sgv-overlay-seeds-"));

try {
  await mkdir(join(tempModuleDir, "features/overlays"), { recursive: true });

  const [overlaySeedsSource, overlayIndexSource] = await Promise.all([
    readFile(overlaySeedsPath, "utf8"),
    readFile(overlayIndexPath, "utf8")
  ]);

  const requiredOverlaySeedSnippets = [
    "export interface EndpointOverlaySeed {",
    "profileId: string;",
    "positionMode: string;",
    "renderClass: string;",
    "coordinates?: OverlaySeedCoordinates;",
    "export interface InfrastructureOverlaySeed {",
    "nodes: ReadonlyArray<InfrastructureOverlayNode>;",
    "networkRoles: ReadonlyArray<string>;",
    "export function assertEndpointOverlaySeed(",
    "export function assertInfrastructureOverlaySeed("
  ];

  for (const snippet of requiredOverlaySeedSnippets) {
    assert(
      overlaySeedsSource.includes(snippet),
      `Missing required overlay seed contract snippet: ${snippet}`
    );
  }

  const requiredOverlayIndexSnippets = [
    "EndpointOverlaySeed",
    "InfrastructureOverlaySeed",
    "OverlaySeedCoordinates",
    "assertEndpointOverlaySeed",
    "assertInfrastructureOverlaySeed"
  ];

  for (const snippet of requiredOverlayIndexSnippets) {
    assert(
      overlayIndexSource.includes(snippet),
      `Overlay module boundary must re-export ${snippet}.`
    );
  }

  const forbiddenOverlaySeedPatterns = [
    {
      pattern: /from\s+["']cesium["']/,
      message: "Overlay seed contract must not import from cesium."
    },
    {
      pattern: /\bViewer\b/,
      message: "Overlay seed contract must not mention Viewer."
    },
    {
      pattern: /\bEntity\b/,
      message: "Overlay seed contract must not mention Entity."
    },
    {
      pattern: /\bJulianDate\b/,
      message: "Overlay seed contract must not mention JulianDate."
    },
    {
      pattern: /\bCesium3DTileset\b/,
      message: "Overlay seed contract must not mention Cesium3DTileset."
    },
    {
      pattern: /\bscenarioId\b/,
      message: "Overlay seed contract must stay keyed by profileId only."
    }
  ];

  for (const { pattern, message } of forbiddenOverlaySeedPatterns) {
    assert(!pattern.test(overlaySeedsSource), message);
  }

  await Promise.all([
    writeFile(
      join(tempModuleDir, "features/overlays/overlay-seeds"),
      transpileTypeScript(overlaySeedsSource, "features/overlays/overlay-seeds.ts")
    ),
    writeFile(
      join(tempModuleDir, "features/overlays/index"),
      transpileTypeScript(overlayIndexSource, "features/overlays/index.ts")
    )
  ]);

  const {
    assertEndpointOverlaySeed,
    assertInfrastructureOverlaySeed
  } = await import(pathToFileURL(join(tempModuleDir, "features/overlays/index")).href);

  const validEndpointSeed = {
    profileId: "aviation-endpoint-overlay-profile",
    endpoints: [
      {
        endpointId: "aircraft-stack",
        role: "endpoint-a",
        entityType: "aircraft_onboard_connectivity_stack",
        positionMode: "mobile-snapshot-required",
        mobilityKind: "mobile",
        renderClass: "custom-aircraft-bundle",
        notes:
          "Coordinates intentionally omitted until a mobile snapshot is resolved."
      },
      {
        endpointId: "aviation-service-anchor",
        role: "endpoint-b",
        entityType: "fixed_service_site",
        positionMode: "provider-managed-anchor",
        mobilityKind: "logical",
        renderClass: "custom-logical-anchor",
        notes:
          "Logical provider-managed anchor; coordinates remain intentionally unresolved."
      }
    ]
  };

  assert.doesNotThrow(() => assertEndpointOverlaySeed(validEndpointSeed));

  const validInfrastructureSeed = {
    profileId: "oneweb-gateway-pool-profile",
    nodes: [
      {
        nodeId: "southbury-gateway",
        provider: "Eutelsat OneWeb",
        nodeType: "gateway",
        networkRoles: ["gateway"],
        lat: 41.451778,
        lon: -73.289333,
        precision: "exact",
        sourceAuthority: "regulator"
      },
      {
        nodeId: "santa-paula-gateway",
        provider: "Eutelsat OneWeb",
        nodeType: "gateway",
        networkRoles: ["gateway"],
        lat: 34.402,
        lon: -119.073194,
        precision: "exact",
        sourceAuthority: "regulator"
      }
    ]
  };

  assert.doesNotThrow(() => assertInfrastructureOverlaySeed(validInfrastructureSeed));

  assert.throws(
    () =>
      assertEndpointOverlaySeed({
        ...validEndpointSeed,
        scenarioId: "must-not-exist"
      }),
    /unsupported keys: scenarioId/,
    "Endpoint overlay seeds must reject scenarioId."
  );

  assert.throws(
    () =>
      assertEndpointOverlaySeed({
        ...validEndpointSeed,
        endpoints: [
          {
            ...validEndpointSeed.endpoints[0],
            coordinates: {
              lat: 22.3,
              lon: 121.1,
              precision: "approximate"
            }
          }
        ]
      }),
    /must be one of exact, facility-known, site-level/,
    "Endpoint overlay coordinates must keep the accepted precision vocabulary."
  );

  assert.throws(
    () =>
      assertInfrastructureOverlaySeed({
        ...validInfrastructureSeed,
        nodes: [
          {
            ...validInfrastructureSeed.nodes[0],
            activeGatewayAssignment: true
          }
        ]
      }),
    /unsupported keys: activeGatewayAssignment/,
    "Infrastructure overlay seeds must stay a node pool without active assignment state."
  );

  console.log("Phase 6.1 overlay seed contract verification passed.");
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
