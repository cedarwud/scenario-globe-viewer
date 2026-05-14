// M8A-V3 D-03.S1 status panel containment smoke.
// Asserts that the post-V4.12 Operator HUD status panel is bounded in
// vertical size, designates Communication Time + Handover Decision as
// primary telemetry slots, demotes Physical/Scene Starter/Validation
// behind a default-collapsed disclosure, and preserves every V4.12
// acceptance selector.

import { mkdirSync, statSync } from "node:fs";
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
const outputRoot = path.join(repoRoot, "output/m8a-v3-d03/d03-s1");

const REQUEST_PATH = "/?scenePreset=global";
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const MAX_PANEL_FRACTION = 0.4;
const MAX_PANEL_PIXELS = Math.round(VIEWPORT_DESKTOP.height * MAX_PANEL_FRACTION);
const FORBIDDEN_CLAIMS = [
  "measured throughput",
  "measured latency",
  "measured jitter",
  "live iperf",
  "live ping",
  "iperf result",
  "ping-verified",
  "active satellite",
  "active gateway",
  "pair-specific path",
  "radio-layer handover",
  "native RF handover",
  "ESTNeT throughput",
  "INET speed",
  "NAT validated",
  "tunnel verified end-to-end",
  "DUT closed",
  ">=500 LEO closure",
  "multi-orbit closure complete",
  "multi-orbit radio-layer handover",
  "complete customer acceptance",
  "Phase 8 unlocked",
  "M8A-V4 endpoint-pair gate resolved",
  "customer orbit model is integrated",
  "D-03 closed",
  "richer composition closed",
  "presentation convergence closed"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertForbiddenClaimsAbsent(label, text) {
  const normalized = String(text ?? "").toLowerCase();
  const hit = FORBIDDEN_CLAIMS.find((claim) =>
    normalized.includes(claim.toLowerCase())
  );

  assert(!hit, `${label} contains forbidden D-03 claim: ${hit}`);
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);

  assert(
    stat.size > 10_000,
    `Screenshot is unexpectedly small: ${absolutePath}`
  );
}

async function dismissNavigationHelp(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const button = document.querySelector('.cesium-navigation-help-button');
      const visible = document.querySelector('.cesium-click-navigation-help-visible');

      if (visible && button instanceof HTMLElement) {
        button.click();
        return true;
      }

      return false;
    })()`
  );

  await sleep(120);
}

async function dismissCesiumWidgetError(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const buttons = Array.from(
        document.querySelectorAll(".cesium-widget-errorPanel button")
      );
      const okButton = buttons.find(
        (button) => button.textContent && button.textContent.trim() === "OK"
      );
      if (okButton instanceof HTMLElement) {
        okButton.click();
        return true;
      }
      return false;
    })()`
  );

  await sleep(120);
}

