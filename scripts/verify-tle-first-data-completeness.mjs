#!/usr/bin/env node
// D6 gate for selected-pair TLE-first data-completeness metadata.
//
// Usage:
//   node scripts/verify-tle-first-data-completeness.mjs [--port=9712]

import { spawn } from "node:child_process";
import { createConnection } from "node:net";

import {
  connectCdp,
  evaluateRuntimeValue,
  findHeadlessBrowser,
  resolvePageWebSocketUrl,
  startHeadlessBrowser,
  stopHeadlessBrowser
} from "../tests/smoke/bootstrap-smoke-browser.mjs";

const DEFAULT_SERVER_PORT = 5173;
const VIEWPORT = { width: 1440, height: 900 };
const READY_TIMEOUT_MS = 30_000;
const RUNTIME_MODE = "tle-first-runtime";
const FIXTURE_MODE = "fixture-fallback";
const DEBUG_SERVER_PROBE = process.env.SGV_DEBUG_SERVER_PROBE === "1";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const splitAt = arg.indexOf("=");
    if (splitAt < 0) {
      return [arg.replace(/^--/, ""), ""];
    }
    return [arg.slice(0, splitAt).replace(/^--/, ""), arg.slice(splitAt + 1)];
  })
);

const serverPort = Number.parseInt(args.port ?? `${DEFAULT_SERVER_PORT}`, 10);
if (!Number.isInteger(serverPort) || serverPort <= 0) {
  throw new Error(`Invalid --port value: ${args.port}`);
}

const baseUrl = `http://127.0.0.1:${serverPort}`;

const readyCase = {
  label: "Svalbard / Tromso ready pair",
  stationA: "ksat-svalsat-svalbard",
  stationB: "ksat-tromso",
  expectedStatus: "ready",
  expectedRuntimeLinkVisible: true
};

const emptyCase = {
  label: "Svalbard / TrollSat zero-window pair",
  stationA: "ksat-svalsat-svalbard",
  stationB: "ksat-trollsat-antarctica",
  expectedStatus: "empty",
  expectedRuntimeLinkVisible: false,
  expectedEmptyReasonCode: "no-pair-intersection"
};

const fixedDemoCase = {
  label: "Fixed demo fixture fallback route",
  searchParams: {
    scenePreset: "regional",
    m8aV4GroundStationScene: "1"
  }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerReachable() {
  return await new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port: serverPort }, () => {
      if (DEBUG_SERVER_PROBE) {
        console.error(`server probe ${serverPort}: connect`);
      }
      socket.end();
      resolve(true);
    });
    socket.setTimeout(1500, () => {
      if (DEBUG_SERVER_PROBE) {
        console.error(`server probe ${serverPort}: timeout`);
      }
      socket.destroy();
      resolve(false);
    });
    socket.on("error", (error) => {
      if (DEBUG_SERVER_PROBE) {
        console.error(`server probe ${serverPort}: ${error.message}`);
      }
      resolve(false);
    });
  });
}

async function startServerIfNeeded() {
  if (await isServerReachable()) {
    return null;
  }
  const server = spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", `${serverPort}`, "--strictPort"],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  let serverLog = "";
  server.stdout.on("data", (chunk) => {
    serverLog += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverLog += chunk.toString();
  });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    if (await isServerReachable()) {
      return server;
    }
    if (server.exitCode !== null) {
      if (await isServerReachable()) {
        return null;
      }
      throw new Error(`Vite server exited early for ${baseUrl}. Output: ${serverLog}`);
    }
    await sleep(250);
  }
  server.kill("SIGTERM");
  throw new Error(`Timed out waiting for Vite server on ${baseUrl}. Output: ${serverLog}`);
}

async function stopServer(server) {
  if (!server || server.killed) {
    return;
  }
  let exited = false;
  await new Promise((resolve) => {
    server.once("exit", () => {
      exited = true;
      resolve();
    });
    server.kill("SIGTERM");
    setTimeout(resolve, 1500);
  });
  if (!exited && !server.killed) {
    server.kill("SIGKILL");
  }
}

function buildSelectedPairUrl(testCase) {
  const url = new URL(baseUrl);
  url.searchParams.set("stationA", testCase.stationA);
  url.searchParams.set("stationB", testCase.stationB);
  url.searchParams.set("startUtc", "2026-05-17T00:00:00.000Z");
  url.searchParams.set("durationMinutes", "360");
  return url.href;
}

