import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ensureOutputRoot,
  evaluateRuntimeValue,
  setViewport,
  sleep,
  waitForGlobeReady,
  withStaticSmokeBrowser,
  writeJsonArtifact
} from "./helpers/m8a-v4-browser-capture-harness.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-conv4");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_MODEL_ID = "m8a-v4.6d-simulation-handover-model.v1";
const EXPECTED_MODEL_TRUTH = "simulation-output-not-operator-log";
const EXPECTED_SOURCE_PROJECTION = "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION";
const EXPECTED_SOURCES_VERSION =
  "m8a-v4.11-sources-role-slice5-runtime.v1";
const VIEWPORT = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const FORBIDDEN_POSITIVE_PHRASES = [
  "real operator handover event",
  "operator handover log",
  "active serving satellite",
  "serving satellite",
  "active gateway assignment",
  "active gateway",
  "active path",
  "active service",
  "pair-specific teleport path",
  "teleport path",
  "native rf handover",
  "measured latency",
  "measured jitter",
  "measured throughput",
  "measured continuity",
  "live network time",
  "operator event time",
  "r2 runtime selector"
];
const FORBIDDEN_UNIT_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*ms\b/i,
  /\b\d+(?:\.\d+)?\s*Mbps\b/i,
  /\b\d+(?:\.\d+)?\s*Gbps\b/i,
  /\bmeasured\s+\d+(?:\.\d+)?\s*%/i
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function collectProjectionUrls() {
  const sources = [
    "src/runtime/m8a-v4-ground-station-projection.ts",
    "public/fixtures/ground-station-projections/m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28.json"
  ].map((relativePath) =>
    readFileSync(path.join(repoRoot, relativePath), "utf8")
  );
  const urls = new Set();

  for (const source of sources) {
    for (const match of source.matchAll(/https:\/\/[^"\\\s]+/g)) {
      urls.add(match[0]);
    }
  }

  return urls;
}

function collectPositiveClaimHits(text) {
  const sourceText = String(text ?? "");
  const lowered = sourceText.toLowerCase();
  const hits = [];
  const isNegated = (index) => {
    const prefix = sourceText
      .slice(Math.max(0, index - 140), index)
      .toLowerCase();

    return /\b(no|not|without|forbidden|must not|does not claim|not claimed|non-claim)\b/.test(
      prefix
    );
  };

  for (const phrase of FORBIDDEN_POSITIVE_PHRASES) {
    const needle = phrase.toLowerCase();
    let index = lowered.indexOf(needle);

    while (index !== -1) {
      if (!isNegated(index)) {
        hits.push({
          phrase,
          context: sourceText
            .slice(Math.max(0, index - 80), index + needle.length + 80)
            .replace(/\s+/g, " ")
            .trim()
        });
      }

      index = lowered.indexOf(needle, index + needle.length);
    }
  }

  return hits;
}

function assertForbiddenClaimsClean(text, label) {
  const positiveClaimHits = collectPositiveClaimHits(text);
  const forbiddenUnitHits = FORBIDDEN_UNIT_PATTERNS.filter((pattern) =>
    pattern.test(text)
  ).map((pattern) => pattern.toString());

  assert(
    positiveClaimHits.length === 0 && forbiddenUnitHits.length === 0,
    `${label} contains a promoted product claim or measured precision: ` +
      JSON.stringify({ positiveClaimHits, forbiddenUnitHits })
  );
}

async function waitForBootstrapReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;
        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");

        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          sources: productRoot?.dataset.m8aV411SourcesRole ?? null,
          hasCapture: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.sources === EXPECTED_SOURCES_VERSION &&
      lastState?.hasCapture === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.11 Conv 4 route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.11 Conv 4 did not reach a ready route: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "M8A-V4.11 Conv 4");
}

async function clickSelector(client, selector, label) {
  await evaluateRuntimeValue(
    client,
    `((selector, label) => {
      const target = document.querySelector(selector);

      if (!(target instanceof HTMLElement)) {
        throw new Error("Missing click target: " + label);
      }

      target.click();
    })(${JSON.stringify(selector)}, ${JSON.stringify(label)})`
  );
  await sleep(180);
}

