# Independent Audit — Phase 1: ITRI Requirement Inventory

> Authority: only `/home/u24/papers/itri/` raw sources count as ITRI requirement
> truth. Project-side reports (e.g. `itri-acceptance-report-2026-04-20/`) and any
> `docs/sdd/*-closeout/*-handoff/*-plan` are **out-of-scope** for this inventory.
>
> Sources used (allowed):
> - `itri/README.md` (ITRI requirement summary authored against original sources)
> - `itri/r1.docx` via `itri/mineru-pilot-2026-05-13/raw/r1/office/r1.md` and
>   `itri/markitdown-2026-04-13/r1.md`
> - `itri/kickoff.pptx` via `itri/mineru-pilot-2026-05-13/raw/kickoff/office/kickoff.md`
>   and `itri/markitdown-2026-04-13/kickoff.md`
> - `itri/multi-orbit/README.md` (research baseline orientation)
>
> Quote excerpts are ≤2 lines verbatim from those sources.

Audit date: 2026-05-15.
Auditor mode: read-only, no project-self-claims trusted, no `closeout/handoff/plan`
docs read.

ID prefixes:
- `F-*` Functional requirement (WP1 contract, r1.docx)
- `T-*` Technical scope (WP1, r1.docx + kickoff slide 5)
- `K-*` Kickoff explicit direction (kickoff.pptx slides 2/3/4/5/6)
- `D-*` Deliverable / milestone gate
- `V-*` Validation / DUT mode
- `E-*` Environment (OS)
- `P-*` Physical-layer / channel factor
- `N-*` Network / tunneling / NAT scenario
- `S-*` Stakeholder / external collaboration

---

## A. WP1 Contract Gates (`r1.docx`)

| ID | 需求描述 | 來源檔案:位置 | 驗收條件 |
| --- | --- | --- | --- |
| F-WP1-A | 成功匯入軌道模型 | mineru-pilot-2026-05-13/raw/r1/office/r1.md L30 | 軌道模型可被匯入並驅動衛星位置（與 F-01 / T-01 對應）；引文：「成功匯入軌道模型、可動態調整參數介面、可產生通訊時間流計、畫面穩定運行至少24小時。」 |
| F-WP1-B | 可動態調整參數介面 | mineru-pilot-2026-05-13/raw/r1/office/r1.md L30 | UI 提供動態參數調整能力；引文同上 |
| F-WP1-C | 可產生通訊時間統計（原文「通訊時間流計」） | mineru-pilot-2026-05-13/raw/r1/office/r1.md L30 | 系統能輸出通訊時間統計值/報表（與 F-05 報表匯出共用） |
| F-WP1-D | 畫面穩定運行至少 24 小時 | mineru-pilot-2026-05-13/raw/r1/office/r1.md L30 | 連續運行 ≥ 24h 不崩潰、不退化 |
| D-WP1-DATE | 2025/11/30 完成日期 | mineru-pilot-2026-05-13/raw/r1/office/r1.md L30 | A 項交付物在該日期前完成 |
| D-WP1-DOC | 交付項目：技術 WP1 評估分析報告一式 | mineru-pilot-2026-05-13/raw/r1/office/r1.md L30 | 交付一份 WP1 評估分析報告 |

---

## B. WP1 Technical Scope (`r1.docx` + kickoff slide 5)

