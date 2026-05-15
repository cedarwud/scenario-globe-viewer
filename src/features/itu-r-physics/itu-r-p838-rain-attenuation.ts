// ITU-R P.838-3 (March 2005): Specific attenuation model for rain
// Source: Rec. ITU-R P.838-3, https://www.itu.int/rec/R-REC-P.838
//
// Formula: γ_R = k × R^α  (dB/km)
// Coefficients from Table 5 (evaluated values at discrete frequencies).
// Interpolation per §3: log-log for k, semi-log (linear in α) for α.

interface P838Table5Entry {
  readonly freqGHz: number;
  readonly kH: number;
  readonly alphaH: number;
  readonly kV: number;
  readonly alphaV: number;
}

// ITU-R P.838-3, Table 5: frequency-dependent coefficients 1–100 GHz
const P838_TABLE5: ReadonlyArray<P838Table5Entry> = [
  { freqGHz: 1,   kH: 0.0000259, alphaH: 0.9691, kV: 0.0000308, alphaV: 0.8592 },
  { freqGHz: 1.5, kH: 0.0000443, alphaH: 1.0185, kV: 0.0000574, alphaV: 0.8957 },
  { freqGHz: 2,   kH: 0.0000847, alphaH: 1.0664, kV: 0.0000998, alphaV: 0.9490 },
  { freqGHz: 2.5, kH: 0.0001321, alphaH: 1.1209, kV: 0.0001464, alphaV: 1.0085 },
  { freqGHz: 3,   kH: 0.0001390, alphaH: 1.2322, kV: 0.0001942, alphaV: 1.0688 },
  { freqGHz: 3.5, kH: 0.0001155, alphaH: 1.4189, kV: 0.0002346, alphaV: 1.1387 },
  { freqGHz: 4,   kH: 0.0001071, alphaH: 1.6009, kV: 0.0002461, alphaV: 1.2476 },
  { freqGHz: 4.5, kH: 0.0001340, alphaH: 1.6948, kV: 0.0002347, alphaV: 1.3987 },
  { freqGHz: 5,   kH: 0.0002162, alphaH: 1.6969, kV: 0.0002428, alphaV: 1.5317 },
  { freqGHz: 5.5, kH: 0.0003909, alphaH: 1.6499, kV: 0.0003115, alphaV: 1.5882 },
  { freqGHz: 6,   kH: 0.0007056, alphaH: 1.5900, kV: 0.0004878, alphaV: 1.5728 },
  { freqGHz: 7,   kH: 0.001915,  alphaH: 1.4810, kV: 0.001425,  alphaV: 1.4745 },
  { freqGHz: 8,   kH: 0.004115,  alphaH: 1.3905, kV: 0.003450,  alphaV: 1.3797 },
  { freqGHz: 9,   kH: 0.007535,  alphaH: 1.3155, kV: 0.006691,  alphaV: 1.2895 },
  { freqGHz: 10,  kH: 0.01217,   alphaH: 1.2571, kV: 0.01129,   alphaV: 1.2156 },
  { freqGHz: 11,  kH: 0.01772,   alphaH: 1.2140, kV: 0.01731,   alphaV: 1.1617 },
  { freqGHz: 12,  kH: 0.02386,   alphaH: 1.1825, kV: 0.02455,   alphaV: 1.1216 },
  { freqGHz: 13,  kH: 0.03041,   alphaH: 1.1586, kV: 0.03266,   alphaV: 1.0901 },
  { freqGHz: 14,  kH: 0.03738,   alphaH: 1.1396, kV: 0.04126,   alphaV: 1.0646 },
  { freqGHz: 15,  kH: 0.04481,   alphaH: 1.1233, kV: 0.05008,   alphaV: 1.0440 },
  { freqGHz: 16,  kH: 0.05282,   alphaH: 1.1086, kV: 0.05899,   alphaV: 1.0273 },
  { freqGHz: 17,  kH: 0.06146,   alphaH: 1.0949, kV: 0.06797,   alphaV: 1.0137 },
  { freqGHz: 18,  kH: 0.07078,   alphaH: 1.0818, kV: 0.07708,   alphaV: 1.0025 },
  { freqGHz: 19,  kH: 0.08084,   alphaH: 1.0691, kV: 0.08642,   alphaV: 0.9930 },
  { freqGHz: 20,  kH: 0.09164,   alphaH: 1.0568, kV: 0.09611,   alphaV: 0.9847 },
  { freqGHz: 21,  kH: 0.1032,    alphaH: 1.0447, kV: 0.1063,    alphaV: 0.9771 },
  { freqGHz: 22,  kH: 0.1155,    alphaH: 1.0329, kV: 0.1170,    alphaV: 0.9700 },
  { freqGHz: 23,  kH: 0.1286,    alphaH: 1.0214, kV: 0.1284,    alphaV: 0.9630 },
  { freqGHz: 24,  kH: 0.1425,    alphaH: 1.0101, kV: 0.1404,    alphaV: 0.9561 },
  { freqGHz: 25,  kH: 0.1571,    alphaH: 0.9991, kV: 0.1533,    alphaV: 0.9491 },
  { freqGHz: 26,  kH: 0.1724,    alphaH: 0.9884, kV: 0.1669,    alphaV: 0.9421 },
  { freqGHz: 27,  kH: 0.1884,    alphaH: 0.9780, kV: 0.1813,    alphaV: 0.9349 },
  { freqGHz: 28,  kH: 0.2051,    alphaH: 0.9679, kV: 0.1964,    alphaV: 0.9277 },
  { freqGHz: 29,  kH: 0.2224,    alphaH: 0.9580, kV: 0.2124,    alphaV: 0.9203 },
  { freqGHz: 30,  kH: 0.2403,    alphaH: 0.9485, kV: 0.2291,    alphaV: 0.9129 },
  { freqGHz: 31,  kH: 0.2588,    alphaH: 0.9392, kV: 0.2465,    alphaV: 0.9055 },
  { freqGHz: 32,  kH: 0.2778,    alphaH: 0.9302, kV: 0.2646,    alphaV: 0.8981 },
  { freqGHz: 33,  kH: 0.2972,    alphaH: 0.9214, kV: 0.2833,    alphaV: 0.8907 },
  { freqGHz: 34,  kH: 0.3171,    alphaH: 0.9129, kV: 0.3026,    alphaV: 0.8834 },
  { freqGHz: 35,  kH: 0.3374,    alphaH: 0.9047, kV: 0.3224,    alphaV: 0.8761 },
  { freqGHz: 36,  kH: 0.3580,    alphaH: 0.8967, kV: 0.3427,    alphaV: 0.8690 },
  { freqGHz: 37,  kH: 0.3789,    alphaH: 0.8890, kV: 0.3633,    alphaV: 0.8621 },
  { freqGHz: 38,  kH: 0.4001,    alphaH: 0.8816, kV: 0.3844,    alphaV: 0.8552 },
  { freqGHz: 39,  kH: 0.4215,    alphaH: 0.8743, kV: 0.4058,    alphaV: 0.8486 },
  { freqGHz: 40,  kH: 0.4431,    alphaH: 0.8673, kV: 0.4274,    alphaV: 0.8421 },
  { freqGHz: 41,  kH: 0.4647,    alphaH: 0.8605, kV: 0.4492,    alphaV: 0.8357 },
  { freqGHz: 42,  kH: 0.4865,    alphaH: 0.8539, kV: 0.4712,    alphaV: 0.8296 },
  { freqGHz: 43,  kH: 0.5084,    alphaH: 0.8476, kV: 0.4932,    alphaV: 0.8236 },
  { freqGHz: 44,  kH: 0.5302,    alphaH: 0.8414, kV: 0.5153,    alphaV: 0.8179 },
  { freqGHz: 45,  kH: 0.5521,    alphaH: 0.8355, kV: 0.5375,    alphaV: 0.8123 },
  { freqGHz: 46,  kH: 0.5738,    alphaH: 0.8297, kV: 0.5596,    alphaV: 0.8069 },
  { freqGHz: 47,  kH: 0.5956,    alphaH: 0.8241, kV: 0.5817,    alphaV: 0.8017 },
  { freqGHz: 48,  kH: 0.6172,    alphaH: 0.8187, kV: 0.6037,    alphaV: 0.7967 },
  { freqGHz: 49,  kH: 0.6386,    alphaH: 0.8134, kV: 0.6255,    alphaV: 0.7918 },
  { freqGHz: 50,  kH: 0.6600,    alphaH: 0.8084, kV: 0.6472,    alphaV: 0.7871 },
  { freqGHz: 51,  kH: 0.6811,    alphaH: 0.8034, kV: 0.6687,    alphaV: 0.7826 },
  { freqGHz: 52,  kH: 0.7020,    alphaH: 0.7987, kV: 0.6901,    alphaV: 0.7783 },
  { freqGHz: 53,  kH: 0.7228,    alphaH: 0.7941, kV: 0.7112,    alphaV: 0.7741 },
  { freqGHz: 54,  kH: 0.7433,    alphaH: 0.7896, kV: 0.7321,    alphaV: 0.7700 },
  { freqGHz: 55,  kH: 0.7635,    alphaH: 0.7853, kV: 0.7527,    alphaV: 0.7661 },
  { freqGHz: 56,  kH: 0.7835,    alphaH: 0.7811, kV: 0.7730,    alphaV: 0.7623 },
  { freqGHz: 57,  kH: 0.8032,    alphaH: 0.7771, kV: 0.7931,    alphaV: 0.7587 },
  { freqGHz: 58,  kH: 0.8226,    alphaH: 0.7731, kV: 0.8129,    alphaV: 0.7552 },
  { freqGHz: 59,  kH: 0.8418,    alphaH: 0.7693, kV: 0.8324,    alphaV: 0.7518 },
  { freqGHz: 60,  kH: 0.8606,    alphaH: 0.7656, kV: 0.8515,    alphaV: 0.7486 },
  { freqGHz: 61,  kH: 0.8791,    alphaH: 0.7621, kV: 0.8704,    alphaV: 0.7454 },
  { freqGHz: 62,  kH: 0.8974,    alphaH: 0.7586, kV: 0.8889,    alphaV: 0.7424 },
  { freqGHz: 63,  kH: 0.9153,    alphaH: 0.7552, kV: 0.9071,    alphaV: 0.7395 },
  { freqGHz: 64,  kH: 0.9328,    alphaH: 0.7520, kV: 0.9250,    alphaV: 0.7366 },
  { freqGHz: 65,  kH: 0.9501,    alphaH: 0.7488, kV: 0.9425,    alphaV: 0.7339 },
  { freqGHz: 66,  kH: 0.9670,    alphaH: 0.7458, kV: 0.9598,    alphaV: 0.7313 },
  { freqGHz: 67,  kH: 0.9836,    alphaH: 0.7428, kV: 0.9767,    alphaV: 0.7287 },
  { freqGHz: 68,  kH: 0.9999,    alphaH: 0.7400, kV: 0.9932,    alphaV: 0.7262 },
  { freqGHz: 69,  kH: 1.0159,    alphaH: 0.7372, kV: 1.0094,    alphaV: 0.7238 },
  { freqGHz: 70,  kH: 1.0315,    alphaH: 0.7345, kV: 1.0253,    alphaV: 0.7215 },
  { freqGHz: 71,  kH: 1.0468,    alphaH: 0.7318, kV: 1.0409,    alphaV: 0.7193 },
  { freqGHz: 72,  kH: 1.0618,    alphaH: 0.7293, kV: 1.0561,    alphaV: 0.7171 },
  { freqGHz: 73,  kH: 1.0764,    alphaH: 0.7268, kV: 1.0711,    alphaV: 0.7150 },
  { freqGHz: 74,  kH: 1.0908,    alphaH: 0.7244, kV: 1.0857,    alphaV: 0.7130 },
  { freqGHz: 75,  kH: 1.1048,    alphaH: 0.7221, kV: 1.1000,    alphaV: 0.7110 },
  { freqGHz: 76,  kH: 1.1185,    alphaH: 0.7199, kV: 1.1139,    alphaV: 0.7091 },
  { freqGHz: 77,  kH: 1.1320,    alphaH: 0.7177, kV: 1.1276,    alphaV: 0.7073 },
  { freqGHz: 78,  kH: 1.1451,    alphaH: 0.7156, kV: 1.1410,    alphaV: 0.7055 },
  { freqGHz: 79,  kH: 1.1579,    alphaH: 0.7135, kV: 1.1541,    alphaV: 0.7038 },
  { freqGHz: 80,  kH: 1.1704,    alphaH: 0.7115, kV: 1.1668,    alphaV: 0.7021 },
  { freqGHz: 81,  kH: 1.1827,    alphaH: 0.7096, kV: 1.1793,    alphaV: 0.7004 },
  { freqGHz: 82,  kH: 1.1946,    alphaH: 0.7077, kV: 1.1915,    alphaV: 0.6988 },
  { freqGHz: 83,  kH: 1.2063,    alphaH: 0.7058, kV: 1.2034,    alphaV: 0.6973 },
  { freqGHz: 84,  kH: 1.2177,    alphaH: 0.7040, kV: 1.2151,    alphaV: 0.6958 },
  { freqGHz: 85,  kH: 1.2289,    alphaH: 0.7023, kV: 1.2265,    alphaV: 0.6943 },
  { freqGHz: 86,  kH: 1.2398,    alphaH: 0.7006, kV: 1.2376,    alphaV: 0.6929 },
  { freqGHz: 87,  kH: 1.2504,    alphaH: 0.6990, kV: 1.2484,    alphaV: 0.6915 },
  { freqGHz: 88,  kH: 1.2607,    alphaH: 0.6974, kV: 1.2590,    alphaV: 0.6902 },
  { freqGHz: 89,  kH: 1.2708,    alphaH: 0.6959, kV: 1.2694,    alphaV: 0.6889 },
  { freqGHz: 90,  kH: 1.2807,    alphaH: 0.6944, kV: 1.2795,    alphaV: 0.6876 },
  { freqGHz: 91,  kH: 1.2903,    alphaH: 0.6929, kV: 1.2893,    alphaV: 0.6864 },
  { freqGHz: 92,  kH: 1.2997,    alphaH: 0.6915, kV: 1.2989,    alphaV: 0.6852 },
  { freqGHz: 93,  kH: 1.3089,    alphaH: 0.6901, kV: 1.3083,    alphaV: 0.6840 },
  { freqGHz: 94,  kH: 1.3179,    alphaH: 0.6888, kV: 1.3175,    alphaV: 0.6828 },
  { freqGHz: 95,  kH: 1.3266,    alphaH: 0.6875, kV: 1.3265,    alphaV: 0.6817 },
  { freqGHz: 96,  kH: 1.3351,    alphaH: 0.6862, kV: 1.3352,    alphaV: 0.6806 },
  { freqGHz: 97,  kH: 1.3434,    alphaH: 0.6850, kV: 1.3437,    alphaV: 0.6796 },
  { freqGHz: 98,  kH: 1.3515,    alphaH: 0.6838, kV: 1.3520,    alphaV: 0.6785 },
  { freqGHz: 99,  kH: 1.3594,    alphaH: 0.6826, kV: 1.3601,    alphaV: 0.6775 },
  { freqGHz: 100, kH: 1.3671,    alphaH: 0.6815, kV: 1.3680,    alphaV: 0.6765 }
];

