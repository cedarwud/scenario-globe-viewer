// ITU-R P.676-13 section 1 specific attenuation
// ITU-R P.676-13 Annex 2 simplified slant-path
// Local PDF: paper-catalog/3gpp/R-REC-P.676-13-202208-I!!PDF-E.pdf
// Simplification: ground-station reference altitude with ITU-R P.835 standard atmosphere defaults

const DEG_TO_RAD = Math.PI / 180;
const WATER_VAPOR_PRESSURE_DENOMINATOR = 216.7;
const OXYGEN_EQUIVALENT_HEIGHT_KM = 5.3;

export type GasAbsorptionInput = Readonly<{
  carrierFrequencyGHz: number;
  elevationDeg: number;
  surfacePressureHPa?: number;
  surfaceTemperatureC?: number;
  surfaceWaterVaporDensityGM3?: number;
}>;

export type GasAbsorptionDefaults = Readonly<{
  surfacePressureHPa: number;
  surfaceTemperatureC: number;
  surfaceWaterVaporDensityGM3: number;
}>;

export type GasAbsorptionComponent = 'oxygen' | 'waterVapor';

type AtmosphereState = Readonly<{
  pressureHPa: number;
  dryPressureHPa: number;
  temperatureK: number;
  waterVaporPressureHPa: number;
}>;

type SpectralLine = readonly [number, number, number, number, number, number, number];

export const GAS_ABSORPTION_DEFAULTS: GasAbsorptionDefaults = Object.freeze({
  surfacePressureHPa: 1013.25,
  surfaceTemperatureC: 15,
  surfaceWaterVaporDensityGM3: 7.5,
});

const OXYGEN_LINES: readonly SpectralLine[] = [
  [50.474214, 0.975, 9.651, 6.69, 0, 2.566, 6.85], [50.987745, 2.529, 8.653, 7.17, 0, 2.246, 6.8], [51.50336, 6.193, 7.709, 7.64, 0, 1.947, 6.729],
  [52.021429, 14.32, 6.819, 8.11, 0, 1.667, 6.64], [52.542418, 31.24, 5.983, 8.58, 0, 1.388, 6.526], [53.066934, 64.29, 5.201, 9.06, 0, 1.349, 6.206],
  [53.595775, 124.6, 4.474, 9.55, 0, 2.227, 5.085], [54.130025, 227.3, 3.8, 9.96, 0, 3.17, 3.75], [54.67118, 389.7, 3.182, 10.37, 0, 3.558, 2.654],
  [55.221384, 627.1, 2.618, 10.89, 0, 2.56, 2.952], [55.783815, 945.3, 2.109, 11.34, 0, -1.172, 6.135], [56.264774, 543.4, 0.014, 17.03, 0, 3.525, -0.978],
  [56.363399, 1331.8, 1.654, 11.89, 0, -2.378, 6.547], [56.968211, 1746.6, 1.255, 12.23, 0, -3.545, 6.451], [57.612486, 2120.1, 0.91, 12.62, 0, -5.416, 6.056],
  [58.323877, 2363.7, 0.621, 12.95, 0, -1.932, 0.436], [58.446588, 1442.1, 0.083, 14.91, 0, 6.768, -1.273], [59.164204, 2379.9, 0.387, 13.53, 0, -6.561, 2.309],
  [59.590983, 2090.7, 0.207, 14.08, 0, 6.957, -0.776], [60.306056, 2103.4, 0.207, 14.15, 0, -6.395, 0.699], [60.434778, 2438, 0.386, 13.39, 0, 6.342, -2.825],
  [61.150562, 2479.5, 0.621, 12.92, 0, 1.014, -0.584], [61.800158, 2275.9, 0.91, 12.63, 0, 5.014, -6.619], [62.41122, 1915.4, 1.255, 12.17, 0, 3.029, -6.759],
  [62.486253, 1503, 0.083, 15.13, 0, -4.499, 0.844], [62.997984, 1490.2, 1.654, 11.74, 0, 1.856, -6.675], [63.568526, 1078, 2.108, 11.34, 0, 0.658, -6.139],
  [64.127775, 728.7, 2.617, 10.88, 0, -3.036, -2.895], [64.67891, 461.3, 3.181, 10.38, 0, -3.968, -2.59], [65.224078, 274, 3.8, 9.96, 0, -3.528, -3.68],
  [65.764779, 153, 4.473, 9.55, 0, -2.548, -5.002], [66.302096, 80.4, 5.2, 9.06, 0, -1.66, -6.091], [66.836834, 39.8, 5.982, 8.58, 0, -1.68, -6.393],
  [67.369601, 18.56, 6.818, 8.11, 0, -1.956, -6.475], [67.900868, 8.172, 7.708, 7.64, 0, -2.216, -6.545], [68.431006, 3.397, 8.652, 7.17, 0, -2.492, -6.6],
  [68.960312, 1.334, 9.65, 6.69, 0, -2.773, -6.65], [118.750334, 940.3, 0.01, 16.64, 0, -0.439, 0.079], [368.498246, 67.4, 0.048, 16.4, 0, 0, 0],
];

