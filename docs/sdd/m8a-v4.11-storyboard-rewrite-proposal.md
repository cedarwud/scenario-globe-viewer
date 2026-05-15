# M8A-V4.11 Storyboard Rewrite Proposal — Per-Window Operator Concern

Date: 2026-05-03 (v2, reviewer feedback incorporated)
Status: **proposal**, not SDD authority, not implementation prompt
Origin: planning/control after user feedback that V4.11 Slice 0 storyboard
applies a uniform info schema to all 5 V4.6D windows, producing
"same screen with different chip text"

## Revision log

- **v1 (2026-05-03)**: initial per-window operator-concern rewrite
- **v2 (2026-05-03)**: integrate UX reviewer feedback. Changes:
  - Per-window questions reframed to lead with **link quality / when switch / why switch**, not internal handover narrative
  - Layperson glossary upgraded to reviewer's specific Chinese terms
  - Visual-token spec now concrete (shape / color / opacity / motion / radius / duration), not adjectives
  - Truth footer upgraded from one-line to a **chip system** with W5 high-prominence variant
  - **Scene-context chip** added: "13-actor demo · ≥500 LEO live in Phase 7.1"
  - **Smoke impact matrix** added (13 affected smoke surfaces enumerated)
  - Honest implementation cost revised to **3–4 conversations**, not 1–2

## Why this proposal exists

V4.11 Slice 1–5 implemented exactly what V4.11 SDD specified. The SDD has a
gap: §Five-Window Storyboard treats all 5 windows as the same template, and
the language is engineering-side. Different operator concerns cannot be
answered by the same template; layperson cannot read engineering vocabulary.

This proposal does not modify any runtime, smoke, or accepted V4.6D contract.
It proposes amendments to V4.11 §Storyboard and the visual contracts for
Slices 1, 2, 3, 5.

## Core principle

Each window foregrounds a **link-quality / decision** read of "what's
happening, when's the switch, why". Other information is demoted to
ambient. Truth boundary is a footer chip system, not a co-equal inspector
role. Scene-context chip names what scope this scene actually covers.
Language is layperson Chinese.

## Per-window rewrite

Numbers below are illustrative (114-min simulated session × 5 windows ×
~22 min each). Implementation derives actual numbers from V4.6D ratio
mapping.

### W1 — LEO Acquisition

Lead question: **「現在連線品質如何？這個 LEO 還能用多久？」**

Foreground:

- **連線品質讀數**（大字，靠近 focus actor）: e.g. "強 · LEO 直連"
- 焦點 LEO 的 visual emphasis：rising arc trail（見 §Visual Token Spec）
- 服務時長指示：「服務時間：~22 分鐘」
- 下一個事件預覽：「下一段：訊號減弱（22 分鐘後）」

Demoted to ambient:

- 其他 LEO/MEO/GEO actor — 只剩 orbit-class chip，30% 透明
- corner provenance footer — 持續存在，不前景化

Hover on focus LEO（3 行）:

- "OneWeb LEO · 現在看這顆"
- "連線品質：強"
- "服務時間：~22 分鐘"

Inspector（單 role，點擊才開）:

- 「剛接上 OneWeb LEO，連線品質強。約 22 分鐘後，因為位置條件變化會
  進入訊號減弱階段。」

### W2 — LEO Aging Pressure

Lead question: **「品質在掉，什麼時候切？為什麼切？」**

Foreground:

- **連線品質下降指示**（橫條從強→中→弱動畫）
- 切換倒數：「切換到 MEO：~10 分鐘」
- **切換原因 chip**（顯眼）：「位置條件變差」
- 焦點 LEO 的 visual emphasis：fading arc trail

Demoted:

- 非 active LEO actor — 很暗
- GEO — 只在 footer 提一行「保底覆蓋待命」

Hover on focus LEO:

- "OneWeb LEO · 訊號減弱中"
- "切換在 ~10 分鐘"
- "位置條件變差"

Hover on incoming MEO（phase-specific）:

- "SES O3b mPOWER MEO · 即將接手"
- "暫時接住 ~22 分鐘"

Inspector:

