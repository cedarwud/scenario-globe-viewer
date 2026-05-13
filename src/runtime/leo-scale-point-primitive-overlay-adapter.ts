import {
  Cartesian3,
  Color,
  PointPrimitiveCollection,
  type PointPrimitive,
  type Viewer
} from "cesium";

import type { SatelliteFixture, SatelliteOverlayAdapter } from "../features/satellites";
import type { OrbitClass, SatelliteSample } from "../features/satellites/adapter";
import {
  createBulkTleAdapter,
  type BulkTleAdapterState
} from "../features/satellites/bulk-tle-adapter";
import type { ReplayClock } from "../features/time";
import type { WalkerPointOverlayRuntimeState } from "./walker-point-overlay-adapter";

export interface LeoScalePointPrimitiveOverlayRuntimeState
  extends WalkerPointOverlayRuntimeState {
  primitiveCollectionAttached: boolean;
}

export interface LeoScalePointPrimitiveOverlayRuntimeAdapter
  extends SatelliteOverlayAdapter {
  getRuntimeState(): LeoScalePointPrimitiveOverlayRuntimeState;
}

const LEO_SCALE_POINT_PIXEL_SIZE = 3.5;
const LEO_SCALE_POINT_COLOR = Color.fromCssColorString("#aee7ff").withAlpha(0.88);
const LEO_SCALE_POINT_OUTLINE_COLOR = Color.fromCssColorString("#04121c").withAlpha(0.86);
const POINT_STYLE_BY_ORBIT_CLASS: Record<
  OrbitClass,
  {
    color: Color;
    outlineColor: Color;
    outlineWidth: number;
    pixelSize: number;
  }
> = {
  leo: {
    color: LEO_SCALE_POINT_COLOR,
    outlineColor: LEO_SCALE_POINT_OUTLINE_COLOR,
    outlineWidth: 0.75,
    pixelSize: LEO_SCALE_POINT_PIXEL_SIZE
  },
  meo: {
    color: Color.fromCssColorString("#ffd166").withAlpha(0.92),
    outlineColor: Color.fromCssColorString("#201402").withAlpha(0.9),
    outlineWidth: 1.05,
    pixelSize: 5.25
  },
  geo: {
    color: Color.fromCssColorString("#ff7ab6").withAlpha(0.94),
    outlineColor: Color.fromCssColorString("#230817").withAlpha(0.92),
    outlineWidth: 1.35,
    pixelSize: 6.75
  }
};

function toCartesianPosition(sample: {
  positionEcef: { x: number; y: number; z: number };
}): Cartesian3 {
  const { x, y, z } = sample.positionEcef;
  return new Cartesian3(x, y, z);
}

function resolvePointStyle(orbitClass: OrbitClass | undefined) {
  return POINT_STYLE_BY_ORBIT_CLASS[orbitClass ?? "leo"];
}

function createPoint(
  collection: PointPrimitiveCollection,
  sample: SatelliteSample,
  position: Cartesian3
): PointPrimitive {
  const style = resolvePointStyle(sample.orbitClass);

  return collection.add({
    position,
    pixelSize: style.pixelSize,
    color: style.color,
    outlineColor: style.outlineColor,
    outlineWidth: style.outlineWidth,
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  });
}

function syncPointStyle(point: PointPrimitive, sample: SatelliteSample): void {
  const style = resolvePointStyle(sample.orbitClass);
  point.pixelSize = style.pixelSize;
  point.color = style.color;
  point.outlineColor = style.outlineColor;
  point.outlineWidth = style.outlineWidth;
}

export function createLeoScalePointPrimitiveOverlayAdapter(
  viewer: Viewer
): LeoScalePointPrimitiveOverlayRuntimeAdapter {
  const bulkAdapter = createBulkTleAdapter();
  const collection = new PointPrimitiveCollection({
    show: true
  });
  const pointsById = new Map<string, PointPrimitive>();
  let primitiveCollectionAttached = false;
  let disposed = false;
  let visible = true;
  let detachTickListener: (() => void) | undefined;

  function requestRender(): void {
    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }
  }

  function ensurePrimitiveCollectionAttached(): void {
    if (disposed || primitiveCollectionAttached) {
      return;
    }

    viewer.scene.primitives.add(collection);
    primitiveCollectionAttached = true;
    collection.show = visible;
  }

  function clearPoints(): void {
    pointsById.clear();
    collection.removeAll();
  }

  function syncRenderedSamples(): void {
    if (disposed) {
      return;
    }

    try {
      ensurePrimitiveCollectionAttached();
      const seenIds = new Set<string>();

      for (const sample of bulkAdapter.getCurrentSamples()) {
        const position = toCartesianPosition(sample);
        const existingPoint = pointsById.get(sample.id);

        if (existingPoint) {
          existingPoint.position = position;
          syncPointStyle(existingPoint, sample);
        } else {
          pointsById.set(sample.id, createPoint(collection, sample, position));
        }

        seenIds.add(sample.id);
      }

      for (const [id, point] of [...pointsById.entries()]) {
        if (!seenIds.has(id)) {
          collection.remove(point);
          pointsById.delete(id);
        }
      }

      collection.show = visible;
      requestRender();
    } catch (error) {
      collection.show = false;
      clearPoints();
      requestRender();
      throw error;
    }
  }

  function readIngestionState(): BulkTleAdapterState {
    return bulkAdapter.getIngestionState();
  }

  return {
    async loadFixture(fixture: SatelliteFixture): Promise<{ satCount: number }> {
      const result = await bulkAdapter.loadFixture(fixture);
      ensurePrimitiveCollectionAttached();
      syncRenderedSamples();
      return result;
    },

    attachToClock(clock: ReplayClock): void {
      bulkAdapter.attachToClock(clock);
      detachTickListener?.();
      detachTickListener = clock.onTick(() => {
        syncRenderedSamples();
      });
      syncRenderedSamples();
    },

    setVisible(nextVisible: boolean): void {
      visible = nextVisible;
      bulkAdapter.setVisible(nextVisible);
      collection.show = nextVisible;
      requestRender();
    },

    getRuntimeState(): LeoScalePointPrimitiveOverlayRuntimeState {
      const ingestionState = readIngestionState();

      return {
        dataSourceAttached: primitiveCollectionAttached,
        primitiveCollectionAttached,
        entityCount: 0,
        pointCount: collection.length,
        labelCount: 0,
        orbitCacheBucket: null,
        orbitCacheBucketMs: 0,
        orbitCachePositionCount: 0,
        orbitCacheTrackCount: 0,
        orbitSampleBudget: 0,
        pathCount: 0,
        polylineCount: 0,
        sampleTime: ingestionState.sampleTime,
        satCount: ingestionState.satCount,
        visible
      };
    },

    async dispose(): Promise<void> {
      disposed = true;
      visible = false;
      detachTickListener?.();
      detachTickListener = undefined;
      collection.show = false;
      clearPoints();

      let disposalError: unknown;

      try {
        if (!viewer.isDestroyed() && viewer.scene.primitives.contains(collection)) {
          viewer.scene.primitives.remove(collection);
        }
      } catch (error) {
        disposalError ??= error;
      }

      primitiveCollectionAttached = false;

      try {
        await bulkAdapter.dispose();
      } catch (error) {
        disposalError ??= error;
      }

      requestRender();

      if (disposalError) {
        throw disposalError;
      }
    }
  };
}
