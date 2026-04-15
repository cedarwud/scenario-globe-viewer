import type { Viewer } from "cesium";

export function applyLightingBaseline(viewer: Viewer): void {
  const { scene } = viewer;
  const { globe } = scene;

  // Use Cesium's built-in globe-lighting controls so the day-night boundary
  // comes from upstream scene lighting instead of a repo-local shadow system.
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/lighting/main.js:1-11
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/lighting/main.js:126-139
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Globe.js:153-188
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/DynamicAtmosphereLightingTypeSpec.js:3-42
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/GlobeSpec.js:52-103
  globe.enableLighting = true;
  globe.dynamicAtmosphereLighting = true;
  globe.dynamicAtmosphereLightingFromSun = true;
  globe.lambertDiffuseMultiplier = 0.95;
}