- 「LEO 的位置條件正在變差。約 10 分鐘後，連線會切到較廣覆蓋的 MEO 暫
  時接住。」

### W3 — MEO Continuity Hold

Lead question: **「在 MEO 上跑廣覆蓋，能撐多久？為什麼選 MEO？」**

Foreground:

- **MEO 暫時接住時間長條**：「暫時接住 ~22 分鐘」
- **覆蓋類型說明**：「廣覆蓋 · 延遲略高」
- 新 LEO 預計回來：「新 LEO ~14 分鐘後到」
- 焦點 MEO：steady wide-coverage shading

Demoted:

- 非 candidate LEO actor — 暗
- Re-entry candidate LEO — small pulse 預告
- GEO — ambient

Hover on focus MEO:

- "SES O3b mPOWER MEO · 暫時接住"
- "暫時接住 ~22 分鐘"
- "新 LEO 即將回來"

Inspector:

- 「目前由 MEO 暫時接住，覆蓋面廣但延遲略高。模擬預期約 14 分鐘後
  會有新的 LEO candidate 出現。」

### W4 — LEO Re-entry Candidate

Lead question: **「新 LEO 回來了，品質夠不夠切回去？」**

Foreground:

- **候選 LEO 品質讀數**（大字）：「候選品質：強 / 中 / 弱」
- 切回後預估服務時長：「若切回：~22 分鐘低延遲」
- MEO 仍 backstop：「MEO 還在接住，可緩決定」
- Candidate LEO：candidate pulse

Demoted:

- 其他 LEO actor — 暗
- GEO — ambient

Hover on candidate LEO:

- "OneWeb LEO · 候選"
- "品質：強"
- "若切回：~22 分鐘"

Hover on continuing MEO:

- "MEO · 還在接住"
- "可以等決定"

Inspector:

- 「有新的 LEO 進入候選範圍。geometry 預測切回後可有約 22 分鐘的低延
  遲服務。MEO 仍在接住，沒有立即必須切的壓力。」

### W5 — GEO Continuity Guard

Lead question: **「為什麼還留 GEO？這段什麼時候結束？」**

Foreground:

- **GEO 角色說明**（明顯）：「保底覆蓋 · 永遠連得到」
- 序列結束倒數：「序列結束：~5 分鐘 · 重新開始可以再看一次」
- GEO actor：steady ring
- LEO/MEO 都很暗

Demoted:

- LEO/MEO actor — 最低存在感
- 下一段提示替換為**重新開始按鈕**

Hover on GEO:

- "Singtel/SES GEO · 保底覆蓋"
- "永遠連得到"
- "序列即將結束"

Inspector:

- 「GEO 作為保底覆蓋角色，永遠連得到，但這只是模擬展示，不是實際
  failover 證據。序列在這裡結束。」

## Cross-window changes

### Footer chip system（取代 Truth button）

底部一條 footer，含 4 個 chip：

```
[模擬展示]  [operator-family precision]  [TLE: CelesTrak NORAD GP · 2026-04-26]  [13 actors]
```

W5 額外加一個高顯著 chip（紅/橘色 outline）：

```
[⚠ 不是實際 failover 證據]
```

- 高顯著 chip 用 outline + slightly larger font
- 其他 4 個 chip 是 ambient（淺灰背景、小字、不搶眼）
- 不再有 "Truth" 按鈕，concurrency 簡化為 inspector 單 role

### Scene-context chip（**新增**）

畫面**頂端中央**一條 chip（持續可見）：

```
這是 13-actor 模擬展示 · 完整 ≥500 LEO 多軌道驗證請見 Phase 7.1
```

- 中型字、淺背景
- 點擊可選：跳到 Phase 7.1 readout（如有）或顯示「Phase 7.1 進行中」說明
- 解決 reviewer Q5：驗收者第一眼就知道這個 scene 的範圍，不會誤以為
  這是完整 customer deliverable

### Inspector becomes single-role

- 移除 Truth Boundary 並列 role
- 原 Truth 內容拆到 footer（一般化部分）+ inspector State Evidence
  尾段（具體 non-claim 描述）
- inspector 開合行為：點 Details / 焦點 actor → 開；點 X 或外部 → 關
- Slice 3 concurrency 移除

