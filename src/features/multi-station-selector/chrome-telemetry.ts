// Chrome telemetry chips for the multi-station selector surface.
//
// IA §4.1 places three small machine-readable artefacts in the chrome:
//
//   1. LEO source record count chip —
//      `[data-leo-source-record-count-chip="true"]` with
//      `data-leo-source-record-count="<integer>"` carrying the LEO TLE
//      source-record count (the denominator that satisfies R1-F1 /
//      K-E1's >= 500 LEO claim). Source: LEO TLE fixture record count
//      via fetch + 3-line group parse. Cached on
//      `window.__SGV_LEO_TLE_COUNT__` so the chip renderer stays sync
//      across re-mounts. Legacy `data-leo-actor-count-*` attributes stay
//      for older smoke compatibility only.
//
//   2. TLE telemetry chip — `[data-tle-telemetry-chip="true"]` with
//      `data-tle-date="<ISO date>"` and `data-source-mode="<mode>"`.
//      The date is parsed from the resolved LEO TLE snapshot path.
//
//   3. Soak summary path — `data-soak-summary-path` attribute on the
//      viewer root. Machine-readable evidence of R1-D4.
//
// The chips render sync at mount (count starts at the cached value or
// 0). When no cached count is present a background fetch resolves the
// LEO TLE record count and back-patches the chip's data attribute.

import { TLE_FIXTURE_PATHS, loadDefaultTleSources } from "./runtime-projection";

const LEO_COUNT_CACHE_KEY = "__SGV_LEO_TLE_COUNT__";
const SOAK_SUMMARY_PATH =
  "output/soak/2026-05-15T05-42-07-506Z-phase7-0-full/summary.json";

const CHROME_TELEMETRY_STYLE_ATTR = "data-gs-chrome-telemetry-style";

const CHROME_TELEMETRY_CSS = `
.gs-leo-source-record-count-chip {
  position: absolute;
  top: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
  padding: 0.32rem 0.7rem;
  border-radius: 999px;
  background: rgba(6, 18, 28, 0.8);
  border: 1px solid rgba(126, 226, 184, 0.32);
  color: #dde9f1;
  font-family: "IBM Plex Sans", system-ui, -apple-system, sans-serif;
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  pointer-events: none;
}
.gs-leo-source-record-count-chip__label {
  color: rgba(157, 196, 232, 0.78);
  text-transform: uppercase;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
}
.gs-leo-source-record-count-chip__value {
  color: #7ee2b8;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.gs-tle-telemetry-chip {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  z-index: 4;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: rgba(6, 18, 28, 0.72);
  border: 1px solid rgba(157, 196, 232, 0.22);
  color: rgba(221, 233, 241, 0.72);
  font-family: "IBM Plex Sans", system-ui, -apple-system, sans-serif;
  font-size: 0.66rem;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
.gs-tle-telemetry-chip[data-source-mode="network-snapshot"] {
  background: rgba(19, 83, 58, 0.82);
  border-color: rgba(126, 226, 184, 0.42);
  color: rgba(232, 255, 244, 0.88);
}
.gs-tle-telemetry-chip[data-source-mode="fallback-local-snapshot"] {
  background: rgba(110, 76, 21, 0.84);
  border-color: rgba(255, 190, 92, 0.48);
  color: rgba(255, 240, 212, 0.9);
}
.gs-tle-telemetry-chip[data-source-mode="local-snapshot"] {
  background: rgba(6, 18, 28, 0.72);
  border-color: rgba(157, 196, 232, 0.22);
  color: rgba(221, 233, 241, 0.72);
}
`;

function injectChromeTelemetryStyleOnce(): void {
  if (document.head.querySelector(`[${CHROME_TELEMETRY_STYLE_ATTR}="true"]`)) {
    return;
  }
  const style = document.createElement("style");
  style.setAttribute(CHROME_TELEMETRY_STYLE_ATTR, "true");
  style.textContent = CHROME_TELEMETRY_CSS;
  document.head.appendChild(style);
}

declare global {
  interface Window {
    [LEO_COUNT_CACHE_KEY]?: number;
  }
}

function extractTleDateFromPath(path: string): string {
  // Filename shape: `<constellation>-<YYYY-MM-DDTHH-MM-SSZ>.tle` — extract
  // the leading date portion (`YYYY-MM-DD`) as an ISO date string.
  const match = path.match(/(\d{4}-\d{2}-\d{2})T/);
  return match?.[1] ?? "unknown";
}

function extractTleDateFromLeoPath(): string {
  return extractTleDateFromPath(TLE_FIXTURE_PATHS.LEO);
}

function countTleGroups(tleText: string): number {
  // TLE is 2-line per record (TLE Line 1 + TLE Line 2) optionally
  // preceded by a satellite name line (3LE). The fixture is 3-line:
  // count groups by dividing valid non-blank lines by 3 — same shape
  // parseTleListFromText assumes downstream.
  const lines = tleText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return Math.floor(lines.length / 3);
}

