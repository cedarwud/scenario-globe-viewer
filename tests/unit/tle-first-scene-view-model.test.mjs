import { test } from "node:test";
import { strict as assert } from "node:assert";

import { buildTleFirstSceneViewModel } from "../../src/features/multi-station-selector/tle-first-scene-view-model.ts";

const START = "2026-05-17T00:00:00.000Z";
const MID = "2026-05-17T00:02:00.000Z";
const END = "2026-05-17T00:05:00.000Z";

const BASE_TLES = [
  {
    satelliteId: "SAT-A",
    orbitClass: "LEO",
    tleLine1: "1 00001U 26001A   26137.00000000  .00000000  00000+0  00000+0 0  9991",
    tleLine2: "2 00001  53.0000 120.0000 0001000  10.0000 350.0000 15.00000000    01"
  },
  {
    satelliteId: "SAT-B",
    orbitClass: "MEO",
    tleLine1: "1 00002U 26002A   26137.00000000  .00000000  00000+0  00000+0 0  9992",
    tleLine2: "2 00002  56.0000 090.0000 0001000  20.0000 340.0000 02.00000000    02"
  }
];

function station(id, lat, lon) {
  return {
    id,
    name: id,
    lat,
    lon,
    orbitSupport: ["LEO", "MEO", "GEO"],
    operatorFamily: "public-demo"
  };
}

function pairWindow(satelliteId, orbitClass, startUtc = START, endUtc = END) {
  return {
    satelliteId,
    orbitClass,
    stationAWindow: {
      startUtc,
      endUtc,
      maxElevationDeg: 42
    },
    stationBWindow: {
      startUtc,
      endUtc,
      maxElevationDeg: 39
    },
    intersectionStartUtc: startUtc,
    intersectionEndUtc: endUtc
  };
}

function projection(overrides = {}) {
  const stationA = overrides.stationA ?? station("alpha-site", 10, 20);
  const stationB = overrides.stationB ?? station("beta-site", 14, 31);
  const visibilityWindows = overrides.visibilityWindows ?? [pairWindow("SAT-A", "LEO")];
  const handoverEvents = overrides.handoverEvents ?? [
    {
      handoverAtUtc: MID,
      fromSatelliteId: "SAT-A",
      toSatelliteId: "SAT-B",
      reasonKind: "better-candidate-available"
    }
  ];
  return {
    pair: { stationA, stationB },
    timeWindow: overrides.timeWindow ?? { startUtc: START, endUtc: END },
    sharedSupportedOrbits: overrides.sharedSupportedOrbits ?? ["LEO", "MEO"],
    visibleConstellations: overrides.visibleConstellations ?? {
      LEO: [{ satelliteId: "SAT-A", tleSource: "fake-leo.tle" }],
      MEO: [{ satelliteId: "SAT-B", tleSource: "fake-meo.tle" }],
      GEO: [{ satelliteId: "SAT-C", tleSource: "fake-geo.tle" }]
    },
    visibilityWindows,
    handoverEvents,
    communicationStats: overrides.communicationStats ?? {
      totalCommunicatingMs: 300000,
      byOrbit: { LEO: 180000, MEO: 120000, GEO: 0 },
      handoverCount: handoverEvents.length,
      meanLinkDwellMs: 150000
    },
    truthBoundary: overrides.truthBoundary ?? {
      precisionLabel: "modeled-precision",
      sourceTier: "tier-3-geometric-derived",
      nonClaims: ["not measured service telemetry"]
    }
  };
}

function build(overrides = {}) {
  return buildTleFirstSceneViewModel({
    projection: projection(overrides.projection),
    tleRecords: overrides.tleRecords ?? BASE_TLES,
    sampleStepSeconds: overrides.sampleStepSeconds ?? 60,
    sourceMode: overrides.sourceMode ?? "tle-first-runtime"
  });
}

