import type { SatelliteAntennaRolloffModel } from "../../runtime/link-budget/antenna-pattern";
import type { OrbitClass } from "./orbit-types";

export const RUNTIME_ANTENNA_ASSUMPTION_SOURCE_ID =
  "assumed-tier-b-antenna-params-selected-pair-v1";
export const RUNTIME_ANTENNA_ASSUMPTION_SOURCE_CLASS = "assumed-Tier-B";
export const RUNTIME_ANTENNA_ASSUMPTION_MODEL_LABEL =
  "S.1528/S.465-6 assumed Tier-B per-orbit antenna pattern";
export const RUNTIME_ANTENNA_ASSUMPTION_NON_CLAIM =
  "Assumed antenna parameters drive the selected-pair link model only; they are not operator RF hardware, station antenna diameter, EIRP, polarization, or measured service truth.";

export interface RuntimeAntennaAssumption {
  readonly satellitePeakGainDb: number;
  readonly satelliteBeamwidthDeg: number;
  readonly satelliteOffAxisAngleDeg: number;
  readonly satelliteRolloffModel: SatelliteAntennaRolloffModel;
  readonly earthStationPeakGainDb: number;
  readonly earthStationDiameterM: number;
  readonly earthStationOffAxisAngleDeg: number;
}

export const RUNTIME_ANTENNA_ASSUMPTIONS_BY_ORBIT: Readonly<
  Record<OrbitClass, RuntimeAntennaAssumption>
> = Object.freeze({
  LEO: Object.freeze({
    satellitePeakGainDb: 35,
    satelliteBeamwidthDeg: 3.2,
    satelliteOffAxisAngleDeg: 1.4,
    satelliteRolloffModel: "S1528-A",
    earthStationPeakGainDb: 43,
    earthStationDiameterM: 1.2,
    earthStationOffAxisAngleDeg: 0.8
  }),
  MEO: Object.freeze({
    satellitePeakGainDb: 38,
    satelliteBeamwidthDeg: 2.4,
    satelliteOffAxisAngleDeg: 1,
    satelliteRolloffModel: "S1528-A",
    earthStationPeakGainDb: 48,
    earthStationDiameterM: 1.8,
    earthStationOffAxisAngleDeg: 0.8
  }),
  GEO: Object.freeze({
    satellitePeakGainDb: 42,
    satelliteBeamwidthDeg: 1.2,
    satelliteOffAxisAngleDeg: 0.5,
    satelliteRolloffModel: "S1528-A",
    earthStationPeakGainDb: 52,
    earthStationDiameterM: 2.4,
    earthStationOffAxisAngleDeg: 0.8
  })
});

export function formatRuntimeAntennaAssumptionSummary(
  orbitClass: OrbitClass
): string {
  const assumption = RUNTIME_ANTENNA_ASSUMPTIONS_BY_ORBIT[orbitClass];
  return [
    `${orbitClass}`,
    `satPeak=${assumption.satellitePeakGainDb}dBi`,
    `satBeam=${assumption.satelliteBeamwidthDeg}deg`,
    `satOffAxis=${assumption.satelliteOffAxisAngleDeg}deg`,
    `earthPeak=${assumption.earthStationPeakGainDb}dBi`,
    `earthDish=${assumption.earthStationDiameterM}m`,
    `earthOffAxis=${assumption.earthStationOffAxisAngleDeg}deg`
  ].join(" ");
}

export function formatRuntimeAntennaAssumptionSetSummary(): string {
  return (["LEO", "MEO", "GEO"] as const)
    .map((orbitClass) => formatRuntimeAntennaAssumptionSummary(orbitClass))
    .join(" | ");
}