const WATER_VAPOR_LINES: readonly SpectralLine[] = [
  [22.23508, 0.1079, 2.144, 26.38, 0.76, 5.087, 1], [67.80396, 0.0011, 8.732, 28.58, 0.69, 4.93, 0.82], [119.99594, 0.0007, 8.353, 29.48, 0.7, 4.78, 0.79],
  [183.310087, 2.273, 0.668, 29.06, 0.77, 5.022, 0.85], [321.22563, 0.047, 6.179, 24.04, 0.67, 4.398, 0.54], [325.152888, 1.514, 1.541, 28.23, 0.64, 4.893, 0.74],
  [336.227764, 0.001, 9.825, 26.93, 0.69, 4.74, 0.61], [380.197353, 11.67, 1.048, 28.11, 0.54, 5.063, 0.89], [1780, 17506, 0.952, 196.3, 2, 24.15, 5],
];

export function computeGasAbsorptionDb(input: {
  carrierFrequencyGHz: number;
  elevationDeg: number;
  surfacePressureHPa?: number;
  surfaceTemperatureC?: number;
  surfaceWaterVaporDensityGM3?: number;
}): number {
  const atmosphere = validateInput(input);
  const { carrierFrequencyGHz, elevationDeg } = input;
  const oxygenSpecific = computeOxygenSpecificAttenuationDbPerKm(carrierFrequencyGHz, atmosphere);
  const waterSpecific = computeWaterVaporSpecificAttenuationDbPerKm(carrierFrequencyGHz, atmosphere);

  // Sanity: 20 GHz, 30 deg elevation, defaults is about 0.5 dB clear-sky slant loss.
  // Sanity: 60 GHz, 30 deg elevation, defaults is dominated by the oxygen band.
  return oxygenSpecific * computeEquivalentPathLengthKm('oxygen', carrierFrequencyGHz, elevationDeg) +
    waterSpecific * computeEquivalentPathLengthKm('waterVapor', carrierFrequencyGHz, elevationDeg);
}

function computeOxygenSpecificAttenuationDbPerKm(
  frequencyGHz: number,
  atmosphere: AtmosphereState,
): number {
  const theta = 300 / atmosphere.temperatureK;
  let refractivity = 0;
  for (const [center, a1, a2, a3, a4, a5, a6] of OXYGEN_LINES) {
    const strength = a1 * 1e-7 * atmosphere.dryPressureHPa * theta ** 3 * Math.exp(a2 * (1 - theta));
    const widthBase = a3 * 1e-4 * (atmosphere.dryPressureHPa * theta ** (0.8 - a4) + 1.1 * atmosphere.waterVaporPressureHPa * theta);
    const width = Math.sqrt(widthBase ** 2 + 2.25e-6);
    const interference = (a5 + a6 * theta) * 1e-4 * atmosphere.pressureHPa * theta ** 0.8;
    refractivity += strength * computeLineShape(frequencyGHz, center, width, interference);
  }

  const debyeWidth = 5.6e-4 * atmosphere.pressureHPa * theta ** 0.8;
  const dryContinuum = frequencyGHz * atmosphere.dryPressureHPa * theta ** 2 *
    (6.14e-5 / (debyeWidth * (1 + (frequencyGHz / debyeWidth) ** 2)) +
      (1.4e-12 * atmosphere.dryPressureHPa * theta ** 1.5) / (1 + 1.9e-5 * frequencyGHz ** 1.5));
  return Math.max(0, 0.182 * frequencyGHz * (refractivity + dryContinuum));
}

