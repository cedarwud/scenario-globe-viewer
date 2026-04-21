export const desktopViewport = {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1
};

export const shortViewport = {
  width: 1440,
  height: 760,
  deviceScaleFactor: 1
};

export const OSM_BUILDINGS_PRE_ATTACH_FAILURE_INIT_SCRIPT = `
(() => {
  const shouldFail = (url) =>
    typeof url === "string" && url.includes("/v1/assets/96188");

  const OriginalXMLHttpRequest = window.XMLHttpRequest;
  class FailingOsmBuildingsXMLHttpRequest extends OriginalXMLHttpRequest {
    open(method, url, ...rest) {
      this.__scenarioGlobeViewerUrl = typeof url === "string" ? url : String(url);
      return super.open(method, url, ...rest);
    }

    send(...args) {
      if (shouldFail(this.__scenarioGlobeViewerUrl)) {
        queueMicrotask(() => {
          this.dispatchEvent(new ProgressEvent("error"));
        });
        return;
      }

      return super.send(...args);
    }
  }

  window.XMLHttpRequest = FailingOsmBuildingsXMLHttpRequest;
})();
`;

export const OSM_BUILDINGS_POST_ATTACH_FAILURE_INIT_SCRIPT = `
(() => {
  const shouldFail = (url) => {
    if (typeof url !== "string" || url.includes("/v1/assets/96188")) {
      return false;
    }

    if (url.includes("tileset.json")) {
      return false;
    }

    return (
      url.includes("96188") ||
      /\\.(b3dm|cmpt|glb|i3dm|pnts|subtree)(\\?|$)/i.test(url)
    );
  };

  const OriginalXMLHttpRequest = window.XMLHttpRequest;
  class FailingOsmBuildingsContentXMLHttpRequest extends OriginalXMLHttpRequest {
    open(method, url, ...rest) {
      this.__scenarioGlobeViewerUrl = typeof url === "string" ? url : String(url);
      return super.open(method, url, ...rest);
    }

    send(...args) {
      if (shouldFail(this.__scenarioGlobeViewerUrl)) {
        queueMicrotask(() => {
          this.dispatchEvent(new ProgressEvent("error"));
        });
        return;
      }

      return super.send(...args);
    }
  }

  window.XMLHttpRequest = FailingOsmBuildingsContentXMLHttpRequest;
})();
`;

export function resolveSmokeScenarios({
  suite,
  dormantSiteTileset,
  assertDesktopHudStatusOnlyState,
  assertShortHudStatusOnlyState,
  runDesktopNativeControlChecks,
  verifyInjectedOsmBuildingsFailure,
  verifySatelliteOverlayToggle
}) {
  const baselineScenarios = [
    {
      label: "default-global",
      requestPath: "/",
      expectedScenePreset: "global",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      validateLayout: (layoutState) => {
        assertDesktopHudStatusOnlyState(layoutState, "default-global");
      },
      runInteractiveChecks: async (client) => {
        await runDesktopNativeControlChecks(client, "default-global");
      },
      requireFullBaselineState: true
    },
    {
      label: "regional-query",
      requestPath: "/?scenePreset=regional",
      expectedScenePreset: "regional",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      requireFullBaselineState: true
    },
    {
      label: "site-query",
      requestPath: "/?scenePreset=site",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      requireFullBaselineState: true
    },
    {
      label: "default-global-short",
      requestPath: "/",
      expectedScenePreset: "global",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: shortViewport,
      validateLayout: (layoutState) => {
        assertShortHudStatusOnlyState(layoutState, "default-global-short");
      },
      requireFullBaselineState: true
    }
  ];
  const cleanupBaselineScenarios = [
    {
      label: "cleanup-baseline-default-global",
      requestPath: "/",
      expectedScenePreset: "global",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      requireFullBaselineState: false
    }
  ];
  const showcaseScenarios = [
    // The live ion-backed showcase path is not a hard happy-path gate.
    // This scenario only proves that an explicit opt-in is wired into
    // bootstrap and surfaces a non-disabled showcase state without breaking
    // the baseline viewer shell. Deterministic failure-state handling is
    // covered by the injected-failure scenarios below.
    {
      label: "site-osm-buildings-opt-in-wiring",
      requestPath: "/?scenePreset=site&buildingShowcase=osm",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "osm",
        source: "query-param",
        allowedStates: ["loading", "ready", "degraded", "error"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport
    },
    {
      label: "site-osm-buildings-preattach-fallback",
      requestPath: "/?scenePreset=site&buildingShowcase=osm",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "osm",
        source: "query-param",
        allowedStates: ["loading", "error"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      initScript: OSM_BUILDINGS_PRE_ATTACH_FAILURE_INIT_SCRIPT,
      runAfterReady: async (client) => {
        await verifyInjectedOsmBuildingsFailure(
          client,
          "site-osm-buildings-preattach-fallback",
          ["error"]
        );
      }
    },
    {
      label: "site-osm-buildings-postattach-fallback",
      requestPath: "/?scenePreset=site&buildingShowcase=osm",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "osm",
        source: "query-param",
        allowedStates: ["loading", "error", "degraded"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      initScript: OSM_BUILDINGS_POST_ATTACH_FAILURE_INIT_SCRIPT,
      runAfterReady: async (client) => {
        await verifyInjectedOsmBuildingsFailure(
          client,
          "site-osm-buildings-postattach-fallback",
          ["error", "degraded"],
          "Tile/content failure after attachment"
        );
      }
    }
  ];
  const showcaseEnvScenarios = [
    {
      label: "site-osm-buildings-env-opt-in-wiring",
      requestPath: "/?scenePreset=site",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "osm",
        source: "env",
        allowedStates: ["loading", "ready", "degraded", "error"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport
    }
  ];
  const siteHookConflictScenarios = [
    {
      label: "site-osm-buildings-blocks-configured-site-hook",
      requestPath: "/?scenePreset=site&buildingShowcase=osm",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "osm",
        source: "query-param",
        allowedStates: ["loading", "ready", "degraded", "error"]
      },
      expectedSiteTileset: {
        allowedStates: ["blocked"],
        detailSubstring: "OSM Buildings showcase is active"
      },
      viewport: desktopViewport
    }
  ];
  const siteDatasetScenarios = [
    {
      label: "site-configured-dataset-ready",
      requestPath: "/?scenePreset=site",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: {
        allowedStates: ["ready"],
        detailSubstring: "Loaded configured site dataset"
      },
      viewport: desktopViewport,
      requireFullBaselineState: true
    }
  ];
  const overlayToggleScenarios = [
    {
      label: "default-global-overlay-toggle",
      requestPath: "/",
      expectedScenePreset: "global",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      validateLayout: (layoutState) => {
        assertDesktopHudStatusOnlyState(
          layoutState,
          "default-global-overlay-toggle"
        );
      },
      runAfterReady: async (client) => {
        await verifySatelliteOverlayToggle(client, "default-global-overlay-toggle");
      },
      requireFullBaselineState: true
    }
  ];

  return suite === "baseline"
    ? baselineScenarios
    : suite === "cleanup-baseline"
      ? cleanupBaselineScenarios
      : suite === "overlay-toggle"
        ? overlayToggleScenarios
        : suite === "showcase"
          ? showcaseScenarios
          : suite === "showcase-env"
            ? showcaseEnvScenarios
            : suite === "site-dataset"
              ? siteDatasetScenarios
              : siteHookConflictScenarios;
}
