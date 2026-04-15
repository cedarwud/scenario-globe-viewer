import { Viewer } from "cesium";

export function createViewer(container: Element | string): Viewer {
  // Keep the first-globe stage on Cesium's higher-level Viewer shell before any
  // repo-local widget pruning or credits wrapping begins.
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/offline/main.js:10-17
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:332-339
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:396-404
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Specs/Viewer/ViewerSpec.js:85-117
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Specs/Viewer/ViewerSpec.js:146-151
  return new Viewer(container);
}
