# Selected-pair 公開軌道資料模擬 — wave 2 進度報告

日期：2026-05-19  
版本：2026-05-19 進度快照  
對象：客戶技術審查與專案進度報告。

Deck 結構：前段回答審查問題，後段整理公開軌道資料模擬的目前狀態、
正在開發項目、以及不可宣稱的邊界。所有數字與來源性 claim 都要能追到
外部資料來源、SDD section、spike report row，或本地 code path；工程驗證依據
另列於最後，非外部引用來源。

---

# 名詞說明

| 名詞 | 說明 |
| --- | --- |
| Selected-pair | 使用者選兩個地面站後，系統計算兩站之間可共同看到哪些衛星。 |
| TLE | Two-Line Element，公開的衛星軌道參數；本模擬用它推算衛星位置 [2]。 |
| SATCAT | Satellite Catalog，補衛星名稱、NORAD id、COSPAR id、星座與營運商脈絡 [2]。 |
| LEO / MEO / GEO | 低軌 / 中軌 / 地球同步軌道。 |
| SGP4 | 依 TLE 推算衛星位置的標準軌道模型。 |
| CSV audit | 下載的稽核表，用來檢查資料來源與模型輸出，不是實測封包。 |
| EIRP / RSRP / T_sys | 連線預算相關參數；EIRP 是等效全向輻射功率，RSRP 是接收功率指標，T_sys 是系統噪聲溫度。 |

---

# 站點標記規則

用途：說明首頁地面站圓點的顏色、大小與能力分類。

結論：不是全部一樣；畫面上主要是兩種視覺群組，但底層能力分類有三種。
站點支援的軌道與頻段來自公開來源索引 [1][6]-[10]；2-orbit / 3-orbit
是系統依站點欄位資料與幾何規則推導，不是外部網站直接提供的標籤。

| 分類 | 一般圓點 | Highlight / selected | 意義 |
| --- | --- | --- | --- |
| 三軌能力 | 綠色，radius 5.5 px；少數群組有 pink outline | 綠色，radius 8 px，yellow outline | 至少能和某個 pair 共享 3 種可切換軌道類別 |
| 雙軌能力 | 藍色，radius 4.5 px，dark outline | 藍色，radius 6.5 px，yellow outline | 可形成相容 pair，但最多共享 2 種可切換軌道類別 |
| 暫無相容 pair | 目前沿用藍色雙軌樣式 | 藍色 selected style | 目前找不到相容 pair |

目前資料庫統計：21 個三軌能力、47 個雙軌能力、1 個暫無相容 pair。這只表示
handover capability 與 hover / selection 狀態；資料來源等級仍放在畫面標籤、
站點資訊卡、以及 selected-pair 右側面板。

判斷方式：先要求 pair 有共同 RF 頻段，再檢查共同 LEO / MEO / GEO 是否通過
10° 以上仰角的幾何可視條件。某站可形成的 pair 最大為 3 種軌道就是三軌能力；
最大為 2 種就是雙軌能力。

---

# 站點篩選條件

用途：整理站點篩選器的分類、畫面選項，以及 Band 的意義。

結論：Band 指 RF frequency band，也就是無線電頻段。Orbit / Region / Band
來自公開站點資料庫 [1][6]-[10]；Handover 是系統用「共同頻段 + 共同軌道
幾何可視條件」推導出的 pair 篩選。

| 篩選群組 | 畫面選項 | 用途 |
| --- | --- | --- |
| Orbit | LEO、MEO、GEO | 篩選站點公開揭露支援的軌道類別 |
| Handover | 2-orbit、3-orbit | 篩選兩站可共同切換的軌道類別數 |
| Region | Africa、Asia、Europe、N. America、Oceania、Antarctic、Arctic、S. America | 依資料庫 region 篩選 |
| Band | Ka、Ku、C、X、S、L | 依公開揭露支援的 RF 頻段篩選 |

