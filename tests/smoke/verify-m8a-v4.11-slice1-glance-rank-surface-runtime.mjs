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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-slice1");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_MODEL_ID = "m8a-v4.6d-simulation-handover-model.v1";
const EXPECTED_MODEL_TRUTH = "simulation-output-not-operator-log";
const EXPECTED_SOURCE_PROJECTION = "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION";
const EXPECTED_V411_VERSION =
  "m8a-v4.11-glance-rank-surface-slice1-runtime.v1";
const EXPECTED_MICRO_CUE = "focus · LEO";
const EXPECTED_PROVENANCE =
  "TLE: CelesTrak NORAD GP · fetched 2026-04-26 · 13 actors";
// EXPECTED_TRIPLET removed in Conv 1 — superseded by EXPECTED_GROUND_SHORT_CHIP_COPY
// per Addendum 1.5 / Lock-in J Smoke Softening Disclosure (ground-station chip shape only)
const EXPECTED_ACTOR_COUNTS = { leo: 6, meo: 5, geo: 2 };
const EXPECTED_GROUND_SHORT_CHIP_COPY = "LEO MEO GEO ✓";
const EXPECTED_GROUND_SHORT_CHIP_MAX_WIDTH_PX = 96;
const EXPECTED_GROUND_SHORT_CHIP_MAX_HEIGHT_PX = 18;
const VIEWPORTS = [
  {
    name: "default-1440x900",
    width: 1440,
    height: 900,
    screenshot: "v4.11-slice1-default-1440x900.png",
    metadata: "v4.11-slice1-default-1440x900.metadata.json"
  },
  {
    name: "default-1280x720",
    width: 1280,
    height: 720,
    screenshot: "v4.11-slice1-default-1280x720.png",
    metadata: "v4.11-slice1-default-1280x720.metadata.json"
  },
  {
    name: "default-390x844",
    width: 390,
    height: 844,
    screenshot: "v4.11-slice1-default-390x844.png",
    metadata: "v4.11-slice1-default-390x844.metadata.json"
  }
];
const EXPECTED_SEQUENCE_WINDOW_IDS = [
  "leo-acquisition-context",
  "leo-aging-pressure",
  "meo-continuity-hold",
  "leo-reentry-candidate",
  "geo-continuity-guard"
];
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

function assertForbiddenClaimScan(result, label) {
  const searchableText = [
    result.visibleProductText,
    result.rootDatasetText,
    result.annotation.text,
    result.provenance.text,
    ...result.groundStations.map((station) => station.text),
    ...result.orbitChips.map((chip) => chip.text)
  ]
    .filter(Boolean)
    .join(" ");
  const normalized = searchableText.replace(/\s+/g, " ");
  const lowered = normalized.toLowerCase();
  const phraseHits = FORBIDDEN_POSITIVE_PHRASES.filter((phrase) =>
    lowered.includes(phrase)
  );
  const unitHits = FORBIDDEN_UNIT_PATTERNS.filter((pattern) =>
    pattern.test(normalized)
  ).map((pattern) => pattern.toString());

  assert(
    phraseHits.length === 0 && unitHits.length === 0,
    `${label} contains forbidden handover precision or operator-truth claim: ` +
      JSON.stringify({ phraseHits, unitHits, normalized })
  );
  assert(
    result.resourceHits.length === 0,
    `${label} must not fetch raw ITRI packages or live external source resources: ` +
      JSON.stringify(result.resourceHits)
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
          v411GlanceRankSurface:
            productRoot?.dataset.m8aV411GlanceRankSurface ?? null,
          hasCapture: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.v411GlanceRankSurface === EXPECTED_V411_VERSION &&
      lastState?.hasCapture === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.11 Slice 1 route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.11 Slice 1 did not reach a ready route: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "M8A-V4.11 Slice 1");
}

