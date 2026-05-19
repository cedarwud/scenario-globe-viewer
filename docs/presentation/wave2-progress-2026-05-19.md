# Selected-pair TLE-first fidelity uplift — wave 2 進度報告

日期：2026-05-19  
Task 1 後的 HEAD：`cf4e353`  
對象：已熟悉 selected-pair route 的技術 reviewer。

Deck 結構：前段是問題紀錄，接著是整併後的 provenance 摘要與 15 個
required sections。所有數字 claim 都要能追到 commit、SDD section、
spike report row，或本地 code path。

---

# 問題紀錄 — Q1

問題：首頁的 ground-station 圓點有用顏色或大小編碼嗎，還是全部一樣？

回答：不是全部一樣；畫面上主要看成兩種 dot groups，但底層 capability
classification 是三種。來源：`station-markers.ts` + `station-compatibility.ts`。

| 分類 | 一般圓點 | Highlight / selected | 意義 |
| --- | --- | --- | --- |
| `tri-capable` | green，radius 5.5 px；目前少數群組會有 pink outline | green，radius 8 px，yellow outline | 至少能和某個 pair 共享 3 種 handover orbits |
| `dual-only` | blue，radius 4.5 px，dark outline | blue，radius 6.5 px，yellow outline | 可形成 compatible pairs，但最多共享 2 種 handover orbits |
| `none` | 目前沿用 blue dual-style dot | blue selected style | 沒有 compatible pair |

目前 registry capability count：21 tri-capable、47 dual-only、1 none。邊界：
這只表示 handover-capability 與 hover/selection 狀態；Source tier 仍放在 chips、
station info card、以及 V4 panel。

---

# 問題紀錄 — Q2

問題：filters 有哪些項目？`band` 是指頻段嗎？

回答：是，Band 指 RF frequency band。來源：`station-list-picker.ts`、
`marker-filter-chips.ts`、`marker-region-chips.ts`、`marker-band-chips.ts`。

| Filter group | UI items | 用途 |
| --- | --- | --- |
| Orbit | LEO、MEO、GEO | 篩選 station disclosed supported orbit classes |
| Handover | 2-orbit、3-orbit | 篩選 pair compatibility 的 handover orbit count |
| Region | Africa、Asia、Europe、N. America、Oceania、Antarctic、Arctic、S. America | 依 registry region 篩選 |
| Band | Ka、Ku、C、X、S、L | 依 disclosed supported RF bands 篩選 |

解讀邊界：Orbit / Band / Region 是 station registry metadata filter；Handover
是相容 pair 的篩選。它們不等於 live service proof，也不代表 operator-validated
routing。

---

# 問題紀錄 — Q3

問題：station 的命名規則是什麼？為什麼不是用國家命名？

回答：station identity 採 site/operator-first，不採 country-first。來源：
`multi-orbit-public-registry.json`、`station-list-picker.ts`、
`station-info-card.ts`。

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

# 問題紀錄 — Q4

問題：單點 station 後顯示哪些欄位？資料從哪裡來？都是真實的嗎？

回答：info card 呈現 registry fields。來源：`station-info-card.ts`、
`multi-orbit-public-registry.json`、`multi-orbit-public-registry-sources.md`。

| Card 欄位群組 | 真實性邊界 |
| --- | --- |
| name、operator、family、country、region | public registry，並有 source URL |
| coordinates | public registry；依 disclosure precision 可能是 exact 或 representative |
| supported orbits / bands | public-disclosure capability，不是 live service proof |
| use case / notes | public disclosure summary |
| elevation | SRTM/Open-Elevation cache，F6 prep 加入 |
| terrain mask | 預設 `0`，等待 per-station terrain audit |

Non-claim：card 不驗證 commercial routing，也不證明兩個站點之間存在 private
service。

---

# 問題紀錄 — Q5

問題：選兩個 stations 後，衛星、軌跡、傳輸、packet-like 視覺，哪些是真實、
open-source-derived、或 simulated？