解讀邊界：Orbit / Band / Region 是站點資料庫欄位篩選；Handover 是相容
pair 的篩選。它們不等於實際服務證明，也不代表營運商已驗證 routing。

Band 選項不是任意設計；它們是目前公開來源中出現、且被納入 UI 的 RF bands set。

---

# 站點命名規則

用途：說明 station identity 為什麼採「站點 / 營運商優先」，而不是國家優先。

結論：station identity 採站點 / 營運商優先，不採國家優先。命名依據來自
operator facility / service pages、station public pages、Wikipedia / Wikidata、
FCC / ITU filings、World Teleport Association profiles、以及產業新聞或 press
releases [1][6]-[10]。

| 欄位 | 作用 |
| --- | --- |
| `id` | 穩定路由鍵，通常是 `operator-family + site/locality` slug |
| `name` | 使用者看到的 public station / teleport / gateway name |
| `operator` / `operatorFamily` | network ownership 與 pair tier 推論 |
| `country` / `region` | 欄位資料與篩選脈絡，不是 endpoint identity |

不以 country 命名的原因：同一個國家可以有多個 operators 與多個 station
sites，而同一個 operator network 也可能跨多國。展示系統需要唯一的 physical
endpoint 來做 routing、screenshots、pair URLs；country 粒度太粗。

---

# 站點資訊卡

用途：單點 station 後，讓使用者檢查 endpoint identity、公開來源、
capability 欄位資料、以及是否可選為 Station A/B。

資料來源類型：operator facility / service pages、公開 station pages、
Wikipedia / Wikidata 類地理座標資料、FCC / ITU filings、World Teleport
Association profiles、產業新聞與 press releases；高度資料來自 SRTM /
Open-Elevation cache [1][5][6]-[10]。

| 顯示區塊 | 內容與解讀 |
| --- | --- |
| 標題 | `name`，public station / teleport / gateway display name |
| 欄位清單 | `operator`、`operatorFamily`、`country`、`region`、座標、支援軌道、支援頻段、揭露精度 |
| 用途 / 備註 | `primaryUseCase` 與 `publicDisclosureNotes`，是公開資料摘要 |
| 來源連結 | `Public source · sourceTier`，連到資料庫 primary URL |
| 操作 / 標籤 | Select as Station A/B；已選 pair 時顯示 pair source tier |

真實性：每個 station 都有一個 primary public source，且只收公開來源可支持
至少 2 種 LEO / MEO / GEO 的 entries。Coordinates 依 `disclosurePrecision`
可能是 exact coords，也可能是 municipality / operator-family region
representative coords。Supported orbits / bands 表示公開揭露能力，不是實際服務證明。
`elevationM` / `terrainMaskDeg` 已在資料庫作為準備資料，但不是目前 info card 的顯示欄位。

Non-claim：card 不驗證 commercial routing、private service、或兩站間實際流量。

---

# Selected-pair 衛星篩選

用途：說明選定 Station A/B 後，畫面上的衛星候選是怎麼被挑出來。

| 階段 | 規則 |
| --- | --- |
| Pair input | 只接受資料庫內的 station ids；站點座標、支援軌道、支援頻段來自公開資料庫 [1] |
| Orbit filter | 先取兩站共同揭露支援的軌道類別：LEO / MEO / GEO intersection |
| TLE pool | 使用 CelesTrak public GP TLE snapshots；SATCAT summary 補 constellation / operator context [2] |
| Compute cap | 互動運算目前每個軌道類別最多取 60 筆 TLE records |
| Geometry filter | 用 SGP4 propagation + station geometry 計算可視窗；門檻為 10° 仰角 |
| Cadence | 可視窗取樣間隔：LEO 30 s、MEO 60 s、GEO 120 s |
| Pair filter | 同一顆衛星必須同時對 A/B 形成重疊可視窗，才會進入候選 |

所以「目前這幾顆」不是手工指定；它們是共同軌道支援、TLE 上限、幾何可視條件、
以及兩站可視窗重疊共同篩出的結果。

