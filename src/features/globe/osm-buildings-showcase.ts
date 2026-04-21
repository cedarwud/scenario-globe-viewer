import {
  createOsmBuildingsAsync,
  type Cesium3DTileset,
  type Viewer
} from "cesium";
import {
  syncDocumentTelemetry,
  truncateDocumentTelemetryDetail
} from "../telemetry/document-telemetry";

export type BuildingShowcaseKey = "off" | "osm";
export type BuildingShowcaseSource = "default-off" | "query-param" | "env";
export type BuildingShowcaseState =
  | "disabled"
  | "loading"
  | "ready"
  | "degraded"
  | "error";

export interface BuildingShowcaseSelection {
  key: BuildingShowcaseKey;
  source: BuildingShowcaseSource;
}

interface ActiveOsmBuildingsAttachment {
  dispose(): void;
}

const BUILDING_SHOWCASE_QUERY_PARAM = "buildingShowcase";
const activeOsmBuildingsAttachments = new WeakMap<Viewer, ActiveOsmBuildingsAttachment>();

function resolveBuildingShowcaseKey(
  value: string | null | undefined
): BuildingShowcaseKey | undefined {
  switch (value?.trim().toLowerCase()) {
    case "0":
    case "false":
    case "none":
    case "off":
      return "off";
    case "osm":
    case "osm-buildings":
      return "osm";
    default:
      return undefined;
  }
}

function serializeShowcaseError(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === "string") {
    return reason;
  }

  try {
    return JSON.stringify(reason);
  } catch {
    return "Unknown OSM Buildings showcase error";
  }
}

function syncBuildingShowcaseDataset(
  selection: BuildingShowcaseSelection,
  state: BuildingShowcaseState,
  detail?: string
): void {
  syncDocumentTelemetry({
    buildingShowcase: selection.key,
    buildingShowcaseSource: selection.source,
    buildingShowcaseState: state,
    buildingShowcaseDetail: truncateDocumentTelemetryDetail(detail)
  });
}

function syncBuildingShowcaseState(
  viewer: Viewer,
  selection: BuildingShowcaseSelection,
  state: BuildingShowcaseState,
  detail?: string
): void {
  syncBuildingShowcaseDataset(selection, state, detail);

  if (!viewer.isDestroyed()) {
    viewer.scene.requestRender();
  }
}

function serializeTileFailure(reason: { message?: unknown; url?: unknown }): string {
  const message =
    typeof reason.message === "string"
      ? reason.message
      : serializeShowcaseError(reason.message);
  const url = typeof reason.url === "string" ? reason.url : undefined;

  if (url) {
    return `Tile/content failure after attachment: ${message} (${url})`;
  }

  return `Tile/content failure after attachment: ${message}`;
}

function destroyOsmBuildingsTileset(
  viewer: Viewer,
  tileset: Cesium3DTileset
): void {
  if (!viewer.isDestroyed()) {
    viewer.scene.primitives.remove(tileset);
  }

  if (!tileset.isDestroyed()) {
    tileset.destroy();
  }
}

export function resolveBuildingShowcaseSelection(): BuildingShowcaseSelection {
  const requestedQueryValue = new URLSearchParams(window.location.search).get(
    BUILDING_SHOWCASE_QUERY_PARAM
  );
  if (requestedQueryValue !== null) {
    return {
      key: resolveBuildingShowcaseKey(requestedQueryValue) ?? "off",
      source: "query-param"
    };
  }

  const configuredValue = import.meta.env.VITE_CESIUM_BUILDING_SHOWCASE?.trim();
  if (configuredValue) {
    return {
      key: resolveBuildingShowcaseKey(configuredValue) ?? "off",
      source: "env"
    };
  }

  return {
    key: "off",
    source: "default-off"
  };
}

