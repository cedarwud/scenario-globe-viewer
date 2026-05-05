import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  captureScreenshot,
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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-slice5");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_MODEL_ID = "m8a-v4.6d-simulation-handover-model.v1";
const EXPECTED_MODEL_TRUTH = "simulation-output-not-operator-log";
const EXPECTED_SOURCE_PROJECTION = "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION";
const EXPECTED_GLANCE_VERSION =
  "m8a-v4.11-glance-rank-surface-slice1-runtime.v1";
const EXPECTED_HOVER_VERSION =
  "m8a-v4.11-hover-popover-slice2-runtime.v1";
const EXPECTED_CONCURRENCY_VERSION =
  "m8a-v4.11-inspector-concurrency-slice3-runtime.v1";
const EXPECTED_TRANSIENT_VERSION =
  "m8a-v4.11-transition-toast-slice4-runtime.v1";
const EXPECTED_SOURCES_VERSION =
  "m8a-v4.11-sources-role-slice5-runtime.v1";
const EXPECTED_SEQUENCE_WINDOW_IDS = [
  "leo-acquisition-context",
  "leo-aging-pressure",
  "meo-continuity-hold",
  "leo-reentry-candidate",
  "geo-continuity-guard"
];
const EXPECTED_ACTOR_COUNTS = { leo: 6, meo: 5, geo: 2 };
const EXPECTED_TLE_RECORDS = [
  "ONEWEB-0386",
  "ONEWEB-0537",
  "ONEWEB-0701",
  "ONEWEB-0012",
  "ONEWEB-0249",
  "ONEWEB-0702",
  "O3B MPOWER F6",
  "O3B MPOWER F1",
  "O3B MPOWER F2",
  "O3B MPOWER F4",
  "O3B MPOWER F3",
  "ST-2",
  "SES-9"
];
const EXPECTED_R2_STATION_FRAGMENTS = [
  "Taiwan site-level CHT earth-station family",
  "Thailand NT Sirindhorn OneWeb SNP Gateway",
  "Singapore Singtel Bukit Timah Satellite Earth Station",
  "Japan KDDI Yamaguchi / SoftBank OneWeb country family",
  "Korea KT SAT Kumsan / OneWeb terminal ecosystem"
];
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

