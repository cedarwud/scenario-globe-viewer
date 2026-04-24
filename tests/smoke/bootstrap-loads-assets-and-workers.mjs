import { assertAmbientSiteTilesetUrlAllowed } from "../../scripts/site-hook-guard.mjs";
import {
  connectCdp,
  findHeadlessBrowser,
  resolvePageWebSocketUrl,
  startHeadlessBrowser,
  stopHeadlessBrowser
} from "./bootstrap-smoke-browser.mjs";
import { resolveSmokeScenarios } from "./bootstrap-smoke-scenarios.mjs";
import {
  ensureDistBuildExists,
  startStaticServer,
  stopStaticServer,
  verifyFetches
} from "./bootstrap-smoke-server.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveSmokeSuite() {
  const requestedSuite = process.argv.find((argument) =>
    argument.startsWith("--suite=")
  );
  const suite = requestedSuite?.slice("--suite=".length) ?? "baseline";

  assert(
    suite === "baseline" ||
      suite === "cleanup-baseline" ||
      suite === "overlay-toggle" ||
      suite === "showcase" ||
      suite === "showcase-env" ||
      suite === "site-dataset" ||
      suite === "site-hook-conflict",
    `Unsupported smoke suite: ${suite}`
  );

  return suite;
}

async function evaluateValue(client, expression) {
  const evaluation = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true
  });

  return evaluation.result.value;
}

async function evaluatePromiseValue(client, expression) {
  const evaluation = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });

  return evaluation.result.value;
}

async function readBootstrapState(client) {
  return await evaluateValue(
    client,
    `(() => {
      const root = document.documentElement;
      const lightingToggle = document.querySelector('[data-lighting-toggle="true"]');
      const hudFrame = document.querySelector('[data-hud-frame="true"]');
      const timePlaceholder = document.querySelector('[data-time-placeholder="true"]');

      return {
        bootstrapState: root?.dataset.bootstrapState ?? null,
        bootstrapDetail: root?.dataset.bootstrapDetail ?? null,
        scenePreset: root?.dataset.scenePreset ?? null,
        buildingShowcase: root?.dataset.buildingShowcase ?? null,
        buildingShowcaseSource: root?.dataset.buildingShowcaseSource ?? null,
        buildingShowcaseState: root?.dataset.buildingShowcaseState ?? null,
        buildingShowcaseDetail: root?.dataset.buildingShowcaseDetail ?? null,
        siteTilesetState: root?.dataset.siteTilesetState ?? null,
        siteTilesetDetail: root?.dataset.siteTilesetDetail ?? null,
        sceneFogActive: root?.dataset.sceneFogActive ?? null,
        sceneFogDensity: root?.dataset.sceneFogDensity ?? null,
        sceneFogVisualDensityScalar:
          root?.dataset.sceneFogVisualDensityScalar ?? null,
        sceneFogHeightScalar: root?.dataset.sceneFogHeightScalar ?? null,
        sceneFogHeightFalloff: root?.dataset.sceneFogHeightFalloff ?? null,
        sceneFogMaxHeight: root?.dataset.sceneFogMaxHeight ?? null,
        sceneFogMinimumBrightness:
          root?.dataset.sceneFogMinimumBrightness ?? null,
        sceneBloomActive: root?.dataset.sceneBloomActive ?? null,
        satelliteOverlayMode: root?.dataset.satelliteOverlayMode ?? null,
        satelliteOverlaySource: root?.dataset.satelliteOverlaySource ?? null,
        satelliteOverlayState: root?.dataset.satelliteOverlayState ?? null,
        satelliteOverlayDetail: root?.dataset.satelliteOverlayDetail ?? null,
        satelliteOverlayRenderMode:
          root?.dataset.satelliteOverlayRenderMode ?? null,
        satelliteOverlayPointCount: Number(
          root?.dataset.satelliteOverlayPointCount ?? "0"
        ),
        hasViewerShell: Boolean(document.querySelector('.cesium-viewer')),
        hasHudFrame: Boolean(hudFrame),
        hudVisibility:
          hudFrame instanceof HTMLElement
            ? hudFrame.getAttribute('data-hud-visibility')
            : null,
        isHudFrameHidden:
          hudFrame instanceof HTMLElement
            ? getComputedStyle(hudFrame).display === 'none'
            : false,
        hudPanelCount: document.querySelectorAll('[data-hud-panel]').length,
        hasTimePlaceholder: Boolean(timePlaceholder),
        timePlaceholderFieldCount: timePlaceholder
          ? timePlaceholder.querySelectorAll('[data-time-field]').length
          : 0,
        hasLightingToggle: Boolean(lightingToggle),
        hasLightingToggleDisabled:
          lightingToggle?.getAttribute('data-lighting-enabled') === 'false',
        hasUnpressedLightingToggle:
          lightingToggle?.getAttribute('aria-pressed') === 'false',
        satelliteOverlayControlCount: document.querySelectorAll(
          '[data-satellite-overlay-control]'
        ).length,
        perSatelliteControlCount:
          document.querySelectorAll('[data-satellite-control]').length
      };
    })()`
  );
}

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