async function inspectRuntime(client, label) {
  return await evaluateRuntimeValue(
    client,
    `((label) => {
      const normalize = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
      const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
          element.hidden !== true &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const rectToPlain = (rect) => ({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });
      const elementRecord = (element) => ({
        exists: element instanceof HTMLElement,
        visible: isVisible(element),
        hidden: element instanceof HTMLElement ? element.hidden : null,
        rect: element instanceof HTMLElement
          ? rectToPlain(element.getBoundingClientRect())
          : null,
        text: element instanceof HTMLElement ? normalize(element.innerText) : ""
      });
      const parseFilter = (value) => {
        try {
          return JSON.parse(value || "{}");
        } catch {
          return {};
        }
      };

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const sheet = productRoot?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const stateRole = productRoot?.querySelector("[data-m8a-v411-inspector-role='state-evidence']");
      const sourcesRole = productRoot?.querySelector("[data-m8a-v411-inspector-role='sources']");
      const provenanceBadge = productRoot?.querySelector("[data-m8a-v411-provenance-badge='true']");
      const advancedSourcesToggle = productRoot?.querySelector("[data-m8a-v411-advanced-sources-toggle='true']");
      const directSourceActions = Array.from(
        productRoot?.querySelectorAll("[data-m8a-v47-action='open-sources']") ?? []
      ).map((target) => normalize(target.textContent));
      const groundSourceTriggers = Array.from(
        productRoot?.querySelectorAll("[data-m8a-v411-ground-station-chip='true'] [data-m8a-v411-sources-trigger], [data-m8a-v411-ground-station-chip='true'] [data-m8a-v47-action='open-sources']") ?? []
      ).map((target) => ({
        text: normalize(target.textContent),
        trigger: target.dataset.m8aV411SourcesTrigger ?? "",
        action: target.dataset.m8aV47Action ?? ""
      }));
      const tleRows = Array.from(
        sourcesRole?.querySelectorAll("[data-m8a-v411-sources-tle-row='true']") ?? []
      ).map((row) => row.dataset.m8aV411SourcesUrl ?? "");
      const groundSections = Array.from(
        sourcesRole?.querySelectorAll("[data-m8a-v411-sources-ground-station='true']") ?? []
      );
      const r2Rows = Array.from(
        sourcesRole?.querySelectorAll("[data-m8a-v411-sources-r2-row='true']") ?? []
      ).map((row) => normalize(row.textContent));
      const urls = Array.from(
        sourcesRole?.querySelectorAll("a[href]") ?? []
      ).map((anchor) => anchor.href);
      const resourceHits = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) =>
          /itri\\/multi-orbit\\/download|celestrak\\.org/i.test(name)
        );

      return {
        label,
        urlPath: window.location.pathname + window.location.search,
        stateFacts: {
          route: state?.simulationHandoverModel?.route ?? null,
          endpointPairId:
            state?.simulationHandoverModel?.endpointPairId ?? null,
          acceptedPairPrecision:
            state?.simulationHandoverModel?.acceptedPairPrecision ?? null,
          modelId: state?.simulationHandoverModel?.modelId ?? null,
          modelTruth: state?.simulationHandoverModel?.modelTruth ?? null,
          sourceLineage: state?.sourceLineage ?? null,
          actorCount: state?.actorCount ?? null,
          orbitActorCounts: state?.orbitActorCounts ?? null,
          disclosure: state?.productUx?.disclosure ?? null
        },
        rootDataset: {
          sourcesAffordance:
            productRoot?.dataset.m8aV411SourcesAffordance ?? "",
          sourcesState: productRoot?.dataset.m8aV411SourcesRoleState ?? ""
        },
        sheet: elementRecord(sheet),
        stateRole: elementRecord(stateRole),
        sourcesRole: {
          ...elementRecord(sourcesRole),
          filter: parseFilter(sourcesRole?.dataset.m8aV411SourcesFilter),
          tleRowCount: tleRows.length,
          groundStationCount: groundSections.length,
          r2RowCount: r2Rows.length,
          urls,
          text: sourcesRole instanceof HTMLElement ? normalize(sourcesRole.innerText) : ""
        },
        provenanceBadge: {
          ...elementRecord(provenanceBadge),
          action:
            provenanceBadge instanceof HTMLElement
              ? provenanceBadge.dataset.m8aV47Action ?? ""
              : "",
          trigger:
            provenanceBadge instanceof HTMLElement
              ? provenanceBadge.dataset.m8aV411SourcesTrigger ?? ""
              : "",
          role:
            provenanceBadge instanceof HTMLElement
              ? provenanceBadge.getAttribute("role")
              : null,
          tabIndex:
            provenanceBadge instanceof HTMLElement ? provenanceBadge.tabIndex : null
        },
        advancedSourcesToggle: {
          ...elementRecord(advancedSourcesToggle),
          action:
            advancedSourcesToggle instanceof HTMLElement
              ? advancedSourcesToggle.dataset.m8aV47Action ?? ""
              : "",
          trigger:
            advancedSourcesToggle instanceof HTMLElement
              ? advancedSourcesToggle.dataset.m8aV411SourcesTrigger ?? ""
              : "",
          ariaExpanded:
            advancedSourcesToggle instanceof HTMLElement
              ? advancedSourcesToggle.getAttribute("aria-expanded")
              : null
        },
        directSourceActions,
        groundSourceTriggers,
        r2Rows,
        resourceHits
      };
    })(${JSON.stringify(label)})`
  );
}

