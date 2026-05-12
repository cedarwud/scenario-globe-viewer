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
const outputRoot = path.join(repoRoot, "output/m8a-v4.12-f11-rule-config");

const REQUEST_PATH = "/";
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const FORBIDDEN_CLAIM_PATTERN =
  /production handover rule|live network rule applied|rule applied to real satellite|rule verified by iperf|rule verified by ping|rule meets 3gpp|rule enforces operator sla|rule validates dut|rule closes v-02|rule closes >=500 leo/i;

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
        Object.defineProperty(window, "__F11_RUNTIME_ERRORS__", {
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

async function waitForF11Ready(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await inspectF11(client);

    if (
      lastState.bootstrapState === "ready" &&
      lastState.hasCapture &&
      lastState.panel.visible &&
      lastState.editor.visible &&
      lastState.report?.appliedRuleConfig?.policyId === "bootstrap-balanced-v1"
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`F-11 rule editor did not become ready: ${JSON.stringify(lastState)}`);
}

async function inspectF11(client) {
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
      const readInput = (name) => {
        const element = document.querySelector('[data-handover-rule-input="' + name + '"]');
        return element instanceof HTMLInputElement || element instanceof HTMLSelectElement
          ? {
              value: element.value,
              ariaInvalid: element.getAttribute("aria-invalid"),
              disabled: element.disabled,
              describedBy: element.getAttribute("aria-describedby")
            }
          : null;
      };
      const readError = (name) => {
        const element = document.querySelector('[data-handover-rule-error="' + name + '"]');
        return normalize(element?.textContent);
      };
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const handoverRoot = document.querySelector("[data-handover-decision-panel='bootstrap']");
      const editor = document.querySelector("[data-handover-rule-config-editor='true']");
      const form = document.querySelector("[data-handover-rule-form='true']");
      const status = document.querySelector("[data-handover-rule-status='true']");
      const state = capture?.handoverDecision?.getState?.();
      const panelAndReportText = [
        handoverRoot instanceof HTMLElement ? handoverRoot.innerText : "",
        JSON.stringify(state?.report ?? {}),
        JSON.stringify(state?.snapshot ?? {})
      ].join("\\n");

      return {
        bootstrapState: document.documentElement.dataset.bootstrapState ?? null,
        hasCapture: Boolean(capture?.viewer && capture?.handoverDecision),
        runtimeErrors: window.__F11_RUNTIME_ERRORS__ ?? [],
        panel: {
          visible: isVisible(handoverRoot),
          policyId: handoverRoot?.dataset.handoverPolicyId ?? null,
          rulePolicyId: handoverRoot?.dataset.handoverRulePolicyId ?? null,
          ruleAppliedAt: handoverRoot?.dataset.handoverRuleAppliedAt ?? null,
          ruleWeights: handoverRoot?.dataset.handoverRuleWeights ?? null,
          ruleTieBreakOrder: handoverRoot?.dataset.handoverRuleTieBreakOrder ?? null,
          minDwellTicks: handoverRoot?.dataset.handoverRuleMinDwellTicks ?? null,
          hysteresisMargin: handoverRoot?.dataset.handoverRuleHysteresisMargin ?? null,
          reasonSignals: handoverRoot?.dataset.handoverReasonSignals ?? null,
          decisionKind: handoverRoot?.dataset.handoverDecisionKind ?? null,
          servingCandidateId: handoverRoot?.dataset.handoverServingCandidateId ?? null,
          provenance: handoverRoot?.dataset.handoverProvenance ?? null
        },
        editor: {
          visible: isVisible(editor),
          open: editor instanceof HTMLDetailsElement ? editor.open : null,
          formVisible: isVisible(form),
          validationIssues:
            form instanceof HTMLElement
              ? form.dataset.handoverRuleValidationIssues ?? null
              : null,
          activePolicyLabel: editor?.dataset.handoverRuleActivePolicyLabel ?? null,
          statusRole: status?.getAttribute("role") ?? null,
          statusAriaLive: status?.getAttribute("aria-live") ?? null,
          statusText: normalize(status?.textContent),
          inputs: {
            latency: readInput("weights.latencyMs"),
            jitter: readInput("weights.jitterMs"),
            speed: readInput("weights.networkSpeedMbps"),
            dwell: readInput("minDwellTicks"),
            hysteresis: readInput("hysteresisMargin"),
            tieBreak0: readInput("tieBreakOrder.0"),
            tieBreak1: readInput("tieBreakOrder.1"),
            tieBreak2: readInput("tieBreakOrder.2"),
            tieBreak3: readInput("tieBreakOrder.3")
          },
          errors: {
            latency: readError("weights.latencyMs"),
            jitter: readError("weights.jitterMs"),
            speed: readError("weights.networkSpeedMbps"),
            dwell: readError("minDwellTicks"),
            hysteresis: readError("hysteresisMargin"),
            tieBreak0: readError("tieBreakOrder.0")
          }
        },
        documentTelemetry: {
          rulePolicyId: document.documentElement.dataset.handoverRulePolicyId ?? null,
          ruleAppliedAt: document.documentElement.dataset.handoverRuleAppliedAt ?? null,
          ruleWeights: document.documentElement.dataset.handoverRuleWeights ?? null,
          ruleTieBreakOrder:
            document.documentElement.dataset.handoverRuleTieBreakOrder ?? null,
          minDwellTicks:
            document.documentElement.dataset.handoverRuleMinDwellTicks ?? null,
          hysteresisMargin:
            document.documentElement.dataset.handoverRuleHysteresisMargin ?? null
        },
        report: state?.report ?? null,
        snapshot: state?.snapshot ?? null,
        forbiddenClaimHit: ${FORBIDDEN_CLAIM_PATTERN}.test(panelAndReportText)
      };
    })()`
  );
}

async function seekRatio(client, ratio) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.handoverDecision?.getState?.();
      const startMs = Date.parse(state?.snapshot?.activeRange?.start ?? "");
      const stopMs = Date.parse(state?.snapshot?.activeRange?.stop ?? "");
      if (!Number.isFinite(startMs) || !Number.isFinite(stopMs)) {
        throw new Error("Missing F-11 active range for ratio seek.");
      }
      capture?.replayClock?.seek?.(
        new Date(startMs + (stopMs - startMs) * ${JSON.stringify(ratio)}).toISOString()
      );
    })()`
  );
  await sleep(250);
  return await inspectF11(client);
}