async function readHudLayoutState(client) {
  return await evaluateValue(
    client,
    `(() => {
      const pickRect = (selector) => {
        const element = document.querySelector(selector);

        if (!element) {
          return null;
        }

        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);

        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          zIndex: style.zIndex,
          pointerEvents: style.pointerEvents
        };
      };

      const describeElementAt = (x, y) => {
        const element = document.elementFromPoint(x, y);

        if (!element) {
          return null;
        }

        return {
          tagName: element.tagName,
          className: typeof element.className === "string" ? element.className : "",
          title:
            typeof element.getAttribute === "function"
              ? element.getAttribute("title")
              : null,
          dataHudPanel:
            typeof element.getAttribute === "function"
              ? element.getAttribute("data-hud-panel")
              : null
        };
      };

      const leftPanel = pickRect(".hud-panel--left");
      const rightPanel = pickRect(".hud-panel--right");
      const statusPanel = pickRect(".hud-panel--status");
      const timePlaceholder = document.querySelector('[data-time-placeholder="true"]');
      const homepageEntryCta = document.querySelector(
        '[data-m8a-v31-homepage-cta="true"]'
      );
      const homepageEntryCtaEnter =
        homepageEntryCta instanceof HTMLElement
          ? homepageEntryCta.querySelector(
              "a.homepage-entry-cta__enter[data-m8a-v31-homepage-cta-enter='true']"
            )
          : null;
      const activeElement = document.activeElement;
      const geocoderInput = document.querySelector(".cesium-geocoder-input");
      const geocoderRect = pickRect(".cesium-geocoder-input");
      const geocoderSearchButton = pickRect(".cesium-geocoder-searchButton");
      const baseLayerPickerToggle = pickRect(".cesium-baseLayerPicker-selected");
      const baseLayerDropdown = pickRect(".cesium-baseLayerPicker-dropDown");

      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        hudFrame: pickRect(".hud-frame"),
        hudVisibility:
          document
            .querySelector(".hud-frame")
            ?.getAttribute("data-hud-visibility") ?? null,
        leftPanel,
        rightPanel,
        statusPanel,
        timePlaceholder: pickRect('[data-time-placeholder="true"]'),
        timePlaceholderText:
          timePlaceholder instanceof HTMLElement ? timePlaceholder.innerText : "",
        timePlaceholderInteractiveCount:
          timePlaceholder instanceof HTMLElement
            ? timePlaceholder.querySelectorAll("button, input, select").length
            : 0,
        toolbar: pickRect(".cesium-viewer-toolbar"),
        animation: pickRect(".cesium-viewer-animationContainer"),
        timeline: pickRect(".cesium-viewer-timelineContainer"),
        bottom: pickRect(".cesium-viewer-bottom"),
        creditText: pickRect(".cesium-credit-textContainer"),
        activeElement:
          activeElement instanceof HTMLElement
            ? {
                tagName: activeElement.tagName,
                className:
                  typeof activeElement.className === "string" ? activeElement.className : ""
              }
            : null,
        geocoderInput: geocoderRect
          ? {
              ...geocoderRect,
              value: geocoderInput instanceof HTMLInputElement ? geocoderInput.value : "",
              className: geocoderInput instanceof HTMLInputElement ? geocoderInput.className : ""
            }
          : null,
        geocoderSearchButton,
        baseLayerPickerToggle,
        baseLayerDropdown,
        leftPanelCenterElement:
          leftPanel && leftPanel.width > 0 && leftPanel.height > 0
            ? describeElementAt(
                leftPanel.left + leftPanel.width / 2,
                leftPanel.top + leftPanel.height / 2
              )
            : null,
        rightPanelCenterElement:
          rightPanel && rightPanel.width > 0 && rightPanel.height > 0
            ? describeElementAt(
                rightPanel.left + rightPanel.width / 2,
                rightPanel.top + rightPanel.height / 2
              )
            : null,
        geocoderCenterElement:
          geocoderRect && geocoderRect.width > 0 && geocoderRect.height > 0
            ? describeElementAt(
                geocoderRect.left + Math.min(geocoderRect.width / 2, geocoderRect.width - 8),
                geocoderRect.top + geocoderRect.height / 2
              )
            : null,
        geocoderSearchButtonCenterElement:
          geocoderSearchButton &&
          geocoderSearchButton.width > 0 &&
          geocoderSearchButton.height > 0
            ? describeElementAt(
                geocoderSearchButton.left + geocoderSearchButton.width / 2,
                geocoderSearchButton.top + geocoderSearchButton.height / 2
              )
            : null,
        baseLayerPickerToggleCenterElement:
          baseLayerPickerToggle &&
          baseLayerPickerToggle.width > 0 &&
          baseLayerPickerToggle.height > 0
            ? describeElementAt(
                baseLayerPickerToggle.left + baseLayerPickerToggle.width / 2,
                baseLayerPickerToggle.top + baseLayerPickerToggle.height / 2
              )
            : null,
        homepageEntryCta: pickRect("[data-m8a-v31-homepage-cta='true']"),
        homepageEntryCtaHref:
          homepageEntryCtaEnter instanceof HTMLAnchorElement
            ? homepageEntryCtaEnter.getAttribute("href")
            : null,
        homepageEntryCtaHeadlineText:
          homepageEntryCta instanceof HTMLElement
            ? homepageEntryCta.querySelector(".homepage-entry-cta__headline")
                ?.textContent ?? null
            : null,
        homepageEntryCtaChipText:
          homepageEntryCta instanceof HTMLElement
            ? homepageEntryCta.querySelector(".homepage-entry-cta__chip")
                ?.textContent ?? null
            : null
      };
    })()`
  );
}

