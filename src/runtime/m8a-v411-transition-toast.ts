import type { M8aV46dSimulationHandoverWindowId } from "./m8a-v4-ground-station-projection";
import { resolveM8aV411MicroCueCopy } from "./m8a-v411-glance-rank-surface";

export const M8A_V411_TRANSIENT_SURFACE_VERSION =
  "m8a-v4.11-transition-toast-slice4-runtime.v1";
export const M8A_V411_TRANSITION_TOAST_DURATION_MS = 2_500;
export const M8A_V411_TRANSITION_TOAST_MAX_COUNT = 2;
export const M8A_V411_TRANSITION_TOAST_MAX_WIDTH_PX = 320;
export const M8A_V411_TRANSITION_TOAST_MAX_CANVAS_WIDTH_RATIO = 0.22;
export const M8A_V411_SCENE_CUE_MAX_WIDTH_PX = 180;
export const M8A_V411_SCENE_CUE_MAX_HEIGHT_PX = 24;
export const M8A_V411_SCENE_CUE_FADE_IN_MS = 200;
export const M8A_V411_SCENE_CUE_PERSIST_MS = 2_000;

export interface M8aV411TransitionEventInput {
  fromWindowId: M8aV46dSimulationHandoverWindowId;
  toWindowId: M8aV46dSimulationHandoverWindowId;
  startedAtEpochMs: number;
}

export interface M8aV411SceneCuePoint {
  x: number;
  y: number;
  projected: boolean;
  inFrontOfCamera?: boolean;
  anchorStatus?: string;
  actorId?: string;
}

interface M8aV411TransitionToastCopy {
  title: string;
  line: string;
}

interface M8aV411TransitionToastRecord extends M8aV411TransitionToastCopy {
  id: string;
  fromWindowId: M8aV46dSimulationHandoverWindowId;
  toWindowId: M8aV46dSimulationHandoverWindowId;
  sceneCueText: string;
  startedAtEpochMs: number;
  expiresAtEpochMs: number;
}

interface M8aV411TransientSurfaceState {
  hasRenderedOnce: boolean;
  lastEventKey: string | null;
  lastAnnouncedEventKey: string | null;
  toasts: M8aV411TransitionToastRecord[];
  timeoutId: number | undefined;
  lastSceneCuePoint: M8aV411SceneCuePoint | null;
  toastSuppressed: boolean;
  suppressedQueueLength: number;
}

const M8A_V411_TOAST_COPY = {
  "leo-acquisition-context": {
    title: "LEO review focus",
    line: "Restart: watch for pressure before the MEO hold."
  },
  "leo-aging-pressure": {
    title: "LEO pressure",
    line: "Continuity will shift to the MEO hold next."
  },
  "meo-continuity-hold": {
    title: "MEO continuity hold",
    line: "MEO holds continuity in this simulation window."
  },
  "leo-reentry-candidate": {
    title: "LEO re-entry",
    line: "GEO will close the sequence as guard context."
  },
  "geo-continuity-guard": {
    title: "GEO guard context",
    line: "Restart to review the sequence again."
  }
} satisfies Record<
  M8aV46dSimulationHandoverWindowId,
  M8aV411TransitionToastCopy
>;

const rootStates = new WeakMap<HTMLElement, M8aV411TransientSurfaceState>();

function getRootState(root: HTMLElement): M8aV411TransientSurfaceState {
  const existing = rootStates.get(root);

  if (existing) {
    return existing;
  }

  const state: M8aV411TransientSurfaceState = {
    hasRenderedOnce: false,
    lastEventKey: null,
    lastAnnouncedEventKey: null,
    toasts: [],
    timeoutId: undefined,
    lastSceneCuePoint: null,
    toastSuppressed: false,
    suppressedQueueLength: 0
  };

  rootStates.set(root, state);
  return state;
}

function eventKey(event: M8aV411TransitionEventInput): string {
  return `${event.fromWindowId}->${event.toWindowId}:${event.startedAtEpochMs}`;
}

