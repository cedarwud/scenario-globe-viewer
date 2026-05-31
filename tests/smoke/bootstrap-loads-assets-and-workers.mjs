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
import {
  assert,
  dispatchMouseClick,
  evaluateValue,
  rectCenter,
  sleep,
  waitForCondition
} from "./helpers/bootstrap-smoke-common.mjs";
import { verifySatelliteOverlayToggle } from "./helpers/bootstrap-satellite-overlay-checks.mjs";
import { SELECTED_PAIR_DEMO_REQUEST_PATH } from "../../scripts/helpers/demo-routes.mjs";

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
        '[data-m8a-v44-homepage-ground-station-entry-surface="true"]'
      );
      const homepageEntryCtaEnter =
        homepageEntryCta instanceof HTMLElement
          ? homepageEntryCta.querySelector(
              "a.homepage-entry-cta__button[data-m8a-v44-homepage-ground-station-entry='true']"
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
          timePlaceholder instanceof HTMLElement ? timePlaceholder.textContent ?? "" : "",
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
        homeButton: pickRect(".cesium-home-button"),
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
        homepageEntryCta: pickRect(
          "[data-m8a-v44-homepage-ground-station-entry-surface='true']"
        ),
        homepageEntryCtaButton: pickRect(
          "[data-m8a-v44-homepage-ground-station-entry='true']"
        ),
        homepageEntryCtaHref:
          homepageEntryCtaEnter instanceof HTMLAnchorElement
            ? homepageEntryCtaEnter.getAttribute("href")
            : null,
        homepageEntryCtaAriaLabel:
          homepageEntryCtaEnter instanceof HTMLAnchorElement
            ? homepageEntryCtaEnter.getAttribute("aria-label")
            : null,
        homepageEntryCtaTitle:
          homepageEntryCtaEnter instanceof HTMLAnchorElement
            ? homepageEntryCtaEnter.getAttribute("title")
            : null,
        homepageEntryCtaMount:
          homepageEntryCta instanceof HTMLElement
            ? homepageEntryCta.dataset.homepageEntryMount ?? null
            : null
      };
    })()`
  );
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
    `Expected homepage entry icon host to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.homepageEntryCta)}`
  );
  assert(
    layoutState.homepageEntryCtaButton &&
      layoutState.homepageEntryCtaButton.width >= 32 &&
      layoutState.homepageEntryCtaButton.width <= 48 &&
      layoutState.homepageEntryCtaButton.height >= 32 &&
      layoutState.homepageEntryCtaButton.height <= 48 &&
      layoutState.homepageEntryCtaButton.top <= 12 &&
      layoutState.homeButton &&
      layoutState.homepageEntryCtaButton.right <= layoutState.homeButton.left,
    `Expected homepage V4 entry to be a compact top-right icon button before the native home button during ${scenarioLabel}: ${JSON.stringify({
      homepageEntryCtaButton: layoutState.homepageEntryCtaButton,
      homeButton: layoutState.homeButton
    })}`
  );
  assert(
    typeof layoutState.homepageEntryCtaHref === "string" &&
      layoutState.homepageEntryCtaHref === SELECTED_PAIR_DEMO_REQUEST_PATH,
    `Expected homepage entry CTA to link to the selected-pair route during ${scenarioLabel}: ${JSON.stringify(layoutState.homepageEntryCtaHref)}`
  );
  assert(
    typeof layoutState.homepageEntryCtaAriaLabel === "string" &&
      /selected.pair/i.test(layoutState.homepageEntryCtaAriaLabel) &&
      /cross.orbit/i.test(layoutState.homepageEntryCtaAriaLabel) &&
      /taiwan/i.test(layoutState.homepageEntryCtaAriaLabel) &&
      /sansa/i.test(layoutState.homepageEntryCtaAriaLabel),
    `Expected homepage entry icon accessible label to name the selected-pair route during ${scenarioLabel}: ${JSON.stringify(layoutState.homepageEntryCtaAriaLabel)}`
  );
  assert(
    layoutState.homepageEntryCtaMount === "cesium-toolbar",
    `Expected homepage entry icon to mount in the top-right Cesium toolbar during ${scenarioLabel}: ${JSON.stringify(layoutState.homepageEntryCtaMount)}`
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
    verifySatelliteOverlayToggle: (client, scenarioLabel) =>
      verifySatelliteOverlayToggle(client, scenarioLabel, {
        assertDesktopHudStatusOnlyState,
        readHudLayoutState
      })
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
