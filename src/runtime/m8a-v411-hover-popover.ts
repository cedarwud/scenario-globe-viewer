import {
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION,
  type M8aV4EndpointId,
  type M8aV4OrbitActorProjection,
  type M8aV4OrbitClass,
  type M8aV46dActorId,
  type M8aV46dSimulationHandoverWindow,
  type M8aV46dSimulationHandoverWindowId
} from "./m8a-v4-ground-station-projection";

export const M8A_V411_HOVER_POPOVER_VERSION =
  "m8a-v4.11-hover-popover-slice2-runtime.v1";
export const M8A_V411_HOVER_POPOVER_CONV2_SCHEMA =
  "phase-specific-three-line";
export const M8A_V411_HOVER_POPOVER_DELAY_MS = 150;
export const M8A_V411_HOVER_POPOVER_MAX_WIDTH_PX = 240;
export const M8A_V411_HOVER_POPOVER_MAX_HEIGHT_PX = 140;

type M8aV411HoverTargetKind = "satellite" | "ground-station" | "sequence-rail";

type M8aV411SatelliteRoleToken =
  | "focus"
  | "pressure"
  | "continuity-hold"
  | "re-entry"
  | "candidate"
  | "guard"
  | "fallback";

interface M8aV411WindowSatelliteCopy {
  focusOperatorFamily: string;
  focusOrbitToken: "LEO" | "MEO" | "GEO";
  focusRoleToken: M8aV411SatelliteRoleToken;
  focusLines: readonly [string, string, string];
  candidateLines: readonly [string, string, string] | null;
  fallbackLines: readonly [string, string, string] | null;
  sequenceLines: readonly [string, string, string];
}

interface M8aV411HoverTargetPayload {
  kind: M8aV411HoverTargetKind;
  id: string;
  label: string;
  windowId?: M8aV46dSimulationHandoverWindowId;
  roleToken?: M8aV411SatelliteRoleToken;
  lines: readonly string[];
}

interface M8aV411HoverPopoverControllerOptions {
  pinStateEvidence: (target: HTMLElement) => void;
}

interface M8aV411HoverPopoverController {
  dispose: () => void;
}

interface M8aV411PointerPoint {
  x: number;
  y: number;
}

interface M8aV411HoverPopoverState {
  activeTarget: HTMLElement | null;
  scheduledTarget: HTMLElement | null;
  pointerPoint: M8aV411PointerPoint | null;
  showTimer: number | undefined;
  hideTimer: number | undefined;
  visibleStartedAt: number | null;
}

const M8A_V411_HOVER_POPOVER_ID = "m8a-v411-hover-popover";
const M8A_V411_HOVER_FADE_MS = 180;

const M8A_V411_WINDOW_SATELLITE_COPY: Record<
  M8aV46dSimulationHandoverWindowId,
  M8aV411WindowSatelliteCopy
