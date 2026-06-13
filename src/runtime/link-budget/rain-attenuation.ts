// ITU-R P.618-14 section 2.2.1.1 rain attenuation prediction (full path method).
//   - Specific attenuation gammaR = k * R^alpha (Step 5, Eq 4); k/alpha from P.838-3.
//   - Slant path Ls below the rain height (Step 2, Eq 1/2).
//   - Horizontal projection LG = Ls * cos(elevation) (Step 3, Eq 3).
//   - Horizontal reduction factor r0.01 (Step 6, Eq 5).
//   - Vertical adjustment factor v0.01 (Step 7, Eq 6; uses station latitude for chi).
//   - Effective path LE = LR * v0.01 (Step 8); attenuation A = gammaR * LE (Step 9).
// DOMAIN NOTE: the P.618 Step 6-7 reduction/adjustment factors are calibrated for the
//   R0.01 statistic (rain rate exceeded 0.01% of an average year, from P.837). This viewer
//   drives them with the interactive INSTANTANEOUS rain-rate input instead of R0.01 -- a
//   deliberate "what-if" use, not the long-term-statistics prediction. No percentage-of-time
//   extrapolation (Step 10) is applied. Rain height uses a simplified P.839 latitude rule.
// Input frequency valid <=55 GHz per the P.618 method; P.838 table spans 1-100 GHz.
// ITU-R P.838-3 coefficient table delegated to src/features/itu-r-physics/
//   itu-r-p838-rain-attenuation.ts (full 1-100 GHz table).
// Retained PDF: deliverable/3gpp-itu-references/R-REC-P.618-14-202308-I!!PDF-E.pdf

import { computeSpecificAttenuation } from '../../features/itu-r-physics/itu-r-p838-rain-attenuation';

const EARTH_EFFECTIVE_RADIUS_KM = 8500;
const LOW_ELEVATION_THRESHOLD_DEG = 5;
const DEFAULT_RAIN_HEIGHT_KM = 5;
const MIN_P838_TABLE_FREQUENCY_GHZ = 1;
const MAX_P838_TABLE_FREQUENCY_GHZ = 100;
const ALPHA_PROBE_RAIN_RATE_MM_PER_HOUR = 10;
// P.618-14 Step 7 latitude term: chi = LATITUDE_CHI_REFERENCE_DEG - |lat| for |lat| < ref, else 0.
const LATITUDE_CHI_REFERENCE_DEG = 36;

export type RainPolarization = 'horizontal' | 'vertical' | 'circular';

export type RainKAlphaCoefficients = Readonly<{
  k: number;
  alpha: number;
}>;

type P838ResolvedCoefficients = Readonly<{
  horizontal: RainKAlphaCoefficients;
  vertical: RainKAlphaCoefficients;
}>;

export function computeRainAttenuationDb(input: {
  rainRateMmPerHour: number;
  carrierFrequencyGHz: number;
  elevationDeg: number;
  stationHeightAboveSeaKm: number;
  polarization: RainPolarization;
  stationLatitudeDeg?: number;
}): number {
  const {
    rainRateMmPerHour,
    carrierFrequencyGHz,
    elevationDeg,
    stationHeightAboveSeaKm,
    polarization,
    stationLatitudeDeg,
  } = input;

  assertPositiveFinite(rainRateMmPerHour, 'rainRateMmPerHour');
  assertFiniteRange(
    carrierFrequencyGHz,
    'carrierFrequencyGHz',
    MIN_P838_TABLE_FREQUENCY_GHZ,
    MAX_P838_TABLE_FREQUENCY_GHZ,
  );
  assertFiniteRange(elevationDeg, 'elevationDeg', 0, 90);
  assertNonNegativeFinite(stationHeightAboveSeaKm, 'stationHeightAboveSeaKm');
  assertKnownPolarization(polarization);

  const rainHeightKm = computeRainHeightKm(stationLatitudeDeg);
  const slantPathKm = computeSlantPathLengthKm(
    elevationDeg,
    stationHeightAboveSeaKm,
    rainHeightKm,
  );

  if (slantPathKm === 0) {
    return 0;
  }

  // Step 5: specific attenuation gammaR = k * R^alpha.
  const coefficients = getKAlphaCoefficients(carrierFrequencyGHz, polarization);
  const specificAttenuationDbPerKm =
    coefficients.k * Math.pow(rainRateMmPerHour, coefficients.alpha);

  // Steps 3, 6, 7, 8: reduce the geometric slant path to the P.618 effective path LE.
  const effectivePathKm = computeEffectivePathLengthKm({
    slantPathKm,
    elevationDeg,
    stationHeightAboveSeaKm,
    rainHeightKm,
    specificAttenuationDbPerKm,
    carrierFrequencyGHz,
    stationLatitudeDeg,
  });

  // Step 9: attenuation A = gammaR * LE.
  return specificAttenuationDbPerKm * effectivePathKm;
}

