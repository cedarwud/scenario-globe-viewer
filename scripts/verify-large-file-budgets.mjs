#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(moduleDir, "..");

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const splitAt = arg.indexOf("=");
    if (splitAt < 0) {
      return [arg.replace(/^--/, ""), ""];
    }
    return [arg.slice(0, splitAt).replace(/^--/, ""), arg.slice(splitAt + 1)];
  })
);

const profile = args.profile ?? "interim";
if (!["interim", "final"].includes(profile)) {
  throw new Error(`Unknown --profile value: ${profile}`);
}

const COMMON_RUNTIME_HELPERS = [
  "src/runtime/m8a-v4-ground-station-selected-pair-layer.ts",
  "src/runtime/m8a-v4-ground-station-overlay-debug.ts",
  "src/runtime/m8a-v4-ground-station-cesium-entities.ts",
  "src/runtime/m8a-v4-ground-station-placement.ts",
  "src/runtime/m8a-v4-ground-station-product-dom.ts",
  "src/runtime/m8a-v4-ground-station-state-builders.ts",
  "src/runtime/m8a-v4-ground-station-event-handlers.ts",
  "src/runtime/m8a-v4-ground-station-replay-lifecycle.ts",
  "src/runtime/m8a-v4-ground-station-export-policy.ts"
];

const budgets = profile === "final"
  ? [
      {
        id: "ground-station-controller",
        path: "src/runtime/m8a-v4-ground-station-handover-scene-controller.ts",
        maxLines: 2500,
        hardCapLines: 3000
      },
      ...COMMON_RUNTIME_HELPERS.map((path) => ({
        id: "runtime-helper",
        path,
        maxLines: 1200,
        optional: true
      })),
      {
        id: "product-comprehension-smoke",
        path: "tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs",
        maxLines: 1200
      },
      {
        id: "stylesheet-watch",
        path: "src/styles.css",
        maxLines: 1000,
        reportOnly: true
      }
    ]
  : [
      {
        id: "ground-station-controller",
        path: "src/runtime/m8a-v4-ground-station-handover-scene-controller.ts",
        maxLines: 5000,
        targetLines: 4200
      },
      ...COMMON_RUNTIME_HELPERS.map((path) => ({
        id: "runtime-helper",
        path,
        maxLines: 1500,
        targetLines: 1200,
        optional: true
      })),
      {
        id: "product-comprehension-smoke",
        path: "tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs",
        maxLines: 3000,
        targetLines: 1200
      },
      {
        id: "stylesheet-watch",
        path: "src/styles.css",
        maxLines: 4000,
        targetLines: 1200,
        reportOnly: true
      }
    ];

function countLines(path) {
  const content = readFileSync(join(repoRoot, path), "utf8");
  if (content.length === 0) {
    return 0;
  }
  return content.endsWith("\n")
    ? content.split("\n").length - 1
    : content.split("\n").length;
}

const results = budgets.flatMap((budget) => {
  const absolutePath = join(repoRoot, budget.path);
  if (!existsSync(absolutePath)) {
    return budget.optional
      ? [{
          ...budget,
          status: "skipped",
          lineCount: null,
          message: "optional file does not exist yet"
        }]
      : [{
          ...budget,
          status: "failed",
          lineCount: null,
          message: "required file is missing"
        }];
  }

  const lineCount = countLines(budget.path);
  const overMax = lineCount > budget.maxLines;
  const overTarget =
    typeof budget.targetLines === "number" && lineCount > budget.targetLines;
  const status = budget.reportOnly
    ? "reported"
    : overMax
      ? "failed"
      : overTarget
        ? "warning"
        : "passed";
  const hardCapMessage =
    typeof budget.hardCapLines === "number"
      ? ` hard cap ${budget.hardCapLines}.`
      : "";

  return [{
    ...budget,
    lineCount,
    status,
    message: `${lineCount}/${budget.maxLines} lines.${hardCapMessage}`
  }];
});

const failures = results.filter((result) => result.status === "failed");
const report = {
  script: "verify-large-file-budgets",
  profile,
  passed: failures.length === 0,
  failures,
  results
};

console.log(JSON.stringify(report, null, 2));

if (!report.passed) {
  process.exit(1);
}