function buildFixedDemoUrl(testCase) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(testCase.searchParams)) {
    url.searchParams.set(key, value);
  }
  return url.href;
}

function csvCellValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r" || char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function parseCsvSections(text) {
  const sections = new Map();
  let currentSection = null;
  for (const row of parseCsvRows(text)) {
    if (row.length === 0 || row.every((cell) => cell === "")) {
      continue;
    }
    if (row[0]?.startsWith("# ")) {
      currentSection = { header: null, rows: [] };
      sections.set(row[0], currentSection);
      continue;
    }
    if (!currentSection) {
      continue;
    }
    if (!currentSection.header) {
      currentSection.header = row;
      continue;
    }
    const record = {};
    currentSection.header.forEach((key, index) => {
      record[key] = row[index] ?? "";
    });
    currentSection.rows.push(record);
  }
  return sections;
}

function requireCsvSection(sections, sectionName, label) {
  const section = sections.get(sectionName);
  assert(section, `${label}: CSV missing ${sectionName}`);
  return section;
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  await sleep(500);
  await evaluateRuntimeValue(
    client,
    `(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      for (let attempt = 0; attempt < 200; attempt += 1) {
        if (document.readyState === "complete") {
          return true;
        }
        await sleep(50);
      }
      return false;
    })()`,
    { awaitPromise: true }
  );
}

async function readSelectedPairState(client, terminalStatuses = ["ready", "empty", "error"]) {
  const serializedTerminalStatuses = JSON.stringify(terminalStatuses);
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const terminalStatuses = new Set(${serializedTerminalStatuses});
      let last = null;
      const startedAt = Date.now();
      while (Date.now() - startedAt < ${READY_TIMEOUT_MS}) {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const controller = capture?.m8aV4GroundStationScene;
        const state = controller?.getState?.();
        const overlay = state?.selectedPairOverlay ?? null;
        const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
        const footer = document.querySelector('[data-station-precision-disclosure="true"]');
        const chip = document.querySelector('[data-tle-telemetry-chip="true"]');
        last = {
          hasCapture: Boolean(capture),
          hasController: Boolean(controller),
          sceneSourceMode: state?.sceneSourceMode ?? null,
          overlay,
          panel: panel
            ? {
                state: panel.dataset.state ?? null,
                routeMode: panel.dataset.dataCompletenessRouteMode ?? null,
                emptyReasonCode: panel.dataset.emptyReasonCode ?? null
              }
            : null,
          footer: footer ? { ...footer.dataset } : null,
          chip: chip ? { ...chip.dataset } : null
        };
        const panelHasDataCompleteness =
          !panel || Boolean(panel.dataset.dataCompletenessRouteMode);
        if (overlay && terminalStatuses.has(overlay.status) && panelHasDataCompleteness) {
          return last;
        }
        await sleep(100);
      }
      return last;
    })()`,
    { awaitPromise: true }
  );
}

async function readCsvEvidence(client, testCase) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const rt = await import("/src/features/multi-station-selector/runtime-projection.ts");
      const csv = await import("/src/features/multi-station-selector/runtime-projection-csv.ts");
      const tier = await import("/src/features/multi-station-selector/tier-inference.ts");
      const sources = await rt.loadDefaultTleSources();
      const tleRecords = rt.parseRuntimeTleSources(sources);
      const tleParseStats = rt.buildRuntimeTleSourceParseStats(sources);
      const stationA = tier.PUBLIC_REGISTRY_BY_ID.get(${JSON.stringify(testCase.stationA)});
      const stationB = tier.PUBLIC_REGISTRY_BY_ID.get(${JSON.stringify(testCase.stationB)});
      const result = rt.computeRuntimeProjection({
        stationA,
        stationB,
        timeWindow: {
          startUtc: "2026-05-17T00:00:00.000Z",
          endUtc: "2026-05-17T06:00:00.000Z"
        },
        tleRecords,
        tleParseStats,
        rainRateMmPerHour: 0
      });
      const text = csv.buildRuntimeProjectionCsv(result);
      const defaultWindow = rt.buildDefaultTimeWindow("2026-05-17T00:00:00.000Z");
      return {
        text,
        dataCompleteness: result.dataCompleteness,
        visibilityWindowCount: result.visibilityWindows.length,
        defaultWindowDurationMinutes:
          (Date.parse(defaultWindow.endUtc) - Date.parse(defaultWindow.startUtc)) / 60000
      };
    })()`,
    { awaitPromise: true }
  );
}

