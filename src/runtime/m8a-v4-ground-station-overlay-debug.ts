import type { RuntimeDataCompletenessState } from "../features/multi-station-selector/runtime-data-completeness";
import type {
  SceneCameraHint,
  TleFirstSceneViewModel
} from "../features/multi-station-selector/tle-first-scene-view-model";

export type SelectedPairOverlayDebugStatus =
  | "not-requested"
  | "loading"
  | "ready"
  | "empty"
  | "error";

export interface SelectedPairOverlayDebugState {
  status: SelectedPairOverlayDebugStatus;
  satelliteCount: number;
  actorCount: number;
  runtimeLinkVisible: boolean;
  positionSampleCount: number;
  activeSelectionSampleCount: number;
  handoverEventCount: number;
  linkFlowCueCount: number;
  eventCueCount: number;
  sourceMode: TleFirstSceneViewModel["sourceMode"] | "";
  pairGeometry: SceneCameraHint["pairGeometry"] | "";
  emptyReasonCode: RuntimeDataCompletenessState["emptyReasonCode"];
  dataCompleteness: RuntimeDataCompletenessState | null;
  errorMessage: string;
}

export function createSelectedPairOverlayDebugState(
  status: SelectedPairOverlayDebugStatus,
  overrides: Partial<SelectedPairOverlayDebugState> = {}
): SelectedPairOverlayDebugState {
  return {
    status,
    satelliteCount: 0,
    actorCount: 0,
    runtimeLinkVisible: false,
    positionSampleCount: 0,
    activeSelectionSampleCount: 0,
    handoverEventCount: 0,
    linkFlowCueCount: 0,
    eventCueCount: 0,
    sourceMode: "",
    pairGeometry: "",
    emptyReasonCode: null,
    dataCompleteness: null,
    errorMessage: "",
    ...overrides
  };
}
