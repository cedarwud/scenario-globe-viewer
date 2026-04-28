import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  connectCdp,
  evaluateRuntimeValue,
  findHeadlessBrowser,
  resolvePageWebSocketUrl,
  startHeadlessBrowser,
  stopHeadlessBrowser
} from "./bootstrap-smoke-browser.mjs";
import {
  ensureDistBuildExists,
  startStaticServer,
  stopStaticServer,
  verifyFetches
} from "./bootstrap-smoke-server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const FORBIDDEN_VISIBLE_PATTERNS = [
  /\bbeam\b/i,
  /\blink\b/i,
  /\bserving\b/i,
  /active gateway/i,
  /active serving/i,
  /handover event/i,
  /teleport path/i,
  /pair-specific/i,
  /measured latency/i,
  /measured jitter/i,
  /measured throughput/i,
  /native rf handover/i
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 480
  });
}

async function waitForBootstrapReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;

        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          hasV4Seam: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasV4Seam
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.6E validation did not reach a ready V4 scene: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, url) {
  await client.send("Page.navigate", { url });
  await waitForBootstrapReady(client);
  await sleep(250);
}

async function seekReplayRatio(client, ratio) {
  await evaluateRuntimeValue(
    client,
    `((ratio) => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const replayClock = capture?.replayClock;
      const replayState = replayClock?.getState?.();
      const startMs = Date.parse(replayState.startTime);
      const stopMs = Date.parse(replayState.stopTime);
      const targetMs = startMs + (stopMs - startMs) * ratio;

      replayClock.pause();
      replayClock.seek(new Date(targetMs).toISOString());
    })(${JSON.stringify(ratio)})`
  );
  await sleep(250);
}

async function inspectVisualLanguage(client, options) {
  return await evaluateRuntimeValue(
    client,
    `((config) => {
      const assert = (condition, message) => {
        if (!condition) {
          throw new Error(message);
        }
      };
      const rectToPlain = (rect) => ({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left
      });
      const visibleText = document.body.innerText;
      const forbiddenVisibleHits = config.forbiddenVisiblePatterns
        .map((source) => new RegExp(source.source, source.flags))
        .filter((pattern) => pattern.test(visibleText))
        .map((pattern) => pattern.toString());
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const root = document.querySelector(
        "[data-m8a-v4-ground-station-scene='true']"
      );
      const dataSource = capture?.viewer?.dataSources?.getByName?.(
        state?.dataSourceName
      )?.[0];
      const entities = dataSource?.entities?.values ?? [];
      const ribbonEntities = entities.filter((entity) =>
        /^m8a-v46e-simulation-.*-context-ribbon$/.test(entity.id)
      );
      const fallbackRibbon = entities.find(
        (entity) => entity.id === "m8a-v46e-simulation-fallbackContext-context-ribbon"
      );
      const guardCue = entities.find(
        (entity) => entity.id === "m8a-v46e-simulation-geo-guard-cue"
      );
      const actorLabelRecords = (state?.actors ?? []).map((actor) => {
        const entity = dataSource?.entities?.getById?.(actor.actorId);

        return {
          actorId: actor.actorId,
          orbitClass: actor.orbitClass,
          emphasis: actor.emphasis,
          labelVisibility: actor.labelVisibility,
          hasEntityLabel: Boolean(entity?.label)
        };
      });
      const hudRect = root ? rectToPlain(root.getBoundingClientRect()) : null;
      const visibleHudLabels = root
        ? Array.from(
            root.querySelectorAll(
              [
                ".m8a-v4-ground-station-scene__header",
                ".m8a-v4-ground-station-scene__endpoint",
                ".m8a-v4-ground-station-scene__stage",
                ".m8a-v4-ground-station-scene__role-legend > *",
                ".m8a-v4-ground-station-scene__ribbon-summary > *",
                ".m8a-v4-ground-station-scene__nonclaims"
              ].join(", ")
            )
          ).filter(
            (element) =>
              element instanceof HTMLElement &&
              getComputedStyle(element).display !== "none" &&
              element.getBoundingClientRect().width > 0 &&
              element.getBoundingClientRect().height > 0
          )
        : [];

      assert(state, "Missing V4.6E runtime state.");
      assert(root instanceof HTMLElement, "Missing V4.6E HUD telemetry root.");
      assert(
        root.hidden === true &&
          root.getAttribute("aria-hidden") === "true" &&
          root.dataset.m8aV4GroundStationSceneVisibility === "hidden" &&
          root.dataset.m8aV46eVisualLanguage === "true",
        "V4.6E floating HUD must stay hidden while preserving the runtime seam."
      );
      assert(
        hudRect &&
          hudRect.width === 0 &&
          hudRect.height === 0 &&
          hudRect.left >= 0 &&
          hudRect.right <= window.innerWidth &&
          hudRect.top >= 0 &&
          hudRect.bottom <= window.innerHeight,
        "V4.6E hidden HUD root must not occupy scene pixels: " +
          JSON.stringify({ hudRect, viewport: { width: window.innerWidth, height: window.innerHeight } })
      );
      assert(
        visibleHudLabels.length === 0,
        "V4.6E hidden HUD must not leave visible labels in the scene: " +
          JSON.stringify({ visibleHudLabelCount: visibleHudLabels.length })
      );
      assert(
        state.actorLabelDensity.v46ePolicy ===
          "active-representative-label-with-endpoint-priority" &&
          state.actorLabelDensity.endpointLabelsPriority === true &&
          state.actorLabelDensity.candidateLabelsVisibleByDefault === false &&
          state.actorLabelDensity.preferredVisibleActorLabelCount === 1 &&
          state.actorLabelDensity.visibleActorLabelCount ===
            state.actorLabelDensity.visibleActorLabelIds.length,
        "V4.6E label-density policy is not machine-readable: " +
          JSON.stringify(state.actorLabelDensity)
      );
      assert(
        state.actorLabelDensity.viewportClass === config.expectedViewportClass,
        "V4.6E viewport class mismatch: " +
          JSON.stringify(state.actorLabelDensity)
      );
      assert(
        state.actorLabelDensity.visibleActorLabelCount <= config.maxActorLabels &&
          state.actorLabelDensity.visibleActorLabelCount === 1,
        "V4.6E actor label density exceeded limit: " +
          JSON.stringify(state.actorLabelDensity)
      );
      assert(
        actorLabelRecords.every((record) =>
          record.labelVisibility === "always-visible"
            ? record.hasEntityLabel === true
            : record.hasEntityLabel === false
        ),
        "V4.6E Cesium actor labels must match label-density state: " +
          JSON.stringify(actorLabelRecords)
      );
      assert(
        actorLabelRecords
          .filter((record) => record.emphasis === "candidate")
          .every((record) => record.labelVisibility === "hidden-context"),
        "V4.6E candidate labels must remain hidden by default: " +
          JSON.stringify(actorLabelRecords)
      );
      if (state.simulationHandoverModel.window.displayRepresentativeOrbitClass !== "geo") {
        assert(
          state.actorLabelDensity.visibleActorLabelIds.every(
            (actorId) => !state.simulationHandoverModel.window.fallbackContextActorIds.includes(actorId)
          ),
          "V4.6E fallback label must stay hidden outside GEO guard state."
        );
      }
      assert(
        state.relationCues.visibleContextRibbonCount <= 2 &&
          ribbonEntities.length === state.relationCues.visibleContextRibbonCount &&
          !fallbackRibbon,
        "V4.6E must render at most representative + candidate context ribbons: " +
          JSON.stringify({
            relationCues: state.relationCues,
            ribbonIds: ribbonEntities.map((entity) => entity.id)
          })
      );
      assert(
        guardCue?.billboard,
        "V4.6E low-opacity GEO guard cue is missing."
      );
      assert(
        state.relationCues.fallbackFullRibbonVisible === false,
        "V4.6E fallback must not create a separate full context ribbon."
      );
      assert(
        config.expectedGuardCueMode
          ? state.relationCues.fallbackGuardCueMode === config.expectedGuardCueMode
          : true,
        "V4.6E fallback guard cue mode mismatch: " +
          JSON.stringify(state.relationCues)
      );
      assert(
        forbiddenVisibleHits.length === 0,
        "V4.6E visible forbidden-claim scan failed: " +
          JSON.stringify({ forbiddenVisibleHits, visibleText })
      );

      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          class: state.actorLabelDensity.viewportClass
        },
        activeStateLabel: root.dataset.activeStateLabel,
        visibleActorLabelIds: state.actorLabelDensity.visibleActorLabelIds,
        visibleContextRibbonCount: state.relationCues.visibleContextRibbonCount,
        fallbackGuardCueMode: state.relationCues.fallbackGuardCueMode,
        hudHidden: root.hidden,
        hudRect,
        ribbonIds: ribbonEntities.map((entity) => entity.id)
      };
    })(${JSON.stringify({
      forbiddenVisiblePatterns: FORBIDDEN_VISIBLE_PATTERNS.map((pattern) => ({
        source: pattern.source,
        flags: pattern.flags
      })),
      expectedViewportClass: options.expectedViewportClass,
      maxActorLabels: options.maxActorLabels,
      expectedGuardCueMode: options.expectedGuardCueMode ?? null
    })})`
  );
}

