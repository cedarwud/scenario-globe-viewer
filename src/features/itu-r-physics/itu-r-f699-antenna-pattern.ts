// ITU-R F.699-8: Reference radiation patterns for terrestrial fixed service antennas
// Source: Rec. ITU-R F.699-8, https://www.itu.int/rec/R-REC-F.699
//
// G_max = 10·log10(η·(π·D/λ)²) dBi
//
// Sidelobe envelope (F.699 Section 1):
//   G(φ) = G_max - 2.5×10⁻³·(D/λ·φ)²        φ < φ_m          (main-beam parabolic)
//   G(φ) = G₁                                 φ_m ≤ φ < 100λ/D (near-sidelobe plateau)
//   G(φ) = 52 - 10·log10(D/λ) - 25·log10(φ)  φ ≥ 100λ/D       (far-sidelobe rolloff)
//   where G₁ = -1 + 15·log10(D/λ)

const SPEED_OF_LIGHT_M_PER_S = 299792458;

export function computeAntennaGain(params: {
  diameterM: number;
  frequencyGHz: number;
  offAxisDeg: number;
  apertureEfficiency?: number;
}): number {
  const { diameterM, frequencyGHz, offAxisDeg, apertureEfficiency = 0.6 } = params;

  const lambdaM = SPEED_OF_LIGHT_M_PER_S / (frequencyGHz * 1e9);
  const dOverLambda = diameterM / lambdaM;

  const gMaxDb = 10 * Math.log10(apertureEfficiency * Math.pow(Math.PI * dOverLambda, 2));

  if (offAxisDeg <= 0) return gMaxDb;

  const g1 = -1 + 15 * Math.log10(dOverLambda);

  // φ_m: angle where parabolic main-beam equals G₁ plateau
  const phiMSq = (gMaxDb - g1) / (2.5e-3 * dOverLambda * dOverLambda);
  const phiM = phiMSq > 0 ? Math.sqrt(phiMSq) : 0;

  const phiBoundary = 100 / dOverLambda; // 100λ/D in degrees

  const phi = offAxisDeg;

  if (phi < phiM) {
    return gMaxDb - 2.5e-3 * Math.pow(dOverLambda * phi, 2);
  } else if (phi < phiBoundary) {
    return g1;
  } else {
    return 52 - 10 * Math.log10(dOverLambda) - 25 * Math.log10(phi);
  }
}
