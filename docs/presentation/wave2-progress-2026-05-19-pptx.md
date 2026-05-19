# Selected-pair 公開軌道資料模擬 — wave 2 進度報告 (pptx 版)

本檔為 pptx 簡報版面來源，由 `wave2-progress-2026-05-19.md` (markdown 完整版) 縮排重整：
- 每張投影片 5 bullet 內或 1 個 ≤ 4×4 表格
- 加 5 張 section divider
- 句子折成 bullet；不對外宣稱的邊界以 "Non-claim" chip 標示
- 內容追溯依據與外部來源編號與 markdown 完整版一致

---

# Slide 1 — Cover

**Title**: Selected-pair 公開軌道資料模擬 — wave 2 進度報告
**Subtitle**: 客戶技術審查與專案進度報告
**Meta**:
- 日期：2026-05-19
- 版本：2026-05-19 進度快照

---

# Slide 2 — Deck 結構

**Title**: 這份簡報怎麼讀

**Bullets**:
- A 段 (slide 4–8)：站點識別 — 圓點意義、篩選、命名、資訊卡
- B 段 (slide 10–15)：Selected-pair 解讀 — 衛星篩選、軌跡、連線、CSV、Rain rate
- C 段 (slide 17–20)：公開軌道資料模擬 (TLE-first) 已落地、開發中、可驗證
- D 段 (slide 22–25)：可信度說明 + 外部來源索引
- 附錄 (slide 26)：工程驗證依據，非外部來源

**Footer**: 所有數字 / 來源 claim 追溯到外部資料、SDD、spike 或 code path

---

# Slide 3 — 名詞快查

**Title**: 常用名詞

**Two-column key table** (4 rows × 2 cols):

| 名詞 | 一句話說明 |
| --- | --- |
| Selected-pair | 選兩個地面站，算出兩站之間共同可見的衛星 |
| TLE / SATCAT | 公開衛星軌道兩行參數 / 衛星名冊；推算衛星位置與身份 |
| SGP4 | 依 TLE 推算衛星位置的標準軌道模型 |
| EIRP / RSRP / T_sys | 等效全向輻射功率 / 接收功率指標 / 系統噪聲溫度 |

**Footer**: 外部來源 [2] CelesTrak；連線參數定義見 [3] 3GPP

---

# Slide 4 — Section divider A

**Section title**: A. 站點識別
**Subtitle**: 圓點顏色 / 篩選條件 / 命名 / 資訊卡

---

# Slide 5 — 站點標記規則

**Title**: 圓點顏色與大小代表什麼

**Capability table** (2 rows × 4 cols):

| 等級 | 站數 | 一般圓點 | Selected |
| --- | --- | --- | --- |
| 三軌能力 (tri) | 22 | 綠色 r5.5；目前為少數，加 pink outline | 綠色 r8 + yellow outline |
| 雙軌能力 (dual) | 47 | 藍色 r4.5 + dark outline | 藍色 r6.5 + yellow outline |

**Bullets**:
- pink outline 套在「目前站數較少的能力等級」；現在 tri (22) < dual (47)
- 資料庫目前無「完全無相容 pair」站，故無第三種樣式
- 圓點只表示 handover capability；資料來源等級仍在資訊卡與右側面板

**Footer**: 外部來源 [1][6]-[10]；live 計算自 `station-compatibility.ts`

---

# Slide 6 — 站點篩選條件

**Title**: 篩選器代表什麼 + Band 是什麼

**Filter group table** (4 rows × 3 cols):

| 群組 | 選項 | 用途 |
| --- | --- | --- |
| Orbit | LEO / MEO / GEO | 公開揭露支援的軌道類別 |
| Handover | 2-orbit / 3-orbit | 兩站可共同切換的軌道類別數 |
| Region | Africa / Asia / Europe / N. America / Oceania / Antarctic / Arctic / S. America | 資料庫 region 欄位 |
| Band | Ka / Ku / C / X / S / L | 公開揭露支援的 RF 頻段 |