| ID | 需求描述 | 來源檔案:位置 | 驗收條件 |
| --- | --- | --- | --- |
| T-01 | 衛星模型軌道資料整合 | mineru .../r1.md L18-22；kickoff.md L65 | 軌道資料來源被整合且驅動畫面 |
| T-02 | 視覺化呈現（如 Blender 工具或等效） | mineru .../r1.md L19；kickoff.md L66 | 具備一定質感之圖像化呈現，不僅數據面板 |
| T-03 | UI 互動介面 | r1.md L20；kickoff.md L67 | 提供可操作 UI |
| T-04 | 通訊換手規則模擬等參數設計 | r1.md L21；kickoff.md L68 | 提供 handover rule 參數設計/模擬 |
| T-05 | 通訊速率可視化設計 | r1.md L22；kickoff.md L69 | 通訊速率可被視覺化 |
| F-01 | 整合 ITRI 軌道模型（LEO/MEO/GEO 等），建立可互動式 3D 圖像化模擬系統 | r1.md L16；引文：「整合本單位所開發之軌道模型(如LEO/MEO/GEO等)，建立可互動式3D圖像化模擬系統」 | 多軌道型態被涵蓋；不能簡化為單一 LEO |
| F-02 | 支援 ≥ 500 LEO 模擬 | r1.md L24；kickoff.md L73 | 同時模擬 ≥ 500 LEO 顆衛星 |
| F-03 | 模擬速度可調 | r1.md L25；kickoff.md L74 | UI 可改變模擬速度 |
| F-04 | 即時顯示可通訊時間 | r1.md L26；kickoff.md L75 | 即時呈現「可通訊時間」資訊 |
| F-05 | 換手策略切換 | r1.md L27；kickoff.md L76 | 提供換手策略切換能力 |
| F-06 | 統計報表匯出 | r1.md L28；kickoff.md L77 | 報表能匯出 |

---

## C. Kickoff Architecture Slide (slide 2)

| ID | 需求描述 | 來源檔案:位置 | 驗收條件 |
| --- | --- | --- | --- |
| K-01 | 開發可於低軌、中軌、高軌衛星訊號之間切換之衛星模擬器 | kickoff.md L7；引文：「開發可於低軌，中軌，高軌衛星訊號之間切換之衛星模擬器。」 | 系統允許 LEO/MEO/GEO 訊號間切換 |
| K-02 | 根據當前鏈路品質（latency、jitter、network speed）等參數進行鏈路之切換 | kickoff.md L8；引文：「根据當前鏈路品質(latency，jitter，network speed)等參數進行鏈路之切換」 | 決策邏輯吃 latency/jitter/network-speed |
| K-03 | physical layer 模擬，考慮不同天線參數、雨天衰減等情境 | kickoff.md L9 | 系統涵蓋天線參數與雨衰情境 |
| K-04 | 輸入 TLE 資料，追蹤星系中衛星之行進 | kickoff.md L10 | TLE 驅動衛星位置可隨時間推進 |
| E-01 | Linux 為主要環境，Windows + WSL 為備案 | kickoff.md L11；引文：「目前以Linux環境為主，Windows + WSL為備案」 | Linux 主要支援，WSL 為備援情境 |

---

## D. Kickoff Windows Tunneling Scenario (slide 3)

| ID | 需求描述 | 來源檔案:位置 | 驗收條件 |
| --- | --- | --- | --- |
| N-01 | Windows Tunneling Scenario：WSL2 內 gs_a / gs_b、tun0=10.1.0.1/24、tun1=10.2.0.1/24、tun_bridge.py :9001 :9002 | kickoff.md L17-19；itri/README.md L391-403 | 系統需面向此驗測拓樸；ESTNeT real-traffic satellite bridge |
| N-02 | OMNeT++ / ESTNeT Simulation 跑於 Windows，與 WSL Linux 端橋接 | itri/README.md L398 | bridge 含 TunBridgeApp / SatRelayApp |
| N-03 | 拓樸端點：GS-A (Wuerzburg) / GS-B (Munich)，Satellite (GEO)，UHF radio 連結 | itri/README.md L399-403 | 具體 GEO 端點對情境 |
| N-04 | `ping 10.2.0.1 -> tun0 -> GS-A -> Satellite -> GS-B -> tun1` 流量路徑可走通 | itri/README.md L403 | end-to-end real traffic via tunnel |

---

## E. Kickoff NAT Routing Scenario (slide 4)

