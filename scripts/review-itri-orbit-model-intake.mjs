import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRepoRoot = path.resolve(__dirname, "..");
const reviewerSourcePath = path.join(
  defaultRepoRoot,
  "src/features/orbit-model-intake/orbit-model-intake-reviewer.ts"
);

function readOption(args, key) {
  const prefix = `--${key}=`;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument.startsWith(prefix)) {
      return argument.slice(prefix.length);
    }

    if (argument === `--${key}`) {
      return args[index + 1];
    }
  }

  return undefined;
}

function usage() {
  return [
    "Usage: node scripts/review-itri-orbit-model-intake.mjs --package output/validation/external-f01-orbit-model/<timestamp>-orbit-model-intake",
    "",
    "Options:",
    "  --package <path>   Required package directory. Must resolve under output/validation/external-f01-orbit-model/.",
    "  --manifest <path>  Optional manifest path. Defaults to <package>/manifest.json and must resolve inside the package.",
    "  --repo-root <path> Optional repo root override for temp-only tests."
  ].join("\n");
}

function normalizeRelativePath(value) {
  return value.replace(/\\/g, "/").replace(/\/+$/g, "");
}

function repoRelativePath(repoRoot, absolutePath) {
  return normalizeRelativePath(path.relative(repoRoot, absolutePath));
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative.length === 0 || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isPrivateOwnerSystemRef(ref) {
  return /^(owner-system|private-owner-system|itri-owner-system):/i.test(ref);
}

function isExternalUrl(ref) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(ref);
}

async function loadReviewerModule() {
  const tempDir = await mkdtemp(path.join(tmpdir(), "sgv-f01r1-reviewer-"));

  try {
    const source = await readFile(reviewerSourcePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022
      },
      fileName: "orbit-model-intake-reviewer.ts"
    }).outputText;
    const modulePath = path.join(tempDir, "orbit-model-intake-reviewer.mjs");

    await writeFile(modulePath, compiled, "utf8");

    return {
      module: await import(pathToFileURL(modulePath).href),
      cleanup: async () => {
        await rm(tempDir, { recursive: true, force: true });
      }
    };
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function resolvePackageInput(repoRoot, packageInput) {
  const absolutePackagePath = path.resolve(repoRoot, packageInput);
  const retainedRoot = path.join(
    repoRoot,
    "output/validation/external-f01-orbit-model"
  );
  const relativePackagePath = repoRelativePath(repoRoot, absolutePackagePath);

  return {
    absolutePackagePath,
    relativePackagePath,
    retainedRoot,
    isAllowed: isInside(retainedRoot, absolutePackagePath) &&
      path.relative(retainedRoot, absolutePackagePath).length > 0
  };
}

function resolveManifestInput(repoRoot, absolutePackagePath, manifestInput) {
  const hasManifestInput = manifestInput !== undefined;
  const absoluteManifestPath = hasManifestInput
    ? path.resolve(repoRoot, manifestInput)
    : path.join(absolutePackagePath, "manifest.json");

  return {
    absoluteManifestPath,
    relativeManifestPath: repoRelativePath(repoRoot, absoluteManifestPath),
    isExplicit: hasManifestInput,
    isAllowed: !hasManifestInput || isInside(absolutePackagePath, absoluteManifestPath)
  };
}

async function exists(absolutePath) {
  try {
    await stat(absolutePath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function resolveRetainedRefs(packageDir, refs) {
  const resolvedRefs = [];
  const unresolvedRefs = [];
  const escapedRefs = [];
  const privateOwnerSystemRefs = [];

  for (const ref of refs) {
    if (isPrivateOwnerSystemRef(ref)) {
      privateOwnerSystemRefs.push(ref);
      continue;
    }

    if (isExternalUrl(ref) || path.isAbsolute(ref)) {
      escapedRefs.push(ref);
      continue;
    }

    const absoluteRef = path.resolve(packageDir, ref);

    if (!isInside(packageDir, absoluteRef)) {
      escapedRefs.push(ref);
      continue;
    }

    if (await exists(absoluteRef)) {
      resolvedRefs.push(ref);
    } else {
      unresolvedRefs.push(ref);
    }
  }

  return {
    declaredRefs: [...refs].sort(),
    resolvedRefs: resolvedRefs.sort(),
    unresolvedRefs: unresolvedRefs.sort(),
    escapedRefs: escapedRefs.sort(),
    privateOwnerSystemRefs: privateOwnerSystemRefs.sort()
  };
}

function printReview(review) {
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

function exitCodeForReview(review) {
  return review.packageState === "ready-for-design-review" ? 0 : 1;
}

export async function reviewItriOrbitModelIntakeFromPath({
  packageInput,
  manifestInput,
  repoRoot = defaultRepoRoot
}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const {
    absolutePackagePath,
    relativePackagePath,
    retainedRoot,
    isAllowed
  } = resolvePackageInput(resolvedRepoRoot, packageInput);
  const {
    absoluteManifestPath,
    relativeManifestPath,
    isExplicit: hasExplicitManifestPath,
    isAllowed: isManifestAllowed
  } = resolveManifestInput(resolvedRepoRoot, absolutePackagePath, manifestInput);
  const { module: reviewer, cleanup } = await loadReviewerModule();

  try {
    if (!isAllowed) {
      return reviewer.reviewRejectedItriOrbitModelIntakePackagePath({
        packagePath: relativePackagePath,
        manifestPath: relativeManifestPath
      });
    }

    if (hasExplicitManifestPath && !isManifestAllowed) {
      return reviewer.reviewRejectedItriOrbitModelIntakeManifestPath({
        packagePath: relativePackagePath,
        manifestPath: relativeManifestPath
      });
    }

    if (!(await exists(retainedRoot))) {
      return reviewer.reviewMissingItriOrbitModelIntakePackage({
        packagePath: relativePackagePath,
        manifestPath: relativeManifestPath
      });
    }

    if (!(await exists(absolutePackagePath))) {
      return reviewer.reviewMissingItriOrbitModelIntakePackage({
        packagePath: relativePackagePath,
        manifestPath: relativeManifestPath
      });
    }

    if (!(await exists(absoluteManifestPath))) {
      return reviewer.reviewMissingItriOrbitModelIntakeManifest({
        packagePath: relativePackagePath,
        manifestPath: relativeManifestPath
      });
    }

    let manifest;

    try {
      manifest = JSON.parse(await readFile(absoluteManifestPath, "utf8"));
    } catch (error) {
      return reviewer.reviewMalformedItriOrbitModelIntakeManifest({
        packagePath: relativePackagePath,
        manifestPath: relativeManifestPath,
        parseError: error instanceof Error ? error.message : String(error)
      });
    }

    const declaredRefs = reviewer.collectItriOrbitModelIntakeRetainedRefs(manifest);
    const retainedRefCheck = await resolveRetainedRefs(
      absolutePackagePath,
      declaredRefs
    );
    return reviewer.reviewItriOrbitModelIntakeManifest({
      manifest,
      packagePath: relativePackagePath,
      manifestPath: relativeManifestPath,
      retainedRefCheck
    });
  } finally {
    await cleanup();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const packageInput = readOption(args, "package");

  if (!packageInput) {
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const review = await reviewItriOrbitModelIntakeFromPath({
    packageInput,
    manifestInput: readOption(args, "manifest"),
    repoRoot: readOption(args, "repo-root") ?? defaultRepoRoot
  });

  printReview(review);
  process.exitCode = exitCodeForReview(review);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 2;
  });
}
