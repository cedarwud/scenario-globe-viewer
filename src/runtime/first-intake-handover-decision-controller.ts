import {
  FIRST_INTAKE_HANDOVER_UNSUPPORTED_POLICY_ID,
  evaluateHandoverDecisionSnapshot,
  type HandoverDecisionState
} from "../features/handover-decision/handover-decision";
import type {
  FirstIntakeRuntimeScenarioSurface
} from "../features/scenario";
import type { ReplayClock, ReplayClockState } from "../features/time";

export { FIRST_INTAKE_HANDOVER_UNSUPPORTED_POLICY_ID };
const FIRST_INTAKE_HANDOVER_DECISION_MODEL = "service-layer-switching";
const FIRST_INTAKE_HANDOVER_IS_NATIVE_RF_HANDOVER = false;

type FirstIntakeHandoverTruthBoundaryLabel = NonNullable<
  HandoverDecisionState["result"]["semanticsBridge"]["truthBoundaryLabel"]
>;

export interface FirstIntakeHandoverDecisionController {
  getState(): HandoverDecisionState;
  subscribe(listener: (state: HandoverDecisionState) => void): () => void;
  dispose(): void;
}

export interface FirstIntakeHandoverDecisionControllerOptions {
  replayClock: ReplayClock;
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
}

function toIsoTimestamp(value: string | number): string {
  const epochMs = typeof value === "number" ? value : Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(`First-intake handover timestamp must parse: ${value}`);
  }

  return new Date(epochMs).toISOString();
}

function resolveState(
  replayState: ReplayClockState,
  scenarioSurface: FirstIntakeRuntimeScenarioSurface
): HandoverDecisionState {
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const truthBoundaryLabel = addressedEntry.resolvedInputs.context?.truthBoundaryLabel;

  if (!truthBoundaryLabel) {
    throw new Error(
      "First-intake handover runtime seam requires an explicit truth-boundary label."
    );
  }

  const state = evaluateHandoverDecisionSnapshot({
    scenarioId: addressedEntry.scenarioId,
    evaluatedAt: toIsoTimestamp(replayState.currentTime),
    activeRange: {
      start: toIsoTimestamp(replayState.startTime),
      stop: toIsoTimestamp(replayState.stopTime)
    },
    policyId: FIRST_INTAKE_HANDOVER_UNSUPPORTED_POLICY_ID,
    decisionModel: FIRST_INTAKE_HANDOVER_DECISION_MODEL,
    isNativeRfHandover: FIRST_INTAKE_HANDOVER_IS_NATIVE_RF_HANDOVER,
    candidates: []
  });

  return attachTruthBoundaryLabel(state, truthBoundaryLabel);
}

function attachTruthBoundaryLabel(
  state: HandoverDecisionState,
  truthBoundaryLabel: FirstIntakeHandoverTruthBoundaryLabel
): HandoverDecisionState {
  return {
    ...state,
    result: {
      ...state.result,
      semanticsBridge: {
        ...state.result.semanticsBridge,
        truthBoundaryLabel
      }
    },
    report: {
      ...state.report,
      result: {
        ...state.report.result,
        semanticsBridge: {
          ...state.report.result.semanticsBridge,
          truthBoundaryLabel
        }
      }
    }
  };
}

export function createFirstIntakeHandoverDecisionController({
  replayClock,
  scenarioSurface
}: FirstIntakeHandoverDecisionControllerOptions): FirstIntakeHandoverDecisionController {
  const listeners = new Set<(state: HandoverDecisionState) => void>();
  let lastState = resolveState(replayClock.getState(), scenarioSurface);

  const notify = (nextState: HandoverDecisionState): HandoverDecisionState => {
    lastState = nextState;

    for (const listener of listeners) {
      listener(lastState);
    }

    return lastState;
  };

  const unsubscribe = replayClock.onTick((nextReplayState) => {
    notify(resolveState(nextReplayState, scenarioSurface));
  });

  return {
    getState(): HandoverDecisionState {
      return lastState;
    },
    subscribe(listener: (state: HandoverDecisionState) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      unsubscribe();
    }
  };
}