**Bullets**:
- Orbit / Band / Region 是資料庫欄位篩選；Handover 是相容 pair 推導
- 不等於實際服務證明；不代表營運商已驗證 routing

**Footer**: 外部來源 [1][6]-[10]

---

# Slide 7 — 站點命名規則

**Title**: 為什麼不用國家命名

**Bullets**:
- 同國可有多個 operator 與多個 station site；同 operator network 可跨國
- 展示系統需要唯一的 physical endpoint 做 routing / screenshot / pair URL
- 命名依據：operator service page、station public page、Wikipedia / Wikidata、FCC / ITU filing、World Teleport Association、產業 press

**Field table** (4 rows × 2 cols):

| 欄位 | 作用 |
| --- | --- |
| `id` | 穩定路由鍵；通常為 `operator-family + site/locality` slug |
| `name` | 使用者看到的 public station / teleport / gateway 名稱 |
| `operator` / `operatorFamily` | network ownership 與 pair tier 推論 |
| `country` / `region` | 篩選脈絡，不是 endpoint identity |

**Footer**: 外部來源 [1][6]-[10]

---

# Slide 8 — 站點資訊卡

**Title**: 點開單一站點後，能看到什麼

**Display table** (5 rows × 2 cols):

| 顯示區塊 | 內容 |
| --- | --- |
| 標題 | public station / teleport / gateway display name |
| 欄位清單 | operator、operatorFamily、country、region、座標、軌道、頻段、揭露精度 |
| 用途 / 備註 | `primaryUseCase` + `publicDisclosureNotes` 公開資料摘要 |
| 來源連結 | `Public source · sourceTier`，連到資料庫 primary URL |
| 操作 | Select as Station A/B；已選 pair 顯示 source tier |

**Bullets**:
- 每站點都有一個 primary public source；只收公開可佐證 ≥ 2 軌道類別的站
- 座標依 `disclosurePrecision` 可能是 exact 或 municipality 代表座標
- `elevationM` / `terrainMaskDeg` 已寫入資料庫，目前還不顯示
- **Non-claim**：不驗證 commercial routing、private service、實際流量

**Footer**: 外部來源 [1][5][6]-[10]

---

# Slide 9 — Section divider B

**Section title**: B. Selected-pair 解讀
**Subtitle**: 衛星篩選 / 軌跡 / 連線 / CSV / Rain rate

---

# Slide 10 — Selected-pair 衛星篩選 (1)

**Title**: 候選衛星怎麼挑出來

**Pipeline table** (5 rows × 2 cols):

| 階段 | 規則 |
| --- | --- |
| Pair input | 站點 id、座標、軌道、頻段來自公開資料庫 |
| Orbit filter | 取兩站共同揭露軌道：LEO / MEO / GEO intersection |
| TLE pool | CelesTrak GP TLE snapshot；SATCAT 補 constellation / operator 脈絡 |
| Compute cap | 互動運算目前每軌道類別最多 60 筆 TLE |
| Geometry filter | SGP4 propagation + station geometry；門檻 10° 仰角 |

**Bullets**:
- 取樣 cadence：LEO 30 s、MEO 60 s、GEO 120 s
- Pair filter：同顆衛星須同時對 A/B 形成重疊可視窗才入選

**Footer**: 外部來源 [1][2]

---

# Slide 11 — Selected-pair 衛星篩選 (2) — 顯示取捨

**Title**: 為什麼畫面最後只強調幾顆

**Bullets**:
- 第一輪候選可能多顆；畫面分層級避免擁擠
- **資料層**保留所有 pair visibility 衛星 + handover target + continuity id
- **服務衛星**：replay 當下由 `cross-orbit-live` policy 選出
- **視覺強調**：active / continuity 用較明顯模型；其他降低權重
- **Labels**：最多前 6 個；active / candidate / continuity 保留 label
- **Uplink / downlink pulses**：只跟目前 active link 走

**Footer**: 視覺呈現邏輯，非資料層篩選

---

# Slide 12 — Selected-pair 軌跡與可視窗

**Title**: 衛星軌跡的真實性層次