function assertListEquals(actual, expected, label) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} mismatch: ${JSON.stringify({ actual, expected })}`
  );
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

function assertNoRuntimeRawSourceRead() {
  const runtimeSources = [
    "src/runtime/m8a-v4-ground-station-handover-scene-controller.ts",
    "src/runtime/m8a-v411-glance-rank-surface.ts",
    "src/runtime/m8a-v411-hover-popover.ts",
    "src/runtime/m8a-v411-inspector-concurrency.ts",
    "src/runtime/m8a-v411-transition-toast.ts",
    "src/runtime/m8a-v411-sources-role.ts"
  ];
  const forbiddenPatterns = [
    /itri\/multi-orbit\/download/i,
    /fetch\([^)]*celestrak\.org/i,
    /new\s+URL\([^)]*celestrak\.org/i
  ];
  const hits = [];

  for (const relativePath of runtimeSources) {
    const source = readFileSync(path.join(repoRoot, relativePath), "utf8");

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(source)) {
        hits.push({ relativePath, pattern: String(pattern) });
      }
    }
  }

  assert(
    hits.length === 0,
    "Slice 5 runtime must not side-read raw ITRI files or live CelesTrak: " +
      JSON.stringify(hits)
  );
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
      JSON.stringify({ positiveClaimHits, forbiddenUnitHits, text })
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
          glance: productRoot?.dataset.m8aV411GlanceRankSurface ?? null,
          hover: productRoot?.dataset.m8aV411HoverPopover ?? null,
          concurrency:
            productRoot?.dataset.m8aV411InspectorConcurrency ?? null,
          transient:
            productRoot?.dataset.m8aV411TransientSurface ?? null,
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
      lastState?.glance === EXPECTED_GLANCE_VERSION &&
      lastState?.hover === EXPECTED_HOVER_VERSION &&
      lastState?.concurrency === EXPECTED_CONCURRENCY_VERSION &&
      lastState?.transient === EXPECTED_TRANSIENT_VERSION &&
      lastState?.sources === EXPECTED_SOURCES_VERSION &&
      lastState?.hasCapture === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.11 Slice 5 route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.11 Slice 5 did not reach a ready route: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "M8A-V4.11 Slice 5");
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

async function inspectRuntime(client, label = "inspection") {
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
        right: rect.right,
        bottom: rect.bottom,
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
      const truthRole = productRoot?.querySelector("[data-m8a-v411-inspector-role='truth-boundary']");
      const sourcesRole = productRoot?.querySelector("[data-m8a-v411-inspector-role='sources']");
      const advancedSourcesToggle = productRoot?.querySelector("[data-m8a-v411-advanced-sources-toggle='true']");
      const provenanceBadge = productRoot?.querySelector("[data-m8a-v411-provenance-badge='true']");
      // Conv 3: footer chip system replaces corner badge content
      const footerChipRow = productRoot?.querySelector("[data-m8a-v411-footer-chip-row='true']");
      const footerTleChip = footerChipRow?.querySelector("[data-m8a-v411-footer-chip='tle-source']");
      const sourceFilter = parseFilter(sourcesRole?.dataset.m8aV411SourcesFilter);
      const tleRows = Array.from(
        sourcesRole?.querySelectorAll("[data-m8a-v411-sources-tle-row='true']") ?? []
      ).map((row) => ({
        actorId: row.dataset.m8aV411SourcesActorId ?? "",
        orbitClass: row.dataset.m8aV411SourcesOrbitClass ?? "",
        sourceRecordName: row.dataset.m8aV411SourcesRecordName ?? "",
        fetchedAtUtc: row.dataset.m8aV411SourcesFetchedAtUtc ?? "",
        url: row.dataset.m8aV411SourcesUrl ?? "",
        text: normalize(row.textContent)
      }));
      const groundRows = Array.from(
        sourcesRole?.querySelectorAll("[data-m8a-v411-sources-ground-evidence-row='true']") ?? []
      ).map((row) => ({
        endpointId: row.dataset.m8aV411SourcesEndpointId ?? "",
        orbitClass: row.dataset.m8aV411SourcesOrbitClass ?? "",
        sourceRefId: row.dataset.m8aV411SourcesSourceRefId ?? "",
        sourceLevel: row.dataset.m8aV411SourcesSourceLevel ?? "",
        url: row.dataset.m8aV411SourcesUrl ?? "",
        text: normalize(row.textContent)
      }));
      const groundSections = Array.from(
        sourcesRole?.querySelectorAll("[data-m8a-v411-sources-ground-station='true']") ?? []
      ).map((section) => ({
        endpointId: section.dataset.m8aV411SourcesEndpointId ?? "",
        open: section instanceof HTMLDetailsElement ? section.open : false,
        text: normalize(section.textContent)
      }));
      const r2Rows = Array.from(
        sourcesRole?.querySelectorAll("[data-m8a-v411-sources-r2-row='true']") ?? []
      ).map((row) => ({
        candidateId: row.dataset.m8aV411SourcesR2CandidateId ?? "",
        status: row.dataset.m8aV411SourcesR2Status ?? "",
        readOnly: row.dataset.m8aV411SourcesR2ReadOnly ?? "",
        text: normalize(row.textContent)
      }));
      const anchors = Array.from(
        sourcesRole?.querySelectorAll("a[href]") ?? []
      ).map((anchor) => anchor.href);
      const r2InteractiveControls = Array.from(
        sourcesRole?.querySelectorAll(
          "[data-m8a-v411-sources-r2-section='true'] button, [data-m8a-v411-sources-r2-section='true'] select, [data-m8a-v411-sources-r2-section='true'] input, [data-m8a-v411-sources-r2-section='true'] [data-m8a-v47-action]"
        ) ?? []
      ).length;
      const directSourceActions = Array.from(
        productRoot?.querySelectorAll("[data-m8a-v47-action='open-sources']") ?? []
      ).map((target) => ({
        text: normalize(target.textContent),
        trigger: target.dataset.m8aV411SourcesTrigger ?? "",
        role: target.getAttribute("role"),
        tabIndex: target instanceof HTMLElement ? target.tabIndex : null
      }));
      const groundSourceTriggers = Array.from(
        productRoot?.querySelectorAll("[data-m8a-v411-ground-station-chip='true'] [data-m8a-v411-sources-trigger], [data-m8a-v411-ground-station-chip='true'] [data-m8a-v47-action='open-sources']") ?? []
      ).map((target) => ({
        endpointId: target.dataset.m8aV411SourcesEndpointId ?? "",
        orbitClass: target.dataset.m8aV411SourcesOrbitClass ?? "",
        trigger: target.dataset.m8aV411SourcesTrigger ?? "",
        action: target.dataset.m8aV47Action ?? "",
        text: normalize(target.textContent)
      }));
      const resourceHits = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) =>
          /itri\\/multi-orbit\\/download|celestrak\\.org/i.test(name)
        );
      const fontSize = Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize || "16"
      );
      const inspectorBudgetHeight = window.innerHeight - 9.5 * fontSize;

      return {
        label,
        rootDataset: {
          glance: productRoot?.dataset.m8aV411GlanceRankSurface ?? null,
          hover: productRoot?.dataset.m8aV411HoverPopover ?? null,
          concurrency:
            productRoot?.dataset.m8aV411InspectorConcurrency ?? null,
          transient:
            productRoot?.dataset.m8aV411TransientSurface ?? null,
          sources: productRoot?.dataset.m8aV411SourcesRole ?? null,
          sourcesState: productRoot?.dataset.m8aV411SourcesRoleState ?? null,
          sourcesFilter: parseFilter(productRoot?.dataset.m8aV411SourcesFilter),
          inspectorRoles: productRoot?.dataset.m8aV411InspectorRoles ?? "",
          combinedOpen: productRoot?.dataset.m8aV411InspectorCombinedOpen ?? null,
          sourcesAffordance:
            productRoot?.dataset.m8aV411SourcesAffordance ?? "",
          pinnedHoverRole: productRoot?.dataset.m8aV411PinnedHoverRole ?? "",
          pinnedSourcesTrigger:
            productRoot?.dataset.m8aV411PinnedSourcesTrigger ?? ""
        },
        stateFacts: {
          endpointPairId: state?.simulationHandoverModel?.endpointPairId ?? null,
          acceptedPairPrecision:
            state?.simulationHandoverModel?.acceptedPairPrecision ?? null,
          modelId: state?.simulationHandoverModel?.modelId ?? null,
          modelTruth: state?.simulationHandoverModel?.modelTruth ?? null,
          route: state?.simulationHandoverModel?.route ?? null,
          sourceLineage: state?.sourceLineage ?? null,
          actorCount: state?.actorCount ?? null,
          orbitActorCounts: state?.orbitActorCounts ?? null,
          timelineWindowIds: state?.simulationHandoverModel?.timelineWindowIds ?? [],
          disclosure: state?.productUx?.disclosure ?? null
        },
        sheet: elementRecord(sheet),
        stateRole: elementRecord(stateRole),
        truthRole: elementRecord(truthRole),
        advancedSourcesToggle: {
          ...elementRecord(advancedSourcesToggle),
          ariaExpanded:
            advancedSourcesToggle instanceof HTMLElement
              ? advancedSourcesToggle.getAttribute("aria-expanded")
              : null,
          action:
            advancedSourcesToggle instanceof HTMLElement
              ? advancedSourcesToggle.dataset.m8aV47Action ?? ""
              : "",
          trigger:
            advancedSourcesToggle instanceof HTMLElement
              ? advancedSourcesToggle.dataset.m8aV411SourcesTrigger ?? ""
              : ""
        },
        sourcesRole: {
          ...elementRecord(sourcesRole),
          filter: sourceFilter,
          tleRowCount: tleRows.length,
          groundStationCount: groundSections.length,
          groundEvidenceRowCount: groundRows.length,
          r2RowCount: r2Rows.length,
          r2InteractiveControls,
          anchors,
          text: sourcesRole instanceof HTMLElement ? normalize(sourcesRole.innerText) : ""
        },
        footerChipRow: elementRecord(footerChipRow),
        footerTleChip: {
          ...elementRecord(footerTleChip),
          tleSource: footerTleChip?.dataset.m8aV411FooterChipTleSource ?? null,
          tleDate: footerTleChip?.dataset.m8aV411FooterChipTleDate ?? null
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
        directSourceActions,
        groundSourceTriggers,
        tleRows,
        groundRows,
        groundSections,
        r2Rows,
        resourceHits,
        inspectorBudgetHeight
      };
    })(${JSON.stringify(label)})`
  );
}

