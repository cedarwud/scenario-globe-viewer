// M8A-V3 D-03.S4 cross-panel truth chip smoke.
// Asserts the static truth chip is mounted before the primary telemetry lane
// while preserving D-03.S1 containment, D-03.S2 disclosure state, and D-03.S3
// control grouping.

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
const outputRoot = path.join(repoRoot, "output/m8a-v3-d03/d03-s4");
const evidenceRoot = path.join(outputRoot, "evidence");

const REQUEST_PATH = "/?scenePreset=global";
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const MAX_COLLAPSED_PANEL_PIXELS = Math.round(VIEWPORT_DESKTOP.height * 0.4);
const MAX_EXPANDED_PANEL_PIXELS = Math.round(VIEWPORT_DESKTOP.height * 0.6);
const MAX_CHIP_REM = 2.2;
const EXPECTED_CHIP_TEXT =
  "Modeled, not measured. Communication Rate, Handover Decision, Physical Inputs, and Validation State each retain their own bounded-proxy / Repo-owned provenance.";
const EXPECTED_GROUPS = [
  ["scenario", "Scene controls"],
  ["replay", "Replay controls"],
  ["policy", "Policy controls"]
];

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
  words("complete", "ITRI", "acceptance"),
  words("Phase", "8", "unlocked"),
  dashed("M8A", "V4") + words("", dashed("endpoint", "pair"), "gate", "resolved"),
  words("ITRI", "orbit", "model", "is", "integrated"),
  dashed("D", "03") + words("", "closed"),
  dashed("D", "03") + words("", "\u5df2\u5b8c\u6210"),
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

  assert(!hit, `${label} contains a disallowed D-03 claim: ${hit}`);
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);

  assert(
    stat.size > 10_000,
    `Screenshot is unexpectedly small: ${absolutePath}`
  );
}

