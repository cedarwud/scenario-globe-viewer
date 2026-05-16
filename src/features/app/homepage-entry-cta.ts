export interface HomepageEntryTargetOptions {
  addressedHref: string;
  onEnter: (event: MouseEvent | KeyboardEvent) => void;
}

export interface HomepageEntryCtaOptions extends HomepageEntryTargetOptions {
  groundStationEntry?: HomepageEntryTargetOptions;
}

interface GroundStationIconOption {
  key: "orbit";
  label: string;
  tooltip: string;
  paths: string;
}

const GROUND_STATION_ICON_OPTIONS: ReadonlyArray<GroundStationIconOption> = [
  {
    key: "orbit",
    label: "Open V4 ground-station multi-orbit scene",
    tooltip: "V4 ground-station multi-orbit",
    paths: `
      <circle cx="10.3" cy="13.7" r="5.2" />
      <path d="M5.6 11.5h9.4" />
      <path d="M5.6 15.9h9.4" />
      <path d="M10.3 8.5c1.5 1.6 2.2 3.3 2.2 5.2s-.7 3.6-2.2 5.2" />
      <path d="M10.3 8.5c-1.5 1.6-2.2 3.3-2.2 5.2s.7 3.6 2.2 5.2" />
      <path d="M15.4 6.9c2.8 0 5.1 1.5 5.1 3.3s-2.3 3.3-5.1 3.3" />
      <path d="m19.2 8.1 1.3 2.1-1.9 1.5" />
    `
  }
];

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
  options: HomepageEntryTargetOptions,
  iconOption: GroundStationIconOption
): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.className =
    "homepage-entry-cta__button homepage-entry-cta__button--ground-station";
  anchor.href = options.addressedHref;
  anchor.dataset.m8aV44HomepageGroundStationEntry = "true";
  anchor.dataset.m8aV44HomepageGroundStationIconOption = iconOption.key;
  anchor.dataset.homepageEntryKind = "v4-ground-station-multi-orbit";
  anchor.setAttribute(
    "aria-label",
    `${iconOption.label}: Open V4 ground-station multi-orbit scene with Taiwan CHT and Singapore Speedcast operator-family endpoints`
  );
  anchor.title =
    `${iconOption.tooltip}: Open V4 ground-station multi-orbit scene`;

  const icon = createIcon(iconOption.paths);

  const tooltip = document.createElement("span");
  tooltip.className = "homepage-entry-cta__tooltip";
  tooltip.textContent = `${iconOption.tooltip} - V4 ground-station multi-orbit`;

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
    for (const iconOption of GROUND_STATION_ICON_OPTIONS) {
      const groundStationAnchor = createGroundStationEntry(
        options.groundStationEntry,
        iconOption
      );
      unbinders.push(
        bindActivation(groundStationAnchor, options.groundStationEntry.onEnter)
      );
      root.append(groundStationAnchor);
    }
  }

  if (!options.groundStationEntry) {
    const aviationAnchor = createAviationHandoverEntry(options);
    unbinders.push(bindActivation(aviationAnchor, options.onEnter));
    root.append(aviationAnchor);
  }

  const toolbar = viewerShell.querySelector<HTMLElement>(".cesium-viewer-toolbar");

  if (toolbar) {
    const homeButton = toolbar.querySelector<HTMLElement>(".cesium-home-button");
    root.dataset.homepageEntryMount = "cesium-toolbar";
    if (homeButton?.parentNode === toolbar) {
      root.dataset.homepageEntryPlacement = "before-home-button";
      toolbar.insertBefore(root, homeButton);
    } else {
      root.dataset.homepageEntryPlacement = "toolbar-end";
      toolbar.appendChild(root);
    }
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