async function waitForCondition(client, description, predicateExpression, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const matched = await evaluateValue(client, predicateExpression);

    if (matched) {
      return;
    }

    await sleep(100);
  }

  throw new Error(`Timed out waiting for ${description}.`);
}

function assertStatusOnlyHudShell(layoutState, scenarioLabel) {
  assert(layoutState.hudFrame, `Missing HUD frame during ${scenarioLabel}.`);
  assert(
    layoutState.hudVisibility === "status-only",
    `Expected HUD shell to advertise status-only placeholder state during ${scenarioLabel}: ${JSON.stringify(layoutState.hudVisibility)}`
  );
  assert(
    layoutState.hudFrame.display !== "none",
    `Expected HUD frame to stay mounted during ${scenarioLabel}: ${JSON.stringify(layoutState.hudFrame)}`
  );
  assert(layoutState.leftPanel, `Missing left HUD panel during ${scenarioLabel}.`);
  assert(layoutState.rightPanel, `Missing right HUD panel during ${scenarioLabel}.`);
  assert(layoutState.statusPanel, `Missing status HUD panel during ${scenarioLabel}.`);
  assert(
    layoutState.leftPanel.width === 0 && layoutState.leftPanel.height === 0,
    `Expected hidden left HUD panel to take no layout area during ${scenarioLabel}: ${JSON.stringify(layoutState.leftPanel)}`
  );
  assert(
    layoutState.rightPanel.width === 0 && layoutState.rightPanel.height === 0,
    `Expected hidden right HUD panel to take no layout area during ${scenarioLabel}: ${JSON.stringify(layoutState.rightPanel)}`
  );
}

function rectCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

async function dispatchMouseClick(client, point) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    button: "none",
    buttons: 0
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1
  });
}

function assertStatusOnlyHudReadout(layoutState, scenarioLabel) {
  assert(
    layoutState.statusPanel.width > 0 && layoutState.statusPanel.height > 0,
    `Expected status HUD panel to stay visible during ${scenarioLabel}: ${JSON.stringify(layoutState.statusPanel)}`
  );
  assert(
    layoutState.timePlaceholder &&
      layoutState.timePlaceholder.width > 0 &&
      layoutState.timePlaceholder.height > 0,
    `Expected time placeholder to stay visible during ${scenarioLabel}: ${JSON.stringify(layoutState.timePlaceholder)}`
  );
  assert(
    layoutState.timePlaceholderInteractiveCount === 0,
    `Expected time placeholder to stay read-only during ${scenarioLabel}: ${JSON.stringify(layoutState.timePlaceholderInteractiveCount)}`
  );
  assert(
    /timeline/i.test(layoutState.timePlaceholderText) &&
      /mode/i.test(layoutState.timePlaceholderText) &&
      /current/i.test(layoutState.timePlaceholderText) &&
      /range/i.test(layoutState.timePlaceholderText) &&
      /state/i.test(layoutState.timePlaceholderText),
    `Expected time placeholder text fields during ${scenarioLabel}: ${JSON.stringify(layoutState.timePlaceholderText)}`
  );
}

function assertHomepageEntryCtaState(layoutState, scenarioLabel) {
  assert(
    layoutState.homepageEntryCta &&
      layoutState.homepageEntryCta.width > 0 &&
      layoutState.homepageEntryCta.height > 0,
    `Expected homepage entry CTA to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.homepageEntryCta)}`
  );
  assert(
    typeof layoutState.homepageEntryCtaHref === "string" &&
      layoutState.homepageEntryCtaHref.startsWith(
        "/?firstIntakeScenarioId=app-oneweb-intelsat-geo-aviation"
      ) &&
      layoutState.homepageEntryCtaHref.includes("firstIntakeAutoplay=1"),
    `Expected homepage entry CTA to link to the addressed first-case route with autoplay during ${scenarioLabel}: ${JSON.stringify(layoutState.homepageEntryCtaHref)}`
  );
  assert(
    typeof layoutState.homepageEntryCtaChipText === "string" &&
      /cross-orbit/i.test(layoutState.homepageEntryCtaChipText) &&
      /handover/i.test(layoutState.homepageEntryCtaChipText),
    `Expected homepage entry CTA chip to signal cross-orbit handover during ${scenarioLabel}: ${JSON.stringify(layoutState.homepageEntryCtaChipText)}`
  );
  assert(
    typeof layoutState.homepageEntryCtaHeadlineText === "string" &&
      /oneweb/i.test(layoutState.homepageEntryCtaHeadlineText) &&
      /intelsat/i.test(layoutState.homepageEntryCtaHeadlineText),
    `Expected homepage entry CTA headline to name the first-case OneWeb+Intelsat pair during ${scenarioLabel}: ${JSON.stringify(layoutState.homepageEntryCtaHeadlineText)}`
  );
}

function assertDesktopHudStatusOnlyState(layoutState, scenarioLabel) {
  assert(layoutState.viewport.width === 1440, `Expected desktop width during ${scenarioLabel}.`);
  assert(layoutState.viewport.height === 900, `Expected desktop height during ${scenarioLabel}.`);
  assertStatusOnlyHudShell(layoutState, scenarioLabel);
  assertStatusOnlyHudReadout(layoutState, scenarioLabel);
  assertHomepageEntryCtaState(layoutState, scenarioLabel);
  assert(
    layoutState.toolbar && layoutState.toolbar.width > 0 && layoutState.toolbar.height > 0,
    `Expected native toolbar to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.toolbar)}`
  );
  assert(
    layoutState.timeline &&
      layoutState.timeline.width > 0 &&
      layoutState.timeline.height > 0,
    `Expected native timeline to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.timeline)}`
  );
  assert(
    layoutState.bottom && layoutState.bottom.width > 0 && layoutState.bottom.height > 0,
    `Expected native credits band to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.bottom)}`
  );
}

