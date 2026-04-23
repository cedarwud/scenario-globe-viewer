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
        `First-intake physical-input runtime validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `First-intake physical-input runtime validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
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
              if (window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.firstIntakePhysicalInput) {
                break;
              }
              await sleep(25);
            }

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture?.firstIntakeScenarioSurface, "Missing first-intake scenario surface capture seam.");
            assert(capture?.firstIntakePhysicalInput, "Missing first-intake physical-input capture seam.");
            assert(capture?.scenarioSession, "Missing active scenario-session capture seam.");
            assert(capture?.physicalInput, "Missing active physical-input capture seam.");
            assert(capture?.handoverDecision, "Missing active handover capture seam.");

            const activeScenario = capture.scenarioSession.getCurrentScenario();
            const firstIntakePhysicalState = capture.firstIntakePhysicalInput.getState();
            const activePhysicalState = capture.physicalInput.getState();
            const activeHandoverState = capture.handoverDecision.getState();

            assert(
              activeScenario?.scenarioId === "app-oneweb-intelsat-geo-aviation",
              "Primary scenario-session capture seam must stay on the addressed first-intake scenario."
            );
            assert(
              firstIntakePhysicalState.scenarioId === "app-oneweb-intelsat-geo-aviation" &&
                firstIntakePhysicalState.addressResolution === "matched",
              "First-intake physical-input runtime seam must stay tied to the addressed app-visible scenario."
            );
            assert(
              firstIntakePhysicalState.addressQuery ===
                "firstIntakeScenarioId=app-oneweb-intelsat-geo-aviation",
              "First-intake physical-input runtime seam must stay addressable through the scenario runtime surface."
            );
            assert(
              firstIntakePhysicalState.adoptionMode ===
                "dedicated-non-bootstrap-source",
              "First-intake physical-input runtime seam must expose the dedicated non-bootstrap adoption mode."
            );
            assert(
              firstIntakePhysicalState.physicalInput.scenario.id ===
                "app-oneweb-intelsat-geo-aviation" &&
                firstIntakePhysicalState.physicalInput.activeWindow.contextLabel ===
                  "First-intake bounded service-switching proxy",
              "First-intake physical-input runtime seam must expose the repo-owned first-intake physical state."
            );
            assert(
              JSON.stringify(
                firstIntakePhysicalState.physicalInput.candidates.map((candidate) => ({
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
              "First-intake physical-input runtime seam must preserve the bounded path-projection output."
            );
            assert(
              JSON.stringify(
                firstIntakePhysicalState.physicalInput.provenance.map((entry) => entry.family)
              ) === JSON.stringify(["antenna", "rain-attenuation", "itu-style"]),
              "First-intake physical-input runtime seam must preserve the bounded provenance families."
            );
            assert(
              firstIntakePhysicalState.sourceLineage.seedPath.includes(
                "oneweb-intelsat-geo-aviation.seed.json"
              ) &&
                firstIntakePhysicalState.sourceLineage.scenarioSurface ===
                  "createFirstIntakeRuntimeScenarioSurface" &&
                firstIntakePhysicalState.sourceLineage.sourceCatalog ===
                  "createFirstIntakePhysicalInputSourceCatalog" &&
                firstIntakePhysicalState.sourceLineage.sourceAdapter ===
                  "adaptFirstIntakeSeedToPhysicalInputSourceEntry" &&
                firstIntakePhysicalState.sourceLineage.boundedMetricProfile ===
                  "ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE" &&
                firstIntakePhysicalState.sourceLineage.stateResolver ===
                  "createPhysicalInputState" &&
                firstIntakePhysicalState.sourceLineage.bootstrapFallback ===
                  "not-used",
              "First-intake physical-input runtime seam must expose the seed -> scenario surface -> path projection -> bounded profile lineage without bootstrap fallback."
            );
            assert(
              activePhysicalState.scenario.id === activeScenario.scenarioId &&
                activePhysicalState.scenario.id ===
                  firstIntakePhysicalState.physicalInput.scenario.id &&
                activePhysicalState.activeWindow.contextLabel ===
                  "First-intake bounded service-switching proxy",
              "Primary physical-input capture seam must now resolve to the same first-intake-owned physical-input state instead of leaving it on a sidecar object."
            );
            assert(
              activeHandoverState.snapshot.scenarioId === activeScenario.scenarioId &&
                activeHandoverState.snapshot.policyId ===
                  "first-intake-unsupported-noop-v1" &&
                activeHandoverState.snapshot.candidates.length === 0 &&
                activeHandoverState.result.decisionKind === "unavailable" &&
                activeHandoverState.result.semanticsBridge.truthState ===
                  "unavailable",
              "Primary handover capture seam must stay explicit unsupported/no-op for the addressed first-intake case."
            );

            return {
              proofSeam: "capture:physicalInput",
              activeScenarioId: activeScenario.scenarioId,
              firstIntakeScenarioId: firstIntakePhysicalState.scenarioId,
              candidateIds: firstIntakePhysicalState.physicalInput.candidates.map(
                (candidate) => candidate.candidateId
              ),
              activePhysicalScenarioId: activePhysicalState.scenario.id,
              activeHandoverPolicyId: activeHandoverState.snapshot.policyId
            };
          })()`,
          { awaitPromise: true }
        );

        console.log(
          `M3 Slice C first-intake physical-input runtime validation passed: ${JSON.stringify(
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
