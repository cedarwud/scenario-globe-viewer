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
  "src/features/external-source-package-intake/external-source-package-intake-reviewer.ts"
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
    "Usage: node scripts/review-itri-external-source-package-intake.mjs --package <path> [--manifest <path>] [--repo-root <path>]",
    "",
    "Options:",
    "  --package       Required candidate package directory. Must resolve under output/validation/external-f03-f15.",
    "  --manifest      Optional manifest path. Defaults to <package>/manifest.json.",
    "  --repo-root     Optional repository root for integration tests."
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
  return (
    relative.length > 0 &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative) &&
    !relative.startsWith("../")
  );
}

async function loadReviewerModule() {
  const tempDir = await mkdtemp(path.join(tmpdir(), "sgv-s12d-reviewer-"));

  try {
    const source = await readFile(reviewerSourcePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022
      },
      fileName: "external-source-package-intake-reviewer.ts"
    }).outputText;
    const modulePath = path.join(tempDir, "external-source-package-intake-reviewer.mjs");

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
  const retainedRoot = path.join(repoRoot, "output/validation/external-f03-f15");

  return {
    absolutePackagePath,
    relativePackagePath: repoRelativePath(repoRoot, absolutePackagePath),
    retainedRoot,
    isAllowed: isInside(retainedRoot, absolutePackagePath)
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

async function summarizeArtifactPaths(absolutePackagePath, declaredPaths) {
  const normalized = [...new Set(declaredPaths)].sort();
  const resolvedPaths = [];
  const unresolvedPaths = [];
  const escapedPaths = [];

  for (const declaredPath of normalized) {
    if (typeof declaredPath !== "string" || declaredPath.length === 0) {
      escapedPaths.push(`${declaredPath ?? ""}`);
      continue;
    }

    if (declaredPath.includes("../") || declaredPath.startsWith("../") || path.isAbsolute(declaredPath)) {
      escapedPaths.push(declaredPath);
      continue;
    }

    const absoluteArtifactPath = path.resolve(absolutePackagePath, declaredPath);
    if (!isInside(absolutePackagePath, absoluteArtifactPath)) {
      escapedPaths.push(declaredPath);
      continue;
    }

    if (await exists(absoluteArtifactPath)) {
      resolvedPaths.push(declaredPath);
    } else {
      unresolvedPaths.push(declaredPath);
    }
  }

  return {
    declaredPaths: normalized,
    resolvedPaths,
    unresolvedPaths,
    escapedPaths
  };
}

function collectSourceArtifactRefIds(manifest) {
  if (!manifest || typeof manifest !== "object") {
    return [];
  }

  const set = new Set();

  const collect = (value) => {
    if (!Array.isArray(value)) {
      return;
    }

    for (const entry of value) {
      if (
        entry &&
        typeof entry === "object" &&
        typeof entry.artifactId === "string" &&
        entry.artifactId.trim().length > 0
      ) {
        set.add(entry.artifactId);
      }
    }
  };

  const ownerIdentity = manifest.ownerIdentity;
  const sourceAuthority = manifest.sourceAuthority;
  const catalog = manifest.catalog;
  const modeRules = manifest.modeRules;
  const temporalRules = manifest.temporalRules;
  const scenarioMapping = manifest.scenarioMapping;

  collect(ownerIdentity && ownerIdentity.ownerEvidenceRefs);
  collect(sourceAuthority && sourceAuthority.ownerApprovalRefs);
  collect(catalog && catalog.sourceArtifactRefs);
  collect(catalog && catalog.derivation && catalog.derivation.inputArtifactRefs);

  collect(modeRules && modeRules.realTime && modeRules.realTime.sourceArtifactRefs);
  collect(modeRules && modeRules.prerecorded && modeRules.prerecorded.sourceArtifactRefs);
  collect(modeRules && modeRules.modeSelectionArtifactRefs);

  collect(temporalRules && temporalRules.staleDataPolicy && temporalRules.staleDataPolicy.policyArtifactRefs);
  collect(temporalRules && temporalRules.temporalArtifactRefs);

  collect(manifest.licenseRedistributionPolicy && manifest.licenseRedistributionPolicy.policyArtifactRefs);
  collect(manifest.checksumPolicy && manifest.checksumPolicy.checksumManifestRefs);

  collect(scenarioMapping && scenarioMapping.sourceArtifactRefs);
  if (Array.isArray(scenarioMapping && scenarioMapping.recordToScenarioRules)) {
    for (const rule of scenarioMapping.recordToScenarioRules) {
      collect(rule && rule.sourceArtifactRefs);
    }
  }

  if (Array.isArray(scenarioMapping && scenarioMapping.modeMappingRules)) {
    for (const rule of scenarioMapping.modeMappingRules) {
      collect(rule && rule.sourceArtifactRefs);
    }
  }

  collect(manifest.orbitClassCoverage && manifest.orbitClassCoverage.flatMap?.((entry) => entry.sourceArtifactRefs || []));
  const satelliteCountDeclarations = manifest.satelliteCountDeclarations;
  collect(satelliteCountDeclarations && satelliteCountDeclarations.sourceArtifactRefs);

  if (Array.isArray(satelliteCountDeclarations && satelliteCountDeclarations.byOrbitClass)) {
    for (const entry of satelliteCountDeclarations.byOrbitClass) {
      collect(entry && entry.sourceArtifactRefs);
    }
  }

  if (Array.isArray(manifest.parsedReviewedFields)) {
    for (const field of manifest.parsedReviewedFields) {
      collect(field && field.sourceArtifactRefs);
    }
  }

  const reviewGate = manifest.reviewGate;
  collect(reviewGate && reviewGate.sourceArtifactRefs);
  collect(reviewGate && reviewGate.reviewNotes && reviewGate.reviewNotes.flatMap?.((entry) => entry.sourceArtifactRefs || []));

  return [...set];
}

function collectDeclaredArtifactIds(manifest) {
  if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.packageArtifacts)) {
    return [];
  }

  return manifest.packageArtifacts
    .map((artifact) =>
      artifact && typeof artifact === "object" && typeof artifact.artifactId === "string" ? artifact.artifactId : ""
    )
    .filter((id) => id.length > 0);
}