> = {
  "leo-acquisition-context": {
    focusOperatorFamily: "Eutelsat OneWeb",
    focusOrbitToken: "LEO",
    focusRoleToken: "focus",
    focusLines: [
      "OneWeb LEO · 現在看這顆",
      "連線品質：強",
      "服務時間:~22 分鐘"
    ],
    candidateLines: null,
    fallbackLines: null,
    sequenceLines: [
      "剛接上 LEO",
      "服務時間長:~22 分鐘",
      "下一段:訊號減弱"
    ]
  },
  "leo-aging-pressure": {
    focusOperatorFamily: "Eutelsat OneWeb",
    focusOrbitToken: "LEO",
    focusRoleToken: "pressure",
    focusLines: [
      "OneWeb LEO · 訊號減弱中",
      "切換在 ~10 分鐘",
      "位置條件變差"
    ],
    candidateLines: [
      "SES O3b mPOWER MEO · 即將接手",
      "暫時接住 ~22 分鐘",
      "覆蓋廣 · 延遲略高"
    ],
    fallbackLines: null,
    sequenceLines: [
      "LEO 訊號減弱",
      "位置條件變差",
      "下一段:MEO 暫時接住"
    ]
  },
  "meo-continuity-hold": {
    focusOperatorFamily: "SES O3b mPOWER",
    focusOrbitToken: "MEO",
    focusRoleToken: "continuity-hold",
    focusLines: [
      "SES O3b mPOWER MEO · 暫時接住",
      "暫時接住 ~22 分鐘",
      "新 LEO 即將回來"
    ],
    candidateLines: null,
    fallbackLines: null,
    sequenceLines: [
      "MEO 暫時接住",
      "覆蓋廣 · 延遲略高",
      "下一段:新 LEO 候選"
    ]
  },
  "leo-reentry-candidate": {
    focusOperatorFamily: "Eutelsat OneWeb",
    focusOrbitToken: "LEO",
    focusRoleToken: "re-entry",
    focusLines: [
      "OneWeb LEO · 候選",
      "候選品質:強",
      "若切回:~22 分鐘"
    ],
    candidateLines: [
      "SES O3b mPOWER MEO · 還在接住",
      "可以等決定",
      "MEO 仍 backstop"
    ],
    fallbackLines: null,
    sequenceLines: [
      "新 LEO 候選回來",
      "切回後可有 ~22 分鐘低延遲",
      "MEO 仍接住可緩決定"
    ]
  },
  "geo-continuity-guard": {
    focusOperatorFamily: "Singtel / SES",
    focusOrbitToken: "GEO",
    focusRoleToken: "guard",
    focusLines: [
      "Singtel/SES GEO · 保底覆蓋",
      "永遠連得到",
      "序列即將結束"
    ],
    candidateLines: null,
    fallbackLines: null,
    sequenceLines: [
      "GEO 保底覆蓋",
      "永遠連得到",
      "序列在這裡結束"
    ]
  }
};

const M8A_V411_GROUND_STATION_HOVER_LINES = {
  "tw-cht-multi-orbit-ground-infrastructure": [
    "Chunghwa Telecom 地面站",
    "operator-family precision",
    "LEO MEO GEO 三軌道資料"
  ],
  "sg-speedcast-singapore-teleport": [
    "Speedcast Singapore Teleport",
    "operator-family precision",
    "LEO MEO GEO 三軌道資料"
  ]
} satisfies Record<M8aV4EndpointId, readonly [string, string, string]>;

const installedControllers = new WeakMap<
  HTMLElement,
  M8aV411HoverPopoverController
>();

function resolveOrbitToken(orbitClass: M8aV4OrbitClass): "LEO" | "MEO" | "GEO" {
  switch (orbitClass) {
    case "leo":
      return "LEO";
    case "meo":
      return "MEO";
    case "geo":
      return "GEO";
  }
}

function resolveActorOperatorFamily(
  actor: M8aV4OrbitActorProjection
): string {
  if (actor.actorId.startsWith("oneweb-")) {
    return "Eutelsat OneWeb";
  }

  if (actor.actorId.startsWith("o3b-mpower-")) {
    return "SES O3b mPOWER";
  }

  if (actor.actorId === "st-2-geo-continuity-anchor") {
    return "Singtel / SES";
  }

  return "SES GEO";
}

function resolveSatelliteRoleToken(
  actorId: M8aV46dActorId,
  activeWindow: M8aV46dSimulationHandoverWindow
): M8aV411SatelliteRoleToken {
  const storyboard = M8A_V411_WINDOW_SATELLITE_COPY[activeWindow.windowId];

  if (actorId === activeWindow.displayRepresentativeActorId) {
    return storyboard.focusRoleToken;
  }

  if (activeWindow.candidateContextActorIds.includes(actorId)) {
    return "candidate";
  }

  if (activeWindow.fallbackContextActorIds.includes(actorId)) {
    return actorId === "st-2-geo-continuity-anchor" ? "guard" : "fallback";
  }

  return "candidate";
}

