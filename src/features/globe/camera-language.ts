import {
  Camera,
  Cartesian3,
  EasingFunction,
  Math as CesiumMath,
  Rectangle,
  SceneMode,
  type Viewer
} from "cesium";
import type {
  SceneCameraDefinition,
  SceneCameraDestination,
  SceneOrientationDegrees
} from "./scene-preset";

function resolveRectangleDestination(destination: SceneCameraDestination): Rectangle {
  return Rectangle.fromDegrees(
    destination.rectangle.west,
    destination.rectangle.south,
    destination.rectangle.east,
    destination.rectangle.north
  );
}

function resolveOrientation(orientation: SceneOrientationDegrees | undefined) {
  if (!orientation) {
    return undefined;
  }

  return {
    heading: CesiumMath.toRadians(orientation.heading),
    pitch: CesiumMath.toRadians(orientation.pitch),
    roll: CesiumMath.toRadians(orientation.roll)
  };
}

const scaledDestinationScratch = new Cartesian3();
const normalizedDestinationScratch = new Cartesian3();
const homeRouteOverrideViewers = new WeakSet<Viewer>();

function resolveFlightDestination(
  viewer: Viewer,
  camera: SceneCameraDefinition
): Rectangle | Cartesian3 {
  const rectangle = resolveRectangleDestination(camera.destination);
  const defaultViewFactor = camera.defaultViewFactor;

  if (typeof defaultViewFactor !== "number") {
    return rectangle;
  }

  const destination = viewer.camera.getRectangleCameraCoordinates(
    rectangle,
    scaledDestinationScratch
  );
  let magnitude = Cartesian3.magnitude(destination);
  magnitude += magnitude * defaultViewFactor;

  return Cartesian3.multiplyByScalar(
    Cartesian3.normalize(destination, normalizedDestinationScratch),
    magnitude,
    scaledDestinationScratch
  );
}

function flyCameraDefinition(
  viewer: Viewer,
  camera: SceneCameraDefinition,
  duration: number | undefined
): void {
  viewer.camera.flyTo({
    destination: resolveFlightDestination(viewer, camera),
    orientation: resolveOrientation(camera.orientation),
    duration,
    maximumHeight: camera.flight?.maximumHeight,
    pitchAdjustHeight: camera.flight?.pitchAdjustHeight,
    easingFunction: EasingFunction.CUBIC_IN_OUT,
    complete: () => {
      viewer.scene.requestRender();
    }
  });
}

export function applyCameraLanguage(viewer: Viewer, camera: SceneCameraDefinition): void {
  const homeRectangle = resolveRectangleDestination(camera.destination);
  const homeDurationSeconds = camera.flight?.durationSeconds;

  // Keep the phase-2.9 camera work on Cesium's own home-view and flyTo
  // surfaces: the global preset only supplies plain rectangle/orientation/flight
  // data and lets Cesium's native home button keep driving the shell behavior.
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/engine/Source/Scene/Camera.js:290-303
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/engine/Source/Scene/Camera.js:1542-1575
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/engine/Source/Scene/Camera.js:3310-3367
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/widgets/Source/Viewer/Viewer.js:599-617
  Camera.DEFAULT_VIEW_RECTANGLE = homeRectangle;
  Camera.DEFAULT_VIEW_FACTOR = camera.defaultViewFactor ?? Camera.DEFAULT_VIEW_FACTOR;

  if (viewer.homeButton) {
    if (typeof homeDurationSeconds === "number") {
      viewer.homeButton.viewModel.duration = homeDurationSeconds;
    }

    viewer.homeButton.viewModel.command.beforeExecute.addEventListener((commandInfo) => {
      if (homeRouteOverrideViewers.has(viewer)) {
        return;
      }

      if (viewer.scene.mode !== SceneMode.SCENE3D) {
        return;
      }

      commandInfo.cancel = true;
      flyCameraDefinition(
        viewer,
        camera,
        viewer.homeButton?.viewModel.duration ?? homeDurationSeconds
      );
    });
  }

  if (viewer.scene.mode === SceneMode.SCENE3D) {
    flyCameraDefinition(viewer, camera, homeDurationSeconds);
  }
}

export function mountHomeButtonRouteOverride(
  viewer: Viewer,
  href: string
): () => void {
  const homeButtonCommand = viewer.homeButton?.viewModel.command;
  if (!homeButtonCommand) {
    return () => {};
  }

  homeRouteOverrideViewers.add(viewer);
  const removeBeforeExecuteListener =
    homeButtonCommand.beforeExecute.addEventListener((commandInfo) => {
      commandInfo.cancel = true;
      window.location.assign(href);
    });

  return () => {
    removeBeforeExecuteListener();
    homeRouteOverrideViewers.delete(viewer);
  };
}