function createToastRecord(
  event: M8aV411TransitionEventInput
): M8aV411TransitionToastRecord {
  const copy = M8A_V411_TOAST_COPY[event.toWindowId];

  return {
    id: eventKey(event),
    fromWindowId: event.fromWindowId,
    toWindowId: event.toWindowId,
    title: copy.title,
    line: copy.line,
    sceneCueText: resolveM8aV411MicroCueCopy(event.toWindowId),
    startedAtEpochMs: event.startedAtEpochMs,
    expiresAtEpochMs:
      event.startedAtEpochMs + M8A_V411_TRANSITION_TOAST_DURATION_MS
  };
}

function isVisibleToast(
  toast: M8aV411TransitionToastRecord,
  now: number
): boolean {
  return now < toast.expiresAtEpochMs;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function setHidden(element: HTMLElement, hidden: boolean): void {
  element.hidden = hidden;
  element.setAttribute("aria-hidden", hidden ? "true" : "false");
}

function getRequiredElement(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);

  if (!element) {
    throw new Error(`Missing V4.11 transient surface element: ${selector}`);
  }

  return element;
}

function renderToastElement(
  documentRef: Document,
  toast: M8aV411TransitionToastRecord,
  index: number,
  stackLength: number,
  now: number
): HTMLElement {
  const toastElement = documentRef.createElement("article");
  const elapsedMs = Math.max(0, now - toast.startedAtEpochMs);

  toastElement.className = "m8a-v411-product-ux__transition-toast";
  toastElement.dataset.m8aV411TransitionToast = "true";
  toastElement.dataset.m8aV411TransitionToastVersion =
    M8A_V411_TRANSIENT_SURFACE_VERSION;
  toastElement.dataset.m8aV411TransitionToastWindowId = toast.toWindowId;
  toastElement.dataset.m8aV411TransitionToastFromWindowId =
    toast.fromWindowId;
  toastElement.dataset.m8aV411TransitionToastTitle = toast.title;
  toastElement.dataset.m8aV411TransitionToastLine = toast.line;
  toastElement.dataset.m8aV411TransitionToastDurationMs = String(
    M8A_V411_TRANSITION_TOAST_DURATION_MS
  );
  toastElement.dataset.m8aV411TransitionToastElapsedMs =
    elapsedMs.toFixed(1);
  toastElement.dataset.m8aV411TransitionToastStackIndex = String(index + 1);
  toastElement.dataset.m8aV411TransitionToastStackSize =
    String(stackLength);
  toastElement.dataset.m8aV411TransitionToastMaxWidthPx = String(
    M8A_V411_TRANSITION_TOAST_MAX_WIDTH_PX
  );
  toastElement.dataset.m8aV411TransitionToastMaxCanvasWidthRatio = String(
    M8A_V411_TRANSITION_TOAST_MAX_CANVAS_WIDTH_RATIO
  );
  toastElement.dataset.m8aV48InfoClass = "dynamic";
  toastElement.setAttribute("aria-hidden", "true");
  toastElement.innerHTML = [
    `<strong data-m8a-v411-transition-toast-title="true">${toast.title}</strong>`,
    `<small data-m8a-v411-transition-toast-line="true">${toast.line}</small>`
  ].join("");

  return toastElement;
}

function positionSceneCue(
  cue: HTMLElement,
  point: M8aV411SceneCuePoint | null
): void {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 12;
  const sourceX = point?.x ?? viewportWidth * 0.56;
  const sourceY = point?.y ?? viewportHeight * 0.42;
  const left = clamp(
    sourceX + 30,
    margin,
    viewportWidth - M8A_V411_SCENE_CUE_MAX_WIDTH_PX - margin
  );
  const top = clamp(
    sourceY - 42,
    margin,
    viewportHeight - M8A_V411_SCENE_CUE_MAX_HEIGHT_PX - margin
  );

  cue.style.left = `${left.toFixed(1)}px`;
  cue.style.top = `${top.toFixed(1)}px`;
  cue.dataset.m8aV411SceneCueAnchorX = sourceX.toFixed(1);
  cue.dataset.m8aV411SceneCueAnchorY = sourceY.toFixed(1);
  cue.dataset.m8aV411SceneCueProjected = String(point?.projected ?? false);
  cue.dataset.m8aV411SceneCueInFront = String(
    point?.inFrontOfCamera ?? false
  );
  cue.dataset.m8aV411SceneCueAnchorStatus = point?.anchorStatus ?? "";
  cue.dataset.m8aV411SceneCueActorId = point?.actorId ?? "";
}

