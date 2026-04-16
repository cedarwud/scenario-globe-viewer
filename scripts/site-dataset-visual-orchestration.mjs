import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FORMAL_SITE_DATASET_FIXTURE_URL } from "./formal-site-dataset-fixture.mjs";
import { assertAmbientSiteTilesetUrlAllowed } from "./site-hook-guard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const captureScriptPath = path.join(
  repoRoot,
  "tests/visual/capture-site-dataset-integration.mjs"
);
const smokeScriptPath = path.join(
  repoRoot,
  "tests/smoke/bootstrap-loads-assets-and-workers.mjs"
);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const guardedConfiguredSiteHookUrls = [
  "https://example.invalid/scenario-globe-viewer-site-hook/tileset.json",
  FORMAL_SITE_DATASET_FIXTURE_URL
];
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

function runCleanupBaselineSmoke() {
  runCommand("Phase 1 smoke", process.execPath, [smokeScriptPath, "--suite=cleanup-baseline"]);
}

function runDatasetCapture() {
  runCommand("Site dataset visual capture", process.execPath, [captureScriptPath]);
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
    for (const guardedSiteHookUrl of guardedConfiguredSiteHookUrls) {
      assert(
        !assetSource.includes(guardedSiteHookUrl),
        `${cleanupContext} left ${JSON.stringify(guardedSiteHookUrl)} in ${path.relative(
          repoRoot,
          assetPath
        )} after the guarded baseline rebuild.`
      );
    }
  }
}

function restoreGuardedBaselineBuild() {
  const cleanupContext = "site-dataset-capture-reset";

  withSanitizedBaselineEnv(() => {
    assertAmbientSiteTilesetUrlAllowed(cleanupContext);
    runBuild();
    runCleanupBaselineSmoke();
  });
  assertGuardedBaselineDistReset(cleanupContext);
}

function main() {
  let captureError;
  let cleanupError;

  try {
    withSanitizedBaselineEnv(() => {
      runBuild({
        VITE_CESIUM_SITE_TILESET_URL: FORMAL_SITE_DATASET_FIXTURE_URL
      });
      runDatasetCapture();
    });
  } catch (error) {
    captureError = error;
  } finally {
    try {
      restoreGuardedBaselineBuild();
    } catch (error) {
      cleanupError = error;
    }
  }

  if (captureError && cleanupError) {
    throw new Error(
      `site-dataset capture failed and the guarded baseline rebuild also failed.\nPrimary failure: ${formatFailure(captureError)}\nCleanup failure: ${formatFailure(cleanupError)}`
    );
  }

  if (captureError) {
    throw captureError;
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
