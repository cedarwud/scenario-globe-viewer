export interface HomepageEntryCtaOptions {
  addressedHref: string;
  onEnter: (event: MouseEvent | KeyboardEvent) => void;
}

export function mountHomepageEntryCta(
  viewerShell: HTMLElement,
  options: HomepageEntryCtaOptions
): () => void {
  const root = document.createElement("aside");
  root.className = "homepage-entry-cta";
  root.dataset.m8aV31HomepageCta = "true";
  root.dataset.m8aV36HomepageHandoverEntry = "true";
  root.dataset.homepageEntrySurface = "top-right-icon";
  root.setAttribute("aria-label", "Homepage handover scene entry");

  const anchor = document.createElement("a");
  anchor.className = "homepage-entry-cta__button";
  anchor.href = options.addressedHref;
  anchor.dataset.m8aV31HomepageCtaEnter = "true";
  anchor.dataset.m8aV36HomepageHandoverIcon = "true";
  anchor.setAttribute(
    "aria-label",
    "Open OneWeb LEO and Intelsat GEO aviation handover scene with autoplay"
  );
  anchor.title =
    "Open OneWeb LEO + Intelsat GEO aviation handover scene with autoplay";

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.classList.add("homepage-entry-cta__icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = `
    <path d="M4.4 14.5c2.2-3.5 6.1-5.5 10.1-5.1" />
    <path d="m14.5 9.4-2-2.2" />
    <path d="m14.5 9.4-2.6 1" />
    <circle cx="5" cy="15" r="1.8" />
    <circle cx="18.2" cy="6.2" r="1.9" />
    <path d="M7.2 15.5c3.8 2.4 8.2 1.4 10.7-1.7" />
    <path d="m17.9 13.8.1 2.8" />
    <path d="m17.9 13.8-2.6.6" />
  `;

  const tooltip = document.createElement("span");
  tooltip.className = "homepage-entry-cta__tooltip";
  tooltip.textContent = "OneWeb LEO + Intelsat GEO aviation handover · autoplay";

  anchor.append(icon, tooltip);
  root.append(anchor);
  const toolbar = viewerShell.querySelector<HTMLElement>(".cesium-viewer-toolbar");

  if (toolbar) {
    root.dataset.homepageEntryMount = "cesium-toolbar";
    toolbar.appendChild(root);
  } else {
    root.dataset.homepageEntryMount = "viewer-shell";
    viewerShell.appendChild(root);
  }

  const interceptActivation = (event: MouseEvent | KeyboardEvent): boolean => {
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
  };

  const handleClick = (event: MouseEvent): void => {
    if (!interceptActivation(event)) {
      return;
    }
    event.preventDefault();
    options.onEnter(event);
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (!interceptActivation(event)) {
      return;
    }
    event.preventDefault();
    options.onEnter(event);
  };

  anchor.addEventListener("click", handleClick);
  anchor.addEventListener("keydown", handleKeydown);

  return () => {
    anchor.removeEventListener("click", handleClick);
    anchor.removeEventListener("keydown", handleKeydown);
    if (root.parentElement) {
      root.parentElement.removeChild(root);
    }
  };
}
