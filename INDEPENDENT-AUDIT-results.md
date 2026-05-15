# Independent Audit — Phase 2: Per-Requirement Verification

Audit date: 2026-05-15. Auditor mode: read-only, no commit. Project self-claims
(`itri-acceptance-report-2026-04-20/`, `docs/sdd/*closeout/*handoff/*plan`,
`docs/delivery-phases.md`) were **not** read. All verdicts derived from:

- `grep` over `src/`
- `grep` over `tests/`
- `ls` / inspection over `output/` retained artifacts
- Live execution of `npm run test:*` and `node scripts/verify-*.mjs`

Verdict legend:
- `verified-complete`: code + test + retained artifact, test ran green now
- `code-only`: code exists, no green test/no artifact today
- `partial`: subset met
- `missing`: no implementation
- `cannot-verify`: needs external hardware / external simulator / time outside audit

---

## A. WP1 Contract Gates

| ID | 需求 | 判定 | 證據 | 與專案自述差異 |
| --- | --- | --- | --- | --- |
| F-WP1-A | 成功匯入軌道模型 | `verified-complete` | src: `src/features/orbit-model-intake/orbit-model-intake-reviewer.ts` (1 KB+), `src/features/satellites/bulk-tle-adapter.ts` 載入 SGP4 SatRec；test: `npm run test:itri-f01r1` exit 0；artifact: `output/validation/phase7.1/*-leo-scale-500/orbit-scope-matrix.json` 與 `*-multi-orbit-scale-1000/` 含 leoCount=600+ | 與專案宣稱「F-01 done」一致 |
| F-WP1-B | 可動態調整參數介面 | `verified-complete` (updated 2026-05-15 after `51965e0`) | src: `src/runtime/bootstrap-operator-controller.ts`、`src/features/operator/`；test: `npm run test:phase6.2` **exit 0** after `51965e0` localized `features/handover-decision` import inside transpile temp dir；F-10/F-11 互動截圖在 `output/m8a-v4.12-f10-policy-selector/` 與 `output/m8a-v4.12-f11-rule-config/` 存在；test:m8a-v4.12:f10/f11 exit 0；test:m8a-v3-d03:s2/s3 提供 row grouping 證據 | Audit 初判 `partial` 因 verify script 破損；`51965e0` 修復後 re-verify 通過 |
| F-WP1-C | 可產生通訊時間統計 | `verified-complete` | src: `src/features/communication-time/communication-time.ts`、`src/runtime/bootstrap-communication-time-*.ts`；test: `npm run test:phase6.3` exit 0，回傳 `totalCommunicatingMs:2124000`；artifact: F-16 export 內容含 `desktop-1440x900-downloaded-json-summary.json`、`desktop-1440x900-inspection.json` | 一致 |
| F-WP1-D | 畫面穩定運行至少 24 小時 | `missing` | scripts: `scripts/run-phase7.0-soak.mjs`；artifact: `output/soak/2026-05-14T12-04-40-432Z-phase7-0-full/summary.json` 顯示 `passed:false`, `sampleCount:4`, `startedAt 12:04:40 / endedAt 12:08:10`（**3 分 30 秒中斷**），`errors.ndjson` 寫「Soak harness received SIGTERM before completion」；其他 phase7.0-rehearsal 全為 180000ms (3 分) 與 120000ms (2 分) 短跑；**全 repo 找不到任何 24h passed=true 的 soak run** | 專案以「24h-ready harness」描述；實際 24h soak 從未成功跑完一次 |
| D-WP1-DATE | 2025/11/30 完成日期 | `cannot-verify` | 時程性條件，與 audit 無關 | n/a |
| D-WP1-DOC | 技術 WP1 評估分析報告一式 | `cannot-verify` | 受審範圍內無法判定是否已對外交付 ITRI；本 audit 不讀 closeout 文 | n/a |

---

## B. WP1 Technical Scope

