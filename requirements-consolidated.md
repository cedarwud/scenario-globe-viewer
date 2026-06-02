requirements-consolidated.md

# Requirement 需求清單 — 去重整合版

**狀態日期**: 2026-05-17
**Authority**: 本文件為 `r1.docx` + `kickoff.pptx` 去重整合後的 canonical 需求清單，加上 user 口頭追加項目，為日後所有 agent / 工程人員的 single source of truth。

## 適用範圍

- 本文件取代直接讀 `r1.docx` + `kickoff.pptx` 的需求引用。引用時直接用本文件 ID (例如 R1-F1、K-A4、V-MO1)。
- 若原始檔字面有疑問，回看 `markitdown-2026-04-13/*.md` 或 `mineru-pilot-2026-05-13/raw/.../*.md` 轉檔結果，不要直接讀 `docx` / `pptx`。
- 本文件不取代 `requirement-acceptance-report-2026-04-20/` 的驗收狀態追蹤；後者仍是驗收進度的權威。
- 本文件不取代 `README.md` 的長篇解讀；本文件是去重表格化的摘要，`README.md` 仍是 narrative authority。

## 三類分桶 (Bucket)

依 demo / 驗收相關性遞減排序:

- **A** = 本專案主軸 (Cesium UI 要做完才能 demo)。
- **B** = 需要 Requirement 提供 operator data 才能達 Tier A 權威的項目;本專案已實作 Tier B 公開來源替代方案。
- **C** = Requirement 既有 infra / 報告層交付,**非本專案 UI scope** — 列出僅為需求清單完整性。

### A. 需要本專案 (scenario-globe-viewer / Cesium UI) 完成的部份

#### A.1 From r1.docx + kickoff.pptx (origin: 文件)

| ID | 來源 | 需求 | 完成度 |
|---|---|---|---|
| R1-T1 / K-A1 | r1 + slide 2 | 整合 Requirement 軌道模型 LEO/MEO/GEO + 多軌道訊號切換 | done — 視覺化完成;多軌道切換邏輯已接線 (link-budget → runtime-projection，2026-05-17)。連續 LIVE 跨軌切換之細化見 V-MO1 |
| R1-T2 / K-D1 | r1 + slide 5 | 衛星模型軌道資料整合 | done |
| R1-T3 / K-D2 | r1 + slide 5 | 視覺化呈現 (Blender 工具或等效) | done (Cesium 為等效方案) |
| R1-T4 / K-D3 | r1 + slide 5 | UI 互動介面 | done |
| R1-T5 / K-D4 | r1 + slide 5 | 通訊換手規則模擬等參數設計 | done — `handover-policy.ts` 三政策 + 可調參數 (2026-05-17) |
| R1-T6 / K-D5 | r1 + slide 5 | 通訊速率可視化設計 | done — `link-budget/` 五模組接線進 runtime-projection (2026-05-17) |
| R1-F1 / K-E1 | r1 + slide 5 | 支援 ≥ 500 LEO 模擬 (Starlink、OneWeb) | done — 本地 TLE ~11015 sats (Starlink + OneWeb 2026-05-16) |
| R1-F2 / K-E2 | r1 + slide 5 | 模擬速度可調 (real time vs 預錄 TLE 情境切換) | done — Operator HUD 三 bounded preset (30x / 60x / 120x，`src/runtime/m8a-v4-product-ux-model.ts:60-62`);real-time / prerecorded 視窗切換完成 |
| R1-F3 / K-E3 | r1 + slide 5 | 即時顯示可通訊時間 (利用 iperf、ping 等功能測試) | SGP4 + elevation 已實作；iperf / ping 集成未做 |
| R1-F4 / K-E4 / K-F4 | r1 + slide 5/6 | 換手策略切換 (依 latency / jitter / network speed 在高/中/低軌間切換) | done — link-budget metric 餵入 handover 引擎 (2026-05-17) |
| R1-F5 / K-E5 | r1 + slide 5 | 統計報表匯出 | done — V4 side panel CSV 匯出 (RFC-4180，2026-05-17) |
| K-A4 | slide 2 | 輸入 TLE 資料並追蹤衛星行進 | done |
| K-E6 | slide 5 | 展示雨衰情境所帶來之影響 | done — `rain-attenuation.ts` + V4 雨衰滑桿 UI (2026-05-17) |
| K-F7 | slide 6 | 製作展示 demo (預錄 scenario 或 real time 模擬) | done (V4 demo route) |
| R1-D1 | r1 交付表 | 11/30 成功匯入軌道模型 | done |
| R1-D2 | r1 交付表 | 11/30 可動態調整參數介面 | done |
| R1-D3 | r1 交付表 | 11/30 可產生通訊時間統計 | done — 通訊時間統計顯示 + CSV 匯出 (2026-05-17) |
| R1-D4 | r1 交付表 | 11/30 畫面穩定運行至少 24 小時 | done — soak 通過 2026-05-15 (`scenario-globe-viewer/output/soak/2026-05-15T05-42-07-506Z-phase7-0-full/summary.json` passed=true, durationMs=86400000, sampleCount=1289) |

