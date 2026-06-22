// Safety-net golden for the pure product-UX surface-state builders extracted
// from m8a-v4-ground-station-handover-scene-controller.ts into
// m8a-v4-ground-station-surface-state-builders.ts.
//
// These builders feed a visible product-UX root (the HUD surfaces) but are
// PURE: they read module constants + params and return plain state objects, so
// the node suite can exercise them directly (the controller itself is Cesium/
// DOM-bound and only reachable through the browser smokes). This locks the
// output of the constant-reading builders so the extraction is provably
// behavior-preserving and future edits are caught.
//
// Scope: the builders whose inputs are module constants or simple scalars are
// snapshot here. buildF09RateSurfaceState / buildF16RouteExportBundle consume a
// runtime-built scene state (window resolved at runtime, not a static const),
// so they are not snapshot here — their extraction is covered by the byte-exact
// move + tsc + the browser smokes that drive the real controller.
//
// RE-BASELINE with UPDATE_GOLDENS=1 only on an intended surface-state change.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  serializeList,
  serializeJson,
  resolveFallbackGuardCueMode,
  buildRequirementGapSurfaceState,
  buildAcceptanceLayerState,
  buildF16ExportSurfaceState,
  buildPolicyRuleControlsState,
} from "../../src/runtime/m8a-v4-ground-station-surface-state-builders.ts";
import {
  M8A_V4_CUSTOMER_F10_POLICY_DEFAULT_PRESET_ID,
  M8A_V4_CUSTOMER_F11_RULE_DEFAULT_PRESET_ID,
} from "../../src/runtime/m8a-v4-requirement-demo-surfaces.ts";

// resolveFallbackGuardCueMode only reads .windowId; a minimal window exercises
// both of its branches.
const snapshot = {
  serializeList: serializeList(["b", "a", "c"]),
  serializeJson: serializeJson({ z: 1, a: [2, 3], nested: { ok: true } }),
  fallbackGuardCueMode_geoGuard: resolveFallbackGuardCueMode({ windowId: "geo-continuity-guard" }),
  fallbackGuardCueMode_other: resolveFallbackGuardCueMode({ windowId: "leo-meo-handover" }),
  requirementGapSurface: buildRequirementGapSurfaceState(),
  acceptanceLayer: buildAcceptanceLayerState(63, { LEO: 60, MEO: 2, GEO: 1 }),
  f16ExportSurface_null: buildF16ExportSurfaceState(null),
  policyRuleControls: buildPolicyRuleControlsState(
    M8A_V4_CUSTOMER_F10_POLICY_DEFAULT_PRESET_ID,
    M8A_V4_CUSTOMER_F11_RULE_DEFAULT_PRESET_ID,
  ),
};

const actual = JSON.stringify(snapshot, null, 2) + "\n";
const GOLDEN_PATH = fileURLToPath(
  new URL("../golden/scene-surface-state-builders.golden.json", import.meta.url),
);
const UPDATE = process.env.UPDATE_GOLDENS === "1" || process.env.UPDATE_GOLDEN === "1";
if (UPDATE || !existsSync(GOLDEN_PATH)) writeFileSync(GOLDEN_PATH, actual);

test("surface-state builders are deterministic + structurally sane", () => {
  assert.equal(serializeList(["x", "y"]), "x|y");
  assert.equal(serializeJson({ a: 1 }), '{"a":1}');
  for (const key of [
    "requirementGapSurface",
    "acceptanceLayer",
    "f16ExportSurface_null",
    "policyRuleControls",
  ]) {
    assert.ok(snapshot[key] && typeof snapshot[key] === "object", `${key} should be an object`);
  }
  assert.notEqual(
    JSON.stringify(snapshot.fallbackGuardCueMode_geoGuard),
    JSON.stringify(snapshot.fallbackGuardCueMode_other),
    "the two guard-cue branches should differ",
  );
  // Re-running with the same inputs is byte-identical (no hidden non-determinism).
  assert.equal(
    JSON.stringify(buildRequirementGapSurfaceState(), null, 2),
    JSON.stringify(snapshot.requirementGapSurface, null, 2),
  );
});

test("surface-state builders match the committed golden", () => {
  const golden = readFileSync(GOLDEN_PATH, "utf8");
  assert.equal(
    actual,
    golden,
    "surface-state builder output drifted — if intended, re-baseline with " +
      "UPDATE_GOLDENS=1; otherwise the extraction/edit was NOT behavior-preserving.",
  );
});