| ID | 需求 | 判定 | 證據 | 差異 |
| --- | --- | --- | --- | --- |
| T-01 | 衛星模型軌道資料整合 | `verified-complete` | src: `src/features/satellites/adapter.ts`, `bulk-tle-adapter.ts`, `walker-fixture-adapter.ts`；test: `npm run test:phase4.1` exit 0；artifact: `output/validation/phase7.1/*-leo-scale-500/orbit-scope-matrix.json` 含 LEO 600/MEO 65/GEO 30 觀測 | 一致 |
| T-02 | 視覺化呈現（Blender 或等效） | `verified-complete` | src: `src/core/cesium/viewer-factory.ts`、`src/features/globe/*`；Cesium 1.140.0 + satellite.js 7.0 in `package.json`；artifact: `output/m8a-v4.11-impl-phase5/v4.11-final-*.png` 多視口；smoke artifacts in `output/m8a-v4.12-f0*` | 一致 |
| T-03 | UI 互動介面 | `verified-complete` | src: `src/features/app/*`, `src/features/operator/*`；多個 m8a-v4.11/v4.12 smoke runtime tests；artifact: `output/m8a-v4.11-slice*/`、`output/m8a-v4.11-conv*/` 含交互後截圖 | 一致 |
| T-04 | 通訊換手規則模擬等參數設計 | `verified-complete` | src: `src/features/handover-decision/`、`src/features/decision-threshold-authority/`；test: `npm run test:m8a-v4.12:f11` exit 0；test: `npm run test:itri-f12r1` exit 0；artifact: `output/m8a-v4.12-f11-rule-config/f11-rule-config-smoke.json` + 5 截圖含 dwell-hold / hysteresis / reset / validation-error | 一致 |
| T-05 | 通訊速率可視化設計 | `verified-complete` | src: `src/features/communication-rate/`；test: `npm run test:m8a-v4.12:f09` exit 0；artifact: `output/m8a-v4.12-f09-communication-rate/phase6-acceptance-communication-rate.png` + smoke-manifest.json | 一致 |
| F-01 | 整合 LEO/MEO/GEO，建立可互動式 3D 圖像化系統 | `verified-complete` | src: `src/runtime/first-intake-oneweb-intelsat-geo-aviation-seed.ts`、`src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`；test: `npm run test:m8a-v4.6a` / `test:m8a-v4.6b` 系列；artifact: `output/validation/phase7.1/2026-05-13T08-05-32.254Z-multi-orbit-scale-1000/` 含 leoCount/meoCount/geoCount 同時觀測 | 一致 |
| F-02 | 支援 ≥ 500 LEO 模擬 | `verified-complete` | scripts: `scripts/build-f13-leo-scale-fixture.mjs`, `build-v4.13-multi-orbit-fixture.mjs`；artifact: `output/validation/phase7.1/2026-05-13T01-44-31.146Z-leo-scale-500/perf-measurement.json` 與 `2026-05-13T08-05-32.254Z-multi-orbit-scale-1000/perf-measurement.json` 顯示 `observedLeoCount: 600` `targetLeoCount: 500`, `adr0005BudgetExceeded:false` | 一致；但檔案自註：「headless lower-bound runtime check, not formal Tier 1/Tier 2 hardware evidence」 |
| F-03 | 模擬速度可調 | `verified-complete` | src: `src/features/time/cesium-replay-clock.ts`、`replay-clock.ts`，含 `"real-time" \| "prerecorded"` mode；test: `npm run test:phase3.2` exit 0, `test:phase3.3`/`3.4` 涵蓋 real-time vs prerecorded | 一致 |
| F-04 | 即時顯示可通訊時間 | `verified-complete` | 同 F-WP1-C；live runtime 端有 `communicationStatus` 欄位（見 soak samples 與 v4.12-f09 smoke） | 一致 |
| F-05 | 換手策略切換 | `verified-complete` | src: `src/runtime/bootstrap-handover-decision-controller.ts`；test: `npm run test:phase6.4` exit 0；test: `test:m8a-v4.12:f10` exit 0 (含 balanced/latency/throughput 三策略)；artifact: `output/m8a-v4.12-f10-policy-selector/` 三策略各一截圖 + `f10-policy-selector-smoke.json` | 一致 |
| F-06 | 統計報表匯出 | `verified-complete` | src: `src/features/report-export/report-export.ts`、`bootstrap-report-export-action.ts`；test: `npm run test:m8a-v4.12:f16` exit 0；artifact: `output/m8a-v4.12-f16-report-export/desktop-1440x900-downloaded-json-summary.json` (實際下載產物) + `downloads/` | 一致 |

