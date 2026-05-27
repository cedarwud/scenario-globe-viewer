import {
  assert,
  evaluatePromiseValue,
  evaluateValue,
  waitForCondition
} from "./bootstrap-smoke-common.mjs";

async function readSatelliteOverlayRuntime(client) {
  return await evaluateValue(
    client,
    `(() => {
      const root = document.documentElement;
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const controllerState = capture?.satelliteOverlay?.getState?.() ?? null;
      const viewer = capture?.viewer;
      const dataSourceNames = [];
      let walkerPointDataSourceCount = 0;
      let walkerPolylineEntityCount = 0;
      let maxWalkerPolylinePositionCount = 0;
      let minWalkerPolylinePositionCount = Number.POSITIVE_INFINITY;
      let projectedPointCount = 0;
      let projectedLabelCount = 0;
      const walkerOverlayEntities = [];

      const resolvePropertyValue = (property, time) => {
        if (property && typeof property.getValue === "function") {
          return property.getValue(time);
        }

        return property ?? null;
      };

      if (viewer) {
        for (let index = 0; index < viewer.dataSources.length; index += 1) {
          const dataSource = viewer.dataSources.get(index);
          dataSourceNames.push(typeof dataSource.name === "string" ? dataSource.name : "");

          if (dataSource.name !== "walker-point-overlay") {
            continue;
          }

          walkerPointDataSourceCount += 1;

          for (const entity of dataSource.entities.values) {
            const labelText = entity.label
              ? resolvePropertyValue(entity.label.text, viewer.clock.currentTime)
              : null;
            const polylinePositions =
              entity.polyline?.positions
                ? resolvePropertyValue(entity.polyline.positions, viewer.clock.currentTime)
                : null;
            const polylinePositionCount = Array.isArray(polylinePositions)
              ? polylinePositions.length
              : 0;

            if (polylinePositionCount > 0) {
              walkerPolylineEntityCount += 1;
              maxWalkerPolylinePositionCount = Math.max(
                maxWalkerPolylinePositionCount,
                polylinePositionCount
              );
              minWalkerPolylinePositionCount = Math.min(
                minWalkerPolylinePositionCount,
                polylinePositionCount
              );
            }

            walkerOverlayEntities.push({
              id: String(entity.id),
              name: typeof entity.name === "string" ? entity.name : null,
              hasPoint: Boolean(entity.point),
              hasLabel: Boolean(entity.label),
              hasPolyline: Boolean(entity.polyline),
              polylinePositionCount,
              labelText: typeof labelText === "string" ? labelText : null
            });

            if (!entity.point || !entity.position) {
              continue;
            }

            const position =
              typeof entity.position.getValue === "function"
                ? entity.position.getValue(viewer.clock.currentTime)
                : null;
            if (!position) {
              continue;
            }

            const canvasPoint = viewer.scene.cartesianToCanvasCoordinates(position);
            if (
              canvasPoint &&
              canvasPoint.x >= 0 &&
              canvasPoint.y >= 0 &&
              canvasPoint.x <= viewer.canvas.clientWidth &&
              canvasPoint.y <= viewer.canvas.clientHeight
            ) {
              projectedPointCount += 1;
              if (entity.label && typeof labelText === "string" && labelText.length > 0) {
                projectedLabelCount += 1;
              }
            }
          }
        }
      }

      walkerOverlayEntities.sort((left, right) => left.id.localeCompare(right.id));

      return {
        overlayMode: root?.dataset.satelliteOverlayMode ?? null,
        overlaySource: root?.dataset.satelliteOverlaySource ?? null,
        overlayState: root?.dataset.satelliteOverlayState ?? null,
        overlayDetail: root?.dataset.satelliteOverlayDetail ?? null,
        overlayRenderMode: root?.dataset.satelliteOverlayRenderMode ?? null,
        overlayPointCount: Number(root?.dataset.satelliteOverlayPointCount ?? "0"),
        satelliteOverlayControlCount: document.querySelectorAll(
          '[data-satellite-overlay-control]'
        ).length,
        perSatelliteControlCount:
          document.querySelectorAll('[data-satellite-control]').length,
        controllerState,
        dataSourceNames,
        walkerPointDataSourceCount,
        walkerPolylineEntityCount,
        maxWalkerPolylinePositionCount,
        minWalkerPolylinePositionCount:
          Number.isFinite(minWalkerPolylinePositionCount)
            ? minWalkerPolylinePositionCount
            : 0,
        projectedPointCount,
        projectedLabelCount,
        walkerOverlayEntities
      };
    })()`
  );
}