function assertShortHudStatusOnlyState(layoutState, scenarioLabel) {
  assert(layoutState.viewport.width === 1440, `Expected short width during ${scenarioLabel}.`);
  assert(layoutState.viewport.height === 760, `Expected short height during ${scenarioLabel}.`);
  assertStatusOnlyHudShell(layoutState, scenarioLabel);
  assertStatusOnlyHudReadout(layoutState, scenarioLabel);
  assertHomepageEntryCtaState(layoutState, scenarioLabel);
  assert(
    layoutState.toolbar && layoutState.toolbar.width > 0 && layoutState.toolbar.height > 0,
    `Expected native toolbar to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.toolbar)}`
  );
  assert(
    layoutState.timeline &&
      layoutState.timeline.width > 0 &&
      layoutState.timeline.height > 0,
    `Expected native timeline to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.timeline)}`
  );
  assert(
    layoutState.bottom && layoutState.bottom.width > 0 && layoutState.bottom.height > 0,
    `Expected native credits band to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.bottom)}`
  );
}

async function activateGeocoderAndInsertText(client, value) {
  let layoutState = await readHudLayoutState(client);
  assert(
    layoutState.geocoderSearchButton &&
      layoutState.geocoderSearchButton.width > 0 &&
      layoutState.geocoderSearchButton.height > 0,
    `Missing a user-reachable native geocoder search button: ${JSON.stringify(layoutState.geocoderSearchButton)}`
  );
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: rectCenter(layoutState.geocoderSearchButton).x,
    y: rectCenter(layoutState.geocoderSearchButton).y,
    button: "none",
    buttons: 0
  });
  await waitForCondition(
    client,
    "hover-expanded geocoder input",
    `(() => {
      const input = document.querySelector(".cesium-geocoder-input");
      return input instanceof HTMLInputElement &&
        input.getBoundingClientRect().width >= 200;
    })()`
  );
  layoutState = await readHudLayoutState(client);
  assert(
    layoutState.geocoderInput &&
      layoutState.geocoderInput.width >= 200 &&
      layoutState.geocoderInput.height > 0,
    `Expected hover-expanded geocoder input geometry before pointer focus: ${JSON.stringify(layoutState.geocoderInput)}`
  );
  assert(
    layoutState.geocoderCenterElement?.tagName === "INPUT",
    `Expected hover-expanded geocoder input to expose a real input hit target: ${JSON.stringify(layoutState.geocoderCenterElement)}`
  );
  await dispatchMouseClick(client, {
    x: layoutState.geocoderInput.left + Math.min(32, layoutState.geocoderInput.width / 4),
    y: layoutState.geocoderInput.top + layoutState.geocoderInput.height / 2
  });
  await waitForCondition(
    client,
    "pointer-focused geocoder input",
    `(() => {
      const input = document.querySelector(".cesium-geocoder-input");
      return input instanceof HTMLInputElement &&
        document.activeElement === input;
    })()`
  );
  await client.send("Input.insertText", { text: value });
  await waitForCondition(
    client,
    "expanded geocoder input",
    `(() => {
      const input = document.querySelector(".cesium-geocoder-input");
      return input instanceof HTMLInputElement &&
        input.value === ${JSON.stringify(value)} &&
        input.classList.contains("cesium-geocoder-input-wide");
    })()`
  );
}

