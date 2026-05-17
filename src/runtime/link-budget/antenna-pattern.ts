/**
 * ITU-R S.1528-0 Annex 1 satellite antenna gain pattern helper.
 * Source PDF: paper-catalog/3gpp/R-REC-S.1528-0-200106-I!!PDF-E.pdf.
 * ITU-R S.465-6 earth-station antenna gain pattern helper.
 * Source PDF: paper-catalog/3gpp/R-REC-S.465-6-201001-I!!PDF-E.pdf.
 */

export type SatelliteAntennaRolloffModel = 'S1528-A' | 'S1528-B';

export type SatelliteAntennaGainInput = Readonly<{
  peakGainDb: number;
  beamwidthDeg: number;
  offAxisAngleDeg: number;
  rolloffModel?: SatelliteAntennaRolloffModel;
}>;

export type EarthStationAntennaGainInput = Readonly<{
  peakGainDb: number;
  offAxisAngleDeg: number;
  antennaDiameterM: number;
  carrierFrequencyGHz: number;
}>;

type SatellitePatternSpec = Readonly<{
  floorGainDb: number;
  shoulderRelativeDb: number;
  shoulderRatio: number;
  plateauEndRatio?: number;
}>;

const S1528_PATTERN_SPECS: Readonly<Record<SatelliteAntennaRolloffModel, SatellitePatternSpec>> =
  Object.freeze({
    'S1528-A': Object.freeze({
      floorGainDb: 5,
      shoulderRelativeDb: -6.75,
      shoulderRatio: 1.5,
    }),
    'S1528-B': Object.freeze({
      floorGainDb: 0,
      shoulderRelativeDb: -25,
      shoulderRatio: Math.sqrt(25 / 3),
      plateauEndRatio: 6.32,
    }),
  });

const S465_MIN_ROLLOFF_ANGLE_DEG = 1;
const S465_FLOOR_START_ANGLE_DEG = 48;
const S465_FLOOR_GAIN_DB = -10;
const S465_ROLLOFF_GAIN_AT_ONE_DEG_DB = 32;
const S465_MIN_FREQUENCY_GHZ = 2;
const S465_MAX_FREQUENCY_GHZ = 31;

/**
 * ITU-R S.1528-0 Annex 1 off-axis satellite pattern.
 *
 * `S1528-A` is the default Annex 1 LEO reference from recommends 1.3
 * with Ls = -6.75 dB and LF = 5 dBi. `S1528-B` is the Annex 1
 * Recommendation ITU-R S.672 comparison envelope with Ls = -25 dB,
 * a near side-lobe plateau through 6.32 psi/psi_b, and LF = 0 dBi.
 * `beamwidthDeg` is the full 3 dB beamwidth, so psi_b is half of it.
 */
export function computeSatelliteAntennaGainDb(input: SatelliteAntennaGainInput): number {
  validateSatelliteInput(input);

  const { peakGainDb, beamwidthDeg, offAxisAngleDeg } = input;
  const model = input.rolloffModel ?? 'S1528-A';
  const pattern = S1528_PATTERN_SPECS[model];
  const halfBeamwidthDeg = beamwidthDeg / 2;
  const normalizedOffAxis = offAxisAngleDeg / halfBeamwidthDeg;

  if (normalizedOffAxis <= pattern.shoulderRatio) {
    return peakGainDb - 3 * normalizedOffAxis * normalizedOffAxis;
  }

  if (pattern.plateauEndRatio !== undefined) {
    if (normalizedOffAxis <= pattern.plateauEndRatio) {
      return peakGainDb + pattern.shoulderRelativeDb;
    }

    const floorStartRatio =
      pattern.plateauEndRatio *
      Math.pow(10, 0.04 * (peakGainDb + pattern.shoulderRelativeDb - pattern.floorGainDb));

    if (normalizedOffAxis <= floorStartRatio) {
      return (
        peakGainDb +
        pattern.shoulderRelativeDb +
        20 -
        25 * Math.log10(normalizedOffAxis)
      );
    }

    return pattern.floorGainDb;
  }

  const floorStartRatio =
    pattern.shoulderRatio *
    Math.pow(10, 0.04 * (peakGainDb + pattern.shoulderRelativeDb - pattern.floorGainDb));

  if (normalizedOffAxis <= floorStartRatio) {
    return (
      peakGainDb +
      pattern.shoulderRelativeDb -
      25 * Math.log10(normalizedOffAxis / pattern.shoulderRatio)
    );
  }

  return pattern.floorGainDb;
}