---

# Selected-pair 顯示取捨

第一輪衛星候選可能很多；畫面不會把每顆都用同樣強度呈現。顯示邏輯會把
資料分成幾個層級，避免畫面過度擁擠：

| 層級 | 顯示規則 |
| --- | --- |
| 資料層候選 | 所有有 pair visibility windows 的衛星，加上 handover target 與 continuity ids |
| 目前服務衛星 | replay 當下由 `cross-orbit-live` policy 選出的 serving satellite |
| 視覺強調 | active / continuity actors 用較明顯模型；context actors 降低視覺權重 |
| Labels | 最多顯示前 6 個 labels；active / candidate / continuity 會保留 label |
| Uplink / downlink pulses | 只跟目前 active link 走；不是所有候選都畫 packet flow |

所以「最後只看到幾顆」主要是 readability policy：資料層保留候選與來源脈絡，
視覺層只強調目前服務、切換目標、以及連續性相關的衛星。

---

# Selected-pair 軌跡與可視窗

真實來源：衛星身份、NORAD / COSPAR 欄位、TLE 兩行軌道資料來自 CelesTrak
snapshots [2]；station endpoint 來自公開站點資料庫 [1][6]-[10]。

推導資料：系統將 TLE 用 SGP4 推算成取樣位置，再用 WGS84 station coordinates
計算每個時間點的仰角。仰角高於 threshold 的連續區段會合併成 visibility
windows；A/B windows 的重疊區段就是 pair visibility。

資料層保留哪些衛星：scene actor set 來自 pair visibility windows、handover
target ids、以及 continuity ids；排序上 active link 優先，其次是最早可視窗。
如果某組 selected-pair 沒有可視窗，系統不會補 fake satellite 或 fake active link。

Display-only：camera framing、altitude compression、label density、generic
satellite mesh、以及 visual lane placement 只是讓畫面可讀，不是來源資料。

---

# Selected-pair 連線與傳輸模型

| Surface | 解讀 |
| --- | --- |
| Active satellite | 由 pair visibility candidates 交給 `cross-orbit-live` policy 選出 |
| Uplink / downlink lines | 幾何端點是 Station A → satellite → Station B；方向視覺是 display grammar |
| Moving packets / pulses | 純視覺化節奏，不是 packet capture、traffic logs、或 measured throughput |
| Handover reason | 模型化 policy output；依仰角、剩餘可視時間、latency、jitter、relative RSRP scoring |
| Latency | 用斜距推估 one-way propagation delay；依據 3GPP TR 38.811 §6.7 [3] |
| Throughput / jitter / rain impact | 模型估算；使用自由空間路徑損耗、gas absorption、rain attenuation 與降額規則 |

模型依據：FSPL（free-space path loss，自由空間路徑損耗）來自 3GPP TR 38.811
§6.6.2；gas / rain attenuation 參考 ITU-R P.676 / P.618；handover policy
參考 TR 38.821 §7.3 的 trigger metrics [3][4]。

---

# Selected-pair 真實性邊界

| 類別 | 可以怎麼說 |
| --- | --- |
| 真實公開資料 | station identity / coordinates precision / public source、TLE satellite identity、NORAD / COSPAR、SATCAT summary [1][2][6]-[10] |
| 開源推導 | satellite sampled positions、tracks、station visibility、pair visibility intersection、candidate satellite set |
| 模型估算 | active satellite choice、handover decision、latency、jitter、throughput、rain impact、comm time summary [3][4] |
| 純視覺 | uplink/downlink pulses、packet-like dots、display lanes、camera、label density、generic satellite model |
| 不可宣稱 | 營運商實測 telemetry、真實 packet flow、實測 congestion、private gateway schedule、commercial routing |

目前缺口：EIRP、allocated bandwidth、system temperature、完整 atmospheric grids
仍是待確認來源；因此 throughput / RSRP 類語句只能保持模型估算，不能說是實測
或 operator-confirmed [3][4][5]。