async function toggleBaseLayerPicker(client) {
  const layoutState = await readHudLayoutState(client);
  assert(
    layoutState.baseLayerPickerToggle &&
      layoutState.baseLayerPickerToggle.width > 0 &&
      layoutState.baseLayerPickerToggle.height > 0,
    `Missing a user-reachable native BaseLayerPicker toggle: ${JSON.stringify(layoutState.baseLayerPickerToggle)}`
  );
  await dispatchMouseClick(client, rectCenter(layoutState.baseLayerPickerToggle));
}

async function dismissBaseLayerPicker(client) {
  const closed = await evaluateValue(
    client,
    `(() => {
      const toggle = document.querySelector(".cesium-baseLayerPicker-selected");
      if (!(toggle instanceof HTMLElement)) {
        return false;
      }

      toggle.click();
      return true;
    })()`
  );

  assert(closed, "Expected BaseLayerPicker toggle to exist while dismissing dropdown.");
}

async function dismissNavigationHelpIfVisible(client) {
  const dismissed = await evaluateValue(
    client,
    `(() => {
      const visiblePanel = document.querySelector(".cesium-click-navigation-help-visible");
      const button = document.querySelector(".cesium-navigation-help-button");

      if (!visiblePanel || !(button instanceof HTMLElement)) {
        return false;
      }

      button.click();
      return true;
    })()`
  );

  if (dismissed) {
    await sleep(150);
  }
}

async function runDesktopNativeControlChecks(client, scenarioLabel) {
  await activateGeocoderAndInsertText(client, "Taipei");
  let layoutState = await readHudLayoutState(client);

  assert(
    layoutState.geocoderInput?.className.includes("cesium-geocoder-input-wide"),
    `Expected geocoder input to stay expanded during ${scenarioLabel}: ${JSON.stringify(layoutState.geocoderInput)}`
  );
  assert(
    layoutState.activeElement?.tagName === "INPUT" &&
      layoutState.activeElement.className.includes("cesium-geocoder-input"),
    `Expected pointer click on the native geocoder control to focus the input during ${scenarioLabel}: ${JSON.stringify(layoutState.activeElement)}`
  );
  assert(
    layoutState.geocoderCenterElement?.tagName === "INPUT",
    `Expected geocoder input to remain directly reachable with the status-only HUD placeholder during ${scenarioLabel}: ${JSON.stringify(layoutState.geocoderCenterElement)}`
  );
  assert(
    layoutState.geocoderSearchButtonCenterElement !== null,
    `Expected a concrete geocoder search-button hit target during ${scenarioLabel}.`
  );
  assertStatusOnlyHudShell(layoutState, `${scenarioLabel}/geocoder`);
  assertStatusOnlyHudReadout(layoutState, `${scenarioLabel}/geocoder`);

  await toggleBaseLayerPicker(client);
  await waitForCondition(
    client,
    "opened BaseLayerPicker",
    `(() => {
      const dropdown = document.querySelector(".cesium-baseLayerPicker-dropDown");
      return dropdown instanceof HTMLElement && getComputedStyle(dropdown).visibility === "visible";
    })()`
  );

  layoutState = await readHudLayoutState(client);
  assert(
    layoutState.baseLayerDropdown?.visibility === "visible",
    `Expected BaseLayerPicker dropdown to be visible during ${scenarioLabel}: ${JSON.stringify(layoutState.baseLayerDropdown)}`
  );
  assert(
    layoutState.baseLayerPickerToggleCenterElement !== null,
    `Expected a concrete BaseLayerPicker toggle hit target during ${scenarioLabel}.`
  );
  assert(
    layoutState.baseLayerDropdown &&
      layoutState.baseLayerDropdown.width > 0 &&
      layoutState.baseLayerDropdown.height > 0,
    `Expected opened BaseLayerPicker dropdown to remain visible with the status-only HUD placeholder during ${scenarioLabel}: ${JSON.stringify(layoutState.baseLayerDropdown)}`
  );
  assertStatusOnlyHudShell(layoutState, `${scenarioLabel}/base-layer-picker`);
  assertStatusOnlyHudReadout(layoutState, `${scenarioLabel}/base-layer-picker`);

  await dismissBaseLayerPicker(client);
  await waitForCondition(
    client,
    "closed BaseLayerPicker",
    `(() => {
      const dropdown = document.querySelector(".cesium-baseLayerPicker-dropDown");
      return dropdown instanceof HTMLElement && getComputedStyle(dropdown).visibility !== "visible";
    })()`
  );
}

