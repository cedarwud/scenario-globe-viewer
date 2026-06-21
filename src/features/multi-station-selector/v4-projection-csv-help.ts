// CSV-download help popover for the selected-pair side panel.
//
// Extracted verbatim from v4-projection-side-panel.ts (behavior-preserving
// large-file-budget split). A self-contained DOM widget: it takes the existing
// CSV download button, mounts a "?" trigger + an accessible popover describing
// the CSV columns, and returns a disposer. No side-panel state, formatters, or
// view-model dependencies — only browser DOM APIs.

let csvHelpIdCounter = 0;

interface CsvHelpControl {
  readonly root: HTMLElement;
  readonly dispose: () => void;
}

export function buildCsvHelpControl(csvButton: HTMLButtonElement): CsvHelpControl {
  const root = document.createElement("div");
  root.className = "v4-projection-side-panel__csv-help-control";

  csvButton.classList.add(
    "v4-projection-side-panel__download-report--with-help"
  );

  const helpId = `v4-projection-side-panel-csv-help-${++csvHelpIdCounter}`;
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "v4-projection-side-panel__csv-help-trigger";
  trigger.textContent = "?";
  trigger.title = "CSV 內容說明";
  trigger.setAttribute("aria-label", "說明 CSV 下載內容");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", helpId);

  const popover = document.createElement("div");
  popover.id = helpId;
  popover.className = "v4-projection-side-panel__csv-help-popover";
  popover.hidden = true;
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", "CSV 下載內容說明");
  popover.innerHTML = `
    <header class="v4-projection-side-panel__csv-help-header">
      <strong>CSV 欄位內容</strong>
      <button type="button" class="v4-projection-side-panel__csv-help-close" aria-label="關閉 CSV 說明">&times;</button>
    </header>
    <div class="v4-projection-side-panel__csv-help-body">
      <ul>
        <li>基本資訊：測站 A/B、投影起訖時間、時間窗長度、來源等級、座標精度。</li>
        <li>通訊統計：總可通訊時間、換手次數、平均鏈路停留時間、LEO/MEO/GEO 各軌道累計時間。</li>
        <li>可見時間窗：衛星 ID、軌道類型、兩站共同可見的開始/結束時間與持續時間。</li>
        <li>換手事件：換手時間、來源衛星、目標衛星、觸發原因。</li>
        <li>來源邊界：pair source attribution、non-claims、TLE manifest、資料新鮮度、測站精度。</li>
        <li>模型資料：容量、延遲、jitter、RF chain、雨衰/大氣查表、換手政策門檻、資料完整性。</li>
      </ul>
    </div>
  `;

  const closeButton = popover.querySelector<HTMLButtonElement>(
    ".v4-projection-side-panel__csv-help-close"
  );
  const ownerDocument = root.ownerDocument;

  const placePopover = (): void => {
    const ownerWindow = ownerDocument.defaultView;
    if (!ownerWindow) {
      return;
    }
    const viewportMarginPx = 12;
    const panel = root.closest<HTMLElement>(".v4-projection-side-panel");
    const panelRect = panel?.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    popover.style.position = "fixed";
    popover.style.left = "auto";
    popover.style.right = "auto";
    popover.style.top = "0px";
    popover.style.bottom = "auto";
    const rect = popover.getBoundingClientRect();
    const gapPx = 12;
    const maxLeft = ownerWindow.innerWidth - rect.width - viewportMarginPx;
    const preferredLeft = panelRect
      ? panelRect.left - rect.width - gapPx
      : triggerRect.left - rect.width - gapPx;
    const left = Math.min(
      Math.max(preferredLeft, viewportMarginPx),
      Math.max(viewportMarginPx, maxLeft)
    );
    const preferredTop = triggerRect.bottom - rect.height;
    const maxTop = ownerWindow.innerHeight - rect.height - viewportMarginPx;
    const top = Math.min(
      Math.max(preferredTop, viewportMarginPx),
      Math.max(viewportMarginPx, maxTop)
    );
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
  };

  const setOpen = (open: boolean, focusTrigger = false): void => {
    popover.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      placePopover();
      closeButton?.focus();
    } else if (focusTrigger) {
      trigger.focus();
    }
  };

  const toggleHelp = (event: Event): void => {
    event.stopPropagation();
    setOpen(Boolean(popover.hidden));
  };

  const closeHelp = (event: Event): void => {
    event.stopPropagation();
    setOpen(false, true);
  };

  const handleOutsideClick = (event: Event): void => {
    const target = event.target as Node;
    if (!root.contains(target) && !popover.contains(target)) {
      setOpen(false);
    }
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && !popover.hidden) {
      setOpen(false, true);
    }
  };

  const handleResize = (): void => {
    if (!popover.hidden) {
      placePopover();
    }
  };

  trigger.addEventListener("click", toggleHelp);
  closeButton?.addEventListener("click", closeHelp);
  ownerDocument.addEventListener("click", handleOutsideClick);
  ownerDocument.addEventListener("keydown", handleKeydown);
  ownerDocument.defaultView?.addEventListener("resize", handleResize);

  root.append(csvButton, trigger);
  ownerDocument.body.append(popover);

  return {
    root,
    dispose(): void {
      trigger.removeEventListener("click", toggleHelp);
      closeButton?.removeEventListener("click", closeHelp);
      ownerDocument.removeEventListener("click", handleOutsideClick);
      ownerDocument.removeEventListener("keydown", handleKeydown);
      ownerDocument.defaultView?.removeEventListener("resize", handleResize);
      popover.remove();
    }
  };
}
