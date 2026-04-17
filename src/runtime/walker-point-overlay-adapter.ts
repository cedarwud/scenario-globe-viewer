import {
  ArcType,
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  ConstantPositionProperty,
  CustomDataSource,
  HorizontalOrigin,
  LabelGraphics,
  LabelStyle,
  PolylineGraphics,
  PointGraphics,
  VerticalOrigin,
  type Viewer
} from "cesium";

import type { SatelliteFixture, SatelliteOverlayAdapter } from "../features/satellites";
import {
  createWalkerFixtureAdapter,
  type WalkerFixtureAdapterState
} from "../features/satellites/walker-fixture-adapter";
import type { ReplayClock } from "../features/time";

export interface WalkerPointOverlayRuntimeState {
  dataSourceAttached: boolean;
  entityCount: number;
  pointCount: number;
  labelCount: number;
  orbitCacheBucket: number | null;
  orbitCacheBucketMs: number;
  orbitCachePositionCount: number;
  orbitCacheTrackCount: number;
  orbitSampleBudget: number;
  pathCount: number;
  polylineCount: number;
  sampleTime: WalkerFixtureAdapterState["sampleTime"];
  satCount: number;
  visible: boolean;
}

export interface WalkerPointOverlayRuntimeAdapter
  extends SatelliteOverlayAdapter {
  getRuntimeState(): WalkerPointOverlayRuntimeState;
}

export const WALKER_POINT_OVERLAY_DATA_SOURCE_NAME = "walker-point-overlay";
export const WALKER_POINT_OVERLAY_ORBIT_SAMPLE_BUDGET = 49;
export const WALKER_POINT_OVERLAY_ORBIT_CACHE_BUCKET_MS = 60_000;
const WALKER_ORBIT_POLYLINE_WIDTH = 1.25;
const WALKER_ORBIT_POLYLINE_COLOR = Color.fromCssColorString("#8fd3ff").withAlpha(0.3);

function createPointStyle() {
  return {
    pixelSize: 6,
    color: Color.fromCssColorString("#8fd3ff").withAlpha(0.92),
    outlineColor: Color.fromCssColorString("#04121c").withAlpha(0.9),
    outlineWidth: 1
  };
}

function createLabelStyle(text: string) {
  return new LabelGraphics({
    text: new ConstantProperty(text),
    font: "11px sans-serif",
    scale: 0.8,
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: Color.WHITE.withAlpha(0.96),
    outlineColor: Color.fromCssColorString("#04121c").withAlpha(0.92),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: Color.fromCssColorString("#04121c").withAlpha(0.56),
    pixelOffset: new Cartesian2(0, -14),
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  });
}

function createOrbitStyle(positions: ReadonlyArray<Cartesian3>) {
  return new PolylineGraphics({
    positions: [...positions],
    width: WALKER_ORBIT_POLYLINE_WIDTH,
    material: WALKER_ORBIT_POLYLINE_COLOR,
    arcType: ArcType.NONE,
    clampToGround: false
  });
}

function toCartesianPosition(sample: {
  positionEcef: { x: number; y: number; z: number };
}): Cartesian3 {
  const { x, y, z } = sample.positionEcef;
  return new Cartesian3(x, y, z);
}

function toEpochMilliseconds(value: WalkerFixtureAdapterState["sampleTime"]): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function countEntityGraphics(dataSource: CustomDataSource) {
  let pointCount = 0;
  let labelCount = 0;
  let pathCount = 0;
  let polylineCount = 0;

  for (const entity of dataSource.entities.values) {
    if (entity.point) {
      pointCount += 1;
    }
    if (entity.label) {
      labelCount += 1;
    }
    if (entity.path) {
      pathCount += 1;
    }
    if (entity.polyline) {
      polylineCount += 1;
    }
  }

  return {
    pointCount,
    labelCount,
    pathCount,
    polylineCount
  };
}

