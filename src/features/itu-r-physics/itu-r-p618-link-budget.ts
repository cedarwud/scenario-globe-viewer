// ITU-R P.618-14: Propagation data and prediction methods required for satellite link design
// Source: Rec. ITU-R P.618-14, https://www.itu.int/rec/R-REC-P.618
//
// A_total = A_rain + A_gas + A_cloud + A_scint  (P.618-14 Section 2.4)

import {
  computePathAttenuation,
  computeSpecificAttenuation
} from "./itu-r-p838-rain-attenuation";

export interface P618Components {
  rain: number;
  gas: number;
  cloud: number;
  scint: number;
}

export interface P618PathAttenuationResult {
  totalDb: number;
  components: P618Components;
}

export function computeTotalPathAttenuation(params: {
  frequencyGHz: number;
  elevationDeg: number;
  rainRateMmPerHr: number;
  polarization: "horizontal" | "vertical" | "circular";
  rainHeightKm?: number;
}): P618PathAttenuationResult {
  const {
    frequencyGHz,
    elevationDeg,
    rainRateMmPerHr,
    polarization,
    rainHeightKm = 4.0
  } = params;

  const sinEl = Math.sin((elevationDeg * Math.PI) / 180);
  if (sinEl <= 0) {
    throw new Error(`Elevation must be positive: ${elevationDeg} deg`);
  }

  const slantPathKm = rainHeightKm / sinEl;

  // A_rain: P.838-3 specific attenuation × slant path (P.618-14 §2.2.1)
  const specificAtt = computeSpecificAttenuation(
    frequencyGHz,
    polarization,
    rainRateMmPerHr
  );
  const aRain = computePathAttenuation(specificAtt, elevationDeg, rainHeightKm);

  const aGas = 0.03 * slantPathKm; // bounded-demo (P.676 §2, clear-sky L-band approximation)
  const aCloud = 0.3; // bounded-demo (P.840)
  const aScint = 0.2; // bounded-demo (P.618 §2.5.2)

  return {
    totalDb: aRain + aGas + aCloud + aScint,
    components: { rain: aRain, gas: aGas, cloud: aCloud, scint: aScint }
  };
}