export type RainAttenuationInput = Parameters<typeof computeRainAttenuationDb>[0];

function getKAlphaCoefficients(
  freqGHz: number,
  polarization: RainPolarization,
): RainKAlphaCoefficients {
  return selectPolarizationCoefficients(
    getHorizontalVerticalP838Coefficients(freqGHz),
    polarization,
  );
}

function getHorizontalVerticalP838Coefficients(freqGHz: number): P838ResolvedCoefficients {
  return {
    horizontal: inferP838KAlphaCoefficients(freqGHz, 'horizontal'),
    vertical: inferP838KAlphaCoefficients(freqGHz, 'vertical'),
  };
}

function inferP838KAlphaCoefficients(
  freqGHz: number,
  polarization: Exclude<RainPolarization, 'circular'>,
): RainKAlphaCoefficients {
  // P.838 uses gammaR = k * R^alpha; R=1 recovers k, one more probe recovers alpha.
  const k = computeSpecificAttenuation(freqGHz, polarization, 1);
  const attenuationAtProbeRate = computeSpecificAttenuation(
    freqGHz,
    polarization,
    ALPHA_PROBE_RAIN_RATE_MM_PER_HOUR,
  );

  return {
    k,
    alpha:
      Math.log(attenuationAtProbeRate / k) / Math.log(ALPHA_PROBE_RAIN_RATE_MM_PER_HOUR),
  };
}

// P.618-14 Step 2 (Eq 1/2): slant path length Ls below the rain height.
function computeSlantPathLengthKm(
  elevationDeg: number,
  stationHeightAboveSeaKm: number,
  rainHeightKm: number,
): number {
  const heightDeltaKm = rainHeightKm - stationHeightAboveSeaKm;
  if (heightDeltaKm <= 0) {
    return 0;
  }

  const elevationRad = toRadians(elevationDeg);
  const sinElevation = Math.sin(elevationRad);

  if (elevationDeg >= LOW_ELEVATION_THRESHOLD_DEG) {
    return heightDeltaKm / sinElevation;
  }

  return (
    (2 * heightDeltaKm) /
    (Math.sqrt(sinElevation * sinElevation + (2 * heightDeltaKm) / EARTH_EFFECTIVE_RADIUS_KM) +
      sinElevation)
  );
}

