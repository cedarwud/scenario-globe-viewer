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
        const trigger = document.querySelector(".gs-operator-guide-trigger");
        
        return {
          bootstrapState: document.documentElement?.dataset.bootstrapState ?? null,
          scenePreset: document.documentElement?.dataset.scenePreset ?? null,
          hasViewer: Boolean(capture?.viewer),
          hasTrigger: Boolean(trigger),
          triggerText: trigger ? trigger.textContent.trim() : null
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.hasViewer &&
      lastState?.hasTrigger
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

  // Verify floating guide button exists and is styled
  const initialCheck = await evaluateRuntimeValue(
    client,
    `(() => {
      const trigger = document.querySelector(".gs-operator-guide-trigger");
      const backdrop = document.querySelector(".gs-operator-guide-backdrop");
      const modal = document.querySelector(".gs-operator-guide-modal");
      
      return {
        triggerExists: Boolean(trigger),
        backdropExists: Boolean(backdrop),
        modalExists: Boolean(modal),
        backdropVisible: backdrop ? backdrop.classList.contains("gs-operator-guide-backdrop--open") : false
      };
    })()`
  );

  assert(initialCheck.triggerExists, "Floating guide trigger button '?' must exist");
  assert(initialCheck.backdropExists, "Guide modal backdrop must exist in DOM");
  assert(!initialCheck.backdropVisible, "Guide modal backdrop must start closed");

  // Click on trigger button to open modal
  await evaluateRuntimeValue(
    client,
    `(() => {
      const trigger = document.querySelector(".gs-operator-guide-trigger");
      trigger?.click();
    })()`
  );
  await sleep(350); // Wait for transition animation

  // Verify modal is open and inspect content CJK titles
  const openCheck = await evaluateRuntimeValue(
    client,
    `(() => {
      const backdrop = document.querySelector(".gs-operator-guide-backdrop");
      const modal = document.querySelector(".gs-operator-guide-modal");
      const title = document.getElementById("gs-guide-title");
      const activeTab = document.querySelector(".gs-guide-nav-tab[aria-selected='true']");
      
      return {
        isOpen: backdrop ? backdrop.classList.contains("gs-operator-guide-backdrop--open") : false,
        titleText: title ? title.textContent.trim() : null,
        activeTab: activeTab ? activeTab.textContent.trim() : null
      };
    })()`
  );

  assert(openCheck.isOpen, "Guide modal backdrop must be open after clicking trigger");
  assert(openCheck.titleText?.includes("操作與互動指南"), "Guide modal title must match Traditional Chinese '操作與互動指南'");
  assert(openCheck.activeTab === "測站與頻段", "Default active tab must be '測站與頻段'");

  // Capture screenshot of the open modal
  const screenshotPath = await captureScreenshot(
    client,
    outputRoot,
    "operator-guide-modal-open.png"
  );

  const stats = statSync(screenshotPath);
  assert(stats.size > 10_000, "Screenshot is unexpectedly small");

  // Switch tabs to Replay tab
  await evaluateRuntimeValue(
    client,
    `(() => {
      const replayTab = document.querySelector(".gs-guide-nav-tab[data-tab='replay']");
      replayTab?.click();
    })()`
  );
  await sleep(150);

  const tabSwitchCheck = await evaluateRuntimeValue(
    client,
    `(() => {
      const activeTab = document.querySelector(".gs-guide-nav-tab[aria-selected='true']");
      const stationsPanel = document.querySelector(".gs-guide-panel[data-panel='stations']");
      const replayPanel = document.querySelector(".gs-guide-panel[data-panel='replay']");
      
      return {
        activeTab: activeTab ? activeTab.textContent.trim() : null,
        stationsHidden: stationsPanel ? stationsPanel.hidden : false,
        replayHidden: replayPanel ? replayPanel.hidden : true
      };
    })()`
  );

  assert(tabSwitchCheck.activeTab === "播放與時間軸", "Active tab must switch to '播放與時間軸'");
  assert(tabSwitchCheck.stationsHidden, "Stations panel must be hidden after switching tabs");
  assert(!tabSwitchCheck.replayHidden, "Replay panel must be visible after switching tabs");

  // Close the modal using the confirmation button
  await evaluateRuntimeValue(
    client,
    `(() => {
      const closeBtn = document.querySelector(".gs-guide-close-btn");
      closeBtn?.click();
    })()`
  );
  await sleep(350);

  const finalCheck = await evaluateRuntimeValue(
    client,
    `(() => {
      const backdrop = document.querySelector(".gs-operator-guide-backdrop");
      return {
        isOpen: backdrop ? backdrop.classList.contains("gs-operator-guide-backdrop--open") : false
      };
    })()`
  );

  assert(!finalCheck.isOpen, "Guide modal backdrop must close after clicking close button");

  return {
    route: REQUEST_PATH,
    triggerExists: initialCheck.triggerExists,
    modalTitle: openCheck.titleText,
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
