import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const satelliteAdapterPath = new URL(
  "../src/features/satellites/adapter.ts",
  import.meta.url
);
const satelliteIndexPath = new URL(
  "../src/features/satellites/index.ts",
  import.meta.url
);
const overlayManagerPath = new URL(
  "../src/features/overlays/overlay-manager.ts",
  import.meta.url
);
const mainPath = new URL("../src/main.ts", import.meta.url);
const walkerAdapterPath = new URL(
  "../src/features/satellites/walker-fixture-adapter.ts",
  import.meta.url
);

const [adapterSource, indexSource, overlayManagerSource, mainSource] =
  await Promise.all([
    readFile(satelliteAdapterPath, "utf8"),
    readFile(satelliteIndexPath, "utf8"),
    readFile(overlayManagerPath, "utf8"),
    readFile(mainPath, "utf8")
  ]);

const requiredAdapterSnippets = [
  "export interface Vec3 {",
  "x: number;",
  "y: number;",
  "z: number;",
  "export type SatelliteJsonValue =",
  "export interface SatelliteSample {",
  "id: string;",
  "name?: string;",
  "positionEcef: Vec3;",
  "velocityEcef?: Vec3;",
  "time: ClockTimestamp;",
  "export type SatelliteFixture =",
  'kind: "tle";',
  "tleText: string;",
  'propagator?: "sgp4";',
  'epochMode?: "absolute" | "relative-to-now";',
  'kind: "czml";',
  "czml: SatelliteJsonValue;",
  'kind: "sample-series";',
  "samples: ReadonlyArray<SatelliteSample>;",
  "export interface SatelliteOverlayAdapter {",
  "loadFixture(fixture: SatelliteFixture): Promise<{ satCount: number }>;",
  "attachToClock(clock: ReplayClock): void;",
  "setVisible(visible: boolean): void;",
  "dispose(): Promise<void>;"
];

for (const snippet of requiredAdapterSnippets) {
  assert(
    adapterSource.includes(snippet),
    `Missing required satellite adapter contract snippet: ${snippet}`
  );
}

const requiredSatelliteIndexSnippets = [
  "SatelliteFixture",
  "SatelliteOverlayAdapter",
  "SatelliteSample",
  "Vec3"
];

for (const snippet of requiredSatelliteIndexSnippets) {
  assert(
    indexSource.includes(snippet),
    `Satellite module boundary must re-export ${snippet}.`
  );
}

assert(
  /import\s+type\s*\{\s*SatelliteOverlayAdapter\s*\}\s*from\s*["']\.\.\/satellites["'];/.test(
    overlayManagerSource
  ),
  "Overlay manager must import the formal satellite adapter interface."
);
assert(
  overlayManagerSource.includes("adapter: SatelliteOverlayAdapter"),
  "Overlay manager attach() must depend on SatelliteOverlayAdapter."
);
assert(
  !overlayManagerSource.includes("loadFixture("),
  "Overlay manager must not own fixture ingestion."
);
assert(
  !/from\s+["']\.\.\/satellites\/adapter["']/.test(overlayManagerSource),
  "Overlay manager must depend on the formal satellite module seam, not the adapter file directly."
);

const forbiddenSatellitePatterns = [
  {
    pattern: /from\s+["']cesium["']/,
    message: "Public satellite contract must not import from cesium."
  },
  {
    pattern: /\bCartesian3\b/,
    message: "Public satellite contract must not mention Cartesian3."
  },
  {
    pattern: /\bJulianDate\b/,
    message: "Public satellite contract must not mention JulianDate."
  },
  {
    pattern: /\bViewer\b/,
    message: "Public satellite contract must not mention Viewer."
  },
  {
    pattern: /\bEntity\b/,
    message: "Public satellite contract must not mention Entity."
  },
  {
    pattern: /\bSampledPositionProperty\b/,
    message:
      "Public satellite contract must not mention SampledPositionProperty."
  },
  {
    pattern: /\bunknown\b/,
    message: "Public satellite contract must not fall back to unknown."
  },
  {
    pattern: /walker-fixture-adapter/,
    message: "Public satellite contract must not mention walker-fixture-adapter."
  }
];

for (const { pattern, message } of forbiddenSatellitePatterns) {
  assert(!pattern.test(adapterSource), message);
  assert(!pattern.test(indexSource), `Satellite module boundary: ${message}`);
}

const forbiddenOverlayPatterns = [
  {
    pattern: /from\s+["']cesium["']/,
    message: "Overlay manager must not import from cesium."
  },
  {
    pattern: /\bCartesian3\b/,
    message: "Overlay manager must not mention Cartesian3."
  },
  {
    pattern: /\bJulianDate\b/,
    message: "Overlay manager must not mention JulianDate."
  },
  {
    pattern: /\bViewer\b/,
    message: "Overlay manager must not mention Viewer."
  },
  {
    pattern: /walker-fixture-adapter/,
    message: "Overlay manager must not mention walker-fixture-adapter."
  }
];

for (const { pattern, message } of forbiddenOverlayPatterns) {
  assert(!pattern.test(overlayManagerSource), message);
}

assert(
  !/\bfeatures\/satellites\b/.test(mainSource),
  "Phase 3.7 satellite interface must not be wired into the live runtime path yet."
);
assert(
  !/\bfeatures\/overlays\b/.test(mainSource),
  "Phase 3.7 must keep overlay-manager off the live runtime path."
);
assert(
  !existsSync(walkerAdapterPath),
  "Phase 3.7 must not introduce src/features/satellites/walker-fixture-adapter.ts."
);

console.log("Phase 3.7 satellite adapter contract verification passed.");
