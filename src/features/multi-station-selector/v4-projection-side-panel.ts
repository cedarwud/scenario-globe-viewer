import {
  PUBLIC_REGISTRY_BY_ID,
  type PublicRegistryStation
} from "./tier-inference";
import {
  buildDefaultTimeWindow,
  computeRuntimeProjection,
  loadDefaultTleSources,
  parseRuntimeTleSources,
  type RuntimeProjectionResult
} from "./runtime-projection";
import type { PairVisibilityWindow } from "./visibility-utils";

const PANEL_MAX_VISIBILITY_ROWS = 8;
const PANEL_MAX_HANDOVER_ROWS = 6;

interface ResolvedPair {
  readonly stationA: PublicRegistryStation;
  readonly stationB: PublicRegistryStation;
}

function resolvePair(
  stationAId: string | null,
  stationBId: string | null
): ResolvedPair | null {
  if (!stationAId || !stationBId || stationAId === stationBId) {
    return null;
  }
  const stationA = PUBLIC_REGISTRY_BY_ID.get(stationAId);
  const stationB = PUBLIC_REGISTRY_BY_ID.get(stationBId);
  if (!stationA || !stationB) {
    return null;
  }
  return { stationA, stationB };
}

function createPanelShell(): HTMLElement {
  const root = document.createElement("aside");
  root.className = "v4-projection-side-panel";
  root.dataset.v4ProjectionSidePanel = "true";
  root.setAttribute("role", "complementary");
  root.setAttribute("aria-label", "Runtime projection of the selected ground-station pair");
  return root;
}

function renderLoading(root: HTMLElement, pair: ResolvedPair): void {
  root.replaceChildren();
  root.dataset.state = "loading";

  const title = document.createElement("h2");
  title.className = "v4-projection-side-panel__title";
  title.textContent = `Runtime projection · ${pair.stationA.name} ↔ ${pair.stationB.name}`;

  const status = document.createElement("p");
  status.className = "v4-projection-side-panel__status";
  status.textContent = "Loading TLE fixtures and computing visibility windows…";

  root.append(title, status);
}

function renderError(root: HTMLElement, message: string): void {
  root.replaceChildren();
  root.dataset.state = "error";

  const title = document.createElement("h2");
  title.className = "v4-projection-side-panel__title";
  title.textContent = "Runtime projection unavailable";

  const status = document.createElement("p");
  status.className = "v4-projection-side-panel__status v4-projection-side-panel__status--error";
  status.textContent = message;

  root.append(title, status);
}

