#!/usr/bin/env node
// Regenerate the REPO artifacts derived from the demo scenario single source of
// truth (src/features/multi-station-selector/demo-scenario-config.json) and verify
// consistency. Run after editing that config (window / pinned TLE snapshots).
//
// What it does:
//   1. regen the golden SGP4 reference vectors (sample times come from the config)
//   2. regenerate + promote the selected-pair evidence package (tracked deliverable)
//   3. run the unit suite (incl. the config drift guard) + route-governance gate
//
// NOT done here, on purpose:
//   • slide decks — UNTRACKED presentation (not in the repo / on GitHub). They read
//     the config at build time, so rebuild on demand when presenting:
//     python3 scripts/build_requirement_presentation_v2.py
//   • pre-wave-2 comparison baseline (v4-projection-wave1-baselines.ts) — frozen by
//     design (see its header); regenerating it would zero the ?compare delta.
//
// Usage: node scripts/update-demo-scenario.mjs   (or: npm run update:demo)
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  SELECTED_PAIR_DEMO_START_UTC,
  SELECTED_PAIR_DEMO_END_UTC,
  SELECTED_PAIR_DEMO_DURATION_MINUTES,
  TLE_FIXTURE_PATHS
} from "./helpers/demo-scenario.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const skipped = [];

function run(label, cmd, args, { optional = false } = {}) {
  process.stdout.write(`\n▶ ${label}\n   $ ${cmd} ${args.join(" ")}\n`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit" });
  if (r.status === 0) {
    console.log(`   ✓ ${label}`);
    return true;
  }
  const msg = `${label} (exit ${r.status ?? r.signal})`;
  if (optional) {
    skipped.push(msg);
    console.warn(`   ⚠ optional step failed, continuing: ${msg}`);
    return false;
  }
  failures.push(msg);
  console.error(`   ✗ ${msg}`);
  return false;
}

function pythonWithSgp4() {
  for (const py of ["/tmp/sgp4venv/bin/python", "python3"]) {
    const probe = spawnSync(py, ["-c", "import sgp4"], { cwd: root });
    if (probe.status === 0) return py;
  }
  return null;
}

console.log("Demo scenario single source of truth:");
console.log(`  window  ${SELECTED_PAIR_DEMO_START_UTC} → ${SELECTED_PAIR_DEMO_END_UTC} (${SELECTED_PAIR_DEMO_DURATION_MINUTES} min)`);
console.log(`  LEO     ${TLE_FIXTURE_PATHS.LEO}`);
console.log(`  MEO     ${TLE_FIXTURE_PATHS.MEO}`);
console.log(`  GEO     ${TLE_FIXTURE_PATHS.GEO}`);

// 1. golden SGP4 vectors (sample times derived from config); best-effort on python+sgp4.
const py = pythonWithSgp4();
if (py) {
  run("regen golden SGP4 reference vectors", py, ["scripts/gen-sgp4-reference-vectors.py"]);
} else {
  console.warn(
    "\n⚠ no python with the `sgp4` package found (tried /tmp/sgp4venv/bin/python, python3)."
  );
  console.warn("  Skipping golden regen. Install sgp4 then run scripts/gen-sgp4-reference-vectors.py.");
}

// 2. regenerate + promote the selected-pair evidence package (HTML/CSV) — a TRACKED
// deliverable. Heavy (build + chromium); loud-skip if the browser is absent so the
// rest of the pipeline still completes.
run("regenerate + promote evidence package (headless)", "node", ["scripts/update-evidence.mjs"], { optional: true });

// 3. verify consistency.
run("unit suite (incl. demo-scenario drift guard)", "npm", ["run", "test:unit"]);
run("selected-pair route governance gate", "npm", ["run", "verify:selected-pair-route-governance"]);

console.log("\n──────────────────────────────");
if (skipped.length > 0) {
  console.warn(`⚠ ${skipped.length} optional step(s) skipped (e.g. missing chromium/build):`);
  for (const s of skipped) console.warn(`   - ${s}`);
  console.warn("  Re-run them when able (e.g. npm run update:demo:evidence).");
}
if (failures.length === 0) {
  console.log(`✓ demo scenario @ ${SELECTED_PAIR_DEMO_START_UTC} → ${SELECTED_PAIR_DEMO_END_UTC} (${SELECTED_PAIR_DEMO_DURATION_MINUTES} min) regenerated + verified.`);
  console.log("\nNot done by this pipeline, on purpose:");
  console.log("  • slide decks (UNTRACKED presentation) — rebuild on demand, they read the config:");
  console.log("    python3 scripts/build_requirement_presentation_v2.py");
  console.log("  • pre-wave-2 comparison baseline (frozen by design): v4-projection-wave1-baselines.ts");
  process.exit(0);
}
console.error(`✗ ${failures.length} required step(s) failed:`);
for (const f of failures) console.error(`   - ${f}`);
console.error("\nIf the drift guard failed: the config window moved but the golden vectors are stale");
console.error("— run python3 scripts/gen-sgp4-reference-vectors.py (or it ran above), then re-run.");
process.exit(1);