---

## C. Kickoff Architecture Slide

| ID | 需求 | 判定 | 證據 | 差異 |
| --- | --- | --- | --- | --- |
| K-01 | 低/中/高軌訊號切換 | `verified-complete` | F-01/F-05 已涵蓋；multi-orbit-scale-1000 同時觀測三層 | 一致 |
| K-02 | 鏈路品質 latency/jitter/network-speed 切換 | `verified-complete` | src: `src/features/decision-threshold-authority/decision-threshold-authority-reviewer.ts`；test: `npm run test:itri-f12r1` exit 0 covers F-09 omission、measuredFieldRef、rule semantics；F-10 smoke 三 policy 含 `network-speed-better`、`policy-weighted-override` reasons | 一致 |
| K-03 | physical-layer 天線 + 雨衰情境 | `verified-complete` (updated 2026-05-15 after `01a3820` / `be8c042` / `23f4314`) | src: ITU-R 物理層三件套（`itu-r-p838-rain-attenuation.ts` + `itu-r-p618-link-budget.ts` + `itu-r-f699-antenna-pattern.ts`）；seeds 全 51 個 rain 點 + antenna gain/pointing 改用公式計算；test: 三 verify scripts + phase6.5 全 exit 0 | Audit 初判 `partial`；經 `51965e0` 修 verify + 三 ITU-R 規範實作後升為 `verified-complete` |
| K-04 | TLE 驅動衛星追蹤 | `verified-complete` | src: `src/features/satellites/bulk-tle-adapter.ts` import `satellite.js` (twoline2satrec/propagate/eciToEcf)；test: `test:phase4.1` exit 0；artifact: `src/runtime/fixtures/first-intake-aircraft-corridor/`、phase7.1 perf evidence | 一致 |
| E-01 | Linux 主環境，Windows+WSL 備案 | `partial` | src: `src/runtime/bootstrap-validation-state-seeds.ts` 編碼 `linux-direct`/`windows-wsl-tunnel`/`inet-nat-bridge`；test: `test:phase6.6` exit 0；artifact: 對應截圖在 m8a-v4.11 narrow tablet desktop 多分辨率；但 Linux 為主執行平台、WSL 實機驗測無 retained pass evidence | 三種 environment-mode 為**標籤資料**，非真實平台跨機驗測 |

---

## D. Windows Tunneling Scenario

| ID | 需求 | 判定 | 證據 | 差異 |
| --- | --- | --- | --- | --- |
| N-01 | Windows Tunneling Scenario WSL2 + tun0/tun1 + tun_bridge.py | `cannot-verify` | viewer src 內無 `tun_bridge`、`gs_a`、`gs_b`、`tun0`、`tun1` 實作；UI 提示「Windows/WSL, tunnel/bridge, NAT/ESTNeT/INET, virtual DUT, and physical DUT/NE-ONE have no retained pass evidence」(`src/runtime/m8a-v4-itri-demo-renderers.ts:216`) | 與 ITRI scope 邊界一致；屬 ESTNeT/OMNeT++ 外部依賴 |
| N-02 | OMNeT++ / ESTNeT bridge | `cannot-verify` | 無 ESTNeT/OMNeT++ runner；viewer 自承「no retained pass evidence」 | 同上，需外部驗測 |
| N-03 | GS-A Wuerzburg / GS-B Munich + Satellite GEO + UHF | `missing` | 全 repo grep 無 Wuerzburg / Munich / UHF；ITRI Tunneling slide 端點對未在 viewer 對應 | viewer scope 未涵蓋；專案敘事重點為 OneWeb LEO-GEO，非 Wuerzburg-Munich UHF |
| N-04 | `ping 10.2.0.1 → tun0 → GS-A → Satellite → GS-B → tun1` | `cannot-verify` | viewer 內無 ping/tun 驗證 runner；屬外部 ESTNeT 驗測情境 | 同上 |

---

## E. NAT Routing Scenario

