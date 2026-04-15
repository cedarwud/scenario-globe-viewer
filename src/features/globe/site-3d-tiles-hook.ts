import { Cesium3DTileset, type Viewer } from "cesium";
import type {
  ScenePresetDefinition,
  SceneSite3DTilesHookDefinition
} from "./scene-preset";

function resolveConfiguredSiteTilesetUrl(): string | undefined {
  const configuredUrl = import.meta.env.VITE_CESIUM_SITE_TILESET_URL?.trim();
  return configuredUrl ? configuredUrl : undefined;
}

function assertUnsupportedSiteTilesSource(
  preset: ScenePresetDefinition,
  value: never
): never {
  throw new Error(`Unsupported scene preset ${preset.id} 3D tiles source: ${String(value)}`);
}

function resolveSceneSiteTilesetUrl(
  preset: ScenePresetDefinition,
  tilesHook: SceneSite3DTilesHookDefinition
): string | undefined {
  switch (tilesHook.source) {
    case "configured-url":
      return resolveConfiguredSiteTilesetUrl();
    default:
      return assertUnsupportedSiteTilesSource(preset, tilesHook.source);
  }
}

async function loadSiteTileset(
  viewer: Viewer,
  preset: ScenePresetDefinition,
  tilesetUrl: string,
  tilesHook: SceneSite3DTilesHookDefinition
): Promise<void> {
  try {
    // Keep Phase 2.11 on Cesium's own 3D Tiles path: load an explicitly
    // configured tileset lazily through fromUrl(...) and attach it to the
    // scene's native primitive collection only when the selected site preset
    // asks for it.
    // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/engine/Source/Scene/Cesium3DTileset.js:155-200
    // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/engine/Source/Scene/Cesium3DTileset.js:2187-2208
    // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/3d-tiles-photogrammetry/main.js:3-10
    const tileset = await Cesium3DTileset.fromUrl(tilesetUrl, {
      maximumScreenSpaceError: tilesHook.maximumScreenSpaceError
    });

    if (viewer.isDestroyed()) {
      tileset.destroy();
      return;
    }

    viewer.scene.primitives.add(tileset);
    viewer.scene.requestRender();
  } catch (error) {
    console.warn(`Failed to load optional site tileset for ${preset.id}.`, error);
  }
}

export function applyOptionalSite3DTilesHook(
  viewer: Viewer,
  preset: ScenePresetDefinition
): void {
  const tilesHook = preset.site?.tiles3d;
  if (!tilesHook) {
    return;
  }

  const tilesetUrl = resolveSceneSiteTilesetUrl(preset, tilesHook);
  if (!tilesetUrl) {
    return;
  }

  void loadSiteTileset(viewer, preset, tilesetUrl, tilesHook);
}