export function createWalkerPointOverlayAdapter(
  viewer: Viewer
): WalkerPointOverlayRuntimeAdapter {
  const walkerAdapter = createWalkerFixtureAdapter();
  const dataSource = new CustomDataSource(WALKER_POINT_OVERLAY_DATA_SOURCE_NAME);
  let attachDataSourcePromise: Promise<void> | undefined;
  let disposePromise: Promise<void> | undefined;
  let dataSourceAttached = false;
  let disposed = false;
  let visible = true;
  let detachTickListener: (() => void) | undefined;
  let cachedOrbitSampleBucket: number | null = null;
  let cachedOrbitPositionsById = new Map<string, ReadonlyArray<Cartesian3>>();

  function requestRender(): void {
    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }
  }

  async function ensureDataSourceAttached(): Promise<void> {
    if (disposed || dataSourceAttached) {
      return;
    }

    if (!attachDataSourcePromise) {
      attachDataSourcePromise = viewer.dataSources.add(dataSource).then(() => {
        if (disposed || viewer.isDestroyed()) {
          if (!viewer.isDestroyed() && viewer.dataSources.contains(dataSource)) {
            viewer.dataSources.remove(dataSource);
          }
          dataSourceAttached = false;
          return;
        }

        dataSourceAttached = true;
        dataSource.show = visible;
      });
    }

    await attachDataSourcePromise;
  }

  function clearOrbitCache(): void {
    cachedOrbitSampleBucket = null;
    cachedOrbitPositionsById = new Map<string, ReadonlyArray<Cartesian3>>();
  }

  function countCachedOrbitPositions(
    orbitPositionsById: ReadonlyMap<string, ReadonlyArray<Cartesian3>>
  ): number {
    let positionCount = 0;

    for (const orbitPositions of orbitPositionsById.values()) {
      positionCount += orbitPositions.length;
    }

    return positionCount;
  }

  function getOrbitPositionsById(
    sampleTime: WalkerFixtureAdapterState["sampleTime"]
  ): ReadonlyMap<string, ReadonlyArray<Cartesian3>> {
    const sampleTimeMs = toEpochMilliseconds(sampleTime);
    if (sampleTimeMs === null || sampleTime === null) {
      clearOrbitCache();
      return cachedOrbitPositionsById;
    }

    const sampleBucket = Math.floor(
      sampleTimeMs / WALKER_POINT_OVERLAY_ORBIT_CACHE_BUCKET_MS
    );
    if (cachedOrbitSampleBucket === sampleBucket) {
      return cachedOrbitPositionsById;
    }

    const orbitTracks = walkerAdapter.sampleOrbitTracks(
      sampleTime,
      WALKER_POINT_OVERLAY_ORBIT_SAMPLE_BUDGET
    );
    cachedOrbitPositionsById = new Map(
      orbitTracks.map((track) => {
        if (track.positionsEcef.length > WALKER_POINT_OVERLAY_ORBIT_SAMPLE_BUDGET) {
          throw new Error(
            `Walker orbit sampling exceeded the fixed budget for ${track.id}: ${track.positionsEcef.length}`
          );
        }

        return [
          track.id,
          track.positionsEcef.map((position) =>
            toCartesianPosition({ positionEcef: position })
          )
        ];
      })
    );
    cachedOrbitSampleBucket = sampleBucket;
    return cachedOrbitPositionsById;
  }

  function syncRenderedSamples(): void {
    if (disposed) {
      return;
    }

    try {
      const seenIds = new Set<string>();
      const ingestionState = walkerAdapter.getIngestionState();
      const orbitPositionsById = getOrbitPositionsById(ingestionState.sampleTime);

      for (const sample of walkerAdapter.getCurrentSamples()) {
        const entity = dataSource.entities.getOrCreateEntity(sample.id);
        const labelText = sample.name ?? sample.id;
        const orbitPositions = orbitPositionsById.get(sample.id) ?? [];
        entity.name = sample.name;
        entity.position = new ConstantPositionProperty(toCartesianPosition(sample));
        entity.point = entity.point ?? new PointGraphics(createPointStyle());
        entity.label = entity.label ?? createLabelStyle(labelText);
        entity.label.text = new ConstantProperty(labelText);
        entity.path = undefined;
        if (orbitPositions.length >= 2) {
          entity.polyline =
            entity.polyline instanceof PolylineGraphics
              ? entity.polyline
              : createOrbitStyle(orbitPositions);
          entity.polyline.positions = new ConstantProperty([...orbitPositions]);
        } else {
          entity.polyline = undefined;
        }
        seenIds.add(sample.id);
      }

      for (const entity of [...dataSource.entities.values]) {
        if (!seenIds.has(entity.id)) {
          dataSource.entities.remove(entity);
        }
      }

      dataSource.show = visible;
      requestRender();
    } catch (error) {
      dataSource.show = false;
      dataSource.entities.removeAll();
      clearOrbitCache();
      requestRender();
      throw error;
    }
  }

  return {
    async loadFixture(fixture: SatelliteFixture): Promise<{ satCount: number }> {
      const result = await walkerAdapter.loadFixture(fixture);
      clearOrbitCache();
      await ensureDataSourceAttached();
      syncRenderedSamples();
      return result;
    },

    attachToClock(clock: ReplayClock): void {
      walkerAdapter.attachToClock(clock);
      detachTickListener?.();
      detachTickListener = clock.onTick(() => {
        syncRenderedSamples();
      });
      syncRenderedSamples();
    },

    setVisible(nextVisible: boolean): void {
      visible = nextVisible;
      walkerAdapter.setVisible(nextVisible);
      dataSource.show = nextVisible;
      requestRender();
    },

    getRuntimeState(): WalkerPointOverlayRuntimeState {
      const graphics = countEntityGraphics(dataSource);
      const ingestionState = walkerAdapter.getIngestionState();

      return {
        dataSourceAttached,
        entityCount: dataSource.entities.values.length,
        pointCount: graphics.pointCount,
        labelCount: graphics.labelCount,
        orbitCacheBucket: cachedOrbitSampleBucket,
        orbitCacheBucketMs: WALKER_POINT_OVERLAY_ORBIT_CACHE_BUCKET_MS,
        orbitCachePositionCount: countCachedOrbitPositions(cachedOrbitPositionsById),
        orbitCacheTrackCount: cachedOrbitPositionsById.size,
        orbitSampleBudget: WALKER_POINT_OVERLAY_ORBIT_SAMPLE_BUDGET,
        pathCount: graphics.pathCount,
        polylineCount: graphics.polylineCount,
        sampleTime: ingestionState.sampleTime,
        satCount: ingestionState.satCount,
        visible
      };
    },

    async dispose(): Promise<void> {
      if (!disposePromise) {
        disposePromise = (async () => {
          disposed = true;
          visible = false;
          detachTickListener?.();
          detachTickListener = undefined;
          dataSource.show = false;
          dataSource.entities.removeAll();
          clearOrbitCache();

          let disposalError: unknown;

          if (attachDataSourcePromise) {
            try {
              await attachDataSourcePromise;
            } catch (error) {
              disposalError ??= error;
            } finally {
              attachDataSourcePromise = undefined;
            }
          }

          try {
            if (!viewer.isDestroyed() && viewer.dataSources.contains(dataSource)) {
              viewer.dataSources.remove(dataSource);
            }
          } catch (error) {
            disposalError ??= error;
          }

          dataSourceAttached = false;

          try {
            await walkerAdapter.dispose();
          } catch (error) {
            disposalError ??= error;
          }

          requestRender();

          if (disposalError) {
            throw disposalError;
          }
        })();
      }

      await disposePromise;
    }
  };
}
