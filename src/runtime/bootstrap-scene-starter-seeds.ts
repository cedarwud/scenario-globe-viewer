import type { ScenePresetKey } from "../features/globe/scene-preset";
import type { ClockMode } from "../features/time";

export const BOOTSTRAP_SCENE_STARTER_SCOPE = {
  scenarioId: "bootstrap-site-prerecorded",
  presetKey: "site",
  replayMode: "prerecorded"
} as const satisfies {
  scenarioId: string;
  presetKey: ScenePresetKey;
  replayMode: ClockMode;
};

export interface RawBundleStarterFixture {
  readonly entry: {
    readonly surfaceId: string;
    readonly contractKind: string;
    readonly pathKind: string;
    readonly deterministicPathId: string | null;
    readonly deterministicPathReady: boolean;
  };
  readonly source: {
    readonly mode: string;
    readonly profileId: string;
    readonly truthSourceLabel: string | null;
    readonly replaySelection?: string | null;
    readonly bundleSlotIndex?: number | null;
    readonly bundleSlotCount?: number | null;
    readonly handoverCount: number;
    readonly statusLabel?: string | null;
  };
  readonly truth: {
    readonly sceneServingSatId: string | null;
    readonly publishedServingSatId: string | null;
    readonly snapshotRelationship: string;
    readonly continuityState?: string | null;
    readonly nativeServingTransitionKind?: string | null;
    readonly bundleProducerHandoverKind?: string | null;
  };
  readonly presentation: {
    readonly focusMode?: string | null;
    readonly narrativePhase?: string | null;
    readonly displaySatIds: ReadonlyArray<string>;
    readonly beamSatIds: ReadonlyArray<string>;
  };
  readonly summary: {
    readonly sourceLine: string;
    readonly truthLine: string;
    readonly presentationLine: string;
  };
}

// Keep the starter-export bridge buildable even when the historical cross-repo
// fixture path is absent from the current workspace checkout.
export const BOOTSTRAP_SCENE_STARTER_RAW_FIXTURE: RawBundleStarterFixture = {
  entry: {
    surfaceId: "scene-consumer-starter-v1",
    contractKind: "starter-export",
    pathKind: "bundle-sample",
    deterministicPathId: "bundle-sample:sample-bundle-v1",
    deterministicPathReady: true
  },
  source: {
    mode: "modqn-bundle",
    profileId: "modqn-bundle-replay",
    truthSourceLabel: "sample-bundle-v1",
    replaySelection: "site-window",
    bundleSlotIndex: 0,
    bundleSlotCount: 1,
    handoverCount: 1,
    statusLabel: "ready"
  },
  truth: {
    sceneServingSatId: "sat-a",
    publishedServingSatId: "sat-a",
    snapshotRelationship: "distinct-reference",
    continuityState: "stable",
    nativeServingTransitionKind: "hold",
    bundleProducerHandoverKind: "intra-satellite-beam-switch"
  },
  presentation: {
    focusMode: "continuity-focus",
    narrativePhase: "prepared",
    displaySatIds: ["sat-a", "sat-b"],
    beamSatIds: ["sat-a", "sat-b"]
  },
  summary: {
    sourceLine:
      "starter-export source path=bundle-sample profile=modqn-bundle-replay truthSource=sample-bundle-v1",
    truthLine:
      "starter-export truth snapshot=distinct-reference serving=sat-a published=sat-a bundleHandover=intra-satellite-beam-switch",
    presentationLine:
      "starter-export presentation focus=continuity-focus narrative=prepared display=sat-a,sat-b beam=sat-a,sat-b"
  }
};
