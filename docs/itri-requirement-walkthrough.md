# ITRI 需求逐條走查 (Requirement Walkthrough)

**狀態日期 (status date)**: 2026-05-17
**對象 (audience)**: ITRI 驗收工程師、非專業 stakeholder
**用途 (purpose)**: 11/30 驗收會議的逐條對照說明。每一條需求都對應到一個可在
demo 畫面上重現 (reproduce) 的位置與一組真實數字。

## 本文件如何使用 (how to read this)

- 需求一律以 consolidated ID 引用 (例 `R1-F1`、`K-A4`、`V-MO1`)。ID 的權威來源是
  `/home/u24/papers/itri/requirements-consolidated.md`。
- 標準一律附章節 (例 `3GPP TR 38.811 §6.7`、`ITU-R P.618-14 §2.2.1.1`)。
- 本文件只涵蓋 **Bucket A — 需要本專案完成的 19 條** (A.1 文件 18 + A.2 口頭 1)。
  Bucket B (需 ITRI 資料 / Tier B 替代已實作 7 條) 與 Bucket C (ITRI 既有 infra
  / 報告層 8 條) 不在本走查範圍,理由見 `requirements-consolidated.md`。
- 「完成度」一律據實描述可執行的程式碼,不寫願景。未做的部分明寫未做。

---

## §0 名詞速查 (vocabulary primer)

給非無線通訊背景的 reviewer。技術詞保留英文,避免翻譯失真。

| 名詞 | 英文 | 白話解釋 |
|---|---|---|
| 低軌 / 中軌 / 高軌 | LEO / MEO / GEO | 衛星離地高度分類。LEO ~550 km、MEO ~2 萬 km、GEO ~35786 km。越低延遲越小但過頂越快。 |
| 來回延遲 | RTT (round-trip time) | 訊號一去一回的時間。距離越遠越大。 |
| 單程傳播延遲 | one-way propagation delay | 訊號單向走完 slant range 所需時間 = 距離 / 光速。 |
| 斜距 | slant range | 地面站到衛星的直線距離,隨衛星仰角變化。 |
| 仰角 | elevation | 從地面站看衛星,相對水平面的角度。0° 在地平線,90° 正上方。 |
| 換手 | handover | 服務從一顆衛星切換到另一顆 (或另一軌道層) 的動作。 |
| 抖動 | jitter | 延遲的變動量。越穩定越小。 |
| 軌道兩行根數 | TLE (two-line element) | NORAD 標準格式的衛星軌道參數,SGP4 可由它推算衛星位置。 |
| 覆蓋區 | footprint | 衛星訊號在地面可涵蓋的範圍。 |
| 自由空間路徑損耗 | FSPL (free-space path loss) | 訊號隨距離擴散造成的功率衰減,單位 dB。 |
| 雨衰 | rain attenuation | 雨滴吸收/散射造成的額外衰減,頻率越高越嚴重。 |
| 大氣氣體吸收 | gas absorption | 氧氣與水氣造成的衰減。 |
| 真實性層級 | source / truth tier | 一個數字的可信來源等級,見下。 |

### 真實性三層級 (source-authority tiers)

本專案對畫面上每個數字標註它的「真實性來源」,避免把模型推算當成量測事實。

- **Tier A — operator-validated**:電信業者實測 retained data。目前 0 條已交付。
- **Tier B — public-disclosed**:3GPP / ITU-R 公開標準的公式自我實作。可重現、可稽核。
- **Tier C — geometric-derived**:由 SGP4 + 本地 TLE 幾何推算 (例如可見性、衛星數)。

---

## §1 逐條需求卡 (per-requirement cards)

每張卡 8 欄:來源 / 原文 / 白話 / 完成度 / demo 驗證位置 / source tier / 重現方式 /
工程師可能問。

### 卡 1 — R1-T1 / K-A1:多軌道整合與訊號切換

- **來源**: r1.docx + kickoff slide 2
- **原文**: 整合 ITRI 軌道模型 LEO/MEO/GEO,並支援多軌道訊號切換。
- **白話**: 畫面上同時有低/中/高軌三層衛星,且服務能在它們之間切換。
- **完成度**: 視覺化已完成。跨軌道切換邏輯由 `handover-policy.ts` 的
  `cross-orbit-live` 政策提供 (見卡 19 / V-MO1)。
- **demo 驗證位置**: V4 demo route,三層星座同時顯示;side panel 的 Handover events
  區塊列出切換事件。
