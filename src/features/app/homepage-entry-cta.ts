export interface HomepageEntryTargetOptions {
  addressedHref: string;
  onEnter: (event: MouseEvent | KeyboardEvent) => void;
}

export interface HomepageEntryCtaOptions extends HomepageEntryTargetOptions {
  groundStationEntry?: HomepageEntryTargetOptions;
}

function createIcon(paths: string): SVGSVGElement {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.classList.add("homepage-entry-cta__icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = paths;
  return icon;
}

function createAviationHandoverEntry(
  options: HomepageEntryTargetOptions
): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.className = "homepage-entry-cta__button";
  anchor.href = options.addressedHref;
  anchor.dataset.m8aV31HomepageCtaEnter = "true";
  anchor.dataset.m8aV36HomepageHandoverIcon = "true";
  anchor.dataset.homepageEntryKind = "historical-aviation-handover";
  anchor.setAttribute(
    "aria-label",
    "Open historical OneWeb LEO and Intelsat GEO aviation handover scene with autoplay"
  );
  anchor.title =
    "Open historical OneWeb LEO + Intelsat GEO aviation handover scene with autoplay";

  const icon = createIcon(`
    <path d="M4.4 14.5c2.2-3.5 6.1-5.5 10.1-5.1" />
    <path d="m14.5 9.4-2-2.2" />
    <path d="m14.5 9.4-2.6 1" />
    <circle cx="5" cy="15" r="1.8" />
    <circle cx="18.2" cy="6.2" r="1.9" />
    <path d="M7.2 15.5c3.8 2.4 8.2 1.4 10.7-1.7" />
    <path d="m17.9 13.8.1 2.8" />
    <path d="m17.9 13.8-2.6.6" />
  `);

  const tooltip = document.createElement("span");
  tooltip.className = "homepage-entry-cta__tooltip";
  tooltip.textContent =
    "Historical aviation handover: OneWeb LEO + Intelsat GEO autoplay";

  anchor.append(icon, tooltip);
  return anchor;
}

function createGroundStationEntry(
  options: HomepageEntryTargetOptions
): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.className =
    "homepage-entry-cta__button homepage-entry-cta__button--ground-station";
  anchor.href = options.addressedHref;
  anchor.dataset.m8aV44HomepageGroundStationEntry = "true";
  anchor.dataset.homepageEntryKind = "v4-ground-station-multi-orbit";
  anchor.setAttribute(
    "aria-label",
    "Open V4 ground-station multi-orbit scene with Taiwan CHT and Singapore Speedcast operator-family endpoints"
  );
  anchor.title =
    "Open V4 ground-station multi-orbit scene with Taiwan CHT and Singapore Speedcast";

  const icon = createIcon(`
    <path d="M4.5 18.5h7" />
    <path d="M8 18.5l4.6-5.2" />
    <path d="M10.4 13.5c1.7 1.2 4.2.8 5.6-.9" />
    <path d="M8.7 11.5c2.7 2.5 7.2 1.8 9.5-1.2" />
    <circle cx="17.4" cy="6.2" r="1.9" />
    <path d="m16.1 4.9-1.8-1.8" />
    <path d="m18.7 7.5 1.8 1.8" />
  `);

  const tooltip = document.createElement("span");
  tooltip.className = "homepage-entry-cta__tooltip";
  tooltip.textContent =
    "V4 ground-station multi-orbit: Taiwan CHT to Singapore Speedcast";

  anchor.append(icon, tooltip);
  return anchor;
}

function interceptActivation(event: MouseEvent | KeyboardEvent): boolean {
  if (event instanceof MouseEvent) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return false;
    }
    return true;
  }

  if (event instanceof KeyboardEvent) {
    return event.key === "Enter" || event.key === " ";
  }

  return false;
}

function bindActivation(
  anchor: HTMLAnchorElement,
  onEnter: (event: MouseEvent | KeyboardEvent) => void
): () => void {
  const handleClick = (event: MouseEvent): void => {
    if (!interceptActivation(event)) {
      return;
    }
    event.preventDefault();
    onEnter(event);
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (!interceptActivation(event)) {
      return;
    }
    event.preventDefault();
    onEnter(event);
  };

  anchor.addEventListener("click", handleClick);
  anchor.addEventListener("keydown", handleKeydown);

  return () => {
    anchor.removeEventListener("click", handleClick);
    anchor.removeEventListener("keydown", handleKeydown);
  };
}

export function mountHomepageEntryCta(
  viewerShell: HTMLElement,
  options: HomepageEntryCtaOptions
): () => void {
  const root = document.createElement("aside");
  root.className = "homepage-entry-cta";
  if (options.groundStationEntry) {
    root.dataset.m8aV44HomepageGroundStationEntrySurface = "true";
  } else {
    root.dataset.m8aV31HomepageCta = "true";
    root.dataset.m8aV36HomepageHandoverEntry = "true";
  }
  root.dataset.homepageEntrySurface = "top-right-icon";
  root.setAttribute(
    "aria-label",
    options.groundStationEntry
      ? "Homepage scene entry: V4 ground-station multi-orbit scene"
      : "Homepage handover scene entry"
  );

  const unbinders: Array<() => void> = [];

  if (options.groundStationEntry) {
    const groundStationAnchor = createGroundStationEntry(
      options.groundStationEntry
    );
    unbinders.push(
      bindActivation(groundStationAnchor, options.groundStationEntry.onEnter)
    );
    root.append(groundStationAnchor);
  }

  if (!options.groundStationEntry) {
    const aviationAnchor = createAviationHandoverEntry(options);
    unbinders.push(bindActivation(aviationAnchor, options.onEnter));
    root.append(aviationAnchor);
  }

  const toolbar = viewerShell.querySelector<HTMLElement>(".cesium-viewer-toolbar");

  if (toolbar) {
    root.dataset.homepageEntryMount = "cesium-toolbar";
    toolbar.appendChild(root);
  } else {
    root.dataset.homepageEntryMount = "viewer-shell";
    viewerShell.appendChild(root);
  }

  return () => {
    for (const unbind of unbinders) {
      unbind();
    }
    if (root.parentElement) {
      root.parentElement.removeChild(root);
    }
  };
}
