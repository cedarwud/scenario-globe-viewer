import {
  connectCdp,
  evaluateRuntimeValue,
  findHeadlessBrowser,
  resolvePageWebSocketUrl,
  startHeadlessBrowser,
  stopHeadlessBrowser
} from "./bootstrap-smoke-browser.mjs";
import {
  ensureDistBuildExists,
  startStaticServer,
  stopStaticServer,
  verifyFetches
} from "./bootstrap-smoke-server.mjs";

const TARGET_SCENARIO_ID = "app-oneweb-intelsat-geo-aviation";
const EXPLAINER_SELECTOR = "[data-first-intake-operator-explainer='true']";
const NARRATIVE_SELECTOR = "[data-first-intake-active-case-narrative='true']";
const ADDRESSED_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;
const DEFAULT_REQUEST_PATH = "/?scenePreset=global";
const FORCE_BROWSER_ASSERTION_FAILURE =
  process.env.SCENARIO_GLOBE_VIEWER_FORCE_BROWSER_ASSERTION_FAILURE === "1";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === "global"
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `M5 first-intake operator explainer validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M5 first-intake operator explainer validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
  );
}

async function navigateAndWait(client, url) {
  await client.send("Page.navigate", { url });
  await waitForBootstrapReady(client);
}

async function main() {
  ensureDistBuildExists();
  const browserCommand = findHeadlessBrowser();
  const { server, baseUrl } = await startStaticServer();

  try {
    await verifyFetches(baseUrl);
    const browser = await startHeadlessBrowser(browserCommand);

    try {
      const pageWebSocketUrl = await resolvePageWebSocketUrl(
        browser.browserWebSocketUrl
      );
      const client = await connectCdp(pageWebSocketUrl);

      try {
        await client.send("Page.enable");
        await client.send("Runtime.enable");
        await client.send("Emulation.setDeviceMetricsOverride", {
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false
        });

        await navigateAndWait(client, `${baseUrl}${ADDRESSED_REQUEST_PATH}`);

        const addressedResult = await evaluateRuntimeValue(
          client,
          `(async () => {
            const sleep = (ms) =>
              new Promise((resolve) => {
                setTimeout(resolve, ms);
              });
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
            };
            const forceBrowserAssertionFailure = ${JSON.stringify(
              FORCE_BROWSER_ASSERTION_FAILURE
            )};

            let explainerState = null;
            let narrativeState = null;
            let explainerPanel = null;
            let narrativePanel = null;

            for (let attempt = 0; attempt < 80; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              explainerState = capture?.firstIntakeOperatorExplainer?.getState?.() ?? null;
              narrativeState =
                capture?.firstIntakeActiveCaseNarrative?.getState?.() ?? null;
              explainerPanel = document.querySelector("${EXPLAINER_SELECTOR}");
              narrativePanel = document.querySelector("${NARRATIVE_SELECTOR}");

              if (
                capture?.firstIntakeOperatorExplainer &&
                capture?.firstIntakeActiveCaseNarrative &&
                explainerState?.activeScenarioId === "${TARGET_SCENARIO_ID}" &&
                narrativeState?.activeScenarioId === "${TARGET_SCENARIO_ID}" &&
                narrativePanel instanceof HTMLElement
              ) {
                break;
              }

              await sleep(50);
            }

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(
              capture?.firstIntakeScenarioSurface,
              "Missing first-intake scenario surface capture seam."
            );
            assert(
              capture?.firstIntakePhysicalInput,
              "Missing first-intake physical-input capture seam."
            );
            assert(
              capture?.firstIntakeHandoverDecision,
              "Missing first-intake handover capture seam."
            );
            assert(
              capture?.firstIntakeOverlayExpression,
              "Missing first-intake overlay expression capture seam."
            );
            assert(
              capture?.firstIntakeOperatorExplainer,
              "Missing first-intake operator explainer capture seam."
            );
            assert(
              capture?.firstIntakeActiveCaseNarrative,
              "Missing first-intake active-case narrative capture seam."
            );

            explainerState = capture.firstIntakeOperatorExplainer.getState();
            narrativeState = capture.firstIntakeActiveCaseNarrative.getState();
            if (forceBrowserAssertionFailure) {
              assert(
                false,
                "Forced M5 browser-side assertion failure for close-out proof validation."
              );
            }
            const scenarioSurfaceState = capture.firstIntakeScenarioSurface.getState();
            const activeScenario = capture.scenarioSession.getCurrentScenario();
            const physicalState = capture.firstIntakePhysicalInput.getState();
            const activeHandoverState = capture.firstIntakeHandoverDecision.getState();
            const overlayState = capture.firstIntakeOverlayExpression.getState();
            const narrativePanelRect = narrativePanel.getBoundingClientRect();
            const narrativePanelText = narrativePanel.textContent
              .replace(/\\s+/g, " ")
              .trim();
            const handoverSnapshotKeys = Object.keys(activeHandoverState.snapshot).sort();
            const handoverSemanticsBridgeKeys = Object.keys(
              activeHandoverState.result.semanticsBridge
            ).sort();

            assert(
              scenarioSurfaceState.addressResolution === "matched" &&
                activeScenario?.scenarioId === "${TARGET_SCENARIO_ID}",
              "Addressed first-intake case must remain the live active scenario owner."
            );
            assert(
              explainerState.scenarioId === "${TARGET_SCENARIO_ID}" &&
                explainerState.activeScenarioId === "${TARGET_SCENARIO_ID}" &&
                explainerState.addressResolution === "matched" &&
                explainerState.panelVisible === false &&
                !(explainerPanel instanceof HTMLElement),
              "First-intake operator explainer must stay tied to the active addressed case while remaining capture-owned under M7 single-primary ownership."
            );
            assert(
              narrativeState.scenarioId === "${TARGET_SCENARIO_ID}" &&
                narrativeState.activeScenarioId === "${TARGET_SCENARIO_ID}" &&
                narrativeState.panelVisible === false &&
                narrativePanel instanceof HTMLElement,
              "M7 active-case narrative must retain the active-case seam while R1V.1 suppresses the floating panel presentation."
            );
            assert(
              explainerState.caseLabel ===
                "OneWeb LEO + Intelsat GEO aviation",
              "Explainer must expose the repo-owned OneWeb LEO + Intelsat GEO aviation case label."
            );
            assert(
              explainerState.serviceSwitchingSemantics ===
                "service-layer switching" &&
                explainerState.decisionModel ===
                  activeHandoverState.snapshot.decisionModel &&
                explainerState.pathControlMode ===
                  "managed_service_switching",
              "Explainer must derive service-layer switching semantics from the widened first-intake handover runtime state and physical-input metadata."
            );
            assert(
              explainerState.nativeRfHandover ===
                activeHandoverState.snapshot.isNativeRfHandover &&
                explainerState.truthBoundaryMode === "bounded-proxy" &&
                explainerState.measurementTruthClaim ===
                  "not-measurement-truth" &&
                explainerState.truthBoundaryLabel ===
                  activeHandoverState.result.semanticsBridge.truthBoundaryLabel &&
                JSON.stringify(explainerState.provenanceKinds) ===
                  JSON.stringify(["bounded-proxy"]),
              "Explainer must preserve the non-native-RF and bounded-proxy truth-boundary semantics."
            );
            assert(
              explainerState.onewebGatewayPoolSemantics === "eligible-pool" &&
                explainerState.geoAnchorSemantics ===
                  "provider-managed-anchor",
              "Explainer must preserve eligible-pool and provider-managed-anchor semantics."
            );
            assert(
              explainerState.sourceLineage.seedPath.includes(
                "oneweb-intelsat-geo-aviation.seed.json"
              ) &&
                explainerState.sourceLineage.scenarioSurface ===
                  "createFirstIntakeRuntimeScenarioSurface" &&
                explainerState.sourceLineage.activeOwner ===
                  "createFirstIntakeActiveScenarioSession" &&
                explainerState.sourceLineage.physicalInput ===
                  "createFirstIntakePhysicalInputSourceCatalog" &&
                explainerState.sourceLineage.physicalState ===
                  "createPhysicalInputState" &&
                explainerState.sourceLineage.handoverState ===
                  "createFirstIntakeHandoverDecisionController" &&
                explainerState.sourceLineage.handoverSemantics ===
                  "snapshot.decisionModel+snapshot.isNativeRfHandover+result.semanticsBridge.truthBoundaryLabel",
              "Explainer must expose the seed -> active owner -> physical-input -> handover-runtime lineage."
            );
            assert(
              narrativePanel.hidden === true &&
                narrativePanelRect.width === 0 &&
                narrativePanelRect.height === 0 &&
                narrativePanelText.includes("OneWeb LEO + Intelsat GEO aviation") &&
                narrativePanelText.includes("service-layer switching") &&
                narrativePanelText.includes("not native RF handover") &&
                narrativePanelText.includes("bounded-proxy, not measurement truth"),
              "M7 active-case narrative must keep its first-case explanation data while hidden by R1V.1 presentation suppression."
            );
            assert(
              JSON.stringify(
                physicalState.physicalInput.candidates.map((candidate) => ({
                  candidateId: candidate.candidateId,
                  orbitClass: candidate.orbitClass,
                  pathRole: candidate.pathRole,
                  pathControlMode: candidate.pathControlMode,
                  infrastructureSelectionMode:
                    candidate.infrastructureSelectionMode
                }))
              ) ===
                JSON.stringify([
                  {
                    candidateId: "oneweb-leo-service-path",
                    orbitClass: "leo",
                    pathRole: "primary",
                    pathControlMode: "managed_service_switching",
                    infrastructureSelectionMode: "eligible-pool"
                  },
                  {
                    candidateId: "intelsat-geo-service-path",
                    orbitClass: "geo",
                    pathRole: "secondary",
                    pathControlMode: "managed_service_switching",
                    infrastructureSelectionMode: "provider-managed"
                  }
                ]),
              "First-intake physical-input must remain unchanged."
            );
            assert(
              activeHandoverState.snapshot.policyId ===
                "first-intake-unsupported-noop-v1" &&
                activeHandoverState.snapshot.candidates.length === 0 &&
                activeHandoverState.snapshot.decisionModel ===
                  "service-layer-switching" &&
                activeHandoverState.snapshot.isNativeRfHandover === false &&
                activeHandoverState.result.decisionKind === "unavailable" &&
                activeHandoverState.result.semanticsBridge.truthState ===
                  "unavailable" &&
                activeHandoverState.result.semanticsBridge.truthBoundaryLabel ===
                  "real-pairing-bounded-runtime-projection",
              "First-intake handover must remain explicit unsupported/no-op while carrying the approved bounded semantics."
            );
            assert(
              JSON.stringify(handoverSnapshotKeys) ===
                JSON.stringify([
                  "activeRange",
                  "candidates",
                  "decisionModel",
                  "evaluatedAt",
                  "isNativeRfHandover",
                  "policyId",
                  "scenarioId"
                ]) &&
                JSON.stringify(handoverSemanticsBridgeKeys) ===
                  JSON.stringify(["truthBoundaryLabel", "truthState"]),
              "Only the approved three fields may widen on the first-intake handover runtime seam."
            );
            assert(
              overlayState.expressionState === "active-addressed-case" &&
                overlayState.endpointExpressionMode === "runtime-local-panel" &&
                overlayState.infrastructureExpressionMode ===
                  "globe-pool-markers" &&
                overlayState.gatewayPoolSemantics ===
                  "eligible-gateway-pool" &&
                overlayState.activeGatewayClaim === "not-claimed",
              "M4 overlay expression must remain unchanged."
            );

            return {
              proofSeams: [
                "handover:createFirstIntakeHandoverDecisionController",
                "consumer:createFirstIntakeOperatorExplainerController",
                "capture:window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeOperatorExplainer"
              ],
              ownership: {
                operatorExplainerPanelVisible: explainerState.panelVisible,
                activeCaseNarrativePanelVisible: narrativeState.panelVisible
              },
              panelSelector: "${EXPLAINER_SELECTOR}",
              scenarioId: explainerState.scenarioId,
              caseLabel: explainerState.caseLabel,
              pathControlMode: explainerState.pathControlMode,
              truthBoundaryLabel: explainerState.truthBoundaryLabel
            };
          })()`,
          { awaitPromise: true }
        );

        await navigateAndWait(client, `${baseUrl}${DEFAULT_REQUEST_PATH}`);

        const defaultRouteResult = await evaluateRuntimeValue(
          client,
          `(async () => {
            const sleep = (ms) =>
              new Promise((resolve) => {
                setTimeout(resolve, ms);
              });
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
            };

            for (let attempt = 0; attempt < 80; attempt += 1) {
              if (window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.scenarioSession) {
                break;
              }
              await sleep(25);
            }

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const activeScenario = capture?.scenarioSession?.getCurrentScenario?.();
            const activePhysicalState = capture?.physicalInput?.getState?.();
            const activeHandoverState = capture?.handoverDecision?.getState?.();
            const firstIntakeSurfaceState =
              capture?.firstIntakeScenarioSurface?.getState?.();
            const panel = document.querySelector("${EXPLAINER_SELECTOR}");

            assert(capture?.scenarioSession, "Missing active scenario-session capture seam.");
            assert(
              activeScenario?.scenarioId &&
                activeScenario.scenarioId !== "${TARGET_SCENARIO_ID}" &&
                activeScenario.scenarioId !==
                  capture.firstIntakeScenarioSurface.getAddressedEntry().scenarioId,
              "Default bootstrap route must keep the bootstrap-owned scenario session active."
            );
            assert(
              capture.firstIntakeOperatorExplainer === undefined &&
                !(panel instanceof HTMLElement),
              "Default bootstrap route must not mount the first-intake operator explainer."
            );
            assert(
              firstIntakeSurfaceState.addressResolution === "default",
              "Default bootstrap route must keep the first-intake surface as a sidecar default resolution only."
            );
            assert(
              activePhysicalState?.scenario?.id &&
                activePhysicalState.scenario.id !== "${TARGET_SCENARIO_ID}",
              "Default bootstrap route must keep the active physical-input owner unchanged."
            );
            assert(
              activeHandoverState?.snapshot?.scenarioId &&
                activeHandoverState.snapshot.scenarioId !== "${TARGET_SCENARIO_ID}",
              "Default bootstrap route must keep the active handover owner unchanged."
            );

            return {
              proofSeam: "capture:scenarioSession",
              activeScenarioId: activeScenario.scenarioId,
              activePhysicalScenarioId: activePhysicalState.scenario.id,
              activeHandoverScenarioId: activeHandoverState.snapshot.scenarioId,
              firstIntakeAddressResolution: firstIntakeSurfaceState.addressResolution
            };
          })()`,
          { awaitPromise: true }
        );

        console.log(
          `M5 Slice A first-intake operator explainer validation passed: ${JSON.stringify(
            {
              addressedResult,
              defaultRouteResult
            }
          )}`
        );
      } finally {
        await client.close();
      }
    } finally {
      await stopHeadlessBrowser(browser.browserProcess, browser.userDataDir);
    }
  } finally {
    await stopStaticServer(server);
  }
}

await main();