**Truth table** (3 rows × 2 cols):

| 層次 | 內容 |
| --- | --- |
| 真實公開資料 | 衛星身份、NORAD / COSPAR、TLE 兩行軌道 (CelesTrak) [2] |
| 開源推導 | SGP4 取樣位置、WGS84 仰角計算、A/B 重疊區段 → pair visibility |
| Display-only | camera framing、altitude compression、label density、generic mesh、lane placement |

**Bullets**:
- Scene actor set = pair visibility + handover target + continuity id
- 排序：active link 優先 → 最早可視窗
- 若 pair 無可視窗：**不**補 fake satellite、**不**補 fake active link

**Footer**: 外部來源 [1][2][6]-[10]

---

# Slide 13 — Selected-pair 連線與傳輸模型

**Title**: 連線數字的來源分層

**Surface table** (4 rows × 2 cols):

| Surface | 解讀 |
| --- | --- |
| Active satellite | pair visibility 候選交 `cross-orbit-live` policy 選 |
| Uplink / downlink lines | 幾何端點：A → satellite → B；方向為視覺呈現 |
| Moving packets / pulses | 純視覺節奏，非 packet capture / traffic log |
| Handover reason | 依仰角、剩餘可視時間、latency、jitter、relative RSRP |

**Bullets**:
- Latency：用斜距推估 one-way 延遲；依 3GPP TR 38.811 §6.7 [3]
- Throughput / jitter / rain impact：FSPL + gas + rain attenuation 模型；非實測 [3][4]

**Footer**: 模型輸出，非營運商實測

---

# Slide 14 — Selected-pair 真實性邊界

**Title**: 對外可以怎麼說

**Truth-class table** (5 rows × 2 cols):

| 類別 | 範圍 |
| --- | --- |
| 真實公開資料 | 站點身份 / 精度 / source、TLE 衛星身份、NORAD / COSPAR、SATCAT |
| 開源推導 | satellite 取樣位置、可視窗、pair intersection、候選 set |
| 模型估算 | active 選擇、handover、latency、jitter、throughput、rain、comm time |
| 純視覺 | uplink/downlink pulses、display lane、camera、label、generic mesh |
| 不可宣稱 | 營運商實測 telemetry、實測 packet flow、congestion、private gateway、commercial routing |

**Footer**: 缺口 — EIRP、bandwidth、T_sys、完整大氣 grid 仍待確認來源 [3][4][5]

---

# Slide 15 — Download CSV 稽核資料

**Title**: CSV 怎麼讀

**Block table** (4 rows × 2 cols):

| 區塊 | 解讀 |
| --- | --- |
| 模擬運算摘要 | A/B、window、shared orbits、來源等級、座標精度 |
| 站點精度 | 座標精度標籤、raw lat/lon、畫面位置是否等於 source truth [1] |
| TLE 來源清單 | CelesTrak path、record counts、cap、parse health、epoch [2] |
| 衛星 / 可視窗 / 通訊 / 模型 / 視覺轉換 | 依各 section 對應右側面板與 non-claim [3][4] |

**Bullets**:
- 讀法：先看來源等級與座標精度 → TLE manifest 是否 fresh / capped → 衛星脈絡對照右側面板 → Non-claim 收尾
- **Non-claim**：CSV 是稽核資料，非 packet capture / operator telemetry / commercial routing 證據

**Footer**: 外部來源 [1][2][3][4]

---

# Slide 16 — Rain rate 控制重點

**Title**: 為什麼只開放 Rain rate slider

**Bullets**:
- Station pair、time window、TLE pool、orbit support 都是 selected-pair 來源輸入
- Slider 可在不改站點與 TLE 真實值的前提下展示 weather fade 壓力測試
- 限制範圍的模型輸入 → 不會把使用者搞混來源資料與假設

**Impact table** (3 rows × 2 cols):

