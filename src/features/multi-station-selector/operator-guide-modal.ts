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
      <ul style="margin: 0; padding-left: 14px; list-style-type: disc;">
        <li style="font-size: 18px; margin-bottom: 9px; line-height: 1.6; color: #cbd5e1;">
          <strong>環形時間盤與播放鈕（左下角）：</strong>
          <ul style="padding-left: 14px; margin-top: 4px; margin-bottom: 4px; list-style-type: circle;">
            <li style="font-size: 18px; margin-bottom: 4px;"><code>▶</code> <strong>播放</strong> / <code>▮▮</code> <strong>暫停</strong>：啟動或暫停動態模擬的時間演進。</li>
            <li style="font-size: 18px; margin-bottom: 4px;"><code>◀◀</code> / <code>▶▶</code> <strong>微步步進</strong>：可在離散採樣點間，往前或往後微調單個時間刻度。</li>
            <li style="font-size: 18px; margin-bottom: 4px;"><strong>刻度環盤（時間旋鈕）</strong>：使用滑鼠沿指針順時針或逆時針拖曳，可以極細緻地手動旋轉微調時間快慢。</li>
          </ul>
        </li>
        <li style="font-size: 18px; margin-bottom: 9px; line-height: 1.6; color: #cbd5e1;">
          <strong>時間標尺與綠色指針（橫向時間軸）：</strong>橫向的綠色指針線代表當前模擬時間。您可用滑鼠直接拖曳綠色指針，或點擊時間軸上的任意刻度，快速跳轉至特定的歷史時刻。
        </li>
        <li style="font-size: 18px; margin-bottom: 9px; line-height: 1.6; color: #cbd5e1;">
          <strong>模擬播放速度（右下角倍速鍵）：</strong>點擊 <code>30x</code>、<code>60x</code> 或 <code>120x</code> 預設倍率按鈕，可直接切換時間流逝倍速（例如 60x 代表每過真實 1 秒，模擬時間便推進 60 秒），便於流暢觀察長週期跨軌道交接決策。
        </li>
        <li style="font-size: 18px; margin-bottom: 9px; line-height: 1.6; color: #cbd5e1;">
          <strong>星曆雙向同步：</strong>拖動時間軸時，右上角的 TLE 快照與模擬天線、下方的 LEO 衛星可見數量，以及雨衰計算數值皆會雙向即時重新運算並同步更新。
        </li>
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
          // Make space for 4 buttons by adjusting widths
          const buttons = helpContainer.querySelectorAll<HTMLElement>(".cesium-navigation-button");
          buttons.forEach(btn => {
            btn.style.width = "25%";
          });

          // Create native help tab button
          const nativeBtn = doc.createElement("button");
          nativeBtn.type = "button";
          nativeBtn.className = "cesium-navigation-button cesium-navigation-button-native";
          nativeBtn.style.width = "25%";
          nativeBtn.textContent = "地圖按鈕";

          // Create custom help tab button
          const presetsBtn = doc.createElement("button");
          presetsBtn.type = "button";
          presetsBtn.className = "cesium-navigation-button cesium-navigation-button-presets";
          presetsBtn.style.width = "25%";
          presetsBtn.textContent = "系統新增";

          // Create native help panel
          const nativeHelp = doc.createElement("div");
          nativeHelp.className = "cesium-native-navigation-help";
          nativeHelp.style.display = "none";
          nativeHelp.style.padding = "14px 10px";
          nativeHelp.style.color = "#cbd5e1";
          nativeHelp.style.webkitTextFillColor = "#cbd5e1";
          nativeHelp.style.fontSize = "18px";
          nativeHelp.style.lineHeight = "1.6";
          nativeHelp.innerHTML = `
            <ul style="margin: 0; padding-left: 16px; list-style-type: disc;">
              <li style="margin-bottom: 12px; font-size: 18px;"><strong>🔍 搜尋鍵（Geocoder）：</strong>輸入地名、國家或經緯度坐標，相機將自動飛越並聚焦至該地。</li>
              <li style="margin-bottom: 12px; font-size: 18px;"><strong>🏠 重置相機（Home Button）：</strong>點擊「小房子」可一鍵重置視角，返回地球全景的初始預設範圍。</li>
              <li style="margin-bottom: 12px; font-size: 18px;"><strong>🌐 維度切換（Scene Mode Picker）：</strong>一鍵在「3D 三維球體」、「2D 平面地圖」與「2.5D 哥倫布投影」視角間切換。</li>
              <li style="margin-bottom: 12px; font-size: 18px;"><strong>🗺️ 底圖切換（Base Layer Picker）：</strong>切換底圖影像（衛星圖、電子地圖）與啟用/停用真實 3D 地形起伏（Terrain）。</li>
            </ul>
          `;

          // Create custom help panel
          const presetsHelp = doc.createElement("div");
          presetsHelp.className = "cesium-presets-navigation-help";
          presetsHelp.style.display = "none";
          presetsHelp.style.padding = "14px 10px";
          presetsHelp.style.color = "#cbd5e1";
          presetsHelp.style.webkitTextFillColor = "#cbd5e1";
          presetsHelp.style.fontSize = "18px";
          presetsHelp.style.lineHeight = "1.6";
          presetsHelp.innerHTML = `
            <ul style="margin: 0; padding-left: 16px; list-style-type: disc;">
              <li style="margin-bottom: 12px; font-size: 18px;"><strong>🟢 綠色方形「網格軌道地球」按鈕：</strong>點擊可直接切換至「中華電信（陽明山分公司）與新加坡 Speedcast / 南非 SANSA 地面站」的跨軌道星地鏈路投影分析。</li>
              <li style="margin-bottom: 12px; font-size: 18px;">
                <strong>💡 為什麼 Demo 選擇這三個測站？</strong>
                <ul style="padding-left: 14px; margin-top: 4px; margin-bottom: 4px; list-style-type: circle;">
                  <li style="font-size: 18px; margin-bottom: 6px;"><strong>中華電信（陽明山）與新加坡 Speedcast</strong>：屬於經電信商實測驗證（Tier 1）的經典實際測站配對，具備極高的真實傳輸與網路對接參考價值。</li>
                  <li style="font-size: 18px; margin-bottom: 6px;"><strong>結合南非太空局（SANSA）哈特比斯特霍克測站</strong>：可模擬橫跨亞、非兩洲的超長距離全球化跨軌道（LEO/MEO/GEO）星地鏈路，完整展示動態視線遮蔽、大氣雨衰影響（ITU-R P.618-14）及複雜的衛星交接決策。</li>
                </ul>
              </li>
              <li style="margin-bottom: 12px; font-size: 18px;"><strong>📍 地面站單擊交互（Single Click）：</strong>在三維地球上直接<strong>單擊</strong>任何一個地面站的彩色圓形地標或標籤，即可平滑飛越聚焦該測站，同時自動在左側選單中將其選中為 Station A 或 B，並在左下角展開詳細能力卡片。</li>
            </ul>
          `;

          // Insert buttons after right button
          rightBtn.parentNode?.insertBefore(nativeBtn, rightBtn.nextSibling);
          nativeBtn.parentNode?.insertBefore(presetsBtn, nativeBtn.nextSibling);

          // Append panels
          helpContainer.appendChild(nativeHelp);
          helpContainer.appendChild(presetsHelp);

          const activateNative = () => {
            leftBtn.classList.remove("cesium-navigation-button-selected");
            rightBtn.classList.remove("cesium-navigation-button-selected");
            presetsBtn.classList.remove("cesium-navigation-button-selected");
            nativeBtn.classList.add("cesium-navigation-button-selected");

            mouseHelp.classList.remove("cesium-navigation-help-active");
            mouseHelp.style.display = "none";
            touchHelp.classList.remove("cesium-navigation-help-active");
            touchHelp.style.display = "none";
            presetsHelp.style.display = "none";

            nativeHelp.style.display = "block";
          };

          const activateCustom = () => {
            leftBtn.classList.remove("cesium-navigation-button-selected");
            rightBtn.classList.remove("cesium-navigation-button-selected");
            nativeBtn.classList.remove("cesium-navigation-button-selected");
            presetsBtn.classList.add("cesium-navigation-button-selected");

            mouseHelp.classList.remove("cesium-navigation-help-active");
            mouseHelp.style.display = "none";
            touchHelp.classList.remove("cesium-navigation-help-active");
            touchHelp.style.display = "none";
            nativeHelp.style.display = "none";

            presetsHelp.style.display = "block";
          };

          const deactivateAllCustom = () => {
            nativeBtn.classList.remove("cesium-navigation-button-selected");
            presetsBtn.classList.remove("cesium-navigation-button-selected");
            nativeHelp.style.display = "none";
            presetsHelp.style.display = "none";

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

          nativeBtn.addEventListener("click", activateNative);
          presetsBtn.addEventListener("click", activateCustom);
          leftBtn.addEventListener("click", deactivateAllCustom);
          rightBtn.addEventListener("click", deactivateAllCustom);
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
