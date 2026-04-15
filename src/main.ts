import { initializeCesiumBootstrap } from "./core/cesium/bootstrap";
import { createViewer } from "./core/cesium/viewer-factory";
import "./styles.css";

initializeCesiumBootstrap();

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root");
}

app.innerHTML = `
  <main class="viewer-shell">
    <div class="viewer-root" data-viewer-root></div>
  </main>
`;

const viewerRoot = app.querySelector<HTMLDivElement>("[data-viewer-root]");

if (!viewerRoot) {
  throw new Error("Missing viewer root");
}

const viewer = createViewer(viewerRoot);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    viewer.destroy();
  });
}
