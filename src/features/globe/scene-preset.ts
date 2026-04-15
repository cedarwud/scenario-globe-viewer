export interface SceneRectangleDegrees {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface SceneOrientationDegrees {
  heading: number;
  pitch: number;
  roll: number;
}

export interface SceneCameraFlightDefinition {
  durationSeconds: number;
  maximumHeight?: number;
  pitchAdjustHeight?: number;
}

export interface SceneRectangleDestination {
  kind: "rectangleDegrees";
  rectangle: SceneRectangleDegrees;
}

export type SceneCameraDestination = SceneRectangleDestination;

export interface SceneCameraDefinition {
  destination: SceneCameraDestination;
  defaultViewFactor?: number;
  orientation?: SceneOrientationDegrees;
  flight?: SceneCameraFlightDefinition;
}

export type SceneGlobeStyleId = "phase2-native-baseline";
export type SceneProviderPolicyId = "viewer-default";

export interface ScenePresentationDefinition {
  globeStyleId: SceneGlobeStyleId;
  imageryPolicyId: SceneProviderPolicyId;
  terrainPolicyId: SceneProviderPolicyId;
}

export interface ScenePresetDefinition {
  id: string;
  label: string;
  presentation: ScenePresentationDefinition;
  camera: SceneCameraDefinition;
}

// Keep the first repo-local preset seam plain-data so later phases can select
// views and presentation profiles without leaking Cesium runtime classes into
// repo contracts. Phase 2.8 stops here on purpose: replay, overlay, satellite,
// fixture, and site-hook contracts land in later phases.
// Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Camera.js:1542-1575
// Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Camera.js:3310-3367
// Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/HomeButton/HomeButtonViewModel.js:13-26
// Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:281-304
export const CESIUM_NATIVE_BASELINE_SCENE_PRESET = {
  id: "cesium-native-baseline",
  label: "Cesium Native Baseline",
  presentation: {
    globeStyleId: "phase2-native-baseline",
    imageryPolicyId: "viewer-default",
    terrainPolicyId: "viewer-default"
  },
  camera: {
    destination: {
      kind: "rectangleDegrees",
      rectangle: {
        west: -145.0,
        south: -10.0,
        east: 35.0,
        north: 78.0
      }
    },
    defaultViewFactor: 0.18,
    orientation: {
      heading: 14.0,
      pitch: -78.0,
      roll: 0.0
    },
    flight: {
      durationSeconds: 2.6,
      maximumHeight: 22_000_000.0,
      pitchAdjustHeight: 8_500_000.0
    }
  }
} as const satisfies ScenePresetDefinition;