async function resetDefaultWindow(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const replayClock = capture?.replayClock;
      const replayState = replayClock?.getState?.();

      capture?.m8aV4GroundStationScene?.pause?.();
      if (replayClock && replayState?.startTime) {
        replayClock.seek(replayState.startTime);
      }
    })()`
  );
  await sleep(360);
}

async function inspectSlice1(client, label) {
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
      const listDataset = (value) =>
        typeof value === "string" && value.length > 0
          ? value.split("|").filter(Boolean)
          : [];
      const visibleTextNodes = (root) => {
        const texts = [];

        if (!root) {
          return texts;
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const text = normalize(node.textContent);
          const parent = node.parentElement;

          if (text && parent && isVisible(parent)) {
            texts.push(text);
          }
        }

        return texts;
      };
      const elementRecord = (element) => ({
        exists: element instanceof HTMLElement,
        visible: isVisible(element),
        hidden: element instanceof HTMLElement ? element.hidden : null,
        rect: element instanceof HTMLElement
          ? rectToPlain(element.getBoundingClientRect())
          : null,
        text: element instanceof HTMLElement ? normalize(element.innerText) : ""
      });

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const annotation = productRoot?.querySelector("[data-m8a-v47-scene-annotation='true']");
      const provenance = productRoot?.querySelector("[data-m8a-v411-provenance-badge='true']");
      const sequenceRail = productRoot?.querySelector("[data-m8a-v410-sequence-rail='true']");
      const strip = productRoot?.querySelector("[data-m8a-v47-control-strip='true']");
      const sheet = productRoot?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const boundarySurface = productRoot?.querySelector("[data-m8a-v410-boundary-surface='true']");
      const transitionEvent = productRoot?.querySelector("[data-m8a-v49-transition-event='true']");
      const details = productRoot?.querySelector("[data-m8a-v47-control-id='details-toggle']");
      const truth = productRoot?.querySelector("[data-m8a-v47-control-id='truth-affordance']");
      const productVisibleText = visibleTextNodes(productRoot).join(" ");
      const orbitChips = Array.from(
        productRoot?.querySelectorAll("[data-m8a-v411-orbit-class-chip='true']") ?? []
      ).map((chip) => ({
        ...elementRecord(chip),
        actorId: chip.dataset.m8aV411OrbitChipActorId ?? null,
        orbitClass: chip.dataset.m8aV411OrbitClass ?? null,
        emphasis: chip.dataset.m8aV411OrbitChipEmphasis ?? null,
        projected: chip.dataset.m8aV411OrbitChipProjection ?? null
      }));
      const groundStations = Array.from(
        productRoot?.querySelectorAll("[data-m8a-v411-ground-station-chip='true']") ?? []
      ).map((station) => {
        const strengthTokens = Array.from(
          station.querySelectorAll("[data-m8a-v411-ground-evidence-strength]")
        )
          .filter(
            (token) =>
              token.dataset.m8aV411GroundEvidenceStrengthMark !== "true"
          )
          .map((token) => ({
            text: normalize(token.textContent),
            orbit: token.dataset.m8aV411GroundOrbitToken ?? null,
            strength: token.dataset.m8aV411GroundEvidenceStrength ?? null,
            sourcesTrigger:
              token.dataset.m8aV411SourcesTrigger ?? null,
            sourcesOrbitClass:
              token.dataset.m8aV411SourcesOrbitClass ?? null,
            openSourcesAction:
              token.dataset.m8aV47Action ?? null
          }));

        return {
          ...elementRecord(station),
          endpointId: station.dataset.m8aV411GroundStationEndpointId ?? null,
          shortChip: {
            isShortChip:
              station.dataset.m8aV411GroundStationShortChip === "true",
            copy: station.dataset.m8aV411GroundShortChipCopy ?? null,
            maxWidthPx: station.dataset.m8aV411GroundShortChipMaxWidthPx ?? null,
            maxHeightPx:
              station.dataset.m8aV411GroundShortChipMaxHeightPx ?? null,
            fontSizePx:
              station.dataset.m8aV411GroundShortChipFontSizePx ?? null
          },
          strengthTokens
        };
      });
      // Conv 3: corner badge is a ≤24×24 invisible placeholder; footer chip system has TLE/actor info
      const footerChipRow = productRoot?.querySelector("[data-m8a-v411-footer-chip-row='true']");
      const footerTleChip = footerChipRow?.querySelector("[data-m8a-v411-footer-chip='tle-source']");
      const footerActorChip = footerChipRow?.querySelector("[data-m8a-v411-footer-chip='actor-count']");
      const visibleRealDataChipTypes = [
        // Conv 3 Smoke Softening: corner-provenance replaced by footer chip system chips
        footerTleChip && isVisible(footerTleChip) ? "footer-tle-source" : null,
        footerActorChip && isVisible(footerActorChip) ? "footer-actor-count" : null,
        ...orbitChips
          .filter((chip) => chip.visible)
          .map((chip) => \`orbit-\${chip.actorId}\`),
        ...groundStations
          .filter((station) => station.visible)
          .map((station) => \`ground-short-\${station.endpointId}\`)
      ].filter(Boolean);
      const resourceHits = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /celestrak|itri\\/multi-orbit/i.test(name));

      return {
        label,
        urlPath: window.location.pathname + window.location.search,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        stateFacts: {
          route: state?.simulationHandoverModel?.route ?? null,
          endpointPairId:
            state?.simulationHandoverModel?.endpointPairId ?? null,
          acceptedPairPrecision:
            state?.simulationHandoverModel?.acceptedPairPrecision ?? null,
          modelId: state?.simulationHandoverModel?.modelId ?? null,
          modelTruth: state?.simulationHandoverModel?.modelTruth ?? null,
          orbitActorCounts: state?.orbitActorCounts ?? null,
          actorCount: state?.actorCount ?? null,
          actors: state?.actors?.map((actor) => ({
            actorId: actor.actorId,
            orbitClass: actor.orbitClass
          })) ?? [],
          endpoints: state?.endpoints ?? [],
          sourceLineage: state?.sourceLineage ?? null,
          activeWindowId: state?.productUx?.activeWindowId ?? null,
          timelineWindowIds:
            state?.simulationHandoverModel?.timelineWindowIds ?? null,
          requiredWindowNonClaimKeys:
            state?.simulationHandoverModel?.validationExpectations
              ?.requiredWindowNonClaimKeys ?? null,
          timelineNonClaims:
            state?.simulationHandoverModel?.timeline?.map((windowDefinition) => ({
              windowId: windowDefinition.windowId,
              nonClaims: windowDefinition.nonClaims
            })) ?? null
        },
        rootDataset: {
          v411GlanceRankSurface:
            productRoot?.dataset.m8aV411GlanceRankSurface ?? null,
          sliceScope: productRoot?.dataset.m8aV411SliceScope ?? null,
          microCueCopy:
            productRoot?.dataset.m8aV411SceneMicroCueCopy ?? null,
          provenance:
            productRoot?.dataset.m8aV411SourceProvenanceBadge ?? null,
          triplet:
            productRoot?.dataset.m8aV411GroundOrbitEvidenceTriplet ?? null,
          orbitClassChipCount:
            productRoot?.dataset.m8aV411OrbitClassChipCount ?? null
        },
        rootDatasetText: Object.values(productRoot?.dataset ?? {})
          .join(" ")
          .replace(/\\s+/g, " ")
          .trim(),
        visibleProductText: visibleTextNodes(productRoot).join(" "),
        annotation: {
          ...elementRecord(annotation),
          microCueCopy:
            annotation?.dataset.m8aV411SceneMicroCueCopy ?? null,
          maxWidthPx:
            annotation?.dataset.m8aV411SceneMicroCueMaxWidthPx ?? null,
          maxHeightPx:
            annotation?.dataset.m8aV411SceneMicroCueMaxHeightPx ?? null
        },
        provenance: {
          ...elementRecord(provenance),
          // Conv 3: badge is a ≤24×24 placeholder; data attributes preserved for smoke compat
          sourceProvider: provenance?.dataset.m8aV411SourceProvider ?? null,
          fetchedDate: provenance?.dataset.m8aV411FetchedDate ?? null,
          actorCount: provenance?.dataset.m8aV411ActorCount ?? null,
          badgeConv3Role: provenance?.dataset.m8aV411BadgeConv3Role ?? null,
          placeholderSizePx: provenance?.dataset.m8aV411BadgePlaceholderSizePx ?? null
        },
        // Conv 3: footer chip system replaces corner badge content
        footerChipRow: elementRecord(footerChipRow),
        footerTleChip: {
          ...elementRecord(footerTleChip),
          tleSource: footerTleChip?.dataset.m8aV411FooterChipTleSource ?? null,
          tleDate: footerTleChip?.dataset.m8aV411FooterChipTleDate ?? null
        },
        footerActorChip: {
          ...elementRecord(footerActorChip),
          actorCount: footerActorChip?.dataset.m8aV411FooterChipActorCount ?? null
        },
        sequenceRail: elementRecord(sequenceRail),
        strip: elementRecord(strip),
        details: {
          ...elementRecord(details),
          ariaExpanded:
            details instanceof HTMLElement
              ? details.getAttribute("aria-expanded")
              : null
        },
        truth: {
          ...elementRecord(truth),
          ariaExpanded:
            truth instanceof HTMLElement ? truth.getAttribute("aria-expanded") : null
        },
        sheet: {
          ...elementRecord(sheet),
          hidden: sheet instanceof HTMLElement ? sheet.hidden : null
        },
        boundarySurface: {
          ...elementRecord(boundarySurface),
          hidden:
            boundarySurface instanceof HTMLElement ? boundarySurface.hidden : null
        },
        transitionEvent: elementRecord(transitionEvent),
        orbitChips,
        groundStations,
        visibleRealDataChipTypes,
        slice2HoverPopoverPresent: Boolean(
          productRoot?.querySelector("[data-m8a-v411-hover-popover]")
        ),
        forbiddenScopeLeak: {
          transitionToast:
            Boolean(productRoot?.querySelector("[data-m8a-v411-transition-toast]")) ||
            isVisible(transitionEvent),
          sceneCue: /\\bscene cue\\b/i.test(productVisibleText),
          sourcesRole: Boolean(
            productRoot?.querySelector("[data-m8a-v411-sources-role]")
          ),
          r2Listing: /candidate endpoints|r2 listing|read-only catalog/i.test(
            productVisibleText
          )
        },
        resourceHits
      };
    })(${JSON.stringify(label)})`
  );
}

