import type { Viewer } from "cesium";
import { applyAtmosphereBaseline } from "./atmosphere";
import { applyCameraLanguage } from "./camera-language";
import { applyLightingBaseline } from "./lighting";
import {
  type ImagerySelectionOptions,
  resolveImagerySelection
} from "./offline-imagery";
import {
  type TerrainSelectionOptions,
  resolveTerrainSelection
} from "./offline-terrain";
import type { ScenePresetDefinition } from "./scene-preset";
import { applyStarBackground } from "./star-background";

export type ScenePresetViewerOptions = ImagerySelectionOptions &
  TerrainSelectionOptions;

function assertUnsupportedPresetValue(
  preset: ScenePresetDefinition,
  kind: string,
  value: never
): never {
  throw new Error(`Unsupported scene preset ${preset.id} ${kind}: ${String(value)}`);
}

function resolveScenePresetImagerySelection(
  preset: ScenePresetDefinition
): ImagerySelectionOptions {
  switch (preset.presentation.imageryPolicyId) {
    case "viewer-default":
      return resolveImagerySelection();
    default:
      return assertUnsupportedPresetValue(
        preset,
        "imagery policy",
        preset.presentation.imageryPolicyId
      );
  }
}

function resolveScenePresetTerrainSelection(
  preset: ScenePresetDefinition
): TerrainSelectionOptions {
  switch (preset.presentation.terrainPolicyId) {
    case "viewer-default":
      return resolveTerrainSelection();
    default:
      return assertUnsupportedPresetValue(
        preset,
        "terrain policy",
        preset.presentation.terrainPolicyId
      );
  }
}

function applyScenePresentation(
  viewer: Viewer,
  preset: ScenePresetDefinition
): void {
  switch (preset.presentation.globeStyleId) {
    case "phase2-native-baseline":
      applyAtmosphereBaseline(viewer);
      applyStarBackground(viewer);
      // Stage 2.4 remains historical evidence in this repo, but the current
      // preset runtime keeps fog and bloom dormant until they can be retuned
      // without washing out the Cesium-native baseline.
      applyLightingBaseline(viewer);
      return;
    default:
      assertUnsupportedPresetValue(
        preset,
        "globe style",
        preset.presentation.globeStyleId
      );
  }
}

export function resolveScenePresetViewerOptions(
  preset: ScenePresetDefinition
): ScenePresetViewerOptions {
  return {
    ...resolveScenePresetImagerySelection(preset),
    ...resolveScenePresetTerrainSelection(preset)
  };
}

export function applyScenePreset(
  viewer: Viewer,
  preset: ScenePresetDefinition
): void {
  // Keep Phase 2.10 on the existing Cesium-native Viewer path: preset
  // selection only swaps plain presentation and camera data, while Geocoder,
  // BaseLayerPicker, HomeButton, credit handling, timeline, and toolbar remain
  // owned by the native shell.
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/widgets/Source/Viewer/Viewer.js:295-303
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/widgets/Source/Viewer/Viewer.js:564-618
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/widgets/Source/Viewer/Viewer.js:644-703
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/widgets/Source/Viewer/Viewer.js:747-756
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/engine/Source/Scene/Camera.js:1542-1575
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/engine/Source/Scene/Camera.js:3310-3367
  applyScenePresentation(viewer, preset);
  applyCameraLanguage(viewer, preset.camera);
}
