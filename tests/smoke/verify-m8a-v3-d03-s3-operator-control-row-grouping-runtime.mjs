// M8A-V3 D-03.S3 operator control row grouping smoke.
// Asserts the Operator HUD control row is grouped into Scene, Replay,
// and Policy clusters while preserving the V4.12 selector surface and
// D-03.S1 / D-03.S2 containment behavior.

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
const outputRoot = path.join(repoRoot, "output/m8a-v3-d03/d03-s3");

const REQUEST_PATH = "/?scenePreset=global";
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const MAX_PANEL_PIXELS = Math.round(VIEWPORT_DESKTOP.height * 0.4);
const EXPECTED_GROUPS = [
  ["scenario", "Scene controls"],
  ["replay", "Replay controls"],
  ["policy", "Policy controls"]
];
const EXPECTED_POLICIES = [
  {
    id: "bootstrap-balanced-v1",
    label: "Balanced handover policy",
    tieBreak: "latency,jitter,speed,stable-serving"
  },
  {
    id: "bootstrap-latency-priority-v1",
    label: "Latency priority policy",
    tieBreak: "latency,jitter,stable-serving,speed"
  },
  {
    id: "bootstrap-throughput-priority-v1",
    label: "Throughput priority policy",
    tieBreak: "speed,latency,jitter,stable-serving"
  }
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
  words("complete", "customer", "acceptance"),
  words("Phase", "8", "unlocked"),
  dashed("M8A", "V4") + words("", dashed("endpoint", "pair"), "gate", "resolved"),
  words("customer", "orbit", "model", "is", "integrated"),
  dashed("D", "03") + words("", "closed"),
  dashed("D", "03") + words("", "completed"),
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
        Object.defineProperty(window, "__D03_S3_RUNTIME_ERRORS__", {
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

async function readGroupingState(client) {
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
            replayModeCount: group?.querySelectorAll("[data-operator-control='mode']").length ?? 0,
            replaySpeedCount:
              group?.querySelectorAll("[data-operator-control='speed']").length ?? 0,
            policySelect: Boolean(
              group?.querySelector("[data-operator-control='handover-policy']")
            ),
            policyStatus: Boolean(
              group?.querySelector("[data-operator-policy-status='true']")
            )
          },
          labels: Array.from(group?.querySelectorAll(".operator-control-label") ?? [])
            .map((label) => normalize(label.textContent))
        };
      };

      const operatorRoot = document.querySelector("[data-operator-hud='bootstrap']");
      const statusPanel = document.querySelector(".hud-panel--status");
      const statusRect = statusPanel?.getBoundingClientRect();
      const policySelect = document.querySelector("[data-operator-control='handover-policy']");
      const policyStatus = document.querySelector("[data-operator-policy-status='true']");
      const handoverPanel = document.querySelector("[data-handover-decision-panel='bootstrap']");
      const handoverRuleEditor = document.querySelector(
        "[data-handover-rule-config-editor='true']"
      );
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.handoverDecision?.getState?.();

      return {
        requestPath: window.location.pathname + window.location.search,
        bootstrapState: document.documentElement?.dataset.bootstrapState ?? null,
        runtimeErrors: window.__D03_S3_RUNTIME_ERRORS__ ?? [],
        statusPanelHeight: statusRect ? statusRect.height : null,
        groups: {
          scenario: groupState("scenario"),
          replay: groupState("replay"),
          policy: groupState("policy")
        },
        v412Selectors: {
          operatorRoot: operatorRoot instanceof HTMLElement,
          scenarioSelect: Boolean(
            document.querySelector("[data-operator-control='scenario']")
          ),
          policySelect: policySelect instanceof HTMLSelectElement,
          policyStatus: policyStatus instanceof HTMLElement,
          realTimeMode: Boolean(
            document.querySelector("[data-operator-control='mode'][data-operator-mode='real-time']")
          ),
          prerecordedMode: Boolean(
            document.querySelector("[data-operator-control='mode'][data-operator-mode='prerecorded']")
          ),
          speedControls: document.querySelectorAll(
            "[data-operator-control='speed'][data-operator-speed]"
          ).length,
          scenarioLabel: Boolean(
            document.querySelector("[data-operator-field='scenario-label']")
          )
        },
        policy: {
          selectValue: policySelect?.value ?? null,
          liveRegionText: normalize(policyStatus?.textContent),
          hudPolicyId: operatorRoot?.dataset.handoverPolicyId ?? null,
          hudPolicyLabel: operatorRoot?.dataset.handoverPolicyLabel ?? null,
          hudPolicySummary: operatorRoot?.dataset.handoverPolicySummary ?? null,
          controlError: operatorRoot?.dataset.controlError ?? null,
          panelPolicyId: handoverPanel?.dataset.handoverPolicyId ?? null,
          panelPolicyLabel: handoverPanel?.dataset.handoverPolicyLabel ?? null,
          panelPolicyTieBreak: handoverPanel?.dataset.handoverPolicyTieBreak ?? null,
          documentPolicyId: document.documentElement?.dataset.handoverPolicyId ?? null,
          documentPolicyLabel: document.documentElement?.dataset.handoverPolicyLabel ?? null,
          documentPolicyTieBreak:
            document.documentElement?.dataset.handoverPolicyTieBreak ?? null,
          reportPolicyId: state?.report?.policyId ?? null,
          reportPolicyLabel: state?.report?.policyLabel ?? null,
          reportPolicyTieBreak: state?.report?.policyTieBreak?.join(",") ?? null,
          snapshotPolicyId: state?.snapshot?.policyId ?? null
        },
        s1: {
          containment: operatorRoot?.dataset.statusPanelContainment ?? null,
          primaryPresent: Boolean(
            document.querySelector("[data-status-panel-rank='primary']")
          ),
          secondaryPresent: Boolean(
            document.querySelector("[data-status-panel-rank='secondary']")
          ),
          communicationRank: slotRank("[data-operator-communication-slot='true']"),
          decisionRank: slotRank("[data-operator-decision-slot='true']"),
          physicalRank: slotRank("[data-operator-physical-slot='true']")
        },
        s2: {
          editorPresent: handoverRuleEditor instanceof HTMLDetailsElement,
          editorOpen:
            handoverRuleEditor instanceof HTMLDetailsElement
              ? handoverRuleEditor.open
              : null
        }
      };
    })()`
  );
}

async function waitForD03S3Ready(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 160; attempt += 1) {
    lastState = await readGroupingState(client);

    if (
      lastState.bootstrapState === "ready" &&
      lastState.groups.scenario.visible &&
      lastState.groups.replay.visible &&
      lastState.groups.policy.visible &&
      lastState.v412Selectors.policySelect &&
      lastState.policy.reportPolicyId === "bootstrap-balanced-v1" &&
      lastState.s2.editorPresent
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`D-03.S3 HUD grouping did not become ready: ${JSON.stringify(lastState)}`);
}

async function selectPolicy(client, policyId) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const select = document.querySelector("[data-operator-control='handover-policy']");
      if (!(select instanceof HTMLSelectElement)) {
        throw new Error("Missing F-10 handover policy selector.");
      }

      select.value = ${JSON.stringify(policyId)};
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`
  );

  await sleep(260);
  return await readGroupingState(client);
}