function assertPreservedInvariants(result) {
  const facts = result.stateFacts;

  assert(
    result.urlPath === REQUEST_PATH &&
      facts.route === REQUEST_PATH &&
      facts.endpointPairId === EXPECTED_ENDPOINT_PAIR_ID &&
      facts.acceptedPairPrecision === EXPECTED_PRECISION &&
      facts.modelId === EXPECTED_MODEL_ID &&
      facts.modelTruth === EXPECTED_MODEL_TRUTH,
    "Slice 1 must preserve route, endpoint pair, precision, and V4.6D truth: " +
      JSON.stringify({ urlPath: result.urlPath, facts })
  );
  assertListEquals(
    facts.orbitActorCounts,
    EXPECTED_ACTOR_COUNTS,
    "Slice 1 actor set"
  );
  assert(
    facts.actorCount === 13,
    `Slice 1 actor count must remain 13: ${JSON.stringify(facts)}`
  );
  assert(
    facts.sourceLineage?.projectionRead === EXPECTED_SOURCE_PROJECTION &&
      facts.sourceLineage?.rawPackageSideReadOwnership === "forbidden" &&
      facts.sourceLineage?.rawSourcePathsIncluded === false,
    "Slice 1 must preserve repo-owned projection/module runtime source boundary: " +
      JSON.stringify(facts.sourceLineage)
  );
  assertListEquals(
    facts.timelineWindowIds,
    EXPECTED_SEQUENCE_WINDOW_IDS,
    "Slice 1 V4.6D window order"
  );
  assert(
    facts.requiredWindowNonClaimKeys?.includes("noR2RuntimeSelector") &&
      facts.timelineNonClaims?.every(
        (window) => window.nonClaims?.noR2RuntimeSelector === true
      ),
    "Slice 1 must keep R2 read-only evidence/catalog support: " +
      JSON.stringify({
        requiredWindowNonClaimKeys: facts.requiredWindowNonClaimKeys,
        timelineNonClaims: facts.timelineNonClaims
      })
  );
  assert(
    result.sheet.hidden === true &&
      result.boundarySurface.hidden === true &&
      result.details.ariaExpanded === "false" &&
      (!result.truth.exists || result.truth.ariaExpanded === "false"),
    "Slice 1 must not change Details / boundary default closed behavior: " +
      JSON.stringify({
        sheet: result.sheet,
        boundarySurface: result.boundarySurface,
        details: result.details,
        truth: result.truth
      })
  );
}

