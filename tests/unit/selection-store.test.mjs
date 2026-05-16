// This test inlines a JS-stripped copy of selection-store.ts. If selection-store.ts changes,
// update the inlined copy here too. We accept this duplication because the repo has no TS
// test runner; a future task can switch to vitest/tsx and import directly.
//
// Run command:
//   node --test tests/unit/selection-store.test.mjs

import { test, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const registry = JSON.parse(
  readFileSync(
    new URL("../../public/fixtures/ground-stations/multi-orbit-public-registry.json", import.meta.url),
    "utf8"
  )
);

// ---------------------------------------------------------------------------
// window shim
// ---------------------------------------------------------------------------
const popListeners = new Set();
let _pathname = "/";
let _search = "";
let _hash = "";
let _historyState = null;

function _applyUrl(urlString) {
  const u = new URL(urlString, "http://localhost/");
  _pathname = u.pathname;
  _search = u.search;
  _hash = u.hash;
}

function __resetWindowShim(initialSearch = "") {
  popListeners.clear();
  _pathname = "/";
  _search = initialSearch;
  _hash = "";
  _historyState = null;
}

const windowShim = {
  get location() {
    return {
      get pathname() { return _pathname; },
      get hash() { return _hash; },
      get search() { return _search; },
      set search(v) {
        const next = v && !v.startsWith("?") ? `?${v}` : (v || "");
        _search = next;
      },
      get href() {
        return `http://localhost${_pathname}${_search}${_hash}`;
      }
    };
  },
  get history() {
    return {
      get state() { return _historyState; },
      replaceState(state, _title, url) {
        _historyState = state;
        if (typeof url === "string" && url.length > 0) {
          _applyUrl(url);
        }
      }
    };
  },
  addEventListener(type, fn) {
    if (type === "popstate") popListeners.add(fn);
  },
  removeEventListener(type, fn) {
    if (type === "popstate") popListeners.delete(fn);
  }
};

globalThis.window = windowShim;

function dispatchPopState() {
  for (const fn of popListeners) fn();
}

// === BEGIN inlined copy of selection-store.ts (JS-stripped) ===
// Source: src/features/multi-station-selector/selection-store.ts
// Swap: top-level `import registry from "..."` replaced with the `registry`
// constant loaded above via readFileSync + JSON.parse.

const URL_PARAM_BY_SLOT = {
  stationA: "stationA",
  stationB: "stationB"
};

const VALID_STATION_IDS = new Set(
  registry.stations.map((s) => s.id)
);

function readSlotFromUrl(slot) {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(URL_PARAM_BY_SLOT[slot]);
  if (!raw) {
    return null;
  }
  return VALID_STATION_IDS.has(raw) ? raw : null;
}

function writeUrl(next) {
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

function snapshotsEqual(a, b) {
  return a.stationA === b.stationA && a.stationB === b.stationB;
}

function createSelectionStore() {
  const initial = {
    stationA: readSlotFromUrl("stationA"),
    stationB: readSlotFromUrl("stationB")
  };

  let snapshot = initial;
  const listeners = new Set();
  let disposed = false;

  function commit(next) {
    if (snapshotsEqual(next, snapshot)) {
      return;
    }
    snapshot = next;
    writeUrl(snapshot);
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function resolveAfterAssign(slot, stationId) {
    const otherSlot = slot === "stationA" ? "stationB" : "stationA";
    const currentOther = snapshot[otherSlot];

    if (stationId !== null && currentOther === stationId) {
      const next = {
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

  function handlePopState() {
    const next = {
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
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setStation(slot, stationId) {
      if (stationId !== null && !VALID_STATION_IDS.has(stationId)) {
        return;
      }
      commit(resolveAfterAssign(slot, stationId));
    },
    clear(slot) {
      commit(resolveAfterAssign(slot, null));
    },
    clearAll() {
      commit({ stationA: null, stationB: null });
    },
    isSelected(stationId) {
      if (snapshot.stationA === stationId) {
        return "stationA";
      }
      if (snapshot.stationB === stationId) {
        return "stationB";
      }
      return null;
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      listeners.clear();
      window.removeEventListener("popstate", handlePopState);
    }
  };
}
// === END inlined copy ===

const ID_A = "ksat-svalsat-svalbard";
const ID_B = "ksat-tromso";
const ID_C = "ssc-punta-arenas";

beforeEach(() => {
  __resetWindowShim("");
});

test("initial empty URL yields { stationA: null, stationB: null }", () => {
  const store = createSelectionStore();
  assert.deepEqual(store.getSnapshot(), { stationA: null, stationB: null });
  store.dispose();
});

test("initial URL with valid stationA reflects that id in the snapshot", () => {
  __resetWindowShim(`?stationA=${ID_A}`);
  const store = createSelectionStore();
  assert.equal(store.getSnapshot().stationA, ID_A);
  assert.equal(store.getSnapshot().stationB, null);
  store.dispose();
});

test("initial URL with an unknown stationA is stripped from the URL on init", () => {
  __resetWindowShim("?stationA=does-not-exist");
  const store = createSelectionStore();
  assert.equal(store.getSnapshot().stationA, null);
  assert.ok(!window.location.search.includes("stationA=does-not-exist"));
  store.dispose();
});

test("setStation('stationA', valid) then setStation('stationB', valid) updates URL with both params", () => {
  const store = createSelectionStore();
  store.setStation("stationA", ID_A);
  store.setStation("stationB", ID_B);
  assert.equal(store.getSnapshot().stationA, ID_A);
  assert.equal(store.getSnapshot().stationB, ID_B);
  const params = new URLSearchParams(window.location.search);
  assert.equal(params.get("stationA"), ID_A);
  assert.equal(params.get("stationB"), ID_B);
  store.dispose();
});

test("setStation('stationB', X) when X already at stationA clears stationA and sets stationB (move)", () => {
  const store = createSelectionStore();
  store.setStation("stationA", ID_A);
  store.setStation("stationB", ID_A);
  assert.equal(store.getSnapshot().stationA, null);
  assert.equal(store.getSnapshot().stationB, ID_A);
  const params = new URLSearchParams(window.location.search);
  assert.equal(params.get("stationA"), null);
  assert.equal(params.get("stationB"), ID_A);
  store.dispose();
});

test("clear('stationA') resets that slot and removes the param from URL", () => {
  const store = createSelectionStore();
  store.setStation("stationA", ID_A);
  store.setStation("stationB", ID_B);
  store.clear("stationA");
  assert.equal(store.getSnapshot().stationA, null);
  assert.equal(store.getSnapshot().stationB, ID_B);
  const params = new URLSearchParams(window.location.search);
  assert.equal(params.get("stationA"), null);
  assert.equal(params.get("stationB"), ID_B);
  store.dispose();
});

test("clearAll() resets both slots", () => {
  const store = createSelectionStore();
  store.setStation("stationA", ID_A);
  store.setStation("stationB", ID_B);
  store.clearAll();
  assert.deepEqual(store.getSnapshot(), { stationA: null, stationB: null });
  const params = new URLSearchParams(window.location.search);
  assert.equal(params.get("stationA"), null);
  assert.equal(params.get("stationB"), null);
  store.dispose();
});

test("subscribe listener fires on real change but not on no-op assignment", () => {
  const store = createSelectionStore();
  let calls = 0;
  store.subscribe(() => { calls += 1; });
  store.setStation("stationA", ID_A);
  store.setStation("stationA", ID_A);
  assert.equal(calls, 1);
  store.dispose();
});

test("unsubscribe stops listener firing", () => {
  const store = createSelectionStore();
  let calls = 0;
  const off = store.subscribe(() => { calls += 1; });
  store.setStation("stationA", ID_A);
  off();
  store.setStation("stationB", ID_B);
  assert.equal(calls, 1);
  store.dispose();
});

test("popstate event triggers re-read and notification when URL changed externally", () => {
  const store = createSelectionStore();
  let lastSnapshot = null;
  store.subscribe((s) => { lastSnapshot = s; });
  _applyUrl(`/?stationA=${ID_C}`);
  dispatchPopState();
  assert.equal(store.getSnapshot().stationA, ID_C);
  assert.ok(lastSnapshot !== null);
  assert.equal(lastSnapshot.stationA, ID_C);
  store.dispose();
});

test("isSelected returns the correct slot for a selected id and null for an unselected id", () => {
  const store = createSelectionStore();
  store.setStation("stationA", ID_A);
  store.setStation("stationB", ID_B);
  assert.equal(store.isSelected(ID_A), "stationA");
  assert.equal(store.isSelected(ID_B), "stationB");
  assert.equal(store.isSelected(ID_C), null);
  store.dispose();
});

test("setStation ignores unknown station ids", () => {
  const store = createSelectionStore();
  store.setStation("stationA", "totally-fake");
  assert.equal(store.getSnapshot().stationA, null);
  assert.ok(!window.location.search.includes("totally-fake"));
  store.dispose();
});
