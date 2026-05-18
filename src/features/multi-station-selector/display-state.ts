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

import type { SelectionSnapshot, SelectionStore } from "./selection-store";

export type DisplayState =
  | "idle"
  | "selecting"
  | "projecting"
  | "replaying"
  | "invalid";

export interface DisplayStateInputs {
  readonly selection: SelectionSnapshot;
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

function anyUnresolvedSlot(
  snapshot: SelectionSnapshot,
  registryResolves: (id: string) => boolean
): boolean {
  if (snapshot.stationA !== null && !registryResolves(snapshot.stationA)) {
    return true;
  }
  if (snapshot.stationB !== null && !registryResolves(snapshot.stationB)) {
    return true;
  }
  return false;
}

export function resolveDisplayState(inputs: DisplayStateInputs): DisplayState {
  const { selection, registryResolves, infoCardOpen, replayClockIsPlaying } =
    inputs;

  // Invalid wins over every other state: a deep-link with a stale or
  // unknown station id must surface as `invalid` so the IA's empty-state
  // hint can replace the V4 panel.
  if (anyUnresolvedSlot(selection, registryResolves)) {
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

export function subscribeDisplayState(
  store: SelectionStore,
  replayClock: ReplayClock,
  infoCardOpenSignal: OpenSignal,
  registryResolves: (id: string) => boolean,
  onChange: (state: DisplayState) => void
): () => void {
  let infoCardOpen = false;
  let replayClockIsPlaying = readIsPlaying(replayClock.getState());
  let lastState: DisplayState | null = null;

  function compute(): void {
    const next = resolveDisplayState({
      selection: store.getSnapshot(),
      registryResolves,
      infoCardOpen,
      replayClockIsPlaying
    });
    if (next === lastState) {
      return;
    }
    lastState = next;
    onChange(next);
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