| ID | 需求描述 | 來源檔案:位置 | 驗收條件 |
| --- | --- | --- | --- |
| N-05 | 使用 INET 內部之 NAT routing 功能 | kickoff.md L25；引文：「使用INET內部之NAT routing 功能，架設兩個虛擬網路介面(veth0,veth1)，將內部模擬網路連通真實網路介面」 | INET NAT routing 為對外橋接基礎 |
| N-06 | 架設兩個虛擬網路介面 veth0=192.168.2.1, veth1=192.168.2.2 | kickoff.md L29-52 | 虛擬介面拓樸可被建立 |
| N-07 | Host machine eno1=140.96.29.40、實體介面虛擬 IP=140.96.29.100、Network Router=140.96.29.1 | kickoff.md L29-41 | 真實網路側對接被支援 |
| N-08 | ESTNeT Gateway=192.168.2.1，virtual cable 連 INET 模擬與真實網路 | kickoff.md L53-59 | ESTNeT gateway 對接 |
| V-01 | Ping / iPerf 流量測試於 NAT routing 拓樸中可用 | kickoff.md L43 | 用 ping / iPerf 驗測流量 |

---

## F. Kickoff UI Spec (slide 5)

slide 5 重複 T-01..T-05、F-02..F-06，但對 F-02..F-06 進行了關鍵補充：

| ID | 需求描述 | 來源檔案:位置 | 驗收條件 |
| --- | --- | --- | --- |
| F-02a | 支援 ≥ 500 LEO 模擬（舉例：Starlink、OneWeb） | kickoff.md L73；引文：「支援 $\geq$ 500 LEO模擬(Starlink, Oneweb…)」 | 需覆蓋多個 LEO constellation 模擬規模 |
| F-03a | 模擬速度可調（可在 real time 與預錄 TLE 情境中切換） | kickoff.md L74；引文：「模擬速度可調 (real time跟預錄TLE情境中切換)」 | 提供 real-time / pre-recorded TLE scenario 切換 |
| F-04a | 即時顯示可通訊時間（利用 iperf、ping 等功能測試） | kickoff.md L75；引文：「即時顯示可通訊時間(利用iperf，ping等功能測試)」 | 可通訊時間可被 iperf/ping 驗證 |
| F-07 | 展示雨衰情境所帶來之影響 | kickoff.md L78；引文：「展示雨衰情境所帶來之影響」 | UI 能呈現雨衰對通訊之影響 |

---

## G. Kickoff KPI Timeline (slide 6)

| ID | 需求描述 | 來源檔案:位置 | 驗收條件 |
| --- | --- | --- | --- |
| N-09 | 連接實體網路：利用 INET 內建之網路模擬器，將 ESTNeT 與外部網路連結（達成 baseline） | kickoff.md L82-84；引文：「利用INET內建之網路模擬器，將ESTNeT與外部網路連結(達成)」 | kickoff 時點此項已達成；後續工作建構其上 |
| P-01 | 整合 V 組模擬程式：天線參數 | kickoff.md L90-92 | V 組天線參數被整合 |
| P-02 | 整合 V 組模擬程式：雨衰 | kickoff.md L90-94 | V 組雨衰被整合 |
| P-03 | 整合 V 組模擬程式：ITU 規範 | kickoff.md L94 | 涉及 ITU 規範相關因素被整合 |
| K-05 | 鏈路切換：根據 jitter、latency、network speed 等參數，在高、低、中軌衛星之間切換 | kickoff.md L124-126；引文：「根據jitter, latency, network speed等參數，在高，低，中軌衛星之間切換」 | handover 決策由這三項驅動 |
| V-02 | 虛擬待測物：撰寫 testbench 測試程式 | kickoff.md L128；引文：「虛擬待測物 – 撰寫testbench測試程式」 | 提供 virtual DUT testbench |
| V-03 | 實體待測物：使用 NE-ONE Traffic generator 進行情境模擬 | kickoff.md L130；引文：「實體待測物 – 使用NE-ONE Traffic generator 進行情境模擬」 | 對接實體待測物與 traffic generator |
| D-02 | 製作展示 demo：預先錄製 scenario 或 real time 模擬 | kickoff.md L106-108 | 兩種 demo 模式都可被支援 |
| D-03 | 期末報告撰寫（9–12 月） | kickoff.md L110-118 | 期末報告產出 |
| D-04 | 視覺化 UI 開發：委託台北大學進行開發（3 月起 kickoff） | kickoff.md L120-122 | NTPU 為合作 UI 開發方 |
| D-05 | 整合 V 組模擬程式：5 月起 | kickoff.md L96 | 5 月起 V 組 input 整合啟動 |
| D-06 | 11/30：成功匯入軌道模型、可動態調整參數介面、可產生通訊時間流計、畫面穩定運行至少 24 小時 | kickoff.md L132 | 與 F-WP1-A..D + D-WP1-DATE 對齊 |
| S-01 | Stakeholder anchor：陳衡安 / 工業技術研究院 / 南分院 | kickoff.md L138-140 | kickoff 對接人 |

