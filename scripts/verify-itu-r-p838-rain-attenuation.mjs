/**
 * Verify ITU-R P.838-3 specific attenuation formula implementation.
 *
 * Reference values from: Rec. ITU-R P.838-3 (March 2005), Table 5
 * https://www.itu.int/rec/R-REC-P.838
 * Formula: γ_R = k × R^α  (dB/km), with k and α from Table 5.
 *
 * Reference cases (P.838-3 Table 5, direct lookup — no interpolation needed):
 *   10 GHz H-pol: k_H=0.01217, α_H=1.2571 → γ(R=25) = 0.6961 dB/km
 *   20 GHz H-pol: k_H=0.09164, α_H=1.0568 → γ(R=25) = 2.7506 dB/km
 *   30 GHz H-pol: k_H=0.2403,  α_H=0.9485 → γ(R=50) = 9.8226 dB/km
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const moduleUrl = new URL(
  "../src/features/itu-r-physics/itu-r-p838-rain-attenuation.ts",
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
const tempDir = await mkdtemp(join(tmpdir(), "sgv-p838-"));

try {
  await writeFile(
    join(tempDir, "itu-r-p838-rain-attenuation.mjs"),
    transpile(source, "itu-r-p838-rain-attenuation.ts")
  );

  const { computeSpecificAttenuation } = await import(
    pathToFileURL(join(tempDir, "itu-r-p838-rain-attenuation.mjs")).href
  );

  // Reference cases from P.838-3 Table 5 (direct lookup, no interpolation).
  const cases = [
    {
      freqGHz: 10,
      polarization: "horizontal",
      rainRateMmPerHr: 25,
      expected: 0.696,
      tolerancePct: 5,
      label: "10 GHz H-pol R=25 mm/hr"
    },
    {
      freqGHz: 20,
      polarization: "horizontal",
      rainRateMmPerHr: 25,
      expected: 2.75,
      tolerancePct: 5,
      label: "20 GHz H-pol R=25 mm/hr"
    },
    {
      freqGHz: 30,
      polarization: "horizontal",
      rainRateMmPerHr: 50,
      expected: 9.82,
      tolerancePct: 5,
      label: "30 GHz H-pol R=50 mm/hr"
    }
  ];

  let allPass = true;

  for (const c of cases) {
    const computed = computeSpecificAttenuation(c.freqGHz, c.polarization, c.rainRateMmPerHr);
    const deviationPct = Math.abs((computed - c.expected) / c.expected) * 100;
    const pass = deviationPct <= c.tolerancePct;

    if (!pass) allPass = false;

    const status = pass ? "PASS" : "FAIL";
    console.log(
      `[${status}] ${c.label}: computed=${computed.toFixed(4)} dB/km, ` +
        `expected=${c.expected} dB/km, deviation=${deviationPct.toFixed(1)}% ` +
        `(tolerance ±${c.tolerancePct}%)`
    );
  }

  if (allPass) {
    console.log("\nAll reference values within tolerance. ✓");
    process.exit(0);
  } else {
    console.error("\nFAIL: One or more reference values outside tolerance.");
    process.exit(1);
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