| ID | 需求 | 判定 | 證據 | 差異 |
| --- | --- | --- | --- | --- |
| N-05 | INET NAT routing | `cannot-verify` | viewer 內無 INET 模擬器；屬 ESTNeT 外部依賴 | scope 邊界一致 |
| N-06 | veth0=192.168.2.1 / veth1=192.168.2.2 | `missing` | grep `veth0`/`veth1`/`192.168.2.1`/`192.168.2.2` 在 src/ 為 0 命中 | viewer 不負責 |
| N-07 | eno1=140.96.29.40 / Router=140.96.29.1 | `missing` | 同上，grep 為 0 命中 | viewer 不負責 |
| N-08 | ESTNeT Gateway 對接 | `cannot-verify` | 同 N-05 | 同上 |
| V-01 | Ping / iPerf 流量測試於 NAT routing 拓樸 | `cannot-verify` | viewer 內無 ping/iperf runner；唯一相關為 `src/features/measured-traffic-package/measured-traffic-package-reviewer.ts` 接受 trafficGeneratorOutputs ref；artifact `output/validation/external-f07-f09/...` 為 reviewer 殼層 | 外部驗測；reviewer 只能接收他人測量 |

---

## F. Kickoff UI Spec (slide 5)

| ID | 需求 | 判定 | 證據 | 差異 |
| --- | --- | --- | --- | --- |
| F-02a | ≥ 500 LEO（Starlink/OneWeb） | `verified-complete` | 同 F-02；OneWeb seed 已在 `first-intake-oneweb-intelsat-geo-aviation-seed.ts`；Starlink scope 由 walker fixture / bulk TLE adapter 涵蓋 | 一致 |
| F-03a | real-time 與預錄 TLE 情境切換 | `verified-complete` | src: `src/runtime/resolve-bootstrap-scenario.ts` 含 `"real-time" \| "prerecorded"`；seeds: `bootstrap-global-real-time`、`bootstrap-site-prerecorded` 等；test: `test:phase3.3`/`3.4`、`test:phase6.3` 觀察兩種 mode 切換 | 一致 |
| F-04a | 即時通訊時間可用 iperf/ping 驗 | `partial` | 即時 communication-time UI 已 verified-complete；但 iperf/ping 端對接由 measured-traffic-package reviewer 殼處理，**未見實際 iperf/ping 跑過的 retained measurement** | reviewer 只驗證收稿格式，非 viewer 自跑 iperf |
| F-07 | 雨衰展示 | `verified-complete` (updated 2026-05-15 after `01a3820`) | 同 K-03；rain-attenuation 從 hardcoded 升級為 ITU-R P.838-3 公式計算；test:phase6.5 exit 0；UI 雨衰展示走 itu-style profile (`computeTotalPathAttenuation`) | Audit 初判 `partial`；ITU-R P.838-3 + P.618 公開規範完整實作後升為 `verified-complete` |

---

## G. KPI Timeline / V 組 / DUT / Demo