- **source tier**: 幾何顯示 Tier C;切換 metric Tier B。
- **重現**: 開 V4 route,觀察 LEO/MEO/GEO 三層;side panel「LEO/MEO/GEO」comm-time
  分項即三軌道個別服務時間。
- **工程師可能問**: 「切換是真的連續 handover 還是場景切換?」→ 見卡 19,V-MO1
  把這點明確化為連續 live handover。

### 卡 2 — R1-T2 / K-D1:衛星軌道資料整合

- **來源**: r1.docx + kickoff slide 5
- **原文**: 衛星模型軌道資料整合。
- **白話**: 真實衛星的軌道資料能被讀進系統並用來定位。
- **完成度**: done。
- **demo 驗證位置**: 任何 route 的衛星位置;TLE fixtures 位於
  `public/fixtures/satellites/`。
- **source tier**: Tier C (SGP4 + TLE)。
- **重現**: side panel 的 Pair visibility windows 每列附 satelliteId,可回對 TLE。
- **工程師可能問**: 「TLE 多新?」→ 本地 Starlink/OneWeb TLE 最新 2026-05-16。

### 卡 3 — R1-T3 / K-D2:視覺化呈現

- **來源**: r1.docx + kickoff slide 5
- **原文**: 視覺化呈現 (Blender 工具或等效)。
- **白話**: 用 3D 地球把衛星與情境畫出來。
- **完成度**: done。採用 Cesium 為 Blender 的等效方案 (即時、可互動,優於離線算圖)。
- **demo 驗證位置**: 整個 viewer。
- **source tier**: 不適用 (呈現層)。
- **重現**: 開首頁即見 3D 地球與星座。
- **工程師可能問**: 「為何不是 Blender?」→ Blender 為離線算圖;互動式即時 demo
  需要 WebGL 引擎,Cesium 為業界標準等效方案。

### 卡 4 — R1-T4 / K-D3:UI 互動介面

- **來源**: r1.docx + kickoff slide 5
- **原文**: UI 互動介面。
- **白話**: 使用者能點選、調整、操作。
- **完成度**: done。
- **demo 驗證位置**: 首頁地面站選取、V4 side panel、雨衰滑桿、CSV 按鈕。
- **source tier**: 不適用。
- **重現**: 首頁點兩個地面站 → 進 V4 route → 操作 side panel。
- **工程師可能問**: 「能選真實地面站嗎?」→ 可,69 站公開 registry。

### 卡 5 — R1-T5 / K-D4:換手規則參數設計

- **來源**: r1.docx + kickoff slide 5
- **原文**: 通訊換手規則模擬等參數設計。
- **白話**: 換手不是寫死,而是依可調規則 (門檻、遲滯) 決定。
- **完成度**: done。`handover-policy.ts` 提供三種政策
  (`bootstrap-balanced-v1`、`leo-first`、`cross-orbit-live`),參數含
  elevationThresholdDeg、hysteresisDb、minVisibilityWindowMs、latencyBudgetMs。
- **demo 驗證位置**: side panel Handover events;runtime-projection 取用該模組。
- **source tier**: Tier B — 3GPP TR 38.821 §7.3。
- **重現**: `src/runtime/link-budget/handover-policy.ts` 函式頂部附 §7.3 引用。
- **工程師可能問**: 「門檻數字哪來?」→ 政策結構源自 TR 38.821 §7.3 trigger
  metrics (elevation / RSRP / 可見視窗);門檻為可調 config,非寫死。

### 卡 6 — R1-T6 / K-D5:通訊速率可視化

- **來源**: r1.docx + kickoff slide 5
- **原文**: 通訊速率可視化設計。
- **白話**: 不只顯示「連得到」,還顯示「連得多快」。
- **完成度**: done。runtime-projection 由 link-budget 推算每軌道 networkSpeedMbps,
  雨衰會即時下修速率 (見卡 13)。
- **demo 驗證位置**: side panel Rain attenuation 區塊的 per-orbit downlink
  throughput。
- **source tier**: Tier B — FSPL (TR 38.811 §6.6) + 雨衰 (P.618-14) + 氣衰
  (P.676-13)。
- **重現**: 拉雨衰滑桿,觀察 LEO/GEO downlink Mbps 隨之變化。
- **工程師可能問**: 「速率是量測還是模型?」→ 模型推算 (modeled-precision),
  side panel 的 truth boundary 已標示。

