// ITU-R P.618-14 section 2.2.1.1 specific attenuation
// ITU-R P.618-14 section 2.2.1.2 effective slant path
// ITU-R P.838-3 k/alpha subset Ku/Ka
// Local PDF: paper-catalog/3gpp/R-REC-P.618-14-202308-I!!PDF-E.pdf
// Long-term rain attenuation: gammaR times effective slant path.

const EARTH_EFFECTIVE_RADIUS_KM = 8500;
const LOW_ELEVATION_THRESHOLD_DEG = 5;
const DEFAULT_RAIN_HEIGHT_KM = 5;
const MIN_P618_FREQUENCY_GHZ = 1;
const MAX_P618_FREQUENCY_GHZ = 55;

export type RainPolarization = 'horizontal' | 'vertical' | 'circular';

export type RainKAlphaCoefficients = Readonly<{
  k: number;
  alpha: number;
}>;

type P838CoefficientAnchor = Readonly<{
  frequencyGHz: number;
  horizontal: RainKAlphaCoefficients;
  vertical: RainKAlphaCoefficients;
}>;

// Coefficients are from ITU-R P.838-3 Tables for the Ku/Ka subset.
const P838_KU_KA_COEFFICIENTS: ReadonlyArray<P838CoefficientAnchor> = [
  { frequencyGHz: 10, horizontal: { k: 0.01217, alpha: 1.2571 }, vertical: { k: 0.01129, alpha: 1.2156 } },
  { frequencyGHz: 11, horizontal: { k: 0.01772, alpha: 1.2140 }, vertical: { k: 0.01731, alpha: 1.1617 } },
  { frequencyGHz: 12, horizontal: { k: 0.02386, alpha: 1.1825 }, vertical: { k: 0.02455, alpha: 1.1216 } },
  { frequencyGHz: 13, horizontal: { k: 0.03041, alpha: 1.1586 }, vertical: { k: 0.03266, alpha: 1.0901 } },
  { frequencyGHz: 14, horizontal: { k: 0.03738, alpha: 1.1396 }, vertical: { k: 0.04126, alpha: 1.0646 } },
  { frequencyGHz: 15, horizontal: { k: 0.04481, alpha: 1.1233 }, vertical: { k: 0.05008, alpha: 1.0440 } },
  { frequencyGHz: 16, horizontal: { k: 0.05282, alpha: 1.1086 }, vertical: { k: 0.05899, alpha: 1.0273 } },
  { frequencyGHz: 17, horizontal: { k: 0.06146, alpha: 1.0949 }, vertical: { k: 0.06797, alpha: 1.0137 } },
  { frequencyGHz: 18, horizontal: { k: 0.07078, alpha: 1.0818 }, vertical: { k: 0.07708, alpha: 1.0025 } },
  { frequencyGHz: 19, horizontal: { k: 0.08084, alpha: 1.0691 }, vertical: { k: 0.08642, alpha: 0.9930 } },
  { frequencyGHz: 20, horizontal: { k: 0.09164, alpha: 1.0568 }, vertical: { k: 0.09611, alpha: 0.9847 } },
  { frequencyGHz: 21, horizontal: { k: 0.1032, alpha: 1.0447 }, vertical: { k: 0.1063, alpha: 0.9771 } },
  { frequencyGHz: 22, horizontal: { k: 0.1155, alpha: 1.0329 }, vertical: { k: 0.1170, alpha: 0.9700 } },
  { frequencyGHz: 23, horizontal: { k: 0.1286, alpha: 1.0214 }, vertical: { k: 0.1284, alpha: 0.9630 } },
  { frequencyGHz: 24, horizontal: { k: 0.1425, alpha: 1.0101 }, vertical: { k: 0.1404, alpha: 0.9561 } },
  { frequencyGHz: 25, horizontal: { k: 0.1571, alpha: 0.9991 }, vertical: { k: 0.1533, alpha: 0.9491 } },
  { frequencyGHz: 26, horizontal: { k: 0.1724, alpha: 0.9884 }, vertical: { k: 0.1669, alpha: 0.9421 } },
  { frequencyGHz: 27, horizontal: { k: 0.1884, alpha: 0.9780 }, vertical: { k: 0.1813, alpha: 0.9349 } },
  { frequencyGHz: 28, horizontal: { k: 0.2051, alpha: 0.9679 }, vertical: { k: 0.1964, alpha: 0.9277 } },
  { frequencyGHz: 29, horizontal: { k: 0.2224, alpha: 0.9580 }, vertical: { k: 0.2124, alpha: 0.9203 } },
  { frequencyGHz: 30, horizontal: { k: 0.2403, alpha: 0.9485 }, vertical: { k: 0.2291, alpha: 0.9129 } },
];

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
    MIN_P618_FREQUENCY_GHZ,
    MAX_P618_FREQUENCY_GHZ,
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
  const first = P838_KU_KA_COEFFICIENTS[0];
  const last = P838_KU_KA_COEFFICIENTS[P838_KU_KA_COEFFICIENTS.length - 1];

  if (freqGHz < first.frequencyGHz || freqGHz > last.frequencyGHz) {
    throw new RangeError(
      `carrierFrequencyGHz must be within the available Ku/Ka coefficient subset (${first.frequencyGHz}-${last.frequencyGHz} GHz).`,
    );
  }

  const exact = P838_KU_KA_COEFFICIENTS.find(
    (entry) => entry.frequencyGHz === freqGHz,
  );
  if (exact !== undefined) {
    return selectPolarizationCoefficients(exact, polarization);
  }

  const upperIndex = P838_KU_KA_COEFFICIENTS.findIndex(
    (entry) => entry.frequencyGHz > freqGHz,
  );
  const lower = P838_KU_KA_COEFFICIENTS[upperIndex - 1];
  const upper = P838_KU_KA_COEFFICIENTS[upperIndex];
  const logFreq = Math.log10(freqGHz);
  const logLowerFreq = Math.log10(lower.frequencyGHz);
  const logUpperFreq = Math.log10(upper.frequencyGHz);
  const t = (logFreq - logLowerFreq) / (logUpperFreq - logLowerFreq);

  return {
    k: interpolateLog(
      selectPolarizationCoefficients(lower, polarization).k,
      selectPolarizationCoefficients(upper, polarization).k,
      t,
    ),
    alpha: interpolateLinear(
      selectPolarizationCoefficients(lower, polarization).alpha,
      selectPolarizationCoefficients(upper, polarization).alpha,
      t,
    ),
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
  anchor: P838CoefficientAnchor,
  polarization: RainPolarization,
): RainKAlphaCoefficients {
  if (polarization === 'horizontal') {
    return anchor.horizontal;
  }

  if (polarization === 'vertical') {
    return anchor.vertical;
  }

  return {
    k: (anchor.horizontal.k + anchor.vertical.k) / 2,
    alpha: (anchor.horizontal.alpha + anchor.vertical.alpha) / 2,
  };
}

function interpolateLog(lower: number, upper: number, t: number): number {
  return Math.pow(10, interpolateLinear(Math.log10(lower), Math.log10(upper), t));
}

function interpolateLinear(lower: number, upper: number, t: number): number {
  return lower + (upper - lower) * t;
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