function resolveSatelliteHoverLines(
  actor: M8aV4OrbitActorProjection,
  roleToken: M8aV411SatelliteRoleToken,
  activeWindow: M8aV46dSimulationHandoverWindow
): readonly [string, string, string] {
  const windowCopy = M8A_V411_WINDOW_SATELLITE_COPY[activeWindow.windowId];

  if (actor.actorId === activeWindow.displayRepresentativeActorId) {
    return windowCopy.focusLines;
  }

  if (windowCopy.candidateLines) {
    const wantsMeoCandidate =
      activeWindow.windowId === "leo-aging-pressure" ||
      activeWindow.windowId === "leo-reentry-candidate";

    if (wantsMeoCandidate && actor.orbitClass === "meo") {
      const isFirstMeo =
        activeWindow.candidateContextActorIds.find(
          (candidateId) => candidateId.includes("meo")
        ) === actor.actorId;

      if (isFirstMeo) {
        return windowCopy.candidateLines;
      }
    }
  }

  const orbitToken = resolveOrbitToken(actor.orbitClass);
  const operator = resolveActorOperatorFamily(actor);
  const roleLine = resolveAmbientRoleLine(roleToken);
  const ambientHint = resolveAmbientHint(actor.orbitClass, activeWindow);

  return [`${operator} ${orbitToken} · ${roleLine}`, ambientHint, "模擬展示"];
}

function resolveAmbientRoleLine(
  roleToken: M8aV411SatelliteRoleToken
): string {
  switch (roleToken) {
    case "focus":
      return "焦點角色";
    case "pressure":
      return "訊號減弱中";
    case "continuity-hold":
      return "暫時接住";
    case "re-entry":
      return "候選";
    case "candidate":
      return "候選";
    case "guard":
      return "保底覆蓋";
    case "fallback":
      return "保底覆蓋";
  }
}

function resolveAmbientHint(
  orbitClass: M8aV4OrbitClass,
  activeWindow: M8aV46dSimulationHandoverWindow
): string {
  if (orbitClass === "geo") {
    return "保底覆蓋待命";
  }

  if (orbitClass === "meo") {
    if (activeWindow.windowId === "leo-aging-pressure") {
      return "即將接手";
    }
    return "ambient context";
  }

  if (activeWindow.windowId === "leo-reentry-candidate") {
    return "候選品質依位置條件";
  }

  return "ambient context";
}

function setHoverTargetPayload(
  target: HTMLElement,
  payload: M8aV411HoverTargetPayload
): void {
  target.dataset.m8aV411HoverTarget = "true";
  target.dataset.m8aV411HoverTargetKind = payload.kind;
  target.dataset.m8aV411HoverTargetId = payload.id;
  target.dataset.m8aV411HoverLineCount = String(payload.lines.length);
  target.dataset.m8aV411HoverPinRole = "state-evidence";
  target.dataset.m8aV411HoverVersion = M8A_V411_HOVER_POPOVER_VERSION;
  target.dataset.m8aV411HoverConv2Schema = "phase-specific-three-line";
  target.dataset.m8aV48InfoClass = "control";

  if (payload.windowId) {
    target.dataset.m8aV411HoverWindowId = payload.windowId;
  } else {
    delete target.dataset.m8aV411HoverWindowId;
  }

  if (payload.roleToken) {
    target.dataset.m8aV411HoverRoleToken = payload.roleToken;
  } else {
    delete target.dataset.m8aV411HoverRoleToken;
  }

  for (let index = 0; index < 5; index += 1) {
    const key = `m8aV411HoverLine${index + 1}` as keyof DOMStringMap;
    const line = payload.lines[index];

    if (line) {
      target.dataset[key] = line;
    } else {
      delete target.dataset[key];
    }
  }

  target.tabIndex = 0;
  target.setAttribute("role", "button");
  target.setAttribute("aria-label", payload.label);
}

function readHoverLines(target: HTMLElement): string[] {
  const count = Number(target.dataset.m8aV411HoverLineCount ?? "0");
  const lines: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const key = `m8aV411HoverLine${index + 1}` as keyof DOMStringMap;
    const line = target.dataset[key];

    if (line) {
      lines.push(line);
    }
  }

  return lines;
}

