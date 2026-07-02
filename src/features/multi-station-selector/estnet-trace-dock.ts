// ESTNeT trace dock — the full-width bottom home of the packet-trace
// explorer (panel-density fourth pass, 2026-07-03: the explorer's content —
// trace selector, badges, stat cards, chart, Δ cards, honesty pointer — is a
// full analysis view and structurally does not fit the single-column side
// panel; the panel keeps a one-line summary card that opens this dock).
//
// Behaviour contract (mirrors the panel section it replaces):
// - Mounted/destroyed strictly with the ESTNeT display mode: OFF tears the
//   dock's DOM down entirely — zero estnet nodes remain.
// - A LIVE toggle-on (and the `?estnet=1` seed once the first result lands)
//   auto-opens the dock; an explicit user close is respected — later
//   recomputes (rain drags) update content but never re-open it.
// - Closing disposes the explorer content (detaches the replay cursor);
//   reopening rebuilds from the latest runtime result, so the model overlay
//   always reconciles against what the panel currently shows.
import type { RuntimeProjectionResult } from "./runtime-projection";
import type { ReplayClock } from "../time/replay-clock";
import {
  buildEstnetTraceExplorerContent,
  type EstnetTraceExplorerHandle
} from "./estnet-trace-panel-section";

export interface EstnetTraceDockHandle {
  /** Open (and build, if needed) the explorer. Marks the dock user-visible. */
  open(): void;
  /** Hide the dock and dispose the explorer content. */
  close(): void;
  isOpen(): boolean;
  /**
   * Feed the latest runtime projection result (and the replay clock bound to
   * the current viewer). Rebuilds in place when open; when closed the data is
   * kept for the next open — it never re-opens a user-closed dock.
   */
  update(
    result: RuntimeProjectionResult | null,
    replayClock: ReplayClock | null
  ): void;
  destroy(): void;
}

export interface EstnetTraceDockMountOptions {
  /** Fired only on the header close button — an EXPLICIT user close. */
  readonly onUserClose?: () => void;
}

export function mountEstnetTraceDock(
  options: EstnetTraceDockMountOptions = {}
): EstnetTraceDockHandle {
  const dock = document.createElement("section");
  dock.className = "v4-estnet-dock";
  dock.dataset.estnetDock = "true";
  dock.hidden = true;
  dock.setAttribute("aria-label", "ESTNeT packet-trace explorer");

  const header = document.createElement("div");
  header.className = "v4-estnet-dock__header";
  const title = document.createElement("span");
  title.className = "v4-estnet-dock__title";
  title.textContent = "Packet trace (ESTNeT / network test)";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "v4-estnet-dock__close";
  closeButton.dataset.estnetDockClose = "true";
  closeButton.setAttribute("aria-label", "Close the trace explorer");
  closeButton.textContent = "Close ✕";
  header.append(title, closeButton);

  const bodyHost = document.createElement("div");
  bodyHost.className = "v4-estnet-dock__body";

  dock.append(header, bodyHost);
  document.body.append(dock);

  let destroyed = false;
  let content: EstnetTraceExplorerHandle | null = null;
  let latestResult: RuntimeProjectionResult | null = null;
  let latestClock: ReplayClock | null = null;

  const disposeContent = (): void => {
    content?.dispose();
    content = null;
    bodyHost.replaceChildren();
  };

  const rebuild = (): void => {
    disposeContent();
    content = buildEstnetTraceExplorerContent({
      runtimeResult: latestResult,
      replayClock: latestClock
    });
    bodyHost.append(content.element);
  };

  const handle: EstnetTraceDockHandle = {
    open(): void {
      if (destroyed) {
        return;
      }
      dock.hidden = false;
      rebuild();
    },
    close(): void {
      if (destroyed) {
        return;
      }
      dock.hidden = true;
      disposeContent();
    },
    isOpen(): boolean {
      return !destroyed && !dock.hidden;
    },
    update(result, replayClock): void {
      if (destroyed) {
        return;
      }
      latestResult = result;
      latestClock = replayClock;
      if (!dock.hidden) {
        rebuild();
      }
    },
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      disposeContent();
      dock.remove();
    }
  };

  closeButton.addEventListener("click", () => {
    handle.close();
    options.onUserClose?.();
  });

  return handle;
}