A.1 合計：**18 條** (文件來源)。

#### A.2 口頭追加 (origin: user 口頭，非 r1.docx / kickoff.pptx 原文)

| ID | 來源 | 需求 | 完成度 | 與文件需求的關係 |
|---|---|---|---|---|
| V-MO1 | user 口頭追加，後續展開資料在 `multi-orbit/` | 跨軌道 handover demo 必須是真實 LIVE handover (單一服務連續從 LEO → MEO → GEO 切換)，不是 orbit-type scenario picker | done — `handover-policy.ts` cross-orbit-live 政策已實作 + runtime-projection 預設且僅使用此政策 (2026-05-17 砍除 opt-in 旗標);V4 side panel handover events 由此政策產生 | 細化 K-A1 「可於低/中/高軌切換」；K-A1 未明示是 live handover，V-MO1 為 user 補強的解釋 |

A.2 合計：**1 條** (口頭追加)。

### B. 需 Requirement 提供 operator data 才能達 Tier A 權威 (Tier B 替代已實作)

本桶為**本專案的 Tier B 替代工作** — 每條已於本專案以公開標準自寫實作;Requirement 交付 operator data 時 swap B → A (Tier A)。

| ID | 來源 | 內容 | 替代方案 (Tier B) |
|---|---|---|---|
| K-A2 | slide 2 | 鏈路品質規則 (latency / jitter / network speed 切換 policy) | 3GPP TR 38.811 §6.7 + TR 38.821 §7.3 self-implement — Tier B 替代**已實作** (`runtime-projection.ts` latency + `handover-policy.ts`，2026-05-17)；待 Requirement operator data swap → Tier A |
| K-A3-a | slide 2 | 天線參數 (peak gain、beamwidth、pattern) | ITU-R S.1528 (LEO/non-GSO) + S.465 (Earth station) self-implement — Tier B 替代**已實作為 standalone module** `src/runtime/link-budget/antenna-pattern.ts` (2026-05-17,exports `computeSatelliteAntennaGainDb` + `computeEarthStationAntennaGainDb`)；目前 V4 runtime-projection 視覺路徑**尚未**接線 (only FSPL + gas + rain de-rate downlink throughput);bootstrap-physical-input-seeds 仍用既有 `itu-r-f699-antenna-pattern.ts`。新模組可由直接呼叫或未來接線 demo;待 Requirement operator data swap → Tier A |
| K-A3-b | slide 2 | 雨天衰減模型 | ITU-R P.618-14 §2.2.1 + P.676-13 self-implement — Tier B 替代**已實作** (`rain-attenuation.ts` + `gas-absorption.ts`，2026-05-17)；待 Requirement operator data swap → Tier A |
| K-F2 | slide 6 | 整合 V 組模擬程式 (天線 + 雨衰 + ITU 規範) | 自寫 ITU calculator wrapping P.618 / P.676 / S.1528 / S.465 — Tier B 替代**已實作** (`src/runtime/link-budget/` 五模組，2026-05-17:FSPL + 雨衰 + 氣衰 + handover-policy 已接線進 runtime-projection,antenna-pattern 為 standalone 尚未接線進視覺路徑);待 Requirement V 組程式 swap → Tier A |
| (irreducible-1) | — | Requirement ESTNeT packet trace (真實 latency / jitter time series) | synthetic baseline from TR 38.811 §6.7 generic model；truth-boundary tag `"Requirement ESTNeT trace pending"` |
| (irreducible-2) | — | Requirement 驗收測試 scenario 腳本 (哪個 case 該 pass、閾值多少) | 5 候選 demo URL 已列於 `scenario-globe-viewer/docs/requirement-requirement-walkthrough.md` §3 (high/low elevation × rain/clear × handover/no-handover 代表性子集,2026-05-17);閾值仍待 Requirement acceptance script swap |
| (irreducible-3) | — | 台灣本地降雨統計校正常數 (Pingtung / Hsinchu R0.01 實測) | ITU-R P.837 global default；truth-boundary tag `"P.837 global default — local calibration pending"` |

