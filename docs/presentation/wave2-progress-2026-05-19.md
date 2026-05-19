# Selected-pair 公開軌道資料模擬 — wave 2 進度報告

日期：2026-05-19  
Task 1 後的 HEAD：`cf4e353`  
對象：客戶技術審查與專案進度報告。

Deck 結構：前段回答審查問題，後段整理公開軌道資料模擬的目前狀態、
正在開發項目、以及不可宣稱的邊界。所有數字 claim 都要能追到 commit、
SDD section、spike report row，或本地 code path [6]。

---

# 站點標記規則

用途：說明首頁 ground-station dots 的顏色、大小與 capability classification。

結論：不是全部一樣；畫面上主要看成兩種 dot groups，但底層 capability
classification 是三種。Station orbit / band metadata 來自 public source
corpus [1]；2-orbit / 3-orbit 是系統依 metadata 與幾何規則推導，不是外部網站
直接提供的 label。

| 分類 | 一般圓點 | Highlight / selected | 意義 |
| --- | --- | --- | --- |
| `tri-capable` | green，radius 5.5 px；目前少數群組會有 pink outline | green，radius 8 px，yellow outline | 至少能和某個 pair 共享 3 種 handover orbits |
| `dual-only` | blue，radius 4.5 px，dark outline | blue，radius 6.5 px，yellow outline | 可形成 compatible pairs，但最多共享 2 種 handover orbits |
| `none` | 目前沿用 blue dual-style dot | blue selected style | 沒有 compatible pair |

目前 registry capability count：21 tri-capable、47 dual-only、1 none。邊界：
這只表示 handover-capability 與 hover/selection 狀態；Source tier 仍放在 chips、
station info card、以及 V4 panel。

判斷方式：先要求 pair 有 shared RF band；再檢查 shared LEO/MEO/GEO 是否通過
10° elevation geometry。某站可形成的 pair 最大為 3 orbits 就是 tri-capable；
最大為 2 orbits 就是 dual-only。

---

# 站點篩選條件

用途：整理 station selection filters 的分類、UI items，以及 Band 的意義。

結論：Band 指 RF frequency band。Orbit / Region / Band 來自 public registry
metadata [1]；Handover 是基於 shared band + shared orbit geometry 的 derived
pair filter。

| Filter group | UI items | 用途 |
| --- | --- | --- |
| Orbit | LEO、MEO、GEO | 篩選 station disclosed supported orbit classes |
| Handover | 2-orbit、3-orbit | 篩選 pair compatibility 的 handover orbit count |
| Region | Africa、Asia、Europe、N. America、Oceania、Antarctic、Arctic、S. America | 依 registry region 篩選 |
| Band | Ka、Ku、C、X、S、L | 依 disclosed supported RF bands 篩選 |

解讀邊界：Orbit / Band / Region 是 station registry metadata filter；Handover
是相容 pair 的篩選。它們不等於 live service proof，也不代表 operator-validated
routing。

Band 選項不是任意設計；它們是 registry 目前公開來源中出現並被納入 UI 的 RF
bands set。

---

# 站點命名規則

用途：說明 station identity 為什麼採 site/operator-first，而不是 country-first。

結論：station identity 採 site/operator-first，不採 country-first。命名依據
來自公開 operator facility / service pages、station public pages、Wikipedia /
Wikidata 類地理資料、FCC / ITU filings、World Teleport Association profiles、
以及產業新聞或 press releases [1]。

| 欄位 | 作用 |
| --- | --- |
| `id` | stable route key，通常是 `operator-family + site/locality` slug |
| `name` | reviewer 看到的 public station / teleport / gateway name |
| `operator` / `operatorFamily` | network ownership 與 pair-tier inference |
| `country` / `region` | metadata 與 filtering context，不是 endpoint identity |

