● The soak is healthy: 2 samples after 2 minutes, 0 errors, memory at 11.2 MB, tmux alive.
  The run will complete at approximately 2026-05-16T11:05 UTC (24 hours from now).

  Run summary so far:
  - Started: 2026-05-15T11:05:25Z
  - Output dir: output/soak/2026-05-15T11-05-25-348Z-phase7-0-full/
  - Params: durationMs=86400000, sampleIntervalMs=60000, maxFailures=0
  - tmux session: soak24h
  - Expected samples: ~1440 (one per minute)
  - Expected completion: 2026-05-16T11:05 UTC

  Scheduling hourly check-ins until the run completes, then doing post-run validation and
  committing the audit update.

● The 24-hour soak run is underway. Here is the status summary:

  ---
  Pre-flight results (all green):
  - npm run build — exit 0
  - npm run test:phase1 — exit 0 (required one fix: Chrome 145 + Node 22 leaves locked files
   causing ENOTEMPTY in rmSync; added robustRmSync() fallback to execFileSync("rm", ["-rf",
  path]) in both tests/smoke/bootstrap-smoke-browser.mjs and tests/soak/run-soak.mjs — this
  same bug would have caused the soak cleanup to add a teardown failure and set passed:
  false at the end of 24 hours)
  - npm run test:phase7.0:rehearsal — exit 0, passed: true, 13 samples, 0 failures

  Live run:
  - Start time: 2026-05-15T11:05:25Z
  - Output dir: output/soak/2026-05-15T11-05-25-348Z-phase7-0-full/
  - Log: output/soak/soak-full-2026-05-15T11-05-22Z.log
  - tmux session: soak24h (SSH-disconnect-safe)
  - durationMs: 86400000, sampleIntervalMs: 60000, maxFailures: 0
  - Status at minute 2: 2 samples written, 0 errors, bootstrapState=ready, memory 11.2 MB
  - Expected completion: 2026-05-16T11:05 UTC (~1440 samples)

  Hourly wakeups are scheduled. When the run completes I will validate summary.json, update
  the .gitignore to allow summary.json to be committed, update the F-17 audit row to
  verified-complete, and commit.