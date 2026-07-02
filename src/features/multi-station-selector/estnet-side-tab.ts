// ESTNeT side tab + chart strip — the explorer's home (panel-density fifth
// pass, 2026-07-03; ADR 0015 decision 10 revised).
//
// Split by what actually needs the globe:
// - The narrow content (trace selector, badges, stat cards, Δ cards, honesty
//   pointer) has NO globe coupling → it lives in a second side panel that
//   occupies the same rectangle as the pair panel, switched via a tab strip
//   ("Pair analysis | ESTNeT"). The pair panel's DOM is untouched — the tab
//   only toggles a body attribute that hides it, so the accepted default
//   surface stays byte-identical when the mode is off.
// - The time-series chart is the ONE piece needing BOTH width and the globe
//   simultaneously (replay cursor ↔ on-globe handover correspondence) → it
//   renders in a THIN bottom strip (~28vh) that leaves the globe visible.
//
// Lifecycle contract (mirrors the prior dock's, gate-locked):
// - Mounted/destroyed strictly with the ESTNeT display mode; OFF tears down
//   the tab chrome, the estnet panel, and the strip — zero estnet nodes.
// - A live toggle-on / ?estnet=1 seed auto-activates the tab (and opens the
//   strip) once the first projection result lands.
// - Recomputes rebuild content from the latest published result but never
//   re-activate a tab the user left, and never re-open a strip the user
//   closed while the tab stays active. Re-activating the tab re-opens it.
import type { RuntimeProjectionResult } from "./runtime-projection";
import type { ReplayClock } from "../time/replay-clock";
import {
  buildEstnetTraceExplorerContent,
  type EstnetTraceExplorerHandle
} from "./estnet-trace-panel-section";

export interface EstnetSideTabHandle {
  /** Show the ESTNeT tab (hides the pair panel) and open the chart strip. */
  activate(): void;
  /** Return to the pair panel; hides the strip too. */
  deactivate(): void;
  isActive(): boolean;
  /**
   * Feed the latest runtime projection result (+ the replay clock bound to
   * the current viewer). Rebuilds the explorer in place when the tab is
   * active; when inactive the data is kept for the next activation.
   */
  update(
    result: RuntimeProjectionResult | null,
    replayClock: ReplayClock | null
  ): void;
  destroy(): void;
}

export interface EstnetSideTabMountOptions {
  /** Fired on the tab strip's "Pair analysis" button — an explicit leave. */
  readonly onUserLeave?: () => void;
}

const TAB_BODY_ATTR = "data-estnet-tab";

export function mountEstnetSideTab(
  options: EstnetSideTabMountOptions = {}
): EstnetSideTabHandle {
  // --- ESTNeT panel (same rectangle as the pair side panel) ---
  const panel = document.createElement("section");
  panel.className = "v4-estnet-tab-panel";
  panel.dataset.estnetTabPanel = "true";
  panel.hidden = true;
  panel.setAttribute("aria-label", "ESTNeT packet-trace tab");

  const tabStrip = document.createElement("div");
  tabStrip.className = "v4-estnet-tab-panel__tabs";
  const pairTabButton = document.createElement("button");
  pairTabButton.type = "button";
  pairTabButton.className = "v4-estnet-tab-panel__tab";
  pairTabButton.dataset.estnetTabBack = "true";
  pairTabButton.textContent = "Pair analysis";
  const estnetTabButton = document.createElement("button");
  estnetTabButton.type = "button";
  estnetTabButton.className =
    "v4-estnet-tab-panel__tab v4-estnet-tab-panel__tab--active";
  estnetTabButton.textContent = "ESTNeT";
  estnetTabButton.setAttribute("aria-current", "true");
  tabStrip.append(pairTabButton, estnetTabButton);

  const panelBody = document.createElement("div");
  panelBody.className = "v4-estnet-tab-panel__body";

  panel.append(tabStrip, panelBody);
  document.body.append(panel);

  // --- Thin bottom chart strip ---
  const strip = document.createElement("section");
  strip.className = "v4-estnet-strip";
  strip.dataset.estnetStrip = "true";
  strip.hidden = true;
  strip.setAttribute("aria-label", "ESTNeT packet-trace chart strip");

  const stripHeader = document.createElement("div");
  stripHeader.className = "v4-estnet-strip__header";
  const stripTitle = document.createElement("span");
  stripTitle.className = "v4-estnet-strip__title";
  stripTitle.textContent = "Packet trace — time series";
  const stripClose = document.createElement("button");
  stripClose.type = "button";
  stripClose.className = "v4-estnet-strip__close";
  stripClose.dataset.estnetStripClose = "true";
  stripClose.setAttribute("aria-label", "Close the chart strip");
  stripClose.textContent = "Close ✕";
  stripHeader.append(stripTitle, stripClose);

  const stripBody = document.createElement("div");
  stripBody.className = "v4-estnet-strip__body";

  strip.append(stripHeader, stripBody);
  document.body.append(strip);

  let destroyed = false;
  let active = false;
  let content: EstnetTraceExplorerHandle | null = null;
  let latestResult: RuntimeProjectionResult | null = null;
  let latestClock: ReplayClock | null = null;

  const disposeContent = (): void => {
    content?.dispose();
    content = null;
    panelBody.replaceChildren();
    stripBody.replaceChildren();
  };

  const rebuild = (): void => {
    disposeContent();
    content = buildEstnetTraceExplorerContent({
      runtimeResult: latestResult,
      replayClock: latestClock
    });
    panelBody.append(content.element);
    stripBody.append(content.chartPanel);
  };

  const setStripVisible = (visible: boolean): void => {
    strip.hidden = !visible;
  };

  const handle: EstnetSideTabHandle = {
    activate(): void {
      if (destroyed) {
        return;
      }
      active = true;
      panel.hidden = false;
      document.body.setAttribute(TAB_BODY_ATTR, "on");
      rebuild();
      setStripVisible(true);
    },
    deactivate(): void {
      if (destroyed) {
        return;
      }
      active = false;
      panel.hidden = true;
      document.body.removeAttribute(TAB_BODY_ATTR);
      setStripVisible(false);
      disposeContent();
    },
    isActive(): boolean {
      return !destroyed && active;
    },
    update(result, replayClock): void {
      if (destroyed) {
        return;
      }
      latestResult = result;
      latestClock = replayClock;
      if (active) {
        rebuild();
        // Content refresh only — strip visibility follows the user's last
        // explicit choice while the tab stays active.
      }
    },
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      active = false;
      disposeContent();
      document.body.removeAttribute(TAB_BODY_ATTR);
      panel.remove();
      strip.remove();
    }
  };

  pairTabButton.addEventListener("click", () => {
    handle.deactivate();
    options.onUserLeave?.();
  });
  // Clicking the already-active ESTNeT tab re-opens a closed strip — the
  // only in-tab affordance to get the chart back after a strip close.
  estnetTabButton.addEventListener("click", () => {
    if (!destroyed && active && strip.hidden) {
      setStripVisible(true);
    }
  });
  stripClose.addEventListener("click", () => {
    setStripVisible(false);
  });

  return handle;
}