async function collectControlGroupScanHtml(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const groups = ["scenario", "replay", "policy"]
        .map((key) => document.querySelector('[data-operator-control-group="' + key + '"]'))
        .filter((element) => element instanceof HTMLElement)
        .map((element) => element.outerHTML);
      const headings = Array.from(
        document.querySelectorAll("[data-operator-control-group-heading='true']")
      ).map((element) => element.outerHTML);
      return groups.concat(headings).join("\\n");
    })()`
  );
}

function assertGroupingState(state) {
  assert(
    state.requestPath === REQUEST_PATH,
    `D-03.S3 smoke must run on the default global route; got ${state.requestPath}`
  );
  assert(
    typeof state.statusPanelHeight === "number" &&
      state.statusPanelHeight <= MAX_PANEL_PIXELS,
    `Status panel height ${state.statusPanelHeight}px exceeds ${MAX_PANEL_PIXELS}px.`
  );

  let previousLeft = -Infinity;
  for (const [key, headingText] of EXPECTED_GROUPS) {
    const group = state.groups[key];
    assert(group.present, `${key} group must be present.`);
    assert(group.visible, `${key} group must be visible.`);
    assert(group.rect && group.rect.left > previousLeft, `${key} group must preserve left-to-right order.`);
    previousLeft = group.rect.left;
    assert(group.heading.present, `${key} group heading must be present.`);
    assert(group.heading.visible, `${key} group heading must be visible.`);
    assert(
      group.heading.text === headingText,
      `${key} group heading must be exactly "${headingText}", got "${group.heading.text}".`
    );
    assert(
      group.heading.id && group.ariaLabelledBy === group.heading.id,
      `${key} group must be labelled by its heading.`
    );
  }

  assert(
    state.groups.scenario.membership.scenarioLabel &&
      state.groups.scenario.membership.scenarioSelect,
    "Scenario group must contain scenario label and selector."
  );
  assert(
    state.groups.scenario.labels.includes("Scenario"),
    "Scenario per-field label must stay inside its control wrapper."
  );
  assert(
    state.groups.replay.membership.replayModeCount === 2 &&
      state.groups.replay.membership.replaySpeedCount > 0,
    "Replay group must contain both replay modes and at least one speed control."
  );
  assert(
    state.groups.replay.labels.includes("Replay Mode") &&
      state.groups.replay.labels.includes("Replay Speed"),
    "Replay per-field labels must stay inside their control wrappers."
  );
  assert(
    state.groups.policy.membership.policySelect &&
      state.groups.policy.membership.policyStatus,
    "Policy group must contain the F-10 selector and live region."
  );
  assert(
    state.groups.policy.labels.includes("Handover Policy"),
    "Policy per-field label must stay inside its control wrapper."
  );

  for (const [name, present] of Object.entries(state.v412Selectors)) {
    if (name === "speedControls") {
      assert(present > 0, "F-10 speed selector set must remain queryable.");
      continue;
    }

    assert(present === true, `V4.12 selector "${name}" must remain queryable.`);
  }

  assert(
    state.s1.containment === "v3-d03-s1" &&
      state.s1.primaryPresent &&
      state.s1.secondaryPresent,
    `D-03.S1 containment and rank containers must remain present: ${JSON.stringify(state.s1)}`
  );
  assert(
    state.s1.communicationRank === "primary" &&
      state.s1.decisionRank === "primary" &&
      state.s1.physicalRank === "secondary",
    `D-03.S1 rank lookup must remain stable: ${JSON.stringify(state.s1)}`
  );
  assert(
    state.s2.editorPresent && state.s2.editorOpen === false,
    `D-03.S2 F-11 editor must remain default-closed: ${JSON.stringify(state.s2)}`
  );
}

function assertPolicyState(state, expected, label) {
  assert(
    state.policy.controlError === null,
    `${label}: HUD must not report control errors.`
  );
  assert(
    state.policy.selectValue === expected.id,
    `${label}: selector value must match the selected policy.`
  );
  assert(
    state.policy.hudPolicyId === expected.id &&
      state.policy.panelPolicyId === expected.id &&
      state.policy.documentPolicyId === expected.id &&
      state.policy.reportPolicyId === expected.id &&
      state.policy.snapshotPolicyId === expected.id,
    `${label}: policy id must align across HUD, panel, telemetry, report, and snapshot.`
  );
  assert(
    state.policy.hudPolicyLabel === expected.label &&
      state.policy.panelPolicyLabel === expected.label &&
      state.policy.documentPolicyLabel === expected.label &&
      state.policy.reportPolicyLabel === expected.label,
    `${label}: policy label must align across preserved surfaces.`
  );
  assert(
    state.policy.panelPolicyTieBreak === expected.tieBreak &&
      state.policy.documentPolicyTieBreak === expected.tieBreak &&
      state.policy.reportPolicyTieBreak === expected.tieBreak,
    `${label}: policy tie-break must align across preserved surfaces.`
  );
  assert(
    state.policy.liveRegionText === `Policy changed to ${expected.label}.`,
    `${label}: live region must announce the policy change.`
  );
}

async function main() {
  ensureOutputRoot(outputRoot);
  mkdirSync(path.join(outputRoot, "evidence"), { recursive: true });

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    await installConsoleErrorProbe(client);
    await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
    await waitForGlobeReady(client, "M8A-V3 D-03.S3 default");
    await dismissNavigationHelp(client);
    await dismissCesiumWidgetError(client);
    await waitForViewerCanvasSettle(client);
    await sleep(400);

    const initial = await waitForD03S3Ready(client);
    assertGroupingState(initial);
    assert(
      initial.policy.liveRegionText === "",
      "Initial render must not announce a policy change."
    );

    const policyRoundTrips = [];
    for (const expected of EXPECTED_POLICIES) {
      const selected = await selectPolicy(client, expected.id);
      assertPolicyState(selected, expected, `selected ${expected.id}`);
      policyRoundTrips.push({
        policyId: expected.id,
        hudPolicyLabel: selected.policy.hudPolicyLabel,
        reportPolicyLabel: selected.policy.reportPolicyLabel
      });
    }

    const screenshotPath = await captureScreenshot(
      client,
      outputRoot,
      "d03-s3-control-row-grouping-1440x900.png"
    );
    assertScreenshot(screenshotPath);

    const scanHtml = await collectControlGroupScanHtml(client);
    assertForbiddenClaimsAbsent("Operator control group scoped outerHTML", scanHtml);

    const finalState = await readGroupingState(client);
    assert(
      finalState.runtimeErrors.length === 0,
      `D-03.S3 smoke must not emit console/runtime errors: ${JSON.stringify(
        finalState.runtimeErrors
      )}`
    );

    writeJsonArtifact(outputRoot, "d03-s3-runtime-state.json", {
      capturedAt: new Date().toISOString(),
      viewport: VIEWPORT_DESKTOP,
      maxPanelPixels: MAX_PANEL_PIXELS,
      requestPath: REQUEST_PATH,
      screenshotPath,
      initial,
      policyRoundTrips,
      final: {
        statusPanelHeight: finalState.statusPanelHeight,
        policy: finalState.policy,
        s1: finalState.s1,
        s2: finalState.s2
      }
    });
  });

  console.log(
    `M8A-V3 D-03.S3 operator control row grouping smoke green at ${path.relative(
      repoRoot,
      outputRoot
    )}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