// Sanity: S.1528-A with Gm 35 dBi and 3.2 deg beamwidth reaches the 5 dBi floor near 20.4 deg.
/**
 * ITU-R S.465-6 earth-station off-axis pattern.
 *
 * Boundary handling is explicit: phi < 1 deg returns the supplied peak gain,
 * 1 deg <= phi <= 48 deg uses 32 - 25 log10(phi), and 48 deg < phi <= 180 deg
 * returns -10 dBi. Diameter and carrier frequency are validated for positive
 * geometry and the 2-31 GHz S.465-6 frequency range; the requested one-degree
 * boundary is not replaced by the dynamic phi_min notes in the Recommendation.
 */
export function computeEarthStationAntennaGainDb(input: EarthStationAntennaGainInput): number {
  const { peakGainDb, offAxisAngleDeg, antennaDiameterM, carrierFrequencyGHz } = input;

  assertFiniteNumber(peakGainDb, 'peakGainDb');
  assertAngleInRange(offAxisAngleDeg, 'offAxisAngleDeg', 0, 180);
  assertPositiveFinite(antennaDiameterM, 'antennaDiameterM');
  assertFrequencyInS465Range(carrierFrequencyGHz);

  if (peakGainDb < S465_ROLLOFF_GAIN_AT_ONE_DEG_DB) {
    throw new RangeError('peakGainDb must be at least 32 dBi for this S.465-6 profile.');
  }

  if (offAxisAngleDeg < S465_MIN_ROLLOFF_ANGLE_DEG) {
    return peakGainDb;
  }

  if (offAxisAngleDeg <= S465_FLOOR_START_ANGLE_DEG) {
    return S465_ROLLOFF_GAIN_AT_ONE_DEG_DB - 25 * Math.log10(offAxisAngleDeg);
  }

  return S465_FLOOR_GAIN_DB;
}

// Sanity: S.465-6 returns 32 dBi at 1 deg and -10 dBi above 48 deg.
function validateSatelliteInput(input: SatelliteAntennaGainInput): void {
  const { peakGainDb, beamwidthDeg, offAxisAngleDeg, rolloffModel } = input;

  assertFiniteNumber(peakGainDb, 'peakGainDb');
  assertAngleInRange(beamwidthDeg, 'beamwidthDeg', 0, 180);
  assertAngleInRange(offAxisAngleDeg, 'offAxisAngleDeg', 0, 180);

  if (
    rolloffModel !== undefined &&
    rolloffModel !== 'S1528-A' &&
    rolloffModel !== 'S1528-B'
  ) {
    throw new RangeError('rolloffModel must be S1528-A or S1528-B.');
  }

  const pattern = S1528_PATTERN_SPECS[rolloffModel ?? 'S1528-A'];
  if (peakGainDb + pattern.shoulderRelativeDb < pattern.floorGainDb) {
    throw new RangeError('peakGainDb is too low for the selected S.1528 profile.');
  }
}

function assertFiniteNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${fieldName} must be a finite number.`);
  }
}

function assertPositiveFinite(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${fieldName} must be a finite positive number.`);
  }
}

function assertAngleInRange(
  value: number,
  fieldName: string,
  minInclusive: number,
  maxInclusive: number,
): void {
  if (!Number.isFinite(value) || value < minInclusive || value > maxInclusive) {
    throw new RangeError(
      `${fieldName} must be a finite angle from ${minInclusive} to ${maxInclusive} degrees.`,
    );
  }
}

function assertFrequencyInS465Range(value: number): void {
  if (
    !Number.isFinite(value) ||
    value < S465_MIN_FREQUENCY_GHZ ||
    value > S465_MAX_FREQUENCY_GHZ
  ) {
    throw new RangeError('carrierFrequencyGHz must be in the S.465-6 2 to 31 GHz range.');
  }
}
