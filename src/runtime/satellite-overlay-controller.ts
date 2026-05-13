import type { Viewer } from "cesium";

import type { SatelliteFixture } from "../features/satellites";
import type { OverlayManagerState } from "../features/overlays/overlay-manager";
import {
  syncDocumentTelemetry,
  truncateDocumentTelemetryDetail
} from "../features/telemetry/document-telemetry";
import type { ReplayClock } from "../features/time";
import {
  LEO_SCALE_OVERLAY_MODE,
  MULTI_ORBIT_SCALE_OVERLAY_MODE,
  type OverlayOrbitClassCounts
} from "./leo-scale-overlay-fixture";
import {
  createLeoScalePointPrimitiveOverlayAdapter,
  type LeoScalePointPrimitiveOverlayRuntimeAdapter
} from "./leo-scale-point-primitive-overlay-adapter";
import { createRuntimeOverlayManager } from "./runtime-overlay-manager";
import {
  createWalkerPointOverlayAdapter,
  WALKER_POINT_OVERLAY_DATA_SOURCE_NAME,
  WALKER_POINT_OVERLAY_ORBIT_CACHE_BUCKET_MS,
  WALKER_POINT_OVERLAY_ORBIT_SAMPLE_BUDGET,
  type WalkerPointOverlayRuntimeAdapter,
  type WalkerPointOverlayRuntimeState
} from "./walker-point-overlay-adapter";

export type SatelliteOverlayMode =
  | "off"
  | "walker-points"
  | "leo-scale-points"
  | "multi-orbit-scale-points";
export type SatelliteOverlaySource = "default-off" | "runtime";
export type SatelliteOverlayStatus = "disabled" | "loading" | "ready" | "error";
export type SatelliteOverlayRenderMode =
  | "point-label-polyline"
  | "leo-scale-points"
  | "multi-orbit-scale-points";

type SatelliteOverlayRuntimeAdapter =
  | WalkerPointOverlayRuntimeAdapter
  | LeoScalePointPrimitiveOverlayRuntimeAdapter;

export interface SatelliteOverlayControllerState {
  detail: string | null;
  labelCount: number;
  mode: SatelliteOverlayMode;
  orbitCacheBucket: number | null;
  orbitCacheBucketMs: number;
  orbitCachePositionCount: number;
  orbitCacheTrackCount: number;
  orbitSampleBudget: number;
  orbitClassCounts: OverlayOrbitClassCounts;
  overlayManager: OverlayManagerState;
  pathCount: number;
  pointCount: number;
  polylineCount: number;
  renderMode: SatelliteOverlayRenderMode;
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
const LEO_SCALE_OVERLAY_ID = LEO_SCALE_OVERLAY_MODE;
const MULTI_ORBIT_SCALE_OVERLAY_ID = MULTI_ORBIT_SCALE_OVERLAY_MODE;
const WALKER_TLE_FIXTURE_PATH =
  "fixtures/satellites/walker-o6-s3-i45-h698.tle";
const LEO_SCALE_PROVENANCE_PATH =
  "fixtures/satellites/leo-scale/provenance.json";
const MULTI_ORBIT_MEO_PROVENANCE_PATH =
  "fixtures/satellites/multi-orbit/meo/provenance.json";
const MULTI_ORBIT_GEO_PROVENANCE_PATH =
  "fixtures/satellites/multi-orbit/geo/provenance.json";
const MANAGED_OVERLAY_IDS = new Set([
  WALKER_OVERLAY_ID,
  LEO_SCALE_OVERLAY_ID,
  MULTI_ORBIT_SCALE_OVERLAY_ID
]);

interface LeoScaleFixtureProvenance {
  fixtureFile: string;
  epochCount: number;
  source: string;
  sourceUrl: string;
  capturedAt: string;
  subsetPolicy: string;
}

interface MultiOrbitCatalogProvenance {
  sourceId: string;
  source: string;
  sourceUrl: string;
  fixtureFile: string;
  epochCount: number;
}

interface MultiOrbitFixtureProvenance {
  orbitClass: "meo" | "geo";
  capturedAt: string;
  epochCount: number;
  targetCount: number;
  catalogs: ReadonlyArray<MultiOrbitCatalogProvenance>;
}

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
    orbitCacheBucket: null,
    orbitCacheBucketMs: WALKER_POINT_OVERLAY_ORBIT_CACHE_BUCKET_MS,
    orbitCachePositionCount: 0,
    orbitCacheTrackCount: 0,
    orbitSampleBudget: WALKER_POINT_OVERLAY_ORBIT_SAMPLE_BUDGET,
    pathCount: 0,
    polylineCount: 0,
    sampleTime: null,
    satCount: 0,
    visible: false
  };
}

