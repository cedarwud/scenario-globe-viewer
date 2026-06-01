/**
 * Contextual Operator Guides for the Multi-Station Selector surface.
 * Provides localized Traditional Chinese tooltips/popovers for targeted UI elements
 * instead of blocking the entire screen.
 */

import "./operator-guide-modal.css";

export interface TimelineHelpHandle {
  dispose(): void;
}

export function mountTimelineHelp(container: HTMLElement): TimelineHelpHandle {
  const doc = container.ownerDocument;

  // Create timeline guide trigger button
  const trigger = doc.createElement("button");
  trigger.type = "button";
  trigger.className = "gs-timeline-help-trigger";
  trigger.setAttribute("aria-label", "開啟時間軸指南");
  trigger.title = "時間軸與星曆控制指南";
  trigger.innerHTML = "?";

  // Create timeline popover card
  const popover = doc.createElement("div");
  popover.className = "gs-timeline-help-popover";
  popover.hidden = true;
  popover.setAttribute("role", "tooltip");
  popover.innerHTML = `
    <header class="gs-popover-header">
      <h4>時間軸與軌道星曆說明</h4>
      <button type="button" class="gs-popover-close" aria-label="關閉">&times;</button>
    </header>
    <div class="gs-popover-body">
      <ul>
        <li><strong>Cesium 時間軸：</strong>拖動底部時間條可前進/後退，動態呈現該時刻各軌道可見衛星。</li>
        <li><strong>TLE 遙測與更新：</strong>顯示當前加載的星曆封包快照時間與數據來源公信力。</li>
        <li><strong>雙向同步：</strong>支援與播放控制器同步，精確模擬星地鏈路動態切換。</li>
      </ul>
    </div>
  `;

  trigger.appendChild(popover);
  container.appendChild(trigger);

  const togglePopover = (event: Event) => {
    event.stopPropagation();
    popover.hidden = !popover.hidden;
  };

  const closePopover = (event: Event) => {
    event.stopPropagation();
    popover.hidden = true;
  };

  trigger.addEventListener("click", togglePopover);
  popover.querySelector(".gs-popover-close")?.addEventListener("click", closePopover);

  // Close when clicking outside
  const handleOutsideClick = (event: Event) => {
    if (!trigger.contains(event.target as Node)) {
      popover.hidden = true;
    }
  };
  doc.addEventListener("click", handleOutsideClick);

  return {
    dispose() {
      trigger.removeEventListener("click", togglePopover);
      doc.removeEventListener("click", handleOutsideClick);
      if (trigger.parentElement) {
        trigger.parentElement.removeChild(trigger);
      }
    }
  };
}
