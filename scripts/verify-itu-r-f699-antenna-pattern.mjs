/**
 * Verify ITU-R F.699-8 antenna pattern implementation.
 *
 * Reference values from: Rec. ITU-R F.699-8, Appendix
 * https://www.itu.int/rec/R-REC-F.699
 *
 * Case 1 — D=1m, f=12GHz, λ=0.025m → D/λ=40, η=0.6:
 *   G_max ≈ 39.2 dBi  (tolerance ±1 dB)
 *
 * Case 2 — same antenna, φ=5°:
 *   φ_m ≈ 2.0°, 100λ/D ≈ 2.5° → φ=5° is in far-sidelobe region
 *   G(5°) = 52 - 10·log10(40) - 25·log10(5) ≈ 18.5 dBi  (tolerance ±3 dB)
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const moduleUrl = new URL(
  "../src/features/itu-r-physics/itu-r-f699-antenna-pattern.ts",
  import.meta.url
);

function transpile(source, fileName) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    },
    fileName
  }).outputText;
}

const source = await readFile(moduleUrl, "utf8");
const tempDir = await mkdtemp(join(tmpdir(), "sgv-f699-"));

try {
  await writeFile(
    join(tempDir, "itu-r-f699-antenna-pattern.mjs"),
    transpile(source, "itu-r-f699-antenna-pattern.ts")
  );

  const { computeAntennaGain } = await import(
    pathToFileURL(join(tempDir, "itu-r-f699-antenna-pattern.mjs")).href
  );

  const cases = [
    {
      params: { diameterM: 1, frequencyGHz: 12, offAxisDeg: 0, apertureEfficiency: 0.6 },
      expected: 39.2,
      toleranceDb: 1.0,
      label: "D=1m f=12GHz η=0.6 boresight (G_max)"
    },
    {
      params: { diameterM: 1, frequencyGHz: 12, offAxisDeg: 5, apertureEfficiency: 0.6 },
      expected: 18.0,
      toleranceDb: 3.0,
      label: "D=1m f=12GHz η=0.6 φ=5° (far-sidelobe rolloff)"
    },
    {
      params: { diameterM: 0.9, frequencyGHz: 1.5, offAxisDeg: 0, apertureEfficiency: 0.6 },
      expected: 20.79,
      toleranceDb: 1.0,
      label: "D=0.9m f=1.5GHz η=0.6 boresight (small terminal G_max)"
    },
    {
      params: { diameterM: 2.4, frequencyGHz: 12, offAxisDeg: 0, apertureEfficiency: 0.6 },
      expected: 47.37,
      toleranceDb: 1.0,
      label: "D=2.4m f=12GHz η=0.6 boresight (medium terminal G_max)"
    }
  ];

  let allPass = true;

  for (const c of cases) {
    const computed = computeAntennaGain(c.params);
    const deviationDb = Math.abs(computed - c.expected);
    const pass = deviationDb <= c.toleranceDb;

    if (!pass) allPass = false;

    const status = pass ? "PASS" : "FAIL";
    console.log(
      `[${status}] ${c.label}: computed=${computed.toFixed(2)} dBi, ` +
        `expected=${c.expected} dBi, deviation=${deviationDb.toFixed(2)} dB ` +
        `(tolerance ±${c.toleranceDb} dB)`
    );
  }

  // Verify monotonic decrease: G(0) > G(1) > G(30) for D=1m f=12GHz
  const g0 = computeAntennaGain({ diameterM: 1, frequencyGHz: 12, offAxisDeg: 0 });
  const g1 = computeAntennaGain({ diameterM: 1, frequencyGHz: 12, offAxisDeg: 1 });
  const g30 = computeAntennaGain({ diameterM: 1, frequencyGHz: 12, offAxisDeg: 30 });
  const monotonic = g0 > g1 && g1 > g30;

  if (!monotonic) allPass = false;
  console.log(
    `[${monotonic ? "PASS" : "FAIL"}] Monotonic decrease G(0°)=${g0.toFixed(2)} > G(1°)=${g1.toFixed(2)} > G(30°)=${g30.toFixed(2)} dBi`
  );

  if (allPass) {
    console.log("\nAll F.699 reference checks passed. ✓");
    process.exit(0);
  } else {
    console.error("\nFAIL: One or more F.699 reference checks outside tolerance.");
    process.exit(1);
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