function renderSceneCue(
  root: HTMLElement,
  latestToast: M8aV411TransitionToastRecord | null,
  point: M8aV411SceneCuePoint | null,
  now: number
): void {
  const layer = getRequiredElement(
    root,
    "[data-m8a-v411-scene-cue-layer='true']"
  );
  let cue = layer.querySelector<HTMLElement>(
    "[data-m8a-v411-scene-cue='true']"
  );

  if (!cue) {
    cue = document.createElement("div");
    cue.className = "m8a-v411-product-ux__scene-cue";
    cue.dataset.m8aV411SceneCue = "true";
    cue.dataset.m8aV411TransientSurfaceVersion =
      M8A_V411_TRANSIENT_SURFACE_VERSION;
    cue.dataset.m8aV48InfoClass = "dynamic";
    cue.setAttribute("aria-hidden", "true");
    layer.appendChild(cue);
  }

  const elapsedMs = latestToast
    ? Math.max(0, now - latestToast.startedAtEpochMs)
    : Number.POSITIVE_INFINITY;
  const visible =
    Boolean(latestToast) &&
    elapsedMs <
      M8A_V411_SCENE_CUE_FADE_IN_MS + M8A_V411_SCENE_CUE_PERSIST_MS;

  cue.textContent = latestToast?.sceneCueText ?? "";
  cue.dataset.m8aV411SceneCueWindowId = latestToast?.toWindowId ?? "";
  cue.dataset.m8aV411SceneCueText = latestToast?.sceneCueText ?? "";
  cue.dataset.m8aV411SceneCueElapsedMs = Number.isFinite(elapsedMs)
    ? elapsedMs.toFixed(1)
    : "";
  cue.dataset.m8aV411SceneCueMaxWidthPx = String(
    M8A_V411_SCENE_CUE_MAX_WIDTH_PX
  );
  cue.dataset.m8aV411SceneCueMaxHeightPx = String(
    M8A_V411_SCENE_CUE_MAX_HEIGHT_PX
  );
  cue.dataset.m8aV411SceneCueFadeInMs = String(
    M8A_V411_SCENE_CUE_FADE_IN_MS
  );
  cue.dataset.m8aV411SceneCuePersistMs = String(
    M8A_V411_SCENE_CUE_PERSIST_MS
  );
  setHidden(cue, !visible);

  if (visible) {
    positionSceneCue(cue, point);
  }
}

function renderStack(
  root: HTMLElement,
  state: M8aV411TransientSurfaceState,
  now: number
): void {
  state.toasts = state.toasts
    .filter((toast) => isVisibleToast(toast, now))
    .sort((a, b) => a.startedAtEpochMs - b.startedAtEpochMs);

  const stack = getRequiredElement(
    root,
    "[data-m8a-v411-transition-toast-stack='true']"
  );
  const visibleToasts = [...state.toasts].reverse();
  const latestToast = state.toasts[state.toasts.length - 1] ?? null;

  stack.replaceChildren(
    ...visibleToasts.map((toast, index) =>
      renderToastElement(document, toast, index, visibleToasts.length, now)
    )
  );
  stack.dataset.m8aV411TransitionToastStackCount =
    String(visibleToasts.length);
  stack.dataset.m8aV411TransitionToastMaxCount = String(
    M8A_V411_TRANSITION_TOAST_MAX_COUNT
  );
  stack.dataset.m8aV411TransitionToastMaxWidthPx = String(
    M8A_V411_TRANSITION_TOAST_MAX_WIDTH_PX
  );
  stack.dataset.m8aV411TransitionToastMaxCanvasWidthRatio = String(
    M8A_V411_TRANSITION_TOAST_MAX_CANVAS_WIDTH_RATIO
  );
  setHidden(stack, visibleToasts.length === 0);
  renderSceneCue(root, latestToast, state.lastSceneCuePoint, now);
}

