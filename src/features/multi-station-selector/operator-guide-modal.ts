/**
 * Operator Guide Modal for the Multi-Station Selector surface.
 * Traditional Chinese (繁體中文) guidance explaining:
 * 1. Stations & Bands (測站與頻段控制)
 * 2. Replay & Time (播放與時間軸)
 * 3. Link budget & Physics (鏈路計算與模擬)
 */

import "./operator-guide-modal.css";

export interface OperatorGuideHandle {
  open(): void;
  close(): void;
  dispose(): void;
}

export function mountOperatorGuide(container: HTMLElement): OperatorGuideHandle {
  const doc = container.ownerDocument;

  // Create Modal element
  const backdrop = doc.createElement("div");
  backdrop.className = "gs-operator-guide-backdrop";
  backdrop.setAttribute("aria-hidden", "true");

  const modal = doc.createElement("div");
  modal.className = "gs-operator-guide-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "gs-guide-title");

  // Traditional Chinese Guide IA
  modal.innerHTML = `
    <header class="gs-guide-header">
      <div class="gs-guide-title-group">
        <svg class="gs-guide-title-icon" viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" fill="none" stroke="currentColor" stroke-width="2"/>
          <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <h2 id="gs-guide-title">操作與互動指南 (Operator Guide)</h2>
      </div>
      <button type="button" class="gs-guide-close" aria-label="關閉指南" title="關閉">&times;</button>
    </header>
    
    <nav class="gs-guide-nav" role="tablist">
      <button type="button" class="gs-guide-nav-tab" role="tab" data-tab="stations" aria-selected="true">測站與頻段</button>
      <button type="button" class="gs-guide-nav-tab" role="tab" data-tab="replay" aria-selected="false">播放與時間軸</button>
      <button type="button" class="gs-guide-nav-tab" role="tab" data-tab="link" aria-selected="false">鏈路與物理模擬</button>
    </nav>
    
    <main class="gs-guide-content">
      <!-- Section 1: Stations & Bands -->
      <section class="gs-guide-panel" data-panel="stations" role="tabpanel">
        <h3>1. 測站與頻段控制 (Stations & Bands)</h3>
        <p>此系統支援地面站點對之間在多軌道 (LEO/MEO/GEO) 衛星網絡下的星地與星際鏈路模擬。</p>
        
        <div class="gs-guide-feature-box">
          <div class="gs-guide-step">
            <span class="gs-guide-badge">選取站點</span>
            <span>點擊左上角的 <strong class="gs-guide-interactive-text" data-highlight="search-picker">Search 搜尋框</strong> 或下方站點清單，選取 Station A 與 Station B 作為通訊端點。選取後系統將自動繪製地面站到可見衛星的鏈路扇區。</span>
          </div>
          <div class="gs-guide-step">
            <span class="gs-guide-badge">頻段過濾</span>
            <span>在左側邊欄上方點擊 <strong class="gs-guide-interactive-text" data-highlight="band-filter">頻段過濾晶片 (Band Filter)</strong>，例如選取 1.25GHz (L頻段) 或 2.5GHz (S頻段)，系統會即時篩選支援該載波的測站點與星地路徑。</span>
          </div>
        </div>
      </section>
      
      <!-- Section 2: Replay & Time -->
      <section class="gs-guide-panel" data-panel="replay" role="tabpanel" hidden>
        <h3>2. 播放與時間軸 (Timeline & Presets)</h3>
        <p>控制模擬重播時間，觀察衛星移動如何引發動態鏈路變更與跨軌道切換。</p>
        
        <div class="gs-guide-feature-box">
          <div class="gs-guide-step">
            <span class="gs-guide-badge">重播控制</span>
            <span>使用右側邊欄下方的播放控制組，提供 <strong class="gs-guide-interactive-text" data-highlight="replay-play">Play/Pause (播放/暫停)</strong>、重置，以及三種限制倍速設定：<strong>30x (導讀模式)</strong>、<strong>60x (標準重播)</strong>、<strong>120x (快速掃描)</strong>，用於不同場景審查。</span>
          </div>
          <div class="gs-guide-step">
            <span class="gs-guide-badge">資料更新</span>
            <span>畫面上顯示的 <strong class="gs-guide-interactive-text" data-highlight="leo-telemetry">LEO 衛星晶片</strong> 與 <strong class="gs-guide-interactive-text" data-highlight="tle-telemetry">TLE 遙測晶片</strong> 提供了最新兩線軌道根數 (TLE) 來源公信力與快照時間，用以確保模擬精度。</span>
          </div>
        </div>
      </section>
      
      <!-- Section 3: Link budget & Physics -->
      <section class="gs-guide-panel" data-panel="link" role="tabpanel" hidden>
        <h3>3. 幾何極限與降雨衰減物理模擬 (Link Budget & Physics)</h3>
        <p>即時計算由大氣游離、天線離軸角度以及極化降雨帶來的路徑損耗與訊號衰減。</p>
        
        <div class="gs-guide-feature-box">
          <div class="gs-guide-step">
            <span class="gs-guide-badge">降雨模擬滑桿</span>
            <span>拖曳右側面板的 <strong class="gs-guide-interactive-text" data-highlight="rain-slider">降雨率滑桿 (Rain Rate Slider)</strong>（0 到 100 mm/h），可以即時模擬在暴雨天氣下 Ku/Ka 頻段天線的雨衰衰減。<strong> availability 數值</strong> 將即時動態折損，供工程師驗證最壞天氣下的鏈路冗餘。</span>
          </div>
          <div class="gs-guide-step">
            <span class="gs-guide-badge">標準引用</span>
            <span>系統嚴格遵照國際電聯標準，雨衰模型引用自 <strong>ITU-R P.618-14 §2.2.1</strong> 計算式；自由空間路徑損耗引用自 <strong>ITU-R P.525</strong>；切換決策則引入 <strong>3GPP TR 38.821 §7.3</strong> 星地切換 hysteresis 機制。</span>
          </div>
        </div>
      </section>
    </main>
    
    <footer class="gs-guide-footer">
      <span class="gs-guide-footer-text">Scenario Globe Viewer v4.11</span>
      <button type="button" class="gs-guide-btn-primary gs-guide-close-btn">確認並開始使用</button>
    </footer>
  `;

  backdrop.appendChild(modal);
  container.appendChild(backdrop);

  // Setup tab routing
  const tabs = Array.from(modal.querySelectorAll<HTMLButtonElement>(".gs-guide-nav-tab"));
  const panels = Array.from(modal.querySelectorAll<HTMLElement>(".gs-guide-panel"));

  const switchTab = (tabId: string) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === tabId;
      tab.setAttribute("aria-selected", String(active));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tabId;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.dataset.tab;
      if (tabId) switchTab(tabId);
    });
  });

  // Setup hover highlighting mechanism
  const interactiveTexts = Array.from(modal.querySelectorAll<HTMLElement>(".gs-guide-interactive-text"));
  
  const getSelectorForHighlight = (highlightKey: string): string => {
    switch (highlightKey) {
      case "search-picker":
        return ".gs-station-list-picker, .gs-marker-search-input, .station-list-picker";
      case "band-filter":
        return ".gs-marker-band-chips, .marker-band-chips, [data-band]";
      case "replay-play":
        return ".v4-projection-replay-controls, [data-action='play-pause']";
      case "leo-telemetry":
        return "[data-leo-source-record-count-chip='true']";
      case "tle-telemetry":
        return "[data-tle-telemetry-chip='true']";
      case "rain-slider":
        return ".v4-projection-side-panel__rain-slider, [data-row='2'] input[type='range']";
      default:
        return "";
    }
  };

  const handleHoverStart = (event: MouseEvent) => {
    const target = event.currentTarget as HTMLElement;
    const highlightKey = target.dataset.highlight;
    if (!highlightKey) return;
    
    const selector = getSelectorForHighlight(highlightKey);
    if (!selector) return;
    
    const matchedElements = document.querySelectorAll(selector);
    matchedElements.forEach((el) => {
      el.classList.add("gs-guide-highlight-pulse");
    });
  };

  const handleHoverEnd = (event: MouseEvent) => {
    const target = event.currentTarget as HTMLElement;
    const highlightKey = target.dataset.highlight;
    if (!highlightKey) return;
    
    const selector = getSelectorForHighlight(highlightKey);
    if (!selector) return;
    
    const matchedElements = document.querySelectorAll(selector);
    matchedElements.forEach((el) => {
      el.classList.remove("gs-guide-highlight-pulse");
    });
  };

  interactiveTexts.forEach((text) => {
    text.addEventListener("mouseenter", handleHoverStart);
    text.addEventListener("mouseleave", handleHoverEnd);
  });

  // Open/Close Actions
  const open = () => {
    backdrop.classList.add("gs-operator-guide-backdrop--open");
    modal.classList.add("gs-operator-guide-modal--open");
    switchTab("stations");
  };

  const close = () => {
    backdrop.classList.remove("gs-operator-guide-backdrop--open");
    modal.classList.remove("gs-operator-guide-modal--open");
    
    // Clean up any remaining highlight classes
    document.querySelectorAll(".gs-guide-highlight-pulse").forEach((el) => {
      el.classList.remove("gs-guide-highlight-pulse");
    });
  };

  // Close handlers
  const closeElements = modal.querySelectorAll(".gs-guide-close, .gs-guide-close-btn");
  closeElements.forEach((btn) => {
    btn.addEventListener("click", close);
  });

  // Close on clicking backdrop
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      close();
    }
  });

  return {
    open,
    close,
    dispose() {
      interactiveTexts.forEach((text) => {
        text.removeEventListener("mouseenter", handleHoverStart);
        text.removeEventListener("mouseleave", handleHoverEnd);
      });
      closeElements.forEach((btn) => {
        btn.removeEventListener("click", close);
      });
      if (backdrop.parentElement) {
        backdrop.parentElement.removeChild(backdrop);
      }
    }
  };
}