| 影響範圍 | 解讀 |
| --- | --- |
| 不會改變 | 站點座標、衛星身份、TLE 推算、可視窗、候選池 |
| 直接影響 | ITU-R P.618 rain attenuation、Ku/Ka 模型 throughput / jitter [4] |
| 可能連帶 | active 衛星、comm time、handover count 隨 link score 變動 [3][4] |

**Footer**: 外部來源 [4] ITU-R P.618

---

# Slide 17 — Section divider C

**Section title**: C. 公開軌道資料模擬 (TLE-first) — 狀態
**Subtitle**: 目標 / 已完成 / 開發中 / 可驗證

---

# Slide 18 — TLE-first 模擬目標

**Title**: TLE-first 是什麼

**Bullets**:
- 衛星身份與軌道**先**用公開 TLE / SATCAT 資料
- **後**用模型推導可視窗、連線選擇、天候影響
- 不是營運商實測；不是真實封包紀錄

**Q&A table** (4 rows × 2 cols):

| 問題 | 目前做法 |
| --- | --- |
| 衛星是否真實 | 用 CelesTrak GP / SATCAT 公開身份與軌道 [2] |
| 軌跡怎麼來 | SGP4 依 TLE 推算 + 站點座標計算可視窗 |
| 連線數字怎麼來 | latency、throughput、jitter、handover 是模型估算 |
| 缺資料怎麼處理 | EIRP / bandwidth / T_sys 未確認時顯示 unavailable |

**Footer**: 目前只可說「基礎能力已建立」；完整前後比較畫面仍在開發中

---

# Slide 19 — 目前已完成基礎

**Title**: 已落地的基礎能力

**Layout**: 截圖左 + bullet 表右

**Image**: `wave2-progress-2026-05-19-assets/current-selected-pair-overview.png`

**Done table** (5 rows × 2 cols):

| 已完成 | 對報告的意義 |
| --- | --- |
| 公開 TLE / SATCAT path | 衛星來源可追溯，不補 fake actor [2] |
| 模擬結果來源欄位 | CSV / 右側面板可追到來源、模型、non-claim |
| Station elevation prep | 69 站點已有高度 / horizon mask 欄位，待 runtime 接線 [1][5] |
| Slice-0 baseline | 5 個 walkthrough URL 固定為後續 comparison 基準 |
| Performance spike | LEO 200 cap @ 30 s 已有 p95 391.2 ms 證據 |

**Footer**: Refresh 是 build-step / manifest path；runtime hot path 不抓網路

---

# Slide 20 — 仍在開發與待確認

**Title**: 開發中 + 待確認條件

**Roadmap table** (5 rows × 3 cols):

| 項目 | 要完成什麼 | 待確認條件 |
| --- | --- | --- |
| 站點高度 / 地形 | 把 `elevationM` / `terrainMaskDeg` 接到可視窗、雨衰、右側第 6 列 | 程式尚未接讀 |
| 候選量與 policy | LEO 200 cap @ 30 s、cap disclosure、policy selector | 200 + 10 s 尚未通過 |
| 視覺證據 | TLE freshness、active badge、pre/post comparison shell | 比較證據尚未完成 |
| RSRP / throughput | EIRP / bandwidth / T_sys / Shannon throughput | 來源未確認則 unavailable |
| 大氣 / 雨量格點 | cloud、scintillation、rain height、rain climatology grid | 待 ITU-R grid 使用 / 打包政策 [4] |

**Footer**: 外部來源 [4]

---

# Slide 21 — 目前可驗證證據

**Title**: 可引用的 baseline

**Evidence table** (5 rows × 2 cols):

| 證據 | 可對外說法 |
| --- | --- |
| 目前畫面截圖 | selected-pair route 已顯示來源、模型揭露、CSV audit |
| 代表路徑基準 | 5 組路徑右側面板第 3 / 5 / 6 列值已固定為基準 |
| 效能證據 | LEO 60 + 10 s PASS；LEO 200 + 30 s PASS；LEO 200 + 10 s FAIL |
| 來源脈絡 | Station / TLE / SATCAT / CSV 可交叉檢查 [1][2] |
| 比較畫面邊界 | 前後比較畫面仍在開發中；**不可**宣稱已完成比較驗證 |

