import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../telemetry/document-telemetry";
import type {
  PhysicalInputOrbitClass,
  PhysicalInputState
} from "../physical-input/physical-input";
import {
  COMMUNICATION_RATE_CLASS_LABELS,
  COMMUNICATION_RATE_CLASS_ORDER,
  COMMUNICATION_RATE_FOOTNOTE,
  COMMUNICATION_RATE_ORBIT_ORDER,
  COMMUNICATION_RATE_SOURCE_LABEL,
  COMMUNICATION_RATE_TRUTH_STATE,
  createCommunicationRateSnapshot,
  formatCommunicationRateClassLabel,
  formatCommunicationRateOrbitLabel,
  type CommunicationRateClass,
  type CommunicationRateClassPoint,
  type CommunicationRateSnapshot
} from "./communication-rate";

interface PhysicalInputReadable {
  getState(): PhysicalInputState;
  subscribe(listener: (state: PhysicalInputState) => void): () => void;
}

interface BootstrapCommunicationRateSectionOptions {
  container: HTMLElement;
  controller: PhysicalInputReadable;
}

interface BootstrapCommunicationRateSectionElements {
  root: HTMLElement;
  heading: HTMLSpanElement;
  currentClass: HTMLSpanElement;
  source: HTMLSpanElement;
  footnote: HTMLSpanElement;
  chart: HTMLDivElement;
  description: HTMLParagraphElement;
  tableToggle: HTMLButtonElement;
  tableRegion: HTMLDivElement;
  tableBody: HTMLTableSectionElement;
  liveRegion: HTMLSpanElement;
}

const COMMUNICATION_RATE_TELEMETRY_KEYS = [
  "communicationRateScenarioId",
  "communicationRateCurrentClass",
  "communicationRateSource",
  "communicationRateTruthState",
  "communicationRateNumericDisplayAllowed",
  "communicationRatePointCount"
] as const;

const CHART_WIDTH = 340;
const CHART_HEIGHT = 166;
const PLOT_LEFT = 82;
const PLOT_RIGHT = 316;
const CLASS_Y_POSITION: Record<CommunicationRateClass, number> = {
  "candidate-capacity-context-class": 32,
  "continuity-context-class": 80,
  "guard-context-class": 128
};
const SERIES_STYLE: Record<
  PhysicalInputOrbitClass,
  {
    stroke: string;
    dash: string;
    marker: "circle" | "square" | "diamond";
    textOffset: number;
    patternLabel: string;
  }
