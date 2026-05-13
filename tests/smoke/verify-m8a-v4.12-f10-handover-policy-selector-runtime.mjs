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
const outputRoot = path.join(repoRoot, "output/m8a-v4.12-f10-policy-selector");

const REQUEST_PATH = "/";
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
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
const FORBIDDEN_CLAIM_PATTERN =
  /live network control|live rf handover|policy applied to real satellite|policy verified by iperf|policy verified by ping|production handover controller|policy ratified by itri|policy meets 3gpp|policy enforces operator sla|policy ensures >=500 leo|policy closes v-02/i;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

async function installConsoleErrorProbe(client) {
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      (() => {
        const runtimeErrors = [];
        Object.defineProperty(window, "__F10_RUNTIME_ERRORS__", {
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

async function waitForF10Ready(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await inspectF10(client);

    if (
      lastState.bootstrapState === "ready" &&
      lastState.hasCapture &&
      lastState.hud.present &&
      lastState.controls.policyVisible &&
      lastState.panel.visible &&
      lastState.report?.policyId === "bootstrap-balanced-v1"
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`F-10 selector did not become ready: ${JSON.stringify(lastState)}`);
}

async function inspectF10(client) {
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
      const readText = (selector) => {
        const element = document.querySelector(selector);
        return element instanceof HTMLElement ? normalize(element.textContent) : "";
      };
      const readRect = (element) => {
        if (!(element instanceof HTMLElement)) {
          return null;
        }

        const rect = element.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height
        };
      };
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const operatorRoot = document.querySelector("[data-operator-hud='bootstrap']");
      const policySelect = document.querySelector("[data-operator-control='handover-policy']");
      const policyStatus = document.querySelector("[data-operator-policy-status='true']");
      const handoverRoot = document.querySelector("[data-handover-decision-panel='bootstrap']");
      const policyField = document.querySelector("[data-handover-field='policy']");
      const provenanceField = document.querySelector("[data-handover-field='provenance']");
      const state = capture?.handoverDecision?.getState?.();
      const optionData = Array.from(policySelect?.querySelectorAll("option") ?? [])
        .map((option) => ({
          value: option.value,
          label: normalize(option.textContent)
        }));
      const aggregateText = [
        document.body?.innerText ?? "",
        JSON.stringify(state?.report ?? {}),
        JSON.stringify(state?.snapshot ?? {})
      ].join("\\n");

      return {
        bootstrapState: document.documentElement?.dataset.bootstrapState ?? null,
        requestPath: window.location.pathname + window.location.search,
        hasCapture: Boolean(capture?.viewer && capture?.handoverDecision),
        runtimeErrors: window.__F10_RUNTIME_ERRORS__ ?? [],
        hud: {
          present: operatorRoot instanceof HTMLElement,
          policyId: operatorRoot?.dataset.handoverPolicyId ?? null,
          policyLabel: operatorRoot?.dataset.handoverPolicyLabel ?? null,
          policySummary: operatorRoot?.dataset.handoverPolicySummary ?? null,
          replayMode: operatorRoot?.dataset.replayMode ?? null,
          scenarioId: operatorRoot?.dataset.bootstrapScenarioId ?? null,
          controlError: operatorRoot?.dataset.controlError ?? null
        },
        controls: {
          policyVisible: isVisible(policySelect),
          policyValue: policySelect?.value ?? null,
          policyAria: policySelect?.getAttribute("aria-label") ?? null,
          policyDisabled: policySelect instanceof HTMLSelectElement ? policySelect.disabled : null,
          policyOptions: optionData,
          liveRegionRole: policyStatus?.getAttribute("role") ?? null,
          liveRegionAriaLive: policyStatus?.getAttribute("aria-live") ?? null,
          liveRegionAriaAtomic: policyStatus?.getAttribute("aria-atomic") ?? null,
          liveRegionText: normalize(policyStatus?.textContent)
        },
        panel: {
          visible: isVisible(handoverRoot),
          rect: readRect(handoverRoot),
          policyText: normalize(policyField?.textContent),
          policyTitle: policyField instanceof HTMLElement ? policyField.title : "",
          provenanceText: normalize(provenanceField?.textContent),
          policyId: handoverRoot?.dataset.handoverPolicyId ?? null,
          policyLabel: handoverRoot?.dataset.handoverPolicyLabel ?? null,
          policySummary: handoverRoot?.dataset.handoverPolicySummary ?? null,
          policyTieBreak: handoverRoot?.dataset.handoverPolicyTieBreak ?? null,
          provenance: handoverRoot?.dataset.handoverProvenance ?? null
        },
        documentTelemetry: {
          policyId: document.documentElement?.dataset.handoverPolicyId ?? null,
          policyLabel: document.documentElement?.dataset.handoverPolicyLabel ?? null,
          policySummary: document.documentElement?.dataset.handoverPolicySummary ?? null,
          policyTieBreak: document.documentElement?.dataset.handoverPolicyTieBreak ?? null,
          provenance: document.documentElement?.dataset.handoverProvenance ?? null
        },
        report: state?.report ?? null,
        snapshot: state?.snapshot ?? null,
        forbiddenClaimHit: ${FORBIDDEN_CLAIM_PATTERN}.test(aggregateText)
      };
    })()`
  );
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
  await sleep(250);
  return await inspectF10(client);
}

async function switchToPrerecordedSite(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const button = document.querySelector(
        "[data-operator-control='mode'][data-operator-mode='prerecorded']"
      );
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Missing prerecorded replay-mode control.");
      }
      button.click();
    })()`
  );
  await sleep(280);
  await evaluateRuntimeValue(
    client,
    `(() => {
      const select = document.querySelector("[data-operator-control='scenario']");
      if (!(select instanceof HTMLSelectElement)) {
        throw new Error("Missing scenario selector.");
      }

      select.value = "site";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`
  );
  await sleep(420);
  return await inspectF10(client);
}

function assertPolicyState(snapshot, expected, label) {
  assert(snapshot.requestPath === REQUEST_PATH, `${label}: request path must stay default.`);
  assert(snapshot.hud.controlError === null, `${label}: HUD must not report control errors.`);
  assert(
    snapshot.controls.policyValue === expected.id,
    `${label}: selector value must match active policy.`
  );
  assert(
    snapshot.controls.policyAria === "Handover Policy",
    `${label}: selector must expose the locked accessible name.`
  );
  assert(
    snapshot.controls.policyOptions.length === EXPECTED_POLICIES.length,
    `${label}: selector must expose exactly the three F-10 variants.`
  );
  assert(
    snapshot.panel.policyText === expected.label,
    `${label}: Handover Decision panel must show the active policy label.`
  );
  assert(
    snapshot.panel.policyId === expected.id &&
      snapshot.documentTelemetry.policyId === expected.id &&
      snapshot.report?.policyId === expected.id &&
      snapshot.snapshot?.policyId === expected.id,
    `${label}: policy id must align across panel, document telemetry, report, and snapshot.`
  );
  assert(
    snapshot.panel.policyLabel === expected.label &&
      snapshot.documentTelemetry.policyLabel === expected.label &&
      snapshot.report?.policyLabel === expected.label,
    `${label}: policy label must align across panel, telemetry, and report.`
  );
  assert(
    snapshot.panel.policyTieBreak === expected.tieBreak &&
      snapshot.documentTelemetry.policyTieBreak === expected.tieBreak &&
      snapshot.report?.policyTieBreak?.join(",") === expected.tieBreak,
    `${label}: policy tie-break must remain report/telemetry material.`
  );
  assert(
    snapshot.panel.provenance === "bounded-proxy" &&
      snapshot.panel.provenanceText === "bounded-proxy" &&
      snapshot.documentTelemetry.provenance === "bounded-proxy",
    `${label}: bounded-proxy provenance must stay explicit.`
  );
  assert(
    snapshot.controls.liveRegionRole === "status" &&
      snapshot.controls.liveRegionAriaLive === "polite" &&
      snapshot.controls.liveRegionAriaAtomic === "true",
    `${label}: policy switch status must be a polite live region.`
  );
  assert(
    snapshot.forbiddenClaimHit === false,
    `${label}: DOM/report bytes must not include forbidden F-10 claims.`
  );
}

await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
  ensureOutputRoot(outputRoot);
  await setViewport(client, VIEWPORT_DESKTOP);
  await installConsoleErrorProbe(client);
  await client.send("Page.navigate", {
    url: `${baseUrl}${REQUEST_PATH}`
  });
  await waitForGlobeReady(client, "M8A V4.12 F-10 policy selector");

  const ready = await waitForF10Ready(client);
  assertPolicyState(ready, EXPECTED_POLICIES[0], "initial");
  assert(
    ready.controls.liveRegionText === "",
    "Initial render must not announce a policy change."
  );

  const captures = [];

  for (const expected of EXPECTED_POLICIES) {
    const state = await selectPolicy(client, expected.id);
    assertPolicyState(state, expected, `selected ${expected.id}`);
    assert(
      state.controls.liveRegionText === `Policy changed to ${expected.label}.`,
      `selected ${expected.id}: live region must announce the changed policy.`
    );

    const screenshotPath = await captureScreenshot(
      client,
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-${expected.id}.png`
    );
    assertScreenshot(screenshotPath);
    captures.push({
      policyId: expected.id,
      screenshotPath,
      reportPolicyLabel: state.report.policyLabel
    });
  }

  const persisted = await switchToPrerecordedSite(client);
  assertPolicyState(
    persisted,
    EXPECTED_POLICIES[2],
    "after prerecorded site scenario switch"
  );
  assert(
    persisted.hud.replayMode === "prerecorded" &&
      persisted.hud.scenarioId === "bootstrap-site-prerecorded",
    "Policy selection must persist across replay mode and scenario changes."
  );
  assert(
    persisted.runtimeErrors.length === 0,
    `F-10 policy selector smoke must not emit console/runtime errors: ${JSON.stringify(
      persisted.runtimeErrors
    )}`
  );

  const artifactPath = writeJsonArtifact(outputRoot, "f10-policy-selector-smoke.json", {
    requestPath: REQUEST_PATH,
    viewport: VIEWPORT_DESKTOP,
    policies: EXPECTED_POLICIES,
    captures,
    persistedPolicyId: persisted.report.policyId,
    persistedScenarioId: persisted.hud.scenarioId,
    persistedReplayMode: persisted.hud.replayMode
  });

  console.log(
    `M8A V4.12 F-10 policy selector runtime smoke passed: ${JSON.stringify({
      artifactPath,
      captures,
      persistedPolicyId: persisted.report.policyId,
      persistedScenarioId: persisted.hud.scenarioId
    })}`
  );
});
