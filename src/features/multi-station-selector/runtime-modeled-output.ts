import type { HandoverPolicyConfig } from "../../runtime/link-budget/handover-policy";
import type { OrbitClass } from "./orbit-types";
import {
  RUNTIME_ANTENNA_ASSUMPTION_MODEL_LABEL,
  RUNTIME_ANTENNA_ASSUMPTION_NON_CLAIM,
  RUNTIME_ANTENNA_ASSUMPTION_SOURCE_CLASS,
  RUNTIME_ANTENNA_ASSUMPTION_SOURCE_ID,
  formatRuntimeAntennaAssumptionSetSummary
} from "./runtime-antenna-assumptions";

export type RuntimeTruthClass =
  | "tle-derived"
  | "omm-derived"
  | "public-registry-derived"
  | "modeled"
  | "display-only"
  | "fixture-fallback"
  | "unavailable";

export interface RuntimeProvenanceTag {
  readonly truthClass: RuntimeTruthClass;
  readonly sourceId: string;
  readonly modelId?: string;
  readonly nonClaim?: string;
}

export type RuntimeModeledOutputKind =
  | "handover"
  | "link-budget"
  | "throughput"
  | "jitter"
  | "latency"
  | "rain-impact";

export type RuntimeRainRateControlMode =
  | "user-controlled"
  | "fixture-default"
  | "unavailable";

export interface RuntimeModeledOutputMetadata {
  readonly kind: RuntimeModeledOutputKind;
  readonly modelId: string;
  readonly standardsRef: ReadonlyArray<string>;
  readonly inputSummary: Readonly<Record<string, string | number | boolean | null>>;
  readonly outputUnit: string | null;
  readonly rainRateControlMode?: RuntimeRainRateControlMode;
  readonly provenance: RuntimeProvenanceTag;
  readonly nonClaim: string;
}

export interface RuntimePolicyDisclosureThresholds {
  readonly latencyBudgetMs: number | null;
  readonly hysteresisDb: number;
  readonly minVisibilityWindowMs: number;
  readonly elevationThresholdDeg: number;
}

export interface RuntimePolicyDisclosureState {
  readonly activePolicyId: HandoverPolicyConfig["policyId"];
  readonly thresholds: RuntimePolicyDisclosureThresholds;
  readonly thresholdSources: Readonly<
    Record<keyof RuntimePolicyDisclosureThresholds, RuntimeProvenanceTag>
  >;
}

export interface RuntimeMetricAnchorDisclosureState {
  readonly carrierSelection: string | null;
  readonly antennaModel: string | null;
  readonly antennaParameterSource: string | null;
  readonly capacityModel: string | null;
  readonly jitterModel: string | null;
  readonly delayModel: string | null;
  readonly activePolicyId: HandoverPolicyConfig["policyId"];
  readonly policyThresholds: RuntimePolicyDisclosureThresholds;
  readonly nonClaim: string;
}

interface BuildModeledOutputsInput {
  readonly rainRateMmPerHour: number;
  readonly sampleStepSeconds: number;
  readonly handoverPolicy: HandoverPolicyConfig;
  readonly sampleCadenceSecondsByOrbit: Readonly<Record<OrbitClass, number>>;
  readonly baseElevationThresholdDeg: number;
  readonly stationAEffectiveElevationThresholdDeg: number;
  readonly stationBEffectiveElevationThresholdDeg: number;
  readonly elevationThresholdDeg: number;
  readonly handoverEventCount: number;
  readonly rainRateControlMode: RuntimeRainRateControlMode;
}

