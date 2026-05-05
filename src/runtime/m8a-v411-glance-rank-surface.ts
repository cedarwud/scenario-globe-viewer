import type {
  M8aV4EndpointProjection,
  M8aV4OrbitClass,
  M8aV46dSimulationHandoverWindowId
} from "./m8a-v4-ground-station-projection";

export const M8A_V411_GLANCE_RANK_SURFACE_VERSION =
  "m8a-v4.11-glance-rank-surface-slice1-runtime.v1";
export const M8A_V411_SOURCE_PROVENANCE_BADGE =
  "TLE: CelesTrak NORAD GP · fetched 2026-04-26 · 13 actors";
// Conv 3: corner badge becomes a ≤24×24 invisible placeholder; content moved to footer chip system
export const M8A_V411_CORNER_BADGE_PLACEHOLDER_SIZE_PX = 24;
export const M8A_V411_CORNER_BADGE_CONV3_ROLE = "placeholder-non-visible";
export const M8A_V411_GROUND_ORBIT_EVIDENCE_TRIPLET =
  "LEO ✓ · MEO ✓ · GEO ✓";
export const M8A_V411_GROUND_STATION_SHORT_CHIP_COPY =
  "LEO MEO GEO ✓";
export const M8A_V411_GROUND_STATION_SHORT_CHIP_MAX_WIDTH_PX = 96;
export const M8A_V411_GROUND_STATION_SHORT_CHIP_MAX_HEIGHT_PX = 18;
export const M8A_V411_GROUND_STATION_SHORT_CHIP_FONT_SIZE_PX = 11;
export const M8A_V411_DEMOTED_ACTOR_OPACITY = 0.3;

const M8A_V411_MICRO_CUE_COPY = {
  "leo-acquisition-context": "focus · LEO",
  "leo-aging-pressure": "pressure · LEO",
  "meo-continuity-hold": "hold · MEO",
  "leo-reentry-candidate": "re-entry · LEO",
  "geo-continuity-guard": "guard · GEO"
} satisfies Record<M8aV46dSimulationHandoverWindowId, string>;

export interface M8aV411ScreenPoint {
  projected: boolean;
  inFrontOfCamera: boolean;
  x: number;
  y: number;
}

export interface M8aV411OrbitChipActor {
  actorId: string;
  orbitClass: M8aV4OrbitClass;
  emphasis: string;
  renderPositionEcefMeters: {
    x: number;
    y: number;
    z: number;
  };
}

interface M8aV411GlanceRankRenderOptions {
  root: HTMLElement;
  actors: readonly M8aV411OrbitChipActor[];
  endpoints: readonly M8aV4EndpointProjection[];
  requiredPrecisionBadge: string;
  projectActor: (actor: M8aV411OrbitChipActor) => M8aV411ScreenPoint;
  projectEndpoint: (
    endpoint: M8aV4EndpointProjection
  ) => M8aV411ScreenPoint;
}

export function resolveM8aV411MicroCueCopy(
  windowId: M8aV46dSimulationHandoverWindowId
): string {
  return M8A_V411_MICRO_CUE_COPY[windowId];
}

export function ensureM8aV411GlanceRankStructure(root: HTMLElement): void {
  if (!root.querySelector("[data-m8a-v411-orbit-chip-layer='true']")) {
    root.insertAdjacentHTML(
      "afterbegin",
      `<div class="m8a-v411-product-ux__orbit-chip-layer" data-m8a-v411-orbit-chip-layer="true" aria-hidden="true"></div>`
    );
  }

  if (!root.querySelector("[data-m8a-v411-ground-chip-layer='true']")) {
    root.insertAdjacentHTML(
      "afterbegin",
      `<div class="m8a-v411-product-ux__ground-chip-layer" data-m8a-v411-ground-chip-layer="true" aria-label="Ground station precision and orbit evidence chips"></div>`
    );
  }

  if (!root.querySelector("[data-m8a-v411-provenance-badge='true']")) {
    root.insertAdjacentHTML(
      "beforeend",
      `<div class="m8a-v411-product-ux__provenance-badge" data-m8a-v411-provenance-badge="true" data-m8a-v48-info-class="fixed">${M8A_V411_SOURCE_PROVENANCE_BADGE}</div>`
    );
  }
}

export function setM8aV411GlanceElementVisible(
  element: HTMLElement,
  visible: boolean
): void {
  element.hidden = !visible;
  element.setAttribute("aria-hidden", visible ? "false" : "true");
}

