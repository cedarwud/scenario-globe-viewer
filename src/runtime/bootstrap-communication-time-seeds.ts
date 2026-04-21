import type {
  CommunicationTimeSourceKind,
  CommunicationTimeWindowTemplate
} from "../features/communication-time/communication-time";
import type { ScenePresetKey } from "../features/globe/scene-preset";
import type { BootstrapScenarioMode } from "./resolve-bootstrap-scenario";

export const BOOTSTRAP_PROXY_SOURCE_KIND: CommunicationTimeSourceKind =
  "bootstrap-proxy";

export const BOOTSTRAP_PROXY_WINDOW_TEMPLATES: Record<
  ScenePresetKey,
  Record<BootstrapScenarioMode, ReadonlyArray<CommunicationTimeWindowTemplate>>
> = {
  global: {
    "real-time": [
      { startRatio: 0.04, stopRatio: 0.22 },
      { startRatio: 0.37, stopRatio: 0.56 },
      { startRatio: 0.72, stopRatio: 0.94 }
    ],
    prerecorded: [
      { startRatio: 0.08, stopRatio: 0.28 },
      { startRatio: 0.44, stopRatio: 0.68 },
      { startRatio: 0.8, stopRatio: 0.97 }
    ]
  },
  regional: {
    "real-time": [
      { startRatio: 0.05, stopRatio: 0.18 },
      { startRatio: 0.27, stopRatio: 0.46 },
      { startRatio: 0.61, stopRatio: 0.79 },
      { startRatio: 0.88, stopRatio: 0.96 }
    ],
    prerecorded: [
      { startRatio: 0.09, stopRatio: 0.24 },
      { startRatio: 0.33, stopRatio: 0.55 },
      { startRatio: 0.67, stopRatio: 0.84 }
    ]
  },
  site: {
    "real-time": [
      { startRatio: 0.12, stopRatio: 0.18 },
      { startRatio: 0.36, stopRatio: 0.44 },
      { startRatio: 0.58, stopRatio: 0.67 },
      { startRatio: 0.82, stopRatio: 0.89 }
    ],
    prerecorded: [
      { startRatio: 0.14, stopRatio: 0.21 },
      { startRatio: 0.39, stopRatio: 0.48 },
      { startRatio: 0.63, stopRatio: 0.72 },
      { startRatio: 0.86, stopRatio: 0.93 }
    ]
  }
};
