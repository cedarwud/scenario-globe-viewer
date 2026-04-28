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

const REQUEST_PATH =
  "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_PROJECTION_ID =
  "m8a-v4.6b-ground-station-runtime-projection.v1";
const EXPECTED_DATA_SOURCE_NAME =
  "m8a-v4-ground-station-multi-orbit-handover-scene";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const ARTIFACT_PATH = path.join(
  repoRoot,
  "public/fixtures/ground-station-projections/m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28.json"
);
const ACCEPTED_V46B_ARTIFACT = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
const EXPECTED_ARTIFACT_ID = ACCEPTED_V46B_ARTIFACT.artifactId;
const EXPECTED_ACTOR_IDS = ACCEPTED_V46B_ARTIFACT.orbitActors.map(
  (actor) => actor.actorId
);
const EXPECTED_ACTOR_COUNTS = ACCEPTED_V46B_ARTIFACT.orbitActors.reduce(
  (counts, actor) => ({
    ...counts,
    [actor.orbitClass]: counts[actor.orbitClass] + 1
  }),
  { leo: 0, meo: 0, geo: 0 }
);
const EXPECTED_ENDPOINT_IDS = [
  "tw-cht-multi-orbit-ground-infrastructure",
  "sg-speedcast-singapore-teleport"
];
const EXPECTED_WINDOW_IDS = [
  "v4-modeled-window-01-leo-to-meo-context",
  "v4-modeled-window-02-meo-continuity-context",
  "v4-modeled-window-03-leo-candidate-aging",
  "v4-modeled-window-04-geo-fallback-continuity"
];
const VIEWPORT = {
  width: 1440,
  height: 900
};

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
          scenePreset: root?.dataset.scenePreset ?? null,
          v4RuntimeState: root?.dataset.m8aV4GroundStationRuntimeState ?? null
        };
      })()`
    );

    if (
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === "regional" &&
      lastState.v4RuntimeState ===
        "active-v4.3-continuous-multi-orbit-handover-scene"
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.3 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A-V4.3 validation did not reach a ready V4 scene: ${JSON.stringify(
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
          width: VIEWPORT.width,
          height: VIEWPORT.height,
          deviceScaleFactor: 1,
          mobile: false
        });

        await navigateAndWait(client, `${baseUrl}${REQUEST_PATH}`);

        const result = await evaluateRuntimeValue(
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
            const parseMs = (value) => {
              const parsed = typeof value === "number" ? value : Date.parse(value);
              assert(Number.isFinite(parsed), "Timestamp must parse.");
              return parsed;
            };
            const distance3 = (left, right) => {
              return Math.hypot(
                left.x - right.x,
                left.y - right.y,
                left.z - right.z
              );
            };
            const radialDistance = (position) =>
              Math.hypot(position.x, position.y, position.z);
            const seekToRatio = async (ratio) => {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              const replayState = capture.replayClock.getState();
              const startMs = parseMs(replayState.startTime);
              const stopMs = parseMs(replayState.stopTime);
              capture.replayClock.seek(
                new Date(startMs + (stopMs - startMs) * ratio).toISOString()
              );
              await sleep(140);
              return capture.m8aV4GroundStationScene.getState();
            };

            for (let attempt = 0; attempt < 160; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              const state =
                capture?.m8aV4GroundStationScene?.getState?.() ?? null;
              const dataSource = state
                ? capture.viewer.dataSources.getByName(state.dataSourceName)[0]
                : null;

              if (
                state?.dataSourceAttached === true &&
                dataSource?.entities?.values?.length >= 11
              ) {
                break;
              }

              await sleep(50);
            }

            await sleep(250);

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing runtime capture seam.");
            assert(
              capture.m8aV4GroundStationScene,
              "V4.3 must expose the ground-station runtime seam."
            );
            assert(
              !capture.firstIntakeOrbitContextActors,
              "V4.3 route must not mount the old V3.5 orbit-context controller."
            );

            const controller = capture.m8aV4GroundStationScene;
            const initialState = controller.getState();
            const dataSource = capture.viewer.dataSources.getByName(
              "${EXPECTED_DATA_SOURCE_NAME}"
            )[0];
            const endpointIds = initialState.endpoints.map(
              (endpoint) => endpoint.endpointId
            );
            const actorIds = initialState.actors.map((actor) => actor.actorId);
            const endpointEntities = ${JSON.stringify(EXPECTED_ENDPOINT_IDS)}
              .map((endpointId) =>
                dataSource?.entities?.getById(\`m8a-v4-endpoint-\${endpointId}\`)
              );
            const actorEntities = ${JSON.stringify(EXPECTED_ACTOR_IDS)}.map(
              (actorId) => dataSource?.entities?.getById(actorId)
            );
            const hud = document.querySelector(
              "[data-m8a-v4-ground-station-scene='true']"
            );
            const visibleText = document.body.innerText;
            const forbiddenPromotedLabels = [
              "SERVING",
              "PENDING",
              "YKA endpoint",
              "aircraft endpoint",
              "handset endpoint",
              "active gateway selected"
            ].filter((word) => visibleText.includes(word));

            assert(
              initialState.projectionId === "${EXPECTED_PROJECTION_ID}" &&
                initialState.projectionSourceAuthority ===
                  "repo-owned-generated-module-from-viewer-owned-artifact" &&
                initialState.generatedFromArtifactId ===
                  "${EXPECTED_ARTIFACT_ID}" &&
                initialState.sourceLineage.projectionRead ===
                  "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION" &&
                initialState.sourceLineage.serviceStateRead ===
                  "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline" &&
                initialState.sourceLineage.rawPackageSideReadOwnership ===
                  "forbidden" &&
                initialState.sourceLineage.rawSourcePathsIncluded === false,
              "V4.3 must consume the repo-owned projection module only: " +
                JSON.stringify(initialState.sourceLineage)
            );
            assert(
              dataSource &&
                initialState.dataSourceName === "${EXPECTED_DATA_SOURCE_NAME}" &&
                initialState.dataSourceAttached === true,
              "V4.3 data source must be attached."
            );
            assert(
              initialState.endpointCount === 2 &&
                JSON.stringify(endpointIds) ===
                  JSON.stringify(${JSON.stringify(EXPECTED_ENDPOINT_IDS)}) &&
                initialState.endpoints.every(
                  (endpoint) =>
                    endpoint.precisionBadge === "operator-family precision" &&
                    endpoint.renderPrecision ===
                      "bounded-operator-family-display-anchor" &&
                    endpoint.displayPositionIsSourceTruth === false &&
                    endpoint.rawSourceCoordinatesRenderable === false &&
                    JSON.stringify(endpoint.orbitEvidenceChips) ===
                      JSON.stringify(["LEO strong", "MEO strong", "GEO strong"])
                ) &&
                endpointEntities.every(Boolean),
              "V4.3 must render two operator-family-only ground endpoints."
            );
            assert(
              initialState.actorCount === ${EXPECTED_ACTOR_IDS.length} &&
                JSON.stringify(initialState.orbitActorCounts) ===
                  JSON.stringify(${JSON.stringify(EXPECTED_ACTOR_COUNTS)}) &&
                JSON.stringify(actorIds) ===
                  JSON.stringify(${JSON.stringify(EXPECTED_ACTOR_IDS)}) &&
                actorEntities.every(Boolean),
              "V4.3/V4.6B route must render the accepted 6 LEO, 5 MEO, and 2 GEO actor set."
            );
            assert(
              initialState.serviceState.truthState === "modeled" &&
                initialState.serviceState.isNativeRfHandover === false &&
                initialState.serviceState.measuredLatency === false &&
                initialState.serviceState.measuredJitter === false &&
                initialState.serviceState.measuredThroughput === false &&
                JSON.stringify(initialState.serviceState.timelineWindowIds) ===
                  JSON.stringify(${JSON.stringify(EXPECTED_WINDOW_IDS)}),
              "V4.3 service state must come from the modeled artifact timeline."
            );
            assert(
              initialState.nonClaims.noYkaEndpoint === true &&
                initialState.nonClaims.noAircraftEndpoint === true &&
                initialState.nonClaims.noOrdinaryHandsetUe === true &&
                initialState.nonClaims.noActiveServingSatelliteIdentity === true &&
                initialState.nonClaims.noActiveGatewayAssignment === true &&
                initialState.nonClaims.noPairSpecificTeleportPathTruth === true &&
                initialState.nonClaims.noMeasuredLatencyJitterThroughputTruth === true &&
                initialState.nonClaims.noNativeRfHandover === true,
              "V4.3 non-claims must remain explicit."
            );
            assert(
              hud instanceof HTMLElement &&
                hud.hidden === true &&
                hud.dataset.m8aV4GroundStationSceneVisibility === "hidden",
              "V4.3 HUD surface must stay mounted for telemetry but hidden from the visual scene."
            );
            assert(
              document.documentElement.dataset.m8aV4GroundStationNonClaims?.includes(
                "noAircraftEndpoint"
              ) &&
                document.documentElement.dataset.m8aV4GroundStationNonClaims?.includes(
                  "noNativeRfHandover"
                ),
              "V4.3 hidden HUD must preserve machine-readable non-claim telemetry."
            );
            assert(
              forbiddenPromotedLabels.length === 0,
              "V4.3 visible scene promoted forbidden labels: " +
                forbiddenPromotedLabels.join(", ")
            );

            const state10 = await seekToRatio(0.1);
            const state20 = await seekToRatio(0.2);
            const state35 = await seekToRatio(0.35);
            const state60 = await seekToRatio(0.6);
            const state85 = await seekToRatio(0.85);
            const movedActors = ["leo", "meo"].flatMap((orbitClass) => {
              const before = state10.actors.filter(
                (actor) => actor.orbitClass === orbitClass
              );
              const after = state20.actors.filter(
                (actor) => actor.orbitClass === orbitClass
              );
              return before.map((actor, index) => ({
                actorId: actor.actorId,
                distanceMeters: distance3(
                  actor.renderPositionEcefMeters,
                  after[index].renderPositionEcefMeters
                )
              }));
            });
            const geoBefore = state10.actors.find(
              (actor) => actor.orbitClass === "geo"
            );
            const geoAfter = state20.actors.find(
              (actor) => actor.orbitClass === "geo"
            );

            assert(
              state10.serviceState.window.windowId ===
                "v4-modeled-window-01-leo-to-meo-context" &&
                state35.serviceState.window.windowId ===
                  "v4-modeled-window-02-meo-continuity-context" &&
                state60.serviceState.window.windowId ===
                  "v4-modeled-window-03-leo-candidate-aging" &&
                state85.serviceState.window.windowId ===
                  "v4-modeled-window-04-geo-fallback-continuity",
              "V4.3 modeled service-state windows must progress by artifact ratios."
            );
            assert(
              movedActors.every((actor) => actor.distanceMeters > 1000),
              "V4.3 LEO/MEO display-context actors must move: " +
                JSON.stringify(movedActors)
            );
            assert(
              geoBefore &&
                geoAfter &&
                distance3(
                  geoBefore.renderPositionEcefMeters,
                  geoAfter.renderPositionEcefMeters
                ) < 1,
              "V4.3 GEO anchor must remain fixed as continuity anchor."
            );
            const geoSourceRadius = radialDistance(
              geoBefore.sourcePositionEcefMeters
            );
            const geoRenderRadius = radialDistance(
              geoBefore.renderPositionEcefMeters
            );
            assert(
              geoSourceRadius > 40000000 &&
                geoRenderRadius > 12400000 &&
                geoRenderRadius < 12800000 &&
                geoSourceRadius - geoRenderRadius > 29000000,
              "V4.3 GEO source altitude must stay high while render height is display-compressed: " +
                JSON.stringify({ geoSourceRadius, geoRenderRadius })
            );

            return {
              projectionId: initialState.projectionId,
              endpoints: endpointIds,
              actors: actorIds,
              serviceWindows: [
                state10.serviceState.window.windowId,
                state35.serviceState.window.windowId,
                state60.serviceState.window.windowId,
                state85.serviceState.window.windowId
              ],
              movedActors,
              geoSourceRadius,
              geoRenderRadius,
              rawPackageSideReadOwnership:
                initialState.sourceLineage.rawPackageSideReadOwnership
            };
          })()`,
          { awaitPromise: true }
        );

        console.log(
          `M8A-V4.3 ground-station runtime smoke passed: ${JSON.stringify(
            result
          )}`
        );
      } finally {
        await client.close();
      }
    } finally {
      await stopHeadlessBrowser(browser);
    }
  } finally {
    await stopStaticServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