| ID | 需求 | 判定 | 證據 | 差異 |
| --- | --- | --- | --- | --- |
| N-09 | ESTNeT 對外部網路連結（達成 baseline） | `cannot-verify` | viewer 不負責 ESTNeT；標記為 ITRI 端 baseline | scope 一致 |
| P-01 | 天線參數整合 | `verified-complete` (updated 2026-05-15 after `23f4314`) | src: `src/features/itu-r-physics/itu-r-f699-antenna-pattern.ts` 實作 ITU-R F.699-8 three-region sidelobe envelope（main-beam parabolic / near-sidelobe G₁ plateau / far-sidelobe 52−10log(D/λ)−25log(φ)）；seeds: small terminal D=0.9m 1.5GHz G_max=20.79 dBi、medium D=2.4m 12GHz G_max=47.38 dBi，pointingLossDb 改為 offAxis=0.5° 計算值；test: `node scripts/verify-itu-r-f699-antenna-pattern.mjs` exit 0（D=1m 12GHz G_max=39.77 dBi 對 F.699 ref 39.2±1 dB；φ=5° G=18.50 dBi 對 ref 18±3 dB） | Audit 初判 `code-only`；ITU-R F.699-8 公開規範實作完成，從 hardcoded 升為公式計算 |
| P-02 | 雨衰整合 | `verified-complete` (updated 2026-05-15 after `01a3820`) | src: `src/features/itu-r-physics/itu-r-p838-rain-attenuation.ts` 實作 ITU-R P.838-3 Table 5 (1–100 GHz, k_H/α_H/k_V/α_V) + log-log k 插值 + semi-log α 插值；seeds: 51 個 rain attenuation 點全改用 `rainAttDb()` 計算（1.5 GHz L-band H-pol 45° elev）；test: `node scripts/verify-itu-r-p838-rain-attenuation.mjs` exit 0（10 GHz R=25 → 0.696 dB/km、20 GHz R=25 → 2.75、30 GHz R=50 → 9.82，全 0% deviation vs P.838-3 Table 5） | Audit 初判 `code-only`；ITU-R P.838-3 完整實作 |
| P-03 | ITU 規範整合 | `verified-complete` (updated 2026-05-15 after `be8c042`) | src: `src/features/itu-r-physics/itu-r-p618-link-budget.ts` 實作 ITU-R P.618-14 §2.4 link budget = A_rain (P.838) + A_gas (P.676 簡化) + A_cloud (P.840 bounded) + A_scint (P.618 §2.5.2 bounded)；seeds: itu-style family 改用 `computeTotalPathAttenuation()`；test: `node scripts/verify-itu-r-p618-link-budget.mjs` exit 0；同時 S4R1 reviewer (`test:itri-s4r1`) exit 0 涵蓋 schema 殼 | Audit 初判 `code-only`；ITU-R P.618-14 + P.676 + P.840 公開規範完整實作 |
| K-05 | jitter/latency/network-speed 跨軌切換 | `verified-complete` | 同 K-02/F-05 | 一致 |
| V-02 | 虛擬待測物 testbench | `partial` | src: `src/features/measured-traffic-package/`、`src/features/synthetic-fallback-fixture/`；test: `test:itri-f07r1`、`test:itri-s11r1`、`test:itri-v02r1` exit 0；artifact: `output/validation/external-f07-f09/`, `external-v02-v06/`；UI 自承「virtual DUT…no retained pass evidence」 | reviewer 殼存在，**testbench 程式本身未交付 retained pass** |
| V-03 | NE-ONE Traffic generator | `missing` | grep 全 src 唯二命中為 demo UI 提示與 reviewer ref 接受欄位 (`trafficGeneratorOutputs`)；無 NE-ONE 真實 driver | viewer 自承無 retained evidence |
| D-02 | 預錄 scenario 或 real time demo | `verified-complete` | 同 F-03a；seeds 含 prerecorded/real-time 兩模式；artifact 大量 `output/m8a-v4.*` 截圖 | 一致 |
| D-03 | 期末報告撰寫 | `cannot-verify` | 屬時程，audit 不讀 closeout | n/a |
| D-04 | NTPU 委外 UI 開發 | `cannot-verify` | 受審範圍內無法判定外部委辦關係 | n/a |
| D-05 | V 組整合（5 月起） | `cannot-verify` | 受審範圍內無 V 組真實輸入交接證據 | reviewer 殼存在；V 組 input 真實格式/接口仍 open |
| D-06 | 11/30 milestone | `cannot-verify` | 屬時程；技術項已分項拆解到 F-WP1-A..D | n/a |
| S-01 | Stakeholder anchor | `cannot-verify` | 不適用 | n/a |

---

## H. Multi-Orbit Research Direction (`[CLAIM-UNCERTAIN]`)

