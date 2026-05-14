// M8A-V3 D-03.S2 handover rule config disclosure smoke.
// Asserts the F-11 editor is mounted but default-collapsed, can round-trip
// through its summary control, and keeps the D-03.S1 containment structure.

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
const outputRoot = path.join(repoRoot, "output/m8a-v3-d03/d03-s2");

const REQUEST_PATH = "/?scenePreset=global";
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};

const words = (...tokens) => tokens.join(" ");
const dashed = (...tokens) => tokens.join("-");
const forbiddenClaims = [
  words("measured", "throughput"),
  words("measured", "latency"),
  words("measured", "jitter"),
  words("measured", "truth"),
  words("live", "iperf"),
  words("live", "ping"),
  words("iperf", "result"),
  dashed("ping", "verified"),
  dashed("iperf", "backed"),
  dashed("ping", "backed"),
  words("active", "satellite"),
  words("active", "gateway"),
  words("active", "path"),
  dashed("pair", "specific") + words("", "path"),
  dashed("pair", "specific") + words("", "GEO", "teleport"),
  dashed("radio", "layer") + words("", "handover"),
  words("native", "RF", "handover"),
  words("ESTNeT", "throughput"),
  words("INET", "speed"),
  words("NAT", "validated"),
  words("tunnel", "verified", dashed("end", "to", "end")),
  words("DUT", "closed"),
  words(">=500", "LEO", "closure"),
  dashed("multi", "orbit") + words("", "closure", "complete"),
  dashed("multi", "orbit") + words("", dashed("radio", "layer"), "handover"),
  words("complete", "customer", "acceptance"),
  words("Phase", "8", "unlocked"),
  dashed("M8A", "V4") + words("", dashed("endpoint", "pair"), "gate", "resolved"),
  words("customer", "orbit", "model", "is", "integrated"),
  dashed("D", "03") + words("", "closed"),
  dashed("D", "03") + words("", ["已", "完成"].join("")),
  words("richer", "composition", "closed"),
  words("presentation", "convergence", "closed"),
  ...[2, 3, 4, 5, 6].map((number) =>
    dashed("V", `0${number}`) + words("", "closed")
  ),
  words("iperf", "throughput"),
  words("ping", "latency")
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertForbiddenClaimsAbsent(label, text) {
  const normalized = String(text ?? "").toLowerCase();
  const hit = forbiddenClaims.find((claim) =>
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

async function readDisclosureState(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
      const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
          !element.hidden &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const slotRank = (selector) => {
        const target = document.querySelector(selector);
        let cursor = target;
        while (cursor) {
          if (cursor.dataset?.statusPanelRank) {
            return cursor.dataset.statusPanelRank;
          }
          cursor = cursor.parentElement;
        }
        return null;
      };
      const operatorRoot = document.querySelector("[data-operator-hud='bootstrap']");
      const statusPanel = document.querySelector(".hud-panel--status");
      const primaryGroup = document.querySelector("[data-status-panel-rank='primary']");
      const secondaryGroup = document.querySelector("[data-status-panel-rank='secondary']");
      const editor = document.querySelector("[data-handover-rule-config-editor='true']");
      const summary = editor?.querySelector("summary");
      const form = document.querySelector("[data-handover-rule-form='true']");
      const status = document.querySelector("[data-handover-rule-status='true']");
      const actions = {
        apply: document.querySelector("[data-handover-rule-action='apply']"),
        reset: document.querySelector("[data-handover-rule-action='reset']"),
        cancel: document.querySelector("[data-handover-rule-action='cancel']")
      };
      const fields = Array.from(
        document.querySelectorAll("[data-handover-rule-input]")
      );
      const statusRect = statusPanel?.getBoundingClientRect();

      return {
        requestPath: window.location.pathname + window.location.search,
        bootstrapState: document.documentElement?.dataset.bootstrapState ?? null,
        containment: operatorRoot?.dataset.statusPanelContainment ?? null,
        statusPanelHeight: statusRect ? statusRect.height : null,
        editor: {
          present: editor instanceof HTMLDetailsElement,
          visible: isVisible(editor),
          open: editor instanceof HTMLDetailsElement ? editor.open : null,
          innerHTML: editor instanceof HTMLElement ? editor.innerHTML : "",
          summaryText: normalize(summary?.textContent),
          summaryVisible: isVisible(summary),
          summaryTagName: summary?.tagName ?? null,
          summaryTabIndex:
            summary instanceof HTMLElement ? summary.tabIndex : null,
          summaryFocused: document.activeElement === summary,
          formPresent: form instanceof HTMLFormElement,
          formVisible: isVisible(form),
          visibleFieldCount: fields.filter(isVisible).length,
          fieldCount: fields.length,
          statusPresent: status instanceof HTMLElement,
          actionsPresent: {
            apply: actions.apply instanceof HTMLButtonElement,
            reset: actions.reset instanceof HTMLButtonElement,
            cancel: actions.cancel instanceof HTMLButtonElement
          }
        },
        ranks: {
          primaryPresent:
            primaryGroup instanceof HTMLElement &&
            primaryGroup.dataset.statusPanelRank === "primary",
          secondaryPresent:
            secondaryGroup instanceof HTMLElement &&
            secondaryGroup.dataset.statusPanelRank === "secondary",
          communication: slotRank("[data-operator-communication-slot='true']"),
          decision: slotRank("[data-operator-decision-slot='true']"),
          physical: slotRank("[data-operator-physical-slot='true']"),
          starter: slotRank("[data-operator-starter-slot='true']"),
          validation: slotRank("[data-operator-validation-slot='true']")
        }
      };
    })()`
  );
}

async function focusSummary(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const editor = document.querySelector("[data-handover-rule-config-editor='true']");
      const summary = editor?.querySelector("summary");
      if (!(summary instanceof HTMLElement)) {
        throw new Error("Missing F-11 rule config summary.");
      }
      summary.focus();
    })()`
  );

  await sleep(80);

  return await evaluateRuntimeValue(
    client,
    `(() => {
      const editor = document.querySelector("[data-handover-rule-config-editor='true']");
      const summary = editor?.querySelector("summary");
      if (!(summary instanceof HTMLElement)) {
        throw new Error("Missing F-11 rule config summary.");
      }
      return {
        summaryFocused: document.activeElement === summary,
        summaryTabIndex: summary.tabIndex
      };
    })()`
  );
}

