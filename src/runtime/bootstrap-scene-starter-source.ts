import type { ScenePresetKey } from "../features/globe/scene-preset";
import type { ClockMode } from "../features/time";
import type { BootstrapSceneStarterFeed } from "../features/scene-starter/scene-starter";

export const BOOTSTRAP_SCENE_STARTER_SCOPE = {
  scenarioId: "bootstrap-site-prerecorded",
  presetKey: "site",
  replayMode: "prerecorded"
} as const satisfies {
  scenarioId: string;
  presetKey: ScenePresetKey;
  replayMode: ClockMode;
};

interface RawBundleStarterFixture {
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
const bundleSampleStarterRaw: RawBundleStarterFixture = {
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

function assertStringArray(value: ReadonlyArray<string>, label: string): void {
  for (const entry of value) {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error(`Bootstrap scene-starter ${label} must stay string-only.`);
    }
  }
}

function buildBootstrapSceneStarterFeed(
  fixture: RawBundleStarterFixture
): BootstrapSceneStarterFeed {
  if (
    fixture.entry.surfaceId !== "scene-consumer-starter-v1" ||
    fixture.entry.contractKind !== "starter-export" ||
    fixture.entry.pathKind !== "bundle-sample" ||
    !fixture.entry.deterministicPathId ||
    fixture.entry.deterministicPathReady !== true
  ) {
    throw new Error(
      "Bootstrap scene-starter fixture must stay on the bundle-sample starter-export path."
    );
  }

  if (
    fixture.source.mode !== "modqn-bundle" ||
    !fixture.source.profileId ||
    fixture.source.truthSourceLabel !== "sample-bundle-v1"
  ) {
    throw new Error(
      "Bootstrap scene-starter fixture must preserve the bundle-sample source identity."
    );
  }

  if (
    fixture.truth.snapshotRelationship !== "distinct-reference" ||
    !fixture.truth.bundleProducerHandoverKind
  ) {
    throw new Error(
      "Bootstrap scene-starter fixture must preserve distinct-reference bundle truth."
    );
  }

  assertStringArray(
    fixture.presentation.displaySatIds,
    "presentation.displaySatIds"
  );
  assertStringArray(fixture.presentation.beamSatIds, "presentation.beamSatIds");

  return {
    entry: {
      surfaceId: "scene-consumer-starter-v1",
      contractKind: "starter-export",
      pathKind: "bundle-sample",
      deterministicPathId: fixture.entry.deterministicPathId,
      deterministicPathReady: true
    },
    source: {
      mode: "modqn-bundle",
      profileId: fixture.source.profileId,
      truthSourceLabel: fixture.source.truthSourceLabel,
      replaySelection: fixture.source.replaySelection ?? null,
      bundleSlotIndex: fixture.source.bundleSlotIndex ?? null,
      bundleSlotCount: fixture.source.bundleSlotCount ?? null,
      handoverCount: fixture.source.handoverCount,
      statusLabel: fixture.source.statusLabel ?? null
    },
    truth: {
      sceneServingSatId: fixture.truth.sceneServingSatId ?? null,
      publishedServingSatId: fixture.truth.publishedServingSatId ?? null,
      snapshotRelationship: "distinct-reference",
      continuityState: fixture.truth.continuityState ?? null,
      nativeServingTransitionKind:
        fixture.truth.nativeServingTransitionKind ?? null,
      bundleProducerHandoverKind:
        fixture.truth.bundleProducerHandoverKind ?? null
    },
    presentation: {
      focusMode: fixture.presentation.focusMode ?? null,
      narrativePhase: fixture.presentation.narrativePhase ?? null,
      displaySatIds: [...fixture.presentation.displaySatIds],
      beamSatIds: [...fixture.presentation.beamSatIds]
    },
    summary: {
      sourceLine: fixture.summary.sourceLine,
      truthLine: fixture.summary.truthLine,
      presentationLine: fixture.summary.presentationLine
    }
  };
}

export const BOOTSTRAP_SCENE_STARTER_FEED = buildBootstrapSceneStarterFeed(
  bundleSampleStarterRaw as RawBundleStarterFixture
);