function assertInvariantState(result, label) {
  assert(
    result.stateFacts.endpointPairId === EXPECTED_ENDPOINT_PAIR_ID &&
      result.stateFacts.acceptedPairPrecision === EXPECTED_PRECISION &&
      result.stateFacts.modelId === EXPECTED_MODEL_ID &&
      result.stateFacts.modelTruth === EXPECTED_MODEL_TRUTH,
    `${label} changed route/pair/precision/model: ` +
      JSON.stringify(result.stateFacts)
  );
  assertListEquals(
    result.stateFacts.timelineWindowIds,
    EXPECTED_SEQUENCE_WINDOW_IDS,
    `${label} V4.6D window order`
  );
  assert(
    result.stateFacts.actorCount === 13 &&
      JSON.stringify(result.stateFacts.orbitActorCounts) ===
        JSON.stringify(EXPECTED_ACTOR_COUNTS),
    `${label} actor set changed: ` + JSON.stringify(result.stateFacts)
  );
  assert(
    result.stateFacts.sourceLineage?.projectionRead === EXPECTED_SOURCE_PROJECTION &&
      result.stateFacts.sourceLineage?.rawPackageSideReadOwnership === "forbidden" &&
      result.stateFacts.sourceLineage?.rawSourcePathsIncluded === false,
    `${label} source boundary changed: ` +
      JSON.stringify(result.stateFacts.sourceLineage)
  );
  assert(
    result.resourceHits.length === 0,
    `${label} fetched raw ITRI or live CelesTrak resources: ` +
      JSON.stringify(result.resourceHits)
  );
}

