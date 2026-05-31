# Multi-Station Selector - TH5 Orbit Source Policy Gate

Status: gate recorded; refresh guardrail follow-up implemented 2026-05-27.
Decision date: 2026-05-21.

## Decision

TH5 parser, manifest, and runtime-provenance readiness is complete enough for
planning. Recent commits landed the OMM-capable parser metadata, manifest
schema hardening, runtime propagation bridge, and provenance coverage:
`b14f777`, `3aacf31`, `62de863`, and `1e50f1a`.

This slice does not authorize a runtime source switch, a default-source switch,
or any live browser/runtime fetch. The current CelesTrak refreshed artifact
remains the default for repo-bundled and demo use. Future work may prefer
OMM-capable formats, but only after runtime smoke, CSV, D6, and Row 5/6
disclosures are deliberately updated in the same implementation slice.

The 2026-05-27 follow-up adds an opt-in refresh command only. It preserves the
repo-bundled artifact model and adds local age checks so routine development
does not repeatedly call upstream GP endpoints.

## Official Source Facts

Verified on 2026-05-21 from current official pages:

- CelesTrak Usage Policy, 2026 May 15:
  https://celestrak.org/usage-policy.php
  The policy asks users to download only needed data, only once per update;
  GP data is treated as a 2-hour update cadence; machine-to-machine clients
  must stop and report when HTTP error responses occur. CelesTrak remains
  freely available but enforces resource limits.
- CelesTrak GP data formats, updated 2026 May 09:
  https://celestrak.org/NORAD/documentation/gp-data-formats.php
  GP queries use `gp.php?{QUERY}=VALUE[&FORMAT=VALUE]` and support TLE/3LE,
  2LE, XML, KVN, JSON, JSON-PRETTY, and CSV. XML/KVN are OMM standard formats;
  JSON/CSV use OMM keywords. CelesTrak recommends OMM XML for critical
  compatibility; JSON/CSV are useful but may evolve.
- Space-Track documentation:
  https://www.space-track.org/documentation
  Space-Track throttles API use below 30 requests/minute and 300
  requests/hour, lists GP retrieval at once/hour, says GP_HISTORY is not for
  current ephemerides, and encourages extensible formats such as XML, KVN,
  JSON, and CSV when fixed-width TLE limits matter.
- USSPACECOM Orbital Data Request form:
  https://www.space-track.org/documents/USSPACECOM_ODR.pdf
  The form requires requesters to identify who will access requested data and,
  for redistribution requests, the redistribution purpose. This supports a
  gate requirement; it is not blanket permission to commit or redistribute
  Space-Track-derived artifacts.

## Current Source Policy

- Keep the current CelesTrak refreshed artifact as the repo-bundled/demo
  default.
- Prefer OMM-capable formats for future-proofing, because fixed-width TLE/3LE
  has catalog-number limits and official sources now document extensible GP
  formats.
- Do not switch the default source or default format until the runtime
  disclosure path, CSV export, D6 smoke, and Row 5/6 source language are
  updated together.
- Keep CelesTrak and Space-Track network access out of the browser/runtime
  path unless a later implementation slice explicitly authorizes it.
- Run TLE refresh as an explicit artifact-maintenance action. The repository
  command is `npm run refresh:tle`, which wraps `scripts/refresh-tle.mjs` with
  `--if-older-than-days 7 --min-refresh-interval-hours 2`.
- Do not call the refresh command from browser/runtime code, `npm run build`,
  smoke tests, or every local app start. Those paths must keep reading bundled
  snapshots and manifest health only.
- Treat any Space-Track direct GP/OMM ingestion as gated by account review,
  user-agreement review, throttle compliance, redistribution/storage policy,
  and an acquisition flow that keeps private credentials outside git and
  outside generated artifacts.
- Do not commit Space-Track-derived artifacts unless redistribution and
  storage permission is verified and recorded. If permission is not recorded,
  generate such artifacts locally outside git and treat them as uncommitted
  operator-side cache.