function assertSlice1Surface(result, viewport) {
  assert(
    result.rootDataset.v411GlanceRankSurface === EXPECTED_V411_VERSION &&
      result.rootDataset.sliceScope === "slice1-glance-rank-surface",
    "Slice 1 runtime seam is missing: " + JSON.stringify(result.rootDataset)
  );
  assert(
    result.annotation.visible &&
      result.annotation.microCueCopy === EXPECTED_MICRO_CUE &&
      result.annotation.text === EXPECTED_MICRO_CUE &&
      result.annotation.rect.width <= 180.5 &&
      result.annotation.rect.height <= 24.5,
    `${viewport.name} scene annotation must be the Slice 1 micro-cue budget: ` +
      JSON.stringify(result.annotation)
  );
  assert(
    !/LEO is the simulated review focus|Next: watch for pressure|Watch: representative/i.test(
      result.annotation.text
    ),
    `${viewport.name} must not keep the old 360px narrative text visible: ` +
      JSON.stringify(result.annotation)
  );
  assert(
    result.orbitChips.length === 13 &&
      result.stateFacts.actors.every((actor) => {
        const expected =
          actor.orbitClass === "leo"
            ? "LEO"
            : actor.orbitClass === "meo"
              ? "MEO"
              : "GEO";
        return result.orbitChips.some(
          (chip) =>
            chip.actorId === actor.actorId &&
            chip.orbitClass === expected &&
            chip.text === expected
        );
      }),
    `${viewport.name} must have one orbit-class chip for each of the 13 actors: ` +
      JSON.stringify({
        actors: result.stateFacts.actors,
        orbitChips: result.orbitChips
      })
  );
  assert(
    result.groundStations.length === 2 &&
      result.groundStations.every(
        (station) =>
          station.visible &&
          station.shortChip.isShortChip &&
          station.shortChip.copy === EXPECTED_GROUND_SHORT_CHIP_COPY &&
          Number(station.shortChip.maxWidthPx) ===
            EXPECTED_GROUND_SHORT_CHIP_MAX_WIDTH_PX &&
          Number(station.shortChip.maxHeightPx) ===
            EXPECTED_GROUND_SHORT_CHIP_MAX_HEIGHT_PX &&
          station.rect.width <= EXPECTED_GROUND_SHORT_CHIP_MAX_WIDTH_PX + 0.5 &&
          station.rect.height <=
            EXPECTED_GROUND_SHORT_CHIP_MAX_HEIGHT_PX + 0.5 &&
          station.strengthTokens.length === 3 &&
          station.strengthTokens.every(
            (token) =>
              token.strength === "strong" &&
              token.openSourcesAction === null &&
              token.sourcesTrigger === null &&
              token.sourcesOrbitClass === null
          )
      ),
    `${viewport.name} must show Addendum 1.5 short chip ≤96×18 as glance evidence without direct Sources triggers (Conv 4 demotion): ` +
      JSON.stringify(result.groundStations)
  );
  // Conv 3 Smoke Softening: corner badge is a ≤24×24 invisible placeholder; content moved to footer chip system
  // Old: badge visible with text "TLE: CelesTrak NORAD GP · fetched 2026-04-26 · 13 actors"
  // New: badge is placeholder ≤24×24 (visible=false), footer chip row has TLE source + date + actor count
  assert(
    result.provenance.badgeConv3Role === "placeholder-non-visible" &&
      result.provenance.sourceProvider === "CelesTrak" &&
      result.provenance.fetchedDate === "2026-04-26" &&
      result.footerTleChip.visible &&
      result.footerTleChip.tleSource === "CelesTrak NORAD GP" &&
      result.footerTleChip.tleDate === "2026-04-26" &&
      result.footerChipRow.visible,
    `${viewport.name} must have corner badge as ≤24×24 placeholder with footer chip system containing TLE source (Conv 3 Softening): ` +
      JSON.stringify({
        provenance: result.provenance,
        footerTleChip: result.footerTleChip,
        footerChipRow: result.footerChipRow
      })
  );
  assert(
    new Set(result.visibleRealDataChipTypes).size >= 4,
    `${viewport.name} must show at least four distinct real-data chips by default: ` +
      JSON.stringify(result.visibleRealDataChipTypes)
  );
  assert(
    result.sequenceRail.visible && result.strip.visible,
    `${viewport.name} must preserve sequence rail and control strip: ` +
      JSON.stringify({ sequenceRail: result.sequenceRail, strip: result.strip })
  );
  assert(
    result.forbiddenScopeLeak.r2Listing === false,
    `${viewport.name} leaked visible R2 listing into the Slice 1 surface: ` +
      JSON.stringify(result.forbiddenScopeLeak)
  );
  assertForbiddenClaimScan(result, viewport.name);
}