async function readMissingSourceEvidence(client, testCase) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const rt = await import("/src/features/multi-station-selector/runtime-projection.ts");
      const tier = await import("/src/features/multi-station-selector/tier-inference.ts");
      const stationA = tier.PUBLIC_REGISTRY_BY_ID.get(${JSON.stringify(testCase.stationA)});
      const stationB = tier.PUBLIC_REGISTRY_BY_ID.get(${JSON.stringify(testCase.stationB)});
      const missingSourcePaths = {
        LEO: "missing:leo",
        MEO: "unsupported:meo",
        GEO: "missing:geo"
      };
      const result = rt.computeRuntimeProjection({
        stationA,
        stationB,
        timeWindow: {
          startUtc: "2026-05-17T00:00:00.000Z",
          endUtc: "2026-05-17T06:00:00.000Z"
        },
        tleRecords: [],
        tleParseStats: [
          { sourceId: "tle:leo", sourcePath: "missing:leo", orbitClass: "LEO", rawRecordGroupCount: 0, parsedRecordCount: 0, parserFailureCount: 0 },
          { sourceId: "tle:meo", sourcePath: "unsupported:meo", orbitClass: "MEO", rawRecordGroupCount: 0, parsedRecordCount: 0, parserFailureCount: 0 },
          { sourceId: "tle:geo", sourcePath: "missing:geo", orbitClass: "GEO", rawRecordGroupCount: 0, parsedRecordCount: 0, parserFailureCount: 0 }
        ],
        sourcePaths: missingSourcePaths,
        rainRateMmPerHour: 0
      });
      return {
        emptyReasonCode: result.dataCompleteness.emptyReasonCode,
        fakeActorCount: result.dataCompleteness.actorSourceCoverage.fakeActorCount,
        sourceCount: result.dataCompleteness.tleSources.length,
        sources: result.dataCompleteness.tleSources.map((source) => ({
          orbitClass: source.orbitClass,
          sourcePath: source.sourcePath,
          parserFailureCount: source.parserFailureCount,
          health: source.health
        }))
      };
    })()`,
    { awaitPromise: true }
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectedSourceHealth(source, referenceUtc) {
  const sourceMs = Date.parse(source.sourceTimestampUtc);
  const epochMs = Date.parse(source.epochEndUtc);
  const referenceMs = Date.parse(referenceUtc);
  if (!Number.isFinite(referenceMs) || (!Number.isFinite(sourceMs) && !Number.isFinite(epochMs))) {
    return "unknown-age";
  }
  const anchorMs = Math.max(
    Number.isFinite(sourceMs) ? sourceMs : Number.NEGATIVE_INFINITY,
    Number.isFinite(epochMs) ? epochMs : Number.NEGATIVE_INFINITY
  );
  const ageDays = Math.max(0, (referenceMs - anchorMs) / 86400000);
  return ageDays <= source.healthThresholdDays ? "fresh" : "stale";
}

function assertDataCompletenessShape(label, state) {
  assert(state?.hasCapture, `${label}: missing capture seam`);
  assert(state?.hasController, `${label}: missing controller`);
  const overlay = state.overlay;
  const data = overlay?.dataCompleteness;
  assert(data, `${label}: missing dataCompleteness debug payload`);
  assert(data.routeMode === RUNTIME_MODE, `${label}: wrong routeMode ${data.routeMode}`);
  assert(data.actorSourceCoverage?.fakeActorCount === 0, `${label}: fake actor count is not zero`);
  assert(Array.isArray(data.tleSources) && data.tleSources.length === 3, `${label}: expected 3 TLE sources`);
  assert(
    data.tleSources.every((source) => source.health && source.sourceTimestampUtc),
    `${label}: source health/timestamp missing`
  );
  const thresholdByOrbit = { LEO: 14, MEO: 30, GEO: 30 };
  for (const source of data.tleSources) {
    assert(
      source.healthThresholdDays === thresholdByOrbit[source.orbitClass],
      `${label}: ${source.orbitClass} freshness threshold mismatch`
    );
    assert(source.epochEndUtc, `${label}: ${source.orbitClass} epoch end missing`);
    assert(
      source.health === expectedSourceHealth(source, "2026-05-17T00:00:00.000Z"),
      `${label}: ${source.orbitClass} health not based on max source/epoch date`
    );
    assert(
      Number.isInteger(source.sgp4ErrorCount) && source.sgp4ErrorCount >= 0,
      `${label}: ${source.orbitClass} SGP4 error count missing`
    );
    assert(
      Array.isArray(source.noradIdRangeSummary) && source.noradIdRangeSummary.length > 0,
      `${label}: ${source.orbitClass} NORAD range summary missing`
    );
    assert(
      Number.isInteger(source.cosparDesignatorCount) &&
        source.cosparDesignatorCount > 0 &&
        Array.isArray(source.cosparDesignatorSamples) &&
        source.cosparDesignatorSamples.length > 0,
      `${label}: ${source.orbitClass} COSPAR exposure missing`
    );
    assert(
      source.classificationCounts && Object.keys(source.classificationCounts).length > 0,
      `${label}: ${source.orbitClass} classification counts missing`
    );
    assert(
      source.dragTermFieldCoverage?.meanMotionFirstDerivativeCount > 0 &&
        source.dragTermFieldCoverage?.meanMotionSecondDerivativeCount > 0 &&
        source.dragTermFieldCoverage?.bstarDragTermCount > 0,
      `${label}: ${source.orbitClass} drag-term coverage missing`
    );
  }
  assert(
    data.visibilityCadenceSecondsByOrbit?.LEO === 30 &&
      data.visibilityCadenceSecondsByOrbit?.MEO === 60 &&
      data.visibilityCadenceSecondsByOrbit?.GEO === 120,
    `${label}: per-orbit visibility cadence mismatch`
  );
  assert(
    Array.isArray(data.stationPrecision) && data.stationPrecision.length === 2,
    `${label}: station precision payload missing`
  );
  assert(
    data.stationPrecision.every((station) => station.stationId && station.disclosurePrecision),
    `${label}: station precision row incomplete`
  );
  assert(
    Array.isArray(data.actorProvenance),
    `${label}: actor provenance payload missing`
  );
  if (data.actorSourceCoverage.renderedActorCount > 0) {
    assert(
      data.actorProvenance.length === data.actorSourceCoverage.renderedActorCount,
      `${label}: actor provenance count mismatch`
    );
    assert(
      data.actorProvenance.every(
        (actor) =>
          actor.satelliteId &&
          actor.sourceId &&
          actor.propagatedSampleCount > 0 &&
          actor.sampleCadenceSeconds > 0 &&
          actor.firstPropagatedUtc &&
          actor.lastPropagatedUtc
      ),
      `${label}: actor provenance row incomplete`
    );
    assert(
      data.actorProvenance.every(
        (actor) =>
          actor.sampleCadenceSeconds ===
          data.visibilityCadenceSecondsByOrbit[actor.orbitClass]
      ),
      `${label}: actor sample cadence does not match orbit cadence`
    );
  }
  assert(
    Array.isArray(data.visibilityProvenance),
    `${label}: visibility provenance payload missing`
  );
  if (data.visibilityProvenance.length > 0) {
    assert(
      data.visibilityProvenance.every(
        (row) =>
          row.satelliteId &&
          row.sourceId &&
          row.stationAWindowSource &&
          row.stationBWindowSource &&
          row.pairIntersectionSource &&
          row.sampleCadenceSeconds > 0
      ),
      `${label}: visibility provenance row incomplete`
    );
    assert(
      data.visibilityProvenance.every(
        (row) =>
          row.sampleCadenceSeconds ===
          data.visibilityCadenceSecondsByOrbit[row.orbitClass]
      ),
      `${label}: visibility sample cadence does not match orbit cadence`
    );
  }
  const outputKinds = new Set(data.modeledOutputs?.map((output) => output.kind));
  for (const kind of ["handover", "link-budget", "throughput", "jitter", "latency", "rain-impact"]) {
    assert(outputKinds.has(kind), `${label}: missing modeled output ${kind}`);
  }
  assert(
    data.modeledOutputs.every(
      (output) =>
        output.modelId &&
        output.inputSummary &&
        output.outputUnit !== undefined &&
        output.nonClaim
    ),
    `${label}: modeled output metadata incomplete`
  );
  const modeledInputSummaries = new Set(
    data.modeledOutputs.map((output) => JSON.stringify(output.inputSummary))
  );
  assert(
    modeledInputSummaries.size === data.modeledOutputs.length,
    `${label}: modeled output inputSummary objects are not per-output`
  );
  const transformIds = new Set(data.displayTransforms?.map((entry) => entry.sourceId));
  for (const sourceId of [
    "selected-pair-scene-altitude-compression",
    "selected-pair-scene-camera-framing",
    "selected-pair-scene-label-density",
    "selected-pair-scene-display-lane-offset",
    "selected-pair-scene-generic-actor-mesh"
  ]) {
    assert(transformIds.has(sourceId), `${label}: missing display transform ${sourceId}`);
  }
  const transformById = new Map(data.displayTransforms.map((entry) => [entry.sourceId, entry]));
  assert(
    transformById.get("selected-pair-scene-camera-framing")?.inputSummary?.pairGeometry ===
      state.overlay.pairGeometry,
    `${label}: camera hint not reflected in display transform payload`
  );
  assert(
    Number(transformById.get("selected-pair-scene-altitude-compression")?.inputSummary?.factor) > 0,
    `${label}: altitude compression transform missing dynamic factor`
  );
  assert(
    Number(transformById.get("selected-pair-scene-label-density")?.inputSummary?.maxVisibleActorLabels) > 0,
    `${label}: label-density transform missing dynamic label limit`
  );
}

function assertReadyCase(testCase, state) {
  assert(state.overlay?.status === testCase.expectedStatus, `${testCase.label}: status mismatch`);
  assert(
    state.overlay.runtimeLinkVisible === testCase.expectedRuntimeLinkVisible,
    `${testCase.label}: runtimeLinkVisible mismatch`
  );
  assertDataCompletenessShape(testCase.label, state);
  assert(state.panel?.routeMode === RUNTIME_MODE, `${testCase.label}: panel route mode missing`);
  assert(state.footer?.stationAId === testCase.stationA, `${testCase.label}: footer station A missing`);
  assert(state.footer?.stationBId === testCase.stationB, `${testCase.label}: footer station B missing`);
  assert(state.chip?.sourceCount === "3", `${testCase.label}: TLE chip source count missing`);
  assert(state.chip?.sourceHealth, `${testCase.label}: TLE chip source health missing`);
  const parserFailureCount = state.overlay.dataCompleteness.tleSources.reduce(
    (total, source) => total + (source.parserFailureCount ?? 0),
    0
  );
  assert(
    state.chip?.parserFailureCount === String(parserFailureCount),
    `${testCase.label}: TLE chip parser failure count mismatch`
  );
}

function assertEmptyCase(testCase, state) {
  assert(state.overlay?.status === testCase.expectedStatus, `${testCase.label}: status mismatch`);
  assert(
    state.overlay.runtimeLinkVisible === testCase.expectedRuntimeLinkVisible,
    `${testCase.label}: runtimeLinkVisible mismatch`
  );
  assertDataCompletenessShape(testCase.label, state);
  assert(
    state.overlay.emptyReasonCode === testCase.expectedEmptyReasonCode,
    `${testCase.label}: expected empty reason ${testCase.expectedEmptyReasonCode}, received ${state.overlay.emptyReasonCode}`
  );
  assert(
    state.overlay.dataCompleteness.emptyReasonCode === testCase.expectedEmptyReasonCode,
    `${testCase.label}: debug empty reason mismatch`
  );
}

function assertCsvEvidence(label, evidence) {
  assert(evidence?.text, `${label}: CSV text missing`);
  const data = evidence.dataCompleteness;
  assert(data, `${label}: CSV reference payload missing`);
  const sections = parseCsvSections(evidence.text);

  const sourceManifest = requireCsvSection(sections, "# TLE source manifest", label);
  assert(
    sourceManifest.rows.length === data.tleSources.length,
    `${label}: CSV source manifest row count mismatch`
  );
  const sourcesById = new Map(sourceManifest.rows.map((row) => [row.sourceId, row]));
  for (const source of data.tleSources) {
    const row = sourcesById.get(source.sourceId);
    assert(row, `${label}: CSV missing source row ${source.sourceId}`);
    assert(row.sourcePath === source.sourcePath, `${label}: CSV source path mismatch`);
    assert(row.orbitClass === source.orbitClass, `${label}: CSV orbit class mismatch`);
    assert(row.recordCount === csvCellValue(source.recordCount), `${label}: CSV record count mismatch`);
    assert(
      row.acceptedRecordCount === csvCellValue(source.acceptedRecordCount),
      `${label}: CSV accepted count mismatch`
    );
    assert(
      row.parserFailureCount === csvCellValue(source.parserFailureCount),
      `${label}: CSV parser failure count mismatch`
    );
    assert(
      row.excludedReasonCategories === source.excludedReasonCategories.join("|"),
      `${label}: CSV excluded reason mismatch`
    );
    assert(row.epochStartUtc === csvCellValue(source.epochStartUtc), `${label}: CSV epoch start mismatch`);
    assert(row.epochEndUtc === csvCellValue(source.epochEndUtc), `${label}: CSV epoch end mismatch`);
    assert(row.health === source.health, `${label}: CSV source health mismatch`);
    assert(row.sgp4ErrorCount === csvCellValue(source.sgp4ErrorCount), `${label}: CSV SGP4 count mismatch`);
    assert(
      row.noradIdRangeSummary === JSON.stringify(source.noradIdRangeSummary),
      `${label}: CSV NORAD summary mismatch`
    );
    assert(
      row.cosparDesignatorCount === csvCellValue(source.cosparDesignatorCount),
      `${label}: CSV COSPAR count mismatch`
    );
    assert(
      row.cosparDesignatorSamples === source.cosparDesignatorSamples.join("|"),
      `${label}: CSV COSPAR samples mismatch`
    );
    assert(
      row.classificationCounts === JSON.stringify(source.classificationCounts),
      `${label}: CSV classification counts mismatch`
    );
    assert(
      row.dragTermFieldCoverage === JSON.stringify(source.dragTermFieldCoverage),
      `${label}: CSV drag-term coverage mismatch`
    );
  }

  const stationPrecision = requireCsvSection(sections, "# Station precision", label);
  assert(
    stationPrecision.rows.length === data.stationPrecision.length,
    `${label}: CSV station precision row count mismatch`
  );
  const stationsById = new Map(stationPrecision.rows.map((row) => [row.stationId, row]));
  for (const station of data.stationPrecision) {
    const row = stationsById.get(station.stationId);
    assert(row, `${label}: CSV missing station row ${station.stationId}`);
    assert(
      row.disclosurePrecision === station.disclosurePrecision,
      `${label}: CSV disclosure precision mismatch`
    );
    assert(row.rawLat === csvCellValue(station.rawLat), `${label}: CSV raw latitude mismatch`);
    assert(row.rawLon === csvCellValue(station.rawLon), `${label}: CSV raw longitude mismatch`);
    assert(
      row.provenanceTruthClass === station.provenance.truthClass,
      `${label}: CSV station provenance class mismatch`
    );
    assert(
      row.provenanceSourceId === station.provenance.sourceId,
      `${label}: CSV station provenance source mismatch`
    );
  }

  const actorProvenance = requireCsvSection(sections, "# Actor provenance", label);
  assert(
    actorProvenance.rows.length === data.actorProvenance.length,
    `${label}: CSV actor provenance row count mismatch`
  );
  const actorsById = new Map(actorProvenance.rows.map((row) => [row.satelliteId, row]));
  for (const actor of data.actorProvenance) {
    const row = actorsById.get(actor.satelliteId);
    assert(row, `${label}: CSV missing actor row ${actor.satelliteId}`);
    assert(row.orbitClass === actor.orbitClass, `${label}: CSV actor orbit class mismatch`);
    assert(row.sourceId === actor.sourceId, `${label}: CSV actor source mismatch`);
    assert(
      row.propagatedSampleCount === csvCellValue(actor.propagatedSampleCount),
      `${label}: CSV actor sample count mismatch`
    );
    assert(
      row.sampleCadenceSeconds === csvCellValue(actor.sampleCadenceSeconds),
      `${label}: CSV actor cadence mismatch`
    );
    assert(
      row.firstPropagatedUtc === csvCellValue(actor.firstPropagatedUtc),
      `${label}: CSV actor first sample mismatch`
    );
    assert(
      row.lastPropagatedUtc === csvCellValue(actor.lastPropagatedUtc),
      `${label}: CSV actor last sample mismatch`
    );
    assert(
      row.visibilityWindowCount === csvCellValue(actor.visibilityWindowCount),
      `${label}: CSV actor visibility count mismatch`
    );
    assert(
      row.provenanceTruthClass === actor.provenance.truthClass,
      `${label}: CSV actor provenance class mismatch`
    );
  }

  const visibilityProvenance = requireCsvSection(sections, "# Visibility provenance", label);
  assert(
    data.visibilityProvenance.length === evidence.visibilityWindowCount,
    `${label}: visibility provenance count mismatch`
  );
  assert(
    visibilityProvenance.rows.length === data.visibilityProvenance.length,
    `${label}: CSV visibility provenance row count mismatch`
  );
  const visibilityRowsByKey = new Map(
    visibilityProvenance.rows.map((row) => [
      `${row.satelliteId}|${row.intersectionStartUtc}|${row.intersectionEndUtc}`,
      row
    ])
  );
  for (const rowData of data.visibilityProvenance) {
    const key = `${rowData.satelliteId}|${rowData.intersectionStartUtc}|${rowData.intersectionEndUtc}`;
    const row = visibilityRowsByKey.get(key);
    assert(row, `${label}: CSV missing visibility row ${key}`);
    assert(row.orbitClass === rowData.orbitClass, `${label}: CSV visibility orbit class mismatch`);
    assert(row.sourceId === rowData.sourceId, `${label}: CSV visibility source mismatch`);
    assert(
      row.stationAWindowSource === rowData.stationAWindowSource,
      `${label}: CSV station A window source mismatch`
    );
    assert(
      row.stationBWindowSource === rowData.stationBWindowSource,
      `${label}: CSV station B window source mismatch`
    );
    assert(
      row.pairIntersectionSource === rowData.pairIntersectionSource,
      `${label}: CSV pair intersection source mismatch`
    );
    assert(
      row.elevationThresholdDeg === csvCellValue(rowData.elevationThresholdDeg),
      `${label}: CSV visibility elevation threshold mismatch`
    );
    assert(
      row.sampleCadenceSeconds === csvCellValue(rowData.sampleCadenceSeconds),
      `${label}: CSV visibility cadence mismatch`
    );
    assert(
      row.provenanceTruthClass === rowData.provenance.truthClass,
      `${label}: CSV visibility provenance class mismatch`
    );
  }

  const modeledOutputs = requireCsvSection(sections, "# Modeled outputs", label);
  assert(
    modeledOutputs.rows.length === data.modeledOutputs.length,
    `${label}: CSV modeled output row count mismatch`
  );
  const modeledOutputsByKind = new Map(modeledOutputs.rows.map((row) => [row.kind, row]));
  for (const output of data.modeledOutputs) {
    const row = modeledOutputsByKind.get(output.kind);
    assert(row, `${label}: CSV missing modeled output ${output.kind}`);
    assert(row.modelId === output.modelId, `${label}: CSV model id mismatch`);
    assert(row.inputSummary === JSON.stringify(output.inputSummary), `${label}: CSV input summary mismatch`);
    assert(
      row.provenanceTruthClass === output.provenance.truthClass,
      `${label}: CSV output provenance class mismatch`
    );
    assert(
      row.provenanceSourceId === output.provenance.sourceId,
      `${label}: CSV output provenance source mismatch`
    );
    assert(row.nonClaim === output.nonClaim, `${label}: CSV output non-claim mismatch`);
  }

  const displayTransforms = requireCsvSection(sections, "# Display transforms", label);
  assert(
    displayTransforms.rows.length === data.displayTransforms.length,
    `${label}: CSV display transform row count mismatch`
  );
  const transformsBySourceId = new Map(displayTransforms.rows.map((row) => [row.sourceId, row]));
  for (const transform of data.displayTransforms) {
    const row = transformsBySourceId.get(transform.sourceId);
    assert(row, `${label}: CSV missing display transform ${transform.sourceId}`);
    assert(
      row.provenanceTruthClass === transform.truthClass,
      `${label}: CSV display transform truth class mismatch`
    );
    assert(
      row.inputSummary === JSON.stringify(transform.inputSummary),
      `${label}: CSV display transform input summary mismatch`
    );
  }

  const dataCompleteness = requireCsvSection(sections, "# Data completeness", label);
  const summaryByField = new Map(dataCompleteness.rows.map((row) => [row.field, row.value]));
  assert(
    summaryByField.get("fakeActorCount") === csvCellValue(data.actorSourceCoverage.fakeActorCount),
    `${label}: CSV fake actor count mismatch`
  );
  assert(
    summaryByField.get("visibilityCadenceSecondsByOrbit") ===
      JSON.stringify(data.visibilityCadenceSecondsByOrbit),
    `${label}: CSV cadence summary mismatch`
  );
  assert(
    summaryByField.get("emptyReasonCode") === csvCellValue(data.emptyReasonCode),
    `${label}: CSV empty reason mismatch`
  );
  assert(
    evidence.defaultWindowDurationMinutes === 360,
    `${label}: buildDefaultTimeWindow default should be 360 minutes`
  );
}

function assertMissingSourceEvidence(label, evidence) {
  assert(
    evidence?.emptyReasonCode === "tle-source-unavailable",
    `${label}: expected missing source reason, received ${evidence?.emptyReasonCode}`
  );
  assert(evidence.fakeActorCount === 0, `${label}: missing source produced fake actor`);
  assert(evidence.sourceCount === 3, `${label}: missing source manifest count mismatch`);
  const sourcesByOrbit = new Map(evidence.sources?.map((source) => [source.orbitClass, source]));
  assert(
    sourcesByOrbit.get("LEO")?.sourcePath === "missing:leo" &&
      sourcesByOrbit.get("MEO")?.sourcePath === "unsupported:meo" &&
      sourcesByOrbit.get("GEO")?.sourcePath === "missing:geo",
    `${label}: missing/unsupported source paths were not preserved`
  );
  assert(
    [...sourcesByOrbit.values()].every((source) => source.parserFailureCount === 0),
    `${label}: missing source parser failures not propagated`
  );
  assert(
    [...sourcesByOrbit.values()].every((source) => source.health === "unknown-age"),
    `${label}: missing source health should be unknown-age`
  );
}

const server = await startServerIfNeeded();
const browserCommand = findHeadlessBrowser();
const browser = await startHeadlessBrowser(browserCommand, [
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  `--window-size=${VIEWPORT.width},${VIEWPORT.height}`
]);

let client;
const results = [];

try {
  const pageWebSocketUrl = await resolvePageWebSocketUrl(browser.browserWebSocketUrl);
  client = await connectCdp(pageWebSocketUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: 1,
    mobile: false
  });

  await navigate(client, buildSelectedPairUrl(readyCase));
  const readyState = await readSelectedPairState(client);
  assertReadyCase(readyCase, readyState);
  const readyCsv = await readCsvEvidence(client, readyCase);
  assertCsvEvidence(readyCase.label, readyCsv);
  const missingSourceEvidence = await readMissingSourceEvidence(client, readyCase);
  assertMissingSourceEvidence(readyCase.label, missingSourceEvidence);
  results.push({
    label: readyCase.label,
    status: readyState.overlay.status,
    emptyReasonCode: readyState.overlay.emptyReasonCode,
    sourceHealth: readyState.chip.sourceHealth,
    modeledOutputCount: readyState.overlay.dataCompleteness.modeledOutputs.length,
    actorProvenanceCount: readyState.overlay.dataCompleteness.actorProvenance.length,
    visibilityProvenanceCount: readyState.overlay.dataCompleteness.visibilityProvenance.length,
    missingSourceReason: missingSourceEvidence.emptyReasonCode
  });

  await navigate(client, buildSelectedPairUrl(emptyCase));
  const emptyState = await readSelectedPairState(client);
  assertEmptyCase(emptyCase, emptyState);
  results.push({
    label: emptyCase.label,
    status: emptyState.overlay.status,
    emptyReasonCode: emptyState.overlay.emptyReasonCode,
    fakeActorCount: emptyState.overlay.dataCompleteness.actorSourceCoverage.fakeActorCount
  });

  await navigate(client, buildFixedDemoUrl(fixedDemoCase));
  const fixedState = await readSelectedPairState(client, ["not-requested", "error"]);
  assert(
    fixedState.sceneSourceMode === FIXTURE_MODE,
    `${fixedDemoCase.label}: expected fixture mode, received ${fixedState.sceneSourceMode}`
  );
  assert(
    fixedState.overlay?.status === "not-requested",
    `${fixedDemoCase.label}: selected-pair overlay should not be requested`
  );
  results.push({
    label: fixedDemoCase.label,
    status: fixedState.overlay.status,
    sourceMode: fixedState.sceneSourceMode
  });
} finally {
  if (client) {
    await client.close();
  }
  await stopHeadlessBrowser(browser);
  await stopServer(server);
}

console.log(JSON.stringify({ passed: true, baseUrl, results }, null, 2));
process.exit(0);
