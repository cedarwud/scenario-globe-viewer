import type { ScenePresetKey } from "../globe/scene-preset";
import type { ClockMode } from "../time";

export const BOOTSTRAP_SCENE_STARTER_REPORT_SCHEMA_VERSION =
  "phase6.7-bootstrap-scene-starter-report.v1";

export type BootstrapSceneStarterSnapshotRelationship =
  | "same-reference"
  | "distinct-reference"
  | "missing";

export interface BootstrapSceneStarterFeed {
  readonly entry: {
    readonly surfaceId: "scene-consumer-starter-v1";
    readonly contractKind: "starter-export";
    readonly pathKind: "bundle-sample";
    readonly deterministicPathId: string;
    readonly deterministicPathReady: true;
  };
  readonly source: {
    readonly mode: "modqn-bundle";
    readonly profileId: string;
    readonly truthSourceLabel: string;
    readonly replaySelection: string | null;
    readonly bundleSlotIndex: number | null;
    readonly bundleSlotCount: number | null;
    readonly handoverCount: number;
    readonly statusLabel: string | null;
  };
  readonly truth: {
    readonly sceneServingSatId: string | null;
    readonly publishedServingSatId: string | null;
    readonly snapshotRelationship: BootstrapSceneStarterSnapshotRelationship;
    readonly continuityState: string | null;
    readonly nativeServingTransitionKind: string | null;
    readonly bundleProducerHandoverKind: string | null;
  };
  readonly presentation: {
    readonly focusMode: string | null;
    readonly narrativePhase: string | null;
    readonly displaySatIds: ReadonlyArray<string>;
    readonly beamSatIds: ReadonlyArray<string>;
  };
  readonly summary: {
    readonly sourceLine: string;
    readonly truthLine: string;
    readonly presentationLine: string;
  };
}

export interface BootstrapSceneStarterScenarioState {
  readonly id: string;
  readonly label: string;
  readonly presetKey: ScenePresetKey;
  readonly replayMode: ClockMode;
  readonly isScopeActive: boolean;
}

export interface BootstrapSceneStarterState {
  readonly schemaVersion: typeof BOOTSTRAP_SCENE_STARTER_REPORT_SCHEMA_VERSION;
  readonly scenario: BootstrapSceneStarterScenarioState;
  readonly entry: BootstrapSceneStarterFeed["entry"];
  readonly source: BootstrapSceneStarterFeed["source"];
  readonly truth: BootstrapSceneStarterFeed["truth"];
  readonly presentation: BootstrapSceneStarterFeed["presentation"];
  readonly summary: BootstrapSceneStarterFeed["summary"];
  readonly ownershipNote: string;
}

export function resolveBootstrapSceneStarterOwnershipNote(): string {
  return "Viewer repo owns the site/prerecorded scenario frame, replay-clock control, globe shell, and HUD placement; ntn-sim-core owns the imported starter-export deterministic identity plus source/truth/presentation semantics.";
}

export function formatSceneStarterSatelliteIds(
  satIds: ReadonlyArray<string>
): string {
  return satIds.length > 0 ? satIds.join(", ") : "none";
}

export function createBootstrapSceneStarterState(options: {
  scenario: BootstrapSceneStarterScenarioState;
  starterFeed: BootstrapSceneStarterFeed;
}): BootstrapSceneStarterState {
  return {
    schemaVersion: BOOTSTRAP_SCENE_STARTER_REPORT_SCHEMA_VERSION,
    scenario: {
      id: options.scenario.id,
      label: options.scenario.label,
      presetKey: options.scenario.presetKey,
      replayMode: options.scenario.replayMode,
      isScopeActive: options.scenario.isScopeActive
    },
    entry: options.starterFeed.entry,
    source: options.starterFeed.source,
    truth: options.starterFeed.truth,
    presentation: options.starterFeed.presentation,
    summary: options.starterFeed.summary,
    ownershipNote: resolveBootstrapSceneStarterOwnershipNote()
  };
}
