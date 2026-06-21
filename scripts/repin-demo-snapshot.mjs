#!/usr/bin/env node
// RE-PIN the demo scenario to fresh TLE data.
//
// The demo geometry runs on PINNED TLE snapshots (demo-scenario-config.json ->
// tleSnapshots) so it stays reproducible + near-epoch. This command re-captures
// those snapshots from the current fresh catalog (public/fixtures/satellites-
// network/, kept fresh by `npm run update:tle`), moves the demo window to match,
// and regenerates every derived artifact via update:demo. It does NOT hit the
// network — it re-curates from the catalog already on disk.
//
// After re-pinning, the demo's geometry changes (new satellite positions), so
// the verify gates that bake in visibility/handover counts AND the pre-wave-2
// baselines may need re-baselining — this command flags that; review the numbers.
//
// Usage:
//   npm run repin:demo            # re-pin to the catalog's freshness, window = today 00:00Z
//   node scripts/repin-demo-snapshot.mjs --captured-at 2026-06-13T00:00:00.000Z
//   node scripts/repin-demo-snapshot.mjs --dry-run     # print the plan, change nothing
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = join(root, "public/fixtures/satellites-network");
const CONFIG = join(root, "src/features/multi-station-selector/demo-scenario-config.json");
const LEO_CAP = 600; // matches the demo's historical OneWeb subset size

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1]
    : fallback;
}
const dryRun = process.argv.includes("--dry-run");
const capturedAt = arg("captured-at", new Date().toISOString());
if (!Number.isFinite(Date.parse(capturedAt))) {
  console.error(`✗ --captured-at must be ISO 8601, got: ${capturedAt}`);
  process.exit(1);
}
const fts = capturedAt.replace(/:/g, "-").replace(/\.\d{3}Z$/u, "Z");
const windowStartUtc = `${capturedAt.slice(0, 10)}T00:00:00.000Z`;

const leoSrc = join(CATALOG, "leo-latest.tle");
const meoSrc = join(CATALOG, "meo-latest.tle");
const geoSrc = join(CATALOG, "geo-latest.tle");
for (const [label, p] of [["LEO", leoSrc], ["MEO", meoSrc], ["GEO", geoSrc]]) {
  if (!existsSync(p)) {
    console.error(`✗ catalog source missing: ${p}\n  Run \`npm run update:tle\` first to fetch the fresh catalog.`);
    process.exit(1);
  }
}

const newSnapshots = {
  LEO: `/fixtures/satellites/leo-scale/oneweb-${fts}.tle`,
  MEO: `/fixtures/satellites/multi-orbit/meo/galileo-${fts}.tle`,
  GEO: `/fixtures/satellites/multi-orbit/geo/commercial-geo-${fts}.tle`
};

console.log("RE-PIN demo scenario");
console.log(`  captured-at  ${capturedAt}`);
console.log(`  window       ${windowStartUtc} (+ duration from config)`);
console.log("  new snapshots:");
for (const k of ["LEO", "MEO", "GEO"]) console.log(`    ${k}  ${newSnapshots[k]}`);

if (dryRun) {
  console.log("\n(dry-run) nothing written. Re-run without --dry-run to apply.");
  process.exit(0);
}

function run(label, cmd, args) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`✗ ${label} failed (exit ${r.status ?? r.signal})`);
    process.exit(r.status ?? 1);
  }
}

// 1. re-curate the pinned snapshots from the fresh catalog (local, no network).
// build-f13 names its output by whether the input PATH contains "oneweb"; the
// catalog file (leo-latest.tle) does not, so copy it to a temp oneweb-named file.
const leoOneWebSrc = join(tmpdir(), `oneweb-src-${fts}.tle`);
copyFileSync(leoSrc, leoOneWebSrc);
run("curate LEO (OneWeb subset)", "node", [
  "scripts/build-f13-leo-scale-fixture.mjs",
  "--input", leoOneWebSrc, "--cap", String(LEO_CAP), "--captured-at", capturedAt
]);
rmSync(leoOneWebSrc, { force: true });
// build-v4.13 dedups [gps-MEO, galileo-MEO] by NORAD (gps wins), so the gps-ops
// filler MUST contain 0 MEO sats or it would steal the galileo records. leo-latest
// (OneWeb, all LEO) filters to 0 MEO -> galileo survives intact; its gps-ops output
// is empty and unused by the demo.
run("curate MEO galileo + GEO (full commercial subset)", "node", [
  "scripts/build-v4.13-multi-orbit-fixture.mjs",
  "--gps-ops-input", leoSrc, "--galileo-input", meoSrc, "--geo-input", geoSrc,
  "--captured-at", capturedAt, "--geo-cap", "all"
]);

// 2. patch the single source of truth to point at the new snapshots + window.
const cfg = JSON.parse(readFileSync(CONFIG, "utf8"));
cfg.windowStartUtc = windowStartUtc;
cfg.tleSnapshots = { ...cfg.tleSnapshots, ...newSnapshots };
if (cfg.provenance) {
  cfg.provenance.note =
    `Re-pinned ${capturedAt} from the fresh catalog (public/fixtures/satellites-network/). ` +
    `Window sits a few days after each snapshot's TLE epoch (near-epoch SGP4). These pinned ` +
    `snapshots ARE the default runtime + delivery geometry: loadDefaultTleSources resolves ` +
    `local-snapshot unless ?tleSource=network is set. The refreshed CelesTrak catalog proves ` +
    `fresh-data capability and feeds the scene only under that explicit opt-in, never by default.`;
}
writeFileSync(CONFIG, `${JSON.stringify(cfg, null, 2)}\n`);
console.log(`\n✓ patched ${CONFIG.replace(root + "/", "")} (window + tleSnapshots)`);

// 3. regenerate every derived artifact + verify.
run("regenerate derived artifacts", "npm", ["run", "update:demo"]);

console.log("\n──────────────────────────────");
console.log(`✓ demo re-pinned to ${windowStartUtc}.`);
console.log("\n⚠ Geometry changed — REVIEW these (re-baseline if needed):");
console.log("  • verify gates with baked visibility/handover counts: npm run verify:tle (+ G3/G4)");
console.log("  • pre-wave-2 comparison baseline: v4-projection-wave1-baselines.ts (frozen; update only if intended)");
console.log("  • rebuild slide decks on demand: python3 scripts/build_requirement_presentation_v2.py");
