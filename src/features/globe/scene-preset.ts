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

export type SceneSite3DTilesSource = "configured-url";

export interface SceneSite3DTilesHookDefinition {
  source: SceneSite3DTilesSource;
  maximumScreenSpaceError?: number;
}

export interface SceneSiteDefinition {
  tiles3d?: SceneSite3DTilesHookDefinition;
}

export interface ScenePresetDefinition {
  id: string;
  label: string;
  presentation: ScenePresentationDefinition;
  camera: SceneCameraDefinition;
  site?: SceneSiteDefinition;
}

export type ScenePresetKey = "global" | "regional" | "site";

export const DEFAULT_SCENE_PRESET_KEY = "global";

// Keep the repo-local preset seam plain-data so later phases can select views
// and presentation profiles without leaking Cesium runtime classes into repo
// contracts. Phase 2.11 still stops at site framing plus an optional 3D tiles
// contact point; replay, overlay, satellite, fixture, and richer site/data
// contracts remain later work.
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
        west: -170.0,
        south: -60.0,
        east: 170.0,
        north: 60.0
      }
    },
    defaultViewFactor: 0.32,
    orientation: {
      heading: 0.0,
      pitch: -90.0,
      roll: 0.0
    },
    flight: {
      durationSeconds: 2.6,
      maximumHeight: 22_000_000.0,
      pitchAdjustHeight: 8_500_000.0
    }
  }
} as const satisfies ScenePresetDefinition;

export const CESIUM_NATIVE_REGIONAL_SCENE_PRESET = {
  id: "cesium-native-regional-focus",
  label: "Regional Focus",
  presentation: {
    globeStyleId: "phase2-native-baseline",
    imageryPolicyId: "viewer-default",
    terrainPolicyId: "viewer-default"
  },
  camera: {
    destination: {
      kind: "rectangleDegrees",
      rectangle: {
        west: 105.0,
        south: 5.0,
        east: 152.0,
        north: 42.0
      }
    },
    defaultViewFactor: 0.08,
    orientation: {
      heading: 9.0,
      pitch: -66.0,
      roll: 0.0
    },
    flight: {
      durationSeconds: 2.2,
      maximumHeight: 9_500_000.0,
      pitchAdjustHeight: 3_800_000.0
    }
  }
} as const satisfies ScenePresetDefinition;

export const CESIUM_NATIVE_SITE_SCENE_PRESET = {
  id: "cesium-native-site-focus",
  label: "Site Focus",
  presentation: {
    globeStyleId: "phase2-native-baseline",
    imageryPolicyId: "viewer-default",
    terrainPolicyId: "viewer-default"
  },
  camera: {
    destination: {
      kind: "rectangleDegrees",
      rectangle: {
        west: 121.44,
        south: 24.99,
        east: 121.63,
        north: 25.11
      }
    },
    defaultViewFactor: 0.02,
    orientation: {
      heading: 18.0,
      pitch: -52.0,
      roll: 0.0
    },
    flight: {
      durationSeconds: 1.8,
      maximumHeight: 650_000.0,
      pitchAdjustHeight: 220_000.0
    }
  },
  site: {
    tiles3d: {
      source: "configured-url",
      maximumScreenSpaceError: 10
    }
  }
} as const satisfies ScenePresetDefinition;

// Phase 2.11 grows the first concrete three-preset structure, but keeps the
// site path narrow: camera/presentation reuse the existing seam, and the
// optional 3D tiles hook only points at a configured URL. Replay, overlay,
// adapter, ingestion, and satellite-specific contracts remain later work.
export const SCENE_PRESETS = {
  global: CESIUM_NATIVE_BASELINE_SCENE_PRESET,
  regional: CESIUM_NATIVE_REGIONAL_SCENE_PRESET,
  site: CESIUM_NATIVE_SITE_SCENE_PRESET
} as const satisfies Record<ScenePresetKey, ScenePresetDefinition>;

export function resolveScenePresetKey(
  value: string | null | undefined
): ScenePresetKey {
  switch (value) {
    case "global":
    case "regional":
    case "site":
      return value;
    default:
      return DEFAULT_SCENE_PRESET_KEY;
  }
}

export function getScenePreset(key: ScenePresetKey): ScenePresetDefinition {
  return SCENE_PRESETS[key];
}
