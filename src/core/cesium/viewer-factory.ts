import { Viewer } from "cesium";
import { applyAtmosphereBaseline } from "../../features/globe/atmosphere";
import { applyLightingBaseline } from "../../features/globe/lighting";
import { applyStarBackground } from "../../features/globe/star-background";

export interface ViewerElements {
  container: Element | string;
  creditContainer?: Element | string;
  creditViewport?: Element | string;
}

export function createViewer({
  container,
  creditContainer,
  creditViewport
}: ViewerElements): Viewer {
  // Keep the first-globe stage on Cesium's higher-level Viewer shell and route
  // credits into repo-owned DOM without forking Cesium internals.
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
    creditViewport
  });

  applyAtmosphereBaseline(viewer);
  applyLightingBaseline(viewer);
  applyStarBackground(viewer);

  return viewer;
}
