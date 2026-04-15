import type { Viewer } from "cesium";
import {
  applyScenePreset,
  resolveScenePresetViewerOptions,
  type ScenePresetViewerOptions
} from "./scene-preset-runtime";
import { CESIUM_NATIVE_BASELINE_SCENE_PRESET } from "./scene-preset";

export const GLOBAL_SCENE_PRESET = CESIUM_NATIVE_BASELINE_SCENE_PRESET;

export function resolveGlobalPresetViewerOptions(): ScenePresetViewerOptions {
  return resolveScenePresetViewerOptions(GLOBAL_SCENE_PRESET);
}

export function applyGlobalPreset(viewer: Viewer): void {
  applyScenePreset(viewer, GLOBAL_SCENE_PRESET);
}