---

# Download CSV 稽核資料

用途：selected-pair 的 Download CSV 是模擬運算結果的稽核資料，用來重現右側面板
values、檢查資料來源與真實性邊界；它不是 packet capture、operator telemetry、
或 commercial routing evidence。

| CSV 區塊 | 解讀方式 |
| --- | --- |
| 模擬運算摘要 | Station A/B、time window、shared orbits、來源等級、座標精度標籤 |
| 站點精度 | 座標精度、raw lat/lon、畫面位置是否等於 source truth [1] |
| TLE 來源清單 | CelesTrak path、record counts、cap、parse health、epoch / source health [2] |
| 衛星 / 可視窗來源脈絡 | 哪些 satellite 被軌道推算、sample cadence、A/B visibility source、pair intersection |
| 通訊 / 切換事件 | comm time summary、handover reason；是推導 / 模型結果，不是 traffic logs [3][4] |
| 模型輸出 | model id、standards refs、input summary、non-claim |
| 視覺轉換 | camera、lane、mesh、label 等 display-only choices |

讀法：先看來源等級與座標精度標籤，再看 TLE manifest 是否 fresh / capped；
接著用衛星 / 可視窗來源脈絡對照右側面板；最後看 Non-claims，
確認哪些不能對外宣稱。

---

# Rain rate 控制重點

目前只開放 rain rate（降雨率），是因為 station pair、time window、TLE pool、
orbit support 都是 selected-pair 的資料來源輸入；若在同一個 view 用 slider
任意改動，容易讓使用者分不清來源資料與模擬假設。Rain rate 是有範圍限制的
模型輸入，可在不改站點與 TLE source truth 的前提下展示 weather fade stress test [4]。

| 影響範圍 | 解讀方式 |
| --- | --- |
| 不會改變 | station coordinates、satellite identity、TLE propagation、visibility windows、candidate pool |
| 直接影響 | ITU-R P.618 rain attenuation、Ku/Ka 模型化 throughput、jitter [4] |
| 可能連帶影響 | 若 link score 改變，active satellite、comm time、handover count 可能跟著變動 [3][4] |

右側面板報告策略：第 2 列 Rain rate 與第 5 列 d1 Rain impact 要特別講；
其他 rows 只帶過 identity / window、derived stats、visibility summaries、sources、
non-claims、CSV audit。重點是分類：公開來源、幾何推導、模型輸出、純視覺輔助。

---

# 公開軌道資料模擬目標

來源：SDD §7、§11、§12.1；slice-0 §6.2；效能測試報告（內部編號 S1）。

TLE-first 的意思：衛星身份與軌道先使用公開 TLE / SATCAT 資料，再用模型推導
站點可視窗、連線選擇與天候影響。它不是營運商實測資料，也不是真實封包紀錄 [2][3][4][5]。

| 問題 | 目前做法 |
| --- | --- |
| 衛星是否真實 | 使用 CelesTrak GP / SATCAT 的公開衛星身份與軌道資料 [2] |
| 軌跡怎麼來 | 用 SGP4 依 TLE 推算位置，再與站點座標計算可視窗 |
| 連線數字怎麼來 | latency、throughput、jitter、handover 是模型估算，會標示來源與限制 |
| 缺資料怎麼處理 | EIRP / bandwidth / T_sys 等必要資料未確認時顯示 unavailable |
| 視覺動畫怎麼看 | 線條、封包點、camera、label 是輔助理解，不是真實流量 |

目前只可說基礎能力已建立；完整前後比較畫面仍在開發中。

---

# 目前已完成基礎

![Current selected-pair route](wave2-progress-2026-05-19-assets/current-selected-pair-overview.png)

這張截圖用來說明目前畫面狀態。