async function setRuleDraft(client, config) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const setValue = (name, value) => {
        const element = document.querySelector('[data-handover-rule-input="' + name + '"]');
        if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) {
          throw new Error("Missing F-11 rule input: " + name);
        }
        element.value = String(value);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setValue("weights.latencyMs", ${JSON.stringify(config.latency)});
      setValue("weights.jitterMs", ${JSON.stringify(config.jitter)});
      setValue("weights.networkSpeedMbps", ${JSON.stringify(config.speed)});
      setValue("minDwellTicks", ${JSON.stringify(config.dwell)});
      setValue("hysteresisMargin", ${JSON.stringify(config.hysteresis)});
      ${config.tieBreak
        .map(
          (value, index) =>
            `setValue("tieBreakOrder.${index}", ${JSON.stringify(value)});`
        )
        .join("\n")}
    })()`
  );
}

async function blurRuleInput(client, name) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const element = document.querySelector('[data-handover-rule-input="${name}"]');
      if (!(element instanceof HTMLElement)) {
        throw new Error("Missing F-11 rule input to blur: ${name}");
      }
      element.focus();
      element.blur();
      element.dispatchEvent(new FocusEvent("blur", { bubbles: false }));
      element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    })()`
  );
  await sleep(120);
  return await inspectF11(client);
}