function assertInspectorBudget(result, label) {
  assert(
    result.sheet.rect.width <= 321 &&
      result.sheet.rect.height <= result.inspectorBudgetHeight + 1,
    `${label} inspector exceeded Slice 5 budget: ` +
      JSON.stringify({
        rect: result.sheet.rect,
        inspectorBudgetHeight: result.inspectorBudgetHeight
      })
  );
}

function assertDefaultClosed(result) {
  assert(
    result.sheet.visible === false &&
      result.sourcesRole.visible === false &&
      result.stateFacts.disclosure?.sourcesRoleState === "closed",
    "Sources must default closed: " +
      JSON.stringify({
        sheet: result.sheet,
        sourcesRole: result.sourcesRole,
        disclosure: result.stateFacts.disclosure
      })
  );
  // Conv 3 Smoke Softening: corner badge is now a ≤24×24 invisible placeholder;
  // TLE provenance content moved to footer chip system
  assert(
    result.provenanceBadge.exists &&
      result.provenanceBadge.visible === false &&
      result.provenanceBadge.rect &&
      result.provenanceBadge.rect.width <= 24 &&
      result.provenanceBadge.rect.height <= 24 &&
      result.provenanceBadge.action === "" &&
      result.provenanceBadge.trigger === "" &&
      result.provenanceBadge.role === null &&
      result.provenanceBadge.tabIndex === -1,
    "Corner provenance badge must be a non-focusable, non-clickable ≤24×24 invisible placeholder: " +
      JSON.stringify(result.provenanceBadge)
  );
  assert(
    result.footerTleChip.visible &&
      result.footerTleChip.tleSource === "CelesTrak NORAD GP" &&
      result.footerTleChip.tleDate === "2026-04-26",
    "Footer chip row must contain TLE source info (Conv 3 Softening — corner badge content moved): " +
      JSON.stringify(result.footerTleChip)
  );
  assert(
    result.directSourceActions.length === 0 &&
      result.groundSourceTriggers.length === 0,
    "Corner and ground-station glance chips must not expose direct Sources triggers: " +
      JSON.stringify({
        directSourceActions: result.directSourceActions,
        groundSourceTriggers: result.groundSourceTriggers
      })
  );
}