function scheduleNextExpiry(
  root: HTMLElement,
  state: M8aV411TransientSurfaceState
): void {
  if (typeof state.timeoutId === "number") {
    window.clearTimeout(state.timeoutId);
    state.timeoutId = undefined;
  }

  const now = Date.now();
  const nextToastExpiry = Math.min(
    ...state.toasts.map((toast) => toast.expiresAtEpochMs)
  );
  const latestToast = state.toasts[state.toasts.length - 1];
  const nextSceneCueExpiry = latestToast
    ? latestToast.startedAtEpochMs +
      M8A_V411_SCENE_CUE_FADE_IN_MS +
      M8A_V411_SCENE_CUE_PERSIST_MS
    : Number.POSITIVE_INFINITY;
  const nextExpiry = Math.min(nextToastExpiry, nextSceneCueExpiry);

  if (!Number.isFinite(nextExpiry)) {
    return;
  }

  state.timeoutId = window.setTimeout(() => {
    state.timeoutId = undefined;
    renderStack(root, state, Date.now());
    scheduleNextExpiry(root, state);
  }, Math.max(0, nextExpiry - now) + 8);
}

export function ensureM8aV411TransientSurfaceStructure(root: HTMLElement): void {
  if (!root.querySelector("[data-m8a-v411-transition-toast-stack='true']")) {
    root.insertAdjacentHTML(
      "afterbegin",
      [
        `<div class="m8a-v411-product-ux__toast-stack"`,
        ` data-m8a-v411-transition-toast-stack="true"`,
        ` data-m8a-v411-transient-surface-version="${M8A_V411_TRANSIENT_SURFACE_VERSION}"`,
        ` data-m8a-v411-transition-toast-stack-count="0"`,
        ` aria-hidden="true" hidden></div>`
      ].join("")
    );
  }

  if (!root.querySelector("[data-m8a-v411-scene-cue-layer='true']")) {
    root.insertAdjacentHTML(
      "afterbegin",
      [
        `<div class="m8a-v411-product-ux__scene-cue-layer"`,
        ` data-m8a-v411-scene-cue-layer="true"`,
        ` data-m8a-v411-transient-surface-version="${M8A_V411_TRANSIENT_SURFACE_VERSION}"`,
        ` aria-hidden="true"></div>`
      ].join("")
    );
  }

  if (!root.querySelector("[data-m8a-v411-transition-toast-status='true']")) {
    root.insertAdjacentHTML(
      "beforeend",
      [
        `<div class="m8a-v411-product-ux__toast-status"`,
        ` data-m8a-v411-transition-toast-status="true"`,
        ` data-m8a-v411-transient-surface-version="${M8A_V411_TRANSIENT_SURFACE_VERSION}"`,
        ` data-m8a-v48-info-class="dynamic"`,
        ` role="status" aria-live="polite" aria-atomic="true"></div>`
      ].join("")
    );
  }
}

