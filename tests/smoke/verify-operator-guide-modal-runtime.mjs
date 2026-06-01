import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assert,
  captureScreenshot,
  ensureOutputRoot,
  evaluateRuntimeValue,
  setViewport,
  sleep,
  waitForGlobeReady,
  withStaticSmokeBrowser,
  writeJsonArtifact
} from "./helpers/m8a-v4-browser-capture-harness.mjs";
import { SELECTED_PAIR_DEMO_REQUEST_PATH } from "../../scripts/helpers/demo-routes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const outputRoot = path.join(repoRoot, "output/operator-guide-modal");

const REQUEST_PATH = SELECTED_PAIR_DEMO_REQUEST_PATH;

async function waitForPageAndControlsReady(client) {
  let lastState = null;
  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const triggerTimeline = document.querySelector(".gs-timeline-help-trigger");
        const triggerPanel = document.querySelector(".gs-panel-help-trigger");
        const triggerCesiumHelp = document.querySelector(".cesium-navigation-help-button");
        
        return {
          bootstrapState: document.documentElement?.dataset.bootstrapState ?? null,
          scenePreset: document.documentElement?.dataset.scenePreset ?? null,
          hasViewer: Boolean(capture?.viewer),
          hasTimelineHelp: Boolean(triggerTimeline),
          hasPanelHelp: Boolean(triggerPanel),
          hasCesiumHelp: Boolean(triggerCesiumHelp)
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.hasViewer &&
      lastState?.hasTimelineHelp &&
      lastState?.hasPanelHelp &&
      lastState?.hasCesiumHelp
    ) {
      return lastState;
    }
    await sleep(100);
  }
  throw new Error(`Page and controls did not become ready: ${JSON.stringify(lastState)}`);
}

