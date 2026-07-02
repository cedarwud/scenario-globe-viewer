/**
 * ESTNeT packet-trace display mode (opt-in overlay state).
 *
 * Single source of truth for whether the opt-in ESTNeT packet-trace disclosure
 * section is shown in the V4 ground-station side panel. Mirrors the lighting
 * toggle / archived SLS display-mode pattern: a localStorage-backed boolean with
 * a subscribe API, seeded once from the legacy `?estnet=1` URL opt-in so existing
 * deep links keep working. The toolbar toggle (`viewer-estnet-trace-toggle`) and
 * the side panel both read/write through here, so the button and the panel stay
 * in sync without a page reload.
 *
 * Opt-in invariant (R11-style): the DEFAULT is OFF (no stored value, no URL
 * param) -> the side panel appends nothing -> the accepted single-link 19/19
 * surface is untouched. Turning the mode on only ADDS the disclosure section; it
 * never mutates or replaces the default surface.
 */
const STORAGE_KEY = "estnet-display-mode";
const URL_PARAM = "estnet";
const URL_OPT_IN_VALUE = "1";

type EstnetDisplayMode = "on" | "off";

let cachedMode: EstnetDisplayMode | null = null;
const listeners = new Set<(enabled: boolean) => void>();

function readStoredMode(): EstnetDisplayMode | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "on" || raw === "off" ? raw : null;
  } catch {
    return null;
  }
}

function writeStoredMode(mode: EstnetDisplayMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private-mode / disabled storage: fall back to the in-memory cache only.
  }
}

function urlOptInPresent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    new URLSearchParams(window.location.search).get(URL_PARAM) ===
    URL_OPT_IN_VALUE
  );
}

function resolveInitialMode(): EstnetDisplayMode {
  if (typeof window === "undefined") {
    return "off";
  }
  const stored = readStoredMode();
  if (stored) {
    return stored;
  }
  // The legacy `?estnet=1` deep-link opt-in seeds the IN-MEMORY mode for this
  // load only (nothing is persisted until an explicit toggle writes), so a
  // shared URL reveals the trace and the toolbar button can then turn it back
  // off — while a later visit without the param stays default-off.
  return urlOptInPresent() ? "on" : "off";
}

function currentMode(): EstnetDisplayMode {
  if (cachedMode === null) {
    cachedMode = resolveInitialMode();
  }
  return cachedMode;
}

/** True when the ESTNeT packet-trace disclosure section should be shown. */
export function isEstnetTraceDisplayEnabled(): boolean {
  return currentMode() === "on";
}

/** Set the mode explicitly; persists + notifies subscribers when it changes. */
export function setEstnetTraceDisplayEnabled(enabled: boolean): void {
  const next: EstnetDisplayMode = enabled ? "on" : "off";
  if (next === currentMode()) {
    return;
  }
  cachedMode = next;
  writeStoredMode(next);
  for (const listener of listeners) {
    try {
      listener(enabled);
    } catch {
      // Listener errors must not break the toggle path.
    }
  }
}

/** Flip the mode; returns the new enabled state. */
export function toggleEstnetTraceDisplay(): boolean {
  const next = !isEstnetTraceDisplayEnabled();
  setEstnetTraceDisplayEnabled(next);
  return next;
}

/**
 * Subscribe to mode changes. Fires immediately with the current value so the
 * subscriber can render its initial state, then again on each change. Returns
 * an unsubscribe function.
 */
export function subscribeEstnetTraceDisplay(
  listener: (enabled: boolean) => void
): () => void {
  listeners.add(listener);
  try {
    listener(isEstnetTraceDisplayEnabled());
  } catch {
    // Initial-fire errors must not break subscription.
  }
  return () => {
    listeners.delete(listener);
  };
}
