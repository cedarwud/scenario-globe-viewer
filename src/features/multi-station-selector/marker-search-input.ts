import type { GroundStationMarkersHandle } from "./station-markers";

const DEBOUNCE_MS = 150;
const PLACEHOLDER_TEXT = "Search name / operator / country";
const INPUT_ID = "ground-station-search__input";

export function mountMarkerSearchInput(
  viewerContainer: HTMLElement,
  markers: GroundStationMarkersHandle
): { dispose(): void } {
  const container = document.createElement("div");
  container.className = "ground-station-search";

  const label = document.createElement("label");
  label.className = "ground-station-search__label";
  label.setAttribute("for", INPUT_ID);
  label.textContent = "Search";
  container.appendChild(label);

  const input = document.createElement("input");
  input.id = INPUT_ID;
  input.type = "search";
  input.className = "ground-station-search__input";
  input.placeholder = PLACEHOLDER_TEXT;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.value = markers.getSearchQuery();
  container.appendChild(input);

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "ground-station-search__clear";
  clearButton.setAttribute("aria-label", "Clear search");
  clearButton.textContent = "×";
  clearButton.hidden = input.value.length === 0;
  container.appendChild(clearButton);

  let pendingTimer: ReturnType<typeof setTimeout> | null = null;

  function flush(value: string): void {
    if (pendingTimer !== null) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    markers.setSearchQuery(value);
    clearButton.hidden = value.trim().length === 0;
  }

  function handleInput(): void {
    const value = input.value;
    clearButton.hidden = value.trim().length === 0;
    if (pendingTimer !== null) {
      clearTimeout(pendingTimer);
    }
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      markers.setSearchQuery(value);
    }, DEBOUNCE_MS);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      if (input.value.length === 0) {
        input.blur();
        return;
      }
      input.value = "";
      flush("");
      input.focus();
    } else if (event.key === "Enter") {
      event.preventDefault();
      flush(input.value);
    }
  }

  function handleClearClick(event: Event): void {
    event.preventDefault();
    input.value = "";
    flush("");
    input.focus();
  }

  input.addEventListener("input", handleInput);
  input.addEventListener("keydown", handleKeydown);
  clearButton.addEventListener("click", handleClearClick);

  viewerContainer.appendChild(container);

  return {
    dispose(): void {
      if (pendingTimer !== null) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      input.removeEventListener("input", handleInput);
      input.removeEventListener("keydown", handleKeydown);
      clearButton.removeEventListener("click", handleClearClick);
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };
}
