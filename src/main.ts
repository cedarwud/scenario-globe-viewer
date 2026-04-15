import { initializeCesiumBootstrap } from "./core/cesium/bootstrap";
import { resolveCreditElements } from "./core/cesium/credits";
import { createViewer } from "./core/cesium/viewer-factory";
import "./styles.css";

initializeCesiumBootstrap();

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root");
}

app.innerHTML = `
  <main class="viewer-shell" data-credit-viewport>
    <div class="viewer-root" data-viewer-root></div>
    <footer class="viewer-credits" data-credit-container aria-label="Data attribution"></footer>
  </main>
`;

const viewerRoot = app.querySelector<HTMLDivElement>("[data-viewer-root]");
const creditElements = resolveCreditElements(app);

if (!viewerRoot) {
  throw new Error("Missing viewer root");
}

const viewer = createViewer({
  container: viewerRoot,
  creditContainer: creditElements.container,
  creditViewport: creditElements.viewport
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    viewer.destroy();
  });
}
