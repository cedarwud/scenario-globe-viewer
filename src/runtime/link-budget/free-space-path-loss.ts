/**
 * 3GPP TR 38.811 §6.6.2 free-space path loss for NTN satellite links.
 * Source PDF: paper-catalog/3gpp/38811-f40.pdf.
 * FSPL_dB = 20*log10(d) + 20*log10(f) + 92.45 (d in km, f in GHz).
 */

const FSPL_OFFSET_DB_FOR_KM_GHZ = 92.45;

export type FreeSpacePathLossInput = {
  slantRangeKm: number;
  carrierFrequencyGHz: number;
};

export type SatelliteOrbitClass = 'LEO' | 'MEO' | 'GEO';

export type SatelliteCarrierBand = 'Ku' | 'L' | 'Ka';

export type OrbitClassCarrierDefault = Readonly<{
  orbitClass: SatelliteOrbitClass;
  carrierBand: SatelliteCarrierBand;
  carrierFrequencyGHz: number;
}>;

export type OrbitClassFreeSpacePathLossInput = Readonly<{
  slantRangeKm: number;
  carrierFrequencyGHz?: number;
}>;

export const ORBIT_CLASS_CARRIER_DEFAULTS: Readonly<
  Record<SatelliteOrbitClass, OrbitClassCarrierDefault>
> = Object.freeze({
  LEO: Object.freeze({
    orbitClass: 'LEO',
    carrierBand: 'Ku',
    carrierFrequencyGHz: 12,
  }),
  MEO: Object.freeze({
    orbitClass: 'MEO',
    carrierBand: 'L',
    carrierFrequencyGHz: 1.5,
  }),
  GEO: Object.freeze({
    orbitClass: 'GEO',
    carrierBand: 'Ka',
    carrierFrequencyGHz: 20,
  }),
});

export function computeFreeSpacePathLossDb(input: FreeSpacePathLossInput): number {
  const { slantRangeKm, carrierFrequencyGHz } = input;

  assertPositiveFinite(slantRangeKm, 'slantRangeKm');
  assertPositiveFinite(carrierFrequencyGHz, 'carrierFrequencyGHz');

  return (
    20 * Math.log10(slantRangeKm) +
    20 * Math.log10(carrierFrequencyGHz) +
    FSPL_OFFSET_DB_FOR_KM_GHZ
  );
}

// Sanity: LEO 550 km at 12 GHz is about 169 dB.
export function computeLeoKuFreeSpacePathLossDb(
  input: OrbitClassFreeSpacePathLossInput,
): number {
  return computeWithOrbitDefault('LEO', input);
}

export function computeMeoLFreeSpacePathLossDb(
  input: OrbitClassFreeSpacePathLossInput,
): number {
  return computeWithOrbitDefault('MEO', input);
}

// Sanity: GEO 35786 km at 20 GHz is about 210 dB.
export function computeGeoKaFreeSpacePathLossDb(
  input: OrbitClassFreeSpacePathLossInput,
): number {
  return computeWithOrbitDefault('GEO', input);
}

export function computeOrbitClassFreeSpacePathLossDb(
  orbitClass: SatelliteOrbitClass,
  input: OrbitClassFreeSpacePathLossInput,
): number {
  return computeWithOrbitDefault(orbitClass, input);
}

function computeWithOrbitDefault(
  orbitClass: SatelliteOrbitClass,
  input: OrbitClassFreeSpacePathLossInput,
): number {
  const carrierFrequencyGHz =
    input.carrierFrequencyGHz ??
    ORBIT_CLASS_CARRIER_DEFAULTS[orbitClass].carrierFrequencyGHz;

  return computeFreeSpacePathLossDb({
    slantRangeKm: input.slantRangeKm,
    carrierFrequencyGHz,
  });
}

function assertPositiveFinite(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${fieldName} must be a finite positive number.`);
  }
}
