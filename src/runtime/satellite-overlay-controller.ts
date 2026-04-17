import type { Viewer } from "cesium";

import type { OverlayManagerState } from "../features/overlays/overlay-manager";
import type { ReplayClock } from "../features/time";
import { createRuntimeOverlayManager } from "./runtime-overlay-manager";
import {
  createWalkerPointOverlayAdapter,
  type WalkerPointOverlayRuntimeAdapter,
  type WalkerPointOverlayRuntimeState
} from "./walker-point-overlay-adapter";

export type SatelliteOverlayMode = "off" | "walker-points";
export type SatelliteOverlaySource = "default-off" | "runtime";
export type SatelliteOverlayStatus = "disabled" | "loading" | "ready" | "error";

export interface SatelliteOverlayControllerState {
  detail: string | null;
  labelCount: number;
  mode: SatelliteOverlayMode;
  overlayManager: OverlayManagerState;
  pathCount: number;
  pointCount: number;
  polylineCount: number;
  renderMode: "point-label-polyline";
  sampleTime: string | number | null;
  satCount: number;
  source: SatelliteOverlaySource;
  status: SatelliteOverlayStatus;
  dataSourceAttached: boolean;
  visible: boolean;
}

export interface SatelliteOverlayController {
  getState(): SatelliteOverlayControllerState;
  setMode(mode: SatelliteOverlayMode): Promise<SatelliteOverlayControllerState>;
  toggle(): Promise<SatelliteOverlayControllerState>;
  dispose(): Promise<void>;
}

const WALKER_OVERLAY_ID = "walker-points";
const WALKER_TLE_FIXTURE_PATH =
  "fixtures/satellites/walker-o6-s3-i45-h698.tle";

function serializeOverlayError(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === "string") {
    return reason;
  }

  try {
    return JSON.stringify(reason);
  } catch {
    return "Unknown overlay error";
  }
}

function createEmptyRuntimeState(): WalkerPointOverlayRuntimeState {
  return {
    dataSourceAttached: false,
    entityCount: 0,
    pointCount: 0,
    labelCount: 0,
    pathCount: 0,
    polylineCount: 0,
    sampleTime: null,
    satCount: 0,
    visible: false
  };
}

function createControllerState(
  mode: SatelliteOverlayMode,
  source: SatelliteOverlaySource,
  status: SatelliteOverlayStatus,
  detail: string | null,
  overlayManager: OverlayManagerState,
  runtimeState: WalkerPointOverlayRuntimeState
): SatelliteOverlayControllerState {
  return {
    detail,
    labelCount: runtimeState.labelCount,
    mode,
    overlayManager,
    pathCount: runtimeState.pathCount,
    pointCount: runtimeState.pointCount,
    polylineCount: runtimeState.polylineCount,
    renderMode: "point-label-polyline",
    sampleTime: runtimeState.sampleTime,
    satCount: runtimeState.satCount,
    source,
    status,
    dataSourceAttached: runtimeState.dataSourceAttached,
    visible: runtimeState.visible
  };
}

function syncOverlayDataset(state: SatelliteOverlayControllerState): void {
  const { dataset } = document.documentElement;
  dataset.satelliteOverlayMode = state.mode;
  dataset.satelliteOverlaySource = state.source;
  dataset.satelliteOverlayState = state.status;
  dataset.satelliteOverlayPointCount = String(state.pointCount);
  dataset.satelliteOverlayRenderMode = state.renderMode;

  if (state.detail) {
    dataset.satelliteOverlayDetail = state.detail.slice(0, 240);
  } else {
    delete dataset.satelliteOverlayDetail;
  }
}

function resolveWalkerFixtureUrl(): string {
  const publicBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(WALKER_TLE_FIXTURE_PATH, publicBaseUrl).toString();
}

async function loadWalkerFixtureText(): Promise<string> {
  const response = await fetch(resolveWalkerFixtureUrl());
  if (!response.ok) {
    throw new Error(
      `Failed to load walker overlay fixture: ${response.status} ${response.statusText}`
    );
  }

  return await response.text();
}

