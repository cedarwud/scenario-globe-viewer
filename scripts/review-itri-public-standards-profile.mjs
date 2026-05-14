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
  "src/features/public-standards-profile/public-standards-profile-reviewer.ts"
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
    "Usage: node scripts/review-itri-public-standards-profile.mjs --package output/validation/public-standards-profiles/<profile-id>",
    "",
    "Options:",
    "  --package <path>   Required package directory. Must resolve under output/validation/public-standards-profiles/.",
    "  --profile <path>   Optional profile path. Defaults to <package>/profile.json and must resolve inside the package.",
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

function isExternalUrl(ref) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(ref);
}

async function loadReviewerModule() {
  const tempDir = await mkdtemp(path.join(tmpdir(), "sgv-s4r1-reviewer-"));

  try {
    const source = await readFile(reviewerSourcePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022
      },
      fileName: "public-standards-profile-reviewer.ts"
    }).outputText;
    const modulePath = path.join(tempDir, "public-standards-profile-reviewer.mjs");

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
    "output/validation/public-standards-profiles"
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

function resolveProfileInput(repoRoot, absolutePackagePath, profileInput) {
  const hasProfileInput = profileInput !== undefined;
  const absoluteProfilePath = hasProfileInput
    ? path.resolve(repoRoot, profileInput)
    : path.join(absolutePackagePath, "profile.json");

  return {
    absoluteProfilePath,
    relativeProfilePath: repoRelativePath(repoRoot, absoluteProfilePath),
    isExplicit: hasProfileInput,
    isAllowed: !hasProfileInput || isInside(absolutePackagePath, absoluteProfilePath)
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

async function resolveRetainedPathRefs(packageDir, refs) {
  const resolvedRefs = [];
  const unresolvedRefs = [];
  const escapedRefs = [];

  for (const ref of refs) {
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
    escapedRefs: escapedRefs.sort()
  };
}

function printReview(review) {
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

function exitCodeForReview(review) {
  return review.packageState === "bounded-public-profile-ready" ? 0 : 1;
}

export async function reviewItriPublicStandardsProfileFromPath({
  packageInput,
  profileInput,
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
    absoluteProfilePath,
    relativeProfilePath,
    isExplicit: hasExplicitProfilePath,
    isAllowed: isProfileAllowed
  } = resolveProfileInput(resolvedRepoRoot, absolutePackagePath, profileInput);
  const { module: reviewer, cleanup } = await loadReviewerModule();

  try {
    if (!isAllowed) {
      return reviewer.reviewRejectedItriPublicStandardsProfilePackagePath({
        packagePath: relativePackagePath,
        profilePath: relativeProfilePath
      });
    }

    if (hasExplicitProfilePath && !isProfileAllowed) {
      return reviewer.reviewRejectedItriPublicStandardsProfilePath({
        packagePath: relativePackagePath,
        profilePath: relativeProfilePath
      });
    }

    if (!(await exists(retainedRoot))) {
      return reviewer.reviewMissingItriPublicStandardsProfilePackage({
        packagePath: relativePackagePath,
        profilePath: relativeProfilePath
      });
    }

    if (!(await exists(absolutePackagePath))) {
      return reviewer.reviewMissingItriPublicStandardsProfilePackage({
        packagePath: relativePackagePath,
        profilePath: relativeProfilePath
      });
    }

    if (!(await exists(absoluteProfilePath))) {
      return reviewer.reviewMissingItriPublicStandardsProfile({
        packagePath: relativePackagePath,
        profilePath: relativeProfilePath
      });
    }

    let profile;

    try {
      profile = JSON.parse(await readFile(absoluteProfilePath, "utf8"));
    } catch (error) {
      return reviewer.reviewMalformedItriPublicStandardsProfile({
        packagePath: relativePackagePath,
        profilePath: relativeProfilePath,
        parseError: error instanceof Error ? error.message : String(error)
      });
    }

    const declaredRefs = reviewer.collectItriPublicStandardsProfileRetainedPaths(profile);
    const retainedPathCheck = await resolveRetainedPathRefs(
      absolutePackagePath,
      declaredRefs
    );
    return reviewer.reviewItriPublicStandardsProfile({
      profile,
      packagePath: relativePackagePath,
      profilePath: relativeProfilePath,
      retainedPathCheck
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

  const review = await reviewItriPublicStandardsProfileFromPath({
    packageInput,
    profileInput: readOption(args, "profile"),
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
