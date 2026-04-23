# Document Telemetry Contract

Source note: this file records the repo-owned document-level telemetry
boundary used by smoke, soak, and validation readers. Keep it synchronized by
editing this repo directly. Do not replace it with a symlink or hard link.

## Purpose

`scenario-globe-viewer` exposes a small set of validation-facing runtime
signals through `document.documentElement.dataset`. This contract keeps that
surface explicit so structural refactors can centralize writer ownership
without changing reader semantics.

This contract is only for document-level telemetry. Panel-local DOM datasets
such as `elements.root.dataset.*` remain feature-local UI state and are not a
substitute for the document-level evidence surface.

## Current Public Source Of Truth

- `src/features/telemetry/document-telemetry.ts`
- `src/main.ts`
- `src/runtime/bootstrap/composition.ts`
- `src/runtime/first-intake-mobile-endpoint-trajectory-controller.ts`
- `src/features/operator/bootstrap-operator-hud.ts`
- `src/features/communication-time/bootstrap-communication-time-panel.ts`
- `src/features/handover-decision/bootstrap-handover-decision-panel.ts`
- `src/features/physical-input/bootstrap-physical-input-panel.ts`
- `src/features/validation-state/bootstrap-validation-state-panel.ts`
- `src/features/scene-starter/bootstrap-scene-starter-panel.ts`
- `src/features/globe/site-3d-tiles-hook.ts`
- `src/features/globe/osm-buildings-showcase.ts`
- `src/runtime/satellite-overlay-controller.ts`

## Ownership Boundary

- `src/features/telemetry/document-telemetry.ts` owns the write/clear helpers
  for document-level telemetry.
- Runtime and feature modules may publish document telemetry only through that
  helper.
- Smoke, soak, visual-capture, and validation harnesses keep reading the same
  dataset keys; `SR2` does not rename or re-scope those readers.
- The narrow capture seam and this dataset surface coexist. This contract does
  not replace the capture seam or widen it.

## Telemetry Groups

The current document-level telemetry surface includes these groups:

- bootstrap state and scene baseline
  `bootstrapState`, `bootstrapDetail`, `scenePreset`,
  `sceneFogActive`, `sceneFogDensity`, `sceneFogVisualDensityScalar`,
  `sceneFogHeightScalar`, `sceneFogHeightFalloff`, `sceneFogMaxHeight`,
  `sceneFogMinimumBrightness`, `sceneBloomActive`
- operator and replay state
  `bootstrapScenarioId`, `replayMode`, `replaySpeed`, `operatorControlError`
- first-intake active addressed runtime state
  `firstIntakeRuntimeState`, `firstIntakeScenarioId`, `firstIntakeAddressParam`,
  `firstIntakeAddressableEntry`, `firstIntakeAddressResolution`,
  `firstIntakeAdoptionMode`, `firstIntakeTruthBoundaryLabel`,
  `firstIntakeSourceLineage`
- first-intake mobile-endpoint trajectory state
  `firstIntakeMobileTrajectoryState`, `firstIntakeMobileTrajectoryScenarioId`,
  `firstIntakeMobileTrajectoryEndpointId`, `firstIntakeMobileTrajectoryRecordId`,
  `firstIntakeMobileTrajectoryWaypointCount`,
  `firstIntakeMobileTrajectoryCoordinateReference`,
  `firstIntakeMobileTrajectoryCorridorTruth`,
  `firstIntakeMobileTrajectoryEquipageTruth`,
  `firstIntakeMobileTrajectoryServiceTruth`,
  `firstIntakeMobileTrajectoryProofSeam`,
  `firstIntakeMobileTrajectorySourceLineage`
- communication-time state
  `communicationScenarioId`, `communicationStatus`,
  `communicationSourceKind`, `communicationReportSchemaVersion`,
  `communicationProvenanceDetail`
- handover-decision state
  `handoverScenarioId`, `handoverEvaluatedAt`, `handoverDecisionKind`,
  `handoverServingCandidateId`, `handoverTruthState`,
  `handoverPolicyId`, `handoverProvenance`, `handoverReasonSignals`,
  `handoverSchemaVersion`, `handoverProvenanceDetail`
- physical-input state
  `physicalScenarioId`, `physicalEvaluatedAt`, `physicalContextLabel`,
  `physicalFamilies`, `physicalSchemaVersion`,
  `physicalProjectionTarget`, `physicalDisclaimer`
- validation-state evidence
  `validationScenarioId`, `validationEvaluatedAt`,
  `validationEnvironmentMode`, `validationTransportKind`,
  `validationDutKind`, `validationAttachState`,
  `validationServingCandidateId`, `validationSchemaVersion`,
  `validationOwnershipNote`, `validationProvenanceKind`,
  `validationProvenanceDetail`
- scene-starter evidence
  `sceneStarterScenarioId`, `sceneStarterScenePreset`,
  `sceneStarterReplayMode`, `sceneStarterScopeActive`,
  `sceneStarterDeterministicPathId`, `sceneStarterSourceMode`,
  `sceneStarterSourceProfileId`, `sceneStarterTruthSourceLabel`,
  `sceneStarterSceneServingSatId`, `sceneStarterPublishedServingSatId`,
  `sceneStarterSnapshotRelationship`,
  `sceneStarterNativeServingTransitionKind`,
  `sceneStarterBundleProducerHandoverKind`,
  `sceneStarterPresentationFocusMode`,
  `sceneStarterPresentationNarrativePhase`, `sceneStarterDisplaySatIds`,
  `sceneStarterBeamSatIds`, `sceneStarterSourceLine`,
  `sceneStarterTruthLine`, `sceneStarterPresentationLine`,
  `sceneStarterSchemaVersion`, `sceneStarterOwnershipNote`
- site-tileset and OSM-buildings showcase state
  `siteTilesetState`, `siteTilesetDetail`, `buildingShowcase`,
  `buildingShowcaseSource`, `buildingShowcaseState`,
  `buildingShowcaseDetail`
- satellite-overlay state
  `satelliteOverlayMode`, `satelliteOverlaySource`,
  `satelliteOverlayState`, `satelliteOverlayPointCount`,
  `satelliteOverlayRenderMode`, `satelliteOverlayLeoCount`,
  `satelliteOverlayMeoCount`, `satelliteOverlayGeoCount`,
  `satelliteOverlayDetail`

## Reader Expectations

- Readers may treat missing keys as cleared or inactive state.
- Error detail fields may be truncated for stability, but the key names and
  high-level meanings stay unchanged.
- Structural refactors may move writer code, but they must preserve this
  document-level key set or update this contract and every affected harness in
  the same change.
