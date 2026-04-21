import {
  Cesium3DTileset,
  HeadingPitchRange,
  type Cesium3DTileset as Cesium3DTilesetInstance,
  type Viewer
} from "cesium";
import type {
  ScenePresetDefinition,
  SceneSite3DTilesHookDefinition
} from "./scene-preset";
import type { BuildingShowcaseKey } from "./osm-buildings-showcase";
import {
  syncDocumentTelemetry,
  truncateDocumentTelemetryDetail
} from "../telemetry/document-telemetry";

export type SiteTilesetState =
  | "dormant"
  | "loading"
  | "ready"
  | "degraded"
  | "error"
  | "blocked";

export interface SiteTilesetHookPolicy {
  buildingShowcaseKey: BuildingShowcaseKey;
}

interface ActiveSiteTilesetAttachment {
  dispose(): void;
}

const activeSiteTilesetAttachments = new WeakMap<
  Viewer,
  ActiveSiteTilesetAttachment
>();

function resolveConfiguredSiteTilesetUrl(): string | undefined {
  const configuredUrl = import.meta.env.VITE_CESIUM_SITE_TILESET_URL?.trim();
  return configuredUrl ? configuredUrl : undefined;
}

function serializeSiteTilesetError(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === "string") {
    return reason;
  }

  try {
    return JSON.stringify(reason);
  } catch {
    return "Unknown site tileset error";
  }
}

function serializeTileFailure(reason: { message?: unknown; url?: unknown }): string {
  const message =
    typeof reason.message === "string"
      ? reason.message
      : serializeSiteTilesetError(reason.message);
  const url = typeof reason.url === "string" ? reason.url : undefined;

  if (url) {
    return `Tile/content failure after attachment: ${message} (${url})`;
  }

  return `Tile/content failure after attachment: ${message}`;
}

function syncSiteTilesetDataset(
  state: SiteTilesetState,
  detail?: string
): void {
  syncDocumentTelemetry({
    siteTilesetState: state,
    siteTilesetDetail: truncateDocumentTelemetryDetail(detail)
  });
}

function syncSiteTilesetState(
  viewer: Viewer,
  state: SiteTilesetState,
  detail?: string
): void {
  syncSiteTilesetDataset(state, detail);

  if (!viewer.isDestroyed()) {
    viewer.scene.requestRender();
  }
}

function destroySiteTileset(
  viewer: Viewer,
  tileset: Cesium3DTilesetInstance
): void {
  if (!viewer.isDestroyed()) {
    viewer.scene.primitives.remove(tileset);
  }

  if (!tileset.isDestroyed()) {
    tileset.destroy();
  }
}