function collectSummary(manifest) {
  const declaredArtifactIds = collectDeclaredArtifactIds(manifest);
  const declaredRefs = new Set(collectSourceArtifactRefIds(manifest));
  const unknownRefIds = [...declaredRefs].filter((id) => !declaredArtifactIds.includes(id));

  return {
    declaredRefIds: [...declaredRefs].sort(),
    resolvedRefIds: [...declaredRefs].filter((id) => !unknownRefIds.includes(id)).sort(),
    unknownRefIds: unknownRefIds.sort()
  };
}

export async function reviewItriExternalSourcePackageIntakeFromPath({
  packageInput,
  manifestInput,
  repoRoot = defaultRepoRoot
}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const {
    absolutePackagePath,
    relativePackagePath,
    retainedRoot,
    isAllowed: isPackagePathAllowed
  } = resolvePackageInput(resolvedRepoRoot, packageInput);

  const {
    absoluteManifestPath,
    relativeManifestPath,
    isExplicit: hasExplicitManifest,
    isAllowed: isManifestPathAllowed
  } = resolveManifestInput(resolvedRepoRoot, absolutePackagePath, manifestInput);

  const { module: reviewer, cleanup } = await loadReviewerModule();

  try {
    if (!packageInput) {
      return reviewer.reviewMissingItriExternalSourcePackageIntakePackagePath({
        packagePath: "",
        manifestPath: ""
      });
    }

    if (!isPackagePathAllowed || (absolutePackagePath === retainedRoot)) {
      return reviewer.reviewRejectedItriExternalSourcePackageIntakePackagePath({
        packagePath: relativePackagePath,
        manifestPath: relativeManifestPath
      });
    }

    if (hasExplicitManifest && !isManifestPathAllowed) {
      return reviewer.reviewRejectedItriExternalSourcePackageIntakeManifestPath({
        packagePath: relativePackagePath,
        manifestPath: relativeManifestPath
      });
    }

    if (!(await exists(retainedRoot)) || !(await exists(absolutePackagePath))) {
      return reviewer.reviewMissingItriExternalSourcePackageIntakePackage({
        packagePath: relativePackagePath,
        manifestPath: relativeManifestPath
      });
    }

    if (!(await exists(absoluteManifestPath))) {
      return reviewer.reviewMissingItriExternalSourcePackageIntakeManifest({
        packagePath: relativePackagePath,
        manifestPath: relativeManifestPath
      });
    }

    let manifest;
    try {
      manifest = JSON.parse(await readFile(absoluteManifestPath, "utf8"));
    } catch (error) {
      return reviewer.reviewMalformedItriExternalSourcePackageIntakeManifest({
        packagePath: relativePackagePath,
        manifestPath: relativeManifestPath,
        parseError: error instanceof Error ? error.message : String(error)
      });
    }

    const declaredPaths = reviewer.collectItriExternalSourcePackageIntakeArtifactPaths(manifest);
    const artifactPathSummary = await summarizeArtifactPaths(absolutePackagePath, declaredPaths);
    const sourceArtifactRefCheck = collectSummary(manifest);

    return reviewer.reviewItriExternalSourcePackageIntakeManifest({
      manifest,
      packagePath: relativePackagePath,
      manifestPath: relativeManifestPath,
      artifactPathCheck: artifactPathSummary,
      sourceArtifactRefCheck
    });
  } finally {
    await cleanup();
  }
}

function printReview(review) {
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

function exitCodeForReview(review) {
  return review.packageState === "ready-for-intake" ? 0 : 1;
}

export async function main() {
  const args = process.argv.slice(2);
  const packageInput = readOption(args, "package");
  const manifestInput = readOption(args, "manifest");
  const repoRoot = readOption(args, "repo-root") ?? defaultRepoRoot;

  if (!packageInput) {
    printReview(
      {
        packagePath: "",
        manifestPath: ""
      }
    );
    process.stdout.write(`${usage()}\n`);
    return 2;
  }

  const review = await reviewItriExternalSourcePackageIntakeFromPath({
    packageInput,
    manifestInput,
    repoRoot
  });

  printReview(review);
  return exitCodeForReview(review);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const code = await main();
  process.exit(code);
}
