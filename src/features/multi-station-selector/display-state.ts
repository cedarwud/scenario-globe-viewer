// Display-state helper for the multi-station selector surface.
//
// Wave 1 of the IA convergence (docs/sdd/multi-station-selector/
// information-architecture.md §3, §13 and runtime-data-contract.md §A.6)
// names the composition module as the authority on the derived display
// state. This module is the pure derivation: it folds the selection
// snapshot, registry resolvability, the info-card open signal, and the
// replay clock state into one of five enum values, and exposes a small
// subscription manager that fires `onChange` whenever any of the four
// inputs changes the derived state.
//
// The helper is DOM-free. Composition wires it up at bootstrap and
// reads its callback to mount or dispose the selection-driven surfaces.

import type { ReplayClock, ReplayClockState } from "../time";

import type {
  SelectionSnapshot,
  SelectionStore
} from "./selection-store";
import { resolveV4RouteSelection } from "./v4-route-selection";
import type { V4ResolvedStationPair } from "./v4-route-selection";

export type DisplayState =
  | "idle"
  | "selecting"
  | "projecting"
  | "replaying"
  | "invalid";

export interface DisplayStateInputs {
  readonly selection: SelectionSnapshot;
  /**
   * Raw URL slot values, BEFORE the registry scrub applied by
   * `selection-store.ts:readSlotFromUrl`. Required so a deep-link like
   * `/?stationA=bogus&stationB=bogus` surfaces as `invalid` rather than
   * collapsing to `idle` after the scrub. Wave-2 §A.6 fix.
   */
  readonly rawStationA: string | null;
  readonly rawStationB: string | null;
  readonly registryResolves: (id: string) => boolean;
  readonly infoCardOpen: boolean;
  readonly replayClockIsPlaying: boolean;
}

export interface OpenSignal {
  subscribe(listener: (open: boolean) => void): () => void;
}

function bothSlotsEmpty(snapshot: SelectionSnapshot): boolean {
  return snapshot.stationA === null && snapshot.stationB === null;
}

function bothSlotsFilled(snapshot: SelectionSnapshot): boolean {
  return snapshot.stationA !== null && snapshot.stationB !== null;
}

function rawSlotPresentButUnresolved(
  rawSlotValue: string | null,
  registryResolves: (id: string) => boolean
): boolean {
  return rawSlotValue !== null && !registryResolves(rawSlotValue);
}

export function resolveDisplayState(inputs: DisplayStateInputs): DisplayState {
  const {
    selection,
    rawStationA,
    rawStationB,
    registryResolves,
    infoCardOpen,
    replayClockIsPlaying
  } = inputs;

  // Invalid wins over every other state: a deep-link with a stale or
  // unknown station id (raw URL value present but not resolvable in the
  // registry) surfaces as `invalid` so the IA's empty-state hint can
  // replace the V4 panel and the user sees the bad-deep-link.
  if (
    rawSlotPresentButUnresolved(rawStationA, registryResolves) ||
    rawSlotPresentButUnresolved(rawStationB, registryResolves)
  ) {
    return "invalid";
  }

  if (bothSlotsFilled(selection)) {
    return replayClockIsPlaying ? "replaying" : "projecting";
  }

  // Info-card open or exactly-one-slot-filled is mid-selection.
  if (infoCardOpen || !bothSlotsEmpty(selection)) {
    return "selecting";
  }

  return "idle";
}

/**
 * Pipe the resolved pair through every `onChange` invocation so downstream
 * consumers (composition, the V4 panel mount, the V4 controller selection
 * subscription) do not need to re-parse `window.location.search` on every
 * state transition. The resolved pair is non-null only when both raw URL
 * slots resolve to registry entries — same predicate as
 * `resolveV4RouteSelection(...).resolvedPair`. Slice E.
 */
export function subscribeDisplayState(
  store: SelectionStore,
  replayClock: ReplayClock,
  infoCardOpenSignal: OpenSignal,
  registryResolves: (id: string) => boolean,
  onChange: (
    state: DisplayState,
    resolvedPair: V4ResolvedStationPair | null
  ) => void
): () => void {
  let infoCardOpen = false;
  let replayClockIsPlaying = readIsPlaying(replayClock.getState());
  let lastState: DisplayState | null = null;
  let lastResolvedPairKey: string | null = null;

  function readCurrentResolvedPair(): V4ResolvedStationPair | null {
    if (typeof window === "undefined") {
      return null;
    }
    return resolveV4RouteSelection(
      new URLSearchParams(window.location.search)
    ).resolvedPair;
  }

  function resolvedPairKey(
    pair: V4ResolvedStationPair | null
  ): string | null {
    return pair ? `${pair.stationA.id} ${pair.stationB.id}` : null;
  }

  function compute(): void {
    const raw = store.getRawUrlSnapshot();
    const next = resolveDisplayState({
      selection: store.getSnapshot(),
      rawStationA: raw.rawStationA,
      rawStationB: raw.rawStationB,
      registryResolves,
      infoCardOpen,
      replayClockIsPlaying
    });
    const resolvedPair = readCurrentResolvedPair();
    const pairKey = resolvedPairKey(resolvedPair);
    // Fire onChange when EITHER the derived state OR the resolved pair
    // identity changes. The pair-identity check lets a reselection
    // within the same state (e.g. `replaying` → `replaying` with new
    // stationA/stationB) propagate to the V4 panel + controller
    // endpoint surfaces without forcing a full state transition.
    if (next === lastState && pairKey === lastResolvedPairKey) {
      return;
    }
    lastState = next;
    lastResolvedPairKey = pairKey;
    onChange(next, resolvedPair);
  }

  const unsubscribeStore = store.subscribe(() => {
    compute();
  });

  const unsubscribeInfoCard = infoCardOpenSignal.subscribe((open) => {
    if (infoCardOpen === open) {
      return;
    }
    infoCardOpen = open;
    compute();
  });

  const unsubscribeReplayClock = replayClock.onTick((tickState) => {
    const next = readIsPlaying(tickState);
    if (next === replayClockIsPlaying) {
      return;
    }
    replayClockIsPlaying = next;
    compute();
  });

  // Fire the initial state once so the caller can wire its first
  // mount/unmount decision without a stale derived view.
  compute();

  return () => {
    unsubscribeStore();
    unsubscribeInfoCard();
    unsubscribeReplayClock();
  };
}

function readIsPlaying(state: ReplayClockState): boolean {
  return Boolean(state.isPlaying);
}
