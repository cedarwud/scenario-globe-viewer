#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  LEGACY_FIXTURE_DEMO_REQUEST_PATH,
  SELECTED_PAIR_DEMO_BASE_URL,
  SELECTED_PAIR_DEMO_REQUEST_PATH
} from "./helpers/demo-routes.mjs";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

const ACTIVE_ROUTE_FILES = [
  "src/features/app/homepage-entry-cta.ts",
  "src/runtime/bootstrap/composition.ts",
  "src/features/multi-station-selector/v4-route-href.ts",
  "scripts/verify-g1-bucket-a-coverage.mjs",
  "scripts/verify-information-density.mjs",
  "tests/smoke/bootstrap-loads-assets-and-workers.mjs",
  "tests/smoke/verify-m8a-v4-link-flow-cue-runtime.mjs",
  "tests/smoke/verify-m8a-v4.4-homepage-ground-station-entry-runtime.mjs",
  "tests/smoke/verify-m8a-v4.5-visual-acceptance-regression-runtime.mjs",
  "tests/smoke/verify-m8a-v4.10-slice3-boundary-affordance-separation-runtime.mjs",
  "tests/smoke/verify-m8a-v4.10-slice4-inspector-evidence-redesign-runtime.mjs",
  "tests/smoke/verify-m8a-v4.11-slice3-inspector-concurrency-runtime.mjs",
  "tests/smoke/verify-m8a-v4.11-slice5-real-data-surfacing-runtime.mjs",
  "tests/smoke/verify-m8a-v4.12-f09-communication-rate-runtime.mjs"
];

const SELECTED_PAIR_REQUIRED_FILES = [
  "src/features/multi-station-selector/v4-route-href.ts",
  "scripts/helpers/demo-routes.mjs",
  "tests/smoke/verify-m8a-v4-link-flow-cue-runtime.mjs",
  "tests/smoke/verify-m8a-v4.4-homepage-ground-station-entry-runtime.mjs",
  "tests/smoke/verify-m8a-v4.5-visual-acceptance-regression-runtime.mjs",
  "tests/smoke/verify-m8a-v4.10-slice3-boundary-affordance-separation-runtime.mjs",
  "tests/smoke/verify-m8a-v4.10-slice4-inspector-evidence-redesign-runtime.mjs",
  "tests/smoke/verify-m8a-v4.11-slice3-inspector-concurrency-runtime.mjs",
  "tests/smoke/verify-m8a-v4.11-slice5-real-data-surfacing-runtime.mjs",
  "tests/smoke/verify-m8a-v4.12-f09-communication-rate-runtime.mjs"
];

const GOVERNANCE_GATE_REQUIRED_FILES = [
  {
    file: "package.json",
    marker: "verify:selected-pair-route-governance",
    reason: "npm-test-must-run-selected-pair-route-governance"
  },
  {
    file: ".github/workflows/structural-gates.yml",
    marker: "verify:selected-pair-route-governance",
    reason: "ci-must-run-selected-pair-route-governance"
  }
];

const LEGACY_ROUTE_SCAN_ROOTS = ["src", "scripts", "tests/smoke"];
const LEGACY_ROUTE_REFERENCE_MARKERS = [
  LEGACY_FIXTURE_DEMO_REQUEST_PATH,
  "LEGACY_FIXTURE_DEMO_REQUEST_PATH"
];

const COMPATIBILITY_ROUTE_FILE_STATUSES = new Map([
  ["scripts/helpers/demo-routes.mjs", "route-constant-owner"],
  [
    "scripts/verify-selected-pair-route-governance.mjs",
    "selected-pair-route-governance-gate"
  ],
  [
    "src/runtime/m8a-v4-ground-station-projection.ts",
    "tier1-operator-validated-fixture-owner"
  ]
]);
const COMPATIBILITY_ROUTE_FILES = new Set(
  COMPATIBILITY_ROUTE_FILE_STATUSES.keys()
);