function buildingShowcaseMatchesExpectation(lastState, expectedBuildingShowcase) {
  return (
    lastState.buildingShowcase === expectedBuildingShowcase.key &&
    lastState.buildingShowcaseSource === expectedBuildingShowcase.source &&
    expectedBuildingShowcase.allowedStates.includes(lastState.buildingShowcaseState)
  );
}

function siteTilesetMatchesExpectation(lastState, expectedSiteTileset) {
  return (
    expectedSiteTileset.allowedStates.includes(lastState.siteTilesetState) &&
    (!expectedSiteTileset.detailSubstring ||
      lastState.siteTilesetDetail?.includes(expectedSiteTileset.detailSubstring))
  );
}

const WALKER_ORBIT_POLYLINE_SAMPLE_BUDGET = 49;
const WALKER_ORBIT_POLYLINE_CACHE_BUCKET_MS = 60_000;

function baselineShellMatchesExpectation(lastState) {
  return (
    lastState.sceneFogActive === "true" &&
    lastState.sceneFogDensity === "0.0006" &&
    lastState.sceneFogVisualDensityScalar === "0.15" &&
    lastState.sceneFogHeightScalar === "0.001" &&
    lastState.sceneFogHeightFalloff === "0.59" &&
    lastState.sceneFogMaxHeight === "800000" &&
    lastState.sceneFogMinimumBrightness === "0.03" &&
    lastState.sceneBloomActive === "false" &&
    lastState.hasViewerShell &&
    lastState.hasHudFrame &&
    lastState.hudVisibility === "status-only" &&
    !lastState.isHudFrameHidden &&
    lastState.hudPanelCount >= 3 &&
    lastState.hasTimePlaceholder &&
    lastState.timePlaceholderFieldCount === 5 &&
    lastState.hasLightingToggle &&
    lastState.hasLightingToggleDisabled &&
    lastState.hasUnpressedLightingToggle &&
    lastState.satelliteOverlayMode === "off" &&
    lastState.satelliteOverlaySource === "default-off" &&
    lastState.satelliteOverlayState === "disabled" &&
    lastState.satelliteOverlayRenderMode === "point-label-polyline" &&
    lastState.satelliteOverlayPointCount === 0 &&
    lastState.satelliteOverlayControlCount === 0 &&
    lastState.perSatelliteControlCount === 0
  );
}

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
  }
) {
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

async function verifySatelliteOverlayToggle(client, scenarioLabel) {
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
  });

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
  });

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

async function waitForBootstrapReady(client, scenario, attemptLabel) {
  let lastState = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    lastState = await readBootstrapState(client);

    if (
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === scenario.expectedScenePreset &&
      buildingShowcaseMatchesExpectation(
        lastState,
        scenario.expectedBuildingShowcase
      ) &&
      siteTilesetMatchesExpectation(lastState, scenario.expectedSiteTileset) &&
      (!scenario.requireFullBaselineState ||
        baselineShellMatchesExpectation(lastState))
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `Phase 1 smoke hit bootstrap error during ${scenario.label}/${attemptLabel}: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(250);
  }

  throw new Error(
    `Phase 1 smoke did not reach a ready viewer during ${scenario.label}/${attemptLabel}: ${JSON.stringify(lastState)}`
  );
}

async function verifyInjectedOsmBuildingsFailure(
  client,
  scenarioLabel,
  expectedStates,
  expectedDetailSubstring
) {
  await waitForCondition(
    client,
    `${scenarioLabel} OSM Buildings fallback`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.bootstrapState === "ready" &&
        root?.dataset.buildingShowcase === "osm" &&
        ${JSON.stringify(expectedStates)}.includes(root?.dataset.buildingShowcaseState ?? "") &&
        ${
          expectedDetailSubstring
            ? `typeof root?.dataset.buildingShowcaseDetail === "string" &&
              root.dataset.buildingShowcaseDetail.includes(${JSON.stringify(expectedDetailSubstring)})`
            : "true"
        };
    })()`
  );

  const lastState = await readBootstrapState(client);
  assert(
    lastState.bootstrapState === "ready",
    `Expected bootstrap to stay ready after OSM Buildings failure during ${scenarioLabel}: ${JSON.stringify(lastState)}`
  );
  assert(
    expectedStates.includes(lastState.buildingShowcaseState),
    `Expected injected OSM Buildings failure to surface as an opt-in showcase error during ${scenarioLabel}: ${JSON.stringify(lastState)}`
  );
  assert(
    lastState.buildingShowcaseState !== "ready",
    `Expected injected OSM Buildings failure to avoid a ready showcase state during ${scenarioLabel}: ${JSON.stringify(lastState)}`
  );
  if (expectedDetailSubstring) {
    assert(
      lastState.buildingShowcaseDetail?.includes(expectedDetailSubstring),
      `Expected injected OSM Buildings failure detail to mention ${expectedDetailSubstring} during ${scenarioLabel}: ${JSON.stringify(lastState)}`
    );
  }
}