async function main() {
  ensureDistBuildExists();

  const browserCommand = findHeadlessBrowser();
  let serverHandle = null;
  let browserHandle = null;
  let client = null;

  try {
    serverHandle = await startStaticServer();
    await verifyFetches(serverHandle.baseUrl);

    browserHandle = await startHeadlessBrowser(browserCommand);
    const pageWebSocketUrl = await resolvePageWebSocketUrl(
      browserHandle.browserWebSocketUrl
    );
    client = await connectCdp(pageWebSocketUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    await setViewport(client, { width: 1440, height: 900 });
    await navigateAndWait(client, `${serverHandle.baseUrl}${REQUEST_PATH}`);
    const desktopResult = await inspectVisualLanguage(client, {
      expectedViewportClass: "desktop",
      maxActorLabels: 3,
      expectedGuardCueMode: "low-opacity-geo-guard-cue"
    });

    await seekReplayRatio(client, 0.9);
    const geoGuardResult = await inspectVisualLanguage(client, {
      expectedViewportClass: "desktop",
      maxActorLabels: 3,
      expectedGuardCueMode: "representative-context-ribbon-in-geo-continuity-guard"
    });

    await setViewport(client, { width: 390, height: 844 });
    await navigateAndWait(client, `${serverHandle.baseUrl}${REQUEST_PATH}`);
    const narrowResult = await inspectVisualLanguage(client, {
      expectedViewportClass: "narrow",
      maxActorLabels: 1,
      expectedGuardCueMode: "low-opacity-geo-guard-cue"
    });

    console.log(
      `M8A-V4.6E handover visual-language runtime smoke passed: ${JSON.stringify(
        {
          desktopResult,
          geoGuardResult,
          narrowResult,
          runtimeProcessFacts: {
            serverPid: serverHandle.server.pid,
            browserPid: browserHandle.browserProcess.pid
          }
        }
      )}`
    );
  } finally {
    if (client) {
      await client.close();
    }

    if (browserHandle) {
      await stopHeadlessBrowser(browserHandle);
    }

    if (serverHandle) {
      await stopStaticServer(serverHandle.server);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
