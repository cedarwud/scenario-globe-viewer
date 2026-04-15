import type { Viewer } from "cesium";
import { applyAtmosphereBaseline } from "./atmosphere";
import { applyCameraLanguage } from "./camera-language";
import { applyFogAndPostProcessBaseline } from "./fog-and-post-process";
import { applyLightingBaseline } from "./lighting";
import {
  type ImagerySelectionOptions,
  resolveImagerySelection
} from "./offline-imagery";
import {
  type TerrainSelectionOptions,
  resolveTerrainSelection
} from "./offline-terrain";
import { CESIUM_NATIVE_BASELINE_SCENE_PRESET } from "./scene-preset";
import { applyStarBackground } from "./star-background";

type GlobalPresetViewerOptions = ImagerySelectionOptions & TerrainSelectionOptions;

export const GLOBAL_SCENE_PRESET = CESIUM_NATIVE_BASELINE_SCENE_PRESET;

function assertUnsupportedPresetValue(kind: string, value: never): never {
  throw new Error(`Unsupported global preset ${kind}: ${String(value)}`);
}

function resolveGlobalPresetImagerySelection(): ImagerySelectionOptions {
  switch (GLOBAL_SCENE_PRESET.presentation.imageryPolicyId) {
    case "viewer-default":
      return resolveImagerySelection();
    default:
      return assertUnsupportedPresetValue(
        "imagery policy",
        GLOBAL_SCENE_PRESET.presentation.imageryPolicyId
      );
  }
}

function resolveGlobalPresetTerrainSelection(): TerrainSelectionOptions {
  switch (GLOBAL_SCENE_PRESET.presentation.terrainPolicyId) {
    case "viewer-default":
      return resolveTerrainSelection();
    default:
      return assertUnsupportedPresetValue(
        "terrain policy",
        GLOBAL_SCENE_PRESET.presentation.terrainPolicyId
      );
  }
}

function applyGlobalPresentation(viewer: Viewer): void {
  switch (GLOBAL_SCENE_PRESET.presentation.globeStyleId) {
    case "phase2-native-baseline":
      applyAtmosphereBaseline(viewer);
      applyStarBackground(viewer);
      applyFogAndPostProcessBaseline(viewer);
      applyLightingBaseline(viewer);
      return;
    default:
      assertUnsupportedPresetValue(
        "globe style",
        GLOBAL_SCENE_PRESET.presentation.globeStyleId
      );
  }
}

export function resolveGlobalPresetViewerOptions(): GlobalPresetViewerOptions {
  return {
    ...resolveGlobalPresetImagerySelection(),
    ...resolveGlobalPresetTerrainSelection()
  };
}

export function applyGlobalPreset(viewer: Viewer): void {
  // Keep Phase 2.9 on a single concrete preset that feeds the existing
  // Cesium-native Viewer construction path and camera/home behavior, rather
  // than growing a preset-switching shell before 2.10+ exists.
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/widgets/Source/Viewer/Viewer.js:295-303
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/widgets/Source/Viewer/Viewer.js:644-703
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/widgets/Source/Viewer/Viewer.js:747-756
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/engine/Source/Scene/Camera.js:1542-1575
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/engine/Source/Scene/Camera.js:3310-3367
  applyGlobalPresentation(viewer);
  applyCameraLanguage(viewer, GLOBAL_SCENE_PRESET.camera);
}