function formatDurationMs(ms: number): string {
  if (ms <= 0) {
    return "0s";
  }
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}s`;
  }
  const minutes = Math.floor(totalSec / 60);
  const sec = totalSec - minutes * 60;
  return sec === 0 ? `${minutes}m` : `${minutes}m ${sec}s`;
}

function formatIsoShort(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return iso;
  }
  return new Date(ms).toISOString().slice(11, 19) + "Z";
}

function buildStatBlock(
  label: string,
  value: string,
  modifier?: string
): HTMLElement {
  const block = document.createElement("div");
  block.className = "v4-projection-side-panel__stat";
  if (modifier) {
    block.dataset.modifier = modifier;
  }
  const labelEl = document.createElement("span");
  labelEl.className = "v4-projection-side-panel__stat-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.className = "v4-projection-side-panel__stat-value";
  valueEl.textContent = value;
  block.append(labelEl, valueEl);
  return block;
}

function buildVisibilityWindowList(
  windows: ReadonlyArray<PairVisibilityWindow>
): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = `Pair visibility windows (${windows.length})`;
  wrapper.append(heading);

  if (windows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent = "No satellite is mutually visible to both stations in the time window.";
    wrapper.append(empty);
    return wrapper;
  }

  const sorted = [...windows]
    .sort(
      (a, b) =>
        Date.parse(a.intersectionStartUtc) - Date.parse(b.intersectionStartUtc)
    )
    .slice(0, PANEL_MAX_VISIBILITY_ROWS);

  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__list";

  for (const w of sorted) {
    const li = document.createElement("li");
    li.className = "v4-projection-side-panel__list-item";
    const dur = Date.parse(w.intersectionEndUtc) - Date.parse(w.intersectionStartUtc);
    li.innerHTML = "";
    const sat = document.createElement("span");
    sat.className = "v4-projection-side-panel__list-primary";
    sat.textContent = `${w.satelliteId} · ${w.orbitClass}`;
    const time = document.createElement("span");
    time.className = "v4-projection-side-panel__list-secondary";
    time.textContent = `${formatIsoShort(w.intersectionStartUtc)} – ${formatIsoShort(w.intersectionEndUtc)}  ·  ${formatDurationMs(dur)}`;
    li.append(sat, time);
    list.append(li);
  }

  wrapper.append(list);

  if (windows.length > PANEL_MAX_VISIBILITY_ROWS) {
    const more = document.createElement("p");
    more.className = "v4-projection-side-panel__more";
    more.textContent = `+${windows.length - PANEL_MAX_VISIBILITY_ROWS} more windows`;
    wrapper.append(more);
  }

  return wrapper;
}

function buildHandoverEventList(
  events: RuntimeProjectionResult["handoverEvents"]
): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section";

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = `Handover events (${events.length})`;
  wrapper.append(heading);

  if (events.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent = "No handover events triggered by the bootstrap-balanced policy in this window.";
    wrapper.append(empty);
    return wrapper;
  }

  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__list";

  for (const e of events.slice(0, PANEL_MAX_HANDOVER_ROWS)) {
    const li = document.createElement("li");
    li.className = "v4-projection-side-panel__list-item";
    const head = document.createElement("span");
    head.className = "v4-projection-side-panel__list-primary";
    head.textContent = `${formatIsoShort(e.handoverAtUtc)}  ${e.fromSatelliteId ?? "—"} → ${e.toSatelliteId}`;
    const reason = document.createElement("span");
    reason.className = "v4-projection-side-panel__list-secondary";
    reason.textContent = e.reasonKind.replace(/-/g, " ");
    li.append(head, reason);
    list.append(li);
  }

  wrapper.append(list);

  if (events.length > PANEL_MAX_HANDOVER_ROWS) {
    const more = document.createElement("p");
    more.className = "v4-projection-side-panel__more";
    more.textContent = `+${events.length - PANEL_MAX_HANDOVER_ROWS} more events`;
    wrapper.append(more);
  }

  return wrapper;
}

function buildNonClaims(
  truthBoundary: RuntimeProjectionResult["truthBoundary"]
): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "v4-projection-side-panel__section v4-projection-side-panel__section--non-claims";

  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__section-title";
  heading.textContent = `Non-claims · ${truthBoundary.sourceTier}`;
  wrapper.append(heading);

  if (truthBoundary.nonClaims.length === 0) {
    return wrapper;
  }

  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__non-claim-list";
  for (const note of truthBoundary.nonClaims) {
    const li = document.createElement("li");
    li.textContent = note;
    list.append(li);
  }
  wrapper.append(list);
  return wrapper;
}

function renderResult(
  root: HTMLElement,
  pair: ResolvedPair,
  result: RuntimeProjectionResult
): void {
  root.replaceChildren();
  root.dataset.state = "ready";
  root.dataset.sourceTier = result.truthBoundary.sourceTier;

  const title = document.createElement("h2");
  title.className = "v4-projection-side-panel__title";
  title.textContent = `Runtime projection · ${pair.stationA.name} ↔ ${pair.stationB.name}`;

  const windowLine = document.createElement("p");
  windowLine.className = "v4-projection-side-panel__window";
  windowLine.textContent = `Window ${formatIsoShort(result.timeWindow.startUtc)} – ${formatIsoShort(result.timeWindow.endUtc)} UTC`;

  const stats = document.createElement("div");
  stats.className = "v4-projection-side-panel__stats";
  stats.append(
    buildStatBlock("Comm time", formatDurationMs(result.communicationStats.totalCommunicatingMs)),
    buildStatBlock("Handovers", String(result.communicationStats.handoverCount)),
    buildStatBlock("Mean dwell", formatDurationMs(result.communicationStats.meanLinkDwellMs)),
    buildStatBlock(
      "LEO/MEO/GEO",
      `${formatDurationMs(result.communicationStats.byOrbit.LEO)} · ${formatDurationMs(result.communicationStats.byOrbit.MEO)} · ${formatDurationMs(result.communicationStats.byOrbit.GEO)}`
    )
  );

  root.append(
    title,
    windowLine,
    stats,
    buildVisibilityWindowList(result.visibilityWindows),
    buildHandoverEventList(result.handoverEvents),
    buildNonClaims(result.truthBoundary)
  );
}

export interface V4ProjectionSidePanelInput {
  readonly stationAId: string | null;
  readonly stationBId: string | null;
}

export interface V4ProjectionSidePanelHandle {
  dispose(): void;
}

export function mountV4ProjectionSidePanel(
  viewerContainer: HTMLElement,
  input: V4ProjectionSidePanelInput
): V4ProjectionSidePanelHandle | null {
  const pair = resolvePair(input.stationAId, input.stationBId);
  if (!pair) {
    return null;
  }

  const root = createPanelShell();
  viewerContainer.appendChild(root);

  let disposed = false;
  renderLoading(root, pair);

  void (async () => {
    try {
      const sources = await loadDefaultTleSources();
      if (disposed) {
        return;
      }
      const tleRecords = parseRuntimeTleSources(sources);
      const timeWindow = buildDefaultTimeWindow();
      const result = computeRuntimeProjection({
        stationA: pair.stationA,
        stationB: pair.stationB,
        timeWindow,
        tleRecords
      });
      if (disposed) {
        return;
      }
      renderResult(root, pair, result);
    } catch (error) {
      if (disposed) {
        return;
      }
      const message =
        error instanceof Error ? error.message : "Unknown failure while loading TLE fixtures.";
      renderError(root, message);
    }
  })();

  return {
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      if (root.parentElement) {
        root.parentElement.removeChild(root);
      }
    }
  };
}
