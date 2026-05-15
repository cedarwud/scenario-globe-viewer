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
    railOrbit: "leo",
    railRole: "focus",
    railMainChip: "LEO · focus",
    railCurrent: "Current: LEO",
    railCandidate: "Candidate: none",
    railFallback: "Fallback: MEO/GEO",
    railNext: "Next: entering quality drop",
    railEvidence: "modeled quality strong"
  },
  {
    label: "W2",
    ratio: 0.3,
    windowId: "leo-aging-pressure",
    railOrbit: "leo",
    railRole: "pressure",
    railMainChip: "LEO · pressure",
    railCurrent: "Current: LEO",
    railCandidate: "Candidate: MEO",
    railFallback: "Fallback: GEO",
    railNext: "Next: MEO continuity hold",
    railEvidence: "modeled quality dropping"
  },
  {
    label: "W3",
    ratio: 0.5,
    windowId: "meo-continuity-hold",
    railOrbit: "meo",
    railRole: "continuity-hold",
    railMainChip: "MEO · continuity-hold",
    railCurrent: "Current: MEO",
    railCandidate: "Candidate: LEO",
    railFallback: "Fallback: GEO",
    railNext: "Next: new LEO candidate returning",
    railEvidence: "modeled continuity hold"
  },
  {
    label: "W4",
    ratio: 0.7,
    windowId: "leo-reentry-candidate",
    railOrbit: "leo",
    railRole: "candidate",
    railMainChip: "LEO · candidate",
    railCurrent: "Current: MEO",
    railCandidate: "Candidate: LEO",
    railFallback: "Fallback: GEO",
    railNext: "Next: GEO closes as guard",
    railEvidence: "candidate quality strong"
  },
  {
    label: "W5",
    ratio: 0.9,
    windowId: "geo-continuity-guard",
    railOrbit: "geo",
    railRole: "guard",
    railMainChip: "GEO · guard",
    railCurrent: "Current: GEO",
    railCandidate: "Candidate: none",
    railFallback: "Fallback: GEO guard",
    railNext: "Next: restart (back to W1)",
    railEvidence: "guard context only"
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
      const disabledMetricTiles = Array.from(
        document.querySelectorAll("[data-m8a-v411-disabled-metric-tile='true']")
      ).map((tile) => {
        const style = tile instanceof HTMLElement ? getComputedStyle(tile) : null;
        return {
          id: tile.dataset.m8aV411DisabledMetricId ?? "",
          ariaDisabled: tile.getAttribute("aria-disabled"),
          tabIndex: tile instanceof HTMLElement ? tile.tabIndex : null,
          cursor: style?.cursor ?? "",
          focusableDescendantCount: tile.querySelectorAll(
            "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
          ).length,
          text: normalize(tile.textContent)
        };
      });
      const availableMetricTiles = Array.from(
        document.querySelectorAll("[data-m8a-v411-available-metric-tile]")
      ).map((tile) => {
        const value = tile.querySelector(".m8a-v411-metrics__value");
        const valueStyle = value instanceof HTMLElement ? getComputedStyle(value) : null;
        return {
          id: tile.dataset.m8aV411AvailableMetricTile ?? "",
          text: normalize(tile.textContent),
          fontFamily: valueStyle?.fontFamily ?? "",
          fontVariantNumeric: valueStyle?.fontVariantNumeric ?? "",
          minWidth: valueStyle?.minWidth ?? ""
        };
      });

      return {
        activeWindowId: state?.productUx?.activeWindowId ?? null,
        activeTab: document.querySelector('[data-m8a-v411-inspector-tab][aria-selected="true"]')?.dataset.m8aV411InspectorTab ?? null,
        topStrip: qs('[data-m8a-v411-top-strip="true"]'),
        topStripScope: qs('[data-m8a-v411-top-strip-slot="scope"]'),
        topStripReplay: qs('[data-m8a-v411-top-strip-slot="replay"]'),
        topStripPrecision: qs('[data-m8a-v411-top-strip-slot="precision"]'),
        topStripBoundary: qs('[data-m8a-v411-top-strip-slot="boundary"]'),
        railPanel: (() => {
          const panel = document.querySelector('[data-m8a-v411-rail-panel="true"]');
          const base = qs('[data-m8a-v411-rail-panel="true"]');
          const style = panel instanceof HTMLElement ? getComputedStyle(panel) : null;
          return {
            ...(base ?? { exists: false, visible: false, text: "", rect: null }),
            orbit: panel?.dataset?.m8aV411RailOrbit ?? "",
            role: panel?.dataset?.m8aV411RailRole ?? "",
            borderLeftWidth: style?.borderLeftWidth ?? "",
            borderLeftColor: style?.borderLeftColor ?? ""
          };
        })(),
        railMainChip: qs('[data-m8a-v411-rail-main-chip="true"]'),
        railCurrent: qs('[data-m8a-v411-rail-slot="current"]'),
        railCandidate: qs('[data-m8a-v411-rail-slot="candidate"]'),
        railFallback: qs('[data-m8a-v411-rail-slot="fallback"]'),
        railNext: qs('[data-m8a-v411-rail-slot="next"]'),
        railEvidence: qs('[data-m8a-v411-rail-slot="evidence"]'),
        railSlots: Array.from(document.querySelectorAll("[data-m8a-v411-rail-slot]")).map((slot) => ({
          slot: slot.getAttribute("data-m8a-v411-rail-slot"),
          text: normalize(slot.textContent),
          infoClass: slot.getAttribute("data-m8a-v48-info-class")
        })),
        tabDecision: qs('button[data-m8a-v411-inspector-tab="decision"]'),
        tabMetrics: qs('button[data-m8a-v411-inspector-tab="metrics"]'),
        tabBoundary: qs('button[data-m8a-v411-inspector-tab="boundary"]'),
        tabEvidence: qs('button[data-m8a-v411-inspector-tab="evidence"]'),
        tabs: Array.from(document.querySelectorAll('[data-m8a-v411-inspector-tab]')).map((tab) => ({
          id: tab.dataset.m8aV411InspectorTab,
          text: normalize(tab.textContent)
        })),
        boundaryStrip: qs('[data-m8a-v411-inspector-boundary-strip="true"]'),
        validationBadge: qs('[data-m8a-v411-inspector-validation-badge="true"]'),
        evidenceArchive: (() => {
          const archive = document.querySelector('[data-m8a-v411-evidence-archive="true"]');
          return archive instanceof HTMLDetailsElement
            ? {
                exists: true,
                open: archive.open,
                defaultOpen: archive.dataset.m8aV411EvidenceArchiveDefaultOpen ?? "",
                text: normalize(archive.innerText)
              }
            : { exists: false, open: false, defaultOpen: "", text: "" };
        })(),
        sheet: qs('[data-m8a-v48-inspector="true"]'),
        strip: qs('[data-m8a-v47-control-strip="true"]'),
        panels,
        disabledMetricTiles,
        availableMetricTiles
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
      assert(
        layout.railPanel.visible &&
          layout.railPanel.orbit === check.railOrbit &&
          layout.railPanel.role === check.railRole &&
          layout.railPanel.borderLeftWidth === "3px",
        `${check.label} decision-first rail panel mismatch after spec v2 §5: ${JSON.stringify(layout.railPanel)}`
      );
      assert(
        layout.railMainChip.text.includes(check.railMainChip),
        `${check.label} main rail chip mismatch: ${layout.railMainChip.text}`
      );
      assert(layout.railCurrent.text.includes(check.railCurrent), `${check.label} current rail mismatch: ${layout.railCurrent.text}`);
      assert(layout.railCandidate.text.includes(check.railCandidate), `${check.label} candidate rail mismatch: ${layout.railCandidate.text}`);
      assert(layout.railFallback.text.includes(check.railFallback), `${check.label} fallback rail mismatch: ${layout.railFallback.text}`);
      assert(layout.railNext.text.includes(check.railNext), `${check.label} next rail mismatch: ${layout.railNext.text}`);
      assert(layout.railEvidence.text.includes(check.railEvidence), `${check.label} evidence rail mismatch: ${layout.railEvidence.text}`);
      assert(
        JSON.stringify(layout.railSlots.map((entry) => entry.slot)) ===
          JSON.stringify(["current", "candidate", "fallback", "next", "evidence"]) &&
          layout.railSlots.every((entry) => entry.infoClass === "dynamic"),
        `Rail slots must follow spec v2 §5 compact-token + next/evidence structure: ${JSON.stringify(layout.railSlots)}`
      );
      assertRailSlot(layout.railCurrent, `${check.label} current`);
      assertRailSlot(layout.railCandidate, `${check.label} candidate`);
      assertRailSlot(layout.railFallback, `${check.label} fallback`);
      assertRailSlot(layout.railNext, `${check.label} next`);
      assertRailSlot(layout.railEvidence, `${check.label} evidence`);
    }
    // Smoke Softening Disclosure: spec v2 §5 supersedes the previous
    // five-equal-row rail prose contract. Current/Candidate/Fallback are now
    // compact tokens under the primary judgment chip, with next/evidence as
    // lower-weight layers.
    manifest.checks.push("smoke-softening-v2-5-left-rail-decision-first-correction-a-phase-c");

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
    // Smoke Softening Disclosure: spec v2 §4.1 / §4.4 supersedes the
    // legacy four-tab expectation. Boundary scale/endpoint ownership moved
    // to the persistent inspector boundary strip.
    manifest.checks.push("smoke-softening-v2-4.1-4.4-three-tab-inspector-correction-a-phase-c");
    assert(
      JSON.stringify(layout.tabs.map((tab) => tab.text)) ===
        JSON.stringify(["Decision", "Metrics", "Evidence"]),
      "Inspector tab order must be Decision / Metrics / Evidence after v2 §4.1 / §4.4: " +
        JSON.stringify(layout.tabs)
    );
    for (const tab of ["Decision", "Metrics", "Evidence"]) {
      const key = `tab${tab}`;
      assert(layout[key]?.exists, `${tab} tab must exist`);
    }
    assert(!layout.tabBoundary?.exists, "Boundary tab must not exist after v2 §4.1 / §4.4");
    assert(
      layout.boundaryStrip.visible &&
        layout.boundaryStrip.text.includes("13-actor demo") &&
        layout.boundaryStrip.text.includes("operator-family precision"),
      "Boundary strip must own scale and endpoint chips after v2 §4.4: " +
        JSON.stringify(layout.boundaryStrip)
    );
    assert(
      layout.validationBadge.visible &&
        layout.validationBadge.text.includes("Validation status: TBD"),
      "Validation badge must be present in inspector header: " +
        JSON.stringify(layout.validationBadge)
    );

    let decisionPanel = findPanel(layout, "decision");
    assert(decisionPanel?.visible, "Decision panel must be visible by default");
    assert(decisionPanel.text.includes("Now") && decisionPanel.text.includes("Why"), "Decision panel must expose Now/Why modules");

    await seekReplayRatio(client, WINDOW_CHECKS[1].ratio);
    await clickInspectorTab(client, "metrics");
    layout = await inspectLayout(client);
    const metricsPanel = findPanel(layout, "metrics");
    assert(layout.activeTab === "metrics", "Metrics tab must be selected");
    assert(metricsPanel?.visible, "Metrics panel must be visible");
    assert(metricsPanel.text.includes("Available in this scene"), "Metrics must show Available group");
    assert(metricsPanel.text.includes("Not connected in this scene"), "Metrics must show Not connected group");
    assert(!metricsPanel.text.includes("Unavailable measured data"), "Metrics must not keep old unavailable measured-data heading");
    assert(metricsPanel.text.includes("Communication Time"), "Metrics must name Communication Time hookpoint");
    assert(metricsPanel.text.includes("Handover Decision"), "Metrics must name Handover Decision hookpoint");
    assert(metricsPanel.text.includes("Physical Inputs"), "Metrics must name Physical Inputs hookpoint");
    assert(metricsPanel.text.includes("Validation State"), "Metrics must name Validation State hookpoint");
    assert(metricsPanel.text.includes("ping/iPerf"), "Metrics must disclose ping/iPerf is not connected");
    assert(metricsPanel.text.includes("ESTNeT/INET"), "Metrics must disclose ESTNeT/INET is not connected");
    assert(metricsPanel.text.includes("DUT"), "Metrics must disclose DUT is not connected");
    assert(layout.availableMetricTiles.length === 4, "Metrics must render four available tiles");
    assert(layout.availableMetricTiles.every((tile) => tile.fontFamily.includes("IBM Plex Mono") || tile.fontFamily.includes("monospace")), "Available tile values must use data typography");
    assert(layout.availableMetricTiles.every((tile) => tile.fontVariantNumeric.includes("tabular-nums")), "Available tile values must use tabular figures");
    assert(layout.disabledMetricTiles.length === 13, "Metrics must render 13 disabled tiles");
    assert(
      layout.disabledMetricTiles.every(
        (tile) =>
          tile.ariaDisabled === "true" &&
          tile.tabIndex < 0 &&
          tile.cursor === "not-allowed" &&
          tile.focusableDescendantCount === 0
      ),
      `Disabled metric tiles must be aria-disabled, non-focusable, not-allowed, and contain no focusable children: ${JSON.stringify(layout.disabledMetricTiles)}`
    );
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
    await clickInspectorTab(client, "evidence");
    layout = await inspectLayout(client);
    const evidencePanel = findPanel(layout, "evidence");
    assert(layout.activeTab === "evidence", "Evidence tab must be selected");
    assert(evidencePanel?.visible, "Evidence panel must be visible");
    assert(evidencePanel.text.includes("TLE: CelesTrak NORAD GP · 13 actors · fetched 2026-04-26"), "Evidence must contain the v2 §4.6 TLE summary line");
    assert(evidencePanel.text.includes("R2: 5 candidate endpoints (read-only catalog)"), "Evidence must contain the v2 §4.6 R2 summary line");
    assert(layout.evidenceArchive.open === true && layout.evidenceArchive.defaultOpen === "true", "W5 Evidence Archive must expand by default");
    assert(layout.evidenceArchive.text.includes("Satellite TLE provenance"), "Evidence Archive must reveal full TLE table");
    assert(layout.evidenceArchive.text.includes("R2 read-only candidate catalog"), "Evidence Archive must reveal R2 table");
    const evidence = await captureScreenshot(
      client,
      outputRoot,
      "w5-evidence-archive-expanded-1440x900.png"
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
