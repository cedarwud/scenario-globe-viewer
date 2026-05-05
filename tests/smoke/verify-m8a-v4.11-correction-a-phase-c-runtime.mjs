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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-correction-a-phase-c");

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

const WINDOW_CHECKS = [
  {
    label: "W1",
    ratio: 0.1,
    windowId: "leo-acquisition-context",
    railCurrent: "W1 LEO"
  },
  {
    label: "W2",
    ratio: 0.3,
    windowId: "leo-aging-pressure",
    railCurrent: "W2 LEO"
  },
  {
    label: "W3",
    ratio: 0.5,
    windowId: "meo-continuity-hold",
    railCurrent: "W3 MEO"
  },
  {
    label: "W4",
    ratio: 0.7,
    windowId: "leo-reentry-candidate",
    railCurrent: "W4 MEO"
  },
  {
    label: "W5",
    ratio: 0.9,
    windowId: "geo-continuity-guard",
    railCurrent: "W5 GEO"
  }
];

const FORBIDDEN_FAKE_MEASURED_VALUE_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*(?:ms|Mbps|Gbps|dB)\b/i,
  /\b(?:latency|jitter|throughput|packet[- ]loss|rain attenuation)\s*[:=]\s*\d/i,
  /\b\d+(?:\.\d+)?\s*%\s*(?:packet|loss)/i
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

function assertNoFakeMeasuredValues(text, label) {
  const hits = FORBIDDEN_FAKE_MEASURED_VALUE_PATTERNS.filter((pattern) =>
    pattern.test(text)
  ).map((pattern) => String(pattern));

  assert(
    hits.length === 0,
    `${label} contains fake measured values: ${JSON.stringify({ hits, text })}`
  );
}

function assertRailSlot(slot, label) {
  assert(slot?.exists && slot?.text, `Missing rail slot ${label}`);
  assert(
    !/--|placeholder/i.test(slot.text),
    `Rail slot ${label} must not be placeholder: ${slot.text}`
  );
}

function rectsOverlap(left, right) {
  if (!left || !right) {
    return false;
  }

  return !(
    left.right <= right.left ||
    left.left >= right.right ||
    left.bottom <= right.top ||
    left.top >= right.bottom
  );
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
  await waitForGlobeReady(client, "Phase C");
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

async function seekReplayRatio(client, ratio) {
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
        replayClock.seek(new Date(start + (stop - start) * ratio).toISOString());
      }
    })(${JSON.stringify(ratio)})`
  );
  await sleep(320);
}

async function inspectLayout(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const normalize = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
      const rectToPlain = (rect) => ({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      });
      const isVisible = (el) => {
        if (!(el instanceof HTMLElement)) return false;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return !el.hidden && style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const qs = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        return {
          exists: true,
          visible: isVisible(el),
          selected: el.getAttribute('aria-selected'),
          text: normalize(el.innerText),
          rect: el instanceof HTMLElement ? rectToPlain(el.getBoundingClientRect()) : null
        };
      };

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const panels = Array.from(document.querySelectorAll('[data-m8a-v411-inspector-panel]')).map((p) => ({
        id: p.dataset.m8aV411InspectorPanel,
        visible: isVisible(p),
        hidden: p.hidden === true,
        text: normalize(p.innerText)
      }));

      return {
        activeWindowId: state?.productUx?.activeWindowId ?? null,
        activeTab: document.querySelector('[data-m8a-v411-inspector-tab][aria-selected="true"]')?.dataset.m8aV411InspectorTab ?? null,
        topStrip: qs('[data-m8a-v411-top-strip="true"]'),
        topStripScope: qs('[data-m8a-v411-top-strip-slot="scope"]'),
        topStripReplay: qs('[data-m8a-v411-top-strip-slot="replay"]'),
        topStripPrecision: qs('[data-m8a-v411-top-strip-slot="precision"]'),
        topStripBoundary: qs('[data-m8a-v411-top-strip-slot="boundary"]'),
        railCurrent: qs('[data-m8a-v411-rail-slot="current"]'),
        railCandidate: qs('[data-m8a-v411-rail-slot="candidate"]'),
        railFallback: qs('[data-m8a-v411-rail-slot="fallback"]'),
        railDecision: qs('[data-m8a-v411-rail-slot="decision"]'),
        railQuality: qs('[data-m8a-v411-rail-slot="quality"]'),
        tabDecision: qs('button[data-m8a-v411-inspector-tab="decision"]'),
        tabMetrics: qs('button[data-m8a-v411-inspector-tab="metrics"]'),
        tabBoundary: qs('button[data-m8a-v411-inspector-tab="boundary"]'),
        tabEvidence: qs('button[data-m8a-v411-inspector-tab="evidence"]'),
        sheet: qs('[data-m8a-v48-inspector="true"]'),
        strip: qs('[data-m8a-v47-control-strip="true"]'),
        panels
      };
    })()`
  );
}

