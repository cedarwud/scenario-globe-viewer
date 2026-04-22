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
const firstIntakeOverlaySeedsPath = new URL(
  "../src/features/overlays/first-intake-overlay-seeds.ts",
  import.meta.url
);
const overlaySeedResolutionPath = new URL(
  "../src/features/overlays/overlay-seed-resolution.ts",
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

const tempModuleDir = await mkdtemp(
  join(tmpdir(), "sgv-overlay-seed-resolution-")
);

try {
  await mkdir(join(tempModuleDir, "features/overlays"), { recursive: true });

  const [
    overlaySeedsSource,
    firstIntakeOverlaySeedsSource,
    overlaySeedResolutionSource,
    overlayIndexSource
  ] = await Promise.all([
    readFile(overlaySeedsPath, "utf8"),
    readFile(firstIntakeOverlaySeedsPath, "utf8"),
    readFile(overlaySeedResolutionPath, "utf8"),
    readFile(overlayIndexPath, "utf8")
  ]);

  const requiredFirstIntakeSeedSnippets = [
    'profileId: "aviation-endpoint-overlay-profile"',
    'profileId: "oneweb-gateway-pool-profile"',
    'positionMode: "mobile-snapshot-required"',
    'positionMode: "provider-managed-anchor"',
    'nodeId: "talkeetna-gateway"',
    'nodeId: "yona-gateway"'
  ];

  for (const snippet of requiredFirstIntakeSeedSnippets) {
    assert(
      firstIntakeOverlaySeedsSource.includes(snippet),
      `Missing required first-intake overlay seed snippet: ${snippet}`
    );
  }

  const requiredResolutionSourceSnippets = [
    "export function resolveFirstIntakeOverlaySeeds(",
    'Pick<\n  ScenarioContextRef,\n  "endpointProfileId" | "infrastructureProfileId"\n>',
    "resolvedEndpointSeed: EndpointOverlaySeed;",
    "resolvedInfrastructureSeed: InfrastructureOverlaySeed;",
    "resolveEndpointSeedByProfileId",
    "resolveInfrastructureSeedByProfileId",
    "requireProfileId"
  ];

  for (const snippet of requiredResolutionSourceSnippets) {
    assert(
      overlaySeedResolutionSource.includes(snippet),
      `Missing required overlay seed resolution snippet: ${snippet}`
    );
  }

  const requiredIndexSnippets = [
    "FIRST_INTAKE_ENDPOINT_OVERLAY_SEEDS",
    "FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_SEEDS",
    "FirstIntakeOverlaySeedResolution",
    "FirstIntakeOverlaySeedResolutionInput",
    "resolveFirstIntakeOverlaySeeds"
  ];

  for (const snippet of requiredIndexSnippets) {
    assert(
      overlayIndexSource.includes(snippet),
      `Overlay module boundary must re-export ${snippet}.`
    );
  }

  const forbiddenResolutionPatterns = [
    {
      pattern: /from\s+["']cesium["']/,
      message: "Overlay seed resolution must not import from cesium."
    },
    {
      pattern: /\bViewer\b|\bEntity\b|\bJulianDate\b/,
      message: "Overlay seed resolution must stay off Cesium runtime classes."
    },
    {
      pattern: /\bOverlayManager\b/,
      message: "Overlay seed resolution must not widen overlay-manager ownership."
    },
    {
      pattern: /\bHandoverDecision\b/,
      message: "Overlay seed resolution must not widen handover ownership."
    }
  ];

  for (const { pattern, message } of forbiddenResolutionPatterns) {
    assert(!pattern.test(overlaySeedResolutionSource), message);
  }

  await Promise.all([
    writeFile(
      join(tempModuleDir, "features/overlays/overlay-seeds"),
      transpileTypeScript(overlaySeedsSource, "features/overlays/overlay-seeds.ts")
    ),
    writeFile(
      join(tempModuleDir, "features/overlays/first-intake-overlay-seeds"),
      transpileTypeScript(
        firstIntakeOverlaySeedsSource,
        "features/overlays/first-intake-overlay-seeds.ts"
      )
    ),
    writeFile(
      join(tempModuleDir, "features/overlays/overlay-seed-resolution"),
      transpileTypeScript(
        overlaySeedResolutionSource,
        "features/overlays/overlay-seed-resolution.ts"
      )
    ),
    writeFile(
      join(tempModuleDir, "features/overlays/index"),
      transpileTypeScript(overlayIndexSource, "features/overlays/index.ts")
    )
  ]);

  const {
    assertEndpointOverlaySeed,
    assertInfrastructureOverlaySeed,
    FIRST_INTAKE_ENDPOINT_OVERLAY_SEEDS,
    FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_SEEDS,
    resolveFirstIntakeOverlaySeeds
  } = await import(pathToFileURL(join(tempModuleDir, "features/overlays/index")).href);

  assert.equal(
    FIRST_INTAKE_ENDPOINT_OVERLAY_SEEDS.length,
    1,
    "First-intake asset home must contain exactly one endpoint seed bundle."
  );
  assert.equal(
    FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_SEEDS.length,
    1,
    "First-intake asset home must contain exactly one infrastructure seed bundle."
  );

  const [endpointSeed] = FIRST_INTAKE_ENDPOINT_OVERLAY_SEEDS;
  const [infrastructureSeed] = FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_SEEDS;

  assert.doesNotThrow(() => assertEndpointOverlaySeed(endpointSeed));
  assert.doesNotThrow(() => assertInfrastructureOverlaySeed(infrastructureSeed));
  assert.equal(
    endpointSeed.endpoints[0].coordinates,
    undefined,
    "Mobile endpoint must be allowed to remain coordinate-free."
  );
  assert.equal(
    endpointSeed.endpoints[1].coordinates,
    undefined,
    "Provider-managed anchor must be allowed to remain coordinate-free."
  );
  assert.equal(
    infrastructureSeed.nodes.some((node) => node.provider !== "Eutelsat OneWeb"),
    false,
    "Infrastructure seed must stay inside the OneWeb gateway pool."
  );

  const resolvedSeeds = resolveFirstIntakeOverlaySeeds({
    endpointProfileId: "aviation-endpoint-overlay-profile",
    infrastructureProfileId: "oneweb-gateway-pool-profile"
  });

  assert.deepEqual(resolvedSeeds, {
    resolvedEndpointSeed: endpointSeed,
    resolvedInfrastructureSeed: infrastructureSeed
  });

  assert.throws(
    () =>
      resolveFirstIntakeOverlaySeeds({
        endpointProfileId: "   ",
        infrastructureProfileId: "oneweb-gateway-pool-profile"
      }),
    /Missing endpointProfileId/,
    "Blank endpointProfileId must be treated as missing."
  );

  assert.throws(
    () =>
      resolveFirstIntakeOverlaySeeds({
        endpointProfileId: "aviation-endpoint-overlay-profile",
        infrastructureProfileId: ""
      }),
    /Missing infrastructureProfileId/,
    "Blank infrastructureProfileId must be treated as missing."
  );

  assert.throws(
    () =>
      resolveFirstIntakeOverlaySeeds({
        endpointProfileId: " aviation-endpoint-overlay-profile",
        infrastructureProfileId: "oneweb-gateway-pool-profile"
      }),
    /Unsupported endpointProfileId/,
    "Endpoint resolution must use exact match only."
  );

  assert.throws(
    () =>
      resolveFirstIntakeOverlaySeeds({
        endpointProfileId: "aviation-endpoint-overlay-profile",
        infrastructureProfileId: "aviation-endpoint-overlay-profile"
      }),
    /Unsupported infrastructureProfileId/,
    "Infrastructure resolution must stay inside the infrastructure family."
  );

  FIRST_INTAKE_ENDPOINT_OVERLAY_SEEDS.push({
    ...endpointSeed
  });

  try {
    assert.throws(
      () =>
        resolveFirstIntakeOverlaySeeds({
          endpointProfileId: "aviation-endpoint-overlay-profile",
          infrastructureProfileId: "oneweb-gateway-pool-profile"
        }),
      /Duplicate endpointProfileId/,
      "Duplicate endpoint profile IDs must be rejected."
    );
  } finally {
    FIRST_INTAKE_ENDPOINT_OVERLAY_SEEDS.pop();
  }

  FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_SEEDS.push({
    ...infrastructureSeed
  });

  try {
    assert.throws(
      () =>
        resolveFirstIntakeOverlaySeeds({
          endpointProfileId: "aviation-endpoint-overlay-profile",
          infrastructureProfileId: "oneweb-gateway-pool-profile"
        }),
      /Duplicate infrastructureProfileId/,
      "Duplicate infrastructure profile IDs must be rejected."
    );
  } finally {
    FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_SEEDS.pop();
  }

  console.log("Phase 6.1 overlay seed resolution verification passed.");
} finally {
  await rm(tempModuleDir, { recursive: true, force: true });
}