function assertInvariantState(result, label) {
  assert(
    result.urlPath === REQUEST_PATH &&
      result.stateFacts.route === REQUEST_PATH &&
      result.stateFacts.endpointPairId === EXPECTED_ENDPOINT_PAIR_ID &&
      result.stateFacts.acceptedPairPrecision === EXPECTED_PRECISION &&
      result.stateFacts.modelId === EXPECTED_MODEL_ID &&
      result.stateFacts.modelTruth === EXPECTED_MODEL_TRUTH,
    `${label} changed route/pair/precision/model: ` +
      JSON.stringify(result.stateFacts)
  );
  assert(
    result.stateFacts.sourceLineage?.projectionRead === EXPECTED_SOURCE_PROJECTION &&
      result.stateFacts.sourceLineage?.rawPackageSideReadOwnership === "forbidden" &&
      result.stateFacts.sourceLineage?.rawSourcePathsIncluded === false &&
      result.resourceHits.length === 0,
    `${label} changed source boundary: ` +
      JSON.stringify({
        sourceLineage: result.stateFacts.sourceLineage,
        resourceHits: result.resourceHits
      })
  );
}

function assertDemotedDefault(result) {
  assert(
    result.sourcesRole.visible === false &&
      result.stateFacts.disclosure?.sourcesRoleState === "closed" &&
      result.rootDataset.sourcesAffordance ===
        "advanced-source-provenance-toggle-only",
    "Sources must default closed with advanced-toggle-only affordance: " +
      JSON.stringify({
        rootDataset: result.rootDataset,
        sourcesRole: result.sourcesRole,
        disclosure: result.stateFacts.disclosure
      })
  );
  assert(
    result.provenanceBadge.exists &&
      result.provenanceBadge.visible === false &&
      result.provenanceBadge.action === "" &&
      result.provenanceBadge.trigger === "" &&
      result.provenanceBadge.role === null &&
      result.provenanceBadge.tabIndex === -1,
    "Corner provenance placeholder must not be visible, focusable, clickable, or a Sources trigger: " +
      JSON.stringify(result.provenanceBadge)
  );
  assert(
    result.directSourceActions.length === 0 &&
      result.groundSourceTriggers.length === 0,
    "Ground/corner glance surfaces must not expose direct Sources triggers: " +
      JSON.stringify({
        directSourceActions: result.directSourceActions,
        groundSourceTriggers: result.groundSourceTriggers
      })
  );
}

function assertSourcesStillClosed(result, label) {
  assert(
    result.sourcesRole.visible === false &&
      result.stateFacts.disclosure?.sourcesRoleState === "closed",
    `${label} must not open Sources directly: ` +
      JSON.stringify({
        sheet: result.sheet,
        stateRole: result.stateRole,
        sourcesRole: result.sourcesRole,
        disclosure: result.stateFacts.disclosure
      })
  );
}

