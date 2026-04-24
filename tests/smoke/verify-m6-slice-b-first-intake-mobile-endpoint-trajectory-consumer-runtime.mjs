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
const EXPECTED_RECORD_ID = "ac-cgojz-crj900-c06aa4-2026-04-21";
const EXPECTED_WINDOW_START = "2026-04-21T01:28:07.420000Z";
const EXPECTED_WINDOW_END = "2026-04-21T02:09:36.690000Z";
const EXPECTED_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;
const DEFAULT_REQUEST_PATH = "/?scenePreset=global";
const EXPECTED_TRAJECTORY_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeMobileEndpointTrajectory";
const EXPECTED_CONSUMER_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeMobileEndpointTrajectoryConsumer";
const NARRATIVE_SELECTOR = "[data-first-intake-active-case-narrative='true']";
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
        `M6 slice B validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M6 slice B validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
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

        await navigateAndWait(client, `${baseUrl}${EXPECTED_REQUEST_PATH}`);

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

            let consumerState = null;
            let narrativeState = null;
            let narrativePanel = null;

            for (let attempt = 0; attempt < 80; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              consumerState =
                capture?.firstIntakeMobileEndpointTrajectoryConsumer?.getState?.() ??
                null;
              narrativeState =
                capture?.firstIntakeActiveCaseNarrative?.getState?.() ?? null;
              narrativePanel = document.querySelector("${NARRATIVE_SELECTOR}");

              if (
                capture?.firstIntakeMobileEndpointTrajectoryConsumer &&
                capture?.firstIntakeActiveCaseNarrative &&
                consumerState?.acceptedCorridorPackageId === "${EXPECTED_RECORD_ID}" &&
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
              "Missing first-intake runtime surface capture seam."
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
              capture?.firstIntakeMobileEndpointTrajectory,
              "Missing first-intake mobile-endpoint trajectory seam."
            );
            assert(
              capture?.firstIntakeMobileEndpointTrajectoryConsumer,
              "Missing first-intake mobile-endpoint trajectory consumer proof seam."
            );
            assert(
              capture?.firstIntakeActiveCaseNarrative,
              "Missing first-intake active-case narrative proof seam."
            );

            const trajectoryState = capture.firstIntakeMobileEndpointTrajectory.getState();
            consumerState =
              capture.firstIntakeMobileEndpointTrajectoryConsumer.getState();
            narrativeState = capture.firstIntakeActiveCaseNarrative.getState();
            if (forceBrowserAssertionFailure) {
              assert(
                false,
                "Forced M6 browser-side assertion failure for close-out proof validation."
              );
            }
            const scenarioSurfaceState = capture.firstIntakeScenarioSurface.getState();
            const addressedEntry = capture.firstIntakeScenarioSurface.getAddressedEntry();
            const activeScenario = capture.scenarioSession.getCurrentScenario();
            const physicalState = capture.firstIntakePhysicalInput.getState();
            const handoverState = capture.firstIntakeHandoverDecision.getState();
            const overlayState = capture.firstIntakeOverlayExpression.getState();
            const consumerRoot = document.querySelector(
              "[data-first-intake-mobile-endpoint-trajectory-consumer='true']"
            );
            const narrativePanelRect = narrativePanel.getBoundingClientRect();
            const narrativePanelText = narrativePanel.textContent
              .replace(/\\s+/g, " ")
              .trim();
            const rootData = document.documentElement.dataset;

            assert(
              scenarioSurfaceState.addressResolution === "matched" &&
                activeScenario?.scenarioId === "${TARGET_SCENARIO_ID}",
              "Addressed first-intake case must remain the active scenario owner."
            );

            assert(
              consumerState.consumerState === "active-addressed-case" &&
                consumerState.consumerSurface ===
                  "runtime-local-corridor-provenance-panel" &&
                consumerState.panelVisible === false &&
                consumerState.activeScenarioId === "${TARGET_SCENARIO_ID}" &&
                consumerState.proofSeam === "${EXPECTED_CONSUMER_PROOF_SEAM}",
              "M6 slice B must retain its runtime-local consumer seam on the matched active owner path while remaining capture-owned under M7 single-primary ownership."
            );
            assert(
              !consumerRoot,
              "M6 slice B must not reclaim a viewer-facing duplicate panel from the M7 primary narrative."
            );
            assert(
              narrativeState.panelVisible === false &&
                narrativePanel instanceof HTMLElement &&
                narrativeState.activeScenarioId === "${TARGET_SCENARIO_ID}" &&
                narrativePanel.hidden === true &&
                narrativePanelRect.width === 0 &&
                narrativePanelRect.height === 0 &&
                narrativePanelText.includes(
                  "accepted corridor package = historical replay package"
                ),
              "M7 active-case narrative must retain first-case ownership while R1V.1 suppresses the floating panel presentation."
            );

            assert(
              consumerState.acceptedCorridorPackageId === "${EXPECTED_RECORD_ID}" &&
                consumerState.packageNature === "historical-replay-package" &&
                consumerState.waypointCount === 447 &&
                consumerState.windowStartUtc === "${EXPECTED_WINDOW_START}" &&
                consumerState.windowEndUtc === "${EXPECTED_WINDOW_END}" &&
                consumerState.coordinateReference === "WGS84",
              "Consumer must visibly preserve accepted package identity, historical replay package nature, and waypoint/window provenance."
            );

            assert(
              consumerState.corridorTruth ===
                "replayable-historical-trajectory-package" &&
                consumerState.equipageTruth === "not-proven-at-tail-level" &&
                consumerState.serviceTruth ===
                  "not-proven-active-on-this-flight",
              "Consumer must keep corridor truth separate from equipage and active-service truth."
            );

            assert(
              consumerState.sourceLineage.activeOwner ===
                "createFirstIntakeActiveScenarioSession" &&
                consumerState.sourceLineage.runtimeTrajectorySeam ===
                  "createFirstIntakeMobileEndpointTrajectoryController" &&
                consumerState.sourceLineage.runtimeTrajectoryRead ===
                  "trajectoryController.getState().trajectory" &&
                consumerState.sourceLineage.rawPackageSideReadOwnership ===
                  "forbidden" &&
                consumerState.trajectoryProofSeam ===
                  "${EXPECTED_TRAJECTORY_PROOF_SEAM}",
              "Consumer must name the active-owner seam, the runtime trajectory seam read path, and the raw package side-read ownership boundary."
            );

            assert(
              consumerState.acceptedCorridorPackageId ===
                trajectoryState.trajectory.trajectory.recordId &&
                consumerState.waypointCount ===
                  trajectoryState.trajectory.trajectory.waypointCount &&
                consumerState.windowStartUtc ===
                  trajectoryState.trajectory.trajectory.windowStartUtc &&
                consumerState.windowEndUtc ===
                  trajectoryState.trajectory.trajectory.windowEndUtc &&
                consumerState.corridorTruth ===
                  trajectoryState.trajectory.truthBoundary.corridorTruth &&
                consumerState.equipageTruth ===
                  trajectoryState.trajectory.truthBoundary.equipageTruth &&
                consumerState.serviceTruth ===
                  trajectoryState.trajectory.truthBoundary.serviceTruth,
              "Consumer must read runtime trajectory state from firstIntakeMobileEndpointTrajectory rather than side-reading package files."
            );

            assert(
              rootData.firstIntakeMobileTrajectoryState ===
                "accepted-corridor-package-ingested" &&
                rootData.firstIntakeMobileTrajectoryProofSeam ===
                  "${EXPECTED_TRAJECTORY_PROOF_SEAM}",
              "Underlying trajectory telemetry proof seam must remain unchanged."
            );

            assert(
              !("trajectory" in addressedEntry.definition) &&
                !("mobileEndpointTrajectory" in addressedEntry.definition) &&
                !("trajectory" in (addressedEntry.resolvedInputs.context ?? {})),
              "Scenario seam must not absorb mobile trajectory ownership."
            );

            const endpointSeed =
              addressedEntry.resolvedInputs.resolvedFirstIntakeOverlaySeeds
                ?.resolvedEndpointSeed;
            const infrastructureSeed =
              addressedEntry.resolvedInputs.resolvedFirstIntakeOverlaySeeds
                ?.resolvedInfrastructureSeed;

            assert(
              endpointSeed &&
                infrastructureSeed &&
                !("trajectory" in endpointSeed) &&
                !("mobileEndpointTrajectory" in endpointSeed) &&
                !("trajectory" in infrastructureSeed) &&
                !("mobileEndpointTrajectory" in infrastructureSeed),
              "Overlay seed resolution must not absorb mobile trajectory ownership."
            );

            assert(
              !("trajectory" in physicalState) &&
                !("mobileEndpointTrajectory" in physicalState) &&
                !("trajectory" in physicalState.physicalInput) &&
                JSON.stringify(
                  physicalState.physicalInput.provenance.map((entry) => entry.family)
                ) ===
                  JSON.stringify([
                    "antenna",
                    "rain-attenuation",
                    "itu-style"
                  ]),
              "Physical-input seam must remain unchanged and trajectory-free."
            );

            assert(
              handoverState.snapshot.policyId ===
                "first-intake-unsupported-noop-v1" &&
                handoverState.snapshot.decisionModel ===
                  "service-layer-switching" &&
                handoverState.snapshot.isNativeRfHandover === false &&
                handoverState.snapshot.candidates.length === 0 &&
                handoverState.result.decisionKind === "unavailable" &&
                handoverState.result.semanticsBridge.truthState === "unavailable",
              "First-intake handover runtime must stay unchanged."
            );

            assert(
              overlayState.expressionState === "active-addressed-case" &&
                overlayState.endpointExpressionMode === "runtime-local-panel" &&
                overlayState.infrastructureExpressionMode ===
                  "globe-pool-markers" &&
                overlayState.gatewayPoolSemantics === "eligible-gateway-pool" &&
                overlayState.activeGatewayClaim === "not-claimed",
              "M4 overlay expression must stay unchanged."
            );

            return {
              consumerProofSeam: consumerState.proofSeam,
              trajectoryProofSeam: consumerState.trajectoryProofSeam,
              ownership: {
                trajectoryConsumerPanelVisible: consumerState.panelVisible,
                activeCaseNarrativePanelVisible: narrativeState.panelVisible
              },
              runtimeTrajectoryRead:
                consumerState.sourceLineage.runtimeTrajectoryRead,
              acceptedCorridorPackageId: consumerState.acceptedCorridorPackageId,
              packageNature: consumerState.packageNature,
              truthBoundary: {
                corridorTruth: consumerState.corridorTruth,
                equipageTruth: consumerState.equipageTruth,
                serviceTruth: consumerState.serviceTruth
              }
            };
          })()`,
          { awaitPromise: true }
        );

        await navigateAndWait(client, `${baseUrl}${DEFAULT_REQUEST_PATH}`);

        const defaultRouteResult = await evaluateRuntimeValue(
          client,
          `(() => {
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
            };

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const scenarioSurfaceState =
              capture?.firstIntakeScenarioSurface?.getState?.();
            const activeScenario = capture?.scenarioSession?.getCurrentScenario?.();
            const consumerRoot = document.querySelector(
              "[data-first-intake-mobile-endpoint-trajectory-consumer='true']"
            );

            assert(capture, "Missing capture seam on default route.");
            assert(
              capture.firstIntakeMobileEndpointTrajectory === undefined,
              "Default bootstrap route must not adopt the M6 mobile-endpoint trajectory seam."
            );
            assert(
              capture.firstIntakeMobileEndpointTrajectoryConsumer === undefined,
              "Default bootstrap route must not mount the M6 slice B consumer seam."
            );
            assert(
              !consumerRoot,
              "Default bootstrap route must not render the M6 slice B consumer panel."
            );
            assert(
              scenarioSurfaceState?.addressResolution === "default",
              "Default route must preserve the default first-intake address resolution."
            );
            assert(
              activeScenario?.scenarioId !== "${TARGET_SCENARIO_ID}",
              "Default bootstrap route must keep the bootstrap-owned active scenario."
            );

            return {
              addressResolution: scenarioSurfaceState?.addressResolution ?? null,
              activeScenarioId: activeScenario?.scenarioId ?? null
            };
          })()`,
          { awaitPromise: true }
        );

        console.log(
          JSON.stringify(
            {
              addressedResult,
              defaultRouteResult
            },
            null,
            2
          )
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