async function verifyBootstrapInHeadlessBrowser(baseUrl, suite) {
  const browserCommand = findHeadlessBrowser();
  const attempts = [
    {
      label: "swiftshader-headless",
      extraArgs: [
        "--disable-gpu",
        "--use-angle=swiftshader",
        "--enable-webgl"
      ]
    }
  ];
  const dormantSiteTileset = {
    allowedStates: ["dormant"]
  };
  const scenarios = resolveSmokeScenarios({
    suite,
    dormantSiteTileset,
    assertDesktopHudStatusOnlyState,
    assertShortHudStatusOnlyState,
    runDesktopNativeControlChecks,
    verifyInjectedOsmBuildingsFailure,
    verifySatelliteOverlayToggle
  });

  for (const scenario of scenarios) {
    for (const attempt of attempts) {
      const browser = await startHeadlessBrowser(browserCommand, attempt.extraArgs);
      const requestUrl = `${baseUrl}${scenario.requestPath}`;

      try {
        const pageWebSocketUrl = await resolvePageWebSocketUrl(browser.browserWebSocketUrl);
        const client = await connectCdp(pageWebSocketUrl);

        try {
          await client.send("Page.enable");
          await client.send("Runtime.enable");
          if (scenario.initScript) {
            await client.send("Page.addScriptToEvaluateOnNewDocument", {
              source: scenario.initScript
            });
          }
          await client.send("Emulation.setDeviceMetricsOverride", {
            width: scenario.viewport.width,
            height: scenario.viewport.height,
            deviceScaleFactor: scenario.viewport.deviceScaleFactor,
            mobile: false
          });
          await client.send("Page.navigate", { url: requestUrl });
          await waitForBootstrapReady(client, scenario, attempt.label);
          await dismissNavigationHelpIfVisible(client);
          if (scenario.validateLayout) {
            scenario.validateLayout(await readHudLayoutState(client));
          }
          if (scenario.runInteractiveChecks) {
            await scenario.runInteractiveChecks(client);
          }
          if (scenario.runAfterReady) {
            await scenario.runAfterReady(client);
          }
        } finally {
          await client.close();
        }
      } finally {
        await stopHeadlessBrowser(browser.browserProcess, browser.userDataDir);
      }
    }
  }
}

async function main() {
  const suite = resolveSmokeSuite();
  assertAmbientSiteTilesetUrlAllowed(`Phase 1 ${suite} smoke`, {
    allowConfiguredSiteTileset:
      suite === "site-hook-conflict" || suite === "site-dataset"
  });
  ensureDistBuildExists();

  const { server, baseUrl } = await startStaticServer();

  try {
    await verifyFetches(baseUrl);
    await verifyBootstrapInHeadlessBrowser(baseUrl, suite);
    console.log(`Phase 1 ${suite} smoke verification passed.`);
  } finally {
    await stopStaticServer(server);
  }
}

await main();