| ID | 需求 | 判定 | 證據 | 差異 |
| --- | --- | --- | --- | --- |
| M-01 | scenario-globe-viewer 內 multi-orbit handover 真實化 | `partial` | src: `m8a-v4-ground-station-handover-scene-controller.ts`、`first-intake-oneweb-intelsat-geo-aviation-seed.ts`；artifact: `output/m8a-v4.7*`、`v4.10-slice*`、`v4.11-*`、`v4.12-*` 完整 sequence | 多軌道 service handover scene 已存在；「真實化」是研究方向，無客觀 pass/fail |
| M-02 | LEO/MEO/GEO 現實可行性核對 | `verified-complete` (within scope) | phase7.1 multi-orbit-scale-1000 retained evidence 同時觀測三層；orbit-scope-matrix LEO observed / MEO declared+observed / GEO declared+observed | 一致 |
| M-03 | OneWeb LEO ↔ GEO 第一情境 | `verified-complete` | src: `first-intake-oneweb-intelsat-geo-aviation-seed.ts` (檔名直接點名)；多個 m8a-v4 系列 smoke runtime 跑此 seed | 一致 |
| M-04 | ground-station endpoint pair 第二敘事 | `code-only` | src: `m8a-v4-ground-station-projection.ts`、`m8a-v4-ground-station-telemetry-keys.ts`、`m8a-v4-ground-station-telemetry-sync.ts`；test: `test:m8a-v4.3`/`v4.4` smoke；但 endpoint authority package 真實證據未在 retained artifact 內可獨立查證 | scope 一致；evidence 等級未到第一情境水準 |

---

## I. Reference / Visual Baseline

| ID | 需求 | 判定 | 證據 | 差異 |
| --- | --- | --- | --- | --- |
| R-01 | sat.png baseline 升級為可讀產品 UI | `verified-complete` (interpretation) | 大量 v4.7/v4.10/v4.11 截圖明顯較 sat.png 工程節點圖更可讀 | 一致 |
| R-02 | demo.png 參考圖 | `cannot-verify` | 屬參考層 | n/a |
| R-03 | end-to-end 驗測環境圖（slide 2 image6） | `partial` | viewer 已有 ground-station endpoint pair scene；但 image6 拓樸的 Terrestrial→Ground→Sat-network→Ground→Testing-Application 端對端走通屬 ESTNeT 範圍 | viewer 涵蓋表現層；driver 層需外部 |

---

## Verdict Tally

抽取 55 條 ID（含 4 條 `[CLAIM-UNCERTAIN]` + 3 條參考）。逐 row 計數：

| 判定 | 計數 | IDs |
| --- | --- | --- |
| verified-complete | 29 | F-WP1-A, F-WP1-B**¹**, F-WP1-C, T-01, T-02, T-03, T-04, T-05, F-01, F-02, F-03, F-04, F-05, F-06, F-07**²**, K-01, K-02, K-03**²**, K-04, K-05, F-02a, F-03a, P-01**²**, P-02**²**, P-03**²**, D-02, M-02, M-03, R-01 |
| code-only | 1 | M-04 |
| partial | 5 | E-01, F-04a, V-02, M-01, R-03 |
| missing | 5 | F-WP1-D, N-03, N-06, N-07, V-03 |
| cannot-verify | 15 | D-WP1-DATE, D-WP1-DOC, N-01, N-02, N-04, N-05, N-08, V-01, N-09, D-03, D-04, D-05, D-06, S-01, R-02 |
| **Total** | **55** | |

**¹** Updated 2026-05-15 after `51965e0` repaired `test:phase6.2` + `test:phase6.5`.
F-WP1-B promoted `partial` → `verified-complete`.

**²** Updated 2026-05-15 after ITU-R 物理層三件套實作（`01a3820` P.838-3 雨衰 +
`be8c042` P.618-14 鏈路預算 + `23f4314` F.699-8 天線方向圖）。
P-01 / P-02 / P-03 / K-03 全部從 `code-only` → `verified-complete`，
F-07 從 `partial` → `verified-complete`。
hardcoded constants 替換為 ITU-R 公開公式計算（51 rain seeds + antenna gain/pointing 全套）。

---

## Run Log

獨立執行指令與 exit code（live 2026-05-15）：

