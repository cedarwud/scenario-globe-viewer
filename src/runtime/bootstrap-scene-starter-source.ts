import type { BootstrapSceneStarterFeed } from "../features/scene-starter/scene-starter";
import {
  BOOTSTRAP_SCENE_STARTER_RAW_FIXTURE,
  type RawBundleStarterFixture
} from "./bootstrap-scene-starter-seeds";
export { BOOTSTRAP_SCENE_STARTER_SCOPE } from "./bootstrap-scene-starter-seeds";

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
  BOOTSTRAP_SCENE_STARTER_RAW_FIXTURE
);