**Footer**: 來源：slice-0 §6.2 baseline + 2026-05-19 重新擷取的 screenshot

---

# Slide 22 — Section divider D

**Section title**: D. 資料可信度 + 外部來源
**Subtitle**: 怎麼分辨公開 / 模型 / 視覺 + 引用列表

---

# Slide 23 — 資料可信度說明

**Title**: 報告時怎麼分

**Trust table** (5 rows × 2 cols):

| 類型 | 可解讀方式 |
| --- | --- |
| Station card | 公開資料庫 + source link；座標可能為 exact 或代表座標 |
| Download CSV | 稽核資料，非實測 telemetry |
| Rain rate slider | 模型控制參數，非實測天氣 |
| Satellite scene | 衛星身份與位置來自公開 TLE 推導 |
| 數值指標 | 除明確標 source-derived 外，皆為模型估算 |

**Bullets**:
- **不宣稱**：營運商實測 telemetry、實測 throughput / jitter / congestion、private gateway schedule、commercial routing、runtime Internet refresh、營運商已驗證的 station-to-station service
- 缺必要來源 → 顯示 unavailable / pending，不靜默補值

---

# Slide 24 — 外部來源 (站點)

**Title**: 參考資料 — 站點公開來源

**Ref table** (6 rows × 2 cols):

| Ref | Source |
| --- | --- |
| [1] | Operator network：KSAT Global、SES O3b mPOWER、Intelsat teleport chart |
| [6] | GEO/LEO/MEO operator：Eutelsat GEO-LEO、Telesat、SES gateway update |
| [7] | Teleport profile：World Teleport Association、USEI、SANSA、NRCan Inuvik |
| [8] | Public filing：FCC IBFS SES-LIC-20130124-00089；公開設施地址清單 |
| [9] | Public geospatial：Wikipedia / Wikidata — Svalbard、Troll、Tromso、Awarua、Fuchsstadt |
| [10] | Press / news：Orange Martinique、Speedcast Cali、SpaceNews Peru gateway |

**Footer**: 完整 URL 列於 `wave2-progress-2026-05-19.md` Slide 19–20

---

# Slide 25 — 外部來源 (衛星 / 標準 / 地形)

**Title**: 參考資料 — 衛星、標準與地形

**Ref table** (4 rows × 2 cols):

| Ref | Source |
| --- | --- |
| [2] | CelesTrak public GP / SATCAT — `celestrak.org/NORAD/elements/gp.php` + `satcat.csv` |
| [3] | 3GPP TR 38.811、TR 38.821 — `3gpp.org/ftp/Specs/archive/38_series/` |
| [4] | ITU-R P.618 / P.676 / P.838 / P.835 / P.837 / P.839 / P.840 / S.1528 / S.465 via `itu.int/rec/` |
| [5] | Terrain — NASA/USGS SRTM 1″ DEM via `earthexplorer.usgs.gov`；Open-Elevation |

**Footer**: 完整 URL 列於 markdown 完整版

---

# Slide 26 — 附錄：工程驗證依據

**Title**: 附錄 — 工程驗證依據（非外部引用來源）

**Bullets**:
- 本頁列本簡報之系統設定、測試數字與基準在專案內哪裡查到

**Internal table** (6 rows × 2 cols):

| 依據 | 用途 |
| --- | --- |
| `public/fixtures/ground-stations/multi-orbit-public-registry-sources.md` | 站點 URL / source snippet / coordinate / capability evidence |
| `tle-first-fidelity-uplift.md` §7 / §11 / §12.1 | 待開發、風險、spike gate |
| `slice-0-baseline.md` §6.2 | 5 組代表路徑右側面板基準值 |
| `spike-S1-cap-cadence-perf.md` | LEO cap / cadence p95 測試結果 |
| `runtime-projection-csv.ts` | Download CSV 欄位與稽核匯出格式 |
| `runtime-data-completeness.ts` | 來源脈絡 / non-claim / 缺資料狀態 |

**Footer**: 此頁非外部引用來源