async function verifyOperatorGuide(client, baseUrl) {
  // Set standard desktop viewport
  await setViewport(client, { width: 1440, height: 900 });
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForPageAndControlsReady(client);
  await waitForGlobeReady(client, "Operator Guide Modal smoke");

  // Verify triggers and popovers exist and are hidden initially
  const initialCheck = await evaluateRuntimeValue(
    client,
    `(() => {
      const triggerTimeline = document.querySelector(".gs-timeline-help-trigger");
      const popoverTimeline = document.querySelector(".gs-timeline-help-popover");
      
      const triggerPanel = document.querySelector(".gs-panel-help-trigger");
      const popoverPanel = document.querySelector(".gs-panel-help-popover");
      
      const triggerCesiumHelp = document.querySelector(".cesium-navigation-help-button");
      
      return {
        timelineExists: Boolean(triggerTimeline) && Boolean(popoverTimeline),
        timelineHidden: popoverTimeline ? popoverTimeline.hidden : false,
        
        panelExists: Boolean(triggerPanel) && Boolean(popoverPanel),
        panelHidden: popoverPanel ? popoverPanel.hidden : false,
        
        cesiumHelpExists: Boolean(triggerCesiumHelp)
      };
    })()`
  );

  assert(initialCheck.timelineExists, "Timeline contextual guide trigger and popover must exist");
  assert(initialCheck.timelineHidden, "Timeline guide popover must start closed");
  assert(initialCheck.panelExists, "Panel contextual guide trigger and popover must exist");
  assert(initialCheck.panelHidden, "Panel guide popover must start closed");
  assert(initialCheck.cesiumHelpExists, "Cesium navigation help button must exist");

  // --- 1. Test Timeline Help Popover ---
  // Click on timeline trigger to open
  await evaluateRuntimeValue(
    client,
    `(() => {
      const trigger = document.querySelector(".gs-timeline-help-trigger");
      trigger?.click();
    })()`
  );
  await sleep(150);

  const timelineOpenCheck = await evaluateRuntimeValue(
    client,
    `(() => {
      const popover = document.querySelector(".gs-timeline-help-popover");
      const title = popover ? popover.querySelector("h4")?.textContent.trim() : null;
      return {
        visible: popover ? !popover.hidden : false,
        titleText: title
      };
    })()`
  );

  assert(timelineOpenCheck.visible, "Timeline popover must be visible after click");
  assert(timelineOpenCheck.titleText?.includes("時間軸與播放控制指南"), "Timeline popover CJK title must match expanded title");

  // Capture screenshot of the open timeline popover
  const screenshotPath = await captureScreenshot(
    client,
    outputRoot,
    "operator-guide-modal-open.png"
  );
  const stats = statSync(screenshotPath);
  assert(stats.size > 10_000, "Screenshot is unexpectedly small");

  // Click close button inside timeline popover
  await evaluateRuntimeValue(
    client,
    `(() => {
      const popover = document.querySelector(".gs-timeline-help-popover");
      const closeBtn = popover?.querySelector(".gs-popover-close");
      closeBtn?.click();
    })()`
  );
  await sleep(150);

  const timelineCloseCheck = await evaluateRuntimeValue(
    client,
    `(() => {
      const popover = document.querySelector(".gs-timeline-help-popover");
      return { hidden: popover ? popover.hidden : false };
    })()`
  );
  assert(timelineCloseCheck.hidden, "Timeline popover must be hidden after close click");

  // --- 2. Test Ground Station Panel Help Popover ---
  // Click on panel trigger to open
  await evaluateRuntimeValue(
    client,
    `(() => {
      const trigger = document.querySelector(".gs-panel-help-trigger");
      trigger?.click();
    })()`
  );
  await sleep(150);

  const panelOpenCheck = await evaluateRuntimeValue(
    client,
    `(() => {
      const popover = document.querySelector(".gs-panel-help-popover");
      const title = popover ? popover.querySelector("h4")?.textContent.trim() : null;
      return {
        visible: popover ? !popover.hidden : false,
        titleText: title
      };
    })()`
  );

  assert(panelOpenCheck.visible, "Panel popover must be visible after click");
  assert(panelOpenCheck.titleText?.includes("地面站鏈路與物理計算"), "Panel popover CJK title must match");

  // Click outside to close (e.g. click document body)
  await evaluateRuntimeValue(
    client,
    `(() => {
      document.body.click();
    })()`
  );
  await sleep(150);

  const panelCloseCheck = await evaluateRuntimeValue(
    client,
    `(() => {
      const popover = document.querySelector(".gs-panel-help-popover");
      return { hidden: popover ? popover.hidden : false };
    })()`
  );
  assert(panelCloseCheck.hidden, "Panel popover must be closed after clicking outside");

  // --- 3. Test Integrated Cesium Help Button ---
  // Click standard Cesium help button to open
  await evaluateRuntimeValue(
    client,
    `(() => {
      const trigger = document.querySelector(".cesium-navigation-help-button");
      trigger?.click();
    })()`
  );
  await sleep(250); // Wait for Cesium modal to render and timeout integration to trigger

  const cesiumHelpIntegratedCheck = await evaluateRuntimeValue(
    client,
    `(() => {
      const helpContainer = document.querySelector(".cesium-navigation-help");
      const presetsBtn = helpContainer ? helpContainer.querySelector(".cesium-navigation-button-presets") : null;
      const presetsPanel = helpContainer ? helpContainer.querySelector(".cesium-presets-navigation-help") : null;
      
      return {
        containerVisible: helpContainer ? helpContainer.classList.contains("cesium-navigation-help-visible") : false,
        btnExists: Boolean(presetsBtn),
        panelExists: Boolean(presetsPanel),
        panelVisible: presetsPanel ? presetsPanel.style.display === "block" : false
      };
    })()`
  );

  assert(cesiumHelpIntegratedCheck.containerVisible, "Cesium help container must be visible after click");
  assert(cesiumHelpIntegratedCheck.btnExists, "Custom '預設與視角' tab button must be injected into Cesium help");
  assert(cesiumHelpIntegratedCheck.panelExists, "Custom presets help panel must be injected into Cesium help");
  assert(!cesiumHelpIntegratedCheck.panelVisible, "Custom presets panel must start hidden in Cesium help");

  // Click the '預設與視角' tab
  await evaluateRuntimeValue(
    client,
    `(() => {
      const presetsBtn = document.querySelector(".cesium-navigation-button-presets");
      presetsBtn?.click();
    })()`
  );
  await sleep(150);

  const presetsTabOpenCheck = await evaluateRuntimeValue(
    client,
    `(() => {
      const helpContainer = document.querySelector(".cesium-navigation-help");
      const presetsBtn = helpContainer?.querySelector(".cesium-navigation-button-presets");
      const presetsPanel = helpContainer?.querySelector(".cesium-presets-navigation-help");
      
      return {
        btnSelected: presetsBtn ? presetsBtn.classList.contains("cesium-navigation-button-selected") : false,
        panelVisible: presetsPanel ? presetsPanel.style.display === "block" : false,
        panelText: presetsPanel ? presetsPanel.textContent.trim() : null
      };
    })()`
  );

  assert(presetsTabOpenCheck.btnSelected, "Custom presets tab button must be selected when clicked");
  assert(presetsTabOpenCheck.panelVisible, "Custom presets help panel must be visible when tab is selected");
  assert(presetsTabOpenCheck.panelText?.includes("網格軌道地球"), "Custom presets help text must contain Traditional Chinese key descriptions");

  // Close Cesium help modal by clicking the trigger button again
  await evaluateRuntimeValue(
    client,
    `(() => {
      const trigger = document.querySelector(".cesium-navigation-help-button");
      trigger?.click();
    })()`
  );
  await sleep(350);

  const cesiumHelpClosedCheck = await evaluateRuntimeValue(
    client,
    `(() => {
      const helpContainer = document.querySelector(".cesium-navigation-help");
      return {
        containerVisible: helpContainer ? helpContainer.classList.contains("cesium-navigation-help-visible") : false
      };
    })()`
  );
  assert(!cesiumHelpClosedCheck.containerVisible, "Cesium navigation help must close when clicking trigger button again");

  return {
    route: REQUEST_PATH,
    timelineHelpExists: initialCheck.timelineExists,
    panelHelpExists: initialCheck.panelExists,
    cesiumHelpIntegrated: cesiumHelpIntegratedCheck.btnExists,
    screenshot: path.relative(repoRoot, screenshotPath)
  };
}

await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
  ensureOutputRoot(outputRoot);
  const result = await verifyOperatorGuide(client, baseUrl);

  const manifestPath = writeJsonArtifact(outputRoot, "smoke-manifest.json", {
    generatedAt: new Date().toISOString(),
    route: REQUEST_PATH,
    result
  });

  console.log(`Operator Guide Modal smoke test passed! Manifest: ${path.relative(repoRoot, manifestPath)}`);
});
