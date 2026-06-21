# ADR 0013: System-Level Simulation (multi-beam SLS) track — attempted, retired

## Status

Retired (2026-06-21). The multi-beam SLS build was removed from `main`; this ADR
is the breadcrumb that records the attempt, why it was abandoned, and where the
code and a physics reference live.

## Context

An earlier effort ("SLS 攻頂") tried to push the viewer from its single-link
budget toward a **standards-compliant system-level NTN simulation**: multi-cell /
multi-beam coverage, co-channel SINR, synthetic demand, and a per-cell queue /
TTL / drop model, surfaced as an opt-in panel overlay, a toolbar toggle, and a
floating queue window.

In review it became clear this was the **wrong abstraction level for the
viewer's actual deliverable**. The accepted product (ITRI 19/19) is the
**two-station cross-orbit handover scene** — a single-path connectivity and
geometry story. A multi-beam *system-capacity* model has no spatial or physical
home in that single-path frame, so its metrics (per-orbit SINR/CQI lines, a
multi-beam cell queue) read as meaningless numbers. ITRI never required multi-beam;
ESTNeT (packet-level, per-path) does not need it either. The multi-beam direction
was self-directed over-reach.

## Decision

1. **Retire the multi-beam SLS track.** `main` was hard-reset to `ea6c568` (the
   last commit before the SLS track began at `514cf2e`) and force-pushed (solo
   repo). The over-claim honesty CI gate predates SLS (`a71764f`) and is retained.
2. **Preserve, do not destroy.** The complete SLS tree (plus four interleaved
   non-SLS commits: an overlay-governance ADR, two geocoder toolbar CSS fixes, and
   a G5/G3 gate refresh) is kept on branch **`sls-archive`** at `643cc1c`. Recover
   any file with `git show sls-archive:<path>` or cherry-pick. The local design
   SDD under `docs/sdd/system-level-simulation/` is gitignored and survives on disk.
3. **Physics reference.** `ntn-sim-core` (in `../ntn-showcase-stack/`) holds a real
   multibeam NTN SINR/handover/beam model — but it is **model-tier, not measured**
   (same honesty tier as ours), so reuse only with disclosed provenance.

## New direction (to design in a fresh discussion)

High-fidelity realism of the **actual deliverable scene** plus anticipation of
ESTNeT, **not** a multi-beam system:

- Make the **selected-path** link budget / latency realistic across the pass.
- The coherent queue concept is a **handover-gap buffer**: when the link switches
  satellites there is a brief gap, so packets buffer, latency spikes, loss may
  occur, then it drains — rendered as a time series **anchored to the handover
  events already on screen** (cause and effect both visible, unlike the homeless
  multi-beam metrics).
- Reshape the performance-metrics seam as a **time-series trace loader** for
  ESTNeT packet output, not a single representative snapshot.
- A multi-beam coverage heatmap, if ever wanted, belongs in a **separate
  regional view** (one satellite's beam footprint over a region, scale-appropriate),
  not bolted onto the global two-station handover scene.

Reusable from `sls-archive` when rebuilding (copy, do not rewrite):
`queue-model.ts` (fluid FIFO + TTL, conservation-tested — a handover-gap buffer is
a queue) and `sinr-closure.ts` (kT0B / Shannon / TS 38.214 CQI table,
conformance-gated) if per-link SINR is needed.

## Consequences

- The viewer returns to its accepted single-link surface; nothing beyond-scope
  ships.
- Agent-memory `project_sls_summit_plan_2026_06_20` carries the full pivot record
  and reuse map (read its top "STRATEGIC PIVOT" block first).