不以 country 命名的原因：同一個國家可以有多個 operators 與多個 station
sites，而同一個 operator network 也可能跨多國。Demo 需要唯一的 physical
endpoint 來做 routing、screenshots、pair URLs；country 粒度太粗。

---

# 站點資訊卡

用途：單點 station 後，讓 reviewer 檢查 endpoint identity、public source、
capability metadata、以及是否可選為 Station A/B。

資料來源類型：operator facility / service pages、公開 station pages、
Wikipedia / Wikidata 類地理座標資料、FCC / ITU filings、World Teleport
Association profiles、產業新聞與 press releases；高度資料來自 SRTM /
Open-Elevation cache [1][5]。

| 顯示區塊 | 內容與解讀 |
| --- | --- |
| Title | `name`，public station / teleport / gateway display name |
| Field list | `operator`、`operatorFamily`、`country`、`region`、coordinates、supported orbits、supported bands、disclosure precision |
| Use case / notes | `primaryUseCase` 與 `publicDisclosureNotes`，是 public disclosure summary |
| Source link | `Public source · sourceTier`，連到 registry 的 primary URL |
| Actions / badge | Select as Station A/B；已選 pair 時顯示 pair source tier |

真實性：每個 station 都有一個 primary public source，且只收公開來源可支持
≥2 of LEO/MEO/GEO 的 entries。Coordinates 依 `disclosurePrecision` 可能是 exact
coords，也可能是 municipality / operator-family region representative coords。
Supported orbits / bands 表示公開揭露能力，不是 live service proof。
`elevationM` / `terrainMaskDeg` 已在 registry 作為 F6 prep data，但不是目前
info card 的顯示欄位。

Non-claim：card 不驗證 commercial routing、private service、或兩站間實際流量。

---

# Selected-pair 衛星篩選

用途：說明選定 Station A/B 後，畫面上的衛星候選是怎麼被挑出來。

| 階段 | 規則 |
| --- | --- |
| Pair input | 只接受 registry station ids；station coordinates / supported orbits / bands 來自 public registry |
| Orbit gate | 先取兩站共同揭露支援的 orbit classes：LEO / MEO / GEO intersection |
| TLE pool | 使用 CelesTrak public GP TLE snapshots；SATCAT summary 補 constellation / operator context [2] |
| Compute cap | interactive compute 目前每個 orbit class 最多 60 筆 TLE records |
| Geometry gate | 用 SGP4 propagation + station geometry 算 elevation windows；threshold 10° |
| Cadence | LEO 30 s、MEO 60 s、GEO 120 s visibility sampling |
| Pair gate | 同一顆衛星必須同時對 A/B 形成 overlapping visibility window，才會進入 pair candidates |

所以「目前這幾顆」不是手工指定；它們是共同 orbit support、TLE cap、可視幾何、
以及 pair-window intersection 共同篩出的結果。

---

# Selected-pair 顯示取捨

第一輪 pair candidates 可能很多；畫面不會把每顆都用同樣強度呈現。Renderer
會把資料分成幾個層級 [6]：

| 層級 | 顯示規則 |
| --- | --- |
| Actor set | 所有有 pair visibility windows 的衛星，加上 handover target 與 continuity ids |
| Active link | replay 當下由 `cross-orbit-live` policy 選出的 serving satellite |
| Model emphasis | active / continuity actors 才用明顯 satellite model；context actors 降低視覺權重 |
| Labels | 最多顯示前 6 個 labels；active / candidate / continuity 會保留 label |
| Uplink / downlink pulses | 只跟目前 active link 走；不是所有候選都畫 packet flow |

所以「最後只看到幾顆」主要是 readability policy：資料層保留候選與 provenance，
視覺層只強調目前服務、切換目標、以及連續性相關的衛星。

---

# Selected-pair 軌跡與可視窗

真實來源：satellite identity、NORAD / COSPAR metadata、TLE line data 來自
CelesTrak snapshots [2]；station endpoint 來自 public registry [1]。

