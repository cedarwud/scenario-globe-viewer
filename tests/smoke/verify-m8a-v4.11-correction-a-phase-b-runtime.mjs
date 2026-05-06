import { statSync } from "node:fs";
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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-correction-a-phase-b");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";

const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};

const VIEWPORT_LAPTOP = {
  name: "laptop-1280x720",
  width: 1280,
  height: 720
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
        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional"
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error("Bootstrap error");
    }

    await sleep(100);
  }

  throw new Error("Timeout waiting for bootstrap");
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "Phase B");
}

async function clickSelector(client, selector) {
  await evaluateRuntimeValue(
    client,
    `((selector) => {
      const target = document.querySelector(selector);
      if (target) {
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }));
        target.click();
      }
    })(${JSON.stringify(selector)})`
  );
  await sleep(180);
}

async function inspectLayout(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const qs = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        return {
          exists: true,
          visible: !el.hidden && el.style.display !== 'none',
          selected: el.getAttribute('aria-selected'),
          text: el.textContent?.trim() ?? ""
        };
      };

      return {
        detailsBtn: qs('button[data-m8a-v47-control-id="details-toggle"]'),
        leftRail: qs('aside[data-m8a-v411-handover-rail="true"]'),
        topStrip: qs('div[data-m8a-v411-top-strip="true"]'),
        footerDisclosure: qs('button[data-m8a-v411-footer-chip="explicit-disclosure"]'),
        inspectorSheet: qs('aside[data-m8a-v48-inspector="true"]'),
        boundaryStrip: qs('[data-m8a-v411-inspector-boundary-strip="true"]'),
        validationBadge: qs('[data-m8a-v411-inspector-validation-badge="true"]'),
        tabs: Array.from(document.querySelectorAll('[data-m8a-v411-inspector-tab]')).map((tab) => ({
          id: tab.dataset.m8aV411InspectorTab,
          text: tab.textContent?.trim() ?? ""
        })),
        tabDecision: qs('button[data-m8a-v411-inspector-tab="decision"]'),
        tabMetrics: qs('button[data-m8a-v411-inspector-tab="metrics"]'),
        tabBoundary: qs('button[data-m8a-v411-inspector-tab="boundary"]'),
        tabEvidence: qs('button[data-m8a-v411-inspector-tab="evidence"]')
      };
    })()`
  );
}

async function main() {
  ensureOutputRoot(outputRoot);

  const manifest = {
    screenshots: [],
    checks: []
  };

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    await navigateAndWait(client, baseUrl);

    let layout = await inspectLayout(client);

    assert(layout.detailsBtn?.exists, "Details button must exist");
    assert(layout.leftRail?.exists, "Left Handover Decision Rail must exist");
    assert(layout.topStrip?.exists, "Top scenario scope/time strip must exist");
    assert(layout.footerDisclosure?.exists, "Explicit footer disclosure must exist");

    // Verify non-zero rendered size for top strip and left rail
    const layoutMetrics = await evaluateRuntimeValue(client, `(() => {
      const topStrip = document.querySelector('div[data-m8a-v411-top-strip="true"]');
      const leftRail = document.querySelector('aside[data-m8a-v411-handover-rail="true"]');
      const controlStrip = document.querySelector('[data-m8a-v47-control-strip="true"]');
      const topSlots = document.querySelectorAll('[data-m8a-v411-top-strip-slot]');
      
      const railRect = leftRail ? leftRail.getBoundingClientRect() : { width: 0, height: 0, right: 0 };
      const csRect = controlStrip ? controlStrip.getBoundingClientRect() : { left: 9999 };

      return {
        topStripWidth: topStrip ? topStrip.getBoundingClientRect().width : 0,
        topStripHeight: topStrip ? topStrip.getBoundingClientRect().height : 0,
        leftRailWidth: railRect.width,
        leftRailHeight: railRect.height,
        leftRailHasText: leftRail ? leftRail.innerText.trim().length > 0 : false,
        topStripSlotCount: topSlots.length,
        controlStripLeft: csRect.left,
        leftRailRight: railRect.right
      };
    })()`);
    
    assert(layoutMetrics.topStripWidth > 0 && layoutMetrics.topStripHeight > 0, "Top strip must have non-zero rendered size");
    assert(layoutMetrics.leftRailWidth > 0 && layoutMetrics.leftRailHeight > 0, "Left rail must have non-zero rendered size");
    assert(layoutMetrics.leftRailHasText, "Left rail must have visible text/content");
    assert(layoutMetrics.topStripSlotCount >= 3, "Top strip must have visible structured slots");
    assert(layoutMetrics.controlStripLeft >= layoutMetrics.leftRailRight, "Control strip must not be overlapped by left rail");

    manifest.screenshots.push(
      await captureScreenshot(client, outputRoot, "v4.11-phase-b-default-1440x900.png")
    );

    // Test explicit footer disclosure behavior
    await clickSelector(client, 'button[data-m8a-v411-footer-chip="explicit-disclosure"]');
    await sleep(200); // Wait for transition
    
    const disclosureState = await evaluateRuntimeValue(client, `(() => {
      const inspectorSheet = document.querySelector('#m8a-v48-inspector-sheet');
      return {
        boundaryVisible: inspectorSheet && !inspectorSheet.hidden && inspectorSheet.style.display !== 'none',
      };
    })()`);
    assert(disclosureState.boundaryVisible, "Explicit footer disclosure must open the inspector sheet");

    manifest.screenshots.push(
      await captureScreenshot(client, outputRoot, "v4.11-phase-b-footer-clicked-1440x900.png")
    );
    
    // Close the boundary disclosure before testing Details
    await clickSelector(client, 'button[data-m8a-v47-control-id="boundary-close"]');
    await sleep(200);

    // Open Details
    await clickSelector(client, 'button[data-m8a-v47-control-id="details-toggle"]');
    
    layout = await inspectLayout(client);
    assert(layout.inspectorSheet?.visible, "Inspector sheet must be visible after click");
    // Smoke Softening Disclosure: spec v2 §4.1 / §4.4 supersedes the
    // legacy four-tab inspector. Boundary is now owned by the persistent
    // inspector boundary strip plus footer disclosure, not a standalone tab.
    manifest.checks.push("smoke-softening-v2-4.1-4.4-three-tab-inspector-phase-b");
    assert(
      JSON.stringify(layout.tabs.map((tab) => tab.text)) ===
        JSON.stringify(["Decision", "Metrics", "Evidence"]),
      "Inspector tab order must be Decision / Metrics / Evidence after v2 §4.1 / §4.4: " +
        JSON.stringify(layout.tabs)
    );
    assert(layout.tabDecision?.exists, "Decision tab must exist");
    assert(layout.tabMetrics?.exists, "Metrics tab must exist");
    assert(!layout.tabBoundary?.exists, "Boundary tab must not exist after v2 §4.1 / §4.4");
    assert(layout.tabEvidence?.exists, "Evidence tab must exist");
    assert(
      layout.boundaryStrip?.visible &&
        layout.boundaryStrip.text.includes("13-actor demo") &&
        layout.boundaryStrip.text.includes("operator-family precision"),
      "Inspector boundary strip must replace Boundary tab scale/endpoint ownership: " +
        JSON.stringify(layout.boundaryStrip)
    );
    assert(
      layout.validationBadge?.visible &&
        layout.validationBadge.text.includes("驗證狀態：待補"),
      "Inspector validation badge must be visible in sheet header: " +
        JSON.stringify(layout.validationBadge)
    );
    assert(layout.tabDecision?.selected === 'true', "Decision tab must be selected by default");

    const tabsClipCheckDesktop = await evaluateRuntimeValue(client, `(() => {
      const tabsContainer = document.querySelector('[data-m8a-v411-inspector-tabs="true"]');
      if (!tabsContainer) return { clipped: false };
      const containerRect = tabsContainer.getBoundingClientRect();
      const tabs = Array.from(tabsContainer.querySelectorAll('button'));
      let isClipped = false;
      for (const tab of tabs) {
        const tabRect = tab.getBoundingClientRect();
        if (tabRect.right > containerRect.right || tabRect.left < containerRect.left) {
          isClipped = true;
        }
      }
      return { clipped: isClipped };
    })()`);
    assert(!tabsClipCheckDesktop.clipped, "Inspector tabs must not be clipped at 1440x900");

    manifest.screenshots.push(
      await captureScreenshot(client, outputRoot, "v4.11-phase-b-details-open-1440x900.png")
    );

    // 1280x720 layout check
    await setViewport(client, VIEWPORT_LAPTOP);
    await sleep(200);

    const tabsClipCheckLaptop = await evaluateRuntimeValue(client, `(() => {
      const tabsContainer = document.querySelector('[data-m8a-v411-inspector-tabs="true"]');
      if (!tabsContainer) return { clipped: false };
      const containerRect = tabsContainer.getBoundingClientRect();
      const tabs = Array.from(tabsContainer.querySelectorAll('button'));
      let isClipped = false;
      for (const tab of tabs) {
        const tabRect = tab.getBoundingClientRect();
        if (tabRect.right > containerRect.right || tabRect.left < containerRect.left) {
          isClipped = true;
        }
      }
      return { clipped: isClipped };
    })()`);
    assert(!tabsClipCheckLaptop.clipped, "Inspector tabs must not be clipped at 1280x720");
    manifest.screenshots.push(
      await captureScreenshot(client, outputRoot, "v4.11-phase-b-details-open-1280x720.png")
    );

    manifest.checks.push("phase-b-layout-verified");
  });

  writeJsonArtifact(outputRoot, "capture-manifest.json", manifest);
  console.log("Phase B smoke passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
