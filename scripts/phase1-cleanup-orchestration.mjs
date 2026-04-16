import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertAmbientSiteTilesetUrlAllowed } from "./site-hook-guard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const smokeScriptPath = path.join(
  repoRoot,
  "tests/smoke/bootstrap-loads-assets-and-workers.mjs"
);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const configuredSiteHookUrl =
  "https://example.invalid/scenario-globe-viewer-site-hook/tileset.json";
const ambientBuildingShowcaseEnvVar = "VITE_CESIUM_BUILDING_SHOWCASE";
const ambientSiteTilesetEnvVar = "VITE_CESIUM_SITE_TILESET_URL";
const sanitizedBaselineEnvVarNames = [
  ambientBuildingShowcaseEnvVar,
  ambientSiteTilesetEnvVar
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resolveFlow(args) {
  const requestedFlow = args.find((argument) => argument.startsWith("--flow="));
  const flow = requestedFlow?.slice("--flow=".length);

  assert(
    flow === "showcase" || flow === "site-hook-conflict",
    "Expected --flow=showcase or --flow=site-hook-conflict"
  );

  return flow;
}

function formatFailure(error) {
  return error instanceof Error ? error.message : String(error);
}

function runCommand(label, command, args, envOverrides = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...envOverrides
    },
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.signal) {
    throw new Error(`${label} terminated with signal ${result.signal}`);
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function runBuild(envOverrides = {}) {
  runCommand("npm run build", npmCommand, ["run", "build"], envOverrides);
}

function runSmokeSuite(suite) {
  runCommand("Phase 1 smoke", process.execPath, [smokeScriptPath, `--suite=${suite}`]);
}

function withSanitizedBaselineEnv(action) {
  const originalValues = sanitizedBaselineEnvVarNames.map((envVarName) => ({
    envVarName,
    hadValue: Object.prototype.hasOwnProperty.call(process.env, envVarName),
    originalValue: process.env[envVarName]
  }));

  for (const { envVarName } of originalValues) {
    delete process.env[envVarName];
  }

  try {
    return action();
  } finally {
    for (const { envVarName, hadValue, originalValue } of originalValues) {
      if (hadValue && typeof originalValue === "string") {
        process.env[envVarName] = originalValue;
      } else {
        delete process.env[envVarName];
      }
    }
  }
}

function assertGuardedBaselineDistReset(cleanupContext) {
  const distAssetsRoot = path.join(repoRoot, "dist/assets");
  assert(
    existsSync(distAssetsRoot),
    `${cleanupContext} expected dist/assets to exist after the guarded baseline rebuild.`
  );

  for (const entry of readdirSync(distAssetsRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }

    const assetPath = path.join(distAssetsRoot, entry.name);
    const assetSource = readFileSync(assetPath, "utf8");
    assert(
      !assetSource.includes(configuredSiteHookUrl),
      `${cleanupContext} left ${JSON.stringify(configuredSiteHookUrl)} in ${path.relative(
        repoRoot,
        assetPath
      )} after the guarded baseline rebuild.`
    );
  }
}

function restoreGuardedBaselineBuild(flow) {
  const cleanupContext =
    flow === "showcase"
      ? "phase1-showcase-reset"
      : "phase1-site-hook-conflict-reset";

  withSanitizedBaselineEnv(() => {
    assertAmbientSiteTilesetUrlAllowed(cleanupContext);
    runBuild();
    runSmokeSuite("cleanup-baseline");
  });
  assertGuardedBaselineDistReset(cleanupContext);
}

function runShowcaseFlow() {
  withSanitizedBaselineEnv(() => {
    runBuild();
    runSmokeSuite("showcase");
    runBuild({
      VITE_CESIUM_BUILDING_SHOWCASE: "osm"
    });
    runSmokeSuite("showcase-env");
  });
}

function runSiteHookConflictFlow() {
  withSanitizedBaselineEnv(() => {
    runBuild({
      VITE_CESIUM_SITE_TILESET_URL: configuredSiteHookUrl
    });
    runSmokeSuite("site-hook-conflict");
  });
}

function main() {
  const flow = resolveFlow(process.argv.slice(2));
  let shouldRestoreBaseline = false;
  let flowError;
  let cleanupError;

  try {
    if (flow === "showcase") {
      assertAmbientSiteTilesetUrlAllowed("phase1-showcase");
      shouldRestoreBaseline = true;
      runShowcaseFlow();
    } else {
      shouldRestoreBaseline = true;
      runSiteHookConflictFlow();
    }
  } catch (error) {
    flowError = error;
  } finally {
    if (shouldRestoreBaseline) {
      try {
        restoreGuardedBaselineBuild(flow);
      } catch (error) {
        cleanupError = error;
      }
    }
  }

  if (flowError && cleanupError) {
    throw new Error(
      `${flow} flow failed and the guarded baseline rebuild also failed.\nPrimary failure: ${formatFailure(flowError)}\nCleanup failure: ${formatFailure(cleanupError)}`
    );
  }

  if (flowError) {
    throw flowError;
  }

  if (cleanupError) {
    throw cleanupError;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
