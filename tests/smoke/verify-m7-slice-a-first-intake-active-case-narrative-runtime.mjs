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
const NARRATIVE_SELECTOR = "[data-first-intake-active-case-narrative='true']";
const EXPLAINER_SELECTOR = "[data-first-intake-operator-explainer='true']";
const TRAJECTORY_CONSUMER_SELECTOR =
  "[data-first-intake-mobile-endpoint-trajectory-consumer='true']";
const EXPECTED_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;
const DEFAULT_REQUEST_PATH = "/?scenePreset=global";
const EXPECTED_NARRATIVE_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeActiveCaseNarrative";
const EXPECTED_TRAJECTORY_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeMobileEndpointTrajectory";
const EXPECTED_TRAJECTORY_CONSUMER_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeMobileEndpointTrajectoryConsumer";
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
        `M7 slice B validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M7 slice B validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
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

            let narrativeState = null;
            let panel = null;

            for (let attempt = 0; attempt < 80; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              narrativeState =
                capture?.firstIntakeActiveCaseNarrative?.getState?.() ?? null;
              panel = document.querySelector("${NARRATIVE_SELECTOR}");

              if (
                capture?.firstIntakeActiveCaseNarrative &&
                capture?.firstIntakeOperatorExplainer &&
                capture?.firstIntakeMobileEndpointTrajectoryConsumer &&
                narrativeState?.scenarioId === "${TARGET_SCENARIO_ID}" &&
                panel instanceof HTMLElement
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
              "Missing first-intake mobile trajectory seam."
            );
            assert(
              capture?.firstIntakeMobileEndpointTrajectoryConsumer,
              "Missing first-intake mobile trajectory consumer seam."
            );
            assert(
              capture?.firstIntakeOperatorExplainer,
              "Missing first-intake operator explainer capture seam."
            );
            assert(
              capture?.firstIntakeActiveCaseNarrative,
              "Missing first-intake active-case narrative proof seam."
            );
            assert(
              panel instanceof HTMLElement,
              "Missing browser-visible first-intake active-case narrative panel."
            );

            narrativeState = capture.firstIntakeActiveCaseNarrative.getState();
            if (forceBrowserAssertionFailure) {
              assert(
                false,
                "Forced M7 browser-side assertion failure for close-out proof validation."
              );
            }
            const scenarioSurfaceState = capture.firstIntakeScenarioSurface.getState();
            const addressedEntry = capture.firstIntakeScenarioSurface.getAddressedEntry();
            const activeScenario = capture.scenarioSession.getCurrentScenario();
            const physicalState = capture.firstIntakePhysicalInput.getState();
            const handoverState = capture.firstIntakeHandoverDecision.getState();
            const overlayState = capture.firstIntakeOverlayExpression.getState();
            const trajectoryState =
              capture.firstIntakeMobileEndpointTrajectory.getState();
            const trajectoryConsumerState =
              capture.firstIntakeMobileEndpointTrajectoryConsumer.getState();
            const operatorExplainerState =
              capture.firstIntakeOperatorExplainer.getState();
            const operatorExplainerPanel = document.querySelector(
              "${EXPLAINER_SELECTOR}"
            );
            const trajectoryConsumerPanel = document.querySelector(
              "${TRAJECTORY_CONSUMER_SELECTOR}"
            );
            const panelRect = panel.getBoundingClientRect();
            const panelText = panel.innerText.replace(/\\s+/g, " ").trim();
            const panelDataset = {
              scenarioId: panel.dataset.scenarioId ?? null,
              addressResolution: panel.dataset.addressResolution ?? null,
              activeScenarioId: panel.dataset.activeScenarioId ?? null,
              narrativeState: panel.dataset.narrativeState ?? null,
              narrativeSurface: panel.dataset.narrativeSurface ?? null,
              caseLabel: panel.dataset.caseLabel ?? null,
              serviceSwitchingSemantics:
                panel.dataset.serviceSwitchingSemantics ?? null,
              pathControlMode: panel.dataset.pathControlMode ?? null,
              nativeRfHandover: panel.dataset.nativeRfHandover ?? null,
              truthBoundaryLabel: panel.dataset.truthBoundaryLabel ?? null,
              truthBoundaryMode: panel.dataset.truthBoundaryMode ?? null,
              measurementTruthClaim:
                panel.dataset.measurementTruthClaim ?? null,
              onewebGatewayPoolSemantics:
                panel.dataset.onewebGatewayPoolSemantics ?? null,
              geoAnchorSemantics: panel.dataset.geoAnchorSemantics ?? null,
              acceptedCorridorPackageId:
                panel.dataset.acceptedCorridorPackageId ?? null,
              acceptedCorridorPackageNature:
                panel.dataset.acceptedCorridorPackageNature ?? null,
              equipageTruth: panel.dataset.equipageTruth ?? null,
              serviceTruth: panel.dataset.serviceTruth ?? null,
              proofSeam: panel.dataset.proofSeam ?? null,
              composedRuntimeSeams: panel.dataset.composedRuntimeSeams ?? null,
              lineageActiveOwner: panel.dataset.lineageActiveOwner ?? null,
              lineageScenarioRuntimeRead:
                panel.dataset.lineageScenarioRuntimeRead ?? null,
              lineagePhysicalInputRead:
                panel.dataset.lineagePhysicalInputRead ?? null,
              lineageHandoverRead: panel.dataset.lineageHandoverRead ?? null,
              lineageOverlayRead: panel.dataset.lineageOverlayRead ?? null,
              lineageTrajectoryRead: panel.dataset.lineageTrajectoryRead ?? null,
              lineageTrajectoryConsumerRead:
                panel.dataset.lineageTrajectoryConsumerRead ?? null,
              lineageTrajectoryProofSeam:
                panel.dataset.lineageTrajectoryProofSeam ?? null,
              lineageTrajectoryConsumerProofSeam:
                panel.dataset.lineageTrajectoryConsumerProofSeam ?? null,
              lineageRawSeedSideReadOwnership:
                panel.dataset.lineageRawSeedSideReadOwnership ?? null,
              lineageRawPackageSideReadOwnership:
                panel.dataset.lineageRawPackageSideReadOwnership ?? null
            };
            const pathControlModes = [
              ...new Set(
                physicalState.physicalInput.candidates
                  .map((candidate) => candidate.pathControlMode)
                  .filter(Boolean)
              )
            ];
            const geoAnchorEndpoint = overlayState.endpoints.find(
              (endpoint) => endpoint.role === "endpoint-b"
            );
            const visiblePrimaryNarrativePanels = [
              {
                name: "firstIntakeActiveCaseNarrative",
                present: panel instanceof HTMLElement
              },
              {
                name: "firstIntakeOperatorExplainer",
                present: operatorExplainerPanel instanceof HTMLElement
              },
              {
                name: "firstIntakeMobileEndpointTrajectoryConsumer",
                present: trajectoryConsumerPanel instanceof HTMLElement
              }
            ]
              .filter((entry) => entry.present)
              .map((entry) => entry.name);

            assert(
              scenarioSurfaceState.addressResolution === "matched" &&
                activeScenario?.scenarioId === "${TARGET_SCENARIO_ID}",
              "Addressed first-intake case must remain the active scenario owner."
            );
            assert(
              narrativeState.narrativeState === "active-addressed-case" &&
                narrativeState.narrativeSurface ===
                  "integrated-active-case-narrative-panel" &&
                narrativeState.panelVisible === true &&
                narrativeState.activeScenarioId === "${TARGET_SCENARIO_ID}" &&
                narrativeState.proofSeam === "${EXPECTED_NARRATIVE_PROOF_SEAM}",
              "M7 slice B must keep firstIntakeActiveCaseNarrative as the visible active-case narrative surface."
            );
            assert(
              JSON.stringify(visiblePrimaryNarrativePanels) ===
                JSON.stringify(["firstIntakeActiveCaseNarrative"]),
              "Only firstIntakeActiveCaseNarrative may remain mounted as a viewer-facing first-case narrative panel."
            );
            assert(
              operatorExplainerState.panelVisible === false &&
                trajectoryConsumerState.panelVisible === false &&
                !(operatorExplainerPanel instanceof HTMLElement) &&
                !(trajectoryConsumerPanel instanceof HTMLElement),
              "M5/M6 seams must stay capture-owned while their duplicate viewer-facing panels are suppressed on the active addressed route."
            );
            assert(
              operatorExplainerState.scenarioId === "${TARGET_SCENARIO_ID}" &&
                operatorExplainerState.activeScenarioId ===
                  "${TARGET_SCENARIO_ID}" &&
                operatorExplainerState.caseLabel ===
                  "OneWeb LEO + Intelsat GEO aviation" &&
                operatorExplainerState.serviceSwitchingSemantics ===
                  "service-layer switching" &&
                operatorExplainerState.pathControlMode ===
                  "managed_service_switching" &&
                operatorExplainerState.nativeRfHandover === false &&
                operatorExplainerState.truthBoundaryMode === "bounded-proxy" &&
                operatorExplainerState.measurementTruthClaim ===
                  "not-measurement-truth" &&
                operatorExplainerState.onewebGatewayPoolSemantics ===
                  "eligible-pool" &&
                operatorExplainerState.geoAnchorSemantics ===
                  "provider-managed-anchor",
              "The retained M5 seam must stay available through runtime capture without reclaiming viewer-facing ownership."
            );
            assert(
              trajectoryConsumerState.consumerState === "active-addressed-case" &&
                trajectoryConsumerState.consumerSurface ===
                  "runtime-local-corridor-provenance-panel" &&
                trajectoryConsumerState.activeScenarioId ===
                  "${TARGET_SCENARIO_ID}" &&
                trajectoryConsumerState.acceptedCorridorPackageId ===
                  "${EXPECTED_RECORD_ID}" &&
                trajectoryConsumerState.packageNature ===
                  "historical-replay-package" &&
                trajectoryConsumerState.equipageTruth ===
                  "not-proven-at-tail-level" &&
                trajectoryConsumerState.serviceTruth ===
                  "not-proven-active-on-this-flight" &&
                trajectoryConsumerState.proofSeam ===
                  "${EXPECTED_TRAJECTORY_CONSUMER_PROOF_SEAM}" &&
                trajectoryConsumerState.sourceLineage.runtimeTrajectoryRead ===
                  "trajectoryController.getState().trajectory" &&
                trajectoryConsumerState.sourceLineage.rawPackageSideReadOwnership ===
                  "forbidden",
              "The retained M6 consumer seam must stay available through runtime capture without reclaiming viewer-facing ownership."
            );
            assert(
              JSON.stringify(narrativeState.composedRuntimeSeams) ===
                JSON.stringify([
                  "createFirstIntakeRuntimeScenarioSurface",
                  "createFirstIntakeActiveScenarioSession",
                  "createFirstIntakePhysicalInputController",
                  "createFirstIntakeHandoverDecisionController",
                  "createFirstIntakeOverlayExpressionController",
                  "createFirstIntakeMobileEndpointTrajectoryController",
                  "createFirstIntakeMobileEndpointTrajectoryConsumerController"
                ]),
              "Narrative seam must explicitly name the runtime seams it composes."
            );
            assert(
              addressedEntry.definition.label ===
                "OneWeb + Intelsat GEO Aviation" &&
                narrativeState.caseLabel ===
                  "OneWeb LEO + Intelsat GEO aviation" &&
                narrativeState.serviceSwitchingSemantics ===
                  "service-layer switching" &&
                narrativeState.pathControlMode === pathControlModes[0] &&
                pathControlModes[0] === "managed_service_switching" &&
                narrativeState.nativeRfHandover ===
                  handoverState.snapshot.isNativeRfHandover &&
                narrativeState.truthBoundaryLabel ===
                  handoverState.result.semanticsBridge.truthBoundaryLabel &&
                narrativeState.truthBoundaryMode === "bounded-proxy" &&
                narrativeState.measurementTruthClaim ===
                  "not-measurement-truth",
              "Narrative seam must read active-case identity, service-layer switching, non-native-RF, and bounded-proxy semantics from runtime seams."
            );
            assert(
              narrativeState.onewebGatewayPoolSemantics ===
                overlayState.gatewayPoolSemantics &&
                narrativeState.onewebGatewayPoolSemantics ===
                  "eligible-gateway-pool" &&
                overlayState.activeGatewayClaim === "not-claimed" &&
                physicalState.physicalInput.candidates.some(
                  (candidate) =>
                    candidate.infrastructureSelectionMode === "eligible-pool"
                ) &&
                narrativeState.geoAnchorSemantics ===
                  geoAnchorEndpoint?.positionMode &&
                narrativeState.geoAnchorSemantics ===
                  "provider-managed-anchor" &&
                physicalState.physicalInput.candidates.some(
                  (candidate) =>
                    candidate.infrastructureSelectionMode ===
                    "provider-managed"
                ),
              "Narrative seam must compose the existing eligible-pool and provider-managed runtime semantics without claiming an active gateway."
            );
            assert(
              narrativeState.acceptedCorridorPackageId ===
                trajectoryConsumerState.acceptedCorridorPackageId &&
                narrativeState.acceptedCorridorPackageId ===
                  trajectoryState.trajectory.trajectory.recordId &&
                narrativeState.acceptedCorridorPackageId ===
                  "${EXPECTED_RECORD_ID}" &&
                narrativeState.acceptedCorridorPackageNature ===
                  trajectoryConsumerState.packageNature &&
                narrativeState.acceptedCorridorPackageNature ===
                  "historical-replay-package" &&
                narrativeState.equipageTruth ===
                  trajectoryConsumerState.equipageTruth &&
                narrativeState.equipageTruth ===
                  "not-proven-at-tail-level" &&
                narrativeState.serviceTruth ===
                  trajectoryConsumerState.serviceTruth &&
                narrativeState.serviceTruth ===
                  "not-proven-active-on-this-flight",
              "Narrative seam must read accepted corridor package and bounded truth labels from the trajectory runtime seams."
            );
            assert(
              narrativeState.sourceLineage.activeOwner ===
                "createFirstIntakeActiveScenarioSession" &&
                narrativeState.sourceLineage.scenarioRuntimeRead ===
                  "scenarioSurface.getState()+scenarioSurface.getAddressedEntry()" &&
                narrativeState.sourceLineage.physicalInputRead ===
                  "physicalInputController.getState().physicalInput" &&
                narrativeState.sourceLineage.handoverRead ===
                  "handoverDecisionController.getState()" &&
                narrativeState.sourceLineage.overlayRead ===
                  "overlayExpressionController.getState()" &&
                narrativeState.sourceLineage.trajectoryRead ===
                  "trajectoryController.getState().trajectory" &&
                narrativeState.sourceLineage.trajectoryConsumerRead ===
                  "trajectoryConsumerController.getState()" &&
                narrativeState.sourceLineage.trajectoryProofSeam ===
                  "${EXPECTED_TRAJECTORY_PROOF_SEAM}" &&
                narrativeState.sourceLineage.trajectoryConsumerProofSeam ===
                  "${EXPECTED_TRAJECTORY_CONSUMER_PROOF_SEAM}" &&
                narrativeState.sourceLineage.rawSeedSideReadOwnership ===
                  "forbidden" &&
                narrativeState.sourceLineage.rawPackageSideReadOwnership ===
                  "forbidden",
              "Narrative seam must name the runtime reads it composes and explicitly forbid raw seed/package side-reads."
            );
            assert(
              panelRect.width > 0 &&
                panelRect.height > 0 &&
                panelText.includes("OneWeb LEO + Intelsat GEO aviation") &&
                panelText.includes("service-layer switching") &&
                panelText.includes("not native RF handover") &&
                panelText.includes("bounded-proxy, not measurement truth") &&
                panelText.includes("OneWeb = eligible gateway pool") &&
                panelText.includes("GEO = provider-managed anchor") &&
                panelText.includes(
                  "accepted corridor package = historical replay package"
                ) &&
                panelText.includes("not-proven-at-tail-level") &&
                panelText.includes("not-proven-active-on-this-flight"),
              "Narrative panel must visibly communicate every required M7 fact."
            );
            assert(
              panelDataset.scenarioId === narrativeState.scenarioId &&
                panelDataset.addressResolution ===
                  narrativeState.addressResolution &&
                panelDataset.activeScenarioId ===
                  narrativeState.activeScenarioId &&
                panelDataset.narrativeState ===
                  narrativeState.narrativeState &&
                panelDataset.narrativeSurface ===
                  narrativeState.narrativeSurface &&
                panelDataset.caseLabel === narrativeState.caseLabel &&
                panelDataset.serviceSwitchingSemantics ===
                  narrativeState.serviceSwitchingSemantics &&
                panelDataset.pathControlMode ===
                  narrativeState.pathControlMode &&
                panelDataset.nativeRfHandover ===
                  String(narrativeState.nativeRfHandover) &&
                panelDataset.truthBoundaryLabel ===
                  narrativeState.truthBoundaryLabel &&
                panelDataset.truthBoundaryMode ===
                  narrativeState.truthBoundaryMode &&
                panelDataset.measurementTruthClaim ===
                  narrativeState.measurementTruthClaim &&
                panelDataset.onewebGatewayPoolSemantics ===
                  narrativeState.onewebGatewayPoolSemantics &&
                panelDataset.geoAnchorSemantics ===
                  narrativeState.geoAnchorSemantics &&
                panelDataset.acceptedCorridorPackageId ===
                  narrativeState.acceptedCorridorPackageId &&
                panelDataset.acceptedCorridorPackageNature ===
                  narrativeState.acceptedCorridorPackageNature &&
                panelDataset.equipageTruth ===
                  narrativeState.equipageTruth &&
                panelDataset.serviceTruth === narrativeState.serviceTruth &&
                panelDataset.proofSeam === narrativeState.proofSeam &&
                panelDataset.composedRuntimeSeams ===
                  JSON.stringify(narrativeState.composedRuntimeSeams) &&
                panelDataset.lineageTrajectoryProofSeam ===
                  narrativeState.sourceLineage.trajectoryProofSeam &&
                panelDataset.lineageTrajectoryConsumerProofSeam ===
                  narrativeState.sourceLineage.trajectoryConsumerProofSeam &&
                panelDataset.lineageRawSeedSideReadOwnership ===
                  narrativeState.sourceLineage.rawSeedSideReadOwnership &&
                panelDataset.lineageRawPackageSideReadOwnership ===
                  narrativeState.sourceLineage.rawPackageSideReadOwnership,
              "Browser-visible narrative DOM markers must stay aligned with the runtime capture state."
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
            assert(
              trajectoryState.runtimeState ===
                "accepted-corridor-package-ingested" &&
                trajectoryState.contractSeam ===
                  "MobileEndpointTrajectorySourceEntry" &&
                trajectoryState.ingestionSeam ===
                  "adaptAcceptedCorridorPackageToMobileEndpointTrajectorySourceEntry" &&
                trajectoryState.proofSeam ===
                  "${EXPECTED_TRAJECTORY_PROOF_SEAM}" &&
                trajectoryState.trajectory.trajectory.recordId ===
                  "${EXPECTED_RECORD_ID}" &&
                trajectoryState.trajectory.trajectory.waypointCount === 447 &&
                trajectoryState.trajectory.truthBoundary.corridorTruth ===
                  "replayable-historical-trajectory-package" &&
                trajectoryState.trajectory.truthBoundary.equipageTruth ===
                  "not-proven-at-tail-level" &&
                trajectoryState.trajectory.truthBoundary.serviceTruth ===
                  "not-proven-active-on-this-flight",
              "M6 trajectory seam must stay unchanged."
            );

            return {
              consolidationSeam: "startBootstrapComposition",
              primaryProofSeam:
                "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeActiveCaseNarrative",
              visiblePrimaryNarrativePanels,
              hiddenRepoOwnedSeams: [
                {
                  seam: "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeOperatorExplainer",
                  panelVisible: operatorExplainerState.panelVisible
                },
                {
                  seam: "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeMobileEndpointTrajectoryConsumer",
                  panelVisible: trajectoryConsumerState.panelVisible
                }
              ],
              caseLabel: narrativeState.caseLabel,
              corridorPackageId: narrativeState.acceptedCorridorPackageId
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
            const firstIntakeSurfaceState =
              capture?.firstIntakeScenarioSurface?.getState?.();
            const narrativePanel = document.querySelector("${NARRATIVE_SELECTOR}");
            const operatorExplainerPanel = document.querySelector(
              "${EXPLAINER_SELECTOR}"
            );
            const trajectoryConsumerPanel = document.querySelector(
              "${TRAJECTORY_CONSUMER_SELECTOR}"
            );

            assert(capture?.scenarioSession, "Missing active scenario-session capture seam.");
            assert(
              activeScenario?.scenarioId &&
                activeScenario.scenarioId !== "${TARGET_SCENARIO_ID}" &&
                activeScenario.scenarioId !==
                  capture.firstIntakeScenarioSurface.getAddressedEntry().scenarioId,
              "Default bootstrap route must keep the bootstrap-owned scenario session active."
            );
            assert(
              capture.firstIntakeActiveCaseNarrative === undefined &&
                capture.firstIntakeOperatorExplainer === undefined &&
                capture.firstIntakeMobileEndpointTrajectory === undefined &&
                capture.firstIntakeMobileEndpointTrajectoryConsumer === undefined &&
                !(narrativePanel instanceof HTMLElement) &&
                !(operatorExplainerPanel instanceof HTMLElement) &&
                !(trajectoryConsumerPanel instanceof HTMLElement),
              "Default bootstrap route must not mount or capture the first-intake single-primary narrative lane."
            );
            assert(
              firstIntakeSurfaceState.addressResolution === "default",
              "Default bootstrap route must keep the first-intake surface as a sidecar default resolution only."
            );

            return {
              activeScenarioId: activeScenario.scenarioId,
              firstIntakeAddressResolution: firstIntakeSurfaceState.addressResolution
            };
          })()`,
          { awaitPromise: true }
        );

        console.log(
          `M7 Slice B first-intake single-primary narrative validation passed: ${JSON.stringify(
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
