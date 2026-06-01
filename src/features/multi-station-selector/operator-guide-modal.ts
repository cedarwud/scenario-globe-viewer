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
      <h4>時間軸與播放控制指南</h4>
      <button type="button" class="gs-popover-close" aria-label="關閉">&times;</button>
    </header>
    <div class="gs-popover-body">
      <ul>
        <li><strong>時間軌道標尺（底部時間軸）：</strong>拖動綠色時間指標或直接點擊時間軸上的任意刻度，可自由前進或後退模擬時間點，即時觀察該特定時刻下所有軌道衛星的幾何可見性。</li>
        <li><strong>播放控制面板（左下角）：</strong>
          <ul style="padding-left: 12px; margin-top: 4px; margin-bottom: 4px;">
            <li><code>▶</code> / <code>▮▮</code>（播放與暫停）：啟動或停止動態時間推進模擬。</li>
            <li><code>◀◀</code> / <code>▶▶</code>（微步前進與後退）：在離散的時間採樣點間進行單步微調。</li>
          </ul>
        </li>
        <li><strong>模擬速度切換（右下角倍速鍵）：</strong>點擊 <code>30x</code>、<code>60x</code> 或 <code>120x</code> 預設倍率按鈕，可加快或減慢模擬播放速率，便於流暢觀察長週期星地交接（Handover）決策變化。</li>
        <li><strong>星曆同步：</strong>拖動時間軸時，右上角的 TLE 快照 telemetry 晶片、下方的 LEO 可見數量以及右側的 Ku/Ka 雨衰模擬數值皆會雙向即時重新運算並渲染。</li>
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

export interface CesiumHelpIntegrationHandle {
  dispose(): void;
}

export function integrateCesiumHelpButton(viewerContainer: HTMLElement): CesiumHelpIntegrationHandle {
  const doc = viewerContainer.ownerDocument;

  const onHelpTriggerClick = () => {
    let attempts = 0;
    const tryInject = () => {
      const helpContainer = viewerContainer.querySelector<HTMLElement>(".cesium-navigation-help");
      if (helpContainer) {
        // Check if already integrated
        if (helpContainer.querySelector(".cesium-navigation-button-presets")) return;

        const leftBtn = helpContainer.querySelector<HTMLElement>(".cesium-navigation-button-left");
        const rightBtn = helpContainer.querySelector<HTMLElement>(".cesium-navigation-button-right");
        const mouseHelp = helpContainer.querySelector<HTMLElement>(".cesium-click-navigation-help");
        const touchHelp = helpContainer.querySelector<HTMLElement>(".cesium-touch-navigation-help");

        if (leftBtn && rightBtn && mouseHelp && touchHelp) {
          // Make space for 3 buttons by adjusting widths
          const buttons = helpContainer.querySelectorAll<HTMLElement>(".cesium-navigation-button");
          buttons.forEach(btn => {
            btn.style.width = "33.33%";
          });

          // Create presets button
          const presetsBtn = doc.createElement("button");
          presetsBtn.type = "button";
          presetsBtn.className = "cesium-navigation-button cesium-navigation-button-presets";
          presetsBtn.style.width = "33.33%";
          presetsBtn.textContent = "預設與視角";

          // Create presets help panel
          const presetsHelp = doc.createElement("div");
          presetsHelp.className = "cesium-presets-navigation-help";
          presetsHelp.style.display = "none";
          presetsHelp.style.padding = "14px 10px";
          presetsHelp.style.color = "#cbd5e1";
          presetsHelp.style.fontSize = "12.5px";
          presetsHelp.style.lineHeight = "1.6";
          presetsHelp.innerHTML = `
            <ul style="margin: 0; padding-left: 16px;">
              <li style="margin-bottom: 8px;"><strong>黃色預設按鈕：</strong>開啟 OneWeb LEO + Intelsat GEO 歷史航空交接場景，並自動播放動畫。</li>
              <li style="margin-bottom: 8px;"><strong>綠色預設按鈕：</strong>開啟中華電信（陽明山）與新加坡 Speedcast / 南非 SANSA 測站跨軌道投影分析。</li>
              <li style="margin-bottom: 8px;"><strong>聚焦追蹤操控：</strong>雙擊地球或衛星可直接鎖定追蹤該 Actor，滾輪縮放調整視角。</li>
            </ul>
          `;

          // Insert button after right button
          rightBtn.parentNode?.insertBefore(presetsBtn, rightBtn.nextSibling);
          // Append panel
          helpContainer.appendChild(presetsHelp);

          const activatePresets = () => {
            leftBtn.classList.remove("cesium-navigation-button-selected");
            rightBtn.classList.remove("cesium-navigation-button-selected");
            presetsBtn.classList.add("cesium-navigation-button-selected");

            mouseHelp.classList.remove("cesium-navigation-help-active");
            mouseHelp.style.display = "none";
            touchHelp.classList.remove("cesium-navigation-help-active");
            touchHelp.style.display = "none";

            presetsHelp.style.display = "block";
          };

          const deactivatePresets = () => {
            presetsBtn.classList.remove("cesium-navigation-button-selected");
            presetsHelp.style.display = "none";
            // restore block/none based on standard cesium behavior
            setTimeout(() => {
              if (leftBtn.classList.contains("cesium-navigation-button-selected")) {
                mouseHelp.style.display = "";
                mouseHelp.classList.add("cesium-navigation-help-active");
              } else if (rightBtn.classList.contains("cesium-navigation-button-selected")) {
                touchHelp.style.display = "";
                touchHelp.classList.add("cesium-navigation-help-active");
              }
            }, 10);
          };

          presetsBtn.addEventListener("click", activatePresets);
          leftBtn.addEventListener("click", deactivatePresets);
          rightBtn.addEventListener("click", deactivatePresets);
          return;
        }
      }
      
      attempts++;
      if (attempts < 30) {
        setTimeout(tryInject, 10);
      }
    };
    tryInject();
  };

  const helpTrigger = viewerContainer.querySelector<HTMLElement>(".cesium-navigation-help-button");
  if (helpTrigger) {
    helpTrigger.addEventListener("click", onHelpTriggerClick);
  }

  return {
    dispose() {
      if (helpTrigger) {
        helpTrigger.removeEventListener("click", onHelpTriggerClick);
      }
    }
  };
}
