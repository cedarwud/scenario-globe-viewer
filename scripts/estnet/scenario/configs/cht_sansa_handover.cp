# Hand-authored contact plan for the CHT x SANSA full-6h GEO<->MEO handover.
# Format (ContactPlanReader.cc): 6 whitespace columns, times in sim-seconds
# relative to t=0 (= 2026-06-15T00:00:00Z); source=GS, sink=satellite so the
# ground station is registered as a tracker of that satellite.
#   col1 start(s)  col2 end(s)  col3 source(GS)  col4 sink(sat)  col5 rate(bps)  col6 range(lightsec)
# Per-GS contacts are NON-OVERLAPPING so the antenna actually re-points. The six
# serving phases (matching the viewer's demo-balanced-v1 timeline) are:
#   GEO APSTAR-7(1)   0..2970      phase 1
#   MEO GSAT0102(2)   2970..5400   phase 2 (mutual-vis 00:49:30..01:30:00Z)
#   GEO APSTAR-7(1)   5400..11310  phase 3
#   MEO GSAT0232(3)   11310..13620 phase 4 (mutual-vis 03:08:30..03:47:00Z)
#   GEO APSTAR-7(1)   13620..21180 phase 5
#   MEO GSAT0209(4)   21180..21600 phase 6 (mutual-vis 05:53:00..06:00:00Z)
# Columns 5/6 (rate/range) are recorded on the contact but do NOT gate blind
# unicast routing; they are plausible placeholders.
# Satellites: 1 - 4
# Ground Stations: 5 - 6
# sim-time-limit: 21600
# start    end  source  sink  rate  range
      0   2970       5     1  9600      0
   2970   5400       5     2  9600      0
   5400  11310       5     1  9600      0
  11310  13620       5     3  9600      0
  13620  21180       5     1  9600      0
  21180  21600       5     4  9600      0
      0   2970       6     1  9600      0
   2970   5400       6     2  9600      0
   5400  11310       6     1  9600      0
  11310  13620       6     3  9600      0
  13620  21180       6     1  9600      0
  21180  21600       6     4  9600      0