export function buildModeledOutputs(
  input: BuildModeledOutputsInput
): ReadonlyArray<RuntimeModeledOutputMetadata> {
  const handoverModelId = `${input.handoverPolicy.policyId}-policy`;
  const baseInputSummary = () => ({
    rainRateMmPerHour: input.rainRateMmPerHour,
    handoverSampleStepSeconds: input.sampleStepSeconds,
    activePolicyId: input.handoverPolicy.policyId,
    policyLatencyBudgetMs: input.handoverPolicy.latencyBudgetMs ?? null,
    policyHysteresisDb: input.handoverPolicy.hysteresisDb,
    policyMinVisibilityWindowMs: input.handoverPolicy.minVisibilityWindowMs,
    leoCadenceSeconds: input.sampleCadenceSecondsByOrbit.LEO,
    meoCadenceSeconds: input.sampleCadenceSecondsByOrbit.MEO,
    geoCadenceSeconds: input.sampleCadenceSecondsByOrbit.GEO,
    baseElevationThresholdDeg: input.baseElevationThresholdDeg,
    stationAEffectiveElevationThresholdDeg:
      input.stationAEffectiveElevationThresholdDeg,
    stationBEffectiveElevationThresholdDeg:
      input.stationBEffectiveElevationThresholdDeg,
    elevationThresholdDeg: input.elevationThresholdDeg
  });
  const modelNonClaim =
    "Modeled output only; not measured operator telemetry or private schedule truth.";
  const antennaInputSummary = {
    antennaModel: RUNTIME_ANTENNA_ASSUMPTION_MODEL_LABEL,
    antennaParameterSource: RUNTIME_ANTENNA_ASSUMPTION_SOURCE_ID,
    antennaSourceClass: RUNTIME_ANTENNA_ASSUMPTION_SOURCE_CLASS,
    earthStationPatternFrequencyPolicy:
      "S.465 validation uses carrier frequency when 2-31 GHz; MEO L-band uses 2 GHz lower-bound reference for antenna-pattern validation only",
    antennaAssumptionSet: formatRuntimeAntennaAssumptionSetSummary()
  };
  const linkBudgetModelId = "fspl-rain-gas-assumed-antenna-link-budget-v1";
  const throughputModelId = "selected-pair-throughput-estimate-v2";
  const provenance = (modelId: string): RuntimeProvenanceTag => ({
    truthClass: "modeled",
    sourceId: "runtime-projection",
    modelId,
    nonClaim: modelNonClaim
  });

  return [
    {
      kind: "handover",
      modelId: handoverModelId,
      standardsRef: ["3GPP TR 38.821 §7.3.2.2", "V-MO1"],
      inputSummary: {
        ...baseInputSummary(),
        outputKind: "handover",
        eventCount: input.handoverEventCount
      },
      outputUnit: "event",
      provenance: provenance(handoverModelId),
      nonClaim: modelNonClaim
    },
    {
      kind: "link-budget",
      modelId: linkBudgetModelId,
      standardsRef: [
        "3GPP TR 38.811 §6.6.2",
        "ITU-R P.618-14 §2.2.1.1",
        "ITU-R P.676-13 Annex 2",
        "ITU-R S.1528-0 Annex 1",
        "ITU-R S.465-6"
      ],
      inputSummary: {
        ...baseInputSummary(),
        outputKind: "link-budget",
        carrierSelection: "orbit-class-default",
        ...antennaInputSummary
      },
      outputUnit: "dB",
      rainRateControlMode: input.rainRateControlMode,
      provenance: provenance(linkBudgetModelId),
      nonClaim: `${modelNonClaim} ${RUNTIME_ANTENNA_ASSUMPTION_NON_CLAIM}`
    },
    {
      kind: "throughput",
      modelId: throughputModelId,
      standardsRef: [
        "3GPP TR 38.811 §6.6.2",
        "ITU-R P.618-14 §2.2.1.1",
        "ITU-R S.1528-0 Annex 1",
        "ITU-R S.465-6"
      ],
      inputSummary: {
        ...baseInputSummary(),
        outputKind: "throughput",
        capacityModel:
          "clear-sky-reference-with-atmospheric-and-assumed-antenna-derating",
        ...antennaInputSummary
      },
      outputUnit: "Mbps",
      rainRateControlMode: input.rainRateControlMode,
      provenance: provenance(throughputModelId),
      nonClaim: `${modelNonClaim} ${RUNTIME_ANTENNA_ASSUMPTION_NON_CLAIM}`
    },
    {
      kind: "jitter",
      modelId: "selected-pair-jitter-estimate-v1",
      standardsRef: ["ITU-R P.618-14 §2.2.1.1"],
      inputSummary: {
        ...baseInputSummary(),
        outputKind: "jitter",
        jitterModel: "orbit-baseline-with-rain-scale"
      },
      outputUnit: "ms",
      rainRateControlMode: input.rainRateControlMode,
      provenance: provenance("selected-pair-jitter-estimate-v1"),
      nonClaim: modelNonClaim
    },
    {
      kind: "latency",
      modelId: "selected-pair-propagation-delay-v1",
      standardsRef: ["3GPP TR 38.811 §6.6.2", "3GPP TR 38.811 clause 5.3.1.1"],
      inputSummary: {
        ...baseInputSummary(),
        outputKind: "latency",
        delayModel: "slant-range-one-way-plus-fixed-processing"
      },
      outputUnit: "ms",
      provenance: provenance("selected-pair-propagation-delay-v1"),
      nonClaim: modelNonClaim
    },
    {
      kind: "rain-impact",
      modelId: "selected-pair-rain-impact-v1",
      standardsRef: ["ITU-R P.618-14 §2.2.1.1"],
      inputSummary: {
        ...baseInputSummary(),
        outputKind: "rain-impact",
        rainRateControlMode: input.rainRateControlMode
      },
      outputUnit: "dB",
      rainRateControlMode: input.rainRateControlMode,
      provenance: provenance("selected-pair-rain-impact-v1"),
      nonClaim: modelNonClaim
    }
  ];
}

function stringInputSummaryValue(
  modeledOutputs: ReadonlyArray<RuntimeModeledOutputMetadata>,
  kind: RuntimeModeledOutputKind,
  key: string
): string | null {
  const value = modeledOutputs.find((output) => output.kind === kind)
    ?.inputSummary[key];
  return typeof value === "string" ? value : null;
}

export function buildMetricAnchorDisclosure(
  modeledOutputs: ReadonlyArray<RuntimeModeledOutputMetadata>,
  policyDisclosure: RuntimePolicyDisclosureState
): RuntimeMetricAnchorDisclosureState {
  return {
    carrierSelection: stringInputSummaryValue(
      modeledOutputs,
      "link-budget",
      "carrierSelection"
    ),
    antennaModel: stringInputSummaryValue(
      modeledOutputs,
      "link-budget",
      "antennaModel"
    ),
    antennaParameterSource: stringInputSummaryValue(
      modeledOutputs,
      "link-budget",
      "antennaParameterSource"
    ),
    capacityModel: stringInputSummaryValue(
      modeledOutputs,
      "throughput",
      "capacityModel"
    ),
    jitterModel: stringInputSummaryValue(modeledOutputs, "jitter", "jitterModel"),
    delayModel: stringInputSummaryValue(modeledOutputs, "latency", "delayModel"),
    activePolicyId: policyDisclosure.activePolicyId,
    policyThresholds: policyDisclosure.thresholds,
    nonClaim:
      "Metric anchors are model labels and policy controls, not measured throughput, jitter, latency, routing, SLA, or station RF hardware truth."
  };
}