| 已完成 | 對報告的意義 | 追溯依據 |
| --- | --- |
| 公開 TLE / SATCAT source path | 衛星身份與軌道來源可追溯，不補 fake actor | [2] |
| 模擬結果來源欄位 | CSV / 右側面板可追到資料來源、模型、non-claim | 工程驗證依據 |
| Station elevation prep | 69 個站點已有高度與 horizon mask 欄位，等待 runtime 接線 | [1][5] |
| Slice-0 baseline | 五個 walkthrough URL 已固定為後續 comparison 的基準 | 工程驗證依據 |
| Performance spike | LEO 200 cap at 30 s 已有 p95 391.2 ms evidence | 工程驗證依據 |

Refresh 是 build-step / manifest path；runtime hot path 不做網路抓取。

---

# 仍在開發與待確認

| 開發項目 | 要完成什麼 | 待確認條件 |
| --- | --- | --- |
| 站點高度 / 地形 | 把 `elevationM`、`terrainMaskDeg` 接到可視窗、雨衰減高度、右側面板第 6 列 | 程式尚未接讀這些欄位 |
| 衛星候選量與 policy | LEO 200 cap at 30 s、cap disclosure、policy selector | 目前 p95 391.2 ms PASS；LEO 200 + 10 s 尚未通過 |
| 視覺證據 | TLE freshness、active badge、pre/post comparison shell | Comparison evidence 尚未完成 |
| RSRP / throughput | 接收功率指標、EIRP、頻寬、T_sys、Shannon throughput | 來源未確認就顯示 unavailable |
| 大氣 / 雨量格點 | cloud、scintillation、rain height、rain climatology grids | 需先確認 ITU-R grids 的使用 / 打包政策 [4] |

---

# 目前可驗證證據

來源：slice-0 §6.2 values 與 2026-05-19 重新擷取的 screenshots；細節列於工程驗證依據。
這些是目前可引用的 baseline，不是完整 comparison result。

| 證據 | 可對外說法 |
| --- | --- |
| 目前畫面截圖 | selected-pair route 已顯示資料來源、模型揭露、CSV audit |
| 代表路徑基準 | 五組代表路徑的右側面板第 3 / 5 / 6 列值已固定為基準 |
| 效能證據 | LEO 60 + 10 s PASS；LEO 200 + 30 s PASS；LEO 200 + 10 s FAIL |
| 來源脈絡 | Station source、TLE source、SATCAT summary、CSV export 可交叉檢查 [1][2] |
| 比較畫面邊界 | 前後比較畫面仍在開發中，目前不可宣稱已完成比較驗證 |

---

# 資料可信度說明

報告時要清楚分辨：哪些來自公開來源、哪些是模型推導、哪些只是視覺輔助。

| 類型 | 可解讀方式 |
| --- | --- |
| Station card | 公開資料庫 + source links；座標可能是 exact 或 representative |
| Download CSV | 用來稽核資料來源與右側面板數值，不是實測 telemetry |
| Rain rate | 模型控制參數，不是實測天氣 |
| Satellite scene | 衛星身份與位置來自公開 TLE 推導 |
| 數值指標 | 除非明確標為 source-derived（直接由來源資料推導），否則是模型估算 |
| Moving packets / lanes / camera | 視覺輔助，不是真實 packet capture 或 traffic telemetry |
| 缺少必要來源 | 顯示 unavailable / pending（缺資料 / 待確認），不靜默補值 |

不宣稱：營運商實測 telemetry、實測 throughput / jitter / congestion、
private gateway schedules、live commercial routing、runtime Internet refresh、
或營運商已驗證的 station-to-station service。

---

# 參考資料 — 站點公開來源