## Layperson glossary（reviewer Chinese 版採納）

| Engineering term (current SDD) | Layperson 中文（採納 reviewer 建議） |
|---|---|
| `holding` | 暫時接住 |
| `guard / persistent reach` | 保底覆蓋 |
| `geometry shifting` / `changing-geometry` | 位置條件變差 |
| `review only` / `display-context, not active serving` | 模擬展示 |
| `display representative actor` / `focus` | 現在看這顆 |
| `candidate-capacity context class` | （default 不顯示） |
| `continuity-hold class` | 暫時接住 |
| `guard-context continuity class` | 保底覆蓋 |
| `low-latency context class` | 低延遲 |
| `mid-latency continuity class` | 延遲略高 |
| `higher-latency continuity class` | 高延遲（保底用） |
| `operator-family precision` | （保留英文 in footer，因為這是技術精度詞） |
| `simulation review` | 模擬展示 |
| `not active failover proof` | 不是實際 failover 證據 |
| `TLE: CelesTrak NORAD GP · fetched 2026-04-26 · 13 actors` | 拆成 footer 三個 chip：[TLE 來源] [日期] [13 actors] |

## Visual Token Spec（取代「形容詞」）

每個 window 的 focus actor 視覺由以下 token 構成。實作必須符合具體
維度，不可只用「rising arc」這類字面意義。

### W1 — Rising arc trail

- 形狀：polyline trail，沿 focus LEO 的 ground track
- 起點：acquisition point（W1 開始時 LEO 的位置）
- 終點：current position
- 顏色：青色 `#00d4ff`
- 透明度：linear gradient 從 0% (起點) 到 100% (current)
- 寬度：3 px
- 動態：current 位置隨 replay 推進延伸；起點固定
- 持續時間：整個 W1 視窗

### W2 — Fading arc trail

- 形狀：polyline trail（過去 30 simulated 秒）+ 預測 polyline（未來
  60 simulated 秒，dashed）
- 顏色：amber→red gradient（以 quality 對應；W2 中 quality 從強→弱）
- 透明度：current=100%, 過去/未來尾端=20%
- 寬度：3 px
- 動態：red 比例隨 ageing 增加
- 持續時間：整個 W2 視窗

### W3 — Steady wide-coverage shading

- 形狀：地面圓盤（Cesium ellipse 或 polygon）以 MEO 在地面投影為中心
- 半徑：~1500 km 名義（per V4.6D MEO geometry class）
- 顏色：muted blue `#5b8db8`
- 透明度：30%
- 動態：0.5 Hz 緩慢呼吸（30%→35%→30%），不快，否則干擾
- 持續時間：整個 W3 視窗

### W4 — Candidate pulse

- 形狀：candidate LEO 周圍同心擴散圓環
- 起始半徑：50 px screen-space
- 結束半徑：200 px screen-space（fade out）
- 顏色：strong=綠 `#5bd99c` / mid=琥珀 `#e8b04a` / weak=橘 `#ff9a4a`
- 透明度：80% 內 → 0% 外
- 動態：1 Hz pulse（每秒擴散一次）
- 持續時間：整個 W4 視窗

### W5 — Steady ring

- 形狀：GEO actor 周圍光暈圓環
- 半徑：80 px screen-space
- 顏色：金色 `#e8c860`
- 透明度：60% 穩定
- 動態：無（穩定 = 保底語意）
- 持續時間：整個 W5 視窗

### Demoted actor visual（跨 window）

- 透明度：30% 持續
- 顏色：灰 `#888888`
- 無 trail / pulse / ring / shading
- 仍保留 orbit-class chip 但 chip 也降透明度

### Other foreground vs ambient

- 連線品質讀數（W1/W2/W4）：18px font, dark text, white background pill
- 切換倒數 / 持續時間（W2/W3/W4/W5）：14px font, accent color
- 焦點 actor 旁邊 micro-cue：≤14px font，緊鄰 actor billboard，不超過
  180×24

## Smoke Impact Matrix（**新增**，誠實列入）