export function mountOptionalOsmBuildingsShowcase(
  viewer: Viewer,
  selection: BuildingShowcaseSelection
): () => void {
  activeOsmBuildingsAttachments.get(viewer)?.dispose();

  if (selection.key !== "osm") {
    syncBuildingShowcaseDataset(selection, "disabled");
    return () => {};
  }

  let disposed = false;
  let mountedTileset: Cesium3DTileset | undefined;
  let hasVisibleTileContent = false;
  let initialTilesLoaded = false;
  let failureCount = 0;
  let latestFailureDetail: string | undefined;
  let removeTileLoadListener: (() => void) | undefined;
  let removeInitialTilesLoadedListener: (() => void) | undefined;
  let removeTileFailedListener: (() => void) | undefined;

  const removeTilesetListeners = () => {
    removeTileFailedListener?.();
    removeInitialTilesLoadedListener?.();
    removeTileLoadListener?.();
    removeTileFailedListener = undefined;
    removeInitialTilesLoadedListener = undefined;
    removeTileLoadListener = undefined;
  };

  const attachment: ActiveOsmBuildingsAttachment = {
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      if (activeOsmBuildingsAttachments.get(viewer) === attachment) {
        activeOsmBuildingsAttachments.delete(viewer);
      }

      removeTilesetListeners();

      if (mountedTileset) {
        destroyOsmBuildingsTileset(viewer, mountedTileset);
        mountedTileset = undefined;
      }

      syncBuildingShowcaseDataset(selection, "disabled");
    }
  };

  activeOsmBuildingsAttachments.set(viewer, attachment);
  syncBuildingShowcaseDataset(selection, "loading");

  void (async () => {
    try {
      // Keep the showcase path on Cesium's own OSM Buildings loader: resolve
      // the upstream ion-backed tileset through createOsmBuildingsAsync() and
      // attach the resulting primitive to the scene without inventing a repo-
      // local buildings pipeline or replacing Cesium's credit handling.
      // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/engine/Source/Scene/createOsmBuildingsAsync.js:1-79
      // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/engine/Source/Scene/Cesium3DTileset.js:2135-2140
      // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/cesium-osm-buildings/main.js:1-8
      const tileset = await createOsmBuildingsAsync();

      if (disposed || viewer.isDestroyed()) {
        tileset.destroy();
        return;
      }

      mountedTileset = tileset;
      removeTileLoadListener = tileset.tileLoad.addEventListener(() => {
        hasVisibleTileContent = true;
      });
      removeInitialTilesLoadedListener = tileset.initialTilesLoaded.addEventListener(() => {
        if (disposed || viewer.isDestroyed()) {
          return;
        }

        initialTilesLoaded = true;
        if (failureCount > 0) {
          syncBuildingShowcaseState(
            viewer,
            selection,
            hasVisibleTileContent ? "degraded" : "error",
            latestFailureDetail
          );
          return;
        }

        syncBuildingShowcaseState(viewer, selection, "ready");
      });
      removeTileFailedListener = tileset.tileFailed.addEventListener((failure) => {
        if (disposed || viewer.isDestroyed()) {
          return;
        }

        failureCount += 1;
        latestFailureDetail =
          failureCount > 1
            ? `Encountered ${failureCount} OSM Buildings tile/content failures. Last: ${serializeTileFailure(failure)}`
            : serializeTileFailure(failure);
        syncBuildingShowcaseState(
          viewer,
          selection,
          initialTilesLoaded || hasVisibleTileContent ? "degraded" : "error",
          latestFailureDetail
        );
        console.warn(
          "Optional Cesium OSM Buildings showcase reported tile/content failure after attachment.",
          failure
        );
      });

      viewer.scene.primitives.add(tileset);
      viewer.scene.requestRender();
    } catch (error) {
      if (disposed || viewer.isDestroyed()) {
        return;
      }

      syncBuildingShowcaseState(
        viewer,
        selection,
        "error",
        serializeShowcaseError(error)
      );
      console.warn("Failed to load optional Cesium OSM Buildings showcase.", error);
    }
  })();

  return () => {
    attachment.dispose();
  };
}
