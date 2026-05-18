import {
  assert,
  setViewport,
  sleep,
  withStaticSmokeBrowser
} from "./helpers/m8a-v4-browser-capture-harness.mjs";
import {
  EXPECTED_PRODUCT_COPY,
  EXPECTED_TRANSITION_DURATION_MS,
  VIEWPORTS
} from "./helpers/m8a-v4-product-comprehension-data.mjs";
import {
  navigateAndWait,
  seekReplayRatio
} from "./helpers/m8a-v4-product-comprehension-navigation.mjs";
import {
  assertDefaultVisualEvidence,
  assertPersistentLayer,
  assertPreservedScenarioFacts,
  assertProductCopy,
  assertSceneNearMeaning,
  capturePersistentLayer,
  closeInspector
} from "./helpers/m8a-v4-product-comprehension-persistent-checks.mjs";
import {
  verifyForcedUnreliableAnchorFallback,
  verifyTruthAffordanceOpensBoundarySurface
} from "./helpers/m8a-v4-product-comprehension-interaction-checks.mjs";
import { verifyInspectorLayerForWindows } from "./helpers/m8a-v4-product-comprehension-inspector-checks.mjs";
import { verifyTransitionEventLayer } from "./helpers/m8a-v4-product-comprehension-transition-checks.mjs";

async function verifyViewport(client, viewport) {
  await setViewport(client, viewport);
  await sleep(180);

  const results = [];

  for (const [windowId, expected] of Object.entries(EXPECTED_PRODUCT_COPY)) {
    await closeInspector(client);
    await seekReplayRatio(client, expected.ratio);

    const result = await capturePersistentLayer(client);

    assert(
      result.activeWindowId === windowId &&
        result.activeProductLabel === expected.productLabel,
      "V4.9 active state did not match expected replay window: " +
        JSON.stringify({
          activeWindowId: result.activeWindowId,
          activeProductLabel: result.activeProductLabel,
          expectedWindowId: windowId,
          expectedProductLabel: expected.productLabel
        })
    );
    assertPreservedScenarioFacts(result);
    assertProductCopy(result, expected);
    assertPersistentLayer(result, expected, viewport);
    assertSceneNearMeaning(result, expected, viewport);
    assertDefaultVisualEvidence(result, expected, viewport);

    results.push({
      viewport: viewport.name,
      windowId,
      productLabel: expected.productLabel,
      stripText: result.stripText,
      stripRect: result.stripRect,
      annotationRect: result.annotationRect,
      transitionVisible: result.transitionEvent.visible,
      transitionRect: result.transitionEvent.rect,
      sceneNearMode: result.annotationDataset.sceneNearMode,
      anchorStatus: result.annotationDataset.anchorStatus,
      textClassificationFailures:
        result.visibleTextClassificationFailures.length,
      resourceHits: result.resourceHits.length
    });
  }

  return results;
}

async function main() {
  await withStaticSmokeBrowser(
    async ({ client, baseUrl, browserHandle, serverHandle }) => {
      await setViewport(client, VIEWPORTS.desktop);
      await navigateAndWait(client, baseUrl);

      const transitionEventLayer = await verifyTransitionEventLayer(client);
      await sleep(EXPECTED_TRANSITION_DURATION_MS + 250);
      const desktopResults = await verifyViewport(client, VIEWPORTS.desktop);
      const desktopCompactResults = await verifyViewport(
        client,
        VIEWPORTS.desktopCompact
      );
      const inspectorLayer = await verifyInspectorLayerForWindows(
        client,
        VIEWPORTS.desktop
      );
      const truthAffordance =
        await verifyTruthAffordanceOpensBoundarySurface(client);
      const narrowResults = await verifyViewport(client, VIEWPORTS.narrow);
      const narrowInspectorLayer = await verifyInspectorLayerForWindows(
        client,
        VIEWPORTS.narrow,
        [
          "leo-acquisition-context",
          "meo-continuity-hold",
          "geo-continuity-guard"
        ]
      );
      const unreliableAnchorFallback =
        await verifyForcedUnreliableAnchorFallback(client);

      console.log(
        `M8A-V4.9 product comprehension Slice 5 validation matrix smoke passed: ${JSON.stringify(
          {
            desktopWindows: desktopResults.map((result) => ({
              viewport: result.viewport,
              windowId: result.windowId,
              productLabel: result.productLabel,
              stripHeight: result.stripRect.height,
              sceneNearMode: result.sceneNearMode,
              anchorStatus: result.anchorStatus,
              transitionVisible: result.transitionVisible
            })),
            desktopCompactWindows: desktopCompactResults.map((result) => ({
              viewport: result.viewport,
              windowId: result.windowId,
              productLabel: result.productLabel,
              stripHeight: result.stripRect.height,
              sceneNearMode: result.sceneNearMode,
              anchorStatus: result.anchorStatus,
              transitionVisible: result.transitionVisible
            })),
            narrowWindows: narrowResults.map((result) => ({
              viewport: result.viewport,
              windowId: result.windowId,
              productLabel: result.productLabel,
              stripHeight: result.stripRect.height,
              sceneNearMode: result.sceneNearMode,
              anchorStatus: result.anchorStatus,
              transitionVisible: result.transitionVisible
            })),
            transitionEventLayer,
            inspectorLayer,
            narrowInspectorLayer,
            truthAffordance,
            unreliableAnchorFallback,
            runtimeProcessFacts: {
              serverPid: serverHandle.server.pid,
              browserPid: browserHandle.browserProcess.pid
            }
          }
        )}`
      );
    },
    { browserArgs: [] }
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