function renderPopoverLines(popover: HTMLElement, target: HTMLElement): void {
  const lines = readHoverLines(target);

  popover.replaceChildren(
    ...lines.map((line, index) => {
      const row = document.createElement("div");
      row.className = "m8a-v411-hover-popover__line";
      row.dataset.m8aV411HoverPopoverLine = String(index + 1);
      row.textContent = line;
      return row;
    })
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function resolveTargetPoint(target: HTMLElement): M8aV411PointerPoint {
  const rect = target.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function placePopover(
  popover: HTMLElement,
  point: M8aV411PointerPoint
): void {
  const margin = 8;
  const offset = 14;
  const rect = popover.getBoundingClientRect();
  const nextLeft = clamp(
    point.x + offset,
    margin,
    window.innerWidth - Math.max(rect.width, 1) - margin
  );
  const nextTop = clamp(
    point.y + offset,
    margin,
    window.innerHeight - Math.max(rect.height, 1) - margin
  );

  popover.style.left = `${nextLeft.toFixed(1)}px`;
  popover.style.top = `${nextTop.toFixed(1)}px`;
}

function resolveHoverTarget(eventTarget: EventTarget | null): HTMLElement | null {
  if (!(eventTarget instanceof Element)) {
    return null;
  }

  return eventTarget.closest<HTMLElement>("[data-m8a-v411-hover-target='true']");
}

function isWithinTarget(target: HTMLElement, relatedTarget: EventTarget | null): boolean {
  return relatedTarget instanceof Node && target.contains(relatedTarget);
}

function isPointInsideTarget(
  target: HTMLElement,
  point: M8aV411PointerPoint
): boolean {
  const rect = target.getBoundingClientRect();

  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

export function ensureM8aV411HoverPopoverStructure(root: HTMLElement): void {
  root.dataset.m8aV411HoverPopover = M8A_V411_HOVER_POPOVER_VERSION;
  root.dataset.m8aV411HoverSliceScope = "slice2-hover-popover";
  root.dataset.m8aV411HoverConv2Schema = "phase-specific-three-line";
  root.dataset.m8aV411HoverDelayMs = String(M8A_V411_HOVER_POPOVER_DELAY_MS);
  root.dataset.m8aV411HoverPopoverMaxWidthPx = String(
    M8A_V411_HOVER_POPOVER_MAX_WIDTH_PX
  );
  root.dataset.m8aV411HoverPopoverMaxHeightPx = String(
    M8A_V411_HOVER_POPOVER_MAX_HEIGHT_PX
  );

  if (!root.querySelector("[data-m8a-v411-hover-popover='true']")) {
    const popover = document.createElement("div");
    popover.id = M8A_V411_HOVER_POPOVER_ID;
    popover.className = "m8a-v411-product-ux__hover-popover";
    popover.dataset.m8aV411HoverPopover = "true";
    popover.dataset.m8aV411HoverPopoverVersion =
      M8A_V411_HOVER_POPOVER_VERSION;
    popover.dataset.m8aV411HoverState = "idle";
    popover.dataset.m8aV411HoverMaxWidthPx = String(
      M8A_V411_HOVER_POPOVER_MAX_WIDTH_PX
    );
    popover.dataset.m8aV411HoverMaxHeightPx = String(
      M8A_V411_HOVER_POPOVER_MAX_HEIGHT_PX
    );
    popover.setAttribute("role", "tooltip");
    popover.hidden = true;
    root.appendChild(popover);
  }
}

export function syncM8aV411HoverPopoverTargets({
  root,
  activeWindow,
  timeline
}: {
  root: HTMLElement;
  activeWindow: M8aV46dSimulationHandoverWindow;
  timeline: readonly M8aV46dSimulationHandoverWindow[];
}): void {
  ensureM8aV411HoverPopoverStructure(root);

  const orbitLayer = root.querySelector<HTMLElement>(
    "[data-m8a-v411-orbit-chip-layer='true']"
  );

  if (orbitLayer) {
    orbitLayer.setAttribute("aria-hidden", "false");
    orbitLayer.setAttribute(
      "aria-label",
      "Satellite hover evidence targets"
    );
  }

  const actorById = new Map(
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.map((actor) => [
      actor.actorId,
      actor
    ])
  );
  const windowById = new Map(timeline.map((windowDefinition) => [
    windowDefinition.windowId,
    windowDefinition
  ]));

  for (const chip of root.querySelectorAll<HTMLElement>(
    "[data-m8a-v411-orbit-class-chip='true']"
  )) {
    const actorId = chip.dataset.m8aV411OrbitChipActorId as
      | M8aV46dActorId
      | undefined;
    const actor = actorId ? actorById.get(actorId) : undefined;

    if (!actor || !actorId) {
      continue;
    }

    const roleToken = resolveSatelliteRoleToken(actorId, activeWindow);
    const lines = resolveSatelliteHoverLines(actor, roleToken, activeWindow);

    setHoverTargetPayload(chip, {
      kind: "satellite",
      id: actor.actorId,
      label: `${lines[0]} hover evidence`,
      windowId: activeWindow.windowId,
      roleToken,
      lines
    });
  }

  for (const ground of root.querySelectorAll<HTMLElement>(
    "[data-m8a-v411-ground-station-chip='true']"
  )) {
    const endpointId = ground.dataset.m8aV411GroundStationEndpointId as
      | M8aV4EndpointId
      | undefined;
    const endpoint = M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints.find(
      (candidate) => candidate.endpointId === endpointId
    );

    if (!endpoint || !endpointId) {
      continue;
    }

    const lines = M8A_V411_GROUND_STATION_HOVER_LINES[endpointId];

    setHoverTargetPayload(ground, {
      kind: "ground-station",
      id: endpointId,
      label: `${lines[0]} ground-station hover evidence`,
      lines
    });
  }

  for (const mark of root.querySelectorAll<HTMLElement>(
    "[data-m8a-v410-sequence-mark='true']"
  )) {
    const windowId = mark.dataset.m8aV410SequenceWindowId as
      | M8aV46dSimulationHandoverWindowId
      | undefined;
    const windowDefinition = windowId ? windowById.get(windowId) : undefined;

    if (!windowId || !windowDefinition) {
      continue;
    }

    const copy = M8A_V411_WINDOW_SATELLITE_COPY[windowId];

    setHoverTargetPayload(mark, {
      kind: "sequence-rail",
      id: windowId,
      label: `${copy.sequenceLines[0]} sequence hover evidence`,
      windowId,
      lines: copy.sequenceLines
    });
  }
}

export function resolveM8aV411WindowFocusHoverLines(
  windowId: M8aV46dSimulationHandoverWindowId
): readonly [string, string, string] {
  return M8A_V411_WINDOW_SATELLITE_COPY[windowId].focusLines;
}

export function resolveM8aV411WindowCandidateHoverLines(
  windowId: M8aV46dSimulationHandoverWindowId
): readonly [string, string, string] | null {
  return M8A_V411_WINDOW_SATELLITE_COPY[windowId].candidateLines ?? null;
}

export function resolveM8aV411WindowSequenceHoverLines(
  windowId: M8aV46dSimulationHandoverWindowId
): readonly [string, string, string] {
  return M8A_V411_WINDOW_SATELLITE_COPY[windowId].sequenceLines;
}

export function resolveM8aV411WindowGroundStationHoverLines(
  endpointId: M8aV4EndpointId
): readonly [string, string, string] {
  return M8A_V411_GROUND_STATION_HOVER_LINES[endpointId];
}

export function installM8aV411HoverPopoverController(
  root: HTMLElement,
  options: M8aV411HoverPopoverControllerOptions
): M8aV411HoverPopoverController {
  const existing = installedControllers.get(root);

  if (existing) {
    return existing;
  }

  const state: M8aV411HoverPopoverState = {
    activeTarget: null,
    scheduledTarget: null,
    pointerPoint: null,
    showTimer: undefined,
    hideTimer: undefined,
    visibleStartedAt: null
  };

  const getPopover = (): HTMLElement => {
    ensureM8aV411HoverPopoverStructure(root);
    const popover = root.querySelector<HTMLElement>(
      "[data-m8a-v411-hover-popover='true']"
    );

    if (!popover) {
      throw new Error("Missing M8A V4.11 hover popover.");
    }

    return popover;
  };

  const clearShowTimer = (): void => {
    if (typeof state.showTimer === "number") {
      window.clearTimeout(state.showTimer);
      state.showTimer = undefined;
    }
  };

  const clearHideTimer = (): void => {
    if (typeof state.hideTimer === "number") {
      window.clearTimeout(state.hideTimer);
      state.hideTimer = undefined;
    }
  };

  const hidePopover = (immediate = false): void => {
    clearShowTimer();
    clearHideTimer();

    const popover = getPopover();
    const previousTarget = state.activeTarget ?? state.scheduledTarget;

    state.scheduledTarget = null;
    state.activeTarget = null;
    state.visibleStartedAt = null;
    root.dataset.m8aV411HoverPopoverVisible = "false";
    delete root.dataset.m8aV411HoverTargetKind;
    delete root.dataset.m8aV411HoverTargetId;
    delete root.dataset.m8aV411HoverVisibleStartedAt;
    previousTarget?.removeAttribute("aria-describedby");

    if (popover.hidden) {
      popover.dataset.m8aV411HoverState = "idle";
      return;
    }

    popover.dataset.m8aV411HoverState = "leaving";

    if (immediate || prefersReducedMotion()) {
      popover.hidden = true;
      popover.dataset.m8aV411HoverState = "idle";
      popover.replaceChildren();
      return;
    }

    state.hideTimer = window.setTimeout(() => {
      popover.hidden = true;
      popover.dataset.m8aV411HoverState = "idle";
      popover.replaceChildren();
      state.hideTimer = undefined;
    }, M8A_V411_HOVER_FADE_MS);
  };

  const showPopover = (target: HTMLElement): void => {
    clearHideTimer();

    const popover = getPopover();
    const point = state.pointerPoint ?? resolveTargetPoint(target);

    renderPopoverLines(popover, target);
    popover.hidden = false;
    popover.dataset.m8aV411HoverState = "visible";
    popover.dataset.m8aV411HoverTargetKind =
      target.dataset.m8aV411HoverTargetKind ?? "";
    popover.dataset.m8aV411HoverTargetId =
      target.dataset.m8aV411HoverTargetId ?? "";
    popover.dataset.m8aV411HoverWindowId =
      target.dataset.m8aV411HoverWindowId ?? "";
    popover.dataset.m8aV411HoverRoleToken =
      target.dataset.m8aV411HoverRoleToken ?? "";
    state.activeTarget = target;
    state.scheduledTarget = null;
    state.visibleStartedAt = window.performance.now();
    root.dataset.m8aV411HoverPopoverVisible = "true";
    root.dataset.m8aV411HoverTargetKind =
      target.dataset.m8aV411HoverTargetKind ?? "";
    root.dataset.m8aV411HoverTargetId =
      target.dataset.m8aV411HoverTargetId ?? "";
    root.dataset.m8aV411HoverVisibleStartedAt = String(
      state.visibleStartedAt
    );
    target.setAttribute("aria-describedby", M8A_V411_HOVER_POPOVER_ID);
    placePopover(popover, point);
  };

  const schedulePopover = (
    target: HTMLElement,
    point: M8aV411PointerPoint | null
  ): void => {
    clearShowTimer();
    clearHideTimer();
    state.scheduledTarget = target;
    state.pointerPoint = point ?? resolveTargetPoint(target);
    root.dataset.m8aV411HoverScheduledTargetKind =
      target.dataset.m8aV411HoverTargetKind ?? "";
    root.dataset.m8aV411HoverScheduledAt = String(window.performance.now());
    state.showTimer = window.setTimeout(() => {
      state.showTimer = undefined;
      if (state.scheduledTarget === target) {
        showPopover(target);
      }
    }, M8A_V411_HOVER_POPOVER_DELAY_MS);
  };

  const handlePointerOver = (event: PointerEvent): void => {
    const target = resolveHoverTarget(event.target);

    if (!target || isWithinTarget(target, event.relatedTarget)) {
      return;
    }

    schedulePopover(target, { x: event.clientX, y: event.clientY });
  };

  const handlePointerMove = (event: PointerEvent): void => {
    const target = resolveHoverTarget(event.target);

    if (!target) {
      if (state.activeTarget || state.scheduledTarget) {
        hidePopover(false);
      }
      return;
    }

    state.pointerPoint = { x: event.clientX, y: event.clientY };

    if (state.activeTarget && state.activeTarget !== target) {
      hidePopover(false);
      schedulePopover(target, state.pointerPoint);
      return;
    }

    if (state.activeTarget === target) {
      placePopover(getPopover(), state.pointerPoint);
    }
  };

  const handlePointerOut = (event: PointerEvent): void => {
    const target = resolveHoverTarget(event.target);

    if (!target || isWithinTarget(target, event.relatedTarget)) {
      return;
    }

    hidePopover(false);
  };

  const handleWindowPointerMove = (event: PointerEvent): void => {
    const point = { x: event.clientX, y: event.clientY };
    const elementAtPoint = document.elementFromPoint(point.x, point.y);
    const targetAtPoint = resolveHoverTarget(elementAtPoint);
    const target = state.activeTarget ?? state.scheduledTarget;

    if (targetAtPoint) {
      state.pointerPoint = point;

      if (state.activeTarget === targetAtPoint) {
        placePopover(getPopover(), point);
        return;
      }

      if (state.scheduledTarget === targetAtPoint) {
        return;
      }

      hidePopover(false);
      schedulePopover(targetAtPoint, point);
      return;
    }

    if (target && !isPointInsideTarget(target, point)) {
      hidePopover(false);
    }
  };

  const handleFocusIn = (event: FocusEvent): void => {
    const target = resolveHoverTarget(event.target);

    if (!target) {
      return;
    }

    schedulePopover(target, resolveTargetPoint(target));
  };

  const handleFocusOut = (event: FocusEvent): void => {
    const target = resolveHoverTarget(event.target);

    if (!target || isWithinTarget(target, event.relatedTarget)) {
      return;
    }

    hidePopover(false);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    const target = resolveHoverTarget(event.target);

    if (!target) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest("[data-m8a-v47-action]")
    ) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      hidePopover(true);
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      options.pinStateEvidence(target);
      hidePopover(true);
    }
  };

  const handleClick = (event: MouseEvent): void => {
    const target = resolveHoverTarget(event.target);

    if (!target || event.button !== 0) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest("[data-m8a-v47-action]")
    ) {
      return;
    }

    options.pinStateEvidence(target);
    hidePopover(true);
  };

  root.addEventListener("pointerover", handlePointerOver);
  root.addEventListener("pointermove", handlePointerMove);
  root.addEventListener("pointerout", handlePointerOut);
  root.addEventListener("focus", handleFocusIn, true);
  root.addEventListener("focusin", handleFocusIn);
  root.addEventListener("blur", handleFocusOut, true);
  root.addEventListener("focusout", handleFocusOut);
  root.addEventListener("keydown", handleKeyDown);
  root.addEventListener("click", handleClick);
  window.addEventListener("pointermove", handleWindowPointerMove, true);

  const controller = {
    dispose: () => {
      clearShowTimer();
      clearHideTimer();
      root.removeEventListener("pointerover", handlePointerOver);
      root.removeEventListener("pointermove", handlePointerMove);
      root.removeEventListener("pointerout", handlePointerOut);
      root.removeEventListener("focus", handleFocusIn, true);
      root.removeEventListener("focusin", handleFocusIn);
      root.removeEventListener("blur", handleFocusOut, true);
      root.removeEventListener("focusout", handleFocusOut);
      root.removeEventListener("keydown", handleKeyDown);
      root.removeEventListener("click", handleClick);
      window.removeEventListener("pointermove", handleWindowPointerMove, true);
      installedControllers.delete(root);
    }
  };

  installedControllers.set(root, controller);

  return controller;
}
