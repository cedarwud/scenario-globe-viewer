# F-18 Soak Handoff

This file is a self-contained runbook for an AI agent to execute the F-18 24h soak on this machine.

## Agent prompt (paste directly)

```
You are executing the F-18 24h stability soak for the scenario-globe-viewer project.
Working directory is this repo root. Do NOT push, amend, or commit anything.
Do NOT modify any source files. Read-only except for output/.

Your job:

STEP 1 — Prerequisites
Run: node --version && npm --version
Require: Node >= 18. If missing, stop and report.

STEP 2 — Install
Run: npm install
Must exit 0. If not, stop and report the error.

STEP 3 — Build check
Run: npm run build
Must exit 0. If not, stop and report.

STEP 4 — Rehearsal (quick sanity, ~5-10 min)
Run: npm run test:phase7.0:rehearsal
If exit non-0, stop and report full output. Do not proceed to full soak.

STEP 5 — Full soak (24h, DO NOT interrupt)
Run: npm run test:phase7.0:full
This will run for approximately 24 hours. Let it complete.
Do NOT kill the process. Do NOT let the machine sleep or lose power.

STEP 6 — Collect result
After exit, run:
  find output/soak -name "summary.json" | sort | tail -1
Read that file and extract:
  - passed (must be true)
  - failureCount (must be 0)
  - durationMs (must be >= 86400000)
  - timestamp or directory name

STEP 7 — Package for transport
Run:
  SOAK_DIR=$(find output/soak -maxdepth 1 -mindepth 1 -type d | sort | tail -1)
  tar -czf soak-result.tar.gz "$SOAK_DIR"
Report the filename and full path of soak-result.tar.gz.

STEP 8 — Final report
Report exactly:
  - SOAK_DIR path
  - summary.json contents (full JSON)
  - tar.gz path and size
  - Any warnings or anomalies observed during the run

Do not commit. Do not push. Do not modify any file outside output/soak/.
```

## After returning the result

Copy `soak-result.tar.gz` back to the original machine, extract into `output/soak/`,
then tell the Claude Code session: "F-18 soak complete, summary.json attached" and
paste the summary.json contents. The close-out doc will be written and committed there.