async function waitForViewerCanvasSettle(client) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const state = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const viewer = capture?.viewer;
        const canvas = viewer?.scene?.canvas;
        return {
          tilesLoaded: viewer?.scene?.globe?.tilesLoaded === true,
          canvasWidth: canvas?.clientWidth ?? 0,
          canvasHeight: canvas?.clientHeight ?? 0,
          errorVisible: Boolean(
            document.querySelector(".cesium-widget-errorPanel")
          )
        };
      })()`
    );

    if (
      state &&
      state.tilesLoaded &&
      state.canvasWidth > 0 &&
      state.canvasHeight > 0
    ) {
      return state;
    }

    await sleep(125);
  }

  return null;
}

async function readContainmentState(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const operatorRoot = document.querySelector("[data-operator-hud='bootstrap']");
      const statusPanel = document.querySelector(".hud-panel--status");
      const primaryGroup = document.querySelector("[data-status-panel-rank='primary']");
      const secondaryGroup = document.querySelector("[data-status-panel-rank='secondary']");
      const secondaryToggle = document.querySelector(
        "[data-status-panel-secondary-toggle='true']"
      );
      const secondaryToggleLabel = document.querySelector(
        "[data-status-panel-secondary-toggle-label='true']"
      );

      const primaryRect = primaryGroup?.getBoundingClientRect();
      const secondaryRect = secondaryGroup?.getBoundingClientRect();
      const statusRect = statusPanel?.getBoundingClientRect();

      const slot = (sel) => {
        const target = document.querySelector(sel);
        if (!target) {
          return null;
        }
        let cursor = target;
        while (cursor) {
          if (cursor.dataset && cursor.dataset.statusPanelRank) {
            return cursor.dataset.statusPanelRank;
          }
          cursor = cursor.parentElement;
        }
        return null;
      };

      return {
        containment: operatorRoot?.dataset.statusPanelContainment ?? null,
        statusPanelHeight: statusRect ? statusRect.height : null,
        statusPanelWidth: statusRect ? statusRect.width : null,
        primary: {
          present: Boolean(primaryGroup),
          height: primaryRect ? primaryRect.height : null,
          ariaHidden: primaryGroup?.getAttribute("aria-hidden") ?? null,
          containsTimeSlot: Boolean(
            primaryGroup?.querySelector("[data-operator-time-slot='true']")
          ),
          containsCommunicationSlot: Boolean(
            primaryGroup?.querySelector("[data-operator-communication-slot='true']")
          ),
          containsDecisionSlot: Boolean(
            primaryGroup?.querySelector("[data-operator-decision-slot='true']")
          )
        },
        secondary: {
          present: Boolean(secondaryGroup),
          hiddenAttr: secondaryGroup ? secondaryGroup.hidden === true : null,
          ariaHidden: secondaryGroup?.getAttribute("aria-hidden") ?? null,
          height: secondaryRect ? secondaryRect.height : null,
          containsPhysicalSlot: Boolean(
            secondaryGroup?.querySelector("[data-operator-physical-slot='true']")
          ),
          containsStarterSlot: Boolean(
            secondaryGroup?.querySelector("[data-operator-starter-slot='true']")
          ),
          containsValidationSlot: Boolean(
            secondaryGroup?.querySelector("[data-operator-validation-slot='true']")
          )
        },
        toggle: {
          present: Boolean(secondaryToggle),
          ariaExpanded: secondaryToggle?.getAttribute("aria-expanded") ?? null,
          ariaControls: secondaryToggle?.getAttribute("aria-controls") ?? null,
          label: secondaryToggleLabel?.textContent?.trim() ?? null,
          tagName: secondaryToggle?.tagName ?? null
        },
        slotRankLookup: {
          time: slot("[data-operator-time-slot='true']"),
          communication: slot("[data-operator-communication-slot='true']"),
          decision: slot("[data-operator-decision-slot='true']"),
          physical: slot("[data-operator-physical-slot='true']"),
          starter: slot("[data-operator-starter-slot='true']"),
          validation: slot("[data-operator-validation-slot='true']")
        },
        v412SelectorsPresent: {
          handoverPolicySelect: Boolean(
            document.querySelector("[data-operator-control='handover-policy']")
          ),
          handoverPolicyStatus: Boolean(
            document.querySelector("[data-operator-policy-status='true']")
          ),
          handoverDecisionPanel: Boolean(
            document.querySelector("[data-handover-decision-panel='bootstrap']")
          ),
          handoverRuleConfigEditor: Boolean(
            document.querySelector("[data-handover-rule-config-editor='true']")
          ),
          communicationRateSection: Boolean(
            document.querySelector("[data-communication-rate-section='bootstrap']")
          ),
          communicationRateChart: Boolean(
            document.querySelector("[data-communication-rate-chart='class-trend']")
          ),
          reportExportActionGroup: Boolean(
            document.querySelector("[data-report-export-action-group='true']")
          ),
          reportExportDisclosure: Boolean(
            document.querySelector("[data-report-export-disclosure='true']")
          )
        }
      };
    })()`
  );
}

async function clickSecondaryToggle(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const button = document.querySelector(
        "[data-status-panel-secondary-toggle='true']"
      );
      if (button instanceof HTMLElement) {
        button.click();
        return true;
      }
      return false;
    })()`
  );

  await sleep(120);
}

async function collectPanelText(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const root = document.querySelector("[data-operator-hud='bootstrap']");
      return root ? root.textContent ?? "" : "";
    })()`
  );
}

