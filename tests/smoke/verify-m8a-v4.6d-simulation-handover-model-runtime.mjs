import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const ARTIFACT_PATH = path.join(
  repoRoot,
  "public/fixtures/ground-station-projections/m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28.json"
);
const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_MODEL_ID = "m8a-v4.6d-simulation-handover-model.v1";
const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_ENDPOINT_IDS = [
  "tw-cht-multi-orbit-ground-infrastructure",
  "sg-speedcast-singapore-teleport"
];
const EXPECTED_WINDOW_IDS = [
  "leo-acquisition-context",
  "leo-aging-pressure",
  "meo-continuity-hold",
  "leo-reentry-candidate",
  "geo-continuity-guard"
];
const REQUIRED_NON_CLAIM_KEYS = [
  "noRealOperatorHandoverEvent",
  "noActiveServingSatelliteIdentity",
  "noActiveGatewayAssignment",
  "noPairSpecificTeleportPathTruth",
  "noMeasuredLatencyJitterThroughputTruth",
  "noNativeRfHandover",
  "noEndpointPairOrPrecisionChange",
  "noR2RuntimeSelector",
  "noRawItriOrLiveExternalRuntimeSource"
];
const EXPECTED_ACTOR_COUNTS = {
  leo: 6,
  meo: 5,
  geo: 2
};
const RUNTIME_SOURCE_FILES = [
  "src/runtime/m8a-v4-ground-station-projection.ts",
  "src/runtime/m8a-v4-ground-station-handover-scene-controller.ts",
  "src/runtime/bootstrap/composition.ts"
];
const SOURCE_BOUNDARY_PATTERNS = [
  {
    label: "static import from raw itri path",
    pattern: /from\s+["'][^"']*itri\/multi-orbit\/download[^"']*["']/gi
  },
  {
    label: "dynamic import of raw itri path",
    pattern: /import\(\s*["'][^"']*itri\/multi-orbit\/download[^"']*["']\s*\)/gi
  },
  {
    label: "runtime fetch of raw itri path",
    pattern: /fetch\(\s*["'][^"']*itri\/multi-orbit\/download[^"']*["']/gi
  },
  {
    label: "filesystem read of raw itri path",
    pattern: /readFile(?:Sync)?\([^)]*itri\/multi-orbit\/download/gi
  },
  {
    label: "URL resolution of raw itri path",
    pattern: /new\s+URL\(\s*["'][^"']*itri\/multi-orbit\/download[^"']*["']/gi
  },
  {
    label: "runtime fetch of live CelesTrak source",
    pattern: /fetch\(\s*["'][^"']*celestrak\.org[^"']*["']/gi
  },
  {
    label: "dynamic import of live CelesTrak source",
    pattern: /import\(\s*["'][^"']*celestrak\.org[^"']*["']\s*\)/gi
  },
  {
    label: "URL resolution of live CelesTrak source",
    pattern: /new\s+URL\(\s*["'][^"']*celestrak\.org[^"']*["']/gi
  }
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split("\n").length;
}

function scanRuntimeSourceBoundary() {
  const hits = [];

  for (const relativePath of RUNTIME_SOURCE_FILES) {
    const absolutePath = path.join(repoRoot, relativePath);
    const source = readFileSync(absolutePath, "utf8");

    for (const { label, pattern } of SOURCE_BOUNDARY_PATTERNS) {
      pattern.lastIndex = 0;

      for (const match of source.matchAll(pattern)) {
        hits.push({
          file: relativePath,
          line: lineNumberFor(source, match.index ?? 0),
          label,
          match: match[0]
        });
      }
    }
  }

  return hits;
}

function loadArtifactFacts() {
  const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
  const actorCounts = artifact.orbitActors.reduce(
    (counts, actor) => ({
      ...counts,
      [actor.orbitClass]: counts[actor.orbitClass] + 1
    }),
    { leo: 0, meo: 0, geo: 0 }
  );

  return {
    artifactId: artifact.artifactId,
    actorIds: artifact.orbitActors.map((actor) => actor.actorId),
    actorCounts,
    endpointIds: artifact.endpoints.map((endpoint) => endpoint.endpointId)
  };
}

async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 480
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
          scenePreset: root?.dataset.scenePreset ?? null,
          v4RuntimeState: root?.dataset.m8aV4GroundStationRuntimeState ?? null,
          hasV4Seam: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasV4Seam
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.6D validation did not reach a ready V4 scene: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, url) {
  await client.send("Page.navigate", { url });
  await waitForBootstrapReady(client);
}

async function main() {
  ensureDistBuildExists();

  const sourceBoundaryHits = scanRuntimeSourceBoundary();
  assert(
    sourceBoundaryHits.length === 0,
    `M8A-V4.6D runtime source-boundary scan failed: ${JSON.stringify(
      sourceBoundaryHits
    )}`
  );

  const artifactFacts = loadArtifactFacts();
  assert(
    JSON.stringify(artifactFacts.actorCounts) ===
      JSON.stringify(EXPECTED_ACTOR_COUNTS),
    `Accepted V4.6B artifact actor counts changed: ${JSON.stringify(
      artifactFacts.actorCounts
    )}`
  );
  assert(
    JSON.stringify(artifactFacts.endpointIds) ===
      JSON.stringify(EXPECTED_ENDPOINT_IDS),
    `Accepted endpoint pair changed in artifact: ${JSON.stringify(
      artifactFacts.endpointIds
    )}`
  );

  const browserCommand = findHeadlessBrowser();
  let serverHandle = null;
  let browserHandle = null;
  let client = null;

  try {
    serverHandle = await startStaticServer();
    await verifyFetches(serverHandle.baseUrl);

    browserHandle = await startHeadlessBrowser(browserCommand);
    const pageWebSocketUrl = await resolvePageWebSocketUrl(
      browserHandle.browserWebSocketUrl
    );
    client = await connectCdp(pageWebSocketUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await setViewport(client, { width: 1440, height: 900 });
    await navigateAndWait(client, `${serverHandle.baseUrl}${REQUEST_PATH}`);
    await sleep(200);

    const result = await evaluateRuntimeValue(
      client,
      `((config) => {
        const assert = (condition, message) => {
          if (!condition) {
            throw new Error(message);
          }
        };
        const deepEqual = (left, right) => {
          return JSON.stringify(left) === JSON.stringify(right);
        };
        const isNegatedPath = (path, negatedFieldNames) => {
          return path.some((part) => negatedFieldNames.includes(part));
        };
        const hasNegatedContext = (text, index) => {
          const prefix = text
            .slice(Math.max(0, index - 140), index)
            .toLowerCase();
          return /\\b(no|not|without|forbidden|must not|does not claim|not claimed|non-claim|disallow|disallowed)\\b/.test(
            prefix
          );
        };
        const positiveClaimPhrases = [
          "real operator handover event",
          "active serving satellite",
          "active gateway",
          "pair-specific teleport path",
          "measured latency",
          "measured jitter",
          "measured throughput",
          "measured continuity",
          "native rf handover",
          "site-level",
          "same-site",
          "exact endpoint",
          "r2 runtime selector",
          "raw itri",
          "live external runtime source"
        ];
        const scanForbiddenClaims = (
          value,
          policy,
          path = [],
          hits = []
        ) => {
          const forbiddenKeys = policy.forbiddenModelKeys ?? [];
          const negatedFieldNames = policy.negatedFieldNames ?? [];

          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              scanForbiddenClaims(item, policy, [...path, String(index)], hits);
            });
            return hits;
          }

          if (value && typeof value === "object") {
            for (const [key, child] of Object.entries(value)) {
              const nextPath = [...path, key];

              if (
                forbiddenKeys.includes(key) &&
                !isNegatedPath(nextPath, negatedFieldNames)
              ) {
                hits.push({
                  kind: "forbidden-key",
                  path: nextPath.join("."),
                  key
                });
              }

              scanForbiddenClaims(child, policy, nextPath, hits);
            }

            return hits;
          }

          if (typeof value === "string" && !isNegatedPath(path, negatedFieldNames)) {
            const lowered = value.toLowerCase();

            for (const phrase of positiveClaimPhrases) {
              let index = lowered.indexOf(phrase);

              while (index !== -1) {
                if (!hasNegatedContext(value, index)) {
                  hits.push({
                    kind: "positive-claim-text",
                    path: path.join("."),
                    phrase,
                    value
                  });
                }

                index = lowered.indexOf(phrase, index + phrase.length);
              }
            }
          }

          return hits;
        };
        const assertMetricClassesAreBounded = (metricClasses, windowId) => {
          const forbiddenMetricKeys = [
            "latencyMs",
            "jitterMs",
            "throughputMbps",
            "throughputGbps",
            "percentMeasured"
          ];

          for (const key of forbiddenMetricKeys) {
            assert(
              !(key in metricClasses),
              windowId + " metric classes must not expose " + key
            );
          }

          for (const [key, value] of Object.entries(metricClasses)) {
            assert(
              typeof value === "string",
              windowId + " " + key + " must be a bounded class label."
            );
            assert(
              !/\\d|ms\\b|mbps\\b|gbps\\b|percentMeasured/i.test(value),
              windowId + " " + key + " contains measured numeric/unit text: " + value
            );
          }
        };

        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        assert(capture?.m8aV4GroundStationScene, "Missing V4 runtime seam.");

        const state = capture.m8aV4GroundStationScene.getState();
        const model = state.simulationHandoverModel;
        const modelWindow = model.window;
        const telemetry = document.documentElement.dataset;
        const actorMap = new Map(
          state.actors.map((actor) => [actor.actorId, actor])
        );
        const forbiddenResourceRequests = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((name) => /celestrak|itri\\/multi-orbit/i.test(name));

        assert(model, "V4.6D simulation handover model is missing from state.");
        assert(
          model.modelId === config.expectedModelId &&
            telemetry.m8aV46dSimulationHandoverModelId ===
              config.expectedModelId,
          "V4.6D model id must match the accepted contract."
        );
        assert(
          model.endpointPairId === config.expectedEndpointPairId &&
            model.acceptedPairPrecision === config.expectedPrecision &&
            model.route === config.requestPath,
          "V4.6D model must preserve endpoint pair, precision, and route."
        );
        assert(
          deepEqual(state.endpoints.map((endpoint) => endpoint.endpointId), config.endpointIds) &&
            state.endpointCount === 2,
          "Runtime endpoint pair changed."
        );
        assert(
          state.orbitActorCounts.leo === config.expectedActorCounts.leo &&
            state.orbitActorCounts.meo === config.expectedActorCounts.meo &&
            state.orbitActorCounts.geo === config.expectedActorCounts.geo &&
            state.actorCount === config.actorIds.length,
          "Runtime actor set counts changed: " + JSON.stringify(state.orbitActorCounts)
        );
        assert(
          deepEqual(state.actors.map((actor) => actor.actorId), config.actorIds),
          "Runtime actor ids no longer match the V4.6B actor set."
        );
        assert(
          deepEqual(model.timelineWindowIds, config.expectedWindowIds) &&
            deepEqual(
              model.timeline.map((windowDefinition) => windowDefinition.windowId),
              config.expectedWindowIds
            ) &&
            deepEqual(
              model.validationExpectations.expectedWindowIds,
              config.expectedWindowIds
            ),
          "V4.6D timeline window ids changed."
        );

        const normalizeWindow = (windowDefinition) => ({
          windowId: windowDefinition.windowId,
          startRatioInclusive: windowDefinition.startRatioInclusive,
          stopRatioExclusive: windowDefinition.stopRatioExclusive,
          displayRepresentativeOrbitClass:
            windowDefinition.displayRepresentativeOrbitClass,
          displayRepresentativeActorId:
            windowDefinition.displayRepresentativeActorId,
          candidateContextOrbitClasses:
            windowDefinition.candidateContextOrbitClasses,
          candidateContextActorIds: windowDefinition.candidateContextActorIds,
          fallbackContextOrbitClasses:
            windowDefinition.fallbackContextOrbitClasses,
          fallbackContextActorIds: windowDefinition.fallbackContextActorIds,
          boundedMetricClasses: windowDefinition.boundedMetricClasses,
          nonClaims: windowDefinition.nonClaims
        });
        const allWindows = model.timeline;
        assert(
          deepEqual(allWindows.map(normalizeWindow), config.acceptedWindows),
          "V4.6D runtime timeline does not match the accepted window contract."
        );
        assert(allWindows[0].startRatioInclusive === 0);
        for (let index = 0; index < allWindows.length; index += 1) {
          const current = allWindows[index];
          const next = allWindows[index + 1];

          assert(
            current.startRatioInclusive < current.stopRatioExclusive,
            current.windowId + " must have positive ratio span."
          );
          if (next) {
            assert(
              current.stopRatioExclusive === next.startRatioInclusive,
              current.windowId + " must stop where next window starts."
            );
          }
        }
        assert(allWindows[allWindows.length - 1].stopRatioExclusive === 1);

        for (const windowDefinition of allWindows) {
          const representativeActor = actorMap.get(
            windowDefinition.displayRepresentativeActorId
          );
          assert(
            representativeActor,
            windowDefinition.windowId + " representative actor is missing."
          );
          assert(
            representativeActor.orbitClass ===
              windowDefinition.displayRepresentativeOrbitClass,
            windowDefinition.windowId + " representative orbit class mismatch."
          );
          assert(
            windowDefinition.candidateContextActorIds.length ===
              windowDefinition.candidateContextOrbitClasses.length,
            windowDefinition.windowId + " candidate ids/classes must align."
          );
          windowDefinition.candidateContextActorIds.forEach((actorId, index) => {
            const actor = actorMap.get(actorId);
            assert(actor, windowDefinition.windowId + " candidate actor missing.");
            assert(
              actor.orbitClass ===
                windowDefinition.candidateContextOrbitClasses[index],
              windowDefinition.windowId + " candidate orbit class mismatch."
            );
          });
          assert(
            deepEqual(windowDefinition.fallbackContextOrbitClasses, ["geo"]),
            windowDefinition.windowId + " fallback orbit class must be geo."
          );
          windowDefinition.fallbackContextActorIds.forEach((actorId) => {
            const actor = actorMap.get(actorId);
            assert(actor, windowDefinition.windowId + " fallback actor missing.");
            assert(
              actor.orbitClass === "geo",
              windowDefinition.windowId + " fallback actor must be GEO."
            );
          });
          assert(
            config.requiredNonClaimKeys.every(
              (key) => windowDefinition.nonClaims?.[key] === true
            ),
            windowDefinition.windowId + " missing required non-claims."
          );
          assertMetricClassesAreBounded(
            windowDefinition.boundedMetricClasses,
            windowDefinition.windowId
          );
        }

        assert(
          model.validationExpectations.expectedModelId === config.expectedModelId &&
            model.validationExpectations.expectedEndpointPairId ===
              config.expectedEndpointPairId &&
            model.validationExpectations.expectedPrecision ===
              config.expectedPrecision &&
            deepEqual(
              model.validationExpectations.expectedActorCounts,
              config.expectedActorCounts
            ) &&
            model.validationExpectations.runtimeRawItriSideReadAllowed === false &&
            model.validationExpectations.measuredMetricTruthAllowed === false,
          "V4.6D validation expectations changed."
        );
        assert(
          config.requiredNonClaimKeys.every((key) =>
            model.validationExpectations.requiredWindowNonClaimKeys.includes(key)
          ),
          "V4.6D required non-claim key list changed."
        );
        assert(
          model.sourceRead ===
            "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline" &&
            state.sourceLineage.simulationHandoverRead === model.sourceRead &&
            state.sourceLineage.rawPackageSideReadOwnership === "forbidden" &&
            state.sourceLineage.rawSourcePathsIncluded === false,
          "V4.6D runtime source boundary state changed."
        );
        assert(
          forbiddenResourceRequests.length === 0,
          "V4.6D runtime fetched raw itri or live external source resources: " +
            JSON.stringify(forbiddenResourceRequests)
        );
        assert(
          telemetry.m8aV46dSimulationHandoverWindowId === modelWindow.windowId &&
            telemetry.m8aV46dDisplayRepresentativeActorId ===
              modelWindow.displayRepresentativeActorId,
          "V4.6D telemetry does not expose the runtime model window."
        );

        const runtimeLabelsDerivedFromModel = [
          model.modelId,
          model.modelStatus,
          model.modelScope,
          model.modelTruth,
          model.endpointPairId,
          model.acceptedPairPrecision,
          modelWindow.windowId,
          modelWindow.handoverPressureReason,
          modelWindow.displayRepresentativeActorId,
          ...modelWindow.candidateContextActorIds,
          ...modelWindow.fallbackContextActorIds,
          ...modelWindow.reasonSignalClasses,
          ...Object.values(modelWindow.boundedMetricClasses)
        ];
        const cleanForbiddenHits = scanForbiddenClaims(
          {
            model,
            runtimeLabelsDerivedFromModel
          },
          model.forbiddenClaimScan
        );
        assert(
          cleanForbiddenHits.length === 0,
          "V4.6D forbidden-claim scan found clean-model hits: " +
            JSON.stringify(cleanForbiddenHits)
        );
        assert(
          scanForbiddenClaims(
            { servingSatelliteId: "oneweb-0386-leo-display-context" },
            model.forbiddenClaimScan
          ).some((hit) => hit.kind === "forbidden-key"),
          "V4.6D forbidden-claim scan must reject forbidden keys."
        );
        assert(
          scanForbiddenClaims(
            { runtimeLabel: "active serving satellite selected" },
            model.forbiddenClaimScan
          ).some((hit) => hit.kind === "positive-claim-text"),
          "V4.6D forbidden-claim scan must reject positive claim text."
        );

        return {
          modelId: model.modelId,
          endpointPairId: model.endpointPairId,
          precision: model.acceptedPairPrecision,
          activeWindowId: modelWindow.windowId,
          actorCounts: state.orbitActorCounts,
          representativeActorId: modelWindow.displayRepresentativeActorId,
          candidateContextActorIds: modelWindow.candidateContextActorIds,
          fallbackContextActorIds: modelWindow.fallbackContextActorIds,
          forbiddenResourceRequests
        };
      })(${JSON.stringify({
        expectedModelId: EXPECTED_MODEL_ID,
        expectedEndpointPairId: EXPECTED_ENDPOINT_PAIR_ID,
        expectedPrecision: EXPECTED_PRECISION,
        requestPath: REQUEST_PATH,
        endpointIds: EXPECTED_ENDPOINT_IDS,
        actorIds: artifactFacts.actorIds,
        expectedActorCounts: EXPECTED_ACTOR_COUNTS,
        expectedWindowIds: EXPECTED_WINDOW_IDS,
        requiredNonClaimKeys: REQUIRED_NON_CLAIM_KEYS,
        acceptedWindows: [
          {
            windowId: "leo-acquisition-context",
            startRatioInclusive: 0,
            stopRatioExclusive: 0.2,
            displayRepresentativeOrbitClass: "leo",
            displayRepresentativeActorId: "oneweb-0386-leo-display-context",
            candidateContextOrbitClasses: ["leo", "leo", "meo"],
            candidateContextActorIds: [
              "oneweb-0537-leo-display-context",
              "oneweb-0701-leo-display-context",
              "o3b-mpower-f6-meo-display-context"
            ],
            fallbackContextOrbitClasses: ["geo"],
            fallbackContextActorIds: [
              "st-2-geo-continuity-anchor",
              "ses-9-geo-display-context"
            ],
            boundedMetricClasses: {
              metricTruth: "modeled-bounded-class-not-measured",
              latencyClass: "leo-low-latency-context-class",
              jitterClass: "changing-geometry-class",
              networkSpeedClass: "candidate-capacity-context-class",
              continuityClass: "acquisition-context-class"
            },
            nonClaims: Object.fromEntries(
              REQUIRED_NON_CLAIM_KEYS.map((key) => [key, true])
            )
          },
          {
            windowId: "leo-aging-pressure",
            startRatioInclusive: 0.2,
            stopRatioExclusive: 0.4,
            displayRepresentativeOrbitClass: "leo",
            displayRepresentativeActorId: "oneweb-0537-leo-display-context",
            candidateContextOrbitClasses: ["leo", "leo", "meo", "meo"],
            candidateContextActorIds: [
              "oneweb-0012-leo-display-context",
              "oneweb-0249-leo-display-context",
              "o3b-mpower-f1-meo-display-context",
              "o3b-mpower-f2-meo-display-context"
            ],
            fallbackContextOrbitClasses: ["geo"],
            fallbackContextActorIds: [
              "st-2-geo-continuity-anchor",
              "ses-9-geo-display-context"
            ],
            boundedMetricClasses: {
              metricTruth: "modeled-bounded-class-not-measured",
              latencyClass: "leo-low-latency-context-class",
              jitterClass: "changing-geometry-class",
              networkSpeedClass: "candidate-capacity-context-class",
              continuityClass: "pressure-context-class"
            },
            nonClaims: Object.fromEntries(
              REQUIRED_NON_CLAIM_KEYS.map((key) => [key, true])
            )
          },
          {
            windowId: "meo-continuity-hold",
            startRatioInclusive: 0.4,
            stopRatioExclusive: 0.6,
            displayRepresentativeOrbitClass: "meo",
            displayRepresentativeActorId: "o3b-mpower-f6-meo-display-context",
            candidateContextOrbitClasses: ["meo", "meo", "meo", "meo", "leo"],
            candidateContextActorIds: [
              "o3b-mpower-f1-meo-display-context",
              "o3b-mpower-f2-meo-display-context",
              "o3b-mpower-f4-meo-display-context",
              "o3b-mpower-f3-meo-display-context",
              "oneweb-0702-leo-display-context"
            ],
            fallbackContextOrbitClasses: ["geo"],
            fallbackContextActorIds: [
              "st-2-geo-continuity-anchor",
              "ses-9-geo-display-context"
            ],
            boundedMetricClasses: {
              metricTruth: "modeled-bounded-class-not-measured",
              latencyClass: "meo-mid-latency-context-class",
              jitterClass: "continuity-hold-class",
              networkSpeedClass: "continuity-context-class",
              continuityClass: "hold-context-class"
            },
            nonClaims: Object.fromEntries(
              REQUIRED_NON_CLAIM_KEYS.map((key) => [key, true])
            )
          },
          {
            windowId: "leo-reentry-candidate",
            startRatioInclusive: 0.6,
            stopRatioExclusive: 0.82,
            displayRepresentativeOrbitClass: "leo",
            displayRepresentativeActorId: "oneweb-0702-leo-display-context",
            candidateContextOrbitClasses: ["leo", "leo", "leo", "meo"],
            candidateContextActorIds: [
              "oneweb-0012-leo-display-context",
              "oneweb-0249-leo-display-context",
              "oneweb-0386-leo-display-context",
              "o3b-mpower-f4-meo-display-context"
            ],
            fallbackContextOrbitClasses: ["geo"],
            fallbackContextActorIds: [
              "st-2-geo-continuity-anchor",
              "ses-9-geo-display-context"
            ],
            boundedMetricClasses: {
              metricTruth: "modeled-bounded-class-not-measured",
              latencyClass: "leo-low-latency-context-class",
              jitterClass: "changing-geometry-class",
              networkSpeedClass: "candidate-capacity-context-class",
              continuityClass: "reentry-context-class"
            },
            nonClaims: Object.fromEntries(
              REQUIRED_NON_CLAIM_KEYS.map((key) => [key, true])
            )
          },
          {
            windowId: "geo-continuity-guard",
            startRatioInclusive: 0.82,
            stopRatioExclusive: 1,
            displayRepresentativeOrbitClass: "geo",
            displayRepresentativeActorId: "st-2-geo-continuity-anchor",
            candidateContextOrbitClasses: ["geo", "meo", "leo"],
            candidateContextActorIds: [
              "ses-9-geo-display-context",
              "o3b-mpower-f3-meo-display-context",
              "oneweb-0701-leo-display-context"
            ],
            fallbackContextOrbitClasses: ["geo"],
            fallbackContextActorIds: [
              "st-2-geo-continuity-anchor",
              "ses-9-geo-display-context"
            ],
            boundedMetricClasses: {
              metricTruth: "modeled-bounded-class-not-measured",
              latencyClass: "geo-higher-latency-continuity-class",
              jitterClass: "continuity-guard-class",
              networkSpeedClass: "guard-context-class",
              continuityClass: "guard-context-class"
            },
            nonClaims: Object.fromEntries(
              REQUIRED_NON_CLAIM_KEYS.map((key) => [key, true])
            )
          }
        ]
      })})`
    );

    console.log(
      `M8A-V4.6D simulation handover model runtime smoke passed: ${JSON.stringify(
        {
          ...result,
          runtimeProcessFacts: {
            serverPid: serverHandle.server.pid,
            browserPid: browserHandle.browserProcess.pid
          }
        }
      )}`
    );
  } finally {
    if (client) {
      await client.close();
    }

    if (browserHandle) {
      await stopHeadlessBrowser(browserHandle);
    }

    if (serverHandle) {
      await stopStaticServer(serverHandle.server);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