function assertAdvancedSourcesOpen(result, projectionUrls) {
  const advancedToggleOwnsSources =
    result.advancedSourcesToggle.trigger === "advanced-source-provenance" ||
    result.sourcesRole.filter?.trigger === "advanced-source-provenance";

  assert(
    result.sheet.visible &&
      result.sourcesRole.visible &&
      result.advancedSourcesToggle.ariaExpanded === "true" &&
      result.advancedSourcesToggle.action === "toggle-source-provenance" &&
      advancedToggleOwnsSources &&
      result.stateFacts.disclosure?.detailsSheetState === "open" &&
      result.stateFacts.disclosure?.sourcesRoleState === "open" &&
      result.sourcesRole.filter?.trigger === "advanced-source-provenance",
    "Advanced source-provenance toggle must be the only Sources opener and may switch the Correction A inspector to the Evidence tab: " +
      JSON.stringify({
        sheet: result.sheet,
        stateRole: result.stateRole,
        sourcesRole: result.sourcesRole,
        advancedSourcesToggle: result.advancedSourcesToggle,
        disclosure: result.stateFacts.disclosure
      })
  );
  assert(
    result.sourcesRole.tleRowCount === 13 &&
      result.sourcesRole.groundStationCount === 2 &&
      result.sourcesRole.r2RowCount === 5,
    "Sources content counts must remain 13 TLE, 2 ground-station sections, 5 R2 rows: " +
      JSON.stringify(result.sourcesRole)
  );
  assert(
    result.sourcesRole.urls.length >= 19 &&
      result.sourcesRole.urls.every((url) => projectionUrls.has(url)),
    "Sources URL set must come from repo-owned projection data: " +
      JSON.stringify(result.sourcesRole.urls)
  );
  assert(
    result.r2Rows.every((row) => /blocked/i.test(row) && /read-only/i.test(row)) &&
      !/promote/i.test(result.r2Rows.join(" ")),
    "R2 candidates must remain blocked/read-only and non-promotable: " +
      JSON.stringify(result.r2Rows)
  );
  assertForbiddenClaimsClean(result.sourcesRole.text, "Conv 4 Sources role");
}

async function main() {
  ensureOutputRoot(outputRoot);
  const projectionUrls = collectProjectionUrls();
  const manifest = {
    viewport: VIEWPORT,
    checks: []
  };

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT);
    await navigateAndWait(client, baseUrl);

    let result = await inspectRuntime(client, "default");
    assertInvariantState(result, "default");
    assertDemotedDefault(result);
    manifest.checks.push("sources-default-closed-and-direct-triggers-demoted");

    await clickSelector(
      client,
      "[data-m8a-v411-provenance-badge='true']",
      "corner provenance placeholder"
    );
    result = await inspectRuntime(client, "after-corner-click");
    assertInvariantState(result, "after-corner-click");
    assertSourcesStillClosed(result, "corner placeholder click");
    manifest.checks.push("corner-placeholder-click-does-not-open-sources");

    await clickSelector(
      client,
      "[data-m8a-v411-ground-station-chip='true']",
      "ground station short chip"
    );
    result = await inspectRuntime(client, "after-ground-click");
    assertInvariantState(result, "after-ground-click");
    assertSourcesStillClosed(result, "ground station short chip click");
    manifest.checks.push("ground-chip-click-does-not-open-sources");

    await clickSelector(
      client,
      "[data-m8a-v47-control-id='details-close']",
      "Details close"
    );
    await clickSelector(
      client,
      "[data-m8a-v47-control-id='details-toggle']",
      "Details"
    );
    await clickSelector(
      client,
      "[data-m8a-v411-advanced-sources-toggle='true']",
      "advanced source-provenance toggle"
    );
    result = await inspectRuntime(client, "advanced-sources-open");
    assertInvariantState(result, "advanced-sources-open");
    assertAdvancedSourcesOpen(result, projectionUrls);
    manifest.checks.push("details-advanced-toggle-opens-full-sources");
  });

  const manifestPath = writeJsonArtifact(
    outputRoot,
    "conv4-smoke-manifest.json",
    manifest
  );

  console.log(
    "M8A-V4.11 Conv 4 sources demotion smoke passed: " +
      JSON.stringify({
        manifest: path.relative(repoRoot, manifestPath),
        checks: manifest.checks
      })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