### 卡 7 — R1-F1 / K-E1:≥ 500 顆 LEO 模擬

- **來源**: r1.docx + kickoff slide 5
- **原文**: 支援 ≥ 500 LEO 模擬 (Starlink、OneWeb)。
- **白話**: 系統能同時處理至少 500 顆低軌衛星。
- **完成度**: done,遠超門檻。本地 TLE 約 11015 顆 (Starlink + OneWeb,2026-05-16)。
- **demo 驗證位置**: LEO scale overlay;star count。
- **source tier**: Tier C — TLE-derived。
- **重現**: TLE fixture 行數即衛星數;runtime-projection 為控制效能每軌道上限取
  60 顆參與配對運算 (此為運算上限,非總數上限)。
- **工程師可能問**: 「為何 panel 只算 60 顆?」→ 60 顆是「配對可見性運算」的效能上限
  讓 panel 1 秒內完成;星座顯示與計數仍為完整數量。

### 卡 8 — R1-F2 / K-E2:模擬速度可調

- **來源**: r1.docx + kickoff slide 5
- **原文**: 模擬速度可調 (real time 與預錄 TLE 情境切換)。
- **白話**: 能即時跑,也能用預錄情境並加速播放。
- **完成度**: done。預設即時視窗為 wall-clock UTC `[now, now+20m]`;Operator HUD
  播放倍率為三個 bounded preset `30x / 60x / 120x` (見
  `src/runtime/m8a-v4-product-ux-model.ts:60-62`),與視窗選擇正交。底層
  `replayClock.setMultiplier(x)` 接受任意 finite 倍率,但 UI 故意限縮為三個
  preset 以避免不穩定的高速播放選項。
- **demo 驗證位置**: replay 控制;side panel 視窗行顯示 `Window … UTC`。
- **source tier**: 不適用 (控制層)。
- **重現**: 觀察 side panel Window 行的起訖時間。
- **工程師可能問**: 「即時與預錄差別?」→ 即時取 now 起算;預錄取情境固定歷史視窗。

### 卡 9 — R1-F3 / K-E3:即時顯示可通訊時間

- **來源**: r1.docx + kickoff slide 5
- **原文**: 即時顯示可通訊時間 (利用 iperf、ping 等功能測試)。
- **白話**: 顯示某段時間內「總共能通訊多久」。
- **完成度**: 部分。SGP4 + elevation 推算的可通訊時間已實作並顯示;
  **iperf / ping 實測整合尚未做** (此為據實揭露)。
- **demo 驗證位置**: side panel「Comm time」「Mean dwell」「LEO/MEO/GEO」分項。
- **source tier**: Tier C — 幾何可見性;非 iperf/ping 量測。
- **重現**: side panel comm-time 數字由 visibility windows × 取樣推得。
- **工程師可能問**: 「為何沒有 iperf?」→ iperf/ping 需 ITRI ESTNeT 實體網路;
  目前以幾何可見性為替代,truth tier 已標 Tier C。屬 Bucket B irreducible-1。

### 卡 10 — R1-F4 / K-E4 / K-F4:換手策略切換

- **來源**: r1.docx + kickoff slide 5/6
- **原文**: 換手策略切換 (依 latency / jitter / network speed 在高/中/低軌間切換)。
- **白話**: 系統能依鏈路品質指標自動換軌。
- **完成度**: done。runtime-projection 每取樣點以 link-budget 推得的
  latency/jitter/networkSpeed 餵入 handover 引擎,serving 衛星變動即記為
  HandoverEvent。
- **demo 驗證位置**: side panel Handover events 區塊,每列附 reasonKind。
- **source tier**: Tier B — TR 38.821 §7.3。
- **重現**: side panel handover 列的 reasonKind
  (current-link-unavailable / better-candidate-available / policy-tie-break)。
- **工程師可能問**: 「換手依據是什麼?」→ elevation、預測可見視窗、latency、jitter
  的加權評分,結構源自 TR 38.821 §7.3。

### 卡 11 — R1-F5 / K-E5:統計報表匯出