export function renderM8aV411GlanceRankSurface({
  root,
  actors,
  endpoints,
  requiredPrecisionBadge,
  projectActor,
  projectEndpoint
}: M8aV411GlanceRankRenderOptions): void {
  renderM8aV411OrbitClassChips(root, actors, projectActor);
  renderM8aV411GroundStationChips(
    root,
    endpoints,
    requiredPrecisionBadge,
    projectEndpoint
  );
  syncM8aV411ProvenanceBadge(root, actors.length);
}

function resolveM8aV411OrbitClassToken(
  orbitClass: M8aV4OrbitClass
): "LEO" | "MEO" | "GEO" {
  switch (orbitClass) {
    case "leo":
      return "LEO";
    case "meo":
      return "MEO";
    case "geo":
      return "GEO";
  }
}

function renderM8aV411GroundShortChipTokens(
  endpointId: string,
  endpointLabel: string
): string {
  void endpointId;
  void endpointLabel;

  return [
    `<span data-m8a-v411-ground-orbit-token="LEO" data-m8a-v411-ground-evidence-strength="strong">LEO</span>`,
    `<span data-m8a-v411-ground-orbit-token="MEO" data-m8a-v411-ground-evidence-strength="strong">MEO</span>`,
    `<span data-m8a-v411-ground-orbit-token="GEO" data-m8a-v411-ground-evidence-strength="strong">GEO</span>`,
    `<span data-m8a-v411-ground-evidence-strength-mark="true" aria-hidden="true">✓</span>`
  ].join("");
}

function getRequiredElement(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);

  if (!element) {
    throw new Error(`Missing V4.11 glance-rank element: ${selector}`);
  }

  return element;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function positionM8aV411Chip(
  element: HTMLElement,
  x: number,
  y: number,
  offsetX: number,
  offsetY: number
): void {
  const margin = 6;
  const left = clamp(x + offsetX, margin, window.innerWidth - margin);
  const top = clamp(y + offsetY, margin, window.innerHeight - margin);

  element.style.left = `${left.toFixed(1)}px`;
  element.style.top = `${top.toFixed(1)}px`;
}

function renderM8aV411OrbitClassChips(
  root: HTMLElement,
  actors: readonly M8aV411OrbitChipActor[],
  projectActor: (actor: M8aV411OrbitChipActor) => M8aV411ScreenPoint
): void {
  const layer = getRequiredElement(
    root,
    "[data-m8a-v411-orbit-chip-layer='true']"
  );
  const actorIds = new Set(actors.map((actor) => actor.actorId));

  for (const chip of layer.querySelectorAll<HTMLElement>(
    "[data-m8a-v411-orbit-class-chip='true']"
  )) {
    if (!actorIds.has(chip.dataset.m8aV411OrbitChipActorId ?? "")) {
      chip.remove();
    }
  }

  for (const actor of actors) {
    let chip = layer.querySelector<HTMLElement>(
      `[data-m8a-v411-orbit-chip-actor-id="${actor.actorId}"]`
    );

    if (!chip) {
      chip = document.createElement("span");
      chip.className = "m8a-v411-product-ux__orbit-chip";
      chip.dataset.m8aV411OrbitClassChip = "true";
      chip.dataset.m8aV411OrbitChipActorId = actor.actorId;
      layer.appendChild(chip);
    }

    const token = resolveM8aV411OrbitClassToken(actor.orbitClass);
    const point = projectActor(actor);
    const visible =
      point.projected &&
      point.inFrontOfCamera &&
      point.x >= -24 &&
      point.x <= window.innerWidth + 24 &&
      point.y >= -24 &&
      point.y <= window.innerHeight + 24;

    chip.textContent = token;
    chip.dataset.m8aV411OrbitClass = token;
    chip.dataset.m8aV411OrbitChipVisible = String(visible);
    chip.dataset.m8aV411OrbitChipEmphasis = actor.emphasis;
    chip.dataset.m8aV411OrbitChipProjection = point.projected
      ? "projected"
      : "not-projected";
    chip.dataset.m8aV411OrbitChipInFront = String(point.inFrontOfCamera);
    const demoted = actor.emphasis === "context";
    chip.dataset.m8aV411OrbitChipDemoted = String(demoted);
    chip.dataset.m8aV411OrbitChipOpacity = demoted
      ? String(M8A_V411_DEMOTED_ACTOR_OPACITY)
      : "1";
    chip.style.opacity = demoted
      ? String(M8A_V411_DEMOTED_ACTOR_OPACITY)
      : "1";
    positionM8aV411Chip(
      chip,
      point.x,
      point.y,
      actor.orbitClass === "meo" ? 18 : actor.orbitClass === "geo" ? 20 : 16,
      actor.orbitClass === "geo" ? -24 : -18
    );
    setM8aV411GlanceElementVisible(chip, visible);
  }
}

