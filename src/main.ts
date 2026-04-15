import { initializeCesiumBootstrap } from "./core/cesium/bootstrap";
import { resolveCreditElements } from "./core/cesium/credits";
import { createViewer } from "./core/cesium/viewer-factory";
import "./styles.css";

initializeCesiumBootstrap();

function bindCreditOverlayLayout(
  viewerRoot: HTMLElement,
  creditContainer: HTMLElement
): () => void {
  const updateLayout = () => {
    const animationContainer = viewerRoot.querySelector<HTMLElement>(".cesium-viewer-animationContainer");
    const timelineContainer = viewerRoot.querySelector<HTMLElement>(".cesium-viewer-timelineContainer");
    const fullscreenContainer = viewerRoot.querySelector<HTMLElement>(".cesium-viewer-fullscreenContainer");

    const leftOffset = (animationContainer?.offsetWidth ?? 0) + 2;
    const bottomOffset = (timelineContainer?.offsetHeight ?? 0) + 2;
    const rightOffset = (fullscreenContainer?.offsetWidth ?? 0) + 8;

    creditContainer.style.setProperty("--credit-left-offset", `${leftOffset}px`);
    creditContainer.style.setProperty("--credit-bottom-offset", `${bottomOffset}px`);
    creditContainer.style.setProperty("--credit-right-offset", `${rightOffset}px`);
  };

  // Cesium creates the animation, timeline, and fullscreen containers inside
  // Viewer and resizes the timeline against fullscreen width at runtime.
  // Evidence: /home/u24/papers/scenario-globe-viewer/node_modules/@cesium/widgets/Source/Viewer/Viewer.js:735-785
  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(() => {
          updateLayout();
        });

  resizeObserver?.observe(viewerRoot);
  window.addEventListener("resize", updateLayout);
  window.requestAnimationFrame(() => {
    updateLayout();
  });
  updateLayout();

  return () => {
    resizeObserver?.disconnect();
    window.removeEventListener("resize", updateLayout);
  };
}

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

const unbindCreditOverlayLayout = bindCreditOverlayLayout(viewerRoot, creditElements.container);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unbindCreditOverlayLayout();
    viewer.destroy();
  });
}