| Surface | 邊界 |
| --- | --- |
| LEO/MEO/GEO identity + sampled positions | 由本地或 refreshed CelesTrak snapshots 的 TLE 推導 |
| constellation labels | CelesTrak SATCAT summary |
| station endpoints | public registry + disclosure precision |
| satellite tracks / visibility windows | TLE propagation + station geometry |
| comm time | propagated visibility 的 pair-window intersection |
| handover choice、throughput、jitter、latency、rain impact | modeled；不是 measured telemetry |
| moving packet / link-flow pulses、camera、lanes、labels | display-only visual grammar |

仍缺 anchors：EIRP / bandwidth / system temperature、完整 atmospheric grids，
以及 F9 comparison evidence。

---

# 問題紀錄 — Q6

問題：selected-pair 的 Download CSV 要怎麼解讀？它是真實資料嗎？

回答：它是 runtime projection 的 audit export，不是 measured service
telemetry。來源：`runtime-projection-csv.ts`。

| CSV section | 解讀方式 |
| --- | --- |
| Runtime projection / station precision | public registry identity、precision、source-tier context |
| TLE source manifest / actor provenance | public TLE inventory、parse health、cap、propagated sample metadata |
| Visibility windows / provenance | 由 TLE samples 推導的 geometry-derived pair visibility |
| Communication stats | visibility windows 的 derived summary，不是真實 traffic logs |
| Link selection events | modeled policy events 與 reason codes |
| Modeled outputs | 帶 model id、standards refs、input summary、non-claim 的估算 |
| Display transforms | renderer choices only |

用途：稽核 provenance 並重現 panel values；不要把它讀成 packet capture、
operator telemetry、或 commercial routing evidence。

---

# 問題紀錄 — Q7

問題：Rain rate 會影響什麼？右側 panel 要怎麼讀？真實性如何？

回答：Row 2 Rain rate 是 model input，不是 weather telemetry。來源：
`v4-projection-side-panel.ts`、`runtime-projection.ts`、
`runtime-data-completeness.ts`。

| Panel 區塊 | 解讀方式 |
| --- | --- |
| Row 1 tier/window | pair identity、source tier、projection time window |
| Row 2 Rain rate | modeled P.618 rain fade 的 mm/h 控制 |
| Row 3 stats | policy selection 後的 derived comm time 與 handover count |
| Row 4 summaries | 由 TLE geometry + policy 得到的下一批 visibility / link-selection events |
| Row 5 d1 | clear-sky vs rain 的 throughput/jitter/comm-time estimates |
| Row 5 d2/d3 | full windows、CSV、sources、non-claims、policy refs |
| Row 6 footer | station precision 與 pair source tier |

真實性邊界：stations 與 TLE identities 是 public/source-derived；windows 是
geometry-derived；stats 與 handover 是 model outputs；packets、lanes、camera
是 display-only。Rain rate 會影響 rain attenuation、throughput/jitter；當 fade
改變 candidate ranking 時，也會影響 policy-selected comm/handover results。

---

# 問題紀錄 — Q8

問題：selected-pair TLE-first 的 truth/data surfaces 還有沒有漏寫在 deck？

回答：主要 truth boundary 已覆蓋，但下列低階 audit signals 原本講得不夠明確。
來源：`runtime-data-completeness.ts`、`runtime-projection-csv.ts`、
`verify-tle-first-data-completeness.mjs`。

| Audit signal | reviewer 可以在哪裡找到 |
| --- | --- |
| route mode | panel dataset、debug payload、CSV `Data completeness` |
| empty reason / no fake actor | debug payload + CSV `emptyReasonCode`、`fakeActorCount=0` |
| TLE source health | source manifest / freshness state、TLE chip counts |
| parser、cap、exclusion stats | TLE chip + CSV source manifest |
| actor provenance | CSV/debug：source id、sample count、cadence、UTC range |
| visibility provenance | station A/B window source、pair-intersection source |
| display transforms | CSV 將 camera、lane、mesh、label choices 標為 display-only |

報告 framing：這些不是新的 claim，而是 audit handles，避免 reviewer 把 local
snapshots、empty states、或 renderer transforms 誤讀成 measured service evidence。

---

# 問題紀錄 — Q9

問題：為什麼 deck 感覺內容偏少？TLE-first / selected-pair 的 truth-data
細節有寫進去嗎？