const WALKER_ORBIT_POLYLINE_SAMPLE_BUDGET = 49;
const WALKER_ORBIT_POLYLINE_CACHE_BUCKET_MS = 60_000;

async function setSatelliteOverlayMode(client, mode) {
  return await evaluatePromiseValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      if (!capture?.satelliteOverlay?.setMode) {
        throw new Error("Missing repo-owned satellite overlay controller.");
      }

      return capture.satelliteOverlay.setMode(${JSON.stringify(mode)});
    })()`
  );
}

async function kickSatelliteOverlayMode(client, mode) {
  return await evaluateValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      if (!capture?.satelliteOverlay?.setMode) {
        throw new Error("Missing repo-owned satellite overlay controller.");
      }

      void capture.satelliteOverlay.setMode(${JSON.stringify(mode)});
      return true;
    })()`
  );
}

async function startSatelliteOverlayModeRequest(client, mode, resultKey) {
  return await evaluateValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      if (!capture?.satelliteOverlay?.setMode) {
        throw new Error("Missing repo-owned satellite overlay controller.");
      }

      const serializeError = (error) => {
        if (error instanceof Error) {
          return error.message;
        }

        return typeof error === "string" ? error : JSON.stringify(error);
      };

      window[${JSON.stringify(resultKey)}] = capture.satelliteOverlay
        .setMode(${JSON.stringify(mode)})
        .then((state) => ({ ok: true, state }))
        .catch((error) => ({ ok: false, error: serializeError(error) }));
      return true;
    })()`
  );
}

async function awaitSatelliteOverlayModeRequest(client, resultKey) {
  return await evaluatePromiseValue(client, `window[${JSON.stringify(resultKey)}]`);
}

async function configureWalkerFixtureFetchHook(
  client,
  { delayMs = 0, transformMode = null } = {}
) {
  return await evaluateValue(
    client,
    `(() => {
      const delayMarker = "__SCENARIO_GLOBE_VIEWER_OVERLAY_FETCH_DELAY_MS__";
      const transformMarker =
        "__SCENARIO_GLOBE_VIEWER_OVERLAY_FIXTURE_TEXT_TRANSFORM__";
      const fixtureSubstring = "/fixtures/satellites/walker-o6-s3-i45-h698.tle";
      const root = window;

      if (typeof root[delayMarker] !== "number") {
        const originalFetch = window.fetch.bind(window);
        root[delayMarker] = 0;
        root[transformMarker] = null;
        window.fetch = async (...args) => {
          const resource = args[0];
          const url =
            typeof resource === "string"
              ? resource
              : resource instanceof Request
                ? resource.url
                : String(resource);
          const pendingDelayMs = root[delayMarker];

          if (pendingDelayMs > 0 && url.includes(fixtureSubstring)) {
            root[delayMarker] = 0;
            await new Promise((resolve) => {
              window.setTimeout(resolve, pendingDelayMs);
            });
          }

          const response = await originalFetch(...args);
          const transformMode = root[transformMarker];

          if (!transformMode || !url.includes(fixtureSubstring)) {
            return response;
          }

          root[transformMarker] = null;
          const sourceText = await response.text();
          let transformedText = sourceText;

          if (transformMode === "drop-first-name") {
            const lines = sourceText.split(/\\r?\\n/u);
            const firstNameIndex = lines.findIndex((line) => {
              const trimmed = line.trim();
              return (
                trimmed.length > 0 &&
                !trimmed.startsWith("1 ") &&
                !trimmed.startsWith("2 ")
              );
            });

            if (firstNameIndex < 0) {
              throw new Error("Unable to remove the first walker fixture name line.");
            }

            lines.splice(firstNameIndex, 1);
            transformedText = lines.join("\\n");
          } else {
            throw new Error(\`Unsupported walker fixture transform: \${transformMode}\`);
          }

          return new Response(transformedText, {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers)
          });
        };
      }

      root[delayMarker] = ${JSON.stringify(delayMs)};
      root[transformMarker] = ${JSON.stringify(transformMode)};
      return true;
    })()`
  );
}

async function injectWalkerFixtureFetchDelay(client, delayMs) {
  return await configureWalkerFixtureFetchHook(client, { delayMs });
}

async function injectWalkerFixtureMissingFirstName(client) {
  return await configureWalkerFixtureFetchHook(client, {
    transformMode: "drop-first-name"
  });
}

async function armWalkerPointOverlayRenderFailure(client, failAfterEntityCount = 0) {
  return await evaluateValue(
    client,
    `(() => {
      const marker = "__SCENARIO_GLOBE_VIEWER_WALKER_POINT_RENDER_FAILURE__";
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const viewer = capture?.viewer;

      if (!viewer?.dataSources?.add) {
        throw new Error("Missing viewer dataSources.add for walker overlay failure injection.");
      }

      if (!window[marker]) {
        const originalAdd = viewer.dataSources.add.bind(viewer.dataSources);
        let failNextWalkerPointOverlay = false;
        let failAfterEntityCount = 0;

        viewer.dataSources.add = function (...args) {
          const [dataSource] = args;
          const addResult = originalAdd(...args);

          return Promise.resolve(addResult).then((resolvedDataSource) => {
            const attachedDataSource = resolvedDataSource ?? dataSource;

            if (
              failNextWalkerPointOverlay &&
              attachedDataSource?.name === "walker-point-overlay"
            ) {
              failNextWalkerPointOverlay = false;
              const entityCollection = attachedDataSource.entities;
              const originalGetOrCreateEntity =
                entityCollection.getOrCreateEntity.bind(entityCollection);
              let createdEntityCount = 0;

              entityCollection.getOrCreateEntity = function (...entityArgs) {
                if (createdEntityCount >= failAfterEntityCount) {
                  entityCollection.getOrCreateEntity = originalGetOrCreateEntity;
                  throw new Error(
                    \`Injected walker point overlay render failure after \${failAfterEntityCount} entities.\`
                  );
                }

                createdEntityCount += 1;
                return originalGetOrCreateEntity(...entityArgs);
              };
            }

            return resolvedDataSource;
          });
        };

        window[marker] = {
          arm(nextFailAfterEntityCount) {
            failNextWalkerPointOverlay = true;
            failAfterEntityCount =
              Number.isInteger(nextFailAfterEntityCount) &&
              nextFailAfterEntityCount >= 0
                ? nextFailAfterEntityCount
                : 0;
            return true;
          }
        };
      }

      return window[marker].arm(${JSON.stringify(failAfterEntityCount)});
    })()`
  );
}

function assertNoSatelliteOverlayControls(runtimeState, scenarioLabel) {
  assert(
    runtimeState.satelliteOverlayControlCount === 0,
    `Overlay UI controls must stay absent during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.perSatelliteControlCount === 0,
    `Per-satellite controls must stay absent during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
}

function assertWalkerPointOverlayLabelsUseNameOrId(
  runtimeState,
  scenarioLabel,
  expectedFallbackIds = []
) {
  const entities = runtimeState.walkerOverlayEntities ?? [];

  assert(
    entities.length === 18,
    `Expected all walker overlay entities to stay inspectable during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    entities.every(
      (entity) => entity.hasPoint && entity.hasLabel && entity.hasPolyline
    ),
    `Every walker overlay entity must keep point, label, and orbit-polyline graphics during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    entities.every((entity) => entity.labelText === (entity.name ?? entity.id)),
    `Walker overlay labels must use only existing name or fallback id during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.projectedLabelCount > 0,
    `Expected at least one walker label to project into the active view during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );

  for (const expectedFallbackId of expectedFallbackIds) {
    const entity = entities.find((candidate) => candidate.id === expectedFallbackId);
    assert(
      entity?.name === null && entity?.labelText === expectedFallbackId,
      `Expected ${expectedFallbackId} to fall back to its id label during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
    );
  }
}

function assertWalkerOrbitRuntimeBudget(controllerState, scenarioLabel) {
  assert(
    controllerState?.orbitSampleBudget === WALKER_ORBIT_POLYLINE_SAMPLE_BUDGET &&
      controllerState?.orbitCacheBucketMs === WALKER_ORBIT_POLYLINE_CACHE_BUCKET_MS,
    `Walker orbit runtime budget must stay fixed during ${scenarioLabel}: ${JSON.stringify(controllerState)}`
  );
}

function assertWalkerOrbitCacheReadyState(runtimeState, scenarioLabel) {
  const controllerState = runtimeState.controllerState;
  const sampleTimeMs =
    typeof controllerState?.sampleTime === "number"
      ? controllerState.sampleTime
      : Date.parse(controllerState?.sampleTime ?? "");

  assertWalkerOrbitRuntimeBudget(controllerState, scenarioLabel);
  assert(
    Number.isFinite(sampleTimeMs) &&
      controllerState?.orbitCacheBucket ===
        Math.floor(sampleTimeMs / WALKER_ORBIT_POLYLINE_CACHE_BUCKET_MS) &&
      controllerState?.orbitCacheTrackCount === 18 &&
      controllerState?.orbitCachePositionCount ===
        18 * WALKER_ORBIT_POLYLINE_SAMPLE_BUDGET,
    `Walker orbit cache must stay aligned with the fixed runtime bucket during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
}

function assertWalkerOrbitCacheCleared(runtimeState, scenarioLabel) {
  const controllerState = runtimeState.controllerState;

  assertWalkerOrbitRuntimeBudget(controllerState, scenarioLabel);
  assert(
    controllerState?.orbitCacheBucket === null &&
      controllerState?.orbitCacheTrackCount === 0 &&
      controllerState?.orbitCachePositionCount === 0,
    `Walker orbit cache must clear completely during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
}

function assertWalkerOrbitPolylines(runtimeState, scenarioLabel) {
  assert(
    runtimeState.controllerState?.pathCount === 0,
    `Entity.path must stay disabled during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.controllerState?.polylineCount === 18,
    `Expected one bounded orbit polyline per walker satellite during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.walkerPolylineEntityCount === 18,
    `Expected orbit polylines to stay attached to every walker entity during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.walkerOverlayEntities.every(
      (entity) =>
        entity.hasPolyline &&
        entity.polylinePositionCount === WALKER_ORBIT_POLYLINE_SAMPLE_BUDGET
    ) &&
      runtimeState.minWalkerPolylinePositionCount ===
        WALKER_ORBIT_POLYLINE_SAMPLE_BUDGET &&
      runtimeState.maxWalkerPolylinePositionCount ===
        WALKER_ORBIT_POLYLINE_SAMPLE_BUDGET,
    `Orbit polyline sampling must stay on the fixed Phase 5.3 budget during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assertWalkerOrbitCacheReadyState(runtimeState, scenarioLabel);
}

function assertWalkerPointOverlayReadyState(runtimeState, scenarioLabel) {
  assert(
    runtimeState.overlayMode === "walker-points" &&
      runtimeState.overlaySource === "runtime" &&
      runtimeState.overlayState === "ready" &&
      runtimeState.overlayRenderMode === "point-label-polyline" &&
      runtimeState.overlayPointCount === 18,
    `Expected walker point overlay to become ready during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.controllerState?.pointCount === 18 &&
      runtimeState.controllerState?.satCount === 18 &&
      runtimeState.controllerState?.labelCount === 18 &&
      runtimeState.controllerState?.pathCount === 0 &&
      runtimeState.controllerState?.polylineCount === 18 &&
      runtimeState.controllerState?.dataSourceAttached === true &&
      runtimeState.controllerState?.visible === true,
    `Overlay runtime must stay on the walker point path with fixed labels plus bounded orbit polylines during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.controllerState?.overlayManager?.entries?.length === 1 &&
      runtimeState.controllerState.overlayManager.entries[0]?.overlayId === "walker-points" &&
      runtimeState.controllerState.overlayManager.entries[0]?.adapterAttached === true &&
      runtimeState.controllerState.overlayManager.entries[0]?.visible === true,
    `Overlay manager must report one visible walker overlay during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.walkerPointDataSourceCount === 1,
    `Overlay runtime must attach exactly one walker point data source during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.projectedPointCount > 0,
    `Expected at least one walker point to project into the active view during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assertWalkerPointOverlayLabelsUseNameOrId(runtimeState, scenarioLabel);
  assertWalkerOrbitPolylines(runtimeState, scenarioLabel);
  assertNoSatelliteOverlayControls(runtimeState, scenarioLabel);
}

function assertWalkerPointOverlayDisabledState(
  runtimeState,
  scenarioLabel,
  expectedSource
) {
  assert(
    runtimeState.overlayMode === "off" &&
      runtimeState.overlaySource === expectedSource &&
      runtimeState.overlayState === "disabled" &&
      runtimeState.overlayRenderMode === "point-label-polyline" &&
      runtimeState.overlayPointCount === 0,
    `Expected overlay-off cleanup state during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.controllerState?.overlayManager?.entries?.length === 0 &&
      runtimeState.controllerState?.dataSourceAttached === false &&
      runtimeState.controllerState?.pointCount === 0 &&
      runtimeState.controllerState?.labelCount === 0 &&
      runtimeState.controllerState?.pathCount === 0 &&
      runtimeState.controllerState?.polylineCount === 0,
    `Overlay cleanup must fully detach the walker point runtime during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.walkerPointDataSourceCount === 0,
    `Walker point data source must be absent during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.walkerPolylineEntityCount === 0,
    `Walker orbit polyline residue must be absent during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assertWalkerOrbitCacheCleared(runtimeState, scenarioLabel);
  assertNoSatelliteOverlayControls(runtimeState, scenarioLabel);
}

function assertWalkerPointOverlayLoadingState(runtimeState, scenarioLabel) {
  assert(
    runtimeState.overlayMode === "walker-points" &&
      runtimeState.overlaySource === "runtime" &&
      runtimeState.overlayState === "loading" &&
      runtimeState.overlayRenderMode === "point-label-polyline" &&
      runtimeState.overlayPointCount === 0,
    `Expected overlay loading state during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.controllerState?.overlayManager?.entries?.length === 0 &&
      runtimeState.controllerState?.dataSourceAttached === false &&
      runtimeState.controllerState?.pointCount === 0 &&
      runtimeState.controllerState?.labelCount === 0 &&
      runtimeState.controllerState?.pathCount === 0 &&
      runtimeState.controllerState?.polylineCount === 0,
    `Overlay loading must not leave attached runtime residue during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.walkerPointDataSourceCount === 0,
    `Overlay loading must not attach a walker point data source before readiness during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.walkerPolylineEntityCount === 0,
    `Overlay loading must not attach orbit polyline residue before readiness during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assertWalkerOrbitCacheCleared(runtimeState, scenarioLabel);
  assertNoSatelliteOverlayControls(runtimeState, scenarioLabel);
}

function assertWalkerPointOverlayErrorState(runtimeState, scenarioLabel) {
  assert(
    runtimeState.overlayMode === "walker-points" &&
      runtimeState.overlaySource === "runtime" &&
      runtimeState.overlayState === "error" &&
      runtimeState.overlayRenderMode === "point-label-polyline" &&
      runtimeState.overlayPointCount === 0 &&
      typeof runtimeState.overlayDetail === "string" &&
      runtimeState.overlayDetail.length > 0,
    `Expected walker point overlay error state during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.controllerState?.overlayManager?.entries?.length === 0 &&
      runtimeState.controllerState?.dataSourceAttached === false &&
      runtimeState.controllerState?.pointCount === 0 &&
      runtimeState.controllerState?.satCount === 0 &&
      runtimeState.controllerState?.labelCount === 0 &&
      runtimeState.controllerState?.pathCount === 0 &&
      runtimeState.controllerState?.polylineCount === 0 &&
      runtimeState.controllerState?.visible === false,
    `Overlay error cleanup must leave no runtime residue during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.walkerPointDataSourceCount === 0,
    `Failed enable must leave no walker point data source during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assert(
    runtimeState.walkerPolylineEntityCount === 0,
    `Failed enable must leave no walker orbit polyline residue during ${scenarioLabel}: ${JSON.stringify(runtimeState)}`
  );
  assertWalkerOrbitCacheCleared(runtimeState, scenarioLabel);
  assertNoSatelliteOverlayControls(runtimeState, scenarioLabel);
}

async function verifyInjectedWalkerPointOverlayFailure(
  client,
  scenarioLabel,
  {
    failureEntityCount,
    requestKey,
    stateLabel
  },
  dependencies
) {
  const { assertDesktopHudStatusOnlyState, readHudLayoutState } = dependencies;

  await injectWalkerFixtureFetchDelay(client, 750);
  await armWalkerPointOverlayRenderFailure(client, failureEntityCount);
  await startSatelliteOverlayModeRequest(client, "walker-points", requestKey);
  await waitForCondition(
    client,
    `${scenarioLabel} ${stateLabel} loading`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "walker-points" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "loading" &&
        root?.dataset.satelliteOverlayPointCount === "0";
    })()`
  );

  const loadingState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayLoadingState(
    loadingState,
    `${scenarioLabel}/${stateLabel}-loading`
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/${stateLabel}-loading`
  );

  await waitForCondition(
    client,
    `${scenarioLabel} ${stateLabel} error`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "walker-points" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "error" &&
        root?.dataset.satelliteOverlayPointCount === "0";
    })()`
  );

  const failedEnableResult = await awaitSatelliteOverlayModeRequest(client, requestKey);
  assert(
    failedEnableResult?.ok === false &&
      typeof failedEnableResult?.error === "string" &&
      failedEnableResult.error.includes("Injected walker point overlay render failure"),
    `Expected injected overlay enable failure during ${scenarioLabel}/${stateLabel}: ${JSON.stringify(failedEnableResult)}`
  );

  const failedEnableState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayErrorState(
    failedEnableState,
    `${scenarioLabel}/${stateLabel}`
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/${stateLabel}`
  );
}

export async function verifySatelliteOverlayToggle(
  client,
  scenarioLabel,
  dependencies
) {
  const { assertDesktopHudStatusOnlyState, readHudLayoutState } = dependencies;

  const initialState = await readSatelliteOverlayRuntime(client);
  assert(
    initialState.overlayMode === "off" &&
      initialState.overlaySource === "default-off" &&
      initialState.overlayState === "disabled" &&
      initialState.overlayRenderMode === "point-label-polyline" &&
      initialState.overlayPointCount === 0,
    `Expected default globe-only overlay-off state during ${scenarioLabel}: ${JSON.stringify(initialState)}`
  );
  assertWalkerPointOverlayDisabledState(
    initialState,
    `${scenarioLabel}/initial-off`,
    "default-off"
  );

  await setSatelliteOverlayMode(client, "walker-points");
  await waitForCondition(
    client,
    `${scenarioLabel} overlay enabled`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "walker-points" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "ready" &&
        root?.dataset.satelliteOverlayPointCount === "18";
    })()`
  );

  const enabledState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayReadyState(enabledState, `${scenarioLabel}/enabled`);
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/enabled`
  );

  await setSatelliteOverlayMode(client, "off");
  await waitForCondition(
    client,
    `${scenarioLabel} overlay disabled again`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "off" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "disabled" &&
        root?.dataset.satelliteOverlayPointCount === "0";
    })()`
  );

  const disabledState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayDisabledState(
    disabledState,
    `${scenarioLabel}/disabled-again`,
    "runtime"
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/disabled-again`
  );

  await setSatelliteOverlayMode(client, "walker-points");
  await waitForCondition(
    client,
    `${scenarioLabel} overlay enabled second pass`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "walker-points" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "ready" &&
        root?.dataset.satelliteOverlayPointCount === "18";
    })()`
  );

  const enabledAgainState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayReadyState(
    enabledAgainState,
    `${scenarioLabel}/enabled-second-pass`
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/enabled-second-pass`
  );

  await setSatelliteOverlayMode(client, "off");
  await waitForCondition(
    client,
    `${scenarioLabel} overlay disabled second pass`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "off" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "disabled" &&
        root?.dataset.satelliteOverlayPointCount === "0";
    })()`
  );

  const disabledAgainState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayDisabledState(
    disabledAgainState,
    `${scenarioLabel}/disabled-second-pass`,
    "runtime"
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/disabled-second-pass`
  );

  await injectWalkerFixtureFetchDelay(client, 750);
  await kickSatelliteOverlayMode(client, "walker-points");
  await waitForCondition(
    client,
    `${scenarioLabel} overlay loading`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "walker-points" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "loading" &&
        root?.dataset.satelliteOverlayPointCount === "0";
    })()`
  );

  const loadingState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayLoadingState(loadingState, `${scenarioLabel}/loading`);
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/loading`
  );

  await kickSatelliteOverlayMode(client, "off");
  await waitForCondition(
    client,
    `${scenarioLabel} overlay cancelled back to off`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "off" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "disabled" &&
        root?.dataset.satelliteOverlayPointCount === "0";
    })()`
  );

  const cancelledState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayDisabledState(
    cancelledState,
    `${scenarioLabel}/cancelled-back-to-off`,
    "runtime"
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/cancelled-back-to-off`
  );

  await setSatelliteOverlayMode(client, "walker-points");
  await waitForCondition(
    client,
    `${scenarioLabel} overlay enabled after cancellation`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "walker-points" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "ready" &&
        root?.dataset.satelliteOverlayPointCount === "18";
    })()`
  );

  const enabledAfterCancellationState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayReadyState(
    enabledAfterCancellationState,
    `${scenarioLabel}/enabled-after-cancellation`
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/enabled-after-cancellation`
  );

  await setSatelliteOverlayMode(client, "off");
  await waitForCondition(
    client,
    `${scenarioLabel} final overlay cleanup`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "off" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "disabled" &&
        root?.dataset.satelliteOverlayPointCount === "0";
    })()`
  );

  const finalDisabledState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayDisabledState(
    finalDisabledState,
    `${scenarioLabel}/final-disabled`,
    "runtime"
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/final-disabled`
  );

  const failedEnableRequestKey =
    "__SCENARIO_GLOBE_VIEWER_OVERLAY_FAILED_ENABLE_RESULT__";
  await verifyInjectedWalkerPointOverlayFailure(client, scenarioLabel, {
    failureEntityCount: 0,
    requestKey: failedEnableRequestKey,
    stateLabel: "failed-enable"
  }, dependencies);

  await setSatelliteOverlayMode(client, "walker-points");
  await waitForCondition(
    client,
    `${scenarioLabel} overlay enabled after injected failure`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "walker-points" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "ready" &&
        root?.dataset.satelliteOverlayPointCount === "18";
    })()`
  );

  const enabledAfterFailureState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayReadyState(
    enabledAfterFailureState,
    `${scenarioLabel}/enabled-after-failure`
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/enabled-after-failure`
  );

  await setSatelliteOverlayMode(client, "off");
  await waitForCondition(
    client,
    `${scenarioLabel} final overlay cleanup after injected failure`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "off" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "disabled" &&
        root?.dataset.satelliteOverlayPointCount === "0";
    })()`
  );

  const finalDisabledAfterFailureState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayDisabledState(
    finalDisabledAfterFailureState,
    `${scenarioLabel}/final-disabled-after-failure`,
    "runtime"
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/final-disabled-after-failure`
  );

  const partialPolylineFailureRequestKey =
    "__SCENARIO_GLOBE_VIEWER_OVERLAY_PARTIAL_POLYLINE_FAILURE_RESULT__";
  await verifyInjectedWalkerPointOverlayFailure(client, scenarioLabel, {
    failureEntityCount: 9,
    requestKey: partialPolylineFailureRequestKey,
    stateLabel: "failed-enable-after-partial-polyline"
  }, dependencies);

  await setSatelliteOverlayMode(client, "walker-points");
  await waitForCondition(
    client,
    `${scenarioLabel} overlay enabled after partial-polyline failure`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "walker-points" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "ready" &&
        root?.dataset.satelliteOverlayPointCount === "18";
    })()`
  );

  const enabledAfterPartialPolylineFailureState =
    await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayReadyState(
    enabledAfterPartialPolylineFailureState,
    `${scenarioLabel}/enabled-after-partial-polyline-failure`
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/enabled-after-partial-polyline-failure`
  );

  await setSatelliteOverlayMode(client, "off");
  await waitForCondition(
    client,
    `${scenarioLabel} final overlay cleanup after partial-polyline failure`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "off" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "disabled" &&
        root?.dataset.satelliteOverlayPointCount === "0";
    })()`
  );

  const finalDisabledAfterPartialPolylineFailureState =
    await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayDisabledState(
    finalDisabledAfterPartialPolylineFailureState,
    `${scenarioLabel}/final-disabled-after-partial-polyline-failure`,
    "runtime"
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/final-disabled-after-partial-polyline-failure`
  );

  await injectWalkerFixtureMissingFirstName(client);
  await setSatelliteOverlayMode(client, "walker-points");
  await waitForCondition(
    client,
    `${scenarioLabel} overlay enabled with id-label fallback`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "walker-points" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "ready" &&
        root?.dataset.satelliteOverlayPointCount === "18";
    })()`
  );

  const fallbackLabelState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayReadyState(
    fallbackLabelState,
    `${scenarioLabel}/enabled-with-id-label-fallback`
  );
  assertWalkerPointOverlayLabelsUseNameOrId(
    fallbackLabelState,
    `${scenarioLabel}/enabled-with-id-label-fallback`,
    ["sat-99001"]
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/enabled-with-id-label-fallback`
  );

  await setSatelliteOverlayMode(client, "off");
  await waitForCondition(
    client,
    `${scenarioLabel} overlay disabled after id-label fallback`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.satelliteOverlayMode === "off" &&
        root?.dataset.satelliteOverlaySource === "runtime" &&
        root?.dataset.satelliteOverlayState === "disabled" &&
        root?.dataset.satelliteOverlayPointCount === "0";
    })()`
  );

  const disabledAfterFallbackLabelState = await readSatelliteOverlayRuntime(client);
  assertWalkerPointOverlayDisabledState(
    disabledAfterFallbackLabelState,
    `${scenarioLabel}/disabled-after-id-label-fallback`,
    "runtime"
  );
  assertDesktopHudStatusOnlyState(
    await readHudLayoutState(client),
    `${scenarioLabel}/disabled-after-id-label-fallback`
  );
}
