import type {
  CommunicationTimeSourceKind,
  CommunicationTimeWindowTemplate
} from "../features/communication-time/communication-time";
import type { ScenePresetKey } from "../features/globe/scene-preset";
import type { BootstrapScenarioMode } from "./resolve-bootstrap-scenario";
import type { BootstrapScenarioDefinition } from "./scenario-bootstrap-session";

export interface BootstrapProxyCommunicationTimeSourceEntry {
  scenarioId: string;
  sourceKind: CommunicationTimeSourceKind;
  windowTemplates: ReadonlyArray<CommunicationTimeWindowTemplate>;
}

export interface BootstrapProxyCommunicationTimeSourceCatalog {
  entries: ReadonlyArray<BootstrapProxyCommunicationTimeSourceEntry>;
}

const BOOTSTRAP_PROXY_SOURCE_KIND: CommunicationTimeSourceKind = "bootstrap-proxy";

const BOOTSTRAP_PROXY_WINDOW_TEMPLATES: Record<
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

function resolveBootstrapScenarioMode(
  definition: BootstrapScenarioDefinition
): BootstrapScenarioMode {
  if (
    definition.kind !== "real-time" &&
    definition.kind !== "prerecorded"
  ) {
    throw new Error(
      `Bootstrap communication-time source must stay on bootstrap-safe scenario kinds: ${definition.id}`
    );
  }

  if (
    definition.time.mode !== "real-time" &&
    definition.time.mode !== "prerecorded"
  ) {
    throw new Error(
      `Bootstrap communication-time source must stay bounded to real-time/prerecorded modes: ${definition.id}`
    );
  }

  return definition.time.mode;
}

function assertBootstrapCommunicationTimeSources(
  definition: BootstrapScenarioDefinition
): void {
  if (definition.sources.satellite) {
    throw new Error(
      `Bootstrap communication-time source must not attach satellite sources: ${definition.id}`
    );
  }

  if (definition.sources.siteDataset) {
    throw new Error(
      `Bootstrap communication-time source must not attach site datasets: ${definition.id}`
    );
  }

  if (definition.sources.validation) {
    throw new Error(
      `Bootstrap communication-time source must not attach validation refs: ${definition.id}`
    );
  }
}

function cloneWindowTemplates(
  templates: ReadonlyArray<CommunicationTimeWindowTemplate>
): CommunicationTimeWindowTemplate[] {
  return templates.map((template) => ({
    startRatio: template.startRatio,
    stopRatio: template.stopRatio
  }));
}

export function createBootstrapProxyCommunicationTimeSourceCatalog(
  definitions: ReadonlyArray<BootstrapScenarioDefinition>
): BootstrapProxyCommunicationTimeSourceCatalog {
  return {
    entries: definitions.map((definition) => {
      assertBootstrapCommunicationTimeSources(definition);
      const mode = resolveBootstrapScenarioMode(definition);

      if (definition.kind !== mode) {
        throw new Error(
          `Bootstrap communication-time source must keep scenario kind aligned with replay mode: ${definition.id}`
        );
      }

      const templates =
        BOOTSTRAP_PROXY_WINDOW_TEMPLATES[definition.presentation.presetKey][mode];

      return {
        scenarioId: definition.id,
        sourceKind: BOOTSTRAP_PROXY_SOURCE_KIND,
        windowTemplates: cloneWindowTemplates(templates)
      };
    })
  };
}

export function resolveBootstrapProxyCommunicationTimeSourceEntry(
  catalog: BootstrapProxyCommunicationTimeSourceCatalog,
  scenarioId: string
): BootstrapProxyCommunicationTimeSourceEntry {
  const entry = catalog.entries.find((candidate) => candidate.scenarioId === scenarioId);

  if (!entry) {
    throw new Error(
      `Missing bootstrap communication-time source for scenario: ${scenarioId}`
    );
  }

  return {
    scenarioId: entry.scenarioId,
    sourceKind: entry.sourceKind,
    windowTemplates: cloneWindowTemplates(entry.windowTemplates)
  };
}