下表列出本 proposal 落地後會影響哪些既有 smoke。reviewer Q6 質疑
「1–2 conversations 太樂觀」是對的。

| Smoke 檔 | 既有斷言 | 本 proposal 影響 | smoke 需做 |
|---|---|---|---|
| Slice 1 negative smoke | 13 orbit-class chip default visible | 保留但 demoted actor chip 降透明度 | 加透明度容忍度 |
| Slice 1 negative smoke | 2 ground-station precision chip + triplet default visible | **移除** ground-station chip + triplet（資訊移到 footer） | 大幅 rewrite，加 disclosure |
| Slice 1 negative smoke | corner provenance badge default visible | 替換為 footer chip system | rewrite footer assertion |
| Slice 2 hover smoke | 5-line popover content schema | 縮成 3 行 + 內容 phase-specific | rewrite expected hover content per window |
| Slice 2 hover smoke | popover ≤240×140 | 可能更小（3 行） | tighten budget |
| Slice 3 concurrency smoke | Truth Boundary role 同時可開 | **移除** Truth role；單 role inspector | full rewrite |
| Slice 3 smoke | Truth button trigger | **移除** Truth button | rewrite |
| Slice 4 toast smoke | toast 文字直抄 Slice 0 storyboard | 文字 refresh per phase-specific copy | copy update |
| Slice 5 smoke | corner badge click → Sources role | **demote**：corner badge 變 footer chip，Sources 移入 inspector advanced toggle | rewrite affordance assertion |
| Slice 5 smoke | orbit-evidence chip click → filtered Sources | **移除** orbit-evidence chip | full rewrite |
| Slice 5 smoke | Sources role 含 13 TLE + 5 R2 + 2 ground stations | 保留（移到 inspector advanced） | path adjustment |
| V4.10 slice3/4/5 smoke | Truth boundary surface separation | 進一步軟化（已在 Slice 3 disclose 過一次） | additional Smoke Softening Disclosure |
| V4.8 / V4.9 smoke | inspector layout shape | 進一步調整 | additional disclosure |

**估算：13 個 smoke 點需要動。** Lock-in J disclosure 將比 Slice 3 那次
更大（Slice 3 那次只動了 7 個 disclosure 點）。

## Honest implementation footprint（v2 修正）

不是「1–2 implementation 對話」。誠實估算：

1. **對話 1：visual token + scene-context chip**
   實作 5 種 visual token（rising arc / fading arc / steady shading / pulse
   / steady ring），加 scene-context chip，更新 Slice 1 既有 chip transparency。

2. **對話 2：hover popover + inspector single-role rewrite**
   重寫 Slice 2 hover content（5 行→3 行 phase-specific），收掉 Slice 3
   Truth Boundary role，inspector 改單 role + State Evidence 重寫。

3. **對話 3：footer chip system + Truth removal + Slice 5 demote**
   實作 footer chip system（4 普通 + W5 高顯著），移除 Truth button，
   demote Slice 5 affordance（chip 移到 inspector advanced）。

4. **對話 4：smoke matrix update + Lock-in J full disclosure**
   更新 13 個 smoke 點，寫 disclosure 文件，跑全套 regression。

每個對話估 1.5–2 小時 implementation 工作 + reconciliation。**總共 4
對話 × 約 2 小時 = 8 小時 + reconciliation overhead**。

## What this proposal cannot fix（誠實說明）

reviewer Q7 抓到的核心：**這個 proposal 把資訊降噪了，但 customer 驗收最
關心的「規模、量測、參數、輸出」仍然不在這個 scene 裡。**

可緩解但無法消除的策略：

- scene-context chip 明文「13-actor demo · ≥500 LEO 在 Phase 7.1」—
  讓驗收者第一眼知道這個 scene 不是完整 customer deliverable
- inspector advanced toggle 內可加 cross-link 到 Phase 6 readout（comm
  time, handover decision, physical input, validation boundary 那 4 個
  panel 已 closed）
- 不要假裝這個 scene 解決了 must-have；它只解決「defensible scenario
  做得像個產品」這個小目標

## Addendum 1 — Round 2 reviewer gaps closed (2026-05-03)