- Stop automated upstream refresh on HTTP errors or throttle responses; do not
  retry in a loop.

## Gate Checklist

Before any future default-source or official-source migration, record:

| Gate | Required closure |
| --- | --- |
| Source authority | Which upstream source is used, which product/class/query supplies each orbit, and whether the result is `official-public`, `open-public`, or local fallback. |
| Access credentials and private values | Account owner, agreement review evidence, local acquisition path, and proof that credentials/private values are not committed or exposed to runtime. |
| Redistribution/storage | Whether generated artifacts may be committed; if yes, record permission evidence and attribution; if no, keep outputs outside git. |
| Refresh cadence/cache | Upstream cadence, local cache TTL, retry/stop behavior, and compliance with CelesTrak or Space-Track rate limits. |
| Manifest fields | `format`, `apiClass`, `sourcePolicy`, `catalogNumberCompatibility`, query/group/class, generated time, epoch range, record count, health, and attribution. |
| Runtime disclosure/CSV/D6/smoke | Row 5/6 text, CSV columns, D6 assertions, G1 coverage if semantics change, and information-density smoke if visible copy changes. |
| Fallback behavior | Deterministic local fallback, stale/malformed manifest behavior, parser failure reason, and no mid-session source-mode flip unless explicitly designed. |

## Decision Table

| Path | Role | Status now | Future gate |
| --- | --- | --- | --- |
| CelesTrak current default | Repo-bundled/demo default using refreshed artifact and existing deterministic fallback. | Keep. No source switch authorized by this slice. | Reconfirm usage-policy cadence, attribution, manifest health, and offline smoke whenever refresh tooling changes. |
| CelesTrak OMM-capable path | Preferred future-proof public path for GP formats that avoid fixed-width TLE limits. | Parser/manifest/runtime-provenance readiness exists, but default format is not switched here. | Update runtime disclosures, CSV, D6, Row 5/6, and catalog-number compatibility smoke in one implementation slice. |
| Space-Track direct path | Possible official-public acquisition path for GP/OMM. | Blocked/gated. No direct fetch and no committed derived artifact by this slice. | Account/user-agreement review, throttle compliance, redistribution/storage permission, no private credentials in git, and no live runtime fetch unless later authorized. |
| Current repo behavior | Offline-safe runtime chooses bundled/default artifacts and generated manifests; browser runtime does not call upstream orbit-data services. | Preserve. | Any source semantics change must include build, unit, D6, and visible-disclosure smokes. |

## Future Implementation Tests

For refresh-command guardrail changes or any later implementation slice that
changes source behavior, run at least:

```bash
npm run build
npm run refresh:tle -- --reference-utc=<recent-utc> --dry-run
npx tsx --test tests/unit/orbit-source-parser.test.mjs tests/unit/runtime-tle-manifest-compat.test.mjs
node scripts/verify-tle-first-data-completeness.mjs --port=<port>
```

If visible source semantics, Row 5/6 copy, or requirement coverage changes,
also run:

```bash
node scripts/verify-g1-bucket-a-coverage.mjs --port=<port>
node scripts/verify-information-density.mjs --port=<port>
```

## Block Conditions

Stop any future source migration if any condition is true:

- Account or user-agreement review is missing for Space-Track direct use.
- Rate-limit behavior or cache cadence is not documented.
- Redistribution/storage permission for committed artifacts is not recorded.
- Any generated artifact contains private credentials or account-specific
  values.
- Runtime or browser code performs live upstream fetches without explicit
  later authorization.
- Row 5/6, CSV, D6, and smoke expectations do not match the new source
  semantics.
- Local fallback no longer remains deterministic.

This document records the TH5 residual source-policy gate. It does not
authorize fixture data, parser, runtime, test, or default-source changes beyond
the 2026-05-27 opt-in refresh-command guardrails.
