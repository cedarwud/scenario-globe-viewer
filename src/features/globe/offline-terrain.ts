import {
  CesiumTerrainProvider,
  EllipsoidTerrainProvider,
  Terrain,
  type Viewer
} from "cesium";

export function createTerrainFallbackProvider(): EllipsoidTerrainProvider {
  // Keep the delivery-default terrain path offline-safe by starting from
  // Cesium's built-in ellipsoid provider, then only opt into a hosted terrain
  // source when this repo is explicitly configured to do so.
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/Documentation/OfflineGuide/README.md:3-15
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/terrain/main.js:14-18
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Core/EllipsoidTerrainProviderSpec.js:18-36
  return new EllipsoidTerrainProvider();
}

export function applyOfflineFirstTerrain(viewer: Viewer): void {
  const terrainUrl = import.meta.env.VITE_CESIUM_TERRAIN_URL?.trim();
  if (!terrainUrl) {
    return;
  }

  const fallbackProvider = viewer.terrainProvider;

  // Use Cesium's async Terrain helper for locally hosted quantized-mesh or
  // heightmap datasets, but fall back to the already-active ellipsoid path if
  // the configured endpoint cannot be created.
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/terrain/main.js:48-99
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Core/CesiumTerrainProvider.js:1191-1207
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Terrain.js:43-100
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/TerrainSpec.js:15-58
  const terrain = new Terrain(CesiumTerrainProvider.fromUrl(terrainUrl));

  terrain.readyEvent.addEventListener(() => {
    viewer.scene.requestRender();
  });

  terrain.errorEvent.addEventListener((error) => {
    console.warn("Terrain initialization failed; using ellipsoid fallback.", error);
    viewer.terrainProvider = fallbackProvider;
    viewer.scene.requestRender();
  });

  viewer.scene.setTerrain(terrain);
}