B 合計：**7 條** (其中 4 條已實作完整 Tier B 替代,3 條 irreducible 已有合理 substitute)。

### C. Requirement 既有 infra / 報告層 (非本專案 UI scope)

不在本專案 UI scope，不需 UI 視覺化複刻;本表列出為求需求清單完整性。

| ID | 來源 | 內容 | Requirement 狀態 |
|---|---|---|---|
| K-F1 | slide 6 KPI 時程 | 連接實體網路 — 利用 INET 內建模擬器將 ESTNeT 與外部網路連結 | 達成 (per kickoff 標記) |
| K-A5 | slide 2 | Linux 主環境 + Windows + WSL 備案 | Requirement 既有 infra |
| K-B1 | slide 3 | Windows Tunneling Scenario / ESTNeT Real-Traffic Satellite Bridge (`ping 10.2.0.1 → tun0 → GS-A → Satellite → GS-B → tun1`) | Requirement 既有拓樸示意，非 UI 規格 |
| K-C1 | slide 4 | INET NAT routing + veth0 (192.168.2.1) / veth1 (192.168.2.2) + 模擬-真實網路橋接 | Requirement 既有 |
| K-F5 | slide 6 | 虛擬待測物 — 撰寫 testbench 測試程式 | Requirement scope (非 UI) |
| K-F6 | slide 6 | 實體待測物 — NE-ONE Traffic Generator 情境模擬 | Requirement scope (非 UI) |
| K-F8 | slide 6 | 期末報告撰寫 | 本專案撰寫 (報告層，非 UI 模組)；與 R1-D5 部分重疊但屬於不同階段 |
| R1-D5 | r1 交付表 | 技術 WP1 評估分析報告一式 | 本專案撰寫 (報告層) |

C 合計：**8 條** (其中 R1-D5 + K-F8 為本專案文書層交付，其他 6 條為 Requirement infra)。

## 累計

| Bucket | 數量 | 說明 |
|---|---|---|
| A.1 文件來源 | 18 | r1.docx + kickoff.pptx 去重後 |
| A.2 口頭追加 | 1 | V-MO1 cross-orbit live handover (multi-orbit/) |
| B 需 Requirement 資料 / Tier B 替代已實作 | 7 | 含 3 條 irreducible substitute |
| C Requirement 已完成 / infra | 8 | 含 R1-D5 + K-F8 報告層 |
| **合計** | **34** | |

**本專案主軸 = Bucket A 共 19 條** (18 文件 + 1 口頭)。Bucket B 為本專案 Tier B 替代工作 (依賴 Requirement operator data 升等 → Tier A);Bucket C 屬 Requirement scope。

## Source authority tier 註解

- **Tier A operator-validated**：Requirement 自家 retained data；目前 0 條已交付，Bucket B 全部 7 條 (K-A2 / K-A3-a / K-A3-b / K-F2 + 3 條 irreducible) 待 V 組 / 驗收工程師後續 swap。
- **Tier B public-disclosed**：3GPP TR 38.811 / 38.821 + ITU-R P.618-14 / P.676-13 / S.1528 / S.465 等公開標準；`scenario-globe-viewer` 專案本地已有完整 PDF + 轉檔 md (`paper-catalog/3gpp/` + `paper-catalog/markitdown-3gpp-pilot/markdown/`)，且已於 `src/runtime/link-budget/` 自寫實作。
- **Tier C geometric-derived**：SGP4 + 本地 TLE (`/home/u24/papers/project/tle_data/`) 自算。

