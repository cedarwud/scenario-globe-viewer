# Scene Preset Contract

## Purpose

`scene-preset` is the repo-owned plain-data seam for choosing globe framing and presentation policy without introducing a repo-local viewer shell. In the current repo state, it fixes which preset keys exist, what data a preset may carry, and where preset ownership stops.

## Public Shape

Current public source of truth: `src/features/globe/scene-preset.ts`.

```ts
type ScenePresetKey = "global" | "regional" | "site";

interface ScenePresetDefinition {
  id: string;
  label: string;
  presentation: {
    globeStyleId: "phase2-native-baseline";
    imageryPolicyId: "viewer-default";
    terrainPolicyId: "viewer-default";
  };
  camera: {
    destination: {
      kind: "rectangleDegrees";
      rectangle: {
        west: number;
        south: number;
        east: number;
        north: number;
      };
    };
    defaultViewFactor?: number;
    orientation?: {
      heading: number;
      pitch: number;
      roll: number;
    };
    flight?: {
      durationSeconds: number;
      maximumHeight?: number;
      pitchAdjustHeight?: number;
    };
  };
  site?: {
    tiles3d?: {
      source: "configured-url";
      maximumScreenSpaceError?: number;
    };
  };
}
```

Current concrete preset map:

- `global`
- `regional`
- `site`

`global` is also the default bootstrap fallback when `scenePreset` is missing or invalid.

## Plain-Data Boundary

This contract is intentionally serializable. Presets carry only repo-owned data for:

- presentation policy ids
- camera rectangle/orientation/flight data
- an optional site-hook description

This contract does not expose Cesium runtime classes such as `Viewer`, `Camera`, `Rectangle`, `Cartesian3`, `JulianDate`, or `Cesium3DTileset`.

The runtime conversion happens after preset resolution:

- `createViewer(...)` resolves the selected preset
- `resolveScenePresetViewerOptions(...)` maps plain presentation ids onto native viewer options
- `applyScenePreset(...)` applies the camera/presentation data and optional site hook on the native Cesium runtime path

## Ownership Boundary

`scene-preset` owns:

- which repo-local preset keys exist
- camera framing intent
- presentation-profile selection ids
- whether the `site` preset exposes an optional 3D tiles contact point

`scene-preset` does not own:

- native shell controls such as `Geocoder`, `BaseLayerPicker`, `HomeButton`, timeline, toolbar, or credits
- replay-clock behavior
- HUD controls or panel visibility policy
- overlay-manager or satellite contracts
- fixture ingestion
- OSM Buildings showcase selection

The active runtime still selects presets only at bootstrap through the query-driven `scenePreset` path in `src/main.ts`. There is no repo-owned preset switcher UI.

## Site Hook Boundary

Only the `site` preset currently carries a `site.tiles3d` block, and that block is still narrow:

- source is fixed to `configured-url`
- the hook is optional
- it remains a native Cesium 3D Tiles runtime path when enabled

Current behavior boundary:

- without `VITE_CESIUM_SITE_TILESET_URL`, the site hook stays dormant
- with that URL configured, the same hook can back the separate formal site dataset MVP
- if the explicit OSM showcase is active, the configured site hook is blocked

That means the formal site dataset line reuses the existing `site` hook, but it does not widen the preset contract beyond the optional configured-url seam already present in Phase 2.11.

## OSM Showcase Separation

The OSM Buildings showcase is not part of the preset contract.

- showcase selection is a separate bootstrap input: `buildingShowcase`
- showcase activation does not add a new preset key
- showcase activation does not redefine `site`
- showcase-only behavior must stay separate from the formal site dataset line and from the default Phase 2.12 dormant-hook baseline

## Current Repo State

In the current repo state:

- `SCENE_PRESETS` contains only `global`, `regional`, and `site`
- all three presets reuse the same presentation policy ids: `phase2-native-baseline` plus `viewer-default` imagery and terrain policy ids
- the contract remains plain-data only
- preset selection stays bootstrap-time and query-driven
- the native viewer shell remains the owner of controls and credits
- the separate formal site dataset MVP uses the existing `site` hook rather than a new preset shape

## Non-Goals And Not-Yet-Implemented

This contract does not currently include:

- a preset-management UI
- per-preset overlay configuration
- replay or HUD ownership
- fixture-aware preset data
- multiple site-hook source kinds
- OSM showcase-specific preset variants
- Phase 4 ingestion behavior

## Related

- [README.md](../../README.md)
- [Architecture](../architecture.md)
- [Delivery Phases](../delivery-phases.md)
- [ADR 0002: Viewer Strategy](../decisions/0002-viewer-strategy.md)