function createEmptyOrbitClassCounts(): OverlayOrbitClassCounts {
  return {
    leo: 0,
    meo: 0,
    geo: 0
  };
}

function resolveOverlayRenderMode(mode: SatelliteOverlayMode): SatelliteOverlayRenderMode {
  if (mode === LEO_SCALE_OVERLAY_MODE) {
    return "leo-scale-points";
  }

  if (mode === MULTI_ORBIT_SCALE_OVERLAY_MODE) {
    return "multi-orbit-scale-points";
  }

  return "point-label-polyline";
}

function createControllerState(
  mode: SatelliteOverlayMode,
  source: SatelliteOverlaySource,
  status: SatelliteOverlayStatus,
  detail: string | null,
  orbitClassCounts: OverlayOrbitClassCounts,
  overlayManager: OverlayManagerState,
  runtimeState: WalkerPointOverlayRuntimeState
): SatelliteOverlayControllerState {
  return {
    detail,
    labelCount: runtimeState.labelCount,
    mode,
    orbitCacheBucket: runtimeState.orbitCacheBucket,
    orbitCacheBucketMs: runtimeState.orbitCacheBucketMs,
    orbitCachePositionCount: runtimeState.orbitCachePositionCount,
    orbitCacheTrackCount: runtimeState.orbitCacheTrackCount,
    orbitSampleBudget: runtimeState.orbitSampleBudget,
    orbitClassCounts,
    overlayManager,
    pathCount: runtimeState.pathCount,
    pointCount: runtimeState.pointCount,
    polylineCount: runtimeState.polylineCount,
    renderMode: resolveOverlayRenderMode(mode),
    sampleTime: runtimeState.sampleTime,
    satCount: runtimeState.satCount,
    source,
    status,
    dataSourceAttached: runtimeState.dataSourceAttached,
    visible: runtimeState.visible
  };
}

function syncOverlayDataset(state: SatelliteOverlayControllerState): void {
  syncDocumentTelemetry({
    satelliteOverlayMode: state.mode,
    satelliteOverlaySource: state.source,
    satelliteOverlayState: state.status,
    satelliteOverlayPointCount: String(state.pointCount),
    satelliteOverlayRenderMode: state.renderMode,
    satelliteOverlayLeoCount: String(state.orbitClassCounts.leo),
    satelliteOverlayMeoCount: String(state.orbitClassCounts.meo),
    satelliteOverlayGeoCount: String(state.orbitClassCounts.geo),
    satelliteOverlayDetail: truncateDocumentTelemetryDetail(state.detail ?? undefined)
  });
}

function resolvePublicFixtureUrl(relativePath: string): string {
  const publicBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(relativePath, publicBaseUrl).toString();
}

