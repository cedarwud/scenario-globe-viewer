import { Viewer } from "cesium";
import {
  DEFAULT_SCENE_PRESET_KEY,
  getScenePreset,
  type ScenePresetKey
} from "../../features/globe/scene-preset";
import {
  applyScenePreset,
  resolveScenePresetViewerOptions
} from "../../features/globe/scene-preset-runtime";

export interface ViewerElements {
  container: Element | string;
  creditContainer?: Element | string;
  creditViewport?: Element | string;
  scenePresetKey?: ScenePresetKey;
}

export function createViewer({
  container,
  creditContainer,
  creditViewport,
  scenePresetKey = DEFAULT_SCENE_PRESET_KEY
}: ViewerElements): Viewer {
  const selectedPreset = getScenePreset(scenePresetKey);
  const presetViewerOptions = resolveScenePresetViewerOptions(selectedPreset);

  // Keep the runtime on Cesium's higher-level Viewer shell and preserve its
  // native controls, imagery, terrain, and credits by default. Only override
  // providers when this repo is explicitly configured to do so.
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/offline/main.js:10-17
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:280-290
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:316-317
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:332-339
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:500-503
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:396-404
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Specs/Viewer/ViewerSpec.js:85-117
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Specs/Viewer/ViewerSpec.js:146-151
  const viewer = new Viewer(container, {
    creditContainer,
    creditViewport,
    ...presetViewerOptions
  });

  applyScenePreset(viewer, selectedPreset);

  return viewer;
}