function frameConfiguredSiteTileset(
  viewer: Viewer,
  tileset: Cesium3DTilesetInstance
): Promise<boolean> {
  if (viewer.isDestroyed()) {
    return Promise.resolve(false);
  }

  viewer.camera.cancelFlight();

  // Keep the dataset-backed site slice on Cesium's own camera path and hand
  // framing back to the Viewer shell once the configured tileset is attached.
  // That avoids leaving the camera on the preset-level generic site flight when
  // the configured dataset lives outside that broad site rectangle and keeps
  // the framing behavior inside Cesium's native zoom/view path instead of a
  // repo-local controller.
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/widgets/Source/Viewer/Viewer.js:1974-1992
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/engine/Source/Widget/CesiumWidget.js:1444-1464
  return viewer.zoomTo(
    tileset,
    new HeadingPitchRange(0.0, -0.5, 0.0)
  );
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
  tilesHook: SceneSite3DTilesHookDefinition,
  attachment: ActiveSiteTilesetAttachment
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

    if (
      viewer.isDestroyed() ||
      activeSiteTilesetAttachments.get(viewer) !== attachment
    ) {
      tileset.destroy();
      return;
    }

    let initialTilesLoaded = false;
    let hasVisibleTileContent = false;
    let failureCount = 0;
    let latestFailureDetail: string | undefined;
    let removeTileLoadListener: (() => void) | undefined;
    let removeTileVisibleListener: (() => void) | undefined;
    let removeInitialTilesLoadedListener: (() => void) | undefined;
    let removeTileFailedListener: (() => void) | undefined;
    let hasReportedVisibleReadyState = false;

    const removeTilesetListeners = () => {
      removeTileFailedListener?.();
      removeInitialTilesLoadedListener?.();
      removeTileVisibleListener?.();
      removeTileLoadListener?.();
      removeTileFailedListener = undefined;
      removeInitialTilesLoadedListener = undefined;
      removeTileVisibleListener = undefined;
      removeTileLoadListener = undefined;
    };

    const syncReadyStateFromVisibleContent = () => {
      if (
        viewer.isDestroyed() ||
        activeSiteTilesetAttachments.get(viewer) !== wrappedAttachment ||
        !hasVisibleTileContent ||
        hasReportedVisibleReadyState
      ) {
        return;
      }

      hasReportedVisibleReadyState = true;
      syncSiteTilesetState(
        viewer,
        failureCount > 0 ? "degraded" : "ready",
        failureCount > 0
          ? latestFailureDetail
          : "Loaded configured site dataset."
      );
    };

    const wrappedAttachment: ActiveSiteTilesetAttachment = {
      dispose() {
        if (activeSiteTilesetAttachments.get(viewer) === wrappedAttachment) {
          activeSiteTilesetAttachments.delete(viewer);
        }

        removeTilesetListeners();
        destroySiteTileset(viewer, tileset);
        syncSiteTilesetDataset("dormant");
      }
    };

    activeSiteTilesetAttachments.set(viewer, wrappedAttachment);
    removeTileLoadListener = tileset.tileLoad.addEventListener(() => {
      hasVisibleTileContent = true;
      syncReadyStateFromVisibleContent();
    });
    removeTileVisibleListener = tileset.tileVisible.addEventListener(() => {
      hasVisibleTileContent = true;
      syncReadyStateFromVisibleContent();
    });
    removeInitialTilesLoadedListener = tileset.initialTilesLoaded.addEventListener(() => {
      if (
        viewer.isDestroyed() ||
        activeSiteTilesetAttachments.get(viewer) !== wrappedAttachment
      ) {
        return;
      }

      initialTilesLoaded = true;
      syncSiteTilesetState(
        viewer,
        failureCount > 0 ? "degraded" : "ready",
        failureCount > 0
          ? latestFailureDetail
          : "Loaded configured site dataset."
      );
    });
    removeTileFailedListener = tileset.tileFailed.addEventListener((failure) => {
      if (
        viewer.isDestroyed() ||
        activeSiteTilesetAttachments.get(viewer) !== wrappedAttachment
      ) {
        return;
      }

      failureCount += 1;
      latestFailureDetail =
        failureCount > 1
          ? `Encountered ${failureCount} site dataset tile/content failures. Last: ${serializeTileFailure(failure)}`
          : serializeTileFailure(failure);
      syncSiteTilesetState(
        viewer,
        initialTilesLoaded || hasVisibleTileContent ? "degraded" : "error",
        latestFailureDetail
      );
      console.warn(
        `Configured site dataset reported tile/content failure for ${preset.id}.`,
        failure
      );
    });

    viewer.scene.primitives.add(tileset);
    void frameConfiguredSiteTileset(viewer, tileset).then((framed) => {
      if (
        viewer.isDestroyed() ||
        activeSiteTilesetAttachments.get(viewer) !== wrappedAttachment ||
        !framed
      ) {
        return;
      }

      viewer.scene.requestRender();
    });
    viewer.scene.requestRender();
  } catch (error) {
    if (
      viewer.isDestroyed() ||
      activeSiteTilesetAttachments.get(viewer) !== attachment
    ) {
      return;
    }

    syncSiteTilesetState(
      viewer,
      "error",
      serializeSiteTilesetError(error)
    );
    console.warn(`Failed to load optional site tileset for ${preset.id}.`, error);
  }
}

export function applyOptionalSite3DTilesHook(
  viewer: Viewer,
  preset: ScenePresetDefinition,
  policy: SiteTilesetHookPolicy
): void {
  activeSiteTilesetAttachments.get(viewer)?.dispose();

  const tilesHook = preset.site?.tiles3d;
  if (!tilesHook) {
    syncSiteTilesetDataset("dormant");
    return;
  }

  const tilesetUrl = resolveSceneSiteTilesetUrl(preset, tilesHook);
  if (!tilesetUrl) {
    syncSiteTilesetDataset("dormant");
    return;
  }

  if (policy.buildingShowcaseKey === "osm") {
    syncSiteTilesetDataset(
      "blocked",
      "Blocked configured site tileset hook because OSM Buildings showcase is active."
    );
    return;
  }

  syncSiteTilesetDataset("loading");
  const attachment: ActiveSiteTilesetAttachment = {
    dispose() {
      if (activeSiteTilesetAttachments.get(viewer) === attachment) {
        activeSiteTilesetAttachments.delete(viewer);
      }

      syncSiteTilesetDataset("dormant");
    }
  };
  activeSiteTilesetAttachments.set(viewer, attachment);
  void loadSiteTileset(viewer, preset, tilesetUrl, tilesHook, attachment);
}
