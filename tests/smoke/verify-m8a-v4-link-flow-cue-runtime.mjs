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
import { SELECTED_PAIR_DEMO_REQUEST_PATH } from "../../scripts/helpers/demo-routes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const outputRoot = path.join(repoRoot, "output/m8a-v4-link-flow-cue");

const REQUEST_PATH = SELECTED_PAIR_DEMO_REQUEST_PATH;
const EXPECTED_LINK_FLOW_SEGMENT_COUNT = 2;
const EXPECTED_LINK_FLOW_PULSE_COUNT = 6;
const EXPECTED_LINK_FLOW_CUE_COUNT =
  EXPECTED_LINK_FLOW_SEGMENT_COUNT + EXPECTED_LINK_FLOW_PULSE_COUNT;

const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

async function waitForLinkFlowReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const state = capture?.m8aV4GroundStationScene?.getState?.();
        const dataSource = state
          ? capture?.viewer?.dataSources?.getByName?.(state.dataSourceName)?.[0]
          : null;
        const selectedPairEntityCount = (dataSource?.entities?.values ?? [])
          .filter((entity) => String(entity.id).startsWith("m8a-v4-selected-pair-link-flow-"))
          .length;

        return {
          bootstrapState: document.documentElement.dataset.bootstrapState ?? null,
          scenePreset: document.documentElement.dataset.scenePreset ?? null,
          hasViewer: Boolean(capture?.viewer),
          hasV4Scene: Boolean(state),
          sceneSourceMode: state?.sceneSourceMode ?? null,
          selectedPairOverlayStatus: state?.selectedPairOverlay?.status ?? null,
          runtimeLinkVisible: state?.selectedPairOverlay?.runtimeLinkVisible ?? null,
          linkFlowCueCount: state?.selectedPairOverlay?.linkFlowCueCount ?? null,
          selectedPairEntityCount
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasViewer &&
      lastState?.hasV4Scene &&
      lastState?.sceneSourceMode === "tle-first-runtime" &&
      lastState?.selectedPairOverlayStatus === "ready" &&
      lastState?.runtimeLinkVisible === true &&
      lastState?.linkFlowCueCount === EXPECTED_LINK_FLOW_CUE_COUNT &&
      lastState?.selectedPairEntityCount === EXPECTED_LINK_FLOW_CUE_COUNT
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`Link-flow route did not become ready: ${JSON.stringify(lastState)}`);
}

