import type { Viewer } from "cesium";

import {
  getScenePreset,
  type ScenePresetKey
} from "../features/globe/scene-preset";
import {
  applyScenePreset,
  type ScenePresetRuntimeOptions
} from "../features/globe/scene-preset-runtime";
import type {
  ReplayClock
} from "../features/time";
import type {
  ScenarioPlanDriver,
  ScenarioResolvedTimeInput,
  ScenarioPresentationRef,
  ScenarioSatelliteSourceRef,
  ScenarioSiteDatasetRef,
  ScenarioValidationRef
} from "../features/scenario";
import type {
  SatelliteOverlayController,
  SatelliteOverlayMode
} from "./satellite-overlay-controller";

export interface ScenarioRuntimePlanBindings {
  setPresentation(presentation: ScenarioPresentationRef): Promise<void> | void;
  setTime(time: ScenarioResolvedTimeInput): Promise<void> | void;
  attachSiteDataset?(siteDataset: ScenarioSiteDatasetRef): Promise<void> | void;
  detachSiteDataset?(): Promise<void> | void;
  attachSatelliteSource?(
    satellite: ScenarioSatelliteSourceRef
  ): Promise<void> | void;
  detachSatelliteSource?(): Promise<void> | void;
  attachValidation?(validation: ScenarioValidationRef): Promise<void> | void;
  detachValidation?(): Promise<void> | void;
}

export interface ScenarioRuntimePlanDriverOptions {
  viewer: Viewer;
  replayClock: ReplayClock;
  scenePresetRuntime?: ScenePresetRuntimeOptions;
  siteDatasetBinding?: {
    attach(siteDataset: ScenarioSiteDatasetRef): Promise<void> | void;
    detach(): Promise<void> | void;
  };
  satelliteBinding?: {
    attach(satellite: ScenarioSatelliteSourceRef): Promise<void> | void;
    detach(): Promise<void> | void;
  };
  validationBinding?: {
    attach(validation: ScenarioValidationRef): Promise<void> | void;
    detach(): Promise<void> | void;
  };
}

export interface ScenarioRuntimeSatelliteBindingOptions {
  satelliteOverlay: SatelliteOverlayController;
  resolveMode(
    satellite: ScenarioSatelliteSourceRef
  ): SatelliteOverlayMode;
}

function createUnsupportedStepError(step: string): Error {
  return new Error(
    `Scenario runtime plan driver does not support ${step} in the current runtime slice.`
  );
}

export function createScenarioRuntimePlanDriver(
  bindings: ScenarioRuntimePlanBindings
): ScenarioPlanDriver {
  // Keep the first runtime adapter fail-fast. Missing downstream bindings
  // should stop the plan instead of silently reporting a successful apply.
  return {
    detachValidation(): Promise<void> | void {
      if (!bindings.detachValidation) {
        throw createUnsupportedStepError("validation detach");
      }
      return bindings.detachValidation();
    },
    detachSiteDataset(): Promise<void> | void {
      if (!bindings.detachSiteDataset) {
        throw createUnsupportedStepError("site dataset detach");
      }
      return bindings.detachSiteDataset();
    },
    detachSatelliteSource(): Promise<void> | void {
      if (!bindings.detachSatelliteSource) {
        throw createUnsupportedStepError("satellite detach");
      }
      return bindings.detachSatelliteSource();
    },
    setPresentation(
      presentation: ScenarioPresentationRef
    ): Promise<void> | void {
      return bindings.setPresentation(presentation);
    },
    setTime(time: ScenarioResolvedTimeInput): Promise<void> | void {
      return bindings.setTime(time);
    },
    attachSatelliteSource(
      satellite: ScenarioSatelliteSourceRef
    ): Promise<void> | void {
      if (!bindings.attachSatelliteSource) {
        throw createUnsupportedStepError("satellite attach");
      }
      return bindings.attachSatelliteSource(satellite);
    },
    attachSiteDataset(
      siteDataset: ScenarioSiteDatasetRef
    ): Promise<void> | void {
      if (!bindings.attachSiteDataset) {
        throw createUnsupportedStepError("site dataset attach");
      }
      return bindings.attachSiteDataset(siteDataset);
    },
    attachValidation(
      validation: ScenarioValidationRef
    ): Promise<void> | void {
      if (!bindings.attachValidation) {
        throw createUnsupportedStepError("validation attach");
      }
      return bindings.attachValidation(validation);
    }
  };
}

export function createRuntimeSatellitePlanBinding({
  satelliteOverlay,
  resolveMode
}: ScenarioRuntimeSatelliteBindingOptions): {
  attach(satellite: ScenarioSatelliteSourceRef): Promise<void>;
  detach(): Promise<void>;
} {
  return {
    async attach(satellite: ScenarioSatelliteSourceRef): Promise<void> {
      await satelliteOverlay.setMode(resolveMode(satellite));
    },
    async detach(): Promise<void> {
      await satelliteOverlay.setMode("off");
    }
  };
}

function setRuntimePresentation(
  viewer: Viewer,
  presentation: ScenarioPresentationRef,
  scenePresetRuntime: ScenePresetRuntimeOptions
): void {
  const preset = getScenePreset(presentation.presetKey as ScenePresetKey);
  applyScenePreset(viewer, preset, scenePresetRuntime);
}

function setRuntimeTime(
  replayClock: ReplayClock,
  time: ScenarioResolvedTimeInput
): void {
  replayClock.setMode(
    time.mode,
    time.range
      ? {
          start: time.range.start,
          stop: time.range.stop
        }
      : undefined
  );
}

export function createViewerScenarioRuntimePlanDriver({
  viewer,
  replayClock,
  scenePresetRuntime,
  siteDatasetBinding,
  satelliteBinding,
  validationBinding
}: ScenarioRuntimePlanDriverOptions): ScenarioPlanDriver {
  return createScenarioRuntimePlanDriver({
    setPresentation(presentation): void {
      setRuntimePresentation(viewer, presentation, scenePresetRuntime ?? {});
    },
    setTime(time): void {
      setRuntimeTime(replayClock, time);
    },
    attachSiteDataset: siteDatasetBinding?.attach,
    detachSiteDataset: siteDatasetBinding?.detach,
    attachSatelliteSource: satelliteBinding?.attach,
    detachSatelliteSource: satelliteBinding?.detach,
    attachValidation: validationBinding?.attach,
    detachValidation: validationBinding?.detach
  });
}