推導資料：runtime 將 TLE 用 SGP4 propagate 成 sampled ECEF positions，再用
WGS84 station coordinates 算每個時間點的 elevation。Elevation 高於 threshold
的連續區段會 collapse 成 visibility windows；A/B windows 的重疊區段就是
pair visibility。

資料層保留哪些 actor：scene actor set 來自 pair visibility windows、handover
target ids、以及 continuity ids；排序上 active link 優先，其次是最早可視窗。
Zero-window selected-pair 不會補 fake satellite 或 fake active link。

Display-only：camera framing、altitude compression、label density、generic
satellite mesh、以及 visual lane placement 只是讓畫面可讀，不是來源資料。

---

# Selected-pair 連線與傳輸模型

| Surface | 解讀 |
| --- | --- |
| Active satellite | 由 pair visibility candidates 交給 `cross-orbit-live` policy 選出 |
| Uplink / downlink lines | 幾何端點是 Station A → satellite → Station B；方向視覺是 display grammar |
| Moving packets / pulses | 純視覺化節奏，不是 packet capture、traffic logs、或 measured throughput |
| Handover reason | modeled policy output；依 elevation、visibility remaining、latency、jitter、relative RSRP scoring |
| Latency | 用 slant range 推估 one-way propagation delay；依據 3GPP TR 38.811 §6.7 [3] |
| Throughput / jitter / rain impact | modeled estimates；使用 FSPL、gas absorption、rain attenuation 與 soft de-rating |

模型依據：FSPL 來自 3GPP TR 38.811 §6.6.2；gas / rain attenuation 參考 ITU-R
P.676 / P.618；handover policy 參考 TR 38.821 §7.3 的 trigger metrics [3][4]。

---

# Selected-pair 真實性邊界

| 類別 | 可以怎麼說 |
| --- | --- |
| 真實公開資料 | station identity / coordinates precision / public source、TLE satellite identity、NORAD / COSPAR、SATCAT summary |
| 開源推導 | satellite sampled positions、tracks、station visibility、pair visibility intersection、candidate satellite set |
| 模型估算 | active satellite choice、handover decision、latency、jitter、throughput、rain impact、comm time summary |
| 純視覺 | uplink/downlink pulses、packet-like dots、display lanes、camera、label density、generic satellite model |
| 不可宣稱 | operator measured telemetry、real packet flow、measured congestion、private gateway schedule、commercial routing |

目前缺口：EIRP、allocated bandwidth、system temperature、完整 atmospheric grids
仍是 pending anchors；因此 throughput / RSRP 類語句只能保持 modeled estimate，
不能說是實測或 operator-confirmed。

---

# Download CSV 稽核匯出

用途：selected-pair 的 Download CSV 是 runtime projection 的 audit export，
用來重現 panel values、檢查 provenance 與 truth boundary；它不是 packet
capture、operator telemetry、或 commercial routing evidence [6]。

| CSV 區塊 | 解讀方式 |
| --- | --- |
| Runtime projection | Station A/B、time window、shared orbits、source tier、precision label |
| Station precision | coordinates precision、raw lat/lon、render position 是否等於 source truth [1] |
| TLE source manifest | CelesTrak path、record counts、cap、parse health、epoch / source health [2] |
| Actor / visibility provenance | 哪些 satellite 被 propagated、sample cadence、A/B visibility source、pair intersection |
| Communication / link events | comm time summary、handover reason；derived / modeled，不是 traffic logs [3][4] |
| Modeled outputs | model id、standards refs、input summary、non-claim |
| Display transforms | camera、lane、mesh、label 等 display-only choices |

讀法：先看 source tier / precision label，再看 TLE manifest 是否 fresh / capped；
接著用 actor / visibility provenance 對照右側 panel；最後看 Non-claims，
確認哪些不能對外宣稱。

---

# Rain rate 控制重點

