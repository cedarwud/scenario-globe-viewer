import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-slice6");
const transcriptRoot = path.join(outputRoot, "reviewer-transcripts");
const requiredFiles = [
  "reviewer-comprehension-matrix.md",
  "manual-reviewer-checklist.md",
  "before-after-comparison.md"
];
const finalHandoff = path.join(
  repoRoot,
  "docs/sdd/m8a-v4.11-slice6-validation-matrix-final-handoff.md"
);
const requiredTranscriptWindows = [
  "W1 leo-acquisition-context",
  "W2 leo-aging-pressure",
  "W3 meo-continuity-hold",
  "W4 leo-reentry-candidate",
  "W5 geo-continuity-guard"
];

function relative(filePath) {
  return path.relative(repoRoot, filePath);
}

function readText(filePath, failures) {
  if (!existsSync(filePath)) {
    failures.push(`Missing required artifact: ${relative(filePath)}`);
    return "";
  }

  const stat = statSync(filePath);
  if (!stat.isFile() || stat.size === 0) {
    failures.push(`Artifact is empty or not a file: ${relative(filePath)}`);
    return "";
  }

  return readFileSync(filePath, "utf8");
}

function expectIncludes(text, needle, filePath, failures) {
  if (!text.includes(needle)) {
    failures.push(`${relative(filePath)} must include: ${needle}`);
  }
}

const failures = [];

for (const fileName of requiredFiles) {
  const filePath = path.join(outputRoot, fileName);
  readText(filePath, failures);
}

const matrixPath = path.join(outputRoot, "reviewer-comprehension-matrix.md");
const checklistPath = path.join(outputRoot, "manual-reviewer-checklist.md");
const beforeAfterPath = path.join(outputRoot, "before-after-comparison.md");
const matrixText = readText(matrixPath, failures);
const checklistText = readText(checklistPath, failures);
const beforeAfterText = readText(beforeAfterPath, failures);
const finalHandoffText = readText(finalHandoff, failures);

expectIncludes(matrixText, "| Reviewer | Window | Q1 | Q2 | Q3 | Q4 | Q5 | Total |", matrixPath, failures);
expectIncludes(matrixText, "Lock-in I batch reviewer reconciliation", matrixPath, failures);
expectIncludes(checklistText, "[Simulation view]", checklistPath, failures);
expectIncludes(checklistText, "TLE: CelesTrak NORAD GP", checklistPath, failures);
expectIncludes(checklistText, "Source provenance", checklistPath, failures);
expectIncludes(checklistText, "accepted design evolution", checklistPath, failures);
expectIncludes(beforeAfterText, "V4.10 baseline", beforeAfterPath, failures);
expectIncludes(beforeAfterText, "Conv 1", beforeAfterPath, failures);
expectIncludes(beforeAfterText, "Conv 4", beforeAfterPath, failures);
expectIncludes(beforeAfterText, "reviewer first-read", beforeAfterPath, failures);

if (
  !finalHandoffText.includes("V4.11 reviewer-comprehension passed") &&
  !finalHandoffText.includes("V4.11 reviewer-comprehension failed")
) {
  failures.push(
    `${relative(finalHandoff)} must mark V4.11 reviewer-comprehension passed or failed`
  );
}
expectIncludes(
  finalHandoffText,
  "not admissible on WSL/SwiftShader; requires real hardware GPU follow-up",
  finalHandoff,
  failures
);

const transcriptFiles = existsSync(transcriptRoot)
  ? readdirSync(transcriptRoot)
      .filter((fileName) => /^v4\.11-[A-Za-z0-9_-]+\.md$/.test(fileName))
      .sort()
  : [];

if (transcriptFiles.length < 3) {
  failures.push(
    `Expected >=3 Slice 6 reviewer transcripts named output/m8a-v4.11-slice6/reviewer-transcripts/v4.11-{id}.md; found ${transcriptFiles.length}`
  );
}

for (const fileName of transcriptFiles) {
  const filePath = path.join(transcriptRoot, fileName);
  const text = readText(filePath, failures);

  expectIncludes(text, "Reviewer eligibility: protocol-valid", filePath, failures);
  expectIncludes(text, "Viewport: 1440x900", filePath, failures);
  expectIncludes(text, "Replay: 60x", filePath, failures);
  expectIncludes(text, "Details opened: no", filePath, failures);

  for (const windowLabel of requiredTranscriptWindows) {
    expectIncludes(text, windowLabel, filePath, failures);
  }
}

if (failures.length > 0) {
  console.error("M8A-V4.11 Slice 6 validation-matrix smoke failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `M8A-V4.11 Slice 6 validation-matrix artifacts verified (${transcriptFiles.length} reviewer transcripts).`
);