async function loadLeoTleRecordCount(): Promise<number> {
  const cached = window[LEO_COUNT_CACHE_KEY];
  if (typeof cached === "number" && Number.isFinite(cached) && cached > 0) {
    return cached;
  }
  const sources = await loadDefaultTleSources();
  const count = countTleGroups(sources.leoTleText);
  window[LEO_COUNT_CACHE_KEY] = count;
  return count;
}

function createLeoSourceRecordCountChip(initialCount: number): HTMLElement {
  const chip = document.createElement("aside");
  chip.className = "gs-leo-source-record-count-chip";
  chip.dataset.leoSourceRecordCountChip = "true";
  chip.dataset.leoSourceRecordCount = String(initialCount);
  chip.dataset.leoActorCountChip = "true";
  chip.dataset.leoActorCount = String(initialCount);
  chip.setAttribute("aria-label", "LEO source record count");
  const label = document.createElement("span");
  label.className = "gs-leo-source-record-count-chip__label";
  label.textContent = "LEO source records";
  const value = document.createElement("span");
  value.className = "gs-leo-source-record-count-chip__value";
  value.textContent = initialCount > 0 ? String(initialCount) : "…";
  chip.append(label, value);
  return chip;
}

function setLeoSourceRecordCountChipValue(chip: HTMLElement, count: number): void {
  chip.dataset.leoSourceRecordCount = String(count);
  chip.dataset.leoActorCount = String(count);
  const value = chip.querySelector<HTMLElement>(
    ".gs-leo-source-record-count-chip__value"
  );
  if (value) {
    value.textContent = String(count);
  }
}

function createTleTelemetryChip(tleDate: string): HTMLElement {
  const chip = document.createElement("aside");
  chip.className = "gs-tle-telemetry-chip";
  chip.dataset.tleTelemetryChip = "true";
  chip.dataset.tleDate = tleDate;
  chip.dataset.sourceMode = "local-snapshot";
  chip.setAttribute("aria-label", `TLE source date ${tleDate}`);
  chip.textContent = `TLE ${tleDate}`;
  return chip;
}

function syncTleTelemetryChipSource(chip: HTMLElement): void {
  void loadDefaultTleSources()
    .then((sources) => {
      const sourceMode = sources.sourceMode ?? "local-snapshot";
      const tleDate = extractTleDateFromPath(
        sources.sourcePaths?.LEO ?? TLE_FIXTURE_PATHS.LEO
      );
      chip.dataset.tleDate = tleDate;
      chip.dataset.sourceMode = sourceMode;
      if (sourceMode === "network-snapshot" || sourceMode === "fallback-local-snapshot") {
        chip.dataset.tleAttribution = "CelesTrak";
      } else {
        delete chip.dataset.tleAttribution;
      }
      chip.setAttribute("aria-label", `TLE source date ${tleDate}`);
      const suffix = chip.textContent?.includes(" · ")
        ? ` · ${chip.textContent.split(" · ").slice(1).join(" · ")}`
        : "";
      chip.textContent = `TLE ${tleDate}${suffix}`;
    })
    .catch(() => {
      chip.dataset.sourceMode = "local-snapshot";
    });
}

export interface SelectorChromeTelemetryHandle {
  dispose(): void;
}

export interface SelectorChromeTelemetryOptions {
  readonly viewerContainer: HTMLElement;
  readonly viewerRoot: HTMLElement;
}

export function mountSelectorChromeTelemetry(
  options: SelectorChromeTelemetryOptions
): SelectorChromeTelemetryHandle {
  const { viewerContainer, viewerRoot } = options;

  injectChromeTelemetryStyleOnce();

  // Soak summary path on viewer root — evidence of R1-D4 (24h soak).
  viewerRoot.dataset.soakSummaryPath = SOAK_SUMMARY_PATH;

  const initialCount = window[LEO_COUNT_CACHE_KEY] ?? 0;
  const leoChip = createLeoSourceRecordCountChip(initialCount);
  const tleChip = createTleTelemetryChip(extractTleDateFromLeoPath());
  syncTleTelemetryChipSource(tleChip);

  viewerContainer.appendChild(leoChip);
  viewerContainer.appendChild(tleChip);

  let disposed = false;

  if (initialCount === 0) {
    void loadLeoTleRecordCount()
      .then((count) => {
        if (disposed) {
          return;
        }
        setLeoSourceRecordCountChipValue(leoChip, count);
      })
      .catch(() => {
        // Best-effort: leave the chip at the cached/0 value if the LEO
        // fixture fetch failed. The acceptance gate inspects the data
        // attribute; a follow-up smoke surfaces the failure if needed.
      });
  }

  return {
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      if (leoChip.parentElement) {
        leoChip.parentElement.removeChild(leoChip);
      }
      if (tleChip.parentElement) {
        tleChip.parentElement.removeChild(tleChip);
      }
      delete viewerRoot.dataset.soakSummaryPath;
    }
  };
}
