# Demo reaction script — proving the viewer is live, not a recording

A spinning globe with moving satellites looks the same whether it is computed
live or pre-rendered. This short script gives an operator three scripted moments
where a viewer input visibly changes the output through a standard formula —
which a recording cannot do. (WS-A, paired with the report's sensitivity table
and the WS-G provenance popover.)

Canonical demo route:
`/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360`

## 1. Rain slider → attenuation and throughput move (the headline reaction)

1. Open the side panel and find the **Rain impact** row.
2. Drag the rain-rate slider from **0 → 50 mm/h**.
3. Watch, live:
   - the per-orbit throughput proxy drops (e.g. Ka/GEO falls the most — higher
     frequency attenuates harder per ITU-R P.618-14);
   - jitter rises;
   - if the fade is severe enough to break the elevation/visibility gate, the
     **comm-time** figure drops too.
4. Drag back to **0** and the values return to the clear-sky reference.

Why it proves liveness: the numbers are recomputed in the projection worker from
the ITU-R P.618-14 rain model on the new input. The **"↻ recomputed live HH:MM:SS"**
cue in the panel header re-pulses on each recompute — note the timestamp advances.

Honesty note for the operator: throughput is a **modeled capacity proxy (no
packet test)** and jitter is a modeled proxy — the slider demonstrates the model
reacting, not a measured rate.

## 2. Duration preset → the link plan re-derives

1. Switch the link-map duration **6h → 12h → 24h**.
2. The timeline, handover markers, and "next link plan" cards re-derive from a
   fresh worker projection over the new window (header cue re-pulses).

## 3. "How this was computed" → external reproducibility (WS-G)

1. Click **How this was computed** in the footer.
2. Show the full TLE → SGP4 → ECI → ECEF → geodetic chain for the best-geometry
   pass, computed by the app's own propagator.
3. Point out the **reference-vector exhibit**: the app's value vs an independent
   python-sgp4 reference, agreeing to a few centimetres. Copy the raw TLE and
   invite the skeptic to reproduce it at CelesTrak / with python-sgp4.
4. State the honest limit (the popover's banner): this proves the geometry chain
   only; the link-budget magnitudes stay modeled and the external gaps stay
   disclosed.

## What this does NOT prove

These reactions prove the geometry/timing and the standard models are computed
live and are reproducible. They do **not** turn the modeled link-budget numbers
into measured ones: packet-test latency/jitter/throughput, native RF handover,
real station RF hardware, measured-for-link weather, and external acceptance
thresholds remain disclosed gaps.