UX-side reviewer 第二輪驗證結果：V1/V3/V4/V5 PASS、V2/V6 PARTIAL、V7 列
7 條新問題、V8 最大疑慮為 countdown 數字無 V4.6D contract。本 addendum
逐條收尾。

### 1.1 Countdown 數字來源規則（V7-#1 + V8）

V4.6D contract `m8a-v4.6d-simulation-handover-model.v1` 明文禁止
`numericLatencyAllowed/JitterAllowed/ThroughputAllowed`，但**未禁止
window-progress 衍生時間數字**。本 proposal 的 countdown 採用以下規則
（屬於 V4.6D **derivation rule**，不是 V4.6D 擴張，也不是 measured
metric）：

```
withinWindowFraction = (replayRatio - window.startRatioInclusive)
                       / (window.stopRatioExclusive - window.startRatioInclusive)
remainingFraction = 1 - withinWindowFraction
remainingSimulatedSec = remainingFraction
                        × (window.stopRatioExclusive - window.startRatioInclusive)
                        × FULL_REPLAY_SIMULATED_SECONDS

displayString = formatApproximate(remainingSimulatedSec)
              = "~N 分鐘"（≤60 min 顯示分鐘、>60 顯示小時）
              = "~N 秒"（≤60 sec）
```

`FULL_REPLAY_SIMULATED_SECONDS` 是 V4.6A baseline 既有值（詳見
V4.6B 投影 spec），不是新加的 contract。`replayRatio` 是 V4.6D 既有
input。所以 countdown 是兩個既有 input 的 deterministic derivation，**不
是新的 measured / claimed 數值**。

實作必須在 footer chip 加一個「~ 為模擬推演值」的微小說明，避免
layperson 誤以為是 measured countdown。

Forbidden-claim scan **不需更動**：這些字串不是 latency / jitter /
throughput，與 V4.6D §Forbidden-Claim Scan Policy 列名的鍵無交集。

### 1.2 Inspector copy layperson 全掃（V2 PARTIAL）

修以下三條：

| 位置 | v2 文 | addendum 修正 |
|---|---|---|
| W3 inspector | 「會有新的 LEO candidate 出現」 | 「會有新的候選 LEO 出現」 |
| W4 inspector | 「geometry 預測切回後可有約 22 分鐘的低延遲服務」 | 「依位置條件預測，切回後可有約 22 分鐘低延遲」 |
| W5 inspector | 「不是實際 failover 證據」 | 「不是實際備援切換證據」 |

W4 hover 也同步：`"OneWeb LEO · 候選"` → 已是中文，OK。
W5 hover 「序列即將結束」 → OK。

failover 一詞：glossary 接受 W5 footer chip 保留 `failover` 英文（chip
是縮短形式，layperson 看到也容易理解為「切換」），但 inspector 文要走
中文「備援切換」一致 layperson 路線。

### 1.3 Visual-token Cesium 可行性快檢（V7-#4）

| Token | 風險 | Cesium 可行路徑 |
|---|---|---|
| polyline alpha gradient 0%→100% | 原生 `PolylineMaterialProperty` 不支援 per-vertex alpha | **改 5–8 段 polyline，每段 stepped alpha**（sandcastle `Polyline Per-segment Coloring` pattern）；或寫 custom `Material`，但前者成本低 |
| 0.5 Hz breathing opacity / 1 Hz pulse | `CallbackProperty` per-frame 可行；frame budget 風險低（13 actor + ~5 dynamic property） | **採 CallbackProperty**；conv 1 先測 60fps frame budget，若不過再降到 0.25 Hz / 0.5 Hz |
| 1500 km MEO disk 視覺 dominate | 預設台灣–新加坡 camera 距離下會吃掉場景大半 | **半徑降 800 km**（仍 plausibly MEO footprint scale）；或改用 outline ring 不填色（比 filled disk 視覺輕 70%）；conv 1 兩者都試 |
| amber→red gradient (W2) 需 within-window 時間進度 | V4.6D 既有 `replayRatio` + window range，可推 `withinWindowFraction`（同 §1.1）| **直接用 §1.1 的 `withinWindowFraction` 推 gradient lerp** |