async function inspectLinkFlowCue(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const viewer = capture?.viewer;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const dataSource = viewer?.dataSources?.getByName?.(state?.dataSourceName)?.[0];
      const entities = dataSource?.entities?.values ?? [];
      const time = viewer?.clock?.currentTime;
      const readConstantOrProperty = (property) => {
        if (!property) {
          return null;
        }

        if (typeof property.getValue === "function") {
          return property.getValue(time);
        }

        return property;
      };
      const toPlainPosition = (position) => {
        if (!position) {
          return null;
        }

        return {
          x: Number(position.x.toFixed(3)),
          y: Number(position.y.toFixed(3)),
          z: Number(position.z.toFixed(3))
        };
      };
      const samplePulseAtRatio = (entityId, ratio) => {
        const replayClock = capture?.replayClock;
        const replayState = replayClock?.getState?.();
        const startMs = Date.parse(replayState.startTime);
        const stopMs = Date.parse(replayState.stopTime);
        const targetMs = startMs + (stopMs - startMs) * ratio;

        replayClock.pause();
        replayClock.seek(new Date(targetMs).toISOString());

        const sampleTime = viewer.clock.currentTime;
        const entity = dataSource?.entities?.getById?.(entityId);
        const position = entity?.position?.getValue?.(sampleTime);

        return toPlainPosition(position);
      };
      const distance = (left, right) => {
        if (!left || !right) {
          return 0;
        }
        return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
      };
      const samplePulseMotion = (entityId) => {
        const samples = [];
        for (let index = 0; index <= 50; index += 1) {
          const ratio = index / 50;
          const position = samplePulseAtRatio(entityId, ratio);
          if (position) {
            samples.push({ ratio, position });
          }
        }

        let best = null;
        for (let leftIndex = 0; leftIndex < samples.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < samples.length; rightIndex += 1) {
            const movedMeters = distance(
              samples[leftIndex].position,
              samples[rightIndex].position
            );
            if (!best || movedMeters > best.movedMeters) {
              best = {
                fromRatio: samples[leftIndex].ratio,
                toRatio: samples[rightIndex].ratio,
                from: samples[leftIndex].position,
                to: samples[rightIndex].position,
                movedMeters
              };
            }
          }
        }

        return {
          sampledCount: samples.length,
          best
        };
      };
      const segmentEntities = entities
        .filter((entity) => /^m8a-v4-selected-pair-link-flow-.*-segment$/.test(entity.id))
        .map((entity) => ({
          id: entity.id,
          materialType: entity.polyline?.material?.getType?.(time) ?? null,
          width: readConstantOrProperty(entity.polyline?.width),
          pointCount: entity.polyline?.positions?.getValue?.(time)?.length ?? 0,
          description: readConstantOrProperty(entity.description),
          show: readConstantOrProperty(entity.polyline?.show)
        }))
        .sort((left, right) => left.id.localeCompare(right.id));
      const pulseEntities = entities
        .filter((entity) => /^m8a-v4-selected-pair-link-flow-.*-pulse-\\d+$/.test(entity.id))
        .map((entity) => ({
          id: entity.id,
          hasBillboard: Boolean(entity.billboard),
          hasPoint: Boolean(entity.point),
          image: readConstantOrProperty(entity.billboard?.image),
          label: readConstantOrProperty(entity.label?.text),
          rotation: readConstantOrProperty(entity.billboard?.rotation),
          alignedAxis: readConstantOrProperty(entity.billboard?.alignedAxis),
          width: readConstantOrProperty(entity.billboard?.width),
          height: readConstantOrProperty(entity.billboard?.height),
          description: readConstantOrProperty(entity.description),
          show: readConstantOrProperty(entity.billboard?.show)
        }))
        .sort((left, right) => left.id.localeCompare(right.id));
      const selectedPairOverlay = state?.selectedPairOverlay ?? null;
      const displayOnlyNonClaims = selectedPairOverlay?.dataCompleteness
        ?.displayTransforms
        ?.map((transform) => transform.nonClaim)
        ?.filter(Boolean) ?? [];

      return {
        route: window.location.search,
        sceneSourceMode: state?.sceneSourceMode ?? null,
        selectedPairOverlay,
        displayOnlyNonClaims,
        segmentEntities,
        pulseEntities,
        motionSamples: {
          uplink: samplePulseMotion("m8a-v4-selected-pair-link-flow-uplink-pulse-0"),
          downlink: samplePulseMotion("m8a-v4-selected-pair-link-flow-downlink-pulse-0")
        }
      };
    })()`
  );
}

function assertMotionChanged(sample, label) {
  assert(sample?.sampledCount > 0, `${label} pulse must produce samples.`);
  assert(
    sample.best?.movedMeters > 1,
    `${label} pulse must move when replay time changes: ${JSON.stringify(sample)}`
  );
}

async function main() {
  ensureOutputRoot(outputRoot);

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    await client.send("Page.navigate", {
      url: `${baseUrl}${REQUEST_PATH}`
    });
    await waitForLinkFlowReady(client);
    await waitForGlobeReady(client, "M8A V4 link-flow cue runtime");
    await sleep(500);

    const inspection = await inspectLinkFlowCue(client);

    writeJsonArtifact(outputRoot, `${VIEWPORT_DESKTOP.name}-inspection.json`, inspection);

    assert(inspection.sceneSourceMode === "tle-first-runtime", "Selected-pair route must use TLE-first runtime scene mode.");
    assert(
        inspection.selectedPairOverlay?.status === "ready" &&
        inspection.selectedPairOverlay?.sourceMode === "tle-first-runtime" &&
        inspection.selectedPairOverlay?.runtimeLinkVisible === true &&
        inspection.selectedPairOverlay?.linkFlowCueCount === EXPECTED_LINK_FLOW_CUE_COUNT,
      `Selected-pair overlay must expose runtime link-flow readiness: ${JSON.stringify(
        inspection.selectedPairOverlay
      )}`
    );
    assert(
      inspection.displayOnlyNonClaims.some((nonClaim) =>
        String(nonClaim).includes("Display lane or label offset only")
      ),
      `Selected-pair display transforms must preserve display-only non-claim: ${JSON.stringify(
        inspection.displayOnlyNonClaims
      )}`
    );
    assert(
      inspection.segmentEntities.length === EXPECTED_LINK_FLOW_SEGMENT_COUNT,
      `Expected ${EXPECTED_LINK_FLOW_SEGMENT_COUNT} selected-pair directional link-flow segments: ${JSON.stringify(
        inspection.segmentEntities
      )}`
    );
    assert(
      inspection.segmentEntities.every(
        (segment) =>
          segment.materialType === "PolylineArrow" &&
          segment.pointCount === 2 &&
          String(segment.description).includes("Selected-pair") &&
          String(segment.description).includes("flow cue")
      ),
      `Every selected-pair link-flow segment must be a two-point flow cue: ${JSON.stringify(
        inspection.segmentEntities
      )}`
    );
    assert(
      inspection.pulseEntities.length === EXPECTED_LINK_FLOW_PULSE_COUNT,
      `Expected ${EXPECTED_LINK_FLOW_PULSE_COUNT} moving link-flow pulses: ${JSON.stringify(
        inspection.pulseEntities
      )}`
    );
    assert(
      inspection.pulseEntities.every(
        (pulse) =>
          pulse.hasBillboard &&
          !pulse.hasPoint &&
          String(pulse.image).startsWith("data:image/svg+xml") &&
          Number.isFinite(Number(pulse.rotation)) &&
          pulse.alignedAxis?.x === 0 &&
          pulse.alignedAxis?.y === 0 &&
          pulse.alignedAxis?.z === 0 &&
          Number(pulse.width) >= 28 &&
          Number(pulse.height) >= 13 &&
          String(pulse.description).includes("display cue only")
      ),
      `Every selected-pair pulse must render as a display-only arrow-packet billboard: ${JSON.stringify(
        inspection.pulseEntities
      )}`
    );
    assert(
      inspection.pulseEntities.some((pulse) => pulse.label === "UPLINK") &&
        inspection.pulseEntities.some((pulse) => pulse.label === "DOWNLINK"),
      `Primary flow labels must expose UPLINK and DOWNLINK: ${JSON.stringify(
        inspection.pulseEntities
      )}`
    );
    assertMotionChanged(inspection.motionSamples.uplink, "UPLINK");
    assertMotionChanged(inspection.motionSamples.downlink, "DOWNLINK");

    const screenshot = await captureScreenshot(
      client,
      outputRoot,
      `${VIEWPORT_DESKTOP.name}.png`
    );
    assertScreenshot(screenshot);
  });

  console.log(`M8A V4 link-flow cue runtime validated. Output: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
