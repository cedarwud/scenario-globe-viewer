export interface AppShellMount {
  viewerRoot: HTMLDivElement;
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

  const viewerRoot = root.querySelector<HTMLDivElement>("[data-viewer-root]");

  if (!viewerRoot) {
    throw new Error("Missing viewer root");
  }

  return { viewerRoot };
}