決定：**conv 1 必須先 spike 5 個 token 的 Cesium 實作**（≤30 分鐘 spike），
跑通才繼續 conv 2/3/4；任何一個 spike 失敗 → 退回此 addendum 修 spec。

### 1.4 Scene-context chip dimensional spec（V7-#3 + V5 caveats）

補規格：

- 字體大小：14 px
- 最大寬度：380 px
- 高度：28 px
- 背景：`#F5F5F5`（淺灰，不搶眼）
- 邊框：1 px solid `#D0D0D0`
- 圓角：6 px
- 位置：top center，距 canvas 頂端 16 px
- 文：「13 顆衛星模擬展示 · 完整 ≥500 LEO 多軌道驗證見後續階段」

把 `Phase 7.1` 改成「後續階段」— layperson 看得懂，不暴露 internal
phase nomenclature。

點擊行為：v1 寫「如有」太鬆。確認版：**點擊**展開為一個 ≤320×140 popover，
顯示「本 scene 範圍說明 + Phase 6 已驗收項目（comm time / handover
decision / physical input / validation boundary）連結」。如果 Phase 6
panel 不存在於本 viewer route（要 cross-link 到別 route），popover 內
給 link；如果同 route 存在，給 anchor。conv 1 確認 link 目標。

### 1.5 Ground-station evidence visibility regression（V7-#5）

v2 把 ground-station precision chip + LEO/MEO/GEO triplet 移到 footer
做 global chip — reviewer 抓到這會讓「per-station multi-orbit evidence」
直觀消失，與 customer F-02（multi-orbit 視覺證據）相衝。

addendum 修正：保留 ground-station 旁邊一個**短條 chip**，比 v1 triplet
小：

```
[LEO MEO GEO ✓]
```

- 字體 11 px，高度 18 px，最大寬度 96 px
- 緊鄰 ground-station billboard 下方
- 兩個 ground station 各一個
- 不展開為 triplet，不分行；點擊展開 hover popover 顯示完整 triplet 細節

這比 v1 兩行 ≥320×34 label 小 75%，但保留每站 multi-orbit 直觀證據。
不與 footer 重複（footer 是 simulation/precision/source 全域 chip；
ground-station chip 是 per-station 的多軌道 evidence chip，責任不同）。

### 1.6 Bottom-area layout spec（V7-#6）

新增明確 layout spec：

```
+----------------------------------------------------------+
|        [scene-context chip 14px ≤380×28]                 |  ← top center, 16px from edge
|                                                          |
| [state strip 14px]                       [toast slot]    |  ← top corners
|                                                          |
|                                                          |
|              GLOBE PRIMARY WORKSPACE                     |
|            （focus actor + visual token）                  |
|                                                          |
|                  [GS chip 11px]                          |  ← per ground station
|                  [GS chip 11px]                          |
|                                                          |
|     [5-state sequence rail 14px ~832×56]                 |  ← bottom center
|                                                          |
| [模擬展示] [precision] [TLE] [13 actors]   [Details]      |  ← footer chip row + Details button
|                       (W5 only +[⚠ 不是實際備援切換證據])    |
+----------------------------------------------------------+
```

z-order 與間距：

- footer chip row：高度 24 px，距 sequence rail 12 px
- sequence rail 底端距 canvas 底端 56 px
- W5 高顯著 chip 在 footer chip row **右側**，與 Details 按鈕同列
- footer 與 sequence rail 間插入 8 px 透明 spacer 防黏連
- Details 按鈕保留（inspector 唯一觸發），Truth 按鈕移除

bottom 區域總高度約 100 px（24 + 8 + 56 + 16 spacer），不超過 canvas
12% 高度，不擠。

### 1.7 Slice 3 design-switch acknowledgement（V7-#7）

V4.11 SDD §Slice 3 原契約：「make Truth and Details concurrent」。
本 proposal 走得**更遠**：移除 Truth role，把 Truth 內容拆到 footer +
inspector State Evidence 尾段。

設計轉向理由（明文記錄）：

- V4.10 reviewer 抱怨「Why can't I see both at once?」根因不是 mutual
  exclusion，而是「Truth 是一個 layperson 看不懂的 disclaimer 按鈕」