export function createSatelliteOverlayController({
  viewer,
  replayClock
}: {
  viewer: Viewer;
  replayClock: ReplayClock;
}): SatelliteOverlayController {
  const overlayManager = createRuntimeOverlayManager();
  let activeAdapter: WalkerPointOverlayRuntimeAdapter | undefined;
  let pendingAdapter: WalkerPointOverlayRuntimeAdapter | undefined;
  let currentMode: SatelliteOverlayMode = "off";
  let currentSource: SatelliteOverlaySource = "default-off";
  let currentStatus: SatelliteOverlayStatus = "disabled";
  let currentDetail: string | null = null;
  let desiredMode: SatelliteOverlayMode = "off";
  let desiredSource: SatelliteOverlaySource = "default-off";
  let transitionPromise: Promise<void> | undefined;

  function readState(): SatelliteOverlayControllerState {
    return createControllerState(
      currentMode,
      currentSource,
      currentStatus,
      currentDetail,
      overlayManager.getState(),
      activeAdapter?.getRuntimeState() ?? createEmptyRuntimeState()
    );
  }

  function commitState(): SatelliteOverlayControllerState {
    const state = readState();
    syncOverlayDataset(state);
    return state;
  }

  async function cleanupWalkerOverlayResidue(
    adapters: ReadonlyArray<WalkerPointOverlayRuntimeAdapter | undefined>
  ): Promise<string | null> {
    const cleanupErrors: string[] = [];

    if (
      overlayManager
        .getState()
        .entries.some((entry) => entry.overlayId === WALKER_OVERLAY_ID)
    ) {
      try {
        await overlayManager.detach(WALKER_OVERLAY_ID);
      } catch (error) {
        cleanupErrors.push(
          `overlay manager detach failed: ${serializeOverlayError(error)}`
        );
      }
    }

    const uniqueAdapters = new Set<WalkerPointOverlayRuntimeAdapter>();
    for (const adapter of adapters) {
      if (adapter) {
        uniqueAdapters.add(adapter);
      }
    }

    for (const adapter of uniqueAdapters) {
      try {
        await adapter.dispose();
      } catch (error) {
        cleanupErrors.push(
          `overlay adapter dispose failed: ${serializeOverlayError(error)}`
        );
      }
    }

    if (cleanupErrors.length === 0) {
      return null;
    }

    return cleanupErrors.join("; ");
  }

  async function disableOverlay(source: SatelliteOverlaySource): Promise<void> {
    const adapterPendingDispose = pendingAdapter;
    pendingAdapter = undefined;

    const adapterPendingDetach = activeAdapter;
    activeAdapter = undefined;
    const cleanupError = await cleanupWalkerOverlayResidue([
      adapterPendingDispose,
      adapterPendingDetach
    ]);

    currentMode = "off";
    currentSource = source;

    if (cleanupError) {
      currentStatus = "error";
      currentDetail = cleanupError;
      commitState();
      throw new Error(cleanupError);
    }

    currentStatus = "disabled";
    currentDetail = null;
    commitState();
  }

  function isWalkerOverlayStillDesired(
    adapter: WalkerPointOverlayRuntimeAdapter
  ): boolean {
    return pendingAdapter === adapter && desiredMode === "walker-points";
  }

  async function enableWalkerOverlay(
    source: SatelliteOverlaySource
  ): Promise<void> {
    if (activeAdapter) {
      currentMode = "walker-points";
      currentSource = source;
      currentStatus = "ready";
      currentDetail = null;
      commitState();
      return;
    }

    currentMode = "walker-points";
    currentSource = source;
    currentStatus = "loading";
    currentDetail = null;
    commitState();

    const adapter = createWalkerPointOverlayAdapter(viewer);
    pendingAdapter = adapter;

    try {
      const fixtureText = await loadWalkerFixtureText();

      if (!isWalkerOverlayStillDesired(adapter)) {
        if (pendingAdapter === adapter) {
          pendingAdapter = undefined;
        }
        const cleanupError = await cleanupWalkerOverlayResidue([adapter]);
        if (cleanupError) {
          throw new Error(cleanupError);
        }
        return;
      }

      adapter.attachToClock(replayClock);
      await adapter.loadFixture({
        kind: "tle",
        tleText: fixtureText
      });

      if (!isWalkerOverlayStillDesired(adapter)) {
        if (pendingAdapter === adapter) {
          pendingAdapter = undefined;
        }
        const cleanupError = await cleanupWalkerOverlayResidue([adapter]);
        if (cleanupError) {
          throw new Error(cleanupError);
        }
        return;
      }

      await overlayManager.attach(WALKER_OVERLAY_ID, adapter);
      activeAdapter = adapter;
      pendingAdapter = undefined;

      if (desiredMode !== "walker-points") {
        await disableOverlay(desiredSource);
        return;
      }

      currentStatus = "ready";
      currentDetail = null;
      commitState();
    } catch (error) {
      const shouldSurfaceError =
        pendingAdapter === adapter &&
        desiredMode === "walker-points" &&
        desiredSource === source;

      if (pendingAdapter === adapter) {
        pendingAdapter = undefined;
      }

      if (activeAdapter === adapter) {
        activeAdapter = undefined;
      }

      const cleanupError = await cleanupWalkerOverlayResidue([adapter]);

      if (!shouldSurfaceError) {
        if (cleanupError) {
          throw new Error(cleanupError);
        }
        return;
      }

      currentMode = "walker-points";
      currentSource = source;
      currentStatus = "error";
      currentDetail = cleanupError
        ? `${serializeOverlayError(error)}; cleanup: ${cleanupError}`
        : serializeOverlayError(error);
      commitState();

      if (cleanupError) {
        throw new Error(currentDetail);
      }

      throw error;
    }
  }

  async function settleDesiredMode(): Promise<void> {
    while (true) {
      const requestedMode = desiredMode;
      const requestedSource = desiredSource;

      if (requestedMode === "off") {
        await disableOverlay(requestedSource);
        if (desiredMode === requestedMode && desiredSource === requestedSource) {
          return;
        }
        continue;
      }

      await enableWalkerOverlay(requestedSource);
      if (
        desiredMode === requestedMode &&
        desiredSource === requestedSource &&
        activeAdapter
      ) {
        return;
      }
    }
  }

  function requestStateTransition(): Promise<SatelliteOverlayControllerState> {
    if (!transitionPromise) {
      transitionPromise = settleDesiredMode().finally(() => {
        transitionPromise = undefined;
      });
    }

    return transitionPromise.then(() => readState());
  }

  commitState();

  return {
    getState(): SatelliteOverlayControllerState {
      return commitState();
    },

    async setMode(mode: SatelliteOverlayMode): Promise<SatelliteOverlayControllerState> {
      desiredMode = mode;
      desiredSource = "runtime";
      return await requestStateTransition();
    },

    async toggle(): Promise<SatelliteOverlayControllerState> {
      return await this.setMode(
        desiredMode === "off" ? "walker-points" : "off"
      );
    },

    async dispose(): Promise<void> {
      desiredMode = "off";
      desiredSource = "runtime";
      await requestStateTransition();
      await overlayManager.dispose();
    }
  };
}
