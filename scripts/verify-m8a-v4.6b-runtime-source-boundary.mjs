import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const RUNTIME_SURFACES = [
  "src/runtime/m8a-v4-ground-station-projection.ts",
  "src/runtime/m8a-v4-ground-station-handover-scene-controller.ts"
];

const SOURCE_BOUNDARY_PATTERNS = [
  {
    label: "static import from raw itri path",
    pattern: /from\s+["'][^"']*itri\/multi-orbit\/download[^"']*["']/gi
  },
  {
    label: "dynamic import of raw itri path",
    pattern: /import\(\s*["'][^"']*itri\/multi-orbit\/download[^"']*["']\s*\)/gi
  },
  {
    label: "runtime fetch of raw itri path",
    pattern: /fetch\(\s*["'][^"']*itri\/multi-orbit\/download[^"']*["']/gi
  },
  {
    label: "filesystem read of raw itri path",
    pattern: /readFile(?:Sync)?\([^)]*itri\/multi-orbit\/download/gi
  },
  {
    label: "URL resolution of raw itri path",
    pattern: /new\s+URL\(\s*["'][^"']*itri\/multi-orbit\/download[^"']*["']/gi
  },
  {
    label: "runtime fetch of live CelesTrak source",
    pattern: /fetch\(\s*["'][^"']*celestrak\.org[^"']*["']/gi
  },
  {
    label: "dynamic import of live CelesTrak source",
    pattern: /import\(\s*["'][^"']*celestrak\.org[^"']*["']\s*\)/gi
  },
  {
    label: "URL resolution of live CelesTrak source",
    pattern: /new\s+URL\(\s*["'][^"']*celestrak\.org[^"']*["']/gi
  }
];

function lineNumberFor(source, index) {
  return source.slice(0, index).split("\n").length;
}

const matches = [];

for (const relativePath of RUNTIME_SURFACES) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = readFileSync(absolutePath, "utf8");

  for (const { label, pattern } of SOURCE_BOUNDARY_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      matches.push({
        file: relativePath,
        line: lineNumberFor(source, match.index ?? 0),
        label,
        match: match[0]
      });
    }
  }
}

if (matches.length > 0) {
  console.error("M8A-V4.6B runtime source-boundary scan failed:");
  for (const match of matches) {
    console.error(
      `- ${match.file}:${match.line} ${match.label}: ${match.match}`
    );
  }
  process.exit(1);
}

console.log(
  "M8A-V4.6B runtime source-boundary scan passed: no raw itri package side-read or live CelesTrak source-read code found in runtime surfaces."
);