const HISTORICAL_FIXTURE_ROUTE_PATTERNS = [
  {
    status: "external-authority-source-boundary-reviewer",
    pattern:
      /^scripts\/verify-itri-f12-decision-threshold-authority-reviewer\.mjs$/
  },
  {
    status: "measured-traffic-source-boundary-reviewer",
    pattern:
      /^scripts\/verify-itri-measured-traffic-package-reviewer\.mjs$/
  },
  {
    status: "tier1-fixture-source-boundary-smoke",
    pattern:
      /^tests\/smoke\/verify-m8a-v4\.3-ground-station-handover-runtime\.mjs$/
  },
  {
    status: "tier1-source-lineage-runtime-smoke",
    pattern:
      /^tests\/smoke\/verify-m8a-v4\.6b-source-lineaged-orbit-actors-runtime\.mjs$/
  },
  {
    status: "tier1-simulation-model-source-boundary-smoke",
    pattern:
      /^tests\/smoke\/verify-m8a-v4\.6d-simulation-handover-model-runtime\.mjs$/
  },
  {
    status: "historical-compatibility-product-shell-smoke",
    pattern:
      /^tests\/smoke\/verify-m8a-v4\.11-correction-a-phase-c-runtime\.mjs$/
  },
  {
    status: "historical-fixture-smoke",
    pattern:
      /^tests\/smoke\/verify-m8a-v4\.(?:3|5|6a|6b|6d|6e|7|8|10|11)(?:[.-].*)?runtime\.mjs$/
  },
  {
    status: "historical-fixture-smoke",
    pattern:
      /^tests\/smoke\/verify-m8a-v4\.12-f09-communication-rate-runtime\.mjs$/
  },
  {
    status: "historical-reviewer-package",
    pattern:
      /^scripts\/verify-[^-]+-(?:measured-traffic-package|f12-decision-threshold-authority)-reviewer\.mjs$/
  }
];

const RETIRED_LEGACY_ROUTE_PATTERNS = [
  {
    status: "retired-demo-route-smoke",
    pattern: /^tests\/smoke\/verify-[^-]+-demo-route-[\w.-]+\.mjs$/
  },
  {
    status: "retired-demo-view-smoke",
    pattern: /^tests\/smoke\/verify-[^-]+-demo-view-[\w.-]+\.mjs$/
  },
  {
    status: "retired-demo-view-capture",
    pattern: /^scripts\/capture-[^-]+-demo-view-phase5-reviewer-evidence\.mjs$/
  },
  {
    status: "retired-reviewer-mode-smoke",
    pattern: /^tests\/smoke\/verify-m8a-v4\.11-impl-phase4-reviewer-mode-runtime\.mjs$/
  },
  {
    status: "retired-fixed-fixture-product-smoke",
    pattern:
      /^tests\/smoke\/verify-m8a-v4\.(?:6a-full-leo-orbit-replay|6e-handover-visual-language|7-handover-product-ux|8-handover-demonstration-ui-ia|9-product-comprehension|10-slice1-first-viewport-composition|10-slice2-handover-sequence-rail|10-slice5-validation-matrix|11-slice1-glance-rank-surface|11-slice2-hover-popover|11-slice4-transition-toast|11-conv1-visual-tokens|11-conv2-hover-inspector-countdown|11-conv3-footer-truth-removal|11-correction-a-phase-[bde])-runtime\.mjs$/
  },
  {
    status: "retired-duplicate-fixture-source-demotion-smoke",
    pattern:
      /^tests\/smoke\/verify-m8a-v4\.11-conv4-sources-demote-smoke-matrix-runtime\.mjs$/
  },
  {
    status: "retired-fixed-fixture-product-helper",
    pattern: /^tests\/smoke\/helpers\/m8a-v4-product-comprehension-[\w-]+\.mjs$/
  }
];

const failures = [];