async function clickInspectorTab(client, tab) {
  await clickSelector(client, `button[data-m8a-v411-inspector-tab="${tab}"]`);
}

function findPanel(layout, panelId) {
  return layout.panels.find((panel) => panel.id === panelId);
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

    assert(layout.topStripScope.text.includes("13-actor demo"), "Top strip must show 13-actor demo scope");
    assert(layout.topStripScope.text.includes("LEO/MEO/GEO"), "Top strip must show LEO/MEO/GEO scope");
    assert(layout.topStripReplay.text.includes("Sim replay"), "Top strip must show replay time");
    assert(layout.topStripReplay.text.includes("replay"), "Top strip must show replay mode");
    assert(layout.topStripReplay.text.includes("x"), "Top strip must show speed multiplier");
    assert(layout.topStripPrecision.text.includes("operator-family precision"), "Top strip must show operator-family precision");
    assert(!layout.topStripPrecision.text.includes("R2"), "Top strip must not show R2 precision");
    assert(layout.topStripBoundary.text.includes("repo-owned projection"), "Top strip must show repo-owned boundary");
    assert(layout.topStripBoundary.text.includes("not measured truth"), "Top strip must show non-measurement boundary");

    for (const check of WINDOW_CHECKS) {
      await seekReplayRatio(client, check.ratio);
      layout = await inspectLayout(client);
      assert(
        layout.activeWindowId === check.windowId,
        `${check.label} seek mismatch: ${JSON.stringify(layout.activeWindowId)}`
      );
      assert(layout.railCurrent.text.includes(check.railCurrent), `${check.label} current rail mismatch: ${layout.railCurrent.text}`);
      assertRailSlot(layout.railCurrent, `${check.label} current`);
      assertRailSlot(layout.railCandidate, `${check.label} candidate`);
      assertRailSlot(layout.railFallback, `${check.label} fallback`);
      assertRailSlot(layout.railDecision, `${check.label} decision`);
      assertRailSlot(layout.railQuality, `${check.label} quality`);
    }

    await seekReplayRatio(client, WINDOW_CHECKS[0].ratio);
    layout = await inspectLayout(client);
    const w1Default = await captureScreenshot(
      client,
      outputRoot,
      "w1-default-1440x900.png"
    );
    assertScreenshot(w1Default);
    manifest.screenshots.push(w1Default);

    await clickSelector(client, 'button[data-m8a-v47-control-id="details-toggle"]');
    layout = await inspectLayout(client);
    assert(layout.tabDecision.selected === "true", "Decision must be the default Details tab");
    assert(layout.activeTab === "decision", "Decision must be the active default tab");
    for (const tab of ["Decision", "Metrics", "Boundary", "Evidence"]) {
      const key = `tab${tab}`;
      assert(layout[key]?.exists, `${tab} tab must exist`);
    }

    let decisionPanel = findPanel(layout, "decision");
    assert(decisionPanel?.visible, "Decision panel must be visible by default");
    assert(decisionPanel.text.includes("Now") && decisionPanel.text.includes("Why"), "Decision panel must expose Now/Why modules");

    await seekReplayRatio(client, WINDOW_CHECKS[1].ratio);
    await clickInspectorTab(client, "metrics");
    layout = await inspectLayout(client);
    const metricsPanel = findPanel(layout, "metrics");
    assert(layout.activeTab === "metrics", "Metrics tab must be selected");
    assert(metricsPanel?.visible, "Metrics panel must be visible");
    assert(metricsPanel.text.includes("Modeled classes"), "Metrics must separate modeled classes");
    assert(metricsPanel.text.includes("Unavailable measured data"), "Metrics must separate unavailable measured data");
    assert(metricsPanel.text.includes("no ping"), "Metrics must disclose ping is not connected");
    assert(metricsPanel.text.includes("iperf"), "Metrics must disclose iperf is not connected");
    assert(metricsPanel.text.includes("ESTNeT/INET"), "Metrics must disclose ESTNeT/INET is not connected");
    assert(metricsPanel.text.includes("DUT"), "Metrics must disclose DUT is not connected");
    assertNoFakeMeasuredValues(metricsPanel.text, "Metrics panel");
    const w2Metrics = await captureScreenshot(
      client,
      outputRoot,
      "w2-metrics-tab-1440x900.png"
    );
    assertScreenshot(w2Metrics);
    manifest.screenshots.push(w2Metrics);

    await seekReplayRatio(client, WINDOW_CHECKS[2].ratio);
    await clickInspectorTab(client, "decision");
    layout = await inspectLayout(client);
    decisionPanel = findPanel(layout, "decision");
    assert(layout.activeTab === "decision", "Decision tab must be selected");
    assert(decisionPanel?.visible, "Decision panel must be visible for W3");
    assert(decisionPanel.text.includes("MEO"), "W3 Decision must describe MEO hold");
    const w3Decision = await captureScreenshot(
      client,
      outputRoot,
      "w3-decision-tab-1440x900.png"
    );
    assertScreenshot(w3Decision);
    manifest.screenshots.push(w3Decision);

    await seekReplayRatio(client, WINDOW_CHECKS[4].ratio);
    await clickInspectorTab(client, "boundary");
    layout = await inspectLayout(client);
    const boundaryPanel = findPanel(layout, "boundary");
    assert(layout.activeTab === "boundary", "Boundary tab must be selected");
    assert(boundaryPanel?.visible, "Boundary panel must be visible");
    assert(boundaryPanel.text.includes("13-actor demo"), "Boundary must contain 13-actor demo");
    assert(boundaryPanel.text.includes("repo-owned projection"), "Boundary must contain repo-owned projection");
    assert(boundaryPanel.text.includes("not measured truth"), "Boundary must contain non-measurement truth");
    assert(boundaryPanel.text.includes("not native RF handover"), "Boundary must contain native RF non-claim");
    const w5Boundary = await captureScreenshot(
      client,
      outputRoot,
      "w5-boundary-tab-1440x900.png"
    );
    assertScreenshot(w5Boundary);
    manifest.screenshots.push(w5Boundary);

    await clickInspectorTab(client, "evidence");
    layout = await inspectLayout(client);
    const evidencePanel = findPanel(layout, "evidence");
    assert(layout.activeTab === "evidence", "Evidence tab must be selected");
    assert(evidencePanel?.visible, "Evidence panel must be visible");
    assert(evidencePanel.text.includes("TLE"), "Evidence must contain TLE summary");
    assert(evidencePanel.text.includes("CelesTrak"), "Evidence must contain CelesTrak provenance");
    assert(evidencePanel.text.includes("Endpoint evidence"), "Evidence must contain endpoint evidence summary");
    assert(evidencePanel.text.includes("R2"), "Evidence must contain R2 provenance");
    assert(evidencePanel.text.includes("read-only"), "Evidence must keep R2 read-only");
    const evidence = await captureScreenshot(
      client,
      outputRoot,
      "evidence-tab-1440x900.png"
    );
    assertScreenshot(evidence);
    manifest.screenshots.push(evidence);

    await setViewport(client, VIEWPORT_LAPTOP);
    await sleep(240);
    layout = await inspectLayout(client);
    assert(layout.sheet?.visible, "Details sheet must remain visible at 1280x720");
    assert(!rectsOverlap(layout.sheet.rect, layout.strip.rect), "Details sheet must not overlap control strip at 1280x720");
    const tabsClipCheckLaptop = await evaluateRuntimeValue(client, `(() => {
      const tabsContainer = document.querySelector('[data-m8a-v411-inspector-tabs="true"]');
      if (!tabsContainer) return { clipped: true };
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
    const overlap = await captureScreenshot(
      client,
      outputRoot,
      "details-overlap-check-1280x720.png"
    );
    assertScreenshot(overlap);
    manifest.screenshots.push(overlap);

    manifest.checks.push("phase-c-rail-top-strip-inspector-content-verified");
  });

  writeJsonArtifact(outputRoot, "capture-manifest.json", manifest);
  console.log("Phase C smoke passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