function renderM8aV411GroundStationChips(
  root: HTMLElement,
  endpoints: readonly M8aV4EndpointProjection[],
  requiredPrecisionBadge: string,
  projectEndpoint: (
    endpoint: M8aV4EndpointProjection
  ) => M8aV411ScreenPoint
): void {
  const layer = getRequiredElement(
    root,
    "[data-m8a-v411-ground-chip-layer='true']"
  );
  const endpointIds = new Set<string>(
    endpoints.map((endpoint) => endpoint.endpointId)
  );

  for (const chip of layer.querySelectorAll<HTMLElement>(
    "[data-m8a-v411-ground-station-chip='true']"
  )) {
    if (!endpointIds.has(chip.dataset.m8aV411GroundStationEndpointId ?? "")) {
      chip.remove();
    }
  }

  for (const endpoint of endpoints) {
    let group = layer.querySelector<HTMLElement>(
      `[data-m8a-v411-ground-station-endpoint-id="${endpoint.endpointId}"]`
    );

    if (!group) {
      group = document.createElement("div");
      group.className = "m8a-v411-product-ux__ground-chip";
      group.dataset.m8aV411GroundStationChip = "true";
      group.dataset.m8aV411GroundStationShortChip = "true";
      group.dataset.m8aV411GroundStationEndpointId = endpoint.endpointId;
      group.innerHTML = renderM8aV411GroundShortChipTokens(
        endpoint.endpointId,
        endpoint.endpointLabel
      );
      layer.appendChild(group);
    }

    const point = projectEndpoint(endpoint);
    const visible =
      point.projected &&
      point.inFrontOfCamera &&
      point.x >= -40 &&
      point.x <= window.innerWidth + 40 &&
      point.y >= -40 &&
      point.y <= window.innerHeight + 40;
    const verticalOffset = point.y > window.innerHeight * 0.58 ? -28 : 22;

    group.dataset.m8aV411GroundPrecision = requiredPrecisionBadge;
    group.dataset.m8aV411GroundShortChipCopy =
      M8A_V411_GROUND_STATION_SHORT_CHIP_COPY;
    group.dataset.m8aV411GroundShortChipFontSizePx = String(
      M8A_V411_GROUND_STATION_SHORT_CHIP_FONT_SIZE_PX
    );
    group.dataset.m8aV411GroundShortChipMaxWidthPx = String(
      M8A_V411_GROUND_STATION_SHORT_CHIP_MAX_WIDTH_PX
    );
    group.dataset.m8aV411GroundShortChipMaxHeightPx = String(
      M8A_V411_GROUND_STATION_SHORT_CHIP_MAX_HEIGHT_PX
    );
    group.dataset.m8aV411GroundEvidenceStrength = "strong";
    group.dataset.m8aV411GroundChipVisible = String(visible);
    group.dataset.m8aV411GroundChipProjection = point.projected
      ? "projected"
      : "not-projected";
    positionM8aV411Chip(group, point.x, point.y, 0, verticalOffset);
    setM8aV411GlanceElementVisible(group, visible);
  }
}

function syncM8aV411ProvenanceBadge(
  root: HTMLElement,
  actorCount: number
): void {
  const provenanceBadge = getRequiredElement(
    root,
    "[data-m8a-v411-provenance-badge='true']"
  );

  // Conv 3: badge is a ≤24×24 invisible placeholder; visible content moved to footer chip system
  provenanceBadge.textContent = "";
  provenanceBadge.dataset.m8aV411SourceProvenanceBadge =
    M8A_V411_SOURCE_PROVENANCE_BADGE;
  provenanceBadge.dataset.m8aV411SourceProvider = "CelesTrak";
  provenanceBadge.dataset.m8aV411SourceProduct = "NORAD GP";
  provenanceBadge.dataset.m8aV411FetchedDate = "2026-04-26";
  provenanceBadge.dataset.m8aV411ActorCount = String(actorCount);
  provenanceBadge.dataset.m8aV411BadgeConv3Role = M8A_V411_CORNER_BADGE_CONV3_ROLE;
  provenanceBadge.dataset.m8aV411BadgePlaceholderSizePx = String(
    M8A_V411_CORNER_BADGE_PLACEHOLDER_SIZE_PX
  );
  delete provenanceBadge.dataset.m8aV47Action;
  delete provenanceBadge.dataset.m8aV411SourcesTrigger;
  provenanceBadge.removeAttribute("role");
  provenanceBadge.removeAttribute("tabindex");
  provenanceBadge.removeAttribute("aria-label");
  // Keep element in DOM for Slice 1 smoke selector compat; hidden (invisible placeholder)
  setM8aV411GlanceElementVisible(provenanceBadge, false);
}
