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
const V4_RUNTIME_STATE = "active-v4.3-continuous-multi-orbit-handover-scene";
const EXPECTED_PLAYBACK_MULTIPLIER = 60;
const MAX_SMALL_MARGIN_MS = 10 * 60 * 1000;
const VIEWPORT = {
  width: 1440,
  height: 900
};
const EXPECTED_CURRENT_ACTOR_COUNTS = {
  leo: 6,
  meo: 5,
  geo: 2
};
const REQUIRED_NON_CLAIM_KEYS = [
  "noAircraftEndpoint",
  "noYkaEndpoint",
  "noOrdinaryHandsetUe",
  "noActiveServingSatelliteIdentity",
  "noActiveGatewayAssignment",
  "noPairSpecificTeleportPathTruth",
  "noMeasuredLatencyJitterThroughputTruth",
  "noNativeRfHandover"
];
const FORBIDDEN_CLAIM_PHRASES = [
  "aircraft endpoint",
  "YKA endpoint",
  "handset UE endpoint",
  "active serving satellite",
  "active gateway assignment",
  "active gateway",
  "pair-specific teleport path truth",
  "pair-specific teleport path",
  "measured latency/jitter/throughput truth",
  "measured latency",
  "measured jitter",
  "measured throughput",
  "native RF handover"
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

function parseTleMeanMotionRevPerDay(tleLine2, actorId) {
  const meanMotion = Number(String(tleLine2).slice(52, 63).trim());

  assert(
    Number.isFinite(meanMotion) && meanMotion > 0,
    `Expected positive TLE mean motion for ${actorId}.`
  );

  return meanMotion;
}

function loadProjectionArtifact() {
  return JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
}

function resolveExpectedReplayFacts() {
  const artifact = loadProjectionArtifact();
  const oneWebLeoActors = artifact.orbitActors.filter((actor) => {
    const sourceRecordName = actor.sourceLineage?.[0]?.sourceRecordName ?? "";

    return (
      actor.orbitClass === "leo" &&
      String(actor.operatorContext).toLowerCase().includes("oneweb") &&
      String(sourceRecordName).toLowerCase().startsWith("oneweb-")
    );
  });

  assert(
    oneWebLeoActors.length === EXPECTED_CURRENT_ACTOR_COUNTS.leo,
    `Expected the current V4.6B runtime artifact to expose ${EXPECTED_CURRENT_ACTOR_COUNTS.leo} OneWeb LEO actors, received ${oneWebLeoActors.length}.`
  );

  const oneWebLeoPeriods = oneWebLeoActors.map((actor) => {
    const lineage = actor.sourceLineage[0];
    const meanMotionRevPerDay = parseTleMeanMotionRevPerDay(
      lineage.tleLine2,
      actor.actorId
    );

    return {
      actorId: actor.actorId,
      sourceRecordName: lineage.sourceRecordName,
      meanMotionRevPerDay,
      periodMs: (24 * 60 * 60 * 1000) / meanMotionRevPerDay
    };
  });
  const longestOneWebLeo = oneWebLeoPeriods.reduce((longest, candidate) =>
    candidate.periodMs > longest.periodMs ? candidate : longest
  );
  const orbitActorCounts = artifact.orbitActors.reduce(
    (counts, actor) => ({
      ...counts,
      [actor.orbitClass]: counts[actor.orbitClass] + 1
    }),
    { leo: 0, meo: 0, geo: 0 }
  );

  return {
    endpointIds: artifact.endpoints.map((endpoint) => endpoint.endpointId),
    actorIds: artifact.orbitActors.map((actor) => actor.actorId),
    oneWebLeoActorIds: oneWebLeoActors.map((actor) => actor.actorId),
    orbitActorCounts,
    longestOneWebLeo
  };
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
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === "regional" &&
      lastState.v4RuntimeState === V4_RUNTIME_STATE &&
      lastState.hasV4Seam === true
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.6A validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A-V4.6A validation did not reach a ready V4 scene: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, url) {
  await client.send("Page.navigate", { url });
  await waitForBootstrapReady(client);
}

async function main() {
  const expectedFacts = resolveExpectedReplayFacts();

  assert(
    expectedFacts.endpointIds.length === 2 &&
      expectedFacts.actorIds.length === 13 &&
      JSON.stringify(expectedFacts.orbitActorCounts) ===
        JSON.stringify(EXPECTED_CURRENT_ACTOR_COUNTS),
    `V4.6A replay verification now runs against the accepted V4.6B actor set: ${JSON.stringify(
      expectedFacts
    )}`
  );

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
        await sleep(200);

        const result = await evaluateRuntimeValue(
          client,
          `((config) => {
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
            const isNegated = (text, index) => {
              const prefix = text
                .slice(Math.max(0, index - 120), index)
                .toLowerCase();
              return /\\b(no|not|without|forbidden|must not|does not claim|not claimed|non-claim)\\b/.test(
                prefix
              );
            };
            const collectEntityText = (dataSource) =>
              (dataSource?.entities?.values ?? [])
                .map((entity) => {
                  const description =
                    entity.description?.getValue?.() ??
                    entity.description?._value ??
                    "";
                  return [entity.id, entity.name, String(description)].join(" ");
                })
                .join(" ");
            const collectForbiddenClaimHits = (sources) => {
              const hits = [];

              for (const source of sources) {
                const sourceText = String(source.text ?? "");
                const lowered = sourceText.toLowerCase();

                for (const phrase of config.forbiddenClaimPhrases) {
                  const needle = phrase.toLowerCase();
                  let index = lowered.indexOf(needle);

                  while (index !== -1) {
                    if (!isNegated(sourceText, index)) {
                      hits.push({
                        source: source.label,
                        phrase,
                        context: sourceText
                          .slice(Math.max(0, index - 60), index + phrase.length + 60)
                          .replace(/\\s+/g, " ")
                          .trim()
                      });
                    }

                    index = lowered.indexOf(needle, index + needle.length);
                  }
                }
              }

              return hits;
            };

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing runtime capture seam.");
            assert(
              capture.m8aV4GroundStationScene,
              "V4.6A route must expose the V4 runtime seam."
            );
            assert(
              !capture.firstIntakeOrbitContextActors,
              "V4.6A route must not mount the historical V3.5 controller."
            );

            const controller = capture.m8aV4GroundStationScene;
            const state = controller.getState();
            const replayState = capture.replayClock.getState();
            const dataSource = capture.viewer.dataSources.getByName(
              state.dataSourceName
            )[0];
            const startMs = parseMs(replayState.startTime);
            const stopMs = parseMs(replayState.stopTime);
            const durationMs = stopMs - startMs;
            const expectedMinimumDurationMs =
              config.longestOneWebLeo.periodMs + state.replayWindow.replayMarginMs;
            const endpointIds = state.endpoints.map((endpoint) => endpoint.endpointId);
            const actorIds = state.actors.map((actor) => actor.actorId);
            const runtimeOneWebLeoActorIds = state.actors
              .filter(
                (actor) =>
                  actor.orbitClass === "leo" &&
                  actor.operatorContext.toLowerCase().includes("oneweb")
              )
              .map((actor) => actor.actorId);
            const telemetryNonClaims =
              document.documentElement.dataset.m8aV4GroundStationNonClaims ?? "";
            const forbiddenClaimHits = collectForbiddenClaimHits([
              { label: "visible-text", text: document.body.innerText },
              { label: "v4-entity-text", text: collectEntityText(dataSource) },
              {
                label: "v4-state-labels",
                text: [
                  ...state.endpoints.map((endpoint) => endpoint.label),
                  ...state.actors.map((actor) => actor.actorId),
                  state.serviceState.window.handoverPressureReason
                ].join(" ")
              }
            ]);

            assert(
              replayState.mode === "prerecorded" &&
                replayState.multiplier === config.expectedPlaybackMultiplier &&
                state.replayWindow.playbackMultiplier ===
                  config.expectedPlaybackMultiplier,
              "V4.6A replay must use the current product full-orbit review multiplier: " +
                JSON.stringify({
                  replayState,
                  replayWindow: state.replayWindow
                })
            );
            assert(
              durationMs === state.replayWindow.durationMs &&
                state.replayWindow.startTimeUtc === new Date(startMs).toISOString() &&
                state.replayWindow.stopTimeUtc === new Date(stopMs).toISOString(),
              "V4.6A replay window state must match the live replay clock: " +
                JSON.stringify({ replayState, replayWindow: state.replayWindow })
            );
            assert(
              state.replayWindow.periodSource ===
                "repo-owned-oneweb-tle-mean-motion" &&
                state.replayWindow.longestCurrentOneWebLeoActorId ===
                  config.longestOneWebLeo.actorId &&
                state.replayWindow.longestCurrentOneWebLeoSourceRecordName ===
                  config.longestOneWebLeo.sourceRecordName &&
                Math.abs(
                  state.replayWindow.longestCurrentOneWebLeoMeanMotionRevPerDay -
                    config.longestOneWebLeo.meanMotionRevPerDay
                ) < 1e-10 &&
                Math.abs(
                  state.replayWindow.longestCurrentOneWebLeoPeriodMs -
                    config.longestOneWebLeo.periodMs
                ) < 1,
              "V4.6A must derive the longest current OneWeb LEO period from repo-owned TLE mean motion: " +
                JSON.stringify({
                  expected: config.longestOneWebLeo,
                  replayWindow: state.replayWindow
                })
            );
            assert(
              state.replayWindow.replayMarginMs > 0 &&
                state.replayWindow.replayMarginMs <= config.maxSmallMarginMs &&
                durationMs >= expectedMinimumDurationMs &&
                durationMs === Math.ceil(expectedMinimumDurationMs),
              "V4.6A replay stop must cover the longest current OneWeb LEO period plus a small margin: " +
                JSON.stringify({
                  durationMs,
                  expectedMinimumDurationMs,
                  replayWindow: state.replayWindow
                })
            );
            assert(
              state.endpointCount === 2 &&
                JSON.stringify(endpointIds) === JSON.stringify(config.endpointIds),
              "V4.6A must keep the accepted Taiwan/CHT + Speedcast Singapore endpoint pair unchanged: " +
                JSON.stringify({ endpointIds })
            );
            assert(
              state.actorCount === config.actorIds.length &&
                JSON.stringify(state.orbitActorCounts) ===
                  JSON.stringify(config.orbitActorCounts) &&
                JSON.stringify(actorIds) === JSON.stringify(config.actorIds) &&
                JSON.stringify(runtimeOneWebLeoActorIds) ===
                  JSON.stringify(config.oneWebLeoActorIds),
              "V4.6A replay behavior must operate on the current V4.6B orbit actor set: " +
                JSON.stringify({
                  actorIds,
                  runtimeOneWebLeoActorIds,
                  counts: state.orbitActorCounts
                })
            );
            assert(
              state.sourceLineage.projectionRead ===
                "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION" &&
                state.sourceLineage.serviceStateRead ===
                  "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline" &&
                state.sourceLineage.rawPackageSideReadOwnership === "forbidden" &&
                state.sourceLineage.rawSourcePathsIncluded === false,
              "V4.6A runtime must consume only the repo-owned projection module: " +
                JSON.stringify(state.sourceLineage)
            );
            assert(
              config.requiredNonClaimKeys.every((key) =>
                telemetryNonClaims.includes('"' + key + '":true')
              ) &&
                state.nonClaims.noActiveServingSatelliteIdentity === true &&
                state.nonClaims.noActiveGatewayAssignment === true &&
                state.nonClaims.noPairSpecificTeleportPathTruth === true &&
                state.nonClaims.noMeasuredLatencyJitterThroughputTruth === true &&
                state.nonClaims.noNativeRfHandover === true,
              "V4.6A must preserve machine-readable forbidden-claim non-claims: " +
                JSON.stringify({ telemetryNonClaims, nonClaims: state.nonClaims })
            );
            assert(
              forbiddenClaimHits.length === 0,
              "V4.6A forbidden-claim scan found promoted claim text: " +
                JSON.stringify(forbiddenClaimHits)
            );

            return {
              durationMs,
              playbackMultiplier: replayState.multiplier,
              longestOneWebLeo: state.replayWindow.longestCurrentOneWebLeoActorId,
              longestOneWebLeoPeriodMinutes:
                state.replayWindow.longestCurrentOneWebLeoPeriodMs / 60000,
              replayMarginMinutes: state.replayWindow.replayMarginMs / 60000,
              endpointIds,
              actorIds,
              rawPackageSideReadOwnership:
                state.sourceLineage.rawPackageSideReadOwnership
            };
          })(${JSON.stringify({
            ...expectedFacts,
            expectedPlaybackMultiplier: EXPECTED_PLAYBACK_MULTIPLIER,
            maxSmallMarginMs: MAX_SMALL_MARGIN_MS,
            requiredNonClaimKeys: REQUIRED_NON_CLAIM_KEYS,
            forbiddenClaimPhrases: FORBIDDEN_CLAIM_PHRASES
          })})`
        );

        console.log(
          `M8A-V4.6A full LEO orbit replay smoke passed: ${JSON.stringify(
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
