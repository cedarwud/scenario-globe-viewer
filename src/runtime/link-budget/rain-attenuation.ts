// ITU-R P.618-14 section 2.2.1.1 specific attenuation
// ITU-R P.618-14 section 2.2.1.2 effective slant path
// ITU-R P.838-3 coefficient table delegated to src/features/itu-r-physics/
// itu-r-p838-rain-attenuation.ts (full 1-100 GHz table)
// Local PDF: paper-catalog/3gpp/R-REC-P.618-14-202308-I!!PDF-E.pdf
// Long-term rain attenuation: gammaR times effective slant path.

import { computeSpecificAttenuation } from '../../features/itu-r-physics/itu-r-p838-rain-attenuation';

const EARTH_EFFECTIVE_RADIUS_KM = 8500;
const LOW_ELEVATION_THRESHOLD_DEG = 5;
const DEFAULT_RAIN_HEIGHT_KM = 5;
const MIN_P838_TABLE_FREQUENCY_GHZ = 1;
const MAX_P838_TABLE_FREQUENCY_GHZ = 100;
const ALPHA_PROBE_RAIN_RATE_MM_PER_HOUR = 10;

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
  const effectiveSlantPathKm = computeEffectiveSlantPathKm(
    elevationDeg,
    stationHeightAboveSeaKm,
    rainHeightKm,
  );

  if (effectiveSlantPathKm === 0) {
    return 0;
  }

  const coefficients = getKAlphaCoefficients(carrierFrequencyGHz, polarization);
  const specificAttenuationDbPerKm =
    coefficients.k * Math.pow(rainRateMmPerHour, coefficients.alpha);

  return specificAttenuationDbPerKm * effectiveSlantPathKm;
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

function computeEffectiveSlantPathKm(
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

// Sanity: 12 GHz horizontal, 25 mm/h, sea-level station, 30 deg elevation => about 10-11 dB.
// Sanity: 20 GHz horizontal, 50 mm/h, sea-level station, 45 deg elevation => about 39-42 dB.