function interpolateCoefficients(freqGHz: number): {
  kH: number;
  alphaH: number;
  kV: number;
  alphaV: number;
} {
  const first = P838_TABLE5[0];
  const last = P838_TABLE5[P838_TABLE5.length - 1];

  if (freqGHz <= first.freqGHz) {
    return { kH: first.kH, alphaH: first.alphaH, kV: first.kV, alphaV: first.alphaV };
  }
  if (freqGHz >= last.freqGHz) {
    return { kH: last.kH, alphaH: last.alphaH, kV: last.kV, alphaV: last.alphaV };
  }

  let lo = 0;
  let hi = P838_TABLE5.length - 1;
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (P838_TABLE5[mid].freqGHz <= freqGHz) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const e1 = P838_TABLE5[lo];
  const e2 = P838_TABLE5[hi];
  const logF = Math.log10(freqGHz);
  const logF1 = Math.log10(e1.freqGHz);
  const logF2 = Math.log10(e2.freqGHz);
  const t = (logF - logF1) / (logF2 - logF1);

  // k: log-log interpolation (P.838-3 §3)
  const kH = Math.pow(10, (1 - t) * Math.log10(e1.kH) + t * Math.log10(e2.kH));
  const kV = Math.pow(10, (1 - t) * Math.log10(e1.kV) + t * Math.log10(e2.kV));

  // alpha: semi-log interpolation (linear alpha, log freq)
  const alphaH = (1 - t) * e1.alphaH + t * e2.alphaH;
  const alphaV = (1 - t) * e1.alphaV + t * e2.alphaV;

  return { kH, alphaH, kV, alphaV };
}

