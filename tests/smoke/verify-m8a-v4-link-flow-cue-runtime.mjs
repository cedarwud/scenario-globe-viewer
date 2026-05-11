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
const outputRoot = path.join(repoRoot, "output/m8a-v4-link-flow-cue");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";

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

        return {
          bootstrapState: document.documentElement.dataset.bootstrapState ?? null,
          scenePreset: document.documentElement.dataset.scenePreset ?? null,
          hasViewer: Boolean(capture?.viewer),
          hasV4Scene: Boolean(state),
          linkFlowCue: state?.relationCues?.dataFlowCueVersion ?? null,
          linkFlowTelemetry: document.documentElement.dataset.m8aV4LinkFlowCue ?? null
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasViewer &&
      lastState?.hasV4Scene &&
      lastState?.linkFlowCue &&
      lastState?.linkFlowTelemetry
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
      const segmentEntities = entities
        .filter((entity) => /^m8a-v4-link-flow-.*-segment$/.test(entity.id))
        .map((entity) => ({
          id: entity.id,
          materialType: entity.polyline?.material?.getType?.(time) ?? null,
          width: readConstantOrProperty(entity.polyline?.width),
          pointCount: entity.polyline?.positions?.getValue?.(time)?.length ?? 0,
          description: readConstantOrProperty(entity.description)
        }))
        .sort((left, right) => left.id.localeCompare(right.id));
      const pulseEntities = entities
        .filter((entity) => /^m8a-v4-link-flow-.*-pulse-\\d+$/.test(entity.id))
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
          description: readConstantOrProperty(entity.description)
        }))
        .sort((left, right) => left.id.localeCompare(right.id));
      const relationMaterialTypes = entities
        .filter((entity) => /^m8a-v46e-simulation-.*-context-ribbon$/.test(entity.id))
        .map((entity) => ({
          id: entity.id,
          materialType: entity.polyline?.material?.getType?.(time) ?? null
        }))
        .sort((left, right) => left.id.localeCompare(right.id));
      const uplinkStart = samplePulseAtRatio(
        "m8a-v4-link-flow-displayRepresentative-uplink-pulse-0",
        0.12
      );
      const uplinkLater = samplePulseAtRatio(
        "m8a-v4-link-flow-displayRepresentative-uplink-pulse-0",
        0.18
      );
      const downlinkStart = samplePulseAtRatio(
        "m8a-v4-link-flow-displayRepresentative-downlink-pulse-0",
        0.12
      );
      const downlinkLater = samplePulseAtRatio(
        "m8a-v4-link-flow-displayRepresentative-downlink-pulse-0",
        0.18
      );

      return {
        stateRelationCues: state?.relationCues ?? null,
        documentTelemetry: {
          m8aV4LinkFlowCue: document.documentElement.dataset.m8aV4LinkFlowCue ?? null,
          m8aV4LinkFlowCueMode:
            document.documentElement.dataset.m8aV4LinkFlowCueMode ?? null,
          m8aV4LinkFlowDirections:
            document.documentElement.dataset.m8aV4LinkFlowDirections ?? null,
          m8aV4LinkFlowPulseCount:
            document.documentElement.dataset.m8aV4LinkFlowPulseCount ?? null,
          m8aV4LinkFlowTruthBoundary:
            document.documentElement.dataset.m8aV4LinkFlowTruthBoundary ?? null
        },
        hudTelemetry: {
          linkFlowCue:
            document.querySelector("[data-m8a-v4-ground-station-scene='true']")
              ?.dataset.linkFlowCue ?? null,
          linkFlowCueMode:
            document.querySelector("[data-m8a-v4-ground-station-scene='true']")
              ?.dataset.linkFlowCueMode ?? null,
          linkFlowDirections:
            document.querySelector("[data-m8a-v4-ground-station-scene='true']")
              ?.dataset.linkFlowDirections ?? null,
          linkFlowPulseCount:
            document.querySelector("[data-m8a-v4-ground-station-scene='true']")
              ?.dataset.linkFlowPulseCount ?? null,
          linkFlowTruthBoundary:
            document.querySelector("[data-m8a-v4-ground-station-scene='true']")
              ?.dataset.linkFlowTruthBoundary ?? null
        },
        segmentEntities,
        pulseEntities,
        relationMaterialTypes,
        motionSamples: {
          uplinkStart,
          uplinkLater,
          downlinkStart,
          downlinkLater
        }
      };
    })()`
  );
}

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function assertMotionChanged(samples, label) {
  assert(samples[0] && samples[1], `${label} pulse samples must exist.`);
  assert(
    distance(samples[0], samples[1]) > 1,
    `${label} pulse must move when replay time changes: ${JSON.stringify(samples)}`
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

    assert(
      inspection.documentTelemetry.m8aV4LinkFlowCue ===
        "m8a-v4-link-flow-direction-cue-runtime.v1",
      `Document telemetry must expose the link-flow cue: ${JSON.stringify(
        inspection.documentTelemetry
      )}`
    );
    assert(
      inspection.documentTelemetry.m8aV4LinkFlowCueMode ===
        "uplink-downlink-arrow-segments-with-moving-packet-trails",
      `Document telemetry must expose the link-flow mode: ${JSON.stringify(
        inspection.documentTelemetry
      )}`
    );
    assert(
      inspection.documentTelemetry.m8aV4LinkFlowDirections === "uplink|downlink",
      `Document telemetry must expose both directions: ${JSON.stringify(
        inspection.documentTelemetry
      )}`
    );
    assert(
      inspection.documentTelemetry.m8aV4LinkFlowPulseCount === "12",
      `Document telemetry must expose all flow pulses: ${JSON.stringify(
        inspection.documentTelemetry
      )}`
    );
    assert(
      inspection.documentTelemetry.m8aV4LinkFlowTruthBoundary ===
        "modeled-direction-cue-not-packet-capture-or-measured-throughput",
      `Document telemetry must preserve truth boundary: ${JSON.stringify(
        inspection.documentTelemetry
      )}`
    );
    assert(
      inspection.hudTelemetry.linkFlowCue ===
        inspection.documentTelemetry.m8aV4LinkFlowCue,
      `Hidden HUD seam must mirror the link-flow cue: ${JSON.stringify(
        inspection.hudTelemetry
      )}`
    );
    assert(
      inspection.segmentEntities.length === 4,
      `Expected 4 directional link-flow segments: ${JSON.stringify(
        inspection.segmentEntities
      )}`
    );
    assert(
      inspection.segmentEntities.every(
        (segment) =>
          segment.materialType === "PolylineArrow" &&
          segment.pointCount === 2 &&
          String(segment.description).includes("not measured throughput")
      ),
      `Every link-flow segment must be a two-point arrow with bounded truth: ${JSON.stringify(
        inspection.segmentEntities
      )}`
    );
    assert(
      inspection.pulseEntities.length === 12,
      `Expected 12 moving link-flow pulses: ${JSON.stringify(
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
          String(pulse.description).includes("modeled-direction-cue")
      ),
      `Every pulse must render as an arrow-packet billboard, not a point: ${JSON.stringify(
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
    assert(
      inspection.relationMaterialTypes.every(
        (relation) => relation.materialType !== "PolylineDash"
      ),
      `Ground-station/satellite relation ribbons should no longer be only dashed: ${JSON.stringify(
        inspection.relationMaterialTypes
      )}`
    );
    assertMotionChanged(
      [
        inspection.motionSamples.uplinkStart,
        inspection.motionSamples.uplinkLater
      ],
      "UPLINK"
    );
    assertMotionChanged(
      [
        inspection.motionSamples.downlinkStart,
        inspection.motionSamples.downlinkLater
      ],
      "DOWNLINK"
    );

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