test("actors are limited to visibility or handover satellites with matching records", () => {
  const viewModel = build({
    projection: {
      visibilityWindows: [pairWindow("SAT-A", "LEO"), pairWindow("SAT-Z", "LEO")],
      handoverEvents: [
        {
          handoverAtUtc: MID,
          fromSatelliteId: "SAT-A",
          toSatelliteId: "SAT-B",
          reasonKind: "better-candidate-available"
        },
        {
          handoverAtUtc: END,
          fromSatelliteId: "SAT-B",
          toSatelliteId: "SAT-Z",
          reasonKind: "current-link-unavailable"
        }
      ],
      visibleConstellations: {
        LEO: [
          { satelliteId: "SAT-A", tleSource: "fake-leo.tle" },
          { satelliteId: "SAT-Z", tleSource: "fake-leo.tle" }
        ],
        MEO: [
          { satelliteId: "SAT-B", tleSource: "fake-meo.tle" },
          { satelliteId: "SAT-ONLY-CONSTELLATION", tleSource: "fake-meo.tle" }
        ],
        GEO: []
      }
    }
  });

  assert.deepEqual(
    viewModel.actors.map((actor) => actor.satelliteId).sort(),
    ["SAT-A", "SAT-B"]
  );
  assert.equal(viewModel.actors.every((actor) => actor.sourceClass === "tle-derived"), true);
  assert.equal(viewModel.actors.every((actor) => actor.sourceSamples.length > 0), true);
});

test("zero-window result with no handover keeps actors and active links empty", () => {
  const viewModel = build({
    projection: {
      visibilityWindows: [],
      handoverEvents: [],
      communicationStats: {
        totalCommunicatingMs: 0,
        byOrbit: { LEO: 0, MEO: 0, GEO: 0 },
        handoverCount: 0,
        meanLinkDwellMs: 0
      }
    }
  });

  assert.deepEqual(viewModel.actors, []);
  assert.deepEqual(viewModel.activeLinks, []);
  assert.deepEqual(viewModel.handoverEvents, []);
  assert.equal(viewModel.cameraHint.pairGeometry, "empty-result");
});

test("initial acquisition from null is retained and its target satellite has an actor", () => {
  const viewModel = build({
    projection: {
      visibilityWindows: [pairWindow("SAT-A", "LEO")],
      handoverEvents: [
        {
          handoverAtUtc: START,
          fromSatelliteId: null,
          toSatelliteId: "SAT-A",
          reasonKind: "current-link-unavailable"
        }
      ]
    }
  });

  assert.deepEqual(viewModel.handoverEvents, [
    {
      atUtc: START,
      fromSatelliteId: null,
      toSatelliteId: "SAT-A",
      reasonKind: "current-link-unavailable"
    }
  ]);
  assert.ok(viewModel.actors.some((actor) => actor.satelliteId === "SAT-A"));
  assert.ok(viewModel.activeLinks.some((link) => link.satelliteId === "SAT-A"));
});

test("camera hint identifies polar, near-antipodal, or empty pair geometry", () => {
  const polarViewModel = build({
    projection: {
      stationA: station("north-site", 78.2, 15.6),
      stationB: station("south-site", -72.0, 2.5)
    }
  });
  assert.equal(polarViewModel.cameraHint.pairGeometry, "polar");

  const farViewModel = build({
    projection: {
      stationA: station("west-site", 0, 0),
      stationB: station("east-site", 0.3, 179.4)
    }
  });
  assert.equal(farViewModel.cameraHint.pairGeometry, "antipodal");

  const emptyViewModel = build({
    projection: {
      visibilityWindows: [],
      handoverEvents: []
    }
  });
  assert.equal(emptyViewModel.cameraHint.pairGeometry, "empty-result");
});

test("truth boundary and display policy expose source, cap, display, and modeled status", () => {
  const viewModel = build();

  assert.equal(viewModel.sourceMode, "tle-first-runtime");
  assert.equal(viewModel.truthBoundary.sourceMode, "tle-first-runtime");
  assert.equal(typeof viewModel.truthBoundary.tleCapPerOrbit, "number");
  assert.ok(viewModel.truthBoundary.tleCapPerOrbit > 0);
  assert.ok(viewModel.truthBoundary.modeledMetricsActive.includes("handover-policy"));
  assert.ok(viewModel.truthBoundary.modeledMetricsActive.includes("link-budget"));
  assert.ok(viewModel.truthBoundary.displayOnlyTransformsActive.includes("altitude-compression"));

  assert.equal(viewModel.displayPolicy.altitudeCompressionEnabled, true);
  assert.equal(typeof viewModel.displayPolicy.altitudeCompressionFactor, "number");
  assert.ok(viewModel.displayPolicy.altitudeCompressionFactor > 0);
  assert.equal(typeof viewModel.displayPolicy.maxVisibleActorLabels, "number");
  assert.equal(typeof viewModel.displayPolicy.suppressNonActiveTrails, "boolean");
});
