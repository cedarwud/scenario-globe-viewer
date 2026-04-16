import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const defaultGuardMode = "production";
const defaultGuardSources =
  "process env plus repo-local .env, .env.local, .env.production, and .env.production.local";

export function readAmbientSiteTilesetUrl({
  envDir = repoRoot,
  mode = defaultGuardMode
} = {}) {
  const configuredUrl = loadEnv(mode, envDir, "VITE_").VITE_CESIUM_SITE_TILESET_URL?.trim();
  return configuredUrl ? configuredUrl : undefined;
}

export function assertAmbientSiteTilesetUrlAllowed(
  context,
  {
    allowConfiguredSiteTileset = false,
    envDir = repoRoot,
    mode = defaultGuardMode
  } = {}
) {
  const configuredUrl = readAmbientSiteTilesetUrl({ envDir, mode });
  if (!configuredUrl || allowConfiguredSiteTileset) {
    return;
  }

  throw new Error(
    `${context} rejects VITE_CESIUM_SITE_TILESET_URL=${JSON.stringify(configuredUrl)} resolved through Vite ${mode} env loading (${defaultGuardSources}) because this path must keep the formal site hook dormant and isolated from baseline/showcase/capture semantics.`
  );
}

function resolveGuardOptionsFromArgs(args) {
  const contextArgument = args.find((argument) => argument.startsWith("--context="));
  const modeArgument = args.find((argument) => argument.startsWith("--mode="));

  return {
    context: contextArgument?.slice("--context=".length) ?? "site-hook-guard",
    mode: modeArgument?.slice("--mode=".length) ?? defaultGuardMode
  };
}

function main() {
  const { context, mode } = resolveGuardOptionsFromArgs(process.argv.slice(2));
  assertAmbientSiteTilesetUrlAllowed(context, { mode });
}

if (
  process.argv[1] &&
  __filename === process.argv[1]
) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