function readRepoFile(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function listRepoFiles(relativeDir) {
  const absoluteDir = resolve(repoRoot, relativeDir);
  const files = [];

  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = `${relativeDir}/${entry.name}`;

    if (entry.isDirectory()) {
      files.push(...listRepoFiles(relativePath));
      continue;
    }

    if (!entry.isFile() || !/\.(?:js|mjs|ts)$/.test(entry.name)) {
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

function classifyLegacyRouteFile(relativePath) {
  if (COMPATIBILITY_ROUTE_FILES.has(relativePath)) {
    return COMPATIBILITY_ROUTE_FILE_STATUSES.get(relativePath);
  }

  const historicalMatch = HISTORICAL_FIXTURE_ROUTE_PATTERNS.find(({ pattern }) =>
    pattern.test(relativePath)
  );

  return historicalMatch?.status ?? "unclassified-legacy-route-reference";
}

function classifyRetiredRouteFile(relativePath) {
  return RETIRED_LEGACY_ROUTE_PATTERNS.find(({ pattern }) =>
    pattern.test(relativePath)
  )?.status;
}

for (const relativePath of ACTIVE_ROUTE_FILES) {
  const text = readRepoFile(relativePath);
  if (LEGACY_ROUTE_REFERENCE_MARKERS.some((marker) => text.includes(marker))) {
    failures.push({
      file: relativePath,
      reason: "active-route-file-uses-legacy-fixture-route"
    });
  }
}

for (const relativePath of SELECTED_PAIR_REQUIRED_FILES) {
  const text = readRepoFile(relativePath);
  if (
    !text.includes(SELECTED_PAIR_DEMO_REQUEST_PATH) &&
    !text.includes(SELECTED_PAIR_DEMO_BASE_URL) &&
    !text.includes("SELECTED_PAIR_DEMO_REQUEST_PATH") &&
    !text.includes("SELECTED_PAIR_DEMO_HREF")
  ) {
    failures.push({
      file: relativePath,
      reason: "selected-pair-demo-route-not-referenced"
    });
  }
}

for (const gateFile of GOVERNANCE_GATE_REQUIRED_FILES) {
  const text = readRepoFile(gateFile.file);
  if (!text.includes(gateFile.marker)) {
    failures.push({
      file: gateFile.file,
      reason: gateFile.reason
    });
  }
}

const legacyRouteReferenceFiles = LEGACY_ROUTE_SCAN_ROOTS.flatMap(listRepoFiles)
  .filter((relativePath, index, allFiles) => allFiles.indexOf(relativePath) === index)
  .filter((relativePath) => {
    const text = readRepoFile(relativePath);
    return LEGACY_ROUTE_REFERENCE_MARKERS.some((marker) => text.includes(marker));
  })
  .map((relativePath) => ({
    file: relativePath,
    status: classifyLegacyRouteFile(relativePath)
  }))
  .sort((left, right) => left.file.localeCompare(right.file));

const retiredLegacyRouteFiles = LEGACY_ROUTE_SCAN_ROOTS.flatMap(listRepoFiles)
  .filter((relativePath, index, allFiles) => allFiles.indexOf(relativePath) === index)
  .map((relativePath) => ({
    file: relativePath,
    status: classifyRetiredRouteFile(relativePath)
  }))
  .filter((entry) => entry.status)
  .sort((left, right) => left.file.localeCompare(right.file));

for (const legacyReference of legacyRouteReferenceFiles) {
  if (legacyReference.status === "unclassified-legacy-route-reference") {
    failures.push({
      file: legacyReference.file,
      reason: legacyReference.status
    });
  }
}

for (const retiredFile of retiredLegacyRouteFiles) {
  failures.push({
    file: retiredFile.file,
    reason: retiredFile.status
  });
}

const report = {
  script: "verify-selected-pair-route-governance",
  selectedPairRoute: SELECTED_PAIR_DEMO_REQUEST_PATH,
  legacyFixtureRoute: LEGACY_FIXTURE_DEMO_REQUEST_PATH,
  activeRouteFiles: ACTIVE_ROUTE_FILES,
  governanceGateRequiredFiles: GOVERNANCE_GATE_REQUIRED_FILES.map(({ file, marker }) => ({
    file,
    marker
  })),
  compatibilityRouteFiles: [...COMPATIBILITY_ROUTE_FILES],
  legacyRouteReferenceFiles,
  retiredLegacyRouteFiles,
  failures,
  passed: failures.length === 0
};

console.log(JSON.stringify(report, null, 2));

if (!report.passed) {
  process.exit(1);
}
