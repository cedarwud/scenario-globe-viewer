import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";

export type SelectionSlot = "stationA" | "stationB";

export interface SelectionSnapshot {
  readonly stationA: string | null;
  readonly stationB: string | null;
}

export interface SelectionStore {
  getSnapshot(): SelectionSnapshot;
  subscribe(listener: (snapshot: SelectionSnapshot) => void): () => void;
  setStation(slot: SelectionSlot, stationId: string | null): void;
  clear(slot: SelectionSlot): void;
  clearAll(): void;
  isSelected(stationId: string): SelectionSlot | null;
  dispose(): void;
}

const URL_PARAM_BY_SLOT: Readonly<Record<SelectionSlot, string>> = {
  stationA: "stationA",
  stationB: "stationB"
};

const VALID_STATION_IDS: ReadonlySet<string> = new Set(
  (registry.stations as ReadonlyArray<{ id: string }>).map((s) => s.id)
);

function readSlotFromUrl(slot: SelectionSlot): string | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(URL_PARAM_BY_SLOT[slot]);
  if (!raw) {
    return null;
  }
  return VALID_STATION_IDS.has(raw) ? raw : null;
}

function writeUrl(next: SelectionSnapshot): void {
  const url = new URL(window.location.href);
  if (next.stationA) {
    url.searchParams.set(URL_PARAM_BY_SLOT.stationA, next.stationA);
  } else {
    url.searchParams.delete(URL_PARAM_BY_SLOT.stationA);
  }
  if (next.stationB) {
    url.searchParams.set(URL_PARAM_BY_SLOT.stationB, next.stationB);
  } else {
    url.searchParams.delete(URL_PARAM_BY_SLOT.stationB);
  }
  const nextHref = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", nextHref);
}

function snapshotsEqual(a: SelectionSnapshot, b: SelectionSnapshot): boolean {
  return a.stationA === b.stationA && a.stationB === b.stationB;
}

export function createSelectionStore(): SelectionStore {
  const initial: SelectionSnapshot = {
    stationA: readSlotFromUrl("stationA"),
    stationB: readSlotFromUrl("stationB")
  };

  let snapshot: SelectionSnapshot = initial;
  const listeners = new Set<(snapshot: SelectionSnapshot) => void>();
  let disposed = false;

  function commit(next: SelectionSnapshot): void {
    if (snapshotsEqual(next, snapshot)) {
      return;
    }
    snapshot = next;
    writeUrl(snapshot);
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function resolveAfterAssign(
    slot: SelectionSlot,
    stationId: string | null
  ): SelectionSnapshot {
    const otherSlot: SelectionSlot = slot === "stationA" ? "stationB" : "stationA";
    const currentOther = snapshot[otherSlot];

    if (stationId !== null && currentOther === stationId) {
      const next: SelectionSnapshot = {
        stationA: slot === "stationA" ? stationId : null,
        stationB: slot === "stationB" ? stationId : null
      };
      return next;
    }

    return {
      stationA: slot === "stationA" ? stationId : snapshot.stationA,
      stationB: slot === "stationB" ? stationId : snapshot.stationB
    };
  }

  function handlePopState(): void {
    const next: SelectionSnapshot = {
      stationA: readSlotFromUrl("stationA"),
      stationB: readSlotFromUrl("stationB")
    };
    if (snapshotsEqual(next, snapshot)) {
      return;
    }
    snapshot = next;
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  window.addEventListener("popstate", handlePopState);

  const rawParams = new URLSearchParams(window.location.search);
  const rawA = rawParams.get(URL_PARAM_BY_SLOT.stationA);
  const rawB = rawParams.get(URL_PARAM_BY_SLOT.stationB);
  if (rawA !== initial.stationA || rawB !== initial.stationB) {
    writeUrl(initial);
  }

  return {
    getSnapshot(): SelectionSnapshot {
      return snapshot;
    },
    subscribe(listener: (snapshot: SelectionSnapshot) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setStation(slot: SelectionSlot, stationId: string | null): void {
      if (stationId !== null && !VALID_STATION_IDS.has(stationId)) {
        return;
      }
      commit(resolveAfterAssign(slot, stationId));
    },
    clear(slot: SelectionSlot): void {
      commit(resolveAfterAssign(slot, null));
    },
    clearAll(): void {
      commit({ stationA: null, stationB: null });
    },
    isSelected(stationId: string): SelectionSlot | null {
      if (snapshot.stationA === stationId) {
        return "stationA";
      }
      if (snapshot.stationB === stationId) {
        return "stationB";
      }
      return null;
    },
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      listeners.clear();
      window.removeEventListener("popstate", handlePopState);
    }
  };
}
