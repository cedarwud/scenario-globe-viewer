import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");

const v4RuntimeFiles = [
  "src/runtime/m8a-v4-ground-station-projection.ts",
  "src/runtime/m8a-v4-ground-station-handover-scene-controller.ts",
  "src/runtime/bootstrap/composition.ts"
];

const sideReadPatterns = [
  {
    // Exclude ./m8a-v4-* relative imports: those are intra-V4 sibling runtime
    // modules, not raw ITRI data file reads. The rule targets external data
    // access (../../itri/, /home/u24/papers/itri/, etc.).
    label: "static import from raw itri path",
    pattern: /from\s+["'](?!\.\/m8a-v4-)[^"']*itri[^"']*["']/g
  },
  {
    label: "dynamic import of raw itri path",
    pattern: /import\(\s*["'][^"']*itri[^"']*["']\s*\)/g
  },
  {
    label: "runtime fetch of raw itri path",
    pattern: /fetch\(\s*["'][^"']*itri[^"']*["']/g
  },
  {
    label: "filesystem read of raw itri path",
    pattern: /readFile(?:Sync)?\([^)]*itri/g
  },
  {
    label: "URL resolution of raw itri path",
    pattern: /new\s+URL\(\s*["'][^"']*itri[^"']*["']/g
  }
];

const rawPathPattern =
  /(?:\.\.\/)+itri\/|\/home\/u24\/papers\/itri\/|["'`]itri\/multi-orbit\/download\//g;

function walkFiles(root, files = []) {
  for (const entry of readdirSync(root)) {
    const absolutePath = path.join(root, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      walkFiles(absolutePath, files);
      continue;
    }

    if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function findMatches(filePath, patterns) {
  const text = readFileSync(filePath, "utf8");
  const relativePath = path.relative(repoRoot, filePath);
  const matches = [];

  for (const { label, pattern } of patterns) {
    pattern.lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
      const before = text.slice(0, match.index);
      const line = before.split("\n").length;
      matches.push({
        file: relativePath,
        line,
        label,
        match: match[0]
      });
    }
  }

  return matches;
}

const sideReadMatches = walkFiles(srcRoot).flatMap((filePath) =>
  findMatches(filePath, sideReadPatterns)
);
const v4RawPathMatches = v4RuntimeFiles.flatMap((relativePath) =>
  findMatches(path.join(repoRoot, relativePath), [
    {
      label: "raw itri path string in V4.3 runtime surface",
      pattern: rawPathPattern
    }
  ])
);
const allMatches = [...sideReadMatches, ...v4RawPathMatches];

if (allMatches.length > 0) {
  console.error("M8A-V4.3 raw itri side-read scan failed:");
  for (const match of allMatches) {
    console.error(
      `- ${match.file}:${match.line} ${match.label}: ${match.match}`
    );
  }
  process.exit(1);
}

console.log(
  "M8A-V4.3 raw itri side-read scan passed: no raw itri imports, fetches, filesystem reads, URL resolutions, or V4.3 raw path strings found."
);
