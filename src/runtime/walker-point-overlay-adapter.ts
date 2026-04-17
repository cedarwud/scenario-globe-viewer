import {
  Cartesian3,
  Color,
  ConstantPositionProperty,
  CustomDataSource,
  PointGraphics,
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

const WALKER_POINT_DATA_SOURCE_NAME = "walker-point-overlay";

function createPointStyle() {
  return {
    pixelSize: 6,
    color: Color.fromCssColorString("#8fd3ff").withAlpha(0.92),
    outlineColor: Color.fromCssColorString("#04121c").withAlpha(0.9),
    outlineWidth: 1
  };
}

function toCartesianPosition(sample: {
  positionEcef: { x: number; y: number; z: number };
}): Cartesian3 {
  const { x, y, z } = sample.positionEcef;
  return new Cartesian3(x, y, z);
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
  const dataSource = new CustomDataSource(WALKER_POINT_DATA_SOURCE_NAME);
  let attachDataSourcePromise: Promise<void> | undefined;
  let dataSourceAttached = false;
  let disposed = false;
  let visible = true;
  let detachTickListener: (() => void) | undefined;

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

  function syncRenderedSamples(): void {
    if (disposed) {
      return;
    }

    const seenIds = new Set<string>();

    for (const sample of walkerAdapter.getCurrentSamples()) {
      const entity = dataSource.entities.getOrCreateEntity(sample.id);
      entity.name = sample.name;
      entity.position = new ConstantPositionProperty(toCartesianPosition(sample));
      entity.point = entity.point ?? new PointGraphics(createPointStyle());
      entity.label = undefined;
      entity.path = undefined;
      entity.polyline = undefined;
      seenIds.add(sample.id);
    }

    for (const entity of [...dataSource.entities.values]) {
      if (!seenIds.has(entity.id)) {
        dataSource.entities.remove(entity);
      }
    }

    dataSource.show = visible;
    requestRender();
  }

  return {
    async loadFixture(fixture: SatelliteFixture): Promise<{ satCount: number }> {
      const result = await walkerAdapter.loadFixture(fixture);
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
        pathCount: graphics.pathCount,
        polylineCount: graphics.polylineCount,
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
      dataSource.entities.removeAll();

      if (attachDataSourcePromise) {
        await attachDataSourcePromise;
      }

      if (!viewer.isDestroyed() && viewer.dataSources.contains(dataSource)) {
        viewer.dataSources.remove(dataSource);
      }
      dataSourceAttached = false;
      await walkerAdapter.dispose();
      requestRender();
    }
  };
}
