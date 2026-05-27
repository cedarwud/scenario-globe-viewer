const REPLAY_SPEED_PRESETS = [30, 60, 120] as const;

function findReplaySourceButton(
  documentRef: Document,
  selector: string
): HTMLButtonElement | null {
  return documentRef.querySelector<HTMLButtonElement>(
    `.m8a-v47-product-ux__strip ${selector}`
  );
}

function syncReplayProxyButton(
  button: HTMLButtonElement | null,
  source: HTMLButtonElement | null,
  fallbackLabel: string,
  fallbackAriaLabel: string
): void {
  if (!button) {
    return;
  }

  if (!source) {
    button.textContent = fallbackLabel;
    button.setAttribute("aria-label", fallbackAriaLabel);
    button.setAttribute("aria-disabled", "true");
    button.disabled = true;
    button.removeAttribute("aria-pressed");
    button.removeAttribute("title");
    return;
  }

  button.textContent = source.textContent?.trim() || fallbackLabel;
  button.setAttribute(
    "aria-label",
    source.getAttribute("aria-label") ?? fallbackAriaLabel
  );

  const pressed = source.getAttribute("aria-pressed");
  if (pressed === null) {
    button.removeAttribute("aria-pressed");
  } else {
    button.setAttribute("aria-pressed", pressed);
  }

  const ariaDisabled = source.getAttribute("aria-disabled");
  if (ariaDisabled === null) {
    button.removeAttribute("aria-disabled");
  } else {
    button.setAttribute("aria-disabled", ariaDisabled);
  }
  button.disabled = source.disabled || ariaDisabled === "true";

  if (source.title) {
    button.title = source.title;
  } else {
    button.removeAttribute("title");
  }
}

function syncReplayDock(dock: HTMLElement): void {
  const documentRef = dock.ownerDocument;
  syncReplayProxyButton(
    dock.querySelector<HTMLButtonElement>(
      '[data-v4-replay-proxy="play-pause"]'
    ),
    findReplaySourceButton(
      documentRef,
      '[data-m8a-v47-control-id="play-pause"]'
    ),
    "Pause",
    "Pause replay"
  );
  syncReplayProxyButton(
    dock.querySelector<HTMLButtonElement>('[data-v4-replay-proxy="restart"]'),
    findReplaySourceButton(documentRef, '[data-m8a-v47-control-id="restart"]'),
    "Restart",
    "Restart replay"
  );

  for (const multiplier of REPLAY_SPEED_PRESETS) {
    syncReplayProxyButton(
      dock.querySelector<HTMLButtonElement>(
        `[data-v4-replay-speed="${multiplier}"]`
      ),
      findReplaySourceButton(
        documentRef,
        `[data-m8a-v47-playback-multiplier="${multiplier}"]`
      ),
      `${multiplier}x`,
      `Set replay speed to ${multiplier}x`
    );
  }
}

function queueReplayDockSync(dock: HTMLElement): void {
  const ownerWindow = dock.ownerDocument.defaultView;
  if (!ownerWindow) {
    syncReplayDock(dock);
    return;
  }
  ownerWindow.setTimeout(() => syncReplayDock(dock), 0);
  ownerWindow.setTimeout(() => syncReplayDock(dock), 120);
}

function activateReplaySourceButton(
  dock: HTMLElement,
  selector: string
): void {
  const source = findReplaySourceButton(dock.ownerDocument, selector);
  if (
    !source ||
    source.disabled ||
    source.getAttribute("aria-disabled") === "true"
  ) {
    syncReplayDock(dock);
    return;
  }
  source.click();
  queueReplayDockSync(dock);
}

interface ReplayProxyButtonOptions {
  readonly label: string;
  readonly ariaLabel: string;
  readonly proxyId: string;
  readonly sourceSelector: string;
  readonly speed?: number;
}

function buildReplayProxyButton(
  documentRef: Document,
  dock: HTMLElement,
  options: ReplayProxyButtonOptions
): HTMLButtonElement {
  const button = documentRef.createElement("button");
  button.type = "button";
  button.className = "v4-projection-side-panel__replay-button";
  button.textContent = options.label;
  button.setAttribute("aria-label", options.ariaLabel);
  button.setAttribute("aria-disabled", "true");
  button.disabled = true;
  button.dataset.v4ReplayProxy = options.proxyId;
  if (options.speed !== undefined) {
    button.dataset.v4ReplaySpeed = String(options.speed);
  }
  button.addEventListener("click", () => {
    activateReplaySourceButton(dock, options.sourceSelector);
  });
  return button;
}

function observeReplaySourceForDock(dock: HTMLElement): void {
  const ownerWindow = dock.ownerDocument.defaultView;
  const sourceStrip = dock.ownerDocument.querySelector<HTMLElement>(
    ".m8a-v47-product-ux__strip"
  );
  if (!ownerWindow || !sourceStrip) {
    return;
  }

  const sourceObserver = new ownerWindow.MutationObserver(() => {
    syncReplayDock(dock);
  });
  sourceObserver.observe(sourceStrip, {
    attributeFilter: [
      "aria-disabled",
      "aria-label",
      "aria-pressed",
      "disabled",
      "title"
    ],
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true
  });

  const removalObserver = new ownerWindow.MutationObserver(() => {
    if (dock.isConnected) {
      return;
    }
    sourceObserver.disconnect();
    removalObserver.disconnect();
  });
  removalObserver.observe(dock.ownerDocument.body, {
    childList: true,
    subtree: true
  });
}

function buildReplayControlDock(documentRef: Document): HTMLElement {
  const dock = documentRef.createElement("div");
  dock.className = "v4-projection-side-panel__replay-dock";
  dock.dataset.v4ReplayDock = "true";

  const label = documentRef.createElement("span");
  label.className = "v4-projection-side-panel__replay-label";
  label.textContent = "Replay";

  const playButton = buildReplayProxyButton(documentRef, dock, {
    ariaLabel: "Pause replay",
    label: "Pause",
    proxyId: "play-pause",
    sourceSelector: '[data-m8a-v47-control-id="play-pause"]'
  });
  const restartButton = buildReplayProxyButton(documentRef, dock, {
    ariaLabel: "Restart replay",
    label: "Restart",
    proxyId: "restart",
    sourceSelector: '[data-m8a-v47-control-id="restart"]'
  });

  const speedGroup = documentRef.createElement("div");
  speedGroup.className = "v4-projection-side-panel__replay-speed-group";
  speedGroup.setAttribute("aria-label", "Replay speed");
  for (const multiplier of REPLAY_SPEED_PRESETS) {
    speedGroup.append(
      buildReplayProxyButton(documentRef, dock, {
        ariaLabel: `Set replay speed to ${multiplier}x`,
        label: `${multiplier}x`,
        proxyId: "speed",
        sourceSelector: `[data-m8a-v47-playback-multiplier="${multiplier}"]`,
        speed: multiplier
      })
    );
  }

  dock.append(label, playButton, restartButton, speedGroup);
  syncReplayDock(dock);
  queueReplayDockSync(dock);
  observeReplaySourceForDock(dock);
  return dock;
}

export function buildReplayControlRow(documentRef: Document): HTMLElement {
  const row = documentRef.createElement("section");
  row.className =
    "v4-projection-side-panel__row v4-projection-side-panel__replay-row";
  row.dataset.row = "replay";
  row.append(buildReplayControlDock(documentRef));
  return row;
}