目前只開放 rain rate，是因為 station pair、time window、TLE pool、orbit
support 都是 selected-pair 的 provenance inputs；若在同一個 view 用 slider
任意改動，容易讓 reviewer 分不清來源資料與模擬假設。Rain rate 則是 bounded
model input，可在不改 station / TLE source truth 的前提下展示 weather fade
stress test [4][6]。

| 影響範圍 | 解讀方式 |
| --- | --- |
| 不會改變 | station coordinates、satellite identity、TLE propagation、visibility windows、candidate pool |
| 直接影響 | ITU-R P.618 rain attenuation、Ku/Ka modeled throughput、jitter [4] |
| 可能連帶影響 | 若 link score 改變，active satellite、comm time、handover count 可能跟著變動 [3][4] |

右側 panel 報告策略：Row 2 Rain rate 與 Row 5 d1 Rain impact 要特別講；
其他 rows 只帶過 identity / window、derived stats、visibility summaries、sources、
non-claims、CSV audit export。重點是分類：public/source-derived、geometry-derived、
modeled output、display-only。

---

# 公開軌道資料模擬目標

來源：SDD §7、§11、§12.1；slice-0 §6.2；S1 spike report [6]。

TLE-first 的意思：衛星身份與軌道先使用公開 TLE / SATCAT 資料，再用模型推導
站點可視窗、連線選擇與天候影響。它不是營運商實測資料，也不是真實封包紀錄。

| 問題 | 目前做法 |
| --- | --- |
| 衛星是否真實 | 使用 CelesTrak GP / SATCAT 的公開衛星身份與軌道資料 [2] |
| 軌跡怎麼來 | 用 SGP4 依 TLE 推算位置，再與站點座標計算可視窗 |
| 連線數字怎麼來 | latency、throughput、jitter、handover 是模型估算，會標示來源與限制 |
| 缺資料怎麼處理 | EIRP / bandwidth / T_sys 等必要資料未確認時顯示 unavailable |
| 視覺動畫怎麼看 | 線條、封包點、camera、label 是輔助理解，不是真實流量 |

目前只可說 foundation 已建立；完整前後比較畫面仍在開發中。

---

# 目前已完成基礎

![Current selected-pair route](wave2-progress-2026-05-19-assets/current-selected-pair-overview.png)

Screenshot captured after `cf4e353`。

| 已完成 | 對報告的意義 | Trace |
| --- | --- |
| 公開 TLE / SATCAT source path | 衛星身份與軌道來源可追溯，不補 fake actor | `c6d731d` |
| Runtime provenance shape | CSV / panel 可追到資料來源、模型、non-claim | `db018a6` |
| Station elevation prep | 69 個站點已有高度與 horizon mask 欄位，等待 runtime 接線 | `39733a7` |
| Slice-0 baseline | 五個 walkthrough URL 已 frozen，供後續 comparison 使用 | `ecbe41c` |
| Performance spike | LEO 200 cap at 30 s 已有 p95 391.2 ms evidence | `83ed47d`、`714ddec` |

Refresh 是 build-step / manifest path；runtime hot path 不做網路抓取。

---

# 仍在開發與待確認

| 開發項目 | 要完成什麼 | 待確認條件 |
| --- | --- | --- |
| 站點高度 / 地形 | 把 `elevationM`、`terrainMaskDeg` 接到可視窗、雨衰減高度、Row 6 | Runtime read paths 待做 |
| 衛星候選量與 policy | LEO 200 cap at 30 s、cap disclosure、policy selector | 目前 p95 391.2 ms PASS；LEO 200 + 10 s 尚未通過 |
| 視覺證據 | TLE freshness、active badge、pre/post comparison shell | Comparison evidence 尚未完成 |
| RSRP / throughput | EIRP、bandwidth、T_sys、Shannon throughput | S2a / S2b；未確認就顯示 unavailable |
| 大氣 / 雨量格點 | cloud、scintillation、rain height、rain climatology grids | S3 決策後才能處理 |