---

## H. Multi-Orbit Research Direction (`itri/multi-orbit/README.md`)

multi-orbit/ 不引入新的 ITRI 合約義務，但補充了 ITRI 軸線下對「LEO/MEO/GEO 多軌道
service handover 真實化」的研究方向；此區塊以 `[CLAIM-UNCERTAIN]` 標示，避免將
研究計畫誤升格為 ITRI 硬需求。

| ID | 需求描述 | 來源檔案:位置 | 驗收條件 |
| --- | --- | --- | --- |
| M-01 `[CLAIM-UNCERTAIN]` | multi-orbit service handover 在 scenario-globe-viewer 內被「真實化」 | multi-orbit/README.md L3-8 | 對應產品敘事需站得住公開證據（非僅展示視覺） |
| M-02 `[CLAIM-UNCERTAIN]` | LEO/MEO/GEO handover 情境的現實可行性核對 | multi-orbit/README.md L5 | endpoint / gateway / SNP / earth station 型別與位置資料有可驗證來源 |
| M-03 `[CLAIM-UNCERTAIN]` | 已收斂之第一情境：`OneWeb LEO <-> GEO` | multi-orbit/README.md L124-134 | 第一案以該情境為基準 |
| M-04 `[CLAIM-UNCERTAIN]` | 下一條產品敘事改為 ground-station endpoint pair；不走 aircraft / handset UE | multi-orbit/README.md L136-148 | runtime endpoint = 地面站對 |

---

## I. Reference / Visual Baseline

| ID | 需求描述 | 來源檔案:位置 | 驗收條件 |
| --- | --- | --- | --- |
| R-01 | `sat.png` 為既有模擬/視覺化輸出 baseline 截圖，不是最終美術目標 | itri/README.md L361-368 | 不能直接作為功能規格；屬參考層 |
| R-02 | `demo.png` 為 demo 示意圖 | itri/README.md L101 (Source Files list) | 屬參考層 |
| R-03 | kickoff slide 2 `image6.png`：端到端驗測環境圖 Terrestrial network -> Ground station -> Satellite Network models -> Ground station -> Testing Application | itri/README.md L348-353 | 顯示 operator/demo 取向多面板 UI 與端到端驗測語境 |

---

## J. Ambiguities (per `itri/README.md` §9)

ITRI source 內未鎖死的開放項目；不算硬合約，但任何宣稱「已完成」均不應以這類項目
作為遮蔽工具：

- LEO/MEO/GEO 是同時完整支援，或至少面向可擴充
- physical-layer 模擬精度等級
- ITU 規範哪一版 / 哪一層級
- V 組資料格式 / 接口
- testbench 的具體型態
- NE-ONE Traffic generator 整合深度
- real-time vs 預錄 scenario 切換方式
- 圖像化系統最終視覺密度與操作層級

來源：`itri/README.md` L626-637。

---

## Phase 1 Summary

抽取需求總數：**55** 條 ID（含 4 條 `[CLAIM-UNCERTAIN]` multi-orbit 研究方向與
3 條參考圖層）。分區計數：

- §A WP1 contract gates: 6
- §B WP1 技術範疇 + 功能需求: 11
- §C Kickoff slide 2 + E-01: 5
- §D Windows Tunneling: 4
- §E NAT Routing: 5
- §F Kickoff UI Spec slide 5 補述: 4
- §G KPI 時程 / V 組 / DUT: 13
- §H Multi-orbit (`[CLAIM-UNCERTAIN]`): 4
- §I 參考圖層: 3

進入 Phase 2 獨立稽核。
