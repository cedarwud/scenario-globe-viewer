export interface AppShellMount {
  viewerShell: HTMLDivElement;
  viewerRoot: HTMLDivElement;
  hudFrame: HTMLDivElement;
  statusPanel: HTMLElement;
}

export function mountAppShell(root: HTMLDivElement): AppShellMount {
  root.innerHTML = `
    <main class="app-shell" data-app-shell="true">
      <div class="viewer-shell">
        <div class="viewer-root" data-viewer-root></div>
        <div
          class="hud-frame"
          data-hud-frame="true"
          data-hud-visibility="hidden"
          aria-hidden="true"
        >
          <section class="hud-panel hud-panel--left" data-hud-panel="left"></section>
          <section class="hud-panel hud-panel--right" data-hud-panel="right"></section>
          <section class="hud-panel hud-panel--status" data-hud-panel="status"></section>
        </div>
      </div>
    </main>
  `;

  const viewerShell = root.querySelector<HTMLDivElement>(".viewer-shell");
  const viewerRoot = root.querySelector<HTMLDivElement>("[data-viewer-root]");
  const hudFrame = root.querySelector<HTMLDivElement>("[data-hud-frame='true']");
  const statusPanel = root.querySelector<HTMLElement>(
    "[data-hud-panel='status']"
  );

  if (!viewerShell) {
    throw new Error("Missing viewer shell");
  }

  if (!viewerRoot) {
    throw new Error("Missing viewer root");
  }

  if (!hudFrame) {
    throw new Error("Missing HUD frame");
  }

  if (!statusPanel) {
    throw new Error("Missing HUD status panel");
  }

  return { viewerShell, viewerRoot, hudFrame, statusPanel };
}