export function renderM8aV411TransientSurfaces({
  root,
  activeTransitionEvent,
  sceneCuePoint,
  toastSuppressed = false
}: {
  root: HTMLElement;
  activeTransitionEvent: M8aV411TransitionEventInput | null;
  sceneCuePoint: M8aV411SceneCuePoint | null;
  toastSuppressed?: boolean;
}): void {
  ensureM8aV411TransientSurfaceStructure(root);

  const state = getRootState(root);
  const now = Date.now();
  const status = getRequiredElement(
    root,
    "[data-m8a-v411-transition-toast-status='true']"
  );

  state.lastSceneCuePoint = sceneCuePoint;

  const transitionFromSuppressed = state.toastSuppressed && !toastSuppressed;
  const transitionToSuppressed = !state.toastSuppressed && toastSuppressed;
  state.toastSuppressed = toastSuppressed;

  if (transitionToSuppressed) {
    state.toasts = [];
    state.suppressedQueueLength = 0;
    status.textContent = "";
    delete status.dataset.m8aV411TransitionToastAriaWindowId;
    delete status.dataset.m8aV411TransitionToastAriaText;
    status.dataset.m8aV411TransitionToastAriaTriggered = "false";
  }

  if (transitionFromSuppressed) {
    state.toasts = [];
    state.suppressedQueueLength = 0;
    state.lastAnnouncedEventKey = state.lastEventKey;
  }

  if (activeTransitionEvent) {
    const key = eventKey(activeTransitionEvent);
    const suppressInitialMountEvent = !state.hasRenderedOnce;

    if (suppressInitialMountEvent) {
      state.lastEventKey = key;
      state.lastAnnouncedEventKey = key;
    } else if (state.lastEventKey !== key) {
      state.lastEventKey = key;

      if (toastSuppressed) {
        state.suppressedQueueLength += 1;
      } else {
        const toast = createToastRecord(activeTransitionEvent);

        state.toasts.push(toast);

        if (state.toasts.length > 1) {
          const olderToast = state.toasts[state.toasts.length - 2];

          if (olderToast) {
            olderToast.expiresAtEpochMs = Math.min(
              olderToast.expiresAtEpochMs,
              now + 180
            );
          }
        }

        state.toasts = state.toasts
          .filter((candidate) => isVisibleToast(candidate, now))
          .slice(-M8A_V411_TRANSITION_TOAST_MAX_COUNT);

        if (state.lastAnnouncedEventKey !== key) {
          status.textContent = `${toast.title}. ${toast.line}`;
          status.dataset.m8aV411TransitionToastAriaWindowId = toast.toWindowId;
          status.dataset.m8aV411TransitionToastAriaText =
            status.textContent;
          status.dataset.m8aV411TransitionToastAriaTriggered = "true";
          state.lastAnnouncedEventKey = key;
        }
      }
    }
  }

  root.dataset.m8aV411TransientSurface =
    M8A_V411_TRANSIENT_SURFACE_VERSION;
  root.dataset.m8aV411TransientSurfaceScope = "slice4-transition-toast";
  root.dataset.m8aV411TransitionToastSuppressed = String(toastSuppressed);
  root.dataset.m8aV411TransitionToastSuppressedQueueLength = String(
    state.suppressedQueueLength
  );
  root.dataset.m8aV411TransitionToastDurationMs = String(
    M8A_V411_TRANSITION_TOAST_DURATION_MS
  );
  root.dataset.m8aV411TransitionToastMaxCount = String(
    M8A_V411_TRANSITION_TOAST_MAX_COUNT
  );
  root.dataset.m8aV411TransitionToastMaxWidthPx = String(
    M8A_V411_TRANSITION_TOAST_MAX_WIDTH_PX
  );
  root.dataset.m8aV411TransitionToastMaxCanvasWidthRatio = String(
    M8A_V411_TRANSITION_TOAST_MAX_CANVAS_WIDTH_RATIO
  );
  root.dataset.m8aV411SceneCueMaxWidthPx = String(
    M8A_V411_SCENE_CUE_MAX_WIDTH_PX
  );
  root.dataset.m8aV411SceneCueMaxHeightPx = String(
    M8A_V411_SCENE_CUE_MAX_HEIGHT_PX
  );
  root.dataset.m8aV411SceneCueFadeInMs = String(
    M8A_V411_SCENE_CUE_FADE_IN_MS
  );
  root.dataset.m8aV411SceneCuePersistMs = String(
    M8A_V411_SCENE_CUE_PERSIST_MS
  );

  renderStack(root, state, now);
  state.hasRenderedOnce = true;
  scheduleNextExpiry(root, state);
}

export function disposeM8aV411TransientSurfaces(root: HTMLElement): void {
  const state = rootStates.get(root);

  if (!state) {
    return;
  }

  if (typeof state.timeoutId === "number") {
    window.clearTimeout(state.timeoutId);
  }

  state.toasts = [];
  rootStates.delete(root);
}