回答：coverage 有，但刻意壓縮。Deck 沒有把完整 CSV/debug schema 整包貼進
slides，而是依 reviewer question 分類。

| Area | 目前 deck coverage |
| --- | --- |
| Station truth | Q3-Q4：naming、registry fields、precision、source links |
| Pair runtime truth | Q5-Q7：TLE-derived、geometry-derived、modeled、display-only |
| CSV/debug audit | Q6 + Q8：source manifest、actor/visibility provenance、empty reason |
| Rain/model boundary | Q7 + Disclosure Boundary |
| Data-completeness risks | Pending Work + Recommended Dispatches |

如果需要更完整的版本，應該把 Q6/Q8 展開成 appendix slides，而不是增加生成插圖：
station precision、TLE source health、actor provenance、visibility provenance、
modeled outputs、display-only transforms 各一張。主線保持精簡。

---

# Wave-2 範圍

Master SDD：`docs/sdd/multi-station-selector/tle-first-fidelity-uplift.md`。
Source anchors：SDD §7、§11、§12.1；42-gap roll-up 在 SDD §14。

Wave 2 拆成：

| 輸入 | 交付形態 |
| --- | --- |
| 42 audit gaps | Slices F1-F8 |
| 8 visual-evidence gaps | Slice F9 |
| Data/legal/perf unknowns | Spikes S1、S2a、S2b、S3 |

`cf4e353` 狀態：F1、F7、F6 prep、S1、slice-0 baseline、以及 Task-1 framing
regression fix 已落地。F2/F3/F4/F5 仍受 S2a/S2b/S3 gate。

---

# 架構契約

來源：SDD §4.1 + §5.1。

| RF term | 真實性邊界 |
| --- | --- |
| `tx-eirp` | modeled，或等待 S2a 而 unavailable |
| `free-space-path-loss` | TR 38.811 §6.6.2 |
| `gas-absorption` | P.676-13 Annex 2 |
| `atmospheric-composite` | P.618-14 §2.4 eq. 65 |
| `rx-antenna-gain` | S.465-6 within range |

公式：

```text
P_rx = EIRP - FSPL - A_gas
     - sqrt((A_rain + A_cloud)^2 + A_scint^2)
     + G_rx
```

Null rule：任何 term 是 null，就強制 `receivedPowerProxyDbm = null`；禁止 partial sums。

---

# 已落地項目

![Current selected-pair route](wave2-progress-2026-05-19-assets/current-selected-pair-overview.png)

Screenshot captured after `cf4e353`。

- ✓ SDD v3 + F9 visual layer：`7c44d60`
- ✓ F1 data shape：`db018a6`
- ✓ F7 live TLE + manifest + SATCAT summary：`c6d731d`
- ✓ F6 prep registry fields：`39733a7`
- ✓ slice-0 §6.2 baseline：`ecbe41c`
- ✓ S1 perf spike + SDD closure：`83ed47d`、`714ddec`
- ✓ AsiaSat Tai Po ↔ CHT Fangshan camera fix：`cf4e353`

---

# F1 重點

來源：SDD §7 F1、commit `db018a6`、D6 smoke。

- 關閉 12 個 gaps。
- 新增 `visibility-cadence-multi.ts` wrapper。
- Per-output `inputSummary`、NORAD + COSPAR exposure、max-epoch freshness。
- Dynamic display transforms 會回填 live camera hint。

Before / after shape：

```ts
// before
displayTransforms: ["altitude", "camera", "labels"]

// after
displayTransforms: [{
  sourceId: "selected-pair-scene-camera-framing",
  inputSummary: { pairGeometry, suggestedAltitudeKm,
                  suggestedHeadingDeg, suggestedPitchDeg }
}]
```

---

# F7 重點

來源：SDD §7 F7、commit `c6d731d`。

- `scripts/refresh-tle.mjs` 下載 CelesTrak GP snapshots 給 LEO/MEO/GEO。
- `manifest.json` 選定一種 explicit mode：
  `local-snapshot`、`network-snapshot`、或 `fallback-local-snapshot`。