function computeWaterVaporSpecificAttenuationDbPerKm(
  frequencyGHz: number,
  atmosphere: AtmosphereState,
): number {
  const theta = 300 / atmosphere.temperatureK;
  let refractivity = 0;
  for (const [center, b1, b2, b3, b4, b5, b6] of WATER_VAPOR_LINES) {
    const strength = b1 * 1e-1 * atmosphere.waterVaporPressureHPa * theta ** 3.5 * Math.exp(b2 * (1 - theta));
    const widthBase = b3 * 1e-4 * (atmosphere.dryPressureHPa * theta ** b4 + b5 * atmosphere.waterVaporPressureHPa * theta ** b6);
    const width = 0.535 * widthBase + Math.sqrt(0.217 * widthBase ** 2 + (2.1316e-12 * center ** 2) / theta);
    refractivity += strength * computeLineShape(frequencyGHz, center, width, 0);
  }
  return Math.max(0, 0.182 * frequencyGHz * refractivity);
}

function computeEquivalentPathLengthKm(
  component: GasAbsorptionComponent,
  frequencyGHz: number,
  elevationDeg: number,
): number {
  // Annex 2 oxygen-height coefficients are approximated by the P.835 ground-reference scale height.
  const heightKm = component === 'oxygen' ? OXYGEN_EQUIVALENT_HEIGHT_KM : computeWaterVaporEquivalentHeightKm(frequencyGHz);
  return heightKm / Math.sin(elevationDeg * DEG_TO_RAD);
}

function computeWaterVaporEquivalentHeightKm(frequencyGHz: number): number {
  const resonances = [[22.23508, 2.6846, 2.7649], [183.310087, 5.8905, 4.9219], [325.152888, 2.981, 3.0748]] as const;
  return resonances.reduce(
    (heightKm, [center, coefficient, width]) => heightKm + coefficient / ((frequencyGHz - center) ** 2 + width),
    5.6585e-5 * frequencyGHz + 1.8348,
  );
}

function computeLineShape(
  frequencyGHz: number,
  centerFrequencyGHz: number,
  widthGHz: number,
  interference: number,
): number {
  return (frequencyGHz / centerFrequencyGHz) *
    ((widthGHz - interference * (centerFrequencyGHz - frequencyGHz)) / ((centerFrequencyGHz - frequencyGHz) ** 2 + widthGHz ** 2) +
      (widthGHz - interference * (centerFrequencyGHz + frequencyGHz)) / ((centerFrequencyGHz + frequencyGHz) ** 2 + widthGHz ** 2));
}

function validateInput(input: GasAbsorptionInput): AtmosphereState {
  if (input === null || typeof input !== 'object') throw new TypeError('input must be an object.');
  const pressureHPa = input.surfacePressureHPa ?? GAS_ABSORPTION_DEFAULTS.surfacePressureHPa;
  const temperatureC = input.surfaceTemperatureC ?? GAS_ABSORPTION_DEFAULTS.surfaceTemperatureC;
  const waterVaporDensityGM3 = input.surfaceWaterVaporDensityGM3 ?? GAS_ABSORPTION_DEFAULTS.surfaceWaterVaporDensityGM3;

  assertFinite(input.carrierFrequencyGHz, 'carrierFrequencyGHz');
  assertFinite(input.elevationDeg, 'elevationDeg');
  assertFinite(pressureHPa, 'surfacePressureHPa');
  assertFinite(temperatureC, 'surfaceTemperatureC');
  assertFinite(waterVaporDensityGM3, 'surfaceWaterVaporDensityGM3');

  if (input.carrierFrequencyGHz < 1 || input.carrierFrequencyGHz > 350) throw new RangeError('carrierFrequencyGHz must be in the 1-350 GHz range.');
  if (input.elevationDeg <= 0 || input.elevationDeg > 90) throw new RangeError('elevationDeg must be greater than 0 and no more than 90.');
  if (pressureHPa <= 0) throw new RangeError('surfacePressureHPa must be positive.');
  if (temperatureC <= -273.15) throw new RangeError('surfaceTemperatureC must be above absolute zero.');
  if (waterVaporDensityGM3 < 0) throw new RangeError('surfaceWaterVaporDensityGM3 must be non-negative.');

  const temperatureK = temperatureC + 273.15;
  const waterVaporPressureHPa = (waterVaporDensityGM3 * temperatureK) / WATER_VAPOR_PRESSURE_DENOMINATOR;
  const dryPressureHPa = pressureHPa - waterVaporPressureHPa;
  if (dryPressureHPa <= 0) throw new RangeError('surfacePressureHPa must exceed water-vapor partial pressure.');
  return { pressureHPa, dryPressureHPa, temperatureK, waterVaporPressureHPa };
}

function assertFinite(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${fieldName} must be finite.`);
}
