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
  root.setAttribute("aria-label", "Enter first-case handover demo");

  const anchor = document.createElement("a");
  anchor.className = "homepage-entry-cta__enter";
  anchor.href = options.addressedHref;
  anchor.dataset.m8aV31HomepageCtaEnter = "true";

  const chip = document.createElement("span");
  chip.className = "homepage-entry-cta__chip";
  chip.textContent = "Demo · Cross-orbit service handover";

  const headline = document.createElement("span");
  headline.className = "homepage-entry-cta__headline";
  headline.textContent = "OneWeb LEO + Intelsat GEO · commercial aviation";

  const action = document.createElement("span");
  action.className = "homepage-entry-cta__action";
  action.textContent = "Enter first-case handover demo →";

  const boundary = document.createElement("span");
  boundary.className = "homepage-entry-cta__boundary";
  boundary.textContent = "Service-layer switching · bounded-proxy";

  anchor.append(chip, headline, action, boundary);
  root.append(anchor);
  viewerShell.appendChild(root);

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
