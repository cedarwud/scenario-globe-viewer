# Ingest rehearsal samples — TEST DATA ONLY

Format samples for `verify:estnet`'s ingest-regression layer. These exercise
`external_trace_ingest.py` parsers; they are **never demo data** and must
never be placed under `public/fixtures/` or shown in any panel.

| file | provenance |
|---|---|
| `sample-ping.txt` | REAL `ping -D -c 8 -i 0.2 127.0.0.1` loopback capture on the dev host. A format sample (iputils output shape), not a satellite measurement of anything. |
| `sample-iperf3-udp.json` | SYNTHETIC, hand-authored to the `iperf3 --json` UDP shape (iperf3 not installed on the rehearsal host). Values arbitrary. |
| `sample-scavetool-single-flow.csv` | REAL `opp_scavetool export -F CSV-R` of the phase-1 flow vectors (cg[1] sink lifetime/seq/hops + cg[0] sentPk) from our own 6h-handover kit run — format-true tool output. `rcvdThroughput` intentionally excluded from the export filter for file size (216k-point series); real deliveries may include it and the parser reads it when present. |
| `make_mini_vec.py` | Builder for a SYNTHETIC reader-subset SQLite `.vec` with planted truth (12 packets, seq 7 lost, 493.9 ms) — lets the gate test the vec parser hermetically, without the ESTNeT kit and without committing a binary. |