- **來源**: r1.docx + kickoff slide 5
- **原文**: 統計報表匯出。
- **白話**: 把畫面上的統計數字匯出成檔案。
- **完成度**: done。side panel「Download CSV」按鈕匯出 RFC-4180 CSV。
- **demo 驗證位置**: V4 side panel ready 狀態的 Download CSV 按鈕。
- **source tier**: 隨被匯出資料的 tier;CSV 含 truth boundary 與 non-claims 區段。
- **重現**: 點 Download CSV,檔案含 5 區段:Runtime projection、Communication
  stats、Visibility windows、Handover events、Non-claims。
- **工程師可能問**: 「報表能進 Excel 嗎?」→ 可,RFC-4180 quoted、CRLF 換行、分區標題。

### 卡 12 — K-A4:輸入 TLE 並追蹤衛星

- **來源**: kickoff slide 2
- **原文**: 輸入 TLE 資料並追蹤衛星行進。
- **白話**: 餵 TLE 進去,衛星就會照軌道動。
- **完成度**: done。
- **demo 驗證位置**: 衛星沿軌道移動的動畫;`visibility-utils.ts`
  `parseTleListFromText` 解析 NORAD 三行區塊。
- **source tier**: Tier C — SGP4 propagation。
- **重現**: side panel visibility windows 即由 TLE → SGP4 → look-angle 推得。
- **工程師可能問**: 「用哪個 SGP4?」→ satellite.js 標準實作。

### 卡 13 — K-E6:雨衰情境展示

- **來源**: kickoff slide 5
- **原文**: 展示雨衰情境所帶來之影響。
- **白話**: 可以調雨量,看通訊品質怎麼變差。
- **完成度**: done。V4 side panel 新增雨率滑桿 (0-100 mm/h),即時重算投影並顯示
  Rain attenuation 區塊。
- **demo 驗證位置**: side panel 雨率滑桿 + Rain attenuation 區塊。
- **source tier**: Tier B — ITU-R P.618-14 §2.2.1 + P.838-3 k/α。
- **重現**: 拉滑桿至 80 mm/h,LEO downlink 由 199 → 38.5 Mbps、GEO 由 48.8 →
  1.36 Mbps,jitter 同步上升。MEO carrier 1.5 GHz 在 10-30 GHz 雨衰頻段外,
  panel 據實標示「fade does not apply」。
- **工程師可能問**: 「雨量數字準嗎?」→ 衰減模型為 ITU-R 公開公式;台灣本地降雨
  校正常數待 ITRI 提供 (Bucket B irreducible-3),目前用 P.837 全球預設,
  truth boundary 已標 non-claim。

### 卡 14 — K-F7:製作展示 demo

- **來源**: kickoff slide 6
- **原文**: 製作展示 demo (預錄 scenario 或 real time 模擬)。
- **白話**: 要有一個能跑給人看的 demo。
- **完成度**: done。V4 ground-station demo route 即為此 demo。
- **demo 驗證位置**: V4 route 整體。
- **source tier**: 不適用。
- **重現**: 進入 V4 route URL 即見完整 demo。
- **工程師可能問**: 「demo 怎麼進?」→ 見 §3 acceptance quick-ref 的 URL。

### 卡 15 — R1-D1:11/30 匯入軌道模型

- **來源**: r1.docx 交付表
- **原文**: 11/30 成功匯入軌道模型。
- **白話**: 期限前能把軌道模型載入。
- **完成度**: done。
- **demo 驗證位置**: 同卡 2 / 卡 12。
- **source tier**: Tier C。
- **重現**: TLE fixtures 載入 + SGP4 推進。
- **工程師可能問**: 「交付項目對應?」→ 對應卡 2 + 卡 12 的軌道資料整合。

### 卡 16 — R1-D2:11/30 可動態調整參數介面

- **來源**: r1.docx 交付表
- **原文**: 11/30 可動態調整參數介面。
- **白話**: 期限前要有能即時改參數的介面。
- **完成度**: done。雨率滑桿、地面站選取、replay 倍率皆即時生效。
- **demo 驗證位置**: side panel 雨率滑桿即一例:拉動即重算。
- **source tier**: 不適用。
- **重現**: 拉滑桿觀察 panel 150 ms debounce 後重算。
- **工程師可能問**: 「還有哪些參數可調?」→ handover 政策參數、replay 倍率、站對。

### 卡 17 — R1-D3:11/30 可產生通訊時間統計

- **來源**: r1.docx 交付表
- **原文**: 11/30 可產生通訊時間統計。
- **白話**: 期限前要能算出通訊時間統計。
- **完成度**: done。side panel 顯示 + CSV 匯出皆含通訊時間統計。link-budget 接線後
  數字為物理推算而非寫死常數。