async function run() {
  ensureOutputRoot(outputRoot);
  const captures = [];

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    for (const viewport of VIEWPORTS) {
      await setViewport(client, viewport);
      await navigateAndWait(client, baseUrl);
      await resetDefaultWindow(client);
      const result = await inspectSlice1(client, viewport.name);
      assertPreservedInvariants(result);
      assertSlice1Surface(result, viewport);
      const screenshotPath = await captureScreenshot(
        client,
        outputRoot,
        viewport.screenshot
      );
      const metadataPath = writeJsonArtifact(outputRoot, viewport.metadata, {
        viewport,
        screenshot: path.relative(repoRoot, screenshotPath),
        result
      });
      captures.push({
        viewport: viewport.name,
        screenshot: path.relative(repoRoot, screenshotPath),
        metadata: path.relative(repoRoot, metadataPath),
        annotationRect: result.annotation.rect,
        visibleRealDataChipTypes: result.visibleRealDataChipTypes
      });
    }

    const manifestPath = writeJsonArtifact(outputRoot, "capture-manifest.json", {
      route: REQUEST_PATH,
      version: EXPECTED_V411_VERSION,
      captures
    });

    console.log(
      JSON.stringify(
        {
          status: "passed",
          outputRoot: path.relative(repoRoot, outputRoot),
          manifest: path.relative(repoRoot, manifestPath),
          captures
        },
        null,
        2
      )
    );
  });
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
