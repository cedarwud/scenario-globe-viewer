import type {
  CommunicationTimeSourceKind,
  CommunicationTimeWindowTemplate
} from "../features/communication-time/communication-time";
import type { BootstrapScenarioMode } from "./resolve-bootstrap-scenario";
import type { BootstrapScenarioDefinition } from "./scenario-bootstrap-session";
import {
  BOOTSTRAP_PROXY_SOURCE_KIND,
  BOOTSTRAP_PROXY_WINDOW_TEMPLATES
} from "./bootstrap-communication-time-seeds";

export interface BootstrapProxyCommunicationTimeSourceEntry {
  scenarioId: string;
  sourceKind: CommunicationTimeSourceKind;
  windowTemplates: ReadonlyArray<CommunicationTimeWindowTemplate>;
}

export interface BootstrapProxyCommunicationTimeSourceCatalog {
  entries: ReadonlyArray<BootstrapProxyCommunicationTimeSourceEntry>;
}

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
