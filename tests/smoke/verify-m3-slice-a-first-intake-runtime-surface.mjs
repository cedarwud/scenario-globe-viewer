import {
  connectCdp,
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
const REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;

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

async function evaluateValue(client, expression, { awaitPromise = false } = {}) {
  const evaluation = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true
  });

  return evaluation.result.value;
}

async function waitForBootstrapReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateValue(
      client,
      `(() => {
        const root = document.documentElement;

        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          bootstrapDetail: root?.dataset.bootstrapDetail ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          buildingShowcase: root?.dataset.buildingShowcase ?? null,
          buildingShowcaseSource: root?.dataset.buildingShowcaseSource ?? null,
          buildingShowcaseState: root?.dataset.buildingShowcaseState ?? null,
          siteTilesetState: root?.dataset.siteTilesetState ?? null
        };
      })()`
    );

    if (
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === "global" &&
      lastState.buildingShowcase === "off" &&
      lastState.buildingShowcaseSource === "default-off" &&
      lastState.buildingShowcaseState === "disabled" &&
      lastState.siteTilesetState === "dormant"
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `First-intake runtime surface validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `First-intake runtime surface validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
  );
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
        await client.send("Page.navigate", {
          url: `${baseUrl}${REQUEST_PATH}`
        });
        await waitForBootstrapReady(client);

        const result = await evaluateValue(
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

            for (let attempt = 0; attempt < 40; attempt += 1) {
              if (window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.firstIntakeScenarioSurface) {
                break;
              }
              await sleep(25);
            }

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture?.scenarioSession, "Missing scenarioSession capture seam.");
            assert(
              capture?.firstIntakeScenarioSurface,
              "Missing first-intake runtime surface capture seam."
            );
            assert(capture?.physicalInput, "Missing physicalInput capture seam.");
            assert(capture?.handoverDecision, "Missing handoverDecision capture seam.");

            const surface = capture.firstIntakeScenarioSurface;
            const state = surface.getState();
            const activeSessionState = capture.scenarioSession.getState();
            const entries = surface.listEntries();
            const addressedEntry = surface.getAddressedEntry();
            const activeScenario = capture.scenarioSession.getCurrentScenario();
            const physicalState = capture.physicalInput.getState();
            const handoverState = capture.handoverDecision.getState();
            const telemetry = {
              firstIntakeRuntimeState:
                document.documentElement.dataset.firstIntakeRuntimeState ?? null,
              firstIntakeScenarioId:
                document.documentElement.dataset.firstIntakeScenarioId ?? null,
              firstIntakeAddressParam:
                document.documentElement.dataset.firstIntakeAddressParam ?? null,
              firstIntakeAddressableEntry:
                document.documentElement.dataset.firstIntakeAddressableEntry ?? null,
              firstIntakeAddressResolution:
                document.documentElement.dataset.firstIntakeAddressResolution ?? null,
              firstIntakeAdoptionMode:
                document.documentElement.dataset.firstIntakeAdoptionMode ?? null,
              firstIntakeTruthBoundaryLabel:
                document.documentElement.dataset.firstIntakeTruthBoundaryLabel ?? null,
              firstIntakeSourceLineage:
                document.documentElement.dataset.firstIntakeSourceLineage ?? null
            };

            assert(entries.length === 1, "First-intake runtime surface must stay single-entry.");
            assert(
              JSON.stringify(state.scenarioIds) ===
                JSON.stringify(["app-oneweb-intelsat-geo-aviation"]),
              "First-intake runtime surface must expose the adapted app-visible scenario id."
            );
            assert(
              state.runtimeState === "active-addressed-case" &&
              state.queryParam === "firstIntakeScenarioId" &&
                state.addressResolution === "matched" &&
                state.resolvedScenarioId === "app-oneweb-intelsat-geo-aviation",
              "URL-addressed first-intake runtime surface must expose the active addressed case and resolve the requested scenario id."
            );
            assert(
              state.adoptionMode === "url-addressed-live-runtime-entry",
              "First-intake runtime surface must expose the chosen live runtime entry seam."
            );
            assert(
              addressedEntry.scenarioId === "app-oneweb-intelsat-geo-aviation" &&
                addressedEntry.definition.id === "app-oneweb-intelsat-geo-aviation",
              "Addressed first-intake entry must stay aligned with the adapted scenario definition."
            );
            assert(
              addressedEntry.addressQuery ===
                "firstIntakeScenarioId=app-oneweb-intelsat-geo-aviation",
              "Addressed first-intake entry must stay URL-addressable through the bounded query seam."
            );
            assert(
              addressedEntry.resolvedInputs.context?.vertical === "commercial_aviation" &&
                addressedEntry.resolvedInputs.context?.truthBoundaryLabel ===
                  "real-pairing-bounded-runtime-projection",
              "Addressed first-intake entry must preserve the vertical and truth-boundary metadata."
            );
            assert(
              addressedEntry.resolvedInputs.resolvedFirstIntakeOverlaySeeds
                ?.resolvedEndpointSeed?.profileId ===
                "aviation-endpoint-overlay-profile" &&
                addressedEntry.resolvedInputs.resolvedFirstIntakeOverlaySeeds
                  ?.resolvedInfrastructureSeed?.profileId ===
                  "oneweb-gateway-pool-profile",
              "Addressed first-intake entry must still come from the repo-owned scenario adapter and overlay resolver chain."
            );
            assert(
              activeScenario &&
                activeSessionState.currentScenarioId ===
                  "app-oneweb-intelsat-geo-aviation" &&
                activeScenario.scenarioId === "app-oneweb-intelsat-geo-aviation" &&
                activeScenario.scenarioId === addressedEntry.scenarioId &&
                !activeScenario.scenarioId.startsWith("bootstrap-"),
              "Primary scenario-session capture seam must now resolve the addressed first-intake case as the live active scenario owner."
            );
            assert(
              physicalState.scenario.id === activeScenario.scenarioId &&
                physicalState.scenario.id === "app-oneweb-intelsat-geo-aviation",
              "Primary physical-input capture seam must now follow the active first-intake scenario owner."
            );
            assert(
              handoverState.snapshot.scenarioId === activeScenario.scenarioId &&
                handoverState.snapshot.scenarioId ===
                  "app-oneweb-intelsat-geo-aviation" &&
                handoverState.snapshot.policyId ===
                  "first-intake-unsupported-noop-v1" &&
                handoverState.snapshot.candidates.length === 0 &&
                handoverState.result.decisionKind === "unavailable" &&
                handoverState.result.semanticsBridge.truthState === "unavailable",
              "Primary handover-decision capture seam must now stay owned by the addressed first-intake case while remaining explicit unsupported/no-op."
            );
            assert(
              telemetry.firstIntakeRuntimeState === "active-addressed-case" &&
                telemetry.firstIntakeScenarioId === "app-oneweb-intelsat-geo-aviation" &&
                telemetry.firstIntakeAddressParam === "firstIntakeScenarioId" &&
                telemetry.firstIntakeAddressableEntry ===
                  "firstIntakeScenarioId=app-oneweb-intelsat-geo-aviation" &&
                telemetry.firstIntakeAddressResolution === "matched" &&
                telemetry.firstIntakeAdoptionMode ===
                  "url-addressed-live-runtime-entry" &&
                telemetry.firstIntakeTruthBoundaryLabel ===
                  "real-pairing-bounded-runtime-projection",
              "Document telemetry must expose the live first-intake runtime surface as the active addressed case."
            );
            assert(
              telemetry.firstIntakeSourceLineage?.includes(
                "oneweb-intelsat-geo-aviation.seed.json"
              ) &&
                telemetry.firstIntakeSourceLineage?.includes(
                  "adaptFirstIntakeScenarioSeedToDefinition"
                ) &&
                telemetry.firstIntakeSourceLineage?.includes(
                  "scenario-facade.previewScenario"
                ),
              "Document telemetry must preserve the seed -> adapter -> scenario preview lineage."
            );

            return {
              proofSeam: "capture:scenarioSession",
              activeScenarioId: activeScenario.scenarioId,
              activeSessionScenarioId: activeSessionState.currentScenarioId,
              physicalScenarioId: physicalState.scenario.id,
              handoverScenarioId: handoverState.snapshot.scenarioId,
              handoverPolicyId: handoverState.snapshot.policyId,
              firstIntakeScenarioId: addressedEntry.scenarioId,
              runtimeState: state.runtimeState,
              addressResolution: state.addressResolution,
              adoptionMode: state.adoptionMode
            };
          })()`,
          { awaitPromise: true }
        );

        console.log(
          `M3 Slice A first-intake runtime surface validation passed: ${JSON.stringify(
            result
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