| Ref | Source |
| --- | --- |
| [1] | Operator network pages：KSAT Global Ground Station Network `https://www.ksat.no/ground-network-services/the-ksat-global-ground-station-network/`；SES O3b mPOWER gateways `https://www.ses.com/press-release/sess-next-gen-ngso-system-readies-launch-8-initial-o3b-mpower-satellite-ground`；Intelsat teleport chart `https://www.intelsat.com/global-network/terrestrial-network/teleport-chart/`。 |
| [6] | GEO / LEO / MEO operator pages：Eutelsat GEO-LEO network `https://www.eutelsat.com/satellite-network/geo-leo-multi-orbit-satellite-network`；Telesat teleports `https://www.telesat.com/teleports/`；SES gateway update `https://www.ses.com/press-release/seventh-and-eighth-o3b-mpower-satellites-start-delivering-connectivity-services`。 |
| [7] | Teleport / facility profiles：World Teleport Association `https://www.worldteleport.org/`；USEI Vernon Valley `https://www.usei-teleport.com/vernon-valley/`；SANSA Space Operations `https://www.sansa.org.za/products-services2/spaceoperations/`；NRCan Inuvik Satellite Station Facility `https://natural-resources.canada.ca/science-data/science-research/research-centres/inuvik-satellite-station-facility`。 |

---

# 參考資料 — 站點補充來源

| Ref | Source |
| --- | --- |
| [8] | Public filings / facility records：FCC IBFS O3b Vernon TX filing `https://fcc.report/IBFS/SES-LIC-20130124-00089`；public address or facility listings are used only when operator pages omit exact coordinates。 |
| [9] | Public geospatial pages：Wikipedia / Wikidata station pages for Svalbard Satellite Station、Troll Satellite Station、Tromso Satellite Station、Awarua Tracking Station、Fuchsstadt Earth Station。 |
| [10] | Gateway press / news evidence：Orange Martinique `https://newsroom.orange.com/orange-and-eutelsat-inaugurate-the-new-eutelsat-gateway-in-martinique-a-key-enabler-of-connectivity-in-the-caribbean/`；Speedcast Cali `https://www.speedcast.com/newsroom/press-releases/2024/speedcast-inaugurates-new-teleport-facility-serving-as-latam-gateway-for-eutelsat-oneweb/`；SpaceNews Peru gateway `https://spacenews.com/38446satellite-telecom-o3b-networks-opens-gateway-station-in-peru/`。 |

---

# 參考資料 — 衛星、標準與地形

| Ref | Source |
| --- | --- |
| [2] | CelesTrak public GP / SATCAT：`https://celestrak.org/NORAD/elements/gp.php`；`https://celestrak.org/satcat/satcat.csv`；Terms `https://celestrak.org/terms-of-use.php`。 |
| [3] | 3GPP technical reports：TR 38.811 archive `https://www.3gpp.org/ftp/Specs/archive/38_series/38.811/`；TR 38.821 archive `https://www.3gpp.org/ftp/Specs/archive/38_series/38.821/`。 |
| [4] | ITU-R recommendations：P.618 / P.676 / P.838 / P.835 / P.837 / P.839 / P.840 / S.1528 / S.465 via `https://www.itu.int/rec/`；Terms `https://www.itu.int/en/about/Pages/terms-of-use.aspx`。 |
| [5] | Terrain / elevation：NASA / USGS SRTM 1 arc-second global DEM via `https://earthexplorer.usgs.gov/`；Open-Elevation `https://open-elevation.com/`。 |

---

# 附錄 — 工程驗證依據

這頁不是外部引用來源；它只說明本簡報中的系統設定、測試數字與畫面基準，
可以在專案內哪裡查到。

| 依據 | 用途 |
| --- | --- |
| `public/fixtures/ground-stations/multi-orbit-public-registry-sources.md` | 內部整理 per-station URL、source snippet、coordinate / capability evidence |
| `tle-first-fidelity-uplift.md` §7 / §11 / §12.1 | 待開發項目、風險、spike gates |
| `slice-0-baseline.md` §6.2 | 五組代表路徑的右側面板基準值 |
| `spike-S1-cap-cadence-perf.md` | LEO cap / cadence 的 p95 測試結果 |
| `runtime-projection-csv.ts` | Download CSV 欄位與稽核匯出格式 |
| `runtime-data-completeness.ts` | 來源脈絡、non-claim、缺資料狀態 |
