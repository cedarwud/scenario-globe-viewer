import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertAmbientSiteTilesetUrlAllowed } from "./site-hook-guard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const soakHarnessPath = path.join(repoRoot, "tests/soak/run-soak.mjs");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const sanitizedBaselineEnvVarNames = [
  "VITE_CESIUM_BUILDING_SHOWCASE",
  "VITE_CESIUM_SITE_TILESET_URL"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readOption(args, key) {
  const prefixedKey = `--${key}=`;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument.startsWith(prefixedKey)) {
      return argument.slice(prefixedKey.length);
    }

    if (argument === `--${key}`) {
      return args[index + 1];
    }
  }

  return undefined;
}

function resolveProfile(args) {
  const profile = readOption(args, "profile");

  assert(
    profile === "rehearsal" || profile === "full",
    "Expected --profile=rehearsal or --profile=full."
  );

  return profile;
}

function runCommand(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: process.env,
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

function main() {
  const args = process.argv.slice(2);
  const profile = resolveProfile(args);

  withSanitizedBaselineEnv(() => {
    assertAmbientSiteTilesetUrlAllowed(`phase7.0-${profile}`);
    runCommand("npm run build", npmCommand, ["run", "build"]);
    runCommand("Phase 7.0 soak harness", process.execPath, [soakHarnessPath, ...args]);
  });
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