---

# 目前可驗證證據

來源：slice-0 §6.2 values frozen at `7c44d60`；screenshots 在 `cf4e353`
重新擷取。這些是目前可引用的 baseline，不是完整 comparison result。

| 證據 | 可對外說法 |
| --- | --- |
| Current route shot | selected-pair route 已顯示資料來源、模型揭露、CSV audit |
| Walkthrough baseline | 五組代表路徑的 Row 3 / Row 5 / Row 6 值已 frozen |
| Performance evidence | LEO 60 + 10 s PASS；LEO 200 + 30 s PASS；LEO 200 + 10 s FAIL |
| Source provenance | Station source、TLE source、SATCAT summary、CSV export 可交叉檢查 |
| Comparison boundary | 前後比較畫面仍在開發中，目前不可宣稱已完成比較驗證 |

---

# 資料可信度說明

報告時要清楚分辨：哪些來自公開來源、哪些是模型推導、哪些只是視覺輔助。

| 類型 | 可解讀方式 |
| --- | --- |
| Station card | 公開資料庫 + source links；座標可能是 exact 或 representative |
| Download CSV | 用來稽核資料來源與 panel values，不是實測 telemetry |
| Rain rate | 模型控制參數，不是實測天氣 |
| Satellite scene | 衛星身份與位置來自公開 TLE 推導 |
| Metrics | 除非明確標為 source-derived，否則是模型估算 |
| Moving packets / lanes / camera | 視覺輔助，不是真實 packet capture 或 traffic telemetry |
| Missing anchors | 顯示 unavailable / pending，不靜默補值 |

不宣稱：measured operator telemetry、measured throughput / jitter / congestion、
private gateway schedules、live commercial routing、runtime Internet refresh、
或 operator-validated station-to-station service。

---

# 參考資料 — 核心引用

| Ref | Source |
| --- | --- |
| [1] | Ground-station source index：`public/fixtures/ground-stations/multi-orbit-public-registry-sources.md`；含 per-station URL、source snippet、coordinate / capability evidence。 |
| [2] | CelesTrak GP / SATCAT：`https://celestrak.org/NORAD/elements/gp.php`、`https://celestrak.org/satcat/satcat.csv`、Terms：`https://celestrak.org/terms-of-use.php`。 |
| [3] | 3GPP TR 38.811 §6.6.2 / §6.7；3GPP TR 38.821 §7.3。 |
| [4] | ITU-R recommendations：P.618、P.676、P.838、P.835、P.837、P.839、P.840、S.1528、S.465。 |
| [5] | Terrain / elevation：NASA/USGS SRTM 1arcsec global DEM；Open-Elevation lookup cache。 |
| [6] | 工程追溯：本 deck 內列出的 SDD sections、slice-0 baseline、S1 spike report、commit ids。 |

---

# 參考資料 — 站點來源補充

| Ref | Source examples |
| --- | --- |
| [7] | Operator / network pages：KSAT、SES O3b mPOWER、Intelsat teleport chart、Eutelsat / OneWeb GEO-LEO pages、Telesat teleports。 |
| [8] | Teleport / facility profiles：World Teleport Association、USEI Vernon Valley、Skylogic、OTE / COSMOTE、Pivotel、SANSA、NRCan ISSF。 |
| [9] | Regulatory / public records：FCC IBFS filings、ITU filing pages where available、public address or facility listings。 |
| [10] | Public geospatial sources：Wikipedia / Wikidata station pages、SvalSat、TrollSat、Tromsø、Awarua 等 coordinate references。 |
| [11] | News / press evidence：SES、Eutelsat / OneWeb、Orange、Speedcast、Telespazio、NT Satellite、stc、Vivacom、SpaceNews。 |
| [12] | Open-source dataset table：SDD §6 lists CelesTrak GP / SATCAT、ITU-R grids、NASA SRTM、3GPP archives with license posture。 |