- Concurrency 解了 mutual exclusion 但沒解 Truth 本身的可讀性問題
- footer chip 把 disclosure 變成 ambient context，layperson 不必理解
  「Truth 是什麼」也能持續 register 到「這是模擬」

Slice 3 既有 acceptance evidence（concurrent visible 截圖、smoke
asserting two roles）需要在 implementation 後 **archive 為設計演進
證據**，不是棄置 — 這是 V4.11 SDD §Slice 3 → addendum-revised 的
設計演進記錄，要在 conv 4 handoff doc 寫進 §Slice 3 Design Evolution Note。

### 1.8 Smoke matrix expansion（V6 PARTIAL）

V6 漏的兩類補入：

**1.8.1 Reviewer-comprehension protocol revision**

Slice 0 SDD §Reviewer-Comprehension Protocol §Five Questions 的
Acceptable answer 範例假設 V4.10 baseline 語言（"low-latency context
class" 之類）。v2 全面改 layperson 中文後 protocol 必須同步更新：

| Q | v4.10 acceptable | addendum acceptable |
|---|---|---|
| Q2 軌道焦點 | 「LEO / MEO / GEO」、orbit chip | 同 + 「現在看這顆 / 這顆衛星」 |
| Q4 真實 vs 模擬 | 「simulation review / not live」 | 「模擬展示 / 不是真的 / 這是模擬」 |
| Q5 衛星位置來源 | 「CelesTrak NORAD GP」、provenance badge | 同 + 「TLE / 衛星位置資料來源」（footer chip） |

新增 acceptable answer：「位置條件變差 / 暫時接住 / 保底覆蓋 / 候選」
這 4 個 layperson 詞應該在對應 window 出現。conv 4 必須更新 protocol
+ 加 disclosure。

**1.8.2 Visual-token new smoke**

5 個 visual token（rising arc / fading arc / breathing disk / pulse /
ring）是新 Cesium 物件，需要 **新 smoke 檔** 斷言：

- 每個 token 在對應 window 預設 load 出現
- token 不出現在錯誤的 window
- token 透明度 / 半徑 / 色彩在 spec budget 內
- demoted actor 的 30% transparency assert

新 smoke 檔：`tests/smoke/verify-m8a-v4.11-addendum-visual-tokens-runtime.mjs`

### 1.9 Honest implementation footprint（addendum 修正）

reviewer V6 估「5–6 conv」更接近實情。Addendum 把工作再展開：

| Conv | 工作 | 估時 |
|---|---|---|
| Conv 0 (spike) | Cesium 5 token 可行性 spike（§1.3）；不過則退回修 spec | ≤1 小時 |
| Conv 1 | 5 visual token 實作 + scene-context chip + ground-station chip | 2 小時 |
| Conv 2 | hover popover phase-specific rewrite（5 windows × 3 lines）+ inspector single-role + countdown derivation | 2 小時 |
| Conv 3 | footer chip system + Truth removal + W5 高顯著 chip + bottom layout | 1.5 小時 |
| Conv 4 | Slice 5 demote + Sources 移入 inspector advanced + smoke matrix 13 點更新 + 新 visual-token smoke + Slice 0 protocol revision + Lock-in J full disclosure + Slice 3 Design Evolution Note | 2.5 小時 |

**總計：5 conv × ~9 小時 implementation work + 5 reconciliation 回合**。
比 v2 估的「4 對話 8 小時」誠實多 1 conv + 1 小時。

## Status reminder

這是 **proposal v2 + Addendum 1**，需要：

1. UX-side reviewer 第二輪 ✅ 完成（本 addendum 收尾）
2. planning/control 接受 — **下一步**
3. Conv 0 spike 啟動（驗 Cesium token 可行性）
4. Conv 1–4 implementation
5. Lock-in J full disclosure + Slice 0 protocol revision

在那之前，V4.11 Slice 1–5 既有 implementation 維持原狀。

reviewer V9 建議「完成 addendum 後 conv 1 起跑，不必整份 v3」— 採納。
不開 v3。下一步是 planning/control 接受 + conv 0 spike 啟動。