- **demo 驗證位置**: side panel Communication stats;CSV「# Communication stats」段。
- **source tier**: Tier C 幾何 + Tier B 鏈路 metric。
- **重現**: 見卡 9 + 卡 11。
- **工程師可能問**: 「統計含哪些?」→ 總通訊時間、handover 次數、平均 dwell、
  LEO/MEO/GEO 分項。

### 卡 18 — R1-D4:11/30 畫面穩定運行 24 小時

- **來源**: r1.docx 交付表
- **原文**: 11/30 畫面穩定運行至少 24 小時。
- **白話**: demo 連續跑一天不崩。
- **完成度**: done。soak 測試 2026-05-15 通過。
- **demo 驗證位置**: 證據檔
  `output/soak/2026-05-15T05-42-07-506Z-phase7-0-full/summary.json`
  (`passed=true`、`durationMs=86400000`、`sampleCount=1289`)。
- **source tier**: 不適用 (穩定性測試)。
- **重現**: 開啟上述 summary.json 檢視 soak 結果。
- **工程師可能問**: 「在哪台機器跑的?」→ Ubuntu server 24 小時 soak。

### 卡 19 — V-MO1:跨軌道 LIVE handover (口頭追加)

- **來源**: user 口頭追加 (非 r1.docx / kickoff.pptx 原文);研究 baseline 在
  `itri/multi-orbit/`。
- **原文 (口頭)**: 跨軌道 handover demo 必須是真實 LIVE handover — 單一服務連續
  從 LEO → MEO → GEO 切換,不是 orbit-type 場景選單。
- **白話**: 一條連線「邊用邊換軌」,而不是「先選好用哪一軌」。
- **完成度**: done。`handover-policy.ts` 的 `cross-orbit-live` 政策已實作 +
  runtime-projection.ts **預設且僅**使用此政策 (2026-05-17 砍除 opt-in 旗標
  `enableCrossOrbitLivePolicy`)。當前 LEO 仰角低於門檻且無 LEO 候選達標、
  但 MEO/GEO 達標且 latency budget 仍滿足時,發出 `cross-orbit-migration`
  事件。
- **demo 驗證位置**: V4 side panel Handover events 區塊 — 跨軌道事件以
  **紫色強調列**呈現,reasonKind 文字為 `cross-orbit migration (V-MO1)`,
  與其他 handover (better candidate available / current link unavailable /
  policy tie break) 視覺區隔。Non-claims 行另明列政策來源 (TR 38.821 §7.3
  + V-MO1 verbal addendum)。
- **source tier**: Tier B — TR 38.821 §7.3 結構 + 口頭需求細化。
- **重現**: `handover-policy.ts` 含 sanity 註解 (全 LEO < 10° 仰角且 MEO 30° 可用
  → cross-orbit-migration)。
- **與文件需求關係**: 細化 `K-A1`「可於低/中/高軌切換」。K-A1 原文未明示是 live
  handover;V-MO1 為 user 補強的解釋。`multi-orbit/` 為研究 baseline,非契約文件。
- **工程師可能問**: 「這是契約需求嗎?」→ 否。r1.docx / kickoff.pptx 僅有 K-A1。
  V-MO1 為 user 口頭追加,屬產品願景的細化,本走查據實標示其來源。

---

## §2 真實性對照表 (truth map)

畫面上每個元素對應的 source tier 與引用。reviewer 可逐項對標。

| UI 元素 | 數字內容 | source tier | 引用 |
|---|---|---|---|
| 星座三層顯示 | 衛星位置 | Tier C | SGP4 + 本地 TLE |
| Pair visibility windows | 互可見視窗起訖 | Tier C | satellite.js SGP4 + look-angle |
| Comm time / Mean dwell | 通訊時間統計 | Tier C | 幾何可見性 × 取樣 |
| Handover events | 換手事件 + reason | Tier B | TR 38.821 §7.3 |
| Rain attenuation 區塊 | 雨衰 dB / 速率下修 | Tier B | ITU-R P.618-14 §2.2.1 + P.838-3 |
| per-orbit downlink Mbps | 鏈路速率 | Tier B (modeled) | TR 38.811 §6.6 + P.676-13 + P.618-14 |
| Latency 數字 | 單程傳播延遲 | Tier B (modeled) | TR 38.811 §6.7 (slant range / c) |
| Non-claims 區塊 | 真實性界線聲明 | 各 tier 自述 | runtime-projection truthBoundary |
| Source tier 標籤 | public-disclosed / geometric-derived | 推導 | tier-inference.ts |

