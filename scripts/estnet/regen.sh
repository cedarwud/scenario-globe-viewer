#!/usr/bin/env bash
# One-command ESTNeT trace regeneration (provenance / reproducibility chain).
#
# scenario (tracked here) -> copy into the ESTNeT kit -> run both sims
# -> adapters -> public/fixtures/estnet/*.json -> report git diff.
#
# The two scenarios share the kit's results/General-0.vec output name, so each
# sim is adapted immediately before the next sim overwrites it.
#
# Usage:
#   npm run estnet:regen            # or: bash scripts/estnet/regen.sh
#   ESTNET_KIT=/path/to/kit bash scripts/estnet/regen.sh
#
# The kit is only needed to REGENERATE the traces; the viewer consumes the
# committed JSON fixtures. Both fixtures are deterministic for a given
# scenario (no wall-clock timestamps), so an unchanged scenario must
# reproduce byte-identical fixtures — any diff below means scenario and
# fixture have drifted apart.
set -euo pipefail

VIEWER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KIT="${ESTNET_KIT:-/home/u24/papers/estnet-bootstrap-kit}"
SIM_DIR="$KIT/estnet-template/simulations"
SCENARIO_SRC="$VIEWER_ROOT/scripts/estnet/scenario"
FIXTURE_DIR="$VIEWER_ROOT/public/fixtures/estnet"

if [ ! -d "$SIM_DIR" ]; then
  echo "ERROR: ESTNeT kit not found at $KIT (set ESTNET_KIT)" >&2
  exit 1
fi

echo "== 1/5 copy tracked scenario -> kit"
cp "$SCENARIO_SRC"/omnetpp_cht_sansa.ini              "$SIM_DIR/"
cp "$SCENARIO_SRC"/omnetpp_cht_sansa_handover.ini     "$SIM_DIR/"
cp "$SCENARIO_SRC"/omnetpp_cht_domestic_handover.ini  "$SIM_DIR/"
cp "$SCENARIO_SRC"/configs/*.incl                     "$SIM_DIR/configs/"
cp "$SCENARIO_SRC"/configs/*.cp                       "$SIM_DIR/configs/"
cp "$SCENARIO_SRC"/configs/tles/*.tle                 "$SIM_DIR/configs/tles/"

run_sim() {
  local ini="$1"
  echo "== run $ini (headless, instant wall-clock)"
  # Both scenarios write results/General-0.vec — delete first and assert it
  # was recreated, so a sim that exits 0 without producing results can never
  # feed the previous run's stale output to the adapter.
  rm -f "$SIM_DIR/results/General-0.vec" "$SIM_DIR/results/General-0.sca"
  # activate_env.sh must be sourced in the kit root (sets LD_LIBRARY_PATH for
  # osgEarth); run_sim.sh has no +x bit, so call it via bash.
  (
    cd "$KIT"
    # shellcheck disable=SC1091
    source ./activate_env.sh >/dev/null
    cd estnet-template/simulations
    bash run_sim.sh release "$ini" General Cmdenv --cmdenv-express-mode=true \
      | tail -n 3
  )
  if [ ! -f "$SIM_DIR/results/General-0.vec" ]; then
    echo "ERROR: $ini produced no results/General-0.vec" >&2
    exit 1
  fi
}

echo "== 2/5 flat GEO steady-state scenario"
run_sim omnetpp_cht_sansa.ini
python3 "$VIEWER_ROOT/scripts/estnet/estnet_trace_adapter.py" \
  --vec "$SIM_DIR/results/General-0.vec" \
  --out "$FIXTURE_DIR/cht-sansa-apstar7-packet-trace.json"

echo "== 3/5 full-6h GEO<->MEO handover scenario"
run_sim omnetpp_cht_sansa_handover.ini
python3 "$VIEWER_ROOT/scripts/estnet/estnet_handover_trace_adapter.py" \
  --vec "$SIM_DIR/results/General-0.vec" \
  --out "$FIXTURE_DIR/cht-sansa-handover-packet-trace.json"

echo "== 4/5 full LEO+MEO+GEO chain scenario (CHT domestic, generated)"
run_sim omnetpp_cht_domestic_handover.ini
python3 "$VIEWER_ROOT/scripts/estnet/estnet_handover_trace_adapter.py" \
  --vec "$SIM_DIR/results/General-0.vec" \
  --scenario "$VIEWER_ROOT/scripts/estnet/scenario/cht_domestic_handover_scenario.json" \
  --out "$FIXTURE_DIR/cht-domestic-handover-packet-trace.json"

echo "== 5/5 fixture drift vs committed state"
git -C "$VIEWER_ROOT" --no-pager diff --stat -- \
  public/fixtures/estnet/cht-sansa-apstar7-packet-trace.json \
  public/fixtures/estnet/cht-sansa-handover-packet-trace.json \
  public/fixtures/estnet/cht-domestic-handover-packet-trace.json
if git -C "$VIEWER_ROOT" diff --quiet -- public/fixtures/estnet/; then
  echo "   fixtures byte-identical to committed state (reproducible)"
else
  echo "   NOTE: fixtures changed — scenario and committed fixtures had drifted"
fi

echo "== contract gate"
node "$VIEWER_ROOT/scripts/verify-estnet-trace-contract.mjs"