function resolveWalkerFixtureUrl(): string {
  return resolvePublicFixtureUrl(WALKER_TLE_FIXTURE_PATH);
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

async function loadLeoScaleFixture(): Promise<{
  provenance: LeoScaleFixtureProvenance;
  tleText: string;
}> {
  const provenanceResponse = await fetch(resolvePublicFixtureUrl(LEO_SCALE_PROVENANCE_PATH));
  if (!provenanceResponse.ok) {
    throw new Error(
      `Failed to load LEO scale fixture provenance: ${provenanceResponse.status} ${provenanceResponse.statusText}`
    );
  }

  const provenance = (await provenanceResponse.json()) as LeoScaleFixtureProvenance;
  if (
    typeof provenance.fixtureFile !== "string" ||
    typeof provenance.epochCount !== "number" ||
    provenance.epochCount < 500
  ) {
    throw new Error("LEO scale fixture provenance is missing the required >=500 epoch count.");
  }

  const fixtureResponse = await fetch(
    resolvePublicFixtureUrl(`fixtures/satellites/leo-scale/${provenance.fixtureFile}`)
  );
  if (!fixtureResponse.ok) {
    throw new Error(
      `Failed to load LEO scale fixture: ${fixtureResponse.status} ${fixtureResponse.statusText}`
    );
  }

  return {
    provenance,
    tleText: await fixtureResponse.text()
  };
}

async function loadMultiOrbitProvenance(
  provenancePath: string,
  orbitClass: "meo" | "geo"
): Promise<MultiOrbitFixtureProvenance> {
  const provenanceResponse = await fetch(resolvePublicFixtureUrl(provenancePath));
  if (!provenanceResponse.ok) {
    throw new Error(
      `Failed to load ${orbitClass.toUpperCase()} multi-orbit fixture provenance: ${provenanceResponse.status} ${provenanceResponse.statusText}`
    );
  }

  const provenance =
    (await provenanceResponse.json()) as MultiOrbitFixtureProvenance;
  if (
    provenance.orbitClass !== orbitClass ||
    typeof provenance.epochCount !== "number" ||
    provenance.epochCount < provenance.targetCount ||
    !Array.isArray(provenance.catalogs) ||
    provenance.catalogs.length === 0
  ) {
    throw new Error(
      `${orbitClass.toUpperCase()} multi-orbit fixture provenance is missing required catalog metadata.`
    );
  }

  return provenance;
}

async function loadMultiOrbitCatalogs(
  provenance: MultiOrbitFixtureProvenance
): Promise<
  ReadonlyArray<{
    sourceId: string;
    tleText: string;
    expectedOrbitClass: "meo" | "geo";
  }>
> {
  const catalogs = [];

  for (const catalog of provenance.catalogs) {
    const fixtureResponse = await fetch(
      resolvePublicFixtureUrl(
        `fixtures/satellites/multi-orbit/${provenance.orbitClass}/${catalog.fixtureFile}`
      )
    );
    if (!fixtureResponse.ok) {
      throw new Error(
        `Failed to load ${provenance.orbitClass.toUpperCase()} fixture ${catalog.fixtureFile}: ${fixtureResponse.status} ${fixtureResponse.statusText}`
      );
    }

    catalogs.push({
      sourceId: catalog.sourceId,
      tleText: await fixtureResponse.text(),
      expectedOrbitClass: provenance.orbitClass
    });
  }

  return catalogs;
}

async function loadMultiOrbitScaleFixture(): Promise<{
  detail: string;
  fixture: SatelliteFixture;
  orbitClassCounts: OverlayOrbitClassCounts;
}> {
  const leoFixture = await loadLeoScaleFixture();
  const meoProvenance = await loadMultiOrbitProvenance(
    MULTI_ORBIT_MEO_PROVENANCE_PATH,
    "meo"
  );
  const meoCatalogs = await loadMultiOrbitCatalogs(meoProvenance);
  const geoProvenance = await loadMultiOrbitProvenance(
    MULTI_ORBIT_GEO_PROVENANCE_PATH,
    "geo"
  );
  const geoCatalogs = await loadMultiOrbitCatalogs(geoProvenance);

  return {
    detail:
      `Loaded ${leoFixture.provenance.epochCount} LEO, ${meoProvenance.epochCount} MEO, and ${geoProvenance.epochCount} GEO public TLE records as bounded multi-orbit point primitives.`,
    fixture: {
      kind: "tle",
      catalogs: [
        {
          sourceId: "leo-starlink",
          tleText: leoFixture.tleText,
          expectedOrbitClass: "leo"
        },
        ...meoCatalogs,
        ...geoCatalogs
      ],
      propagator: "sgp4",
      epochMode: "absolute"
    },
    orbitClassCounts: {
      leo: leoFixture.provenance.epochCount,
      meo: meoProvenance.epochCount,
      geo: geoProvenance.epochCount
    }
  };
}

async function resolveOverlayFixture(
  mode: Exclude<SatelliteOverlayMode, "off">
): Promise<{
  detail: string | null;
  fixture: SatelliteFixture;
  orbitClassCounts: OverlayOrbitClassCounts;
  overlayId: string;
}> {
  if (mode === "walker-points") {
    const walkerFixtureText = await loadWalkerFixtureText();
    return {
      detail: null,
      fixture: {
        kind: "tle",
        tleText: walkerFixtureText
      },
      orbitClassCounts: {
        leo: 18,
        meo: 0,
        geo: 0
      },
      overlayId: WALKER_OVERLAY_ID
    };
  }

  if (mode === LEO_SCALE_OVERLAY_MODE) {
    const { provenance, tleText } = await loadLeoScaleFixture();
    return {
      detail: `Loaded ${provenance.epochCount} public Celestrak Starlink TLE records from ${provenance.capturedAt} as bounded route-native LEO point primitives.`,
      fixture: {
        kind: "tle",
        tleText,
        propagator: "sgp4",
        epochMode: "absolute"
      },
      orbitClassCounts: {
        leo: provenance.epochCount,
        meo: 0,
        geo: 0
      },
      overlayId: LEO_SCALE_OVERLAY_ID
    };
  }

  const multiOrbitFixture = await loadMultiOrbitScaleFixture();
  return {
    detail: multiOrbitFixture.detail,
    fixture: multiOrbitFixture.fixture,
    orbitClassCounts: multiOrbitFixture.orbitClassCounts,
    overlayId: MULTI_ORBIT_SCALE_OVERLAY_ID
  };
}

export function createSatelliteOverlayController({
  viewer,
  replayClock
}: {
  viewer: Viewer;
  replayClock: ReplayClock;
}): SatelliteOverlayController {
  const overlayManager = createRuntimeOverlayManager();
  let activeAdapter: SatelliteOverlayRuntimeAdapter | undefined;
  let pendingAdapter: SatelliteOverlayRuntimeAdapter | undefined;
  let currentMode: SatelliteOverlayMode = "off";
  let currentSource: SatelliteOverlaySource = "default-off";
  let currentStatus: SatelliteOverlayStatus = "disabled";
  let currentDetail: string | null = null;
  let currentOrbitClassCounts = createEmptyOrbitClassCounts();
  let desiredMode: SatelliteOverlayMode = "off";
  let desiredSource: SatelliteOverlaySource = "default-off";
  let transitionPromise: Promise<void> | undefined;

  function readState(): SatelliteOverlayControllerState {
    return createControllerState(
      currentMode,
      currentSource,
      currentStatus,
      currentDetail,
      currentOrbitClassCounts,
      overlayManager.getState(),
      activeAdapter?.getRuntimeState() ?? createEmptyRuntimeState()
    );
  }

  function commitState(): SatelliteOverlayControllerState {
    const state = readState();
    syncOverlayDataset(state);
    return state;
  }

  function cleanupWalkerDataSourceResidue(): string | null {
    if (viewer.isDestroyed()) {
      return null;
    }

    const cleanupErrors: string[] = [];

    for (let index = viewer.dataSources.length - 1; index >= 0; index -= 1) {
      const dataSource = viewer.dataSources.get(index);
      if (dataSource?.name !== WALKER_POINT_OVERLAY_DATA_SOURCE_NAME) {
        continue;
      }

      try {
        dataSource.show = false;
        dataSource.entities.removeAll();
      } catch (error) {
        cleanupErrors.push(
          `overlay residue clear failed: ${serializeOverlayError(error)}`
        );
      }

      try {
        viewer.dataSources.remove(dataSource);
      } catch (error) {
        cleanupErrors.push(
          `overlay residue detach failed: ${serializeOverlayError(error)}`
        );
      }
    }

    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }

    if (cleanupErrors.length === 0) {
      return null;
    }

    return cleanupErrors.join("; ");
  }

  async function cleanupWalkerOverlayResidue(
    adapters: ReadonlyArray<SatelliteOverlayRuntimeAdapter | undefined>
  ): Promise<string | null> {
    const cleanupErrors: string[] = [];

    for (const entry of overlayManager.getState().entries) {
      if (!MANAGED_OVERLAY_IDS.has(entry.overlayId)) {
        continue;
      }

      try {
        await overlayManager.detach(entry.overlayId);
      } catch (error) {
        cleanupErrors.push(
          `overlay manager detach failed: ${serializeOverlayError(error)}`
        );
      }
    }

    const uniqueAdapters = new Set<SatelliteOverlayRuntimeAdapter>();
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

    const dataSourceCleanupError = cleanupWalkerDataSourceResidue();
    if (dataSourceCleanupError) {
      cleanupErrors.push(dataSourceCleanupError);
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
    currentOrbitClassCounts = createEmptyOrbitClassCounts();

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

  function isOverlayStillDesired(
    adapter: SatelliteOverlayRuntimeAdapter,
    mode: Exclude<SatelliteOverlayMode, "off">
  ): boolean {
    return pendingAdapter === adapter && desiredMode === mode;
  }

  async function enableOverlayMode(
    mode: Exclude<SatelliteOverlayMode, "off">,
    source: SatelliteOverlaySource
  ): Promise<void> {
    if (activeAdapter && currentMode === mode) {
      currentMode = mode;
      currentSource = source;
      currentStatus = "ready";
      commitState();
      return;
    }

    const stalePendingAdapter = pendingAdapter;
    pendingAdapter = undefined;
    const adapterPendingDetach = activeAdapter;
    activeAdapter = undefined;
    const preflightCleanupError = await cleanupWalkerOverlayResidue([
      stalePendingAdapter,
      adapterPendingDetach
    ]);
    if (preflightCleanupError) {
      currentMode = mode;
      currentSource = source;
      currentStatus = "error";
      currentDetail = preflightCleanupError;
      commitState();
      throw new Error(preflightCleanupError);
    }

    currentMode = mode;
    currentSource = source;
    currentStatus = "loading";
    currentDetail = null;
    currentOrbitClassCounts = createEmptyOrbitClassCounts();
    commitState();

    const adapter =
      mode === LEO_SCALE_OVERLAY_MODE || mode === MULTI_ORBIT_SCALE_OVERLAY_MODE
        ? createLeoScalePointPrimitiveOverlayAdapter(viewer)
        : createWalkerPointOverlayAdapter(viewer);
    pendingAdapter = adapter;

    try {
      const fixtureConfig = await resolveOverlayFixture(mode);

      if (!isOverlayStillDesired(adapter, mode)) {
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
      await adapter.loadFixture(fixtureConfig.fixture);

      if (!isOverlayStillDesired(adapter, mode)) {
        if (pendingAdapter === adapter) {
          pendingAdapter = undefined;
        }
        const cleanupError = await cleanupWalkerOverlayResidue([adapter]);
        if (cleanupError) {
          throw new Error(cleanupError);
        }
        return;
      }

      await overlayManager.attach(fixtureConfig.overlayId, adapter);
      activeAdapter = adapter;
      pendingAdapter = undefined;

      if (desiredMode !== mode) {
        await disableOverlay(desiredSource);
        return;
      }

      currentStatus = "ready";
      currentDetail = fixtureConfig.detail;
      currentOrbitClassCounts = fixtureConfig.orbitClassCounts;
      commitState();
    } catch (error) {
      const shouldSurfaceError =
        pendingAdapter === adapter &&
        desiredMode === mode &&
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

      currentMode = mode;
      currentSource = source;
      currentStatus = "error";
      currentDetail = cleanupError
        ? `${serializeOverlayError(error)}; cleanup: ${cleanupError}`
        : serializeOverlayError(error);
      currentOrbitClassCounts = createEmptyOrbitClassCounts();
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

      await enableOverlayMode(requestedMode, requestedSource);
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