async function main() {
  ensureOutputRoot(outputRoot);
  mkdirSync(path.join(outputRoot, "evidence"), { recursive: true });

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
    await waitForGlobeReady(client, "M8A-V3 D-03.S1 default");
    await dismissNavigationHelp(client);
    await dismissCesiumWidgetError(client);
    await waitForViewerCanvasSettle(client);
    await sleep(400);

    const beforeState = await readContainmentState(client);

    assert(
      beforeState.containment === "v3-d03-s1",
      `Operator HUD root missing data-status-panel-containment='v3-d03-s1' marker; got ${beforeState.containment}`
    );

    assert(
      typeof beforeState.statusPanelHeight === "number",
      "Status panel height should be measurable."
    );

    assert(
      beforeState.statusPanelHeight <= MAX_PANEL_PIXELS,
      `Status panel default height ${beforeState.statusPanelHeight}px exceeds ${MAX_PANEL_PIXELS}px ceiling at desktop-1440x900.`
    );

    assert(
      beforeState.primary.present,
      "Primary telemetry container must be present."
    );
    assert(
      beforeState.primary.containsTimeSlot,
      "Primary container must include the timeline slot."
    );
    assert(
      beforeState.primary.containsCommunicationSlot,
      "Primary container must include the communication-time slot (F-09 host)."
    );
    assert(
      beforeState.primary.containsDecisionSlot,
      "Primary container must include the handover-decision slot (F-11 host)."
    );

    assert(
      beforeState.secondary.present,
      "Secondary telemetry container must be present."
    );
    assert(
      beforeState.secondary.hiddenAttr === true,
      "Secondary container must start hidden by default."
    );
    assert(
      beforeState.secondary.ariaHidden === "true",
      "Secondary container must start aria-hidden=true."
    );
    assert(
      beforeState.secondary.containsPhysicalSlot,
      "Secondary container must include the physical-input slot."
    );
    assert(
      beforeState.secondary.containsStarterSlot,
      "Secondary container must include the scene-starter slot."
    );
    assert(
      beforeState.secondary.containsValidationSlot,
      "Secondary container must include the validation-state slot."
    );

    assert(
      beforeState.toggle.present,
      "Secondary toggle button must be present."
    );
    assert(
      beforeState.toggle.tagName === "BUTTON",
      `Secondary toggle should be a <button>; got ${beforeState.toggle.tagName}`
    );
    assert(
      beforeState.toggle.ariaExpanded === "false",
      "Secondary toggle must default to aria-expanded=false."
    );
    assert(
      beforeState.toggle.ariaControls,
      "Secondary toggle must declare aria-controls."
    );
    assert(
      beforeState.toggle.label &&
        beforeState.toggle.label.toLowerCase().includes("show"),
      `Secondary toggle default label should start with "Show ..."; got "${beforeState.toggle.label}".`
    );

    assert(
      beforeState.slotRankLookup.time === "primary",
      "Time slot must live under primary rank."
    );
    assert(
      beforeState.slotRankLookup.communication === "primary",
      "Communication slot must live under primary rank."
    );
    assert(
      beforeState.slotRankLookup.decision === "primary",
      "Decision slot must live under primary rank."
    );
    assert(
      beforeState.slotRankLookup.physical === "secondary",
      "Physical slot must live under secondary rank."
    );
    assert(
      beforeState.slotRankLookup.starter === "secondary",
      "Scene Starter slot must live under secondary rank."
    );
    assert(
      beforeState.slotRankLookup.validation === "secondary",
      "Validation slot must live under secondary rank."
    );

    for (const [name, present] of Object.entries(
      beforeState.v412SelectorsPresent
    )) {
      assert(
        present === true,
        `V4.12 preserved selector "${name}" must remain queryable.`
      );
    }

    const collapsedScreenshot = await captureScreenshot(
      client,
      outputRoot,
      "d03-s1-default-collapsed-1440x900.png"
    );

    assertScreenshot(collapsedScreenshot);

    await clickSecondaryToggle(client);

    const expandedState = await readContainmentState(client);

    assert(
      expandedState.toggle.ariaExpanded === "true",
      "Secondary toggle must report aria-expanded=true after click."
    );
    assert(
      expandedState.secondary.hiddenAttr === false,
      "Secondary container must be visible (hidden=false) after click."
    );
    assert(
      expandedState.secondary.ariaHidden === "false",
      "Secondary container must report aria-hidden=false after click."
    );
    assert(
      expandedState.toggle.label &&
        expandedState.toggle.label.toLowerCase().includes("hide"),
      `Secondary toggle expanded label should start with "Hide ..."; got "${expandedState.toggle.label}".`
    );

    const expandedScreenshot = await captureScreenshot(
      client,
      outputRoot,
      "d03-s1-expanded-1440x900.png"
    );

    assertScreenshot(expandedScreenshot);

    await clickSecondaryToggle(client);

    const reCollapsedState = await readContainmentState(client);

    assert(
      reCollapsedState.toggle.ariaExpanded === "false",
      "Secondary toggle must collapse back to aria-expanded=false after second click."
    );
    assert(
      reCollapsedState.secondary.hiddenAttr === true,
      "Secondary container must be hidden again after second toggle click."
    );

    const panelText = await collectPanelText(client);

    assertForbiddenClaimsAbsent("Operator HUD text content", panelText);

    writeJsonArtifact(outputRoot, "d03-s1-runtime-state.json", {
      capturedAt: new Date().toISOString(),
      viewport: VIEWPORT_DESKTOP,
      maxPanelPixels: MAX_PANEL_PIXELS,
      requestPath: REQUEST_PATH,
      before: beforeState,
      expanded: {
        toggle: expandedState.toggle,
        secondary: expandedState.secondary,
        statusPanelHeight: expandedState.statusPanelHeight
      },
      reCollapsed: {
        toggle: reCollapsedState.toggle,
        secondary: reCollapsedState.secondary,
        statusPanelHeight: reCollapsedState.statusPanelHeight
      }
    });
  });

  console.log(
    `M8A-V3 D-03.S1 status panel containment smoke green at ${path.relative(
      repoRoot,
      outputRoot
    )}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