async function clickSummary(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const editor = document.querySelector("[data-handover-rule-config-editor='true']");
      const summary = editor?.querySelector("summary");
      if (!(summary instanceof HTMLElement)) {
        throw new Error("Missing F-11 rule config summary.");
      }
      summary.click();
    })()`
  );

  await sleep(160);
  return await readDisclosureState(client);
}

async function collectEditorOuterHtml(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const editor = document.querySelector("[data-handover-rule-config-editor='true']");
      return editor instanceof HTMLDetailsElement ? editor.outerHTML : "";
    })()`
  );
}

async function main() {
  ensureOutputRoot(outputRoot);
  mkdirSync(path.join(outputRoot, "evidence"), { recursive: true });

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
    await waitForGlobeReady(client, "M8A-V3 D-03.S2 default");
    await dismissNavigationHelp(client);
    await dismissCesiumWidgetError(client);
    await waitForViewerCanvasSettle(client);
    await sleep(400);

    const initial = await readDisclosureState(client);

    assert(
      initial.requestPath === REQUEST_PATH,
      `D-03.S2 smoke must run on the default global route; got ${initial.requestPath}`
    );
    assert(
      initial.editor.present,
      "F-11 rule editor details element must be present in the DOM."
    );
    assert(
      initial.editor.open === false,
      "F-11 rule editor must default to closed."
    );
    assert(
      initial.editor.fieldCount > 0 && initial.editor.visibleFieldCount === 0,
      `F-11 closed editor must keep fields mounted but hidden: ${JSON.stringify(initial.editor)}`
    );
    assert(
      initial.editor.summaryVisible &&
        initial.editor.summaryText === "Handover Rule Config",
      `F-11 summary must stay visible with stable label: ${JSON.stringify(initial.editor)}`
    );

    const focused = await focusSummary(client);
    assert(
      focused.summaryFocused === true,
      `F-11 summary must be keyboard-focusable: ${JSON.stringify(focused)}`
    );

    assert(
      initial.containment === "v3-d03-s1",
      `D-03.S1 containment marker must remain on the Operator HUD; got ${initial.containment}`
    );
    assert(
      initial.ranks.primaryPresent &&
        initial.ranks.communication === "primary" &&
        initial.ranks.decision === "primary",
      `Primary rank must retain Communication Time and Handover Decision: ${JSON.stringify(initial.ranks)}`
    );
    assert(
      initial.ranks.secondaryPresent &&
        initial.ranks.physical === "secondary" &&
        initial.ranks.starter === "secondary" &&
        initial.ranks.validation === "secondary",
      `Secondary rank must retain Physical Inputs, Scene Starter, and Validation State: ${JSON.stringify(initial.ranks)}`
    );

    const closedScreenshot = await captureScreenshot(
      client,
      outputRoot,
      "d03-s2-f11-default-closed-1440x900.png"
    );
    assertScreenshot(closedScreenshot);

    const opened = await clickSummary(client);
    assert(
      opened.editor.open === true,
      "F-11 summary click activation must open the editor."
    );
    assert(
      opened.editor.formPresent &&
        opened.editor.formVisible &&
        opened.editor.statusPresent &&
        opened.editor.actionsPresent.apply &&
        opened.editor.actionsPresent.reset &&
        opened.editor.actionsPresent.cancel,
      `F-11 opened editor must expose every V4.12 selector: ${JSON.stringify(opened.editor)}`
    );

    const openedScreenshot = await captureScreenshot(
      client,
      outputRoot,
      "d03-s2-f11-opened-1440x900.png"
    );
    assertScreenshot(openedScreenshot);

    const reClosed = await clickSummary(client);
    assert(
      reClosed.editor.open === false,
      "F-11 summary activation must close the editor after round-trip."
    );
    assert(
      reClosed.editor.visibleFieldCount === 0,
      `F-11 re-closed editor must hide form fields: ${JSON.stringify(reClosed.editor)}`
    );

    const editorOuterHtml = await collectEditorOuterHtml(client);
    assertForbiddenClaimsAbsent("F-11 rule editor outerHTML", editorOuterHtml);

    writeJsonArtifact(outputRoot, "d03-s2-runtime-state.json", {
      capturedAt: new Date().toISOString(),
      viewport: VIEWPORT_DESKTOP,
      requestPath: REQUEST_PATH,
      screenshots: [closedScreenshot, openedScreenshot],
      initial,
      focused: {
        summaryFocused: focused.summaryFocused,
        summaryTabIndex: focused.summaryTabIndex
      },
      opened: {
        editor: opened.editor,
        statusPanelHeight: opened.statusPanelHeight
      },
      reClosed: {
        editor: reClosed.editor,
        statusPanelHeight: reClosed.statusPanelHeight
      }
    });
  });

  console.log(
    `M8A-V3 D-03.S2 handover rule config default-closed smoke green at ${path.relative(
      repoRoot,
      outputRoot
    )}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
