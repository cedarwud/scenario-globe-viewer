#!/usr/bin/env node
// Friendly wrapper around refresh-tle.mjs: runs the catalog refresh, then prints
// a human summary (refreshed vs already-fresh + each orbit's latest TLE epoch)
// read back from the written manifest. Use: npm run update:tle
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const r = spawnSync(
  "node",
  [
    "scripts/refresh-tle.mjs",
    "--if-older-than-days",
    "7",
    "--min-refresh-interval-hours",
    "2",
    ...process.argv.slice(2)
  ],
  { cwd: root, encoding: "utf8" }
);
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
if (r.status !== 0) process.exit(r.status ?? 1);

let status = "refreshed";
try {
  const parsed = JSON.parse(r.stdout);
  if (parsed && typeof parsed.status === "string") status = parsed.status;
} catch {
  /* refresh-tle printed a non-status payload (actual refresh) */
}

const short = (iso) => (typeof iso === "string" ? `${iso.slice(0, 16).replace("T", " ")}Z` : "?");
const manifest = JSON.parse(
  readFileSync(join(root, "public/fixtures/satellites-network/manifest.json"), "utf8")
);

console.log("\n──────────────────────────────");
console.log(`✓ TLE catalog — ${status === "noop" ? "already fresh, skipped refresh" : "refreshed"}`);
for (const g of ["leo", "meo", "geo"]) {
  const e = manifest[g] ?? {};
  console.log(
    `   ${g.toUpperCase()}  ${String(e.recordCount ?? "?").padStart(4)} sats · latest epoch ${short(e.latestTleEpochUtc)}`
  );
}
console.log(`   manifest generatedAt ${short(manifest.generatedAtUtc)}`);
console.log("   (catalog freshness proof — NOT the demo scenario; run update:demo for that)");