- `scripts/refresh-satcat.mjs` 依 SDD §7 F7，把 SATCAT 從約 5 MB CSV
  reduction 成約 250 KB summary。
- 保留的 SATCAT fields：NORAD id、object name、operator family、constellation、orbit class、decay date。
- Attribution 會顯示在 TLE chip 與 Row 5 source disclosure。

不引入 runtime hot-path network fetch。

---

# F6 Prep 重點

來源：SDD §7 F6、commit `39733a7`。

Registry 現在為全部 69 個 stations 帶有 station precision fields：

| Field | 意義 |
| --- | --- |
| `elevationM` | DEM-derived station height |
| `terrainMaskDeg` | single-value horizon mask，預設 `0` |

Build-time support：

- `scripts/refresh-station-elevation.mjs`
- `public/fixtures/ground-stations/station-elevations-cache.json`

Runtime wiring 仍待做：visibility altitude、rain station height、Row 6 precision
disclosure、以及 D6 assertions 都屬於 F6 wiring。

---

# Slice-0 §6.2 Baseline

來源：`slice-0-baseline.md` §6.2、commit `ecbe41c`。

五個 walkthrough URLs 已在 commit `7c44d60` frozen。

Baseline 擷取內容：

| Surface | frozen values |
| --- | --- |
| Row 3 | comm time、handover count、dwell |
| Row 4 | event count + first 3 events |
| Row 5 d1 | per-orbit throughput Mbps |
| Row 6 | precision label + source tier |
| TLE health | LEO/MEO/GEO health |
| sourceMode | route source mode |

用途：提供 F9 §49 comparison view 的 immutable before pane；它只是未來
comparison pane 的 frozen baseline。

---

# S1 Spike 結論

來源：`docs/spike/multi-station-selector/spike-S1-cap-cadence-perf.md`、
commit `83ed47d`、SDD closure `714ddec`。

| 設定 | 結果 |
| --- | ---: |
| C1：LEO 60 + 10 s | p95 795.3 ms PASS |
| C4：LEO 200 + 30 s | p95 391.2 ms PASS |
| C5：LEO 200 + 10 s | p95 1027.3 ms FAIL |

Flame profile：

- `computeVisibilityWindowsForStation`：86.2% inclusive。
- SGP4：38.1% self-cost。

決策：F1 LEO 10 s at cap 60 已授權；F8 LEO 200 at 30 s 已授權；
combined LEO 200 + 10 s 等待 §11 follow-up smoke。

---

# Task-1 Regression 註記

來源：Task 1 commit `cf4e353` message + before/after screenshots。

| Before | After |
| --- | --- |
| ![](wave2-progress-2026-05-19-assets/asiasat-fangshan-before.png) | ![](wave2-progress-2026-05-19-assets/asiasat-fangshan-after.png) |

Root cause：selected-pair camera framing 對 non-polar pairs 套用了固定 66°
latitude offset，並對 regional geometry 使用 edge-on pitch。

Fix：non-polar pairs 改用 pair midpoint framing，short/long baselines 使用
near-overhead pitch。五個 walkthrough visibility counts 維持
`26/0/15/42/9`。這裡不包含 Task-2 camera/view work。

---

# 目前視覺證據

來源：slice-0 §6.2 values frozen at `7c44d60`；screenshots 在 `cf4e353`
重新擷取。F6 prep data 已存在；Row 6 elevation wiring 仍待做。

| URL | Row 3 | Row 5 d1 Mbps | Row 6 tier | Shot |
| --- | --- | --- | --- | --- |
| Svalbard/Tromso | 360m, 1 | LEO 198.932; MEO 99.712; GEO 48.841 | public | [1](wave2-progress-2026-05-19-assets/walkthrough-1-svalbard-tromso.png) |
| Svalbard/Trollsat | 0s, 0 | N/A | public | [2](wave2-progress-2026-05-19-assets/walkthrough-2-svalbard-trollsat.png) |
| Fuchsstadt/Atlanta | 360m, 2 | MEO 99.712; GEO 48.841 | public | [3](wave2-progress-2026-05-19-assets/walkthrough-3-fuchsstadt-atlanta.png) |
| Bukit/Cyberjaya | 360m, 0 | LEO 198.932; GEO 48.841 | geometric | [4](wave2-progress-2026-05-19-assets/walkthrough-4-bukit-cyberjaya.png) |
| Yangmingshan/Hartebeesthoek | 360m, 2 | LEO 198.932; MEO 99.712; GEO 48.841 | geometric | [5](wave2-progress-2026-05-19-assets/walkthrough-5-yangmingshan-hartebeesthoek.png) |