**重要聲明**: Tier A operator-validated 目前為空。所有鏈路 metric 為
modeled-precision (公開標準公式推算),非電信業者實測。side panel 的 truth
boundary non-claims 已逐條標示。

---

## §3 驗收速查 (acceptance quick-reference)

一行一條,11/30 會議逐項勾稽。

- [x] R1-T1 / K-A1 — 多軌道整合 + 切換:三層顯示 + handover-policy
- [x] R1-T2 / K-D1 — 軌道資料整合:TLE fixtures + SGP4
- [x] R1-T3 / K-D2 — 視覺化:Cesium (Blender 等效)
- [x] R1-T4 / K-D3 — UI 互動:站選取 / panel / 滑桿 / CSV
- [x] R1-T5 / K-D4 — 換手規則參數:handover-policy.ts 三政策
- [x] R1-T6 / K-D5 — 速率可視化:link-budget per-orbit throughput
- [x] R1-F1 / K-E1 — ≥500 LEO:本地 TLE ~11015 顆
- [x] R1-F2 / K-E2 — 速度可調:即時/預錄視窗 + 1-120x
- [~] R1-F3 / K-E3 — 可通訊時間:幾何已做;iperf/ping 整合未做
- [x] R1-F4 / K-E4 / K-F4 — 換手策略切換:link-budget 餵入 handover 引擎
- [x] R1-F5 / K-E5 — 統計報表匯出:Download CSV
- [x] K-A4 — TLE 輸入追蹤:parseTleListFromText + SGP4
- [x] K-E6 — 雨衰展示:雨率滑桿 + Rain attenuation 區塊
- [x] K-F7 — demo:V4 ground-station route
- [x] R1-D1 — 11/30 匯入軌道模型
- [x] R1-D2 — 11/30 動態調參介面
- [x] R1-D3 — 11/30 通訊時間統計
- [x] R1-D4 — 11/30 24h soak:2026-05-15 通過
- [x] V-MO1 — 跨軌道 LIVE handover:V4 預設且僅使用 cross-orbit-live 政策

`[x]` = 完成可重現;`[~]` = 部分,括註未做部分。

**進入 demo 的 URL** (V4 route,需帶兩個合法 station id):

短形 (2026-05-17 起,推薦):`/?stationA=<id>&stationB=<id>`
長形 (legacy,仍支援):`/?scenePreset=regional&m8aV4GroundStationScene=1&stationA=<id>&stationB=<id>`

只要 `stationA` 與 `stationB` 都是公開 registry 的合法 id,系統會自動套
`scenePreset=regional` 並啟動 V4 panel。station id 來自
`public/fixtures/ground-stations/multi-orbit-public-registry.json`。

**5 候選 demo 情境** (對應 spec「high/low elevation × rain/clear × handover/no-handover」代表性子集,Bucket B irreducible-2 替代清單):

1. **極地高仰角同 operator** (KSAT 北/北極) — 高 MEO 視窗活動,Ku/Ka 雨衰帶外:
   `/?stationA=ksat-svalsat-svalbard&stationB=ksat-tromso`
2. **極地反節點同 operator** (KSAT 北極/南極) — handover 壓力測試,跨半球極長基線:
   `/?stationA=ksat-svalsat-svalbard&stationB=ksat-trollsat-antarctica`
3. **中緯跨大西洋同 operator** (Intelsat DE/US) — LEO sweep 視窗多:
   `/?stationA=intelsat-fuchsstadt&stationB=intelsat-atlanta`
4. **赤道跨 operator** (Singtel SG / Measat MY) — geometric-derived tier + 熱帶雨衰可拉滑桿展示 K-E6:
   `/?stationA=singtel-bukit-timah&stationB=measat-cyberjaya`
5. **跨半球跨 operator** (CHT TW / SANSA ZA) — geometric-derived tier + 長基線:
   `/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek`

每條 URL 進入後,可拉雨衰滑桿 0 → 80 mm/h 切換 rain/clear 情境,觀察 LEO/GEO downlink throughput 與 jitter 變化 (Ka/Ku 帶內),以及 handover events 列表的 reasonKind。每個站對的視窗數量與 handover 次數因軌道幾何而異;若特定時間視窗顯示零互可見性,等待數分鐘 panel 自動重新計算或切下一個情境。

