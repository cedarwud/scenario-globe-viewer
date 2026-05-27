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
  "src/runtime/m8a-v4-ground-station-product-sync.ts",
  "src/runtime/m8a-v4-ground-station-scene-frame.ts",
  "src/runtime/m8a-v4-ground-station-orbit-render-layer.ts",
  "src/runtime/m8a-v4-ground-station-state-builders.ts",
  "src/runtime/m8a-v4-ground-station-event-handlers.ts",
  "src/runtime/m8a-v4-ground-station-replay-lifecycle.ts",
  "src/runtime/m8a-v4-ground-station-export-policy.ts"
];
const COMMON_SMOKE_HELPERS = [
  "tests/smoke/helpers/bootstrap-smoke-common.mjs",
  "tests/smoke/helpers/bootstrap-satellite-overlay-checks.mjs",
  "tests/smoke/helpers/m8a-v4-browser-capture-harness.mjs",
  "tests/smoke/helpers/m8a-v4-product-comprehension-data.mjs",
  "tests/smoke/helpers/m8a-v4-product-comprehension-inspector-checks.mjs",
  "tests/smoke/helpers/m8a-v4-product-comprehension-interaction-checks.mjs",
  "tests/smoke/helpers/m8a-v4-product-comprehension-navigation.mjs",
  "tests/smoke/helpers/m8a-v4-product-comprehension-persistent-checks.mjs",
  "tests/smoke/helpers/m8a-v4-product-comprehension-transition-checks.mjs"
];
const COMMON_FEATURE_SURFACES = [
  "src/features/multi-station-selector/v4-projection-side-panel.ts",
  "src/features/multi-station-selector/v4-projection-formatters.ts",
  "src/features/multi-station-selector/runtime-projection.ts",
  "src/features/multi-station-selector/runtime-data-completeness.ts"
];
const COMMON_SCRIPT_SURFACES = [
  "scripts/verify-tle-first-data-completeness.mjs",
  "scripts/helpers/tle-data-completeness-assertions.mjs",
  "scripts/helpers/tle-data-completeness-csv-assertions.mjs",
  "tests/smoke/bootstrap-loads-assets-and-workers.mjs"
];
const COMMON_STYLESHEET_SURFACES = [
  "src/styles/app-shell-hud.css",
  "src/styles/first-intake-overlays.css",
  "src/styles/runtime-panels.css",
  "src/styles/viewer-controls-responsive.css",
  "src/styles/homepage-entry-cta.css",
  "src/styles/ground-station-selector.css",
  "src/styles/ground-station-band-filter.css"
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
        id: "selected-pair-panel",
        path: COMMON_FEATURE_SURFACES[0],
        maxLines: 2800,
        hardCapLines: 3000
      },
      {
        id: "selected-pair-panel-helper",
        path: COMMON_FEATURE_SURFACES[1],
        maxLines: 1200
      },
      {
        id: "runtime-projection",
        path: COMMON_FEATURE_SURFACES[2],
        maxLines: 1800
      },
      {
        id: "runtime-data-completeness",
        path: COMMON_FEATURE_SURFACES[3],
        maxLines: 1800
      },
      {
        id: "tle-data-completeness-gate",
        path: COMMON_SCRIPT_SURFACES[0],
        maxLines: 1200
      },
      {
        id: "tle-data-completeness-assertions",
        path: COMMON_SCRIPT_SURFACES[1],
        maxLines: 2200
      },
      {
        id: "tle-data-completeness-csv-assertions",
        path: COMMON_SCRIPT_SURFACES[2],
        maxLines: 1200
      },
      {
        id: "bootstrap-smoke",
        path: COMMON_SCRIPT_SURFACES[3],
        maxLines: 2000
      },
      {
        id: "product-comprehension-smoke",
        path: "tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs",
        maxLines: 1200
      },
      ...COMMON_SMOKE_HELPERS.map((path) => ({
        id: "smoke-helper",
        path,
        maxLines: 1200
      })),
      ...COMMON_STYLESHEET_SURFACES.map((path) => ({
        id: "stylesheet-helper",
        path,
        maxLines: 1200
      })),
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
        id: "selected-pair-panel",
        path: COMMON_FEATURE_SURFACES[0],
        maxLines: 3600,
        targetLines: 2400
      },
      {
        id: "selected-pair-panel-helper",
        path: COMMON_FEATURE_SURFACES[1],
        maxLines: 1500,
        targetLines: 1200
      },
      {
        id: "runtime-projection",
        path: COMMON_FEATURE_SURFACES[2],
        maxLines: 1800,
        targetLines: 1500
      },
      {
        id: "runtime-data-completeness",
        path: COMMON_FEATURE_SURFACES[3],
        maxLines: 1800,
        targetLines: 1500
      },
      {
        id: "tle-data-completeness-gate",
        path: COMMON_SCRIPT_SURFACES[0],
        maxLines: 1400,
        targetLines: 900
      },
      {
        id: "tle-data-completeness-assertions",
        path: COMMON_SCRIPT_SURFACES[1],
        maxLines: 2400,
        targetLines: 1600
      },
      {
        id: "tle-data-completeness-csv-assertions",
        path: COMMON_SCRIPT_SURFACES[2],
        maxLines: 1500,
        targetLines: 1200
      },
      {
        id: "bootstrap-smoke",
        path: COMMON_SCRIPT_SURFACES[3],
        maxLines: 2000,
        targetLines: 1200
      },
      {
        id: "product-comprehension-smoke",
        path: "tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs",
        maxLines: 3000,
        targetLines: 1200
      },
      ...COMMON_SMOKE_HELPERS.map((path) => ({
        id: "smoke-helper",
        path,
        maxLines: 1500,
        targetLines: 1200
      })),
      ...COMMON_STYLESHEET_SURFACES.map((path) => ({
        id: "stylesheet-helper",
        path,
        maxLines: 1500,
        targetLines: 1200
      })),
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