// P.618-14 Steps 3, 6, 7, 8: effective path length LE = LR * v0.01.
function computeEffectivePathLengthKm(input: {
  slantPathKm: number;
  elevationDeg: number;
  stationHeightAboveSeaKm: number;
  rainHeightKm: number;
  specificAttenuationDbPerKm: number;
  carrierFrequencyGHz: number;
  stationLatitudeDeg?: number;
}): number {
  const {
    slantPathKm,
    elevationDeg,
    stationHeightAboveSeaKm,
    rainHeightKm,
    specificAttenuationDbPerKm: gammaR,
    carrierFrequencyGHz: freqGHz,
    stationLatitudeDeg,
  } = input;

  const elevationRad = toRadians(elevationDeg);
  const sinElevation = Math.sin(elevationRad);
  const cosElevation = Math.cos(elevationRad);
  const heightDeltaKm = rainHeightKm - stationHeightAboveSeaKm;

  // Step 3: horizontal projection LG.
  const horizontalProjectionKm = slantPathKm * cosElevation;

  // Step 6: horizontal reduction factor r0.01 (Eq 5).
  const horizontalReductionFactor =
    1 /
    (1 +
      0.78 * Math.sqrt((horizontalProjectionKm * gammaR) / freqGHz) -
      0.38 * (1 - Math.exp(-2 * horizontalProjectionKm)));

  // Step 7: vertical adjustment factor v0.01 (Eq 6).
  // zeta = atan((hR - hs) / (LG * r0.01)). LG = Ls*cos(el), so LG*r0.01/cos(el) = Ls*r0.01
  // (cos cancels -- avoids a 0/0 at high elevation).
  const zetaRad = Math.atan2(
    heightDeltaKm,
    horizontalProjectionKm * horizontalReductionFactor,
  );
  const slantPathInRainKm =
    zetaRad > elevationRad
      ? slantPathKm * horizontalReductionFactor
      : heightDeltaKm / sinElevation;

  const absoluteLatitudeDeg =
    stationLatitudeDeg === undefined ? LATITUDE_CHI_REFERENCE_DEG : Math.abs(stationLatitudeDeg);
  const chiDeg =
    absoluteLatitudeDeg < LATITUDE_CHI_REFERENCE_DEG
      ? LATITUDE_CHI_REFERENCE_DEG - absoluteLatitudeDeg
      : 0;

  const verticalAdjustmentFactor =
    1 /
    (1 +
      Math.sqrt(sinElevation) *
        (31 *
          (1 - Math.exp(-(elevationDeg / (1 + chiDeg)))) *
          (Math.sqrt(slantPathInRainKm * gammaR) / (freqGHz * freqGHz)) -
          0.45));

  // Step 8: effective path length LE.
  return Math.max(0, slantPathInRainKm * verticalAdjustmentFactor);
}

function computeRainHeightKm(latitudeDeg?: number): number {
  if (latitudeDeg === undefined) {
    return DEFAULT_RAIN_HEIGHT_KM;
  }

  assertFiniteRange(latitudeDeg, 'stationLatitudeDeg', -90, 90);

  const absoluteLatitudeDeg = Math.abs(latitudeDeg);
  // Simplified ITU-R P.839 rain height: 5 km tropics, linear reduction poleward of 23 deg.
  return absoluteLatitudeDeg > 23
    ? DEFAULT_RAIN_HEIGHT_KM - 0.075 * (absoluteLatitudeDeg - 23)
    : DEFAULT_RAIN_HEIGHT_KM;
}

function selectPolarizationCoefficients(
  coefficients: P838ResolvedCoefficients,
  polarization: RainPolarization,
): RainKAlphaCoefficients {
  if (polarization === 'horizontal') {
    return coefficients.horizontal;
  }

  if (polarization === 'vertical') {
    return coefficients.vertical;
  }

  return {
    k: (coefficients.horizontal.k + coefficients.vertical.k) / 2,
    alpha: (coefficients.horizontal.alpha + coefficients.vertical.alpha) / 2,
  };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function assertPositiveFinite(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${fieldName} must be a finite positive number.`);
  }
}

function assertNonNegativeFinite(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a finite non-negative number.`);
  }
}

function assertFiniteRange(
  value: number,
  fieldName: string,
  minimum: number,
  maximum: number,
): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${fieldName} must be finite and within ${minimum}-${maximum}.`);
  }
}

function assertKnownPolarization(polarization: RainPolarization): void {
  if (
    polarization !== 'horizontal' &&
    polarization !== 'vertical' &&
    polarization !== 'circular'
  ) {
    throw new RangeError('polarization must be horizontal, vertical, or circular.');
  }
}

// Sanity (full P.618 path method, horizontal pol, sea-level station, no latitude -> chi=0):
//   12 GHz, 25 mm/h, 30 deg elevation => about 7 dB (raw geometric slant path was ~11 dB).
//   20 GHz, 50 mm/h, 45 deg elevation => about 27 dB (raw geometric slant path was ~40 dB).
// The r0.01 * v0.01 reduction is why these are below gammaR * Ls.
