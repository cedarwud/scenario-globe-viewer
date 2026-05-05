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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-conv1");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_VISUAL_TOKENS_VERSION =
  "m8a-v4.11-visual-tokens-conv1-runtime.v1";
const EXPECTED_VISUAL_TOKEN_DATA_SOURCE =
  "m8a-v4.11-visual-tokens-conv1";
const EXPECTED_SCENE_CONTEXT_CHIP_VERSION =
  "m8a-v4.11-scene-context-chip-conv1-runtime.v1";
const EXPECTED_SCENE_CONTEXT_CHIP_COPY =
  "13 顆衛星模擬展示 · 完整 ≥500 LEO 多軌道驗證見後續階段";
const EXPECTED_SCENE_CONTEXT_CHIP_MAX_WIDTH = 380;
const EXPECTED_SCENE_CONTEXT_CHIP_MAX_HEIGHT = 28;
const EXPECTED_SCENE_CONTEXT_CHIP_FONT_SIZE = 14;
const EXPECTED_W3_RADIUS_METERS = 800_000;
const EXPECTED_GROUND_SHORT_CHIP_COPY = "LEO MEO GEO ✓";
const EXPECTED_GROUND_SHORT_CHIP_MAX_WIDTH_PX = 96;
const EXPECTED_GROUND_SHORT_CHIP_MAX_HEIGHT_PX = 18;
const EXPECTED_GROUND_SHORT_CHIP_FONT_SIZE_PX = 11;
const EXPECTED_DEMOTED_OPACITY = 0.3;
const EXPECTED_GLANCE_VERSION =
  "m8a-v4.11-glance-rank-surface-slice1-runtime.v1";
const EXPECTED_PROVENANCE_BADGE =
  "TLE: CelesTrak NORAD GP · fetched 2026-04-26 · 13 actors";

const WINDOW_TOKEN_PAIRS = [
  { windowId: "leo-acquisition-context", tokenId: "W1", screenshot: "v4.11-conv1-w1-1440x900.png" },
  { windowId: "leo-aging-pressure", tokenId: "W2", screenshot: "v4.11-conv1-w2-1440x900.png" },
  { windowId: "meo-continuity-hold", tokenId: "W3", screenshot: "v4.11-conv1-w3-1440x900.png" },
  { windowId: "leo-reentry-candidate", tokenId: "W4", screenshot: "v4.11-conv1-w4-1440x900.png" },
  { windowId: "geo-continuity-guard", tokenId: "W5", screenshot: "v4.11-conv1-w5-1440x900.png" }
];

const WINDOW_RATIO_MIDPOINTS = {
  "leo-acquisition-context": 0.1,
  "leo-aging-pressure": 0.3,
  "meo-continuity-hold": 0.5,
  "leo-reentry-candidate": 0.71,
  "geo-continuity-guard": 0.91
};

const VIEWPORT = {
  width: 1440,
  height: 900,
  defaultScreenshot: "v4.11-conv1-default-1440x900.png"
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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
          visualTokens: productRoot?.dataset.m8aV411VisualTokens ?? null,
          glance: productRoot?.dataset.m8aV411GlanceRankSurface ?? null,
          hasCapture: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );
    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.visualTokens === EXPECTED_VISUAL_TOKENS_VERSION &&
      lastState?.glance === EXPECTED_GLANCE_VERSION &&
      lastState?.hasCapture === true
    ) {
      return lastState;
    }
    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `Conv 1 visual-tokens route hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }
    await sleep(100);
  }
  throw new Error(
    `Conv 1 visual-tokens route did not reach a ready state: ${JSON.stringify(lastState)}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "Conv 1 visual-tokens");
}