> = {
  leo: {
    stroke: "#8bd7ff",
    dash: "",
    marker: "circle",
    textOffset: -10,
    patternLabel: "solid line with circle markers"
  },
  meo: {
    stroke: "#f7d976",
    dash: "8 5",
    marker: "square",
    textOffset: 5,
    patternLabel: "dashed line with square markers"
  },
  geo: {
    stroke: "#ffb5a8",
    dash: "2 6",
    marker: "diamond",
    textOffset: 18,
    patternLabel: "dotted line with diamond markers"
  }
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatWindowLabel(window: CommunicationRateClassPoint["window"]): string {
  const startPercent = Math.round(window.startRatio * 100);
  const stopPercent = Math.round(window.stopRatio * 100);
  return `${window.contextLabel} (${startPercent}-${stopPercent}%)`;
}

function formatCurrentClass(
  currentClass: CommunicationRateSnapshot["currentClass"]
): string {
  if (currentClass === "unavailable") {
    return "Unavailable";
  }

  return formatCommunicationRateClassLabel(currentClass);
}

function createElements(
  container: HTMLElement
): BootstrapCommunicationRateSectionElements {
  container.innerHTML = `
    <section
      class="communication-rate-section"
      data-communication-rate-section="bootstrap"
      aria-labelledby="communication-rate-heading"
    >
      <div class="communication-rate-section__header">
        <span class="communication-rate-section__eyebrow">Communication Rate</span>
        <span
          id="communication-rate-heading"
          class="communication-rate-section__heading"
          data-communication-rate-field="heading"
        >Modeled network-speed class</span>
        <span
          class="communication-rate-section__note"
          data-communication-rate-field="footnote"
        ></span>
      </div>
      <div class="communication-rate-section__summary">
        <div class="communication-rate-section__summary-item">
          <span class="communication-rate-section__label">Current class</span>
          <span
            class="communication-rate-section__value"
            data-communication-rate-field="current-class"
          ></span>
        </div>
        <div class="communication-rate-section__summary-item">
          <span class="communication-rate-section__label">Source</span>
          <span
            class="communication-rate-section__value"
            data-communication-rate-field="source"
          ></span>
        </div>
      </div>
      <div
        class="communication-rate-section__class-key"
        data-communication-rate-class-key="true"
        aria-label="Modeled network-speed class labels"
      >
        <span>${COMMUNICATION_RATE_CLASS_LABELS["candidate-capacity-context-class"]}</span>
        <span>${COMMUNICATION_RATE_CLASS_LABELS["continuity-context-class"]}</span>
        <span>${COMMUNICATION_RATE_CLASS_LABELS["guard-context-class"]}</span>
      </div>
      <div
        class="communication-rate-section__series-key"
        data-communication-rate-series-key="true"
        aria-label="Orbit series line styles and marker shapes"
      >
        <span data-communication-rate-series-key-item="leo">LEO solid line, circle markers</span>
        <span data-communication-rate-series-key-item="meo">MEO dashed line, square markers</span>
        <span data-communication-rate-series-key-item="geo">GEO dotted line, diamond markers</span>
      </div>
      <div
        class="communication-rate-section__chart"
        data-communication-rate-chart="class-trend"
        tabindex="0"
        aria-labelledby="communication-rate-heading"
        aria-describedby="communication-rate-description"
      ></div>
      <p
        id="communication-rate-description"
        class="communication-rate-section__description"
        data-communication-rate-description="true"
      ></p>
      <button
        type="button"
        class="communication-rate-section__table-toggle"
        data-communication-rate-table-toggle="true"
        aria-expanded="false"
        aria-controls="communication-rate-table-region"
      >
        Table fallback
      </button>
      <div
        id="communication-rate-table-region"
        class="communication-rate-section__table-region"
        data-communication-rate-table-region="true"
        hidden
      >
        <table class="communication-rate-section__table" data-communication-rate-table="true">
          <caption>Communication rate modeled-class fallback</caption>
          <thead>
            <tr>
              <th scope="col">Window</th>
              <th scope="col">Orbit class</th>
              <th scope="col">Candidate context</th>
              <th scope="col">Modeled network-speed class</th>
              <th scope="col">Provenance</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody data-communication-rate-table-body="true"></tbody>
        </table>
      </div>
      <span
        class="communication-rate-section__live"
        data-communication-rate-live-region="true"
        aria-live="polite"
      ></span>
    </section>
  `;

  const root = container.querySelector<HTMLElement>(
    "[data-communication-rate-section='bootstrap']"
  );
  const heading = container.querySelector<HTMLSpanElement>(
    "[data-communication-rate-field='heading']"
  );
  const currentClass = container.querySelector<HTMLSpanElement>(
    "[data-communication-rate-field='current-class']"
  );
  const source = container.querySelector<HTMLSpanElement>(
    "[data-communication-rate-field='source']"
  );
  const footnote = container.querySelector<HTMLSpanElement>(
    "[data-communication-rate-field='footnote']"
  );
  const chart = container.querySelector<HTMLDivElement>(
    "[data-communication-rate-chart='class-trend']"
  );
  const description = container.querySelector<HTMLParagraphElement>(
    "[data-communication-rate-description='true']"
  );
  const tableToggle = container.querySelector<HTMLButtonElement>(
    "[data-communication-rate-table-toggle='true']"
  );
  const tableRegion = container.querySelector<HTMLDivElement>(
    "[data-communication-rate-table-region='true']"
  );
  const tableBody = container.querySelector<HTMLTableSectionElement>(
    "[data-communication-rate-table-body='true']"
  );
  const liveRegion = container.querySelector<HTMLSpanElement>(
    "[data-communication-rate-live-region='true']"
  );

  if (
    !root ||
    !heading ||
    !currentClass ||
    !source ||
    !footnote ||
    !chart ||
    !description ||
    !tableToggle ||
    !tableRegion ||
    !tableBody ||
    !liveRegion
  ) {
    throw new Error("Missing bootstrap communication-rate section elements");
  }

  return {
    root,
    heading,
    currentClass,
    source,
    footnote,
    chart,
    description,
    tableToggle,
    tableRegion,
    tableBody,
    liveRegion
  };
}

function createPointKey(point: CommunicationRateClassPoint): string {
  return [
    point.window.startRatio.toFixed(4),
    point.window.stopRatio.toFixed(4),
    point.orbitClass
  ].join(":");
}

function sortPoints(
  points: Iterable<CommunicationRateClassPoint>
): CommunicationRateClassPoint[] {
  return Array.from(points).sort((left, right) => {
    if (left.window.startRatio !== right.window.startRatio) {
      return left.window.startRatio - right.window.startRatio;
    }

    return (
      COMMUNICATION_RATE_ORBIT_ORDER.indexOf(left.orbitClass) -
      COMMUNICATION_RATE_ORBIT_ORDER.indexOf(right.orbitClass)
    );
  });
}

function resolveWindowKey(point: CommunicationRateClassPoint): string {
  return `${point.window.startRatio.toFixed(4)}:${point.window.stopRatio.toFixed(4)}`;
}

function createWindowPositions(
  points: ReadonlyArray<CommunicationRateClassPoint>
): Map<string, number> {
  const windowKeys = Array.from(new Set(points.map((point) => resolveWindowKey(point))));
  const positions = new Map<string, number>();

  for (let index = 0; index < windowKeys.length; index += 1) {
    const x =
      windowKeys.length === 1
        ? (PLOT_LEFT + PLOT_RIGHT) / 2
        : PLOT_LEFT +
          (index / Math.max(1, windowKeys.length - 1)) * (PLOT_RIGHT - PLOT_LEFT);
    positions.set(windowKeys[index], x);
  }

  return positions;
}

function formatPointShortLabel(classId: CommunicationRateClass): string {
  switch (classId) {
    case "candidate-capacity-context-class":
      return "Capacity";
    case "continuity-context-class":
      return "Continuity";
    case "guard-context-class":
      return "Guard";
  }
}

function createMarkerMarkup(point: CommunicationRateClassPoint, x: number): string {
  const style = SERIES_STYLE[point.orbitClass];
  const y = CLASS_Y_POSITION[point.classId];
  const orbitLabel = formatCommunicationRateOrbitLabel(point.orbitClass);
  const pointLabel = formatPointShortLabel(point.classId);
  const title = `${orbitLabel}: ${point.label}`;
  const marker =
    style.marker === "circle"
      ? `<circle cx="${x}" cy="${y}" r="4.6"></circle>`
      : style.marker === "square"
        ? `<rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" rx="1"></rect>`
        : `<path d="M ${x} ${y - 6} L ${x + 6} ${y} L ${x} ${y + 6} L ${x - 6} ${y} Z"></path>`;

  return `
    <g
      class="communication-rate-chart__marker communication-rate-chart__marker--${point.orbitClass}"
      data-communication-rate-marker-orbit="${point.orbitClass}"
      data-communication-rate-marker-class="${point.classId}"
    >
      <title>${escapeHtml(title)}</title>
      ${marker}
      <text
        class="communication-rate-chart__point-label"
        x="${Math.min(CHART_WIDTH - 56, x + 8)}"
        y="${y + style.textOffset}"
      >${escapeHtml(pointLabel)}</text>
    </g>
  `;
}

function createSeriesPathMarkup(
  orbitClass: PhysicalInputOrbitClass,
  points: ReadonlyArray<CommunicationRateClassPoint>,
  windowPositions: Map<string, number>
): string {
  const style = SERIES_STYLE[orbitClass];
  const orbitPoints = points.filter((point) => point.orbitClass === orbitClass);
  const pathData = orbitPoints
    .map((point, index) => {
      const x = windowPositions.get(resolveWindowKey(point)) ?? PLOT_LEFT;
      const y = CLASS_Y_POSITION[point.classId];
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const markers = orbitPoints
    .map((point) =>
      createMarkerMarkup(point, windowPositions.get(resolveWindowKey(point)) ?? PLOT_LEFT)
    )
    .join("");

  return `
    <g
      class="communication-rate-chart__series communication-rate-chart__series--${orbitClass}"
      data-communication-rate-series="${orbitClass}"
      data-communication-rate-line-style="${escapeHtml(style.patternLabel)}"
    >
      <path
        class="communication-rate-chart__line"
        d="${escapeHtml(pathData)}"
        stroke="${style.stroke}"
        stroke-dasharray="${style.dash}"
      ></path>
      ${markers}
    </g>
  `;
}

function createChartMarkup(
  points: ReadonlyArray<CommunicationRateClassPoint>
): string {
  if (points.length === 0) {
    return `
      <div class="communication-rate-section__empty" data-communication-rate-empty="true">
        No bounded communication-rate class is available for this window.
      </div>
    `;
  }

  const windowPositions = createWindowPositions(points);
  const gridRows = COMMUNICATION_RATE_CLASS_ORDER.map((classId) => {
    const y = CLASS_Y_POSITION[classId];
    return `
      <g class="communication-rate-chart__class-row" data-communication-rate-axis-class="${classId}">
        <line x1="${PLOT_LEFT}" x2="${PLOT_RIGHT}" y1="${y}" y2="${y}"></line>
        <text x="8" y="${y + 4}">${formatPointShortLabel(classId)}</text>
      </g>
    `;
  }).join("");
  const xAxisLabels = Array.from(windowPositions.entries())
    .map(([windowKey, x], index) => {
      const point = points.find((candidate) => resolveWindowKey(candidate) === windowKey);
      const label = point ? formatWindowLabel(point.window) : `Window ${index + 1}`;
      return `
        <text
          class="communication-rate-chart__window-label"
          x="${x}"
          y="${CHART_HEIGHT - 8}"
          text-anchor="middle"
        >W${index + 1}</text>
        <title>${escapeHtml(label)}</title>
      `;
    })
    .join("");
  const series = COMMUNICATION_RATE_ORBIT_ORDER.map((orbitClass) =>
    createSeriesPathMarkup(orbitClass, points, windowPositions)
  ).join("");

  return `
    <svg
      class="communication-rate-chart"
      data-communication-rate-svg="true"
      viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}"
      role="img"
      aria-hidden="true"
    >
      <rect class="communication-rate-chart__frame" x="0" y="0" width="${CHART_WIDTH}" height="${CHART_HEIGHT}" rx="6"></rect>
      ${gridRows}
      <line class="communication-rate-chart__axis" x1="${PLOT_LEFT}" x2="${PLOT_RIGHT}" y1="${CHART_HEIGHT - 24}" y2="${CHART_HEIGHT - 24}"></line>
      ${xAxisLabels}
      ${series}
    </svg>
  `;
}

function renderTableRows(
  elements: BootstrapCommunicationRateSectionElements,
  points: ReadonlyArray<CommunicationRateClassPoint>
): void {
  elements.tableBody.innerHTML = points
    .map((point) => {
      return `
        <tr
          data-communication-rate-table-row="true"
          data-communication-rate-row-orbit="${point.orbitClass}"
          data-communication-rate-row-class="${point.classId}"
        >
          <td>${escapeHtml(formatWindowLabel(point.window))}</td>
          <td>${formatCommunicationRateOrbitLabel(point.orbitClass)}</td>
          <td>${escapeHtml(point.candidateContextIds.join(", "))}</td>
          <td>${point.label}</td>
          <td>${COMMUNICATION_RATE_SOURCE_LABEL}</td>
          <td>${COMMUNICATION_RATE_FOOTNOTE}</td>
        </tr>
      `;
    })
    .join("");
}

function createDescription(snapshot: CommunicationRateSnapshot): string {
  return [
    "Communication rate.",
    `Modeled network-speed class: ${formatCurrentClass(snapshot.currentClass)}.`,
    `Source: ${COMMUNICATION_RATE_SOURCE_LABEL}.`,
    `Window: ${formatWindowLabel(snapshot.activeWindow)}.`,
    COMMUNICATION_RATE_FOOTNOTE
  ].join(" ");
}

function resolveMotionPreference(): "reduce" | "no-preference" {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
    ? "reduce"
    : "no-preference";
}

function renderState(
  elements: BootstrapCommunicationRateSectionElements,
  snapshot: CommunicationRateSnapshot,
  points: ReadonlyArray<CommunicationRateClassPoint>,
  previousClass: CommunicationRateSnapshot["currentClass"] | null
): void {
  const currentClass = formatCurrentClass(snapshot.currentClass);
  const description = createDescription(snapshot);

  elements.currentClass.textContent = currentClass;
  elements.source.textContent = COMMUNICATION_RATE_SOURCE_LABEL;
  elements.footnote.textContent = snapshot.footnote;
  elements.chart.innerHTML = createChartMarkup(points);
  elements.chart.tabIndex = points.length > 0 ? 0 : -1;
  elements.description.textContent = description;
  elements.liveRegion.textContent =
    previousClass && previousClass !== snapshot.currentClass ? description : "";
  renderTableRows(elements, points);

  elements.root.dataset.communicationRateScenarioId = snapshot.scenarioId;
  elements.root.dataset.communicationRateCurrentClass = snapshot.currentClass;
  elements.root.dataset.communicationRateSource = COMMUNICATION_RATE_SOURCE_LABEL;
  elements.root.dataset.communicationRateTruthState = COMMUNICATION_RATE_TRUTH_STATE;
  elements.root.dataset.communicationRateNumericDisplayAllowed = "false";
  elements.root.dataset.communicationRatePointCount = String(points.length);
  elements.root.dataset.communicationRateMotion = resolveMotionPreference();

  syncDocumentTelemetry({
    communicationRateScenarioId: snapshot.scenarioId,
    communicationRateCurrentClass: snapshot.currentClass,
    communicationRateSource: COMMUNICATION_RATE_SOURCE_LABEL,
    communicationRateTruthState: COMMUNICATION_RATE_TRUTH_STATE,
    communicationRateNumericDisplayAllowed: "false",
    communicationRatePointCount: String(points.length)
  });
}

function clearDocumentState(): void {
  clearDocumentTelemetry(COMMUNICATION_RATE_TELEMETRY_KEYS);
}

export function mountBootstrapCommunicationRateSection({
  container,
  controller
}: BootstrapCommunicationRateSectionOptions): () => void {
  const elements = createElements(container);
  const observedPoints = new Map<string, CommunicationRateClassPoint>();
  let observedScenarioId: string | null = null;
  let previousClass: CommunicationRateSnapshot["currentClass"] | null = null;
  let tableExpanded = false;

  const setTableExpanded = (expanded: boolean): void => {
    tableExpanded = expanded;
    elements.tableToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    elements.tableRegion.hidden = !expanded;
  };

  const render = (state: PhysicalInputState): void => {
    const snapshot = createCommunicationRateSnapshot(state);

    if (observedScenarioId !== snapshot.scenarioId) {
      observedScenarioId = snapshot.scenarioId;
      observedPoints.clear();
    }

    for (const point of snapshot.points) {
      observedPoints.set(createPointKey(point), point);
    }

    const points = sortPoints(observedPoints.values());
    renderState(elements, snapshot, points, previousClass);
    previousClass = snapshot.currentClass;
    setTableExpanded(tableExpanded);
  };

  const handleToggleClick = (): void => {
    setTableExpanded(!tableExpanded);
  };

  elements.tableToggle.addEventListener("click", handleToggleClick);
  render(controller.getState());

  const unsubscribe = controller.subscribe((state) => {
    render(state);
  });

  return () => {
    unsubscribe();
    elements.tableToggle.removeEventListener("click", handleToggleClick);
    clearDocumentState();
    container.replaceChildren();
  };
}
