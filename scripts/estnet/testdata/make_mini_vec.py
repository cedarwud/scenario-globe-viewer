#!/usr/bin/env python3
"""
Build a tiny SYNTHETIC OMNeT++-style SQLite .vec for parser regression tests.

This is a reader-compatible SUBSET of the real OMNeT++ SQLite result schema —
only the tables/columns the ingest adapters actually query (run.simtimeExp,
vector.moduleName/vectorName/vectorId, vectordata simtimeRaw/value/eventNumber).
It is NOT a full OMNeT++ result file and must never be presented as simulator
output; it exists so `verify:estnet` can exercise the vec-single parser
hermetically (no ESTNeT kit required).

Planted truth (asserted by the gate):
  12 packets, seq 0..11, sent every 10 s from t=5 s, one-way latency 493.9 ms,
  seq 7 LOST (never received)  ->  11/12 delivered, loss 1/12.

Usage: python3 make_mini_vec.py <out.vec>
"""
import sqlite3
import sys

SIMTIME_EXP = -12  # raw simtime unit = 1e-12 s, like the real ESTNeT results
SENDER = "SpaceTerrestrialNetwork.cg[0].networkHost.appWrapper[0].app"
SINK = "SpaceTerrestrialNetwork.cg[1].networkHost.appWrapper[0].app"
N_PACKETS = 12
LOST_SEQ = 7
SEND_START_S = 5.0
SEND_INTERVAL_S = 10.0
LATENCY_S = 0.4939
THROUGHPUT_BPS = 8720.0


def raw(t_seconds):
    return int(round(t_seconds / 10.0 ** SIMTIME_EXP))


def main(out_path):
    db = sqlite3.connect(out_path)
    cur = db.cursor()
    cur.execute("create table run (runId integer primary key, runName text, simtimeExp integer)")
    cur.execute("insert into run values (1, 'MiniSynthetic-0', ?)", (SIMTIME_EXP,))
    cur.execute(
        "create table vector (vectorId integer primary key, runId integer,"
        " moduleName text, vectorName text)")
    cur.execute(
        "create table vectordata (vectorId integer, eventNumber integer,"
        " simtimeRaw integer, value real)")

    vectors = {
        (SENDER, "sentPk:vector(pktSequenceNumber)"): 1,
        (SINK, "rcvdPkLifetime:vector"): 2,
        (SINK, "rcvdPk:vector(pktSequenceNumber)"): 3,
        (SINK, "rcvdPkNumHops:vector"): 4,
        (SINK, "rcvdThroughput:vector"): 5,
    }
    for (module, name), vec_id in vectors.items():
        cur.execute("insert into vector values (?, 1, ?, ?)", (vec_id, module, name))

    event = 0
    for seq in range(N_PACKETS):
        t_send = SEND_START_S + seq * SEND_INTERVAL_S
        event += 1
        cur.execute("insert into vectordata values (1, ?, ?, ?)", (event, raw(t_send), float(seq)))
        if seq == LOST_SEQ:
            continue
        t_rx = t_send + LATENCY_S
        event += 1
        cur.execute("insert into vectordata values (2, ?, ?, ?)", (event, raw(t_rx), LATENCY_S))
        cur.execute("insert into vectordata values (3, ?, ?, ?)", (event, raw(t_rx), float(seq)))
        cur.execute("insert into vectordata values (4, ?, ?, ?)", (event, raw(t_rx), 1.0))
        # rcvdThroughput lands on the 0.1 s grid just after the reception,
        # like the real signal the adapters window around.
        cur.execute("insert into vectordata values (5, ?, ?, ?)",
                    (event, raw(round(t_rx + 0.1, 1)), THROUGHPUT_BPS))

    db.commit()
    db.close()
    print(f"Wrote {out_path} ({N_PACKETS} packets, seq {LOST_SEQ} lost)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: make_mini_vec.py <out.vec>")
    main(sys.argv[1])
