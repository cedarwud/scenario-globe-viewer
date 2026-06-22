# Hand-authored contact plan for the CHT x SANSA GEO<->MEO handover.
# Format (ContactPlanReader.cc): 6 whitespace columns, times in sim-seconds
# relative to t=0 (= 2026-06-15T00:30:00Z); source=GS, sink=satellite so the
# ground station is registered as a tracker of that satellite.
#   col1 start(s)  col2 end(s)  col3 source(GS)  col4 sink(sat)  col5 rate(bps)  col6 range(lightsec)
# Per-GS contacts are NON-OVERLAPPING so the antenna actually re-points:
#   GEO(node1)  t[0,1170]      -> CHT tracks GEO
#   MEO(node2)  t[1170,3600]   -> CHT re-points to MEO (Galileo mutual-vis window)
#   GEO(node1)  t[3600,4500]   -> CHT re-points back to GEO
# Columns 5/6 (rate/range) are recorded on the contact but do NOT gate blind
# unicast routing; they are plausible placeholders.
# Satellites: 1 - 2
# Ground Stations: 3 - 4
# sim-time-limit: 4500
# start    end  source  sink  rate  range
      0   1170       3     1  9600      0
   1170   3600       3     2  9600      0
   3600   4500       3     1  9600      0
      0   1170       4     1  9600      0
   1170   3600       4     2  9600      0
   3600   4500       4     1  9600      0
