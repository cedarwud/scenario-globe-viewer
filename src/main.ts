import { initializeCesiumBootstrap } from "./core/cesium/bootstrap";
import "./styles.css";

initializeCesiumBootstrap();

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root");
}

app.innerHTML = `
  <main class="shell">
    <p class="eyebrow">Phase 0</p>
    <h1>Scenario Globe Viewer</h1>
    <p class="copy">
      Repo scaffold complete. Cesium bootstrap and first render land in Phase 1.
    </p>
  </main>
`;