## 引用規則

- 引用需求時用 ID (例: `R1-F1`、`K-A4`、`V-MO1`)。
- 引用標準時附章節 (例: `ITU-R P.618-14 §2.2.1.1`、`TR 38.811 §6.7`)。
- 不要再回頭引 `r1.docx` / `kickoff.pptx` 原檔；除非追溯版本爭議才使用 markitdown / mineru-pilot 轉檔對照。

## 變更歷史

- **2026-05-17**：從 `r1.docx` + `kickoff.pptx` 去重整理初版；加入 V-MO1 (口頭追加跨軌道 live handover)；加入 Bucket B/C 分類；標註 Requirement infra 已完成項目與 irreducibly-only 項目。
- **2026-05-17 (compute layer 落地後)**：更新完成度 — A 桶 R1-T1、R1-T5、R1-T6、R1-F4、R1-F5、K-E6、R1-D3 改為 done (link-budget 五模組 + runtime-projection 接線 + 雨衰 UI + CSV 匯出已 commit)；V-MO1 更新為「cross-orbit-live 政策已實作、demo UI toggle 待補」；K-A2、K-A3-a、K-A3-b、K-F2 註記 Tier B 替代已實作。
- **2026-05-17 (B/C relabel)**：重排桶順序為 demo 相關性遞減 — 新 **B = 舊 C** (7 條,需 Requirement 資料但 Tier B 替代已實作,屬本專案交付);新 **C = 舊 B** (8 條,Requirement 既有 infra / 報告層,非本專案 UI scope)。A 不變,所有 ID 與計數本質未變,只字母互換 + 排序更動以反映 demo 優先序 (本專案交付物在前,Requirement 既有 infra 在後)。
- **2026-05-17 (V-MO1 demo 化)**：runtime-projection.ts 砍除 `enableCrossOrbitLivePolicy` opt-in 旗標;V4 demo route 預設且僅使用 `cross-orbit-live` 政策。**V-MO1 從 partial → done**。Bucket A 19 條全部 done (R1-F3 iperf 子項仍 partial,iperf/ping 實測整合屬 Bucket B irreducible-1)。
- **2026-05-17 (short URL + irreducible-2)**：V4 demo route 縮短為 `/?stationA=<id>&stationB=<id>` (合法 station id 即自動啟用 V4 場景與 regional 預設;長形 URL 仍支援)。Bucket B irreducible-2 替代清單以 5 個短 URL 形式落入 `scenario-globe-viewer/docs/requirement-requirement-walkthrough.md` §3 (對應 high/low elevation × rain/clear × handover/no-handover 代表性子集)。

## 相關文件

- [r1.docx](r1.docx) — 原始採購規格 (不再直接引用)
- [kickoff.pptx](kickoff.pptx) — 原始 kickoff 簡報 (不再直接引用)
- [markitdown-2026-04-13/r1.md](markitdown-2026-04-13/r1.md) — markitdown 文字抽取
- [markitdown-2026-04-13/kickoff.md](markitdown-2026-04-13/kickoff.md) — markitdown 抽取 (不完整，slide 5 OCR 缺漏)
- [mineru-pilot-2026-05-13/raw/r1/office/r1.md](mineru-pilot-2026-05-13/raw/r1/office/r1.md) — MinerU 文字抽取
- [mineru-pilot-2026-05-13/raw/kickoff/office/kickoff.md](mineru-pilot-2026-05-13/raw/kickoff/office/kickoff.md) — MinerU 文字抽取 (較完整)
- [multi-orbit/README.md](multi-orbit/README.md) — V-MO1 (口頭追加) 的後續展開 / 研究 baseline
- [requirement-acceptance-report-2026-04-20/](requirement-acceptance-report-2026-04-20/) — 驗收狀態追蹤
- [README.md](README.md) — 原始需求 narrative authority (本文件為其去重表格化子集)
- `scenario-globe-viewer/INDEPENDENT-AUDIT-requirements.md` — 62-req 審計 inventory (含 multi-orbit / 補資料，含本表格未列的 governance / D / V 類擴展)
- `scenario-globe-viewer/.agent-memory/reference_3gpp_itu_local_sources.md` — Tier B 公開來源檔案路徑與精確 section 引用