目前 user-facing surfaces：Row 5 disclosure、chrome chips、Row 6 footer。
F9 visual primitives 會逐步落地；F9 §49 comparison 還是 forthcoming，
不是目前的 comparative evidence。

---

# 待辦工作

| 項目 | 相依條件 |
| --- | --- |
| F6 wiring | prep fields 已落地；runtime read paths 待做 |
| F8 partial | S1 授權 cap 200 at 30 s；policy selector 待做 |
| F9 partial | F45/F50/F49 已被 F7 + slice-0 解鎖 |
| F2 | 先做 S2a anchor，再做 S2b retune |
| F3/F4 | S3 legal decision on grid bundling |
| F5 | S2a bandwidth/EIRP/T_sys anchors |

S1 已關閉。S2a/S2b/S3 是剩餘的 spike bottlenecks。

---

# 建議下一批工作

1. F6 wiring：在 visibility、rain station height、Row 6、D6 中消費 `elevationM` / `terrainMaskDeg`。
2. F8 partial：交付 LEO 200 cap at 30 s、cap disclosure、policy URL selector、alias canonicalisation。
3. F9 partial：落地 F45 TLE chip color、F50 active badge、F49 pre/post comparison shell。

主要 bottleneck：S3 legal decision gate F3 + F4，也 gate F2/F5 使用的任何
3GPP/ITU table extraction path。

在 F9 §49 實作並量測完成前，comparison language 一律保持 forward-looking。

---

# 揭露邊界

已與 Q4/Q5 整併：詳細 provenance 已放在前段；這張是 reviewer 應採用的
rule-of-thumb。

| Claim type | 允許解讀方式 |
| --- | --- |
| Station card | public registry + source links；coordinates 可能是 exact 或 representative |
| Download CSV | provenance 與 panel-value audit 的 projection export，不是 telemetry |
| Rain rate | fade model control，不是 measured weather |
| Satellite scene | runtime data 存在時，identity/position 是 TLE-derived |
| Metrics | 除非明確標為 source-derived，否則是 modeled estimates |
| Moving packets / lanes / camera | display-only；不是 packet capture 或 traffic telemetry |
| Missing anchors | 顯示為 unavailable 或 pending，不會靜默補值 |

不宣稱：measured operator telemetry、measured throughput / jitter / congestion、
private gateway schedules、live commercial routing、runtime Internet refresh、
或 operator-validated station-to-station service。

---

# 參考資料

- Master SDD：`docs/sdd/multi-station-selector/tle-first-fidelity-uplift.md` §3、§4.1、§5.1、§7、§11、§12。
- 3D pipeline SDD：`docs/sdd/multi-station-selector/tle-first-3d-pipeline.md` §5-§6。
- IA SDD：`docs/sdd/multi-station-selector/information-architecture.md` §4.2、§4.5、§5。
- Data-completeness SDD：`docs/sdd/multi-station-selector/tle-first-data-completeness.md`。
- Runtime data contract：`docs/sdd/multi-station-selector/runtime-data-contract.md`。
- Slice-0 baseline：`docs/sdd/multi-station-selector/slice-0-baseline.md` §6.2。
- S1 report：`docs/spike/multi-station-selector/spike-S1-cap-cadence-perf.md`。
- Registry source notes：`public/fixtures/ground-stations/multi-orbit-public-registry-sources.md`。
- Standards：3GPP TR 38.811 / 38.821；ITU-R P.618 / P.676 / P.838 / S.1528 / S.465。
- CelesTrak Terms of Use：`https://celestrak.org/terms-of-use.php`；refresh tools：`scripts/refresh-tle.mjs`、`scripts/refresh-satcat.mjs`。
