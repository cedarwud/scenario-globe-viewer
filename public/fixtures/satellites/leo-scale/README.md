# F-13 LEO-Scale Fixture

This directory contains the repo-copied public TLE fixture for the F-13 LEO
leg only.

Current fixture:

- Source: Celestrak Starlink GP/TLE export
- URL: `https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle`
- Copied subset: deterministic first 600 records sorted by NORAD catalog id
- Runtime mode: `leo-scale-points`

Refresh procedure:

```bash
curl -L "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle" \
  -o /tmp/sgv-celestrak-starlink.tle
node scripts/build-f13-leo-scale-fixture.mjs \
  --input /tmp/sgv-celestrak-starlink.tle \
  --cap 600 \
  --captured-at "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

After refreshing, rerun the Phase 7.1 LEO validation profile and update the
close-out evidence note. This fixture is not ITRI authority data, live network
truth, active satellite path truth, or measured throughput/latency/jitter truth.