---

## §4 工程師問答準備 (engineer Q&A prep)

驗收會議預期問題與建議回答。

1. **Q: 鏈路數字是量測還是模型?**
   A: 模型推算 (modeled-precision)。FSPL 用 TR 38.811 §6.6,雨衰用 ITU-R
   P.618-14,氣衰用 P.676-13。side panel truth boundary 已標示。Tier A 實測
   待 ITRI 交付。

2. **Q: 為何 latency 比預期低?**
   A: 顯示的是單程傳播延遲 (one-way propagation delay = slant range / c),
   非 RTT,也未含協定處理。LEO ~550 km 單程約 2-4 ms。模型選擇於程式碼註解
   (`runtime-projection.ts`,引 TR 38.811 §6.7)。

3. **Q: 雨衰為何只影響 LEO 與 GEO,不影響 MEO?**
   A: 雨衰隨頻率上升而顯著,k/α 係數表覆蓋 10-30 GHz。LEO Ku 12 GHz、GEO Ka
   20 GHz 在頻段內;MEO 設為 L 頻 1.5 GHz,在雨衰頻段外。panel 據實標示
   「Below the 10-30 GHz rain band」。

4. **Q: ≥500 LEO 達標,但 panel 只算 60 顆?**
   A: 60 為「配對可見性運算」每軌道效能上限,確保 panel 1 秒內回應。星座顯示
   與計數為完整 ~11015 顆。兩者是不同的數量。

5. **Q: 為何沒有 iperf / ping 實測?**
   A: 需 ITRI ESTNeT 實體網路與封包軌跡。屬 Bucket B irreducible-1。目前以
   SGP4 幾何可通訊時間替代,truth tier 標 Tier C。ITRI 交付軌跡後可 swap。

6. **Q: handover 門檻數字如何決定?**
   A: 政策結構源自 TR 38.821 §7.3 trigger metrics (elevation / RSRP / 預測
   可見視窗)。具體門檻為可調 config (elevationThresholdDeg 等),非寫死,
   可於驗收時調整。

7. **Q: V-MO1 跨軌道 live handover 是契約需求嗎?**
   A: 否。r1.docx / kickoff.pptx 僅有 K-A1「可於低/中/高軌切換」。V-MO1 為
   user 口頭追加,把 K-A1 細化為單一服務連續跨軌切換。本走查據實標示其
   來源為口頭追加。

8. **Q: V-MO1 做完了嗎?**
   A: 是。V4 runtime-projection 預設且僅使用 `handover-policy.ts` 的
   `cross-orbit-live` 政策 (2026-05-17 砍除 opt-in flag),demo 自然呈現
   單一服務連續跨軌切換行為。truth boundary 的 non-claims 明列政策來源
   (TR 38.821 §7.3 + V-MO1 verbal addendum)。

9. **Q: 24 小時穩定性如何證明?**
   A: soak 測試證據檔
   `output/soak/2026-05-15T05-42-07-506Z-phase7-0-full/summary.json`,
   `passed=true`、`durationMs=86400000` (24h)、`sampleCount=1289`。

10. **Q: 用 Cesium 取代 Blender 可以嗎?**
    A: Blender 為離線算圖工具;互動即時 demo 需 WebGL 引擎。Cesium 為地理
    空間視覺化的業界標準,為 R1-T3「或等效」條款下的等效方案。

11. **Q: CSV 報表能否直接給驗收?**
    A: 可。RFC-4180 quoted、CRLF 換行、分 5 區段標題,Excel 可直接開。含
    truth boundary 與 non-claims,稽核可追。

12. **Q: 台灣本地降雨校正?**
    A: 目前用 ITU-R P.837 全球預設降雨率 R0.01。台灣本地實測校正常數
    (Pingtung / Hsinchu) 屬 Bucket B irreducible-3,待 ITRI 提供。預期差異
    數 dB,truth boundary 已標 non-claim。

13. **Q: 標準 PDF 在哪?**
    A: 12 份公開標準 PDF 收於 `deliverable/3gpp-itu-references/`,README
    對照每份 PDF 的引用章節與需求 ID。見 §6。

14. **Q: 程式碼如何稽核引用?**
    A: 每個 link-budget 模組檔案頂部有 3-5 行引用標頭,標明標準章節與本地
    PDF 路徑。例 `free-space-path-loss.ts` 開頭即 `3GPP TR 38.811 §6.6.2`。