function assertNoDirectSourcesOpen(result, label) {
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

function assertSourcesFullOpen(result, projectionUrls) {
  assert(
    result.sheet.visible === true &&
      result.sourcesRole.visible === true &&
      result.stateFacts.disclosure?.sourcesRoleState === "open" &&
      result.stateFacts.disclosure?.detailsSheetState === "open" &&
      result.stateFacts.disclosure?.boundarySurfaceState === "closed" &&
      result.advancedSourcesToggle.ariaExpanded === "true" &&
      result.sourcesRole.filter?.trigger === "advanced-source-provenance" &&
      !result.sourcesRole.filter?.endpointId &&
      !result.sourcesRole.filter?.orbitClass,
    "Details advanced source-provenance toggle must open full Sources: " +
      JSON.stringify({
        sheet: result.sheet,
        advancedSourcesToggle: result.advancedSourcesToggle,
        sourcesRole: result.sourcesRole,
        disclosure: result.stateFacts.disclosure
      })
  );
  assertInspectorBudget(result, "advanced source-provenance Sources open");
  assert(
    result.sourcesRole.tleRowCount === 13 &&
      result.sourcesRole.groundStationCount === 2 &&
      result.sourcesRole.r2RowCount === 5,
    "Sources full-open counts must be 13 TLE, 2 ground stations, 5 R2 rows: " +
      JSON.stringify(result.sourcesRole)
  );
  assert(
    EXPECTED_TLE_RECORDS.every((recordName) =>
      result.tleRows.some((row) => row.sourceRecordName === recordName)
    ),
    "All 13 TLE record names must appear in Sources: " +
      JSON.stringify(result.tleRows.map((row) => row.sourceRecordName))
  );
  assert(
    EXPECTED_R2_STATION_FRAGMENTS.every((fragment) =>
      result.r2Rows.some((row) => row.text.includes(fragment))
    ) &&
      result.r2Rows.every(
        (row) =>
          row.status === "blocked" &&
          row.readOnly === "true" &&
          /blocked/i.test(row.text) &&
          /read-only/i.test(row.text)
      ),
    "All 5 R2 rows must appear as blocked/read-only: " +
      JSON.stringify(result.r2Rows)
  );
  assert(
    result.sourcesRole.r2InteractiveControls === 0,
    "R2 read-only catalog must not expose selectable controls: " +
      JSON.stringify(result.r2Rows)
  );
  assert(
    !/promote/i.test(result.r2Rows.map((row) => row.text).join(" ")),
    "R2 read-only catalog must not expose promotion language: " +
      JSON.stringify(result.r2Rows)
  );
  assert(
    result.sourcesRole.anchors.length >= 19 &&
      result.sourcesRole.anchors.every((url) => projectionUrls.has(url)),
    "Sources URLs must come from the repo-owned projection: " +
      JSON.stringify(result.sourcesRole.anchors)
  );
  assertForbiddenClaimsClean(result.sourcesRole.text, "Sources role");
}

async function main() {
  assertNoRuntimeRawSourceRead();
  ensureOutputRoot(outputRoot);

  const projectionUrls = collectProjectionUrls();
  const manifest = {
    viewport: VIEWPORT,
    screenshots: [],
    checks: []
  };

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT);
    await navigateAndWait(client, baseUrl);

    const defaultClosed = await inspectRuntime(client, "default-closed");
    assertInvariantState(defaultClosed, "default-closed");
    assertDefaultClosed(defaultClosed);
    manifest.checks.push("sources-default-closed");

    await clickSelector(
      client,
      "[data-m8a-v411-provenance-badge='true']",
      "corner provenance placeholder"
    );
    const afterCornerClick = await inspectRuntime(client, "after-corner-click");
    assertInvariantState(afterCornerClick, "after-corner-click");
    assertNoDirectSourcesOpen(afterCornerClick, "corner placeholder click");
    manifest.checks.push("corner-placeholder-does-not-open-sources");

    await clickSelector(
      client,
      "[data-m8a-v411-ground-station-chip='true']",
      "ground-station short chip"
    );
    const afterGroundClick = await inspectRuntime(client, "after-ground-click");
    assertInvariantState(afterGroundClick, "after-ground-click");
    assertNoDirectSourcesOpen(afterGroundClick, "ground-station short chip click");
    manifest.checks.push("ground-short-chip-does-not-open-sources");

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
      "advanced source provenance toggle"
    );
    const sourcesDefault = await inspectRuntime(client, "sources-advanced-toggle");
    assertInvariantState(sourcesDefault, "sources-advanced-toggle");
    assertSourcesFullOpen(sourcesDefault, projectionUrls);
    manifest.checks.push("advanced-toggle-opens-full-sources");
    manifest.screenshots.push(
      await captureScreenshot(
        client,
        outputRoot,
        "v4.11-sources-advanced-toggle-1440x900.png"
      )
    );
  });

  for (const screenshotPath of manifest.screenshots) {
    assert(
      statSync(screenshotPath).size > 0,
      `Expected non-empty screenshot at ${screenshotPath}`
    );
  }

  writeJsonArtifact(outputRoot, "capture-manifest.json", manifest);
  console.log(
    "M8A-V4.11 Slice 5 real-data surfacing smoke passed: " +
      JSON.stringify({
        screenshots: manifest.screenshots.map((screenshotPath) =>
          path.relative(repoRoot, screenshotPath)
        ),
        checks: manifest.checks
      })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
