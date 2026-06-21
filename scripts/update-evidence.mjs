#!/usr/bin/env node
// Regenerate the selected-pair evidence package (HTML + CSV) for the CURRENT demo
// scenario and promote it into the retained deliverable; then resync the manifest
// integrity metadata (files[] sizes/hashes + projectionRoute) from the on-disk
// package.
//
// The existing headless generator (`npm run test:m8a-v4.11:slice5`) computes the
// projection for the demo pair/window and writes the report into a scratch dir
// (output/selected-pair-source-report/). This wrapper runs it, copies the fresh
// report into deliverable/selected-pair-source-evidence/, prunes the stale-window
// report files, and resyncs the evidence manifest. Filenames encode the window, so
// changing demo-scenario-config.json changes them — old ones are removed here.
//
// Modes:
//   (default)        full regen — needs app build + chromium (slice5's deps).
//   --metadata-only  skip regeneration; ONLY resync the manifest files[] sizes/
//                    hashes + projectionRoute from whatever is on disk. Use to
//                    repair manifest drift when the HTML/CSV are already current
//                    (no chromium needed); HTML/CSV content is left untouched.
//
// Use: npm run update:demo:evidence            (full regen)
//      node scripts/update-evidence.mjs --metadata-only
import { spawnSync } from "node:child_process";
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  rmSync,
  existsSync,
  statSync
} from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  SELECTED_PAIR_DEMO_START_UTC,
  SELECTED_PAIR_DEMO_END_UTC,
  SELECTED_PAIR_DEMO_REQUEST_PATH
} from "./helpers/demo-scenario.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRATCH = join(root, "output/selected-pair-source-report");
const DELIVERABLE = join(root, "deliverable/selected-pair-source-evidence");
const metadataOnly = process.argv.includes("--metadata-only");

const isReport = (f) =>
  /^runtime-projection-evidence-.*\.html$/.test(f) || /^runtime-projection-.*\.csv$/.test(f);

if (!metadataOnly) {
  // 0. clear stale report files from the scratch dir so only this run's window survives.
  if (existsSync(SCRATCH)) {
    for (const f of readdirSync(SCRATCH).filter(isReport)) rmSync(join(SCRATCH, f));
  }

  // 1. run the headless generator (build + slice5).
  console.log("▶ generating evidence report (npm run test:m8a-v4.11:slice5) …");
  const r = spawnSync("npm", ["run", "test:m8a-v4.11:slice5"], { cwd: root, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`✗ evidence generator failed (exit ${r.status ?? r.signal}).`);
    process.exit(r.status ?? 1);
  }

  // 2. locate the freshly written report files.
  if (!existsSync(SCRATCH)) {
    console.error(`✗ scratch report dir missing: ${SCRATCH}`);
    process.exit(1);
  }
  const fresh = readdirSync(SCRATCH).filter(isReport);
  if (fresh.length < 2) {
    console.error(`✗ expected >=2 report files in ${SCRATCH}, found ${fresh.length}: ${fresh.join(", ")}`);
    process.exit(1);
  }

  // 3. prune stale-window report files in the deliverable, then promote the fresh ones.
  for (const f of readdirSync(DELIVERABLE).filter(isReport)) {
    if (!fresh.includes(f)) {
      rmSync(join(DELIVERABLE, f));
      console.log(`   removed stale ${f}`);
    }
  }
  for (const f of fresh) {
    copyFileSync(join(SCRATCH, f), join(DELIVERABLE, f));
    console.log(`   promoted ${f}`);
  }

  // Also refresh the retained smoke-manifest copy. Its body embeds the window-
  // named report filenames plus the actor/visibility row counts; update-evidence
  // used to leave it stale (a 05-17/network smoke manifest survived the 06-15
  // re-pin) because isReport() only matches the HTML/CSV report files.
  const scratchSmoke = join(SCRATCH, "smoke-manifest.json");
  if (existsSync(scratchSmoke)) {
    copyFileSync(scratchSmoke, join(DELIVERABLE, "smoke-manifest.output.json"));
    console.log("   promoted smoke-manifest.output.json");
  }
}

// 4. Resync the evidence manifest integrity metadata from the on-disk package:
//    re-derive every files[] entry's path (window-named report files), sizeBytes,
//    and sha256, drop entries whose file no longer exists, and pin projectionRoute
//    to the configured demo window. This is what keeps the manifest honest after a
//    re-pin; the previous version only stamped generatedAt/note, which let the
//    files[] sizes/hashes and the route go stale (a 05-17 manifest survived the
//    06-15 re-pin). tests/unit/demo-scenario-config-drift.test.mjs guards it.
const REPORT_HTML_ROLE = "readable evidence report";
const REPORT_CSV_ROLE = "row-level CSV export";
const manifestPath = join(DELIVERABLE, "evidence-manifest.json");
if (existsSync(manifestPath)) {
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));

  const onDisk = readdirSync(DELIVERABLE);
  const htmlReport = onDisk.find((f) => /^runtime-projection-evidence-.*\.html$/.test(f));
  const csvReport = onDisk.find((f) => /^runtime-projection-(?!evidence-).*\.csv$/.test(f));

  const fileMeta = (name) => {
    const abs = join(DELIVERABLE, name);
    return { sizeBytes: statSync(abs).size, sha256: createHash("sha256").update(readFileSync(abs)).digest("hex") };
  };

  const rebuilt = [];
  for (const entry of m.files ?? []) {
    let path = entry.path;
    if (entry.role === REPORT_HTML_ROLE && htmlReport) path = htmlReport;
    else if (entry.role === REPORT_CSV_ROLE && csvReport) path = csvReport;
    if (!existsSync(join(DELIVERABLE, path))) {
      console.warn(`   ! dropping manifest entry for missing file: ${path}`);
      continue;
    }
    rebuilt.push({ ...entry, path, ...fileMeta(path) });
  }
  m.files = rebuilt;
  m.projectionRoute = SELECTED_PAIR_DEMO_REQUEST_PATH;

  if (metadataOnly) {
    m.regenerationNote =
      `Evidence manifest integrity metadata (files[] sizes/sha256 + projectionRoute) resynced from ` +
      `the on-disk package by scripts/update-evidence.mjs --metadata-only for the demo window ` +
      `${SELECTED_PAIR_DEMO_START_UTC} → ${SELECTED_PAIR_DEMO_END_UTC}. HTML/CSV content unchanged.`;
  } else {
    m.generatedAtUtc = new Date().toISOString();
    m.regenerationNote =
      `Evidence HTML/CSV regenerated by scripts/update-evidence.mjs (npm run test:m8a-v4.11:slice5) ` +
      `for the demo window ${SELECTED_PAIR_DEMO_START_UTC} → ${SELECTED_PAIR_DEMO_END_UTC}. ` +
      `Projection numbers follow demo-scenario-config.json.`;
  }
  writeFileSync(manifestPath, `${JSON.stringify(m, null, 2)}\n`);
  console.log(`   resynced evidence-manifest.json (${m.files.length} files)`);
}

console.log(
  metadataOnly
    ? `✓ evidence manifest metadata resynced for ${SELECTED_PAIR_DEMO_START_UTC} → ${SELECTED_PAIR_DEMO_END_UTC}.`
    : `✓ evidence package regenerated + promoted for ${SELECTED_PAIR_DEMO_START_UTC} → ${SELECTED_PAIR_DEMO_END_UTC}.`
);