async function seekToWindow(client, windowId) {
  const ratio = WINDOW_RATIO_MIDPOINTS[windowId];
  await evaluateRuntimeValue(
    client,
    `((ratio) => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const replayClock = capture?.replayClock;
      const replayState = replayClock?.getState?.();
      capture?.m8aV4GroundStationScene?.pause?.();
      if (replayClock && replayState?.startTime && replayState?.stopTime) {
        const start = Date.parse(replayState.startTime);
        const stop = Date.parse(replayState.stopTime);
        replayClock.seek(
          new Date(start + (stop - start) * ratio).toISOString()
        );
        capture?.m8aV4GroundStationScene?.pause?.();
      }
    })(${JSON.stringify(ratio)})`
  );
  await sleep(420);
}

async function inspect(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const normalize = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
      const productRoot = document.querySelector(
        "[data-m8a-v47-product-ux='true']"
      );
      const sceneContextChip = productRoot?.querySelector(
        "[data-m8a-v411-scene-context-chip='true']"
      );
      const groundStationChips = Array.from(
        productRoot?.querySelectorAll(
          "[data-m8a-v411-ground-station-chip='true']"
        ) ?? []
      ).map((chip) => {
        const rect = chip.getBoundingClientRect();
        return {
          endpointId:
            chip.dataset.m8aV411GroundStationEndpointId ?? null,
          isShortChip:
            chip.dataset.m8aV411GroundStationShortChip === "true",
          copy: chip.dataset.m8aV411GroundShortChipCopy ?? null,
          rect: { width: rect.width, height: rect.height },
          fontSizePx: Number.parseFloat(getComputedStyle(chip).fontSize),
          visible: !chip.hidden && rect.width > 0 && rect.height > 0
        };
      });
      const provenance = productRoot?.querySelector(
        "[data-m8a-v411-provenance-badge='true']"
      );
      const provenanceText = provenance
        ? normalize(provenance.textContent)
        : "";
      const provenanceVisible = Boolean(
        provenance &&
          !provenance.hidden &&
          provenance.getBoundingClientRect().width > 0
      );
      const sceneContextChipRect = sceneContextChip
        ? sceneContextChip.getBoundingClientRect()
        : null;
      const sceneContextChipStyle = sceneContextChip
        ? getComputedStyle(sceneContextChip)
        : null;
      const orbitChips = Array.from(
        productRoot?.querySelectorAll(
          "[data-m8a-v411-orbit-class-chip='true']"
        ) ?? []
      );
      const demotedActorOpacities = orbitChips
        .filter(
          (chip) => chip.dataset.m8aV411OrbitChipDemoted === "true"
        )
        .map((chip) => Number.parseFloat(chip.style.opacity || "1"));
      const promotedActorOpacities = orbitChips
        .filter(
          (chip) => chip.dataset.m8aV411OrbitChipDemoted === "false"
        )
        .map((chip) => Number.parseFloat(chip.style.opacity || "1"));
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const viewer = capture?.viewer;
      const tokenDataSource = viewer?.dataSources?.getByName(
        "${EXPECTED_VISUAL_TOKEN_DATA_SOURCE}"
      )?.[0];
      const tokenEntities = tokenDataSource
        ? tokenDataSource.entities.values.map((entity) => ({
            id: entity.id,
            name: entity.name,
            show: entity.isShowing,
            hasPolyline: Boolean(entity.polyline),
            hasEllipse: Boolean(entity.ellipse),
            hasBillboard: Boolean(entity.billboard),
            hasLabel: Boolean(entity.label),
            hasDistanceCondition:
              Boolean(entity.polyline?.distanceDisplayCondition) ||
              Boolean(entity.ellipse?.distanceDisplayCondition) ||
              Boolean(entity.billboard?.distanceDisplayCondition) ||
              Boolean(entity.label?.distanceDisplayCondition)
          }))
        : [];
      const visibleTokenEntityIds = tokenEntities
        .filter((entity) => entity.show)
        .map((entity) => entity.id);
      const w3Entity = tokenEntities.find((entity) =>
        entity.id === "m8a-v4.11-w3-breathing-disk"
      );
      const w3SemiMajorProp = tokenDataSource?.entities
        ?.getById?.("m8a-v4.11-w3-breathing-disk")
        ?.ellipse?.semiMajorAxis;
      const evalTime = viewer?.clock?.currentTime;
      const w3SemiMajor =
        w3SemiMajorProp && evalTime
          ? w3SemiMajorProp.getValue(evalTime)
          : null;
      const sceneState =
        capture?.m8aV4GroundStationScene?.getState?.();
      return {
        rootDataset: {
          visualTokens:
            productRoot?.dataset.m8aV411VisualTokens ?? null,
          visualTokenScope:
            productRoot?.dataset.m8aV411VisualTokenScope ?? null,
          visualTokenActiveId:
            productRoot?.dataset.m8aV411VisualTokenActiveId ?? null,
          visualTokenW3RadiusMeters:
            productRoot?.dataset.m8aV411VisualTokenW3RadiusMeters ?? null,
          sceneContextChip:
            productRoot?.dataset.m8aV411SceneContextChip ?? null,
          glance: productRoot?.dataset.m8aV411GlanceRankSurface ?? null,
          demotedActorOpacity:
            productRoot?.dataset.m8aV411DemotedActorOpacity ?? null,
          groundShortChipCopy:
            productRoot?.dataset.m8aV411GroundShortChipCopy ?? null
        },
        sceneContextChip: {
          exists: Boolean(sceneContextChip),
          visible: Boolean(
            sceneContextChip &&
              !sceneContextChip.hidden &&
              sceneContextChipRect &&
              sceneContextChipRect.width > 0 &&
              sceneContextChipRect.height > 0
          ),
          text: sceneContextChip
            ? normalize(sceneContextChip.textContent)
            : "",
          rect: sceneContextChipRect
            ? {
                width: sceneContextChipRect.width,
                height: sceneContextChipRect.height,
                top: sceneContextChipRect.top
              }
            : null,
          fontSize: sceneContextChipStyle
            ? Number.parseFloat(sceneContextChipStyle.fontSize)
            : null
        },
        groundStationChips,
        provenance: {
          visible: provenanceVisible,
          text: provenanceText
        },
        demotedActorOpacities,
        promotedActorOpacities,
        tokenEntities,
        visibleTokenEntityIds,
        w3SemiMajor,
        activeWindowId:
          sceneState?.simulationHandoverModel?.window?.windowId ?? null,
        actorCount: sceneState?.actorCount ?? null
      };
    })()`
  );
}

function expectedShownEntityPrefixes(tokenId) {
  switch (tokenId) {
    case "W1":
      return ["m8a-v4.11-w1-rising-arc-segment-"];
    case "W2":
      return [
        "m8a-v4.11-w2-fading-arc-past-",
        "m8a-v4.11-w2-fading-arc-future-"
      ];
    case "W3":
      return ["m8a-v4.11-w3-breathing-disk"];
    case "W4":
      return [
        "m8a-v4.11-w4-candidate-entry-cue",
        "m8a-v4.11-w4-candidate-halo",
        "m8a-v4.11-w4-candidate-label"
      ];
    case "W5":
      return ["m8a-v4.11-w5-steady-ring"];
    default:
      return [];
  }
}

function assertVisibleTokensExclusively(result, tokenId, label) {
  const prefixes = expectedShownEntityPrefixes(tokenId);
  for (const entity of result.tokenEntities) {
    const matchesPrefix = prefixes.some((prefix) =>
      entity.id.startsWith(prefix)
    );
    if (matchesPrefix) {
      assert(
        entity.show === true,
        `${label}: token ${tokenId} expected entity ${entity.id} to be visible: ` +
          JSON.stringify(entity)
      );
    } else {
      assert(
        entity.show === false,
        `${label}: token ${tokenId} expected entity ${entity.id} to be hidden (cross-window leak): ` +
          JSON.stringify(entity)
      );
    }
  }
  assert(
    result.rootDataset.visualTokenActiveId === tokenId,
    `${label}: rootDataset.visualTokenActiveId must be ${tokenId} (got ${result.rootDataset.visualTokenActiveId})`
  );
}

function assertSceneContextChip(result, label) {
  assert(
    result.sceneContextChip.exists,
    `${label}: scene-context chip must be present`
  );
  assert(
    result.sceneContextChip.visible,
    `${label}: scene-context chip must be visible by default`
  );
  assert(
    result.sceneContextChip.text === EXPECTED_SCENE_CONTEXT_CHIP_COPY,
    `${label}: scene-context chip copy mismatch: ${JSON.stringify(result.sceneContextChip)}`
  );
  assert(
    result.sceneContextChip.rect.width <=
      EXPECTED_SCENE_CONTEXT_CHIP_MAX_WIDTH + 0.5 &&
      result.sceneContextChip.rect.height <=
        EXPECTED_SCENE_CONTEXT_CHIP_MAX_HEIGHT + 0.5,
    `${label}: scene-context chip exceeds budget ≤${EXPECTED_SCENE_CONTEXT_CHIP_MAX_WIDTH}×${EXPECTED_SCENE_CONTEXT_CHIP_MAX_HEIGHT}: ` +
      JSON.stringify(result.sceneContextChip)
  );
  assert(
    Math.abs(result.sceneContextChip.fontSize -
      EXPECTED_SCENE_CONTEXT_CHIP_FONT_SIZE) < 0.5,
    `${label}: scene-context chip font size must be ${EXPECTED_SCENE_CONTEXT_CHIP_FONT_SIZE}px (got ${result.sceneContextChip.fontSize})`
  );
  assert(
    result.rootDataset.sceneContextChip ===
      EXPECTED_SCENE_CONTEXT_CHIP_VERSION,
    `${label}: rootDataset.sceneContextChip mismatch: ${result.rootDataset.sceneContextChip}`
  );
}

function assertGroundStationShortChips(result, label) {
  assert(
    result.groundStationChips.length === 2,
    `${label}: must have 2 ground-station short chips: ${JSON.stringify(result.groundStationChips)}`
  );
  for (const chip of result.groundStationChips) {
    assert(
      chip.isShortChip,
      `${label}: ground-station chip ${chip.endpointId} missing data-m8a-v411-ground-station-short-chip="true"`
    );
    assert(
      chip.copy === EXPECTED_GROUND_SHORT_CHIP_COPY,
      `${label}: ground-station ${chip.endpointId} copy mismatch (expected ${EXPECTED_GROUND_SHORT_CHIP_COPY}): ${chip.copy}`
    );
    assert(
      chip.rect.width <= EXPECTED_GROUND_SHORT_CHIP_MAX_WIDTH_PX + 0.5 &&
        chip.rect.height <= EXPECTED_GROUND_SHORT_CHIP_MAX_HEIGHT_PX + 0.5,
      `${label}: ground-station ${chip.endpointId} exceeds Addendum 1.5 budget ≤96×18: ${JSON.stringify(chip.rect)}`
    );
    assert(
      Math.abs(chip.fontSizePx - EXPECTED_GROUND_SHORT_CHIP_FONT_SIZE_PX) < 0.5,
      `${label}: ground-station ${chip.endpointId} font size must be 11px (got ${chip.fontSizePx})`
    );
  }
}

function assertW3Radius(result, label) {
  assert(
    Number(result.rootDataset.visualTokenW3RadiusMeters) ===
      EXPECTED_W3_RADIUS_METERS,
    `${label}: W3 radius dataset must be ${EXPECTED_W3_RADIUS_METERS} m (got ${result.rootDataset.visualTokenW3RadiusMeters})`
  );
  assert(
    result.w3SemiMajor === EXPECTED_W3_RADIUS_METERS,
    `${label}: W3 disk semiMajorAxis must be ${EXPECTED_W3_RADIUS_METERS} m (got ${result.w3SemiMajor})`
  );
}

function assertW4W5DistanceCondition(result, label) {
  for (const entity of result.tokenEntities) {
    if (
      entity.id.startsWith("m8a-v4.11-w4-candidate-") ||
      entity.id === "m8a-v4.11-w5-steady-ring"
    ) {
      assert(
        entity.hasDistanceCondition,
        `${label}: ${entity.id} must have DistanceDisplayCondition (depth-test policy gate)`
      );
    }
  }
}

function assertDemotedActorOpacity(result, label) {
  assert(
    result.demotedActorOpacities.length > 0,
    `${label}: expect at least one demoted (context) actor with 30% opacity`
  );
  for (const opacity of result.demotedActorOpacities) {
    assert(
      Math.abs(opacity - EXPECTED_DEMOTED_OPACITY) < 0.001,
      `${label}: demoted actor opacity must be 0.3 (got ${opacity})`
    );
  }
  for (const opacity of result.promotedActorOpacities) {
    assert(
      opacity > 0.99,
      `${label}: promoted actor opacity must be ~1.0 (got ${opacity})`
    );
  }
}

function assertCornerProvenancePreserved(result, label) {
  // Conv 3 Smoke Softening: corner badge is now a ≤24×24 invisible placeholder
  // Original assertion: badge.visible && badge.text === EXPECTED_PROVENANCE_BADGE
  // Updated: badge is invisible placeholder (visible=false)
  assert(
    result.provenance.visible === false,
    `${label}: corner provenance badge must be invisible placeholder after Conv 3 (content moved to footer chip): ${JSON.stringify(result.provenance)}`
  );
}

async function run() {
  ensureOutputRoot(outputRoot);
  const captures = [];

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT);
    await navigateAndWait(client, baseUrl);

    const defaultResult = await inspect(client);
    assertSceneContextChip(defaultResult, "default");
    assertGroundStationShortChips(defaultResult, "default");
    assertCornerProvenancePreserved(defaultResult, "default");
    assertVisibleTokensExclusively(
      defaultResult,
      defaultResult.rootDataset.visualTokenActiveId,
      "default"
    );
    assertW3Radius(defaultResult, "default");
    assertW4W5DistanceCondition(defaultResult, "default");
    assertDemotedActorOpacity(defaultResult, "default");
    const defaultScreenshotPath = await captureScreenshot(
      client,
      outputRoot,
      VIEWPORT.defaultScreenshot
    );
    captures.push({
      label: "default",
      screenshot: path.relative(repoRoot, defaultScreenshotPath),
      activeWindowId: defaultResult.activeWindowId,
      activeTokenId: defaultResult.rootDataset.visualTokenActiveId
    });

    for (const pair of WINDOW_TOKEN_PAIRS) {
      await seekToWindow(client, pair.windowId);
      const result = await inspect(client);
      assert(
        result.activeWindowId === pair.windowId,
        `${pair.tokenId}: failed to seek into ${pair.windowId} (got ${result.activeWindowId})`
      );
      assertVisibleTokensExclusively(result, pair.tokenId, pair.tokenId);
      assertSceneContextChip(result, pair.tokenId);
      assertGroundStationShortChips(result, pair.tokenId);
      assertCornerProvenancePreserved(result, pair.tokenId);
      assertW3Radius(result, pair.tokenId);
      assertW4W5DistanceCondition(result, pair.tokenId);
      assertDemotedActorOpacity(result, pair.tokenId);
      const screenshotPath = await captureScreenshot(
        client,
        outputRoot,
        pair.screenshot
      );
      captures.push({
        label: pair.tokenId,
        windowId: pair.windowId,
        screenshot: path.relative(repoRoot, screenshotPath),
        visibleTokenEntityIds: result.visibleTokenEntityIds
      });
    }

    const manifestPath = writeJsonArtifact(
      outputRoot,
      "capture-manifest.json",
      {
        route: REQUEST_PATH,
        version: EXPECTED_VISUAL_TOKENS_VERSION,
        sceneContextChipVersion: EXPECTED_SCENE_CONTEXT_CHIP_VERSION,
        captures
      }
    );

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