async function installConsoleErrorProbe(client) {
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      (() => {
        const runtimeErrors = [];
        Object.defineProperty(window, "__D03_S4_RUNTIME_ERRORS__", {
          value: runtimeErrors,
          configurable: false
        });
        const serialize = (value) => {
          if (value instanceof Error) {
            return value.message;
          }
          if (typeof value === "string") {
            return value;
          }
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        };
        window.addEventListener("error", (event) => {
          runtimeErrors.push(serialize(event.error ?? event.message));
        });
        window.addEventListener("unhandledrejection", (event) => {
          runtimeErrors.push(serialize(event.reason));
        });
        const originalError = console.error.bind(console);
        console.error = (...args) => {
          runtimeErrors.push(args.map(serialize).join(" "));
          originalError(...args);
        };
      })();
    `
  });
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

async function readTruthChipState(client) {
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
      const readRect = (element) => {
        if (!(element instanceof HTMLElement)) {
          return null;
        }

        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        };
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
      const groupState = (key) => {
        const group = document.querySelector(
          '[data-operator-control-group="' + key + '"]'
        );
        const heading = group?.querySelector(
          "[data-operator-control-group-heading='true']"
        );
        return {
          present: group instanceof HTMLElement,
          visible: isVisible(group),
          rect: readRect(group),
          ariaLabelledBy: group?.getAttribute("aria-labelledby") ?? null,
          heading: {
            present: heading instanceof HTMLElement,
            id: heading instanceof HTMLElement ? heading.id : null,
            text: normalize(heading?.textContent),
            visible: isVisible(heading)
          },
          membership: {
            scenarioLabel: Boolean(
              group?.querySelector("[data-operator-field='scenario-label']")
            ),
            scenarioSelect: Boolean(
              group?.querySelector("[data-operator-control='scenario']")
            ),
            replayModeCount:
              group?.querySelectorAll("[data-operator-control='mode']").length ?? 0,
            replaySpeedCount:
              group?.querySelectorAll("[data-operator-control='speed']").length ?? 0,
            policySelect: Boolean(
              group?.querySelector("[data-operator-control='handover-policy']")
            ),
            policyStatus: Boolean(
              group?.querySelector("[data-operator-policy-status='true']")
            )
          }
        };
      };

      const operatorRoot = document.querySelector("[data-operator-hud='bootstrap']");
      const telemetryRoot = document.querySelector(".operator-status-hud__telemetry");
      const chip = document.querySelector("[data-cross-panel-truth-chip='true']");
      const primaryGroup = document.querySelector("[data-status-panel-rank='primary']");
      const secondaryGroup = document.querySelector("[data-status-panel-rank='secondary']");
      const secondaryToggle = document.querySelector(
        "[data-status-panel-secondary-toggle='true']"
      );
      const statusPanel = document.querySelector(".hud-panel--status");
      const handoverRuleEditor = document.querySelector(
        "[data-handover-rule-config-editor='true']"
      );
      const policySelect = document.querySelector("[data-operator-control='handover-policy']");
      const policyStatus = document.querySelector("[data-operator-policy-status='true']");
      const communicationRateFootnote = document.querySelector(
        "[data-communication-rate-field='footnote']"
      );
      const communicationRateSource = document.querySelector(
        "[data-communication-rate-field='source']"
      );
      const handoverProvenance = document.querySelector(
        "[data-handover-field='provenance']"
      );
      const physicalFamilies = document.querySelector("[data-physical-field='families']");
      const physicalProvenance = document.querySelector(
        "[data-physical-field='provenance']"
      );
      const validationHeading = document.querySelector(
        "[data-validation-field='heading']"
      );
      const validationProvenance = document.querySelector(
        "[data-validation-field='provenance']"
      );
      const statusRect = readRect(statusPanel);
      const chipRect = readRect(chip);
      const rootText = operatorRoot?.textContent ?? "";
      const compareDocumentPosition =
        chip && primaryGroup ? chip.compareDocumentPosition(primaryGroup) : 0;
      const rootFontSize = Number.parseFloat(
        window.getComputedStyle(document.documentElement).fontSize
      );

      return {
        requestPath: window.location.pathname + window.location.search,
        bootstrapState: document.documentElement?.dataset.bootstrapState ?? null,
        runtimeErrors: window.__D03_S4_RUNTIME_ERRORS__ ?? [],
        statusPanel: {
          height: statusRect?.height ?? null,
          width: statusRect?.width ?? null
        },
        chip: {
          present: chip instanceof HTMLDivElement,
          visible: isVisible(chip),
          tagName: chip?.tagName ?? null,
          className: chip instanceof HTMLElement ? chip.className : null,
          text: String(chip?.textContent ?? "").trim(),
          outerHTML: chip instanceof HTMLElement ? chip.outerHTML : "",
          dataCrossPanelTruthChip:
            chip instanceof HTMLElement
              ? chip.getAttribute("data-cross-panel-truth-chip")
              : null,
          dataChipRank:
            chip instanceof HTMLElement ? chip.getAttribute("data-chip-rank") : null,
          role: chip instanceof HTMLElement ? chip.getAttribute("role") : null,
          ariaLabel:
            chip instanceof HTMLElement ? chip.getAttribute("aria-label") : null,
          tabindex:
            chip instanceof HTMLElement ? chip.getAttribute("tabindex") : null,
          ariaLive:
            chip instanceof HTMLElement ? chip.getAttribute("aria-live") : null,
          ariaExpanded:
            chip instanceof HTMLElement ? chip.getAttribute("aria-expanded") : null,
          ariaControls:
            chip instanceof HTMLElement ? chip.getAttribute("aria-controls") : null,
          ariaPressed:
            chip instanceof HTMLElement ? chip.getAttribute("aria-pressed") : null,
          descendantOfHud: Boolean(operatorRoot?.contains(chip)),
          descendantOfTelemetry: Boolean(telemetryRoot?.contains(chip)),
          directChildOfTelemetry: Boolean(chip && chip.parentElement === telemetryRoot),
          insidePrimary: Boolean(primaryGroup?.contains(chip)),
          insideSecondary: Boolean(secondaryGroup?.contains(chip)),
          nextSiblingIsPrimary: Boolean(chip?.nextElementSibling === primaryGroup),
          previousSiblingOfPrimary: Boolean(primaryGroup?.previousElementSibling === chip),
          compareDocumentPosition,
          precedesPrimary: Boolean(
            compareDocumentPosition & Node.DOCUMENT_POSITION_FOLLOWING
          ),
          rect: chipRect,
          rootFontSize,
          maxExpectedHeight: rootFontSize * ${MAX_CHIP_REM}
        },
        s1: {
          containment: operatorRoot?.dataset.statusPanelContainment ?? null,
          primary: {
            present:
              primaryGroup instanceof HTMLElement &&
              primaryGroup.dataset.statusPanelRank === "primary",
            containsTimeSlot: Boolean(
              primaryGroup?.querySelector("[data-operator-time-slot='true']")
            ),
            containsCommunicationSlot: Boolean(
              primaryGroup?.querySelector("[data-operator-communication-slot='true']")
            ),
            containsDecisionSlot: Boolean(
              primaryGroup?.querySelector("[data-operator-decision-slot='true']")
            ),
            childSlots: Array.from(primaryGroup?.children ?? [])
              .map((element) => {
                if (element.hasAttribute("data-operator-time-slot")) {
                  return "time";
                }
                if (element.hasAttribute("data-operator-communication-slot")) {
                  return "communication";
                }
                if (element.hasAttribute("data-operator-decision-slot")) {
                  return "decision";
                }
                return element.getAttribute("data-cross-panel-truth-chip") ?? element.tagName;
              })
          },
          secondary: {
            present:
              secondaryGroup instanceof HTMLElement &&
              secondaryGroup.dataset.statusPanelRank === "secondary",
            hiddenAttr:
              secondaryGroup instanceof HTMLElement ? secondaryGroup.hidden : null,
            ariaHidden: secondaryGroup?.getAttribute("aria-hidden") ?? null,
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
            present: secondaryToggle instanceof HTMLButtonElement,
            ariaExpanded: secondaryToggle?.getAttribute("aria-expanded") ?? null,
            ariaControls: secondaryToggle?.getAttribute("aria-controls") ?? null
          },
          slotRanks: {
            time: slotRank("[data-operator-time-slot='true']"),
            communication: slotRank("[data-operator-communication-slot='true']"),
            decision: slotRank("[data-operator-decision-slot='true']"),
            physical: slotRank("[data-operator-physical-slot='true']"),
            starter: slotRank("[data-operator-starter-slot='true']"),
            validation: slotRank("[data-operator-validation-slot='true']")
          }
        },
        s2: {
          editorPresent: handoverRuleEditor instanceof HTMLDetailsElement,
          editorOpen:
            handoverRuleEditor instanceof HTMLDetailsElement
              ? handoverRuleEditor.open
              : null
        },
        s3: {
          groups: {
            scenario: groupState("scenario"),
            replay: groupState("replay"),
            policy: groupState("policy")
          },
          policySelect: policySelect instanceof HTMLSelectElement,
          policyStatus: policyStatus instanceof HTMLElement
        },
        phrases: {
          modeled: rootText.includes("Modeled, not measured."),
          boundedProxy: rootText.includes("bounded-proxy"),
          repoOwned: rootText.includes("Repo-owned") || rootText.includes("repo-owned"),
          rain: rootText.includes("Rain"),
          validationBoundary: rootText.includes("Validation Boundary")
        },
        perPanelPhrases: {
          communicationRateFootnote: normalize(communicationRateFootnote?.textContent),
          communicationRateSource: normalize(communicationRateSource?.textContent),
          handoverProvenance: normalize(handoverProvenance?.textContent),
          handoverProvenanceDetail:
            handoverProvenance instanceof HTMLElement
              ? normalize(handoverProvenance.title)
              : "",
          physicalFamilies: normalize(physicalFamilies?.textContent),
          physicalProvenance: normalize(physicalProvenance?.textContent),
          physicalProvenanceDetail:
            physicalProvenance instanceof HTMLElement
              ? normalize(physicalProvenance.title)
              : "",
          validationHeading: normalize(validationHeading?.textContent),
          validationProvenance: normalize(validationProvenance?.textContent),
          validationProvenanceDetail:
            validationProvenance instanceof HTMLElement
              ? normalize(validationProvenance.title)
              : ""
        }
      };
    })()`
  );
}

