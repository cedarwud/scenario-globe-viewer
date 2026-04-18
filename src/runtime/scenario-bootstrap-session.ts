import type { ScenarioDefinition, ScenarioSession } from "../features/scenario";
import {
  createViewerScenarioRuntimeSession,
  type ViewerScenarioRuntimeSessionOptions
} from "./scenario-runtime-session";

export interface BootstrapScenarioDefinition
  extends Omit<ScenarioDefinition, "sources"> {
  sources: {
    satellite?: never;
    siteDataset?: never;
    validation?: never;
  };
}

export interface BootstrapScenarioSessionOptions
  extends Omit<ViewerScenarioRuntimeSessionOptions, "definitions"> {
  definitions: ReadonlyArray<BootstrapScenarioDefinition>;
}

function assertBootstrapScenarioSources(
  definition: ScenarioDefinition
): asserts definition is BootstrapScenarioDefinition {
  if (definition.sources.satellite) {
    throw new Error(
      `Bootstrap scenario ${definition.id} must stay presentation/time-only and cannot attach satellite sources yet.`
    );
  }

  if (definition.sources.siteDataset) {
    throw new Error(
      `Bootstrap scenario ${definition.id} must stay presentation/time-only and cannot attach site datasets yet.`
    );
  }

  if (definition.sources.validation) {
    throw new Error(
      `Bootstrap scenario ${definition.id} must stay presentation/time-only and cannot attach validation refs yet.`
    );
  }
}

// Keep the first bootstrap-facing helper narrower than the generic runtime
// session factory. It gives main.ts a future caller surface for shell-owned
// presentation/time switching without reopening site/satellite/validation
// ownership before the dedicated runtime paths are ready.
export function createBootstrapScenarioSession({
  definitions,
  ...driverOptions
}: BootstrapScenarioSessionOptions): ScenarioSession {
  for (const definition of definitions) {
    assertBootstrapScenarioSources(definition);
  }

  return createViewerScenarioRuntimeSession({
    definitions,
    ...driverOptions
  });
}