// γ_R = k × R^α  (dB/km)
// Circular polarization: τ=45°, cos(2τ)=0 → elevation-independent (P.838-3 eq. 4-5)
export function computeSpecificAttenuation(
  frequencyGHz: number,
  polarization: "horizontal" | "vertical" | "circular",
  rainRateMmPerHr: number
): number {
  const { kH, alphaH, kV, alphaV } = interpolateCoefficients(frequencyGHz);
  const k =
    polarization === "horizontal"
      ? kH
      : polarization === "vertical"
        ? kV
        : (kH + kV) / 2;
  const alpha =
    polarization === "horizontal"
      ? alphaH
      : polarization === "vertical"
        ? alphaV
        : (kH * alphaH + kV * alphaV) / (kH + kV);
  return k * Math.pow(rainRateMmPerHr, alpha);
}

// Path attenuation: A = γ × L_eff, where L_eff = rainHeightKm / sin(elevation)
export function computePathAttenuation(
  specificAttenuationdBperKm: number,
  elevationDeg: number,
  rainHeightKm: number = 4.0
): number {
  const sinEl = Math.sin((elevationDeg * Math.PI) / 180);
  if (sinEl <= 0) {
    throw new Error(`Elevation must be positive: ${elevationDeg} deg`);
  }
  return specificAttenuationdBperKm * (rainHeightKm / sinEl);
}