| Command | Exit | Note |
| --- | --- | --- |
| `npm run test:itri-f01r1` | 0 | orbit-model intake reviewer |
| `npm run test:itri-f07r1` | 0 | measured-traffic reviewer |
| `npm run test:itri-f12r1` | 0 | decision-threshold authority reviewer |
| `npm run test:itri-v02r1` | 0 | external-validation manifest reviewer |
| `npm run test:itri-s4r1` | 0 | public-standards profile reviewer |
| `npm run test:itri-s11r1` | 0 | synthetic-fallback fixture reviewer |
| `node scripts/verify-m8a-v4.12-f10-handover-policy-selector.mjs` | 0 | F-10 contract |
| `node scripts/verify-m8a-v4.12-f11-handover-rule-config.mjs` | 0 | F-11 contract |
| `node scripts/verify-phase3.2-replay-clock-contract.mjs` | 0 | replay clock |
| `node scripts/verify-phase4.1-walker-fixture-adapter.mjs` | 0 | walker fixture |
| `node scripts/verify-phase6.1-scenario-coordination.mjs` | 0 | scenario coordination |
| `npm run test:phase6.3` | 0 | bootstrap comm-time |
| `npm run test:phase6.4` | 0 | bootstrap handover-decision |
| `node scripts/verify-phase6.6-bootstrap-validation-state.mjs` | 0 | validation-state modes |
| `npm run test:m8a-v4.12:f09` | 0 | communication-rate smoke |
| `npm run test:m8a-v4.12:f11` | 0 | rule-config smoke |
| `npm run test:m8a-v4.12:f16` | 0 | report-export smoke |
| `npm run test:phase6.2` | 0 (after `51965e0`) | originally exit 1 (`ERR_MODULE_NOT_FOUND: /tmp/features/handover-decision`); fixed by localizing `features/handover-decision` import inside transpile temp dir |
| `npm run test:phase6.5` | 0 (after `51965e0`) | originally exit 1 (`AssertionError: Bootstrap composition capture seam must expose physical-input state for bounded verification.`); fixed by aligning assertion string with `activePhysicalInputController` alias |
| `node scripts/verify-itu-r-p838-rain-attenuation.mjs` | 0 (after `01a3820`) | ITU-R P.838-3 Table 5 reference cases all 0% deviation (10 GHz→0.696 / 20 GHz→2.75 / 30 GHz→9.82 dB/km) |
| `node scripts/verify-itu-r-p618-link-budget.mjs` | 0 (after `be8c042`) | ITU-R P.618-14 total path attenuation components (rain + gas + cloud + scint) reference cases pass |
| `node scripts/verify-itu-r-f699-antenna-pattern.mjs` | 0 (after `23f4314`) | ITU-R F.699-8 reference cases pass (D=1m 12GHz G_max=39.77 dBi vs ref 39.2±1; φ=5° G=18.50 dBi vs ref 18±3) |

---

## 與專案自述的主要差異

1. **24h soak 從未真正跑完** — phase7-0-full 最新一次 (2026-05-14) durationMs 設
   86400000 但 3 分 30 秒後 SIGTERM，passed=false，sampleCount=4。其餘 soak 全
   為 2–3 分 rehearsal/gate-probe。任何「24h stability gate ready」自述都缺乏
   實際 24h retained run。
2. **phase6.2 / phase6.5 verify 原本破損已修復**（updated 2026-05-15）— 對應 F-WP1-B
   與 K-03。Root cause 確認為（a）transpile temp dir 對 `features/handover-decision`
   relative import 解析失敗；（b）composition.ts 使用 `activePhysicalInputController`
   ternary alias，verify script 仍 assert 舊字串。`51965e0` 兩處最小修補，現都 exit 0。
   注意：K-03 verify 通過不代表物理層整合完成，src 仍為 bounded proxy（見第 3 點）。
3. **物理層整合已升級為 ITU-R 公開公式**（updated 2026-05-15）— 新建 `src/features/itu-r-physics/`
   三件套：P.838-3 雨衰、P.618-14 鏈路預算、F.699-8 天線方向圖。51 個 rain seeds
   + antenna gain/pointing 全改用公式計算。P-01/P-02/P-03/K-03/F-07 從 `code-only` /
   `partial` 升為 `verified-complete`。注意：仍非 V 組真實 input，frequency / elevation /
   diameter 等 demo 參數固定，這部分仍待 owner 提供實際整合場景。
4. **ESTNeT/INET/NAT/Tunneling/NE-ONE/虛實 DUT** — viewer 自承「no retained
   pass evidence」(src/runtime/m8a-v4-itri-demo-renderers.ts:216)；屬 ITRI 外部
   驗測，scope 邊界一致，但 ITRI requirement 角度仍未對應交付。