async function clickRuleAction(client, action) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const button = document.querySelector('[data-handover-rule-action="${action}"]');
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Missing F-11 rule action: ${action}");
      }
      if (${JSON.stringify(action)} === "apply") {
        const form = document.querySelector("[data-handover-rule-form='true']");
        if (!(form instanceof HTMLFormElement)) {
          throw new Error("Missing F-11 rule form.");
        }
        form.dispatchEvent(
          new SubmitEvent("submit", {
            bubbles: true,
            cancelable: true,
            submitter: button
          })
        );
      } else {
        button.click();
      }
    })()`
  );
  await sleep(300);
  return await inspectF11(client);
}

function assertInitialState(state) {
  assert(state.panel.visible, "F-11 Handover Decision panel must be visible.");
  assert(state.editor.visible, "F-11 rule editor must be visible.");
  assert(state.editor.open === true, "F-11 rule editor must default open for smoke evidence.");
  assert(state.editor.formVisible, "F-11 rule form must be visible.");
  assert(
    state.editor.statusRole === "status" &&
      state.editor.statusAriaLive === "polite",
    "F-11 rule editor status must be a polite live region."
  );
  assert(
    state.panel.rulePolicyId === "bootstrap-balanced-v1" &&
      state.documentTelemetry.rulePolicyId === "bootstrap-balanced-v1" &&
      state.report?.appliedRuleConfig?.policyId === "bootstrap-balanced-v1",
    "F-11 applied rule config policy id must align across panel, telemetry, and report."
  );
  assert(
    state.editor.inputs.latency?.describedBy?.includes("handover-rule-latency-weight-helper") &&
      state.editor.inputs.latency?.describedBy?.includes("handover-rule-latency-weight-error"),
    "F-11 numeric inputs must connect helper and error text for assistive tech."
  );
  assert(
    state.panel.provenance === "bounded-proxy",
    "F-11 must preserve bounded-proxy provenance."
  );
  assert(state.forbiddenClaimHit === false, "F-11 panel/report must avoid forbidden claims.");
}

await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
  ensureOutputRoot(outputRoot);
  await setViewport(client, VIEWPORT_DESKTOP);
  await installConsoleErrorProbe(client);
  await client.send("Page.navigate", {
    url: `${baseUrl}${REQUEST_PATH}`
  });
  await waitForGlobeReady(client, "M8A V4.12 F-11 rule config");

  const ready = await waitForF11Ready(client);
  assertInitialState(ready);

  const initialScreenshotPath = await captureScreenshot(
    client,
    outputRoot,
    `${VIEWPORT_DESKTOP.name}-initial-open.png`
  );
  assertScreenshot(initialScreenshotPath);

  await seekRatio(client, 0.1);
  const beforeInvalidAppliedAt = (await inspectF11(client)).panel.ruleAppliedAt;
  await setRuleDraft(client, {
    latency: "10.25",
    jitter: "1",
    speed: "1",
    dwell: "0",
    hysteresis: "0",
    tieBreak: ["latency", "jitter", "speed", "stable-serving"]
  });
  const invalidBlur = await blurRuleInput(client, "weights.latencyMs");
  assert(
    invalidBlur.editor.errors.latency.includes("one decimal"),
    "F-11 blur validation must show field-level precision error text."
  );
  const invalidApply = await clickRuleAction(client, "apply");
  assert(
    invalidApply.panel.ruleAppliedAt === beforeInvalidAppliedAt,
    "F-11 invalid apply must not mutate the applied config."
  );
  const invalidScreenshotPath = await captureScreenshot(
    client,
    outputRoot,
    `${VIEWPORT_DESKTOP.name}-validation-error.png`
  );
  assertScreenshot(invalidScreenshotPath);

  await setRuleDraft(client, {
    latency: "1",
    jitter: "1",
    speed: "1",
    dwell: "60",
    hysteresis: "0",
    tieBreak: ["latency", "jitter", "speed", "stable-serving"]
  });
  const applied = await clickRuleAction(client, "apply");
  assert(
    applied.report?.appliedRuleConfig?.minDwellTicks === 60 &&
      applied.panel.minDwellTicks === "60",
    `F-11 Apply must write the active bounded dwell rule into report and panel datasets: ${JSON.stringify({
      reportRule: applied.report?.appliedRuleConfig,
      panel: applied.panel,
      inputs: applied.editor.inputs,
      errors: applied.editor.errors,
      validationIssues: applied.editor.validationIssues,
      statusText: applied.editor.statusText,
      runtimeErrors: applied.runtimeErrors
    })}`
  );

  const held = await seekRatio(client, 0.53);
  assert(
    held.panel.decisionKind === "hold" &&
      held.panel.servingCandidateId === "global-leo-primary" &&
      held.panel.reasonSignals.includes("policy-hold"),
    `F-11 applied dwell rule must deterministically hold the current candidate: ${JSON.stringify({
      panel: held.panel,
      reportRule: held.report?.appliedRuleConfig,
      snapshot: held.snapshot
    })}`
  );
  assert(
    held.forbiddenClaimHit === false,
    "F-11 applied state must avoid forbidden claims."
  );

  const appliedScreenshotPath = await captureScreenshot(
    client,
    outputRoot,
    `${VIEWPORT_DESKTOP.name}-applied-dwell-hold.png`
  );
  assertScreenshot(appliedScreenshotPath);

  const reset = await clickRuleAction(client, "reset");
  assert(
    reset.report?.appliedRuleConfig?.minDwellTicks === 0 &&
      reset.panel.minDwellTicks === "0",
    "F-11 Reset must restore active variant defaults."
  );
  assert(
    reset.panel.servingCandidateId === "global-meo-bridge",
    `F-11 reset default must release the bounded dwell hold at the same replay time and settle on the default best candidate: ${JSON.stringify({
      panel: reset.panel,
      reportRule: reset.report?.appliedRuleConfig,
      snapshot: reset.snapshot
    })}`
  );
  assert(
    reset.runtimeErrors.length === 0,
    `F-11 rule config smoke must not emit console/runtime errors: ${JSON.stringify(
      reset.runtimeErrors
    )}`
  );

  const resetScreenshotPath = await captureScreenshot(
    client,
    outputRoot,
    `${VIEWPORT_DESKTOP.name}-reset-default.png`
  );
  assertScreenshot(resetScreenshotPath);

  const artifactPath = writeJsonArtifact(outputRoot, "f11-rule-config-smoke.json", {
    requestPath: REQUEST_PATH,
    viewport: VIEWPORT_DESKTOP,
    screenshots: [
      initialScreenshotPath,
      invalidScreenshotPath,
      appliedScreenshotPath,
      resetScreenshotPath
    ],
    appliedRuleConfig: held.report.appliedRuleConfig,
    resetRuleConfig: reset.report.appliedRuleConfig,
    heldDecisionKind: held.panel.decisionKind,
    resetDecisionKind: reset.panel.decisionKind
  });

  console.log(
    `M8A V4.12 F-11 rule config runtime smoke passed: ${JSON.stringify({
      artifactPath,
      heldDecisionKind: held.panel.decisionKind,
      resetDecisionKind: reset.panel.decisionKind,
      screenshots: [
        initialScreenshotPath,
        invalidScreenshotPath,
        appliedScreenshotPath,
        resetScreenshotPath
      ]
    })}`
  );
});