15. **Q: 哪些是 ITRI 自己要交付的?**
    A: Bucket B (7 條,需 ITRI operator data 才能達 Tier A 權威;本專案已實作
    Tier B 公開標準替代) 與 Bucket C (8 條,ITRI 既有 infra / 報告層,非本
    專案 UI scope)。清單見 `requirements-consolidated.md`。

---

## §5 已完成但 demo 未直接呈現 (done, not surfaced in demo)

以下能力已實作,但 demo 畫面上沒有專屬入口,reviewer 若問需主動說明。

- **`handover-policy.ts` 的 leo-first / bootstrap-balanced-v1 政策**:模組
  支援三種政策;V4 demo 預設且僅使用 cross-orbit-live (V-MO1),其他兩種政策
  可由直接呼叫 `evaluateHandoverPolicy` 驗證,demo 不切換。
- **link-budget 各模組獨立函式**:antenna-pattern.ts (S.1528 / S.465)、
  gas-absorption.ts 的細項輸出 (氧氣 / 水氣分項) 未在 panel 顯示,但函式
  可獨立呼叫驗證。
- **氣體吸收 (gas absorption)**:已併入鏈路預算總損耗,但 panel 未單獨列出
  氣衰 dB;雨衰有獨立區塊,氣衰沒有。

---

## §6 PDF 附錄清單 (standards appendix)

12 份公開標準 PDF 位於 `deliverable/3gpp-itu-references/`,對照見該資料夾
README.md。

### 3GPP NTN

- `38811-f40.pdf` — TR 38.811 NTN 系統。§6.6 路徑損耗、§6.7 傳播延遲、§6.8
  Doppler。對應 K-A2、卡 6、卡 9。
- `38821-g20.pdf` — TR 38.821 NTN 5G NR 解法。§7.3 換手 trigger metrics。
  對應 K-F4 / R1-F4、卡 5 / 卡 10 / 卡 19。
- `ts_138300v190000p.pdf` — TS 38.300 NR 總覽 (mobility 章節背景)。
- `ts_138331v190000p.pdf` — TS 38.331 RRC (換手訊令細節)。
- `38214-j30.pdf` / `38215-j20.pdf` / `36214-j00.pdf` — PHY 量測規格。
- `R1-1913224.pdf` — 3GPP RAN1 NTN 傳播參考貢獻。

### ITU-R

- `R-REC-P.618-14-202308-I!!PDF-E.pdf` — P.618-14 雨衰預測。§2.2.1.1
  specific attenuation、§2.2.1.2 effective slant path。對應 K-A3-b、K-E6、
  卡 6 / 卡 13。
- `R-REC-P.676-13-202208-I!!PDF-E.pdf` — P.676-13 氣體吸收。對應 K-A2、卡 6。
- `R-REC-S.1528-0-200106-I!!PDF-E.pdf` — S.1528 非 GSO 衛星天線型樣。對應
  K-A3-a。
- `R-REC-S.465-6-201001-I!!PDF-E.pdf` — S.465-6 地面站天線型樣。對應 K-A3-a。

### 程式碼對應 (code mapping)

| 模組 | 標準 | 需求 |
|---|---|---|
| `src/runtime/link-budget/free-space-path-loss.ts` | TR 38.811 §6.6.2 | 卡 6 |
| `src/runtime/link-budget/rain-attenuation.ts` | P.618-14 §2.2.1 + P.838-3 | 卡 13 |
| `src/runtime/link-budget/gas-absorption.ts` | P.676-13 Annex 2 | 卡 6 |
| `src/runtime/link-budget/antenna-pattern.ts` | S.1528 + S.465-6 | K-A3-a |
| `src/runtime/link-budget/handover-policy.ts` | TR 38.821 §7.3 + V-MO1 | 卡 5 / 10 / 19 |
| `src/features/multi-station-selector/runtime-projection.ts` | (接線層) | 卡 6 / 10 / 17 |
| `src/features/multi-station-selector/runtime-projection-csv.ts` | (R1-F5) | 卡 11 |

---

## 變更歷史 (change log)

- **2026-05-17**: 初版。link-budget compute layer (5 模組) + runtime-projection
  接線 + 雨衰 UI + CSV 匯出完成後撰寫,所有數字對應可執行程式碼。