async function waitForD03S4Ready(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 160; attempt += 1) {
    lastState = await readTruthChipState(client);

    if (
      lastState.bootstrapState === "ready" &&
      lastState.chip.present &&
      lastState.chip.text === EXPECTED_CHIP_TEXT &&
      lastState.s1.primary.present &&
      lastState.s2.editorPresent &&
      lastState.s3.policySelect
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`D-03.S4 truth chip did not become ready: ${JSON.stringify(lastState)}`);
}

async function clickSecondaryToggle(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const button = document.querySelector(
        "[data-status-panel-secondary-toggle='true']"
      );
      if (!(button instanceof HTMLElement)) {
        throw new Error("Missing D-03.S1 secondary toggle.");
      }
      button.click();
    })()`
  );

  await sleep(160);
  return await readTruthChipState(client);
}

function assertInitialState(state) {
  assert(
    state.requestPath === REQUEST_PATH,
    `D-03.S4 smoke must run on the default global route; got ${state.requestPath}`
  );
  assert(
    typeof state.statusPanel.height === "number" &&
      state.statusPanel.height <= MAX_COLLAPSED_PANEL_PIXELS,
    `Collapsed status panel height ${state.statusPanel.height}px exceeds ${MAX_COLLAPSED_PANEL_PIXELS}px.`
  );

  assert(state.chip.present, "Cross-panel truth chip must be a div.");
  assert(state.chip.visible, "Cross-panel truth chip must be visible.");
  assert(
    state.chip.descendantOfHud && state.chip.descendantOfTelemetry,
    "Cross-panel truth chip must live inside the Operator HUD telemetry area."
  );
  assert(
    state.chip.directChildOfTelemetry,
    "Cross-panel truth chip must be a direct child of .operator-status-hud__telemetry."
  );
  assert(
    state.chip.nextSiblingIsPrimary &&
      state.chip.previousSiblingOfPrimary &&
      state.chip.precedesPrimary,
    `Cross-panel truth chip must be before the primary telemetry container: ${JSON.stringify(state.chip)}`
  );
  assert(
    state.chip.dataCrossPanelTruthChip === "true" &&
      state.chip.dataChipRank === "cross-panel-primary" &&
      state.chip.role === "note" &&
      state.chip.ariaLabel === "Cross-panel truth boundary",
    `Cross-panel truth chip attributes must match the S4 lock: ${JSON.stringify(state.chip)}`
  );
  assert(
    state.chip.text === EXPECTED_CHIP_TEXT,
    `Cross-panel truth chip copy mismatch: ${state.chip.text}`
  );
  assert(
    state.chip.tabindex === null &&
      state.chip.ariaLive === null &&
      state.chip.ariaExpanded === null &&
      state.chip.ariaControls === null &&
      state.chip.ariaPressed === null,
    `Cross-panel truth chip must remain static and non-interactive: ${JSON.stringify(state.chip)}`
  );
  assert(
    !state.chip.insidePrimary && !state.chip.insideSecondary,
    "Cross-panel truth chip must not be inside primary or secondary rank containers."
  );
  assert(
    state.chip.rect &&
      state.chip.rect.height <= state.chip.maxExpectedHeight + 1,
    `Cross-panel truth chip height ${state.chip.rect?.height}px exceeds ${MAX_CHIP_REM}rem.`
  );

  assert(
    state.s1.containment === "v3-d03-s1",
    `D-03.S1 containment marker must remain present; got ${state.s1.containment}`
  );
  assert(
    state.s1.primary.present &&
      state.s1.primary.containsTimeSlot &&
      state.s1.primary.containsCommunicationSlot &&
      state.s1.primary.containsDecisionSlot,
    `D-03.S1 primary rank must retain time, communication, and decision slots: ${JSON.stringify(state.s1.primary)}`
  );
  assert(
    state.s1.primary.childSlots.join("|") === "time|communication|decision",
    `D-03.S1 primary child set must remain unchanged: ${JSON.stringify(state.s1.primary.childSlots)}`
  );
  assert(
    state.s1.secondary.present &&
      state.s1.secondary.containsPhysicalSlot &&
      state.s1.secondary.containsStarterSlot &&
      state.s1.secondary.containsValidationSlot,
    `D-03.S1 secondary rank must retain physical, starter, and validation slots: ${JSON.stringify(state.s1.secondary)}`
  );
  assert(
    state.s1.secondary.hiddenAttr === true &&
      state.s1.secondary.ariaHidden === "true",
    `D-03.S1 secondary group must remain collapsed by default: ${JSON.stringify(state.s1.secondary)}`
  );
  assert(
    state.s1.toggle.present && state.s1.toggle.ariaExpanded === "false",
    `D-03.S1 secondary toggle must default to aria-expanded=false: ${JSON.stringify(state.s1.toggle)}`
  );
  assert(
    state.s1.slotRanks.time === "primary" &&
      state.s1.slotRanks.communication === "primary" &&
      state.s1.slotRanks.decision === "primary" &&
      state.s1.slotRanks.physical === "secondary" &&
      state.s1.slotRanks.starter === "secondary" &&
      state.s1.slotRanks.validation === "secondary",
    `D-03.S1 slot rank lookup must remain stable: ${JSON.stringify(state.s1.slotRanks)}`
  );

  assert(
    state.s2.editorPresent && state.s2.editorOpen === false,
    `D-03.S2 F-11 editor must remain default-closed: ${JSON.stringify(state.s2)}`
  );

  let previousLeft = -Infinity;
  for (const [key, headingText] of EXPECTED_GROUPS) {
    const group = state.s3.groups[key];
    assert(group.present, `${key} control group must remain present.`);
    assert(group.visible, `${key} control group must remain visible.`);
    assert(
      group.rect && group.rect.left > previousLeft,
      `${key} control group must preserve left-to-right order.`
    );
    previousLeft = group.rect.left;
    assert(
      group.heading.present &&
        group.heading.visible &&
        group.heading.text === headingText &&
        group.ariaLabelledBy === group.heading.id,
      `${key} control group heading must remain labelled and exact: ${JSON.stringify(group.heading)}`
    );
  }
  assert(
    state.s3.groups.scenario.membership.scenarioLabel &&
      state.s3.groups.scenario.membership.scenarioSelect,
    "D-03.S3 scenario group membership must remain intact."
  );
  assert(
    state.s3.groups.replay.membership.replayModeCount === 2 &&
      state.s3.groups.replay.membership.replaySpeedCount > 0,
    "D-03.S3 replay group membership must remain intact."
  );
  assert(
    state.s3.groups.policy.membership.policySelect &&
      state.s3.groups.policy.membership.policyStatus &&
      state.s3.policySelect &&
      state.s3.policyStatus,
    "D-03.S3 policy group membership must remain intact."
  );
}

function assertExpandedState(state) {
  assert(
    state.s1.toggle.ariaExpanded === "true",
    `D-03.S1 secondary toggle must expand via element.click(): ${JSON.stringify(state.s1.toggle)}`
  );
  assert(
    state.s1.secondary.hiddenAttr === false &&
      state.s1.secondary.ariaHidden === "false",
    `D-03.S1 secondary group must be visible after expansion: ${JSON.stringify(state.s1.secondary)}`
  );
  assert(
    typeof state.statusPanel.height === "number" &&
      state.statusPanel.height <= MAX_EXPANDED_PANEL_PIXELS,
    `Expanded status panel height ${state.statusPanel.height}px exceeds ${MAX_EXPANDED_PANEL_PIXELS}px.`
  );

  assert(
    state.phrases.modeled &&
      state.phrases.boundedProxy &&
      state.phrases.repoOwned &&
      state.phrases.rain &&
      state.phrases.validationBoundary,
    `Expanded Operator HUD text must retain every S4 phrase: ${JSON.stringify(state.phrases)}`
  );
  assert(
    state.perPanelPhrases.communicationRateFootnote === "Modeled, not measured." &&
      (state.perPanelPhrases.communicationRateSource.includes("bounded proxy") ||
        state.perPanelPhrases.communicationRateSource.includes("bounded-proxy")),
    `Communication Rate truth-boundary copy must remain reachable: ${JSON.stringify(state.perPanelPhrases)}`
  );
  assert(
    state.perPanelPhrases.handoverProvenance.includes("bounded-proxy") &&
      state.perPanelPhrases.handoverProvenanceDetail.includes("repo-owned"),
    `Handover Decision provenance copy must remain reachable: ${JSON.stringify(state.perPanelPhrases)}`
  );
  assert(
    (state.perPanelPhrases.physicalFamilies.includes("rain-attenuation") ||
      state.perPanelPhrases.physicalProvenance.includes("Rain")) &&
      state.perPanelPhrases.physicalProvenance.includes("Rain: bounded-proxy"),
    `Physical Inputs provenance copy must remain reachable: ${JSON.stringify(state.perPanelPhrases)}`
  );
  assert(
    state.perPanelPhrases.validationHeading === "Validation Boundary" &&
      state.perPanelPhrases.validationProvenanceDetail.includes("repo-owned"),
    `Validation State boundary copy must remain reachable: ${JSON.stringify(state.perPanelPhrases)}`
  );
}

async function main() {
  ensureOutputRoot(outputRoot);
  mkdirSync(evidenceRoot, { recursive: true });

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    await installConsoleErrorProbe(client);
    await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
    await waitForGlobeReady(client, "M8A-V3 D-03.S4 default");
    await dismissNavigationHelp(client);
    await dismissCesiumWidgetError(client);
    await waitForViewerCanvasSettle(client);
    await sleep(400);

    const initial = await waitForD03S4Ready(client);
    assertInitialState(initial);

    const collapsedScreenshot = await captureScreenshot(
      client,
      evidenceRoot,
      "d03-s4-truth-chip-default-collapsed-1440x900.png"
    );
    assertScreenshot(collapsedScreenshot);

    const expanded = await clickSecondaryToggle(client);
    assertExpandedState(expanded);

    const expandedScreenshot = await captureScreenshot(
      client,
      evidenceRoot,
      "d03-s4-truth-chip-secondary-expanded-1440x900.png"
    );
    assertScreenshot(expandedScreenshot);

    assertForbiddenClaimsAbsent(
      "Cross-panel truth chip scoped outerHTML",
      expanded.chip.outerHTML
    );

    const finalState = await readTruthChipState(client);
    assert(
      finalState.runtimeErrors.length === 0,
      `D-03.S4 smoke must not emit console/runtime errors: ${JSON.stringify(
        finalState.runtimeErrors
      )}`
    );

    writeJsonArtifact(outputRoot, "d03-s4-runtime-state.json", {
      capturedAt: new Date().toISOString(),
      viewport: VIEWPORT_DESKTOP,
      maxCollapsedPanelPixels: MAX_COLLAPSED_PANEL_PIXELS,
      maxExpandedPanelPixels: MAX_EXPANDED_PANEL_PIXELS,
      maxChipRem: MAX_CHIP_REM,
      requestPath: REQUEST_PATH,
      screenshots: [collapsedScreenshot, expandedScreenshot],
      initial,
      expanded,
      final: {
        statusPanelHeight: finalState.statusPanel.height,
        chip: finalState.chip,
        s1: finalState.s1,
        s2: finalState.s2,
        s3: finalState.s3,
        phrases: finalState.phrases,
        perPanelPhrases: finalState.perPanelPhrases
      }
    });
  });

  console.log(
    `M8A-V3 D-03.S4 cross-panel truth chip smoke green at ${path.relative(
      repoRoot,
      outputRoot
    )}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
