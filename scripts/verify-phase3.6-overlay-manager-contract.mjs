import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const overlayManagerPath = new URL(
  "../src/features/overlays/overlay-manager.ts",
  import.meta.url
);
const overlayIndexPath = new URL("../src/features/overlays/index.ts", import.meta.url);
const mainPath = new URL("../src/main.ts", import.meta.url);
const walkerAdapterPath = new URL(
  "../src/features/satellites/walker-fixture-adapter.ts",
  import.meta.url
);

const [overlayManagerSource, overlayIndexSource, mainSource] = await Promise.all([
  readFile(overlayManagerPath, "utf8"),
  readFile(overlayIndexPath, "utf8"),
  readFile(mainPath, "utf8")
]);

const requiredOverlayManagerSnippets = [
  "export type OverlayId = string;",
  "export interface OverlayManagerEntryState {",
  "overlayId: OverlayId;",
  "adapterAttached: boolean;",
  "visible: boolean;",
  "export interface OverlayManagerState {",
  "entries: ReadonlyArray<OverlayManagerEntryState>;",
  "export interface OverlayManager {",
  "getState(): OverlayManagerState;",
  "attach(",
  "detach(",
  "setVisible(",
  "toggle(",
  "dispose(): Promise<void>;"
];

for (const snippet of requiredOverlayManagerSnippets) {
  assert(
    overlayManagerSource.includes(snippet),
    `Missing required overlay-manager contract snippet: ${snippet}`
  );
}

const requiredOverlayIndexSnippets = [
  "OverlayId",
  "OverlayManager",
  "OverlayManagerEntryState",
  "OverlayManagerState"
];

for (const snippet of requiredOverlayIndexSnippets) {
  assert(
    overlayIndexSource.includes(snippet),
    `Overlay module boundary must re-export ${snippet}.`
  );
}

const forbiddenOverlayPatterns = [
  {
    pattern: /from\s+["']cesium["']/,
    message: "Overlay manager contract must not import from cesium."
  },
  {
    pattern: /\bCartesian3\b/,
    message: "Overlay manager contract must not mention Cartesian3."
  },
  {
    pattern: /\bJulianDate\b/,
    message: "Overlay manager contract must not mention JulianDate."
  },
  {
    pattern: /\bViewer\b/,
    message: "Overlay manager contract must not mention Viewer."
  },
  {
    pattern: /\bEntity\b/,
    message: "Overlay manager contract must not mention Entity."
  },
  {
    pattern: /\bPrimitive\b/,
    message: "Overlay manager contract must not mention Primitive."
  },
  {
    pattern: /\bCesium3DTileset\b/,
    message: "Overlay manager contract must not mention Cesium3DTileset."
  },
  {
    pattern: /walker-fixture-adapter/,
    message: "Overlay manager contract must not mention walker-fixture-adapter."
  },
  {
    pattern: /\bloadFixture\s*\(/,
    message: "Overlay manager contract must not own fixture ingestion."
  }
];

for (const { pattern, message } of forbiddenOverlayPatterns) {
  assert(!pattern.test(overlayManagerSource), message);
}

assert(
  !mainSource.includes("./features/overlays") &&
    !mainSource.includes("./features/overlays/"),
  "Phase 3.6 overlay manager interface must not be wired into the live runtime path yet."
);

assert(
  !existsSync(walkerAdapterPath),
  "Phase 3.6 must not introduce src/features/satellites/walker-fixture-adapter.ts."
);

console.log("Phase 3.6 overlay-manager contract verification passed.");
