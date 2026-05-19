#!/usr/bin/env python3
"""Build wave-2 progress pptx v2 from template.pptx.

Key changes vs v1:
- Use slideLayout2.xml (Outline-style) for all content slides
- Restore tables via <p:graphicFrame> XML
- Base font 20pt (sz=2000)
- Strip "wave 2" / "Selected-pair" / ITRI literals from titles
  (use neutral 中文 terminology like "地面站對" / 進度報告 / 多軌道)
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

UNPACK = Path("/tmp/wave2-build2")
OUT_PPTX = Path("/home/u24/papers/scenario-globe-viewer/docs/presentation/wave2-progress-2026-05-19.pptx")
TEMPLATE_PPTX = Path("/home/u24/papers/scenario-globe-viewer/docs/presentation/template.pptx")

FONT_RPR = (
    '<a:latin typeface="Times New Roman" panose="02020603050405020304" pitchFamily="18" charset="0"/>'
    '<a:ea typeface="標楷體" panose="03000509000000000000" pitchFamily="65" charset="-120"/>'
    '<a:cs typeface="Times New Roman" panose="02020603050405020304" pitchFamily="18" charset="0"/>'
)

EMU_PER_INCH = 914400
SLIDE_W = 12192000  # 13.33"
SLIDE_H = 6858000   # 7.5"

# Content area defaults (below title)
CONTENT_X = 457200   # 0.5"
CONTENT_W = 11277600  # 12.33" wide
TITLE_BOTTOM_Y = 1100000  # ~1.2"

# Default table style (Medium Style 2 - Accent 1)
TABLE_STYLE_ID = "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"


# ---------------- slide content specs ----------------

SLIDES: list[dict] = []

# 1. Cover
SLIDES.append({
    "kind": "cover",
    "title": "多軌道衛星-地面站連線模擬展示",
    "subtitle": "進度報告 — 2026-05-19 階段性回顧",
    "authors": "客戶技術審查與專案進度報告",
})

# 2. Outline
SLIDES.append({
    "kind": "outline",
    "title": "報告大綱",
    "items": [
        "A. 站點識別:圓點顏色、篩選條件、命名規則、資訊卡",
        "B. 地面站對解讀:衛星篩選、軌跡可視窗、連線與傳輸模型、結果可信度",
        "C. 通訊稽核 CSV 匯出 / 雨衰滑桿控制",
        "D. 公開軌道資料模擬狀態:已完成、開發中、可驗證證據",
        "E. 資料可信度與外部參考資料",
        "F. 附錄:工程驗證依據(非外部引用來源)",
    ],
})

# 3. 名詞說明
SLIDES.append({
    "kind": "table",
    "title": "名詞說明",
    "intro": "本報告常用名詞與用途;首次出現時以中文說明專有名詞。",
    "headers": ["名詞", "說明"],
    "col_widths": [2700000, 8500000],
    "rows": [
        ["地面站對 (Station Pair)", "使用者選兩個地面站,系統計算兩站之間共同可見的衛星。"],
        ["TLE", "Two-Line Element,公開衛星軌道兩行參數;本模擬用它推算衛星位置。"],
        ["SATCAT", "Satellite Catalog,衛星名冊;補衛星名稱、NORAD id、COSPAR id、星座與營運商脈絡。"],
        ["LEO / MEO / GEO", "低軌 / 中軌 / 地球同步軌道。"],
        ["SGP4", "依 TLE 推算衛星位置的標準軌道模型。"],
        ["通訊稽核 CSV", "可下載的稽核表,檢查資料來源與模型輸出,不是實測封包。"],
        ["EIRP / RSRP / T_sys", "等效全向輻射功率 / 接收功率指標 / 系統噪聲溫度。"],
    ],
    "outro": "外部來源 [2] CelesTrak;連線參數定義見 [3] 3GPP TR 38.811 / 38.821。",
})

# 4. 站點標記規則
SLIDES.append({
    "kind": "table",
    "title": "站點標記規則",
    "intro": "說明首頁地面站圓點的顏色、大小與能力分類。",
    "headers": ["能力等級", "站數", "一般圓點", "Selected", "意義"],
    "col_widths": [2200000, 800000, 3400000, 2400000, 2400000],
    "rows": [
        ["三軌能力 (tri-capable)", "22", "綠色 r5.5 px;目前少數,加 pink outline", "綠色 r8 px + yellow outline", "至少能與某個 pair 共享 3 種軌道"],
        ["雙軌能力 (dual-only)", "47", "藍色 r4.5 px + dark outline", "藍色 r6.5 px + yellow outline", "可形成相容 pair,最多共享 2 種軌道"],
    ],
    "outro": "pink outline 套在「目前站數較少的能力等級」;現在 tri (22) 少於 dual (47)。\n判斷:pair 需共同 RF 頻段 + 共同 LEO/MEO/GEO 通過 10° 以上仰角的幾何可視條件。\n外部來源 [1][6]-[10];live 計算自 station-compatibility.ts。",
    "cell_sz": 1700,
})

# 5. 站點篩選條件
SLIDES.append({
    "kind": "table",
    "title": "站點篩選條件",
    "intro": "整理站點篩選器的分類、畫面選項與意義。",
    "headers": ["篩選群組", "畫面選項", "用途"],
    "col_widths": [1800000, 5500000, 4000000],
    "rows": [
        ["Orbit (軌道)", "LEO、MEO、GEO", "公開揭露支援的軌道類別"],
        ["Handover (換手)", "2-orbit、3-orbit", "兩站可共同切換的軌道類別數"],
        ["Region (區域)", "Africa、Asia、Europe、N. America、Oceania、Antarctic、Arctic、S. America", "資料庫 region 欄位"],
        ["Band (頻段)", "Ka、Ku、C、X、S、L", "公開揭露支援的 RF 頻段"],
    ],
    "outro": "Orbit / Band / Region 為資料庫欄位篩選;Handover 為推導出的 pair 篩選。\n不等於實際服務證明;不代表營運商已驗證 routing。外部來源 [1][6]-[10]。",
})

# 6. 站點命名規則
SLIDES.append({
    "kind": "table",
    "title": "站點命名規則",
    "intro": "說明 station identity 為什麼採「站點 / 營運商優先」,而不是國家優先。",
    "headers": ["欄位", "作用"],
    "col_widths": [3000000, 8300000],
    "rows": [
        ["id", "穩定路由鍵,通常為 operator-family + site/locality slug"],
        ["name", "使用者看到的 public station / teleport / gateway 名稱"],
        ["operator / operatorFamily", "network ownership 與 pair 來源等級推論"],
        ["country / region", "篩選脈絡,不是 endpoint identity"],
    ],
    "outro": "同國可有多個 operator 與多個 station site;同 operator network 可跨國。\n展示系統需唯一 physical endpoint 做 routing / screenshot / pair URL;country 粒度太粗。\n命名依據:operator service page、station public page、Wikipedia / Wikidata、FCC / ITU filing、World Teleport Association、產業 press 等公開資料。外部來源 [1][6]-[10]。",
    "cell_sz": 1700,
})

# 7. 站點資訊卡
SLIDES.append({
    "kind": "table",
    "title": "站點資訊卡",
    "intro": "點開單一站點時,讓使用者檢查公開來源、能力欄位與是否可選為 Station A/B。",
    "headers": ["顯示區塊", "內容"],
    "col_widths": [2500000, 8800000],
    "rows": [
        ["標題", "public station / teleport / gateway display name"],
        ["欄位清單", "operator、operatorFamily、country、region、座標、支援軌道、支援頻段、揭露精度"],
        ["用途 / 備註", "primaryUseCase + publicDisclosureNotes 公開資料摘要"],
        ["來源連結", "Public source · sourceTier,連到資料庫 primary URL"],
        ["操作", "Select as Station A/B;已選 pair 顯示 source tier"],
    ],
    "outro": "每站點都有 primary public source;只收公開可佐證至少支援 2 種軌道類別的站。\n座標依 disclosurePrecision 可能是 exact 或 municipality / operator-family 區域代表座標。\nNon-claim:不驗證 commercial routing、private service、實際流量。外部來源 [1][5][6]-[10]。",
    "cell_sz": 1700,
})

# 8. 地面站對衛星篩選
SLIDES.append({
    "kind": "table",
    "title": "地面站對衛星篩選",
    "intro": "選定 Station A/B 後,畫面上的衛星候選怎麼被挑出來。",
    "headers": ["階段", "規則"],
    "col_widths": [2400000, 8900000],
    "rows": [
        ["Pair input", "站點 id、座標、支援軌道、支援頻段都來自公開資料庫"],
        ["Orbit filter", "兩站共同揭露軌道:LEO / MEO / GEO intersection"],
        ["TLE pool", "CelesTrak public GP TLE snapshots;SATCAT 補 constellation / operator 脈絡"],
        ["Compute cap", "互動運算每軌道類別最多 60 筆 TLE records"],
        ["Geometry filter", "SGP4 propagation + station geometry;門檻 10° 仰角"],
        ["Pair filter", "同顆衛星須同時對 A/B 形成重疊可視窗,才會進入候選"],
    ],
    "outro": "取樣 cadence:LEO 30 s、MEO 60 s、GEO 120 s。\n外部來源 [1] 站點資料庫、[2] CelesTrak。",
    "cell_sz": 1700,
})

# 9. 地面站對顯示取捨
SLIDES.append({
    "kind": "table",
    "title": "地面站對顯示取捨",
    "intro": "第一輪候選衛星可能很多;畫面分層級避免過度擁擠。",
    "headers": ["顯示層級", "規則"],
    "col_widths": [3200000, 8100000],
    "rows": [
        ["資料層候選", "所有有 pair visibility windows 的衛星 + handover target + continuity ids"],
        ["目前服務衛星", "replay 當下由 cross-orbit-live policy 選出的 serving satellite"],
        ["視覺強調", "active / continuity actors 用較明顯模型;context actors 降低視覺權重"],
        ["Labels", "最多顯示前 6 個 labels;active / candidate / continuity 保留 label"],
        ["Uplink / downlink pulses", "只跟目前 active link 走;不是所有候選都畫 packet flow"],
    ],
    "outro": "整體上是 readability policy:資料層保留完整候選與來源脈絡,視覺層只強調目前服務、切換目標、連續性相關衛星。",
    "cell_sz": 1800,
})

# 10. 地面站對軌跡與可視窗
SLIDES.append({
    "kind": "table",
    "title": "地面站對軌跡與可視窗",
    "intro": "衛星軌跡的真實性層次:公開來源 → 模型推導 → display-only。",
    "headers": ["層次", "內容"],
    "col_widths": [2400000, 8900000],
    "rows": [
        ["真實公開資料", "衛星身份、NORAD / COSPAR、TLE 兩行軌道資料 (CelesTrak)"],
        ["開源推導", "SGP4 取樣位置、WGS84 仰角計算、A/B 重疊區段 → pair visibility"],
        ["Display-only", "camera framing、altitude compression、label density、generic mesh、lane placement"],
    ],
    "outro": "Scene actor set = pair visibility + handover target + continuity ids;排序:active link 優先 → 最早可視窗。\n若 pair 無可視窗:不補 fake satellite、不補 fake active link。外部來源 [1][2][6]-[10]。",
    "cell_sz": 1800,
})

# 11. 地面站對連線與傳輸模型
SLIDES.append({
    "kind": "table",
    "title": "地面站對連線與傳輸模型",
    "intro": "連線數字的來源分層。",
    "headers": ["Surface", "解讀"],
    "col_widths": [2800000, 8500000],
    "rows": [
        ["Active satellite", "pair visibility 候選交 cross-orbit-live policy 選"],
        ["Uplink / downlink lines", "幾何端點:A → satellite → B;方向為視覺呈現 (display grammar)"],
        ["Moving packets / pulses", "純視覺節奏,非 packet capture / traffic log / measured throughput"],
        ["Handover reason", "模型化 policy output;依仰角、剩餘可視時間、latency、jitter、relative RSRP scoring"],
        ["Latency", "用斜距推估 one-way 延遲;依 3GPP TR 38.811 §6.7"],
        ["Throughput / jitter / rain impact", "FSPL + gas absorption + rain attenuation 模型估算"],
    ],
    "outro": "模型依據:FSPL 來自 3GPP TR 38.811 §6.6.2;gas / rain attenuation 參考 ITU-R P.676 / P.618;handover policy 參考 TR 38.821 §7.3。外部來源 [3][4]。",
    "cell_sz": 1600,
})

# 12. 地面站對結果可信度邊界
SLIDES.append({
    "kind": "table",
    "title": "地面站對結果可信度邊界",
    "intro": "對外可以怎麼說。",
    "headers": ["類別", "範圍"],
    "col_widths": [1800000, 9500000],
    "rows": [
        ["真實公開資料", "站點身份 / coordinates precision / public source、TLE 衛星身份、NORAD / COSPAR、SATCAT summary"],
        ["開源推導", "satellite 取樣位置、tracks、station visibility、pair visibility intersection、候選 set"],
        ["模型估算", "active satellite choice、handover decision、latency、jitter、throughput、rain impact、comm time summary"],
        ["純視覺", "uplink/downlink pulses、display lanes、camera、label density、generic satellite model"],
        ["不可宣稱", "營運商實測 telemetry、真實 packet flow、實測 congestion、private gateway schedule、commercial routing"],
    ],
    "outro": "目前缺口:EIRP、bandwidth、T_sys、完整大氣 grid 仍待確認來源;throughput / RSRP 類語句只能保持模型估算。\n外部來源 [1][2][3][4][5][6]-[10]。",
    "cell_sz": 1600,
})

# 13. 通訊稽核 CSV 匯出
SLIDES.append({
    "kind": "table",
    "title": "通訊稽核 CSV 匯出",
    "intro": "地面站對結果面板的 CSV 是模擬運算結果的稽核資料,用來重現面板數值、檢查資料來源與可信度邊界。",
    "headers": ["CSV 區塊", "解讀方式"],
    "col_widths": [2700000, 8600000],
    "rows": [
        ["模擬運算摘要", "Station A/B、time window、shared orbits、來源等級、座標精度標籤"],
        ["站點精度", "座標精度、raw lat/lon、畫面位置是否等於 source truth"],
        ["TLE 來源清單", "CelesTrak path、record counts、cap、parse health、epoch / source health"],
        ["衛星 / 可視窗", "哪些 satellite 被軌道推算、sample cadence、A/B visibility、pair intersection"],
        ["通訊 / 切換事件", "comm time summary、handover reason;為推導 / 模型結果,不是 traffic logs"],
        ["模型輸出", "model id、standards refs、input summary、non-claim"],
    ],
    "outro": "讀法:來源等級與座標精度 → TLE manifest 是否 fresh / capped → 對照面板 → Non-claim 收尾。\nNon-claim:稽核資料,非 packet capture / operator telemetry / commercial routing 證據。外部來源 [1][2][3][4]。",
    "cell_sz": 1600,
})

# 14. 雨衰滑桿 控制重點
SLIDES.append({
    "kind": "table",
    "title": "雨衰滑桿 (Rain rate) 控制重點",
    "intro": "Station pair、time window、TLE pool、orbit support 都是地面站對的資料來源輸入;滑桿在不改這些 source truth 的前提下,展示降雨衰減壓力測試。",
    "headers": ["影響範圍", "解讀"],
    "col_widths": [2000000, 9300000],
    "rows": [
        ["不會改變", "站點座標、衛星身份、TLE propagation、visibility windows、候選池"],
        ["直接影響", "ITU-R P.618 rain attenuation、Ku/Ka 模型化 throughput / jitter"],
        ["可能連帶", "若 link score 改變,active satellite、comm time、handover count 可能跟著變動"],
    ],
    "outro": "報告策略:面板第 2 列 Rain rate 與第 5 列 d1 Rain impact 要特別講;其他 rows 帶過。\n外部來源 [4] ITU-R P.618 / P.838。",
    "cell_sz": 1800,
})

# 15. 公開軌道資料模擬目標
SLIDES.append({
    "kind": "table",
    "title": "公開軌道資料模擬目標",
    "intro": "TLE-first:衛星身份與軌道先用公開 TLE / SATCAT,再用模型推導可視窗、連線選擇、天候影響。不是營運商實測,也不是真實封包紀錄。",
    "headers": ["問題", "目前做法"],
    "col_widths": [2700000, 8600000],
    "rows": [
        ["衛星是否真實", "用 CelesTrak GP / SATCAT 的公開身份與軌道"],
        ["軌跡怎麼來", "SGP4 依 TLE 推算位置 + 站點座標計算可視窗"],
        ["連線數字怎麼來", "latency、throughput、jitter、handover 是模型估算,標示來源與限制"],
        ["缺資料怎麼處理", "EIRP / bandwidth / T_sys 等必要資料未確認時顯示 unavailable"],
        ["視覺動畫怎麼看", "線條、封包點、camera、label 是輔助理解,不是真實流量"],
    ],
    "outro": "目前只可說「基礎能力已建立」;完整前後比較畫面仍在開發中。\n來源:SDD §7、§11、§12.1;slice-0 §6.2;效能測試報告 (內部編號 S1)。",
    "cell_sz": 1700,
})

# 16. 目前已完成基礎
SLIDES.append({
    "kind": "table",
    "title": "目前已完成基礎",
    "intro": "已落地的基礎能力(2026-05-19 重新擷取的 screenshot 對應)。",
    "headers": ["已完成", "對報告的意義", "追溯依據"],
    "col_widths": [2700000, 6300000, 2300000],
    "rows": [
        ["公開 TLE / SATCAT source path", "衛星身份與軌道來源可追溯,不補 fake actor", "[2]"],
        ["模擬結果來源欄位", "CSV / 面板可追到資料來源、模型、non-claim", "工程驗證依據"],
        ["Station elevation prep", "69 站點已有高度與 horizon mask 欄位,待 runtime 接線", "[1][5]"],
        ["Slice-0 baseline", "5 組 walkthrough URL 已固定為後續 comparison 的基準", "工程驗證依據"],
        ["Performance spike", "LEO 200 cap @ 30 s 已有 p95 391.2 ms 的證據", "工程驗證依據"],
    ],
    "outro": "Refresh 是 build-step / manifest path;runtime hot path 不做網路抓取。",
    "cell_sz": 1700,
})

# 17. 仍在開發與待確認
SLIDES.append({
    "kind": "table",
    "title": "仍在開發與待確認",
    "intro": "開發中項目 + 待確認條件。",
    "headers": ["項目", "要完成什麼", "待確認條件"],
    "col_widths": [2200000, 5800000, 3300000],
    "rows": [
        ["站點高度 / 地形", "elevationM / terrainMaskDeg 接到可視窗、雨衰、面板第 6 列", "程式尚未接讀"],
        ["候選量與 policy", "LEO 200 cap @ 30 s、cap disclosure、policy selector", "200 + 10 s 尚未通過"],
        ["視覺證據", "TLE freshness、active badge、pre/post comparison shell", "比較證據尚未完成"],
        ["RSRP / throughput", "EIRP / bandwidth / T_sys / Shannon throughput", "來源未確認則 unavailable"],
        ["大氣 / 雨量格點", "cloud、scintillation、rain height、rain climatology grid", "待 ITU-R grid 政策 [4]"],
    ],
    "outro": "外部來源 [4] ITU-R;對應 SDD §7 Slice F1–F9。",
    "cell_sz": 1600,
})

# 18. 目前可驗證證據
SLIDES.append({
    "kind": "table",
    "title": "目前可驗證證據",
    "intro": "可引用的 baseline,不是完整 comparison result。",
    "headers": ["證據", "可對外說法"],
    "col_widths": [2500000, 8800000],
    "rows": [
        ["目前畫面截圖", "地面站對展示頁面已顯示來源、模型揭露、CSV audit"],
        ["代表路徑基準", "5 組路徑面板第 3 / 5 / 6 列值已固定為基準"],
        ["效能證據", "LEO 60 + 10 s PASS;LEO 200 + 30 s PASS;LEO 200 + 10 s FAIL"],
        ["來源脈絡", "Station / TLE / SATCAT / CSV 可交叉檢查 [1][2]"],
        ["比較畫面邊界", "前後比較畫面仍在開發中;不可宣稱已完成比較驗證"],
    ],
    "outro": "來源:slice-0 §6.2 baseline + 2026-05-19 重新擷取的 screenshot;細節見附錄。",
    "cell_sz": 1800,
})

# 19. 資料可信度說明
SLIDES.append({
    "kind": "table",
    "title": "資料可信度說明",
    "intro": "報告時清楚分辨:公開來源 / 模型推導 / 視覺輔助。",
    "headers": ["類型", "可解讀方式"],
    "col_widths": [2700000, 8600000],
    "rows": [
        ["Station card", "公開資料庫 + source link;座標可能為 exact 或代表座標"],
        ["通訊稽核 CSV", "稽核資料,非實測 telemetry"],
        ["雨衰滑桿", "模型控制參數,非實測天氣"],
        ["Satellite scene", "衛星身份與位置來自公開 TLE 推導"],
        ["數值指標", "除明確標 source-derived 外,皆為模型估算"],
        ["缺少必要來源", "顯示 unavailable / pending,不靜默補值"],
    ],
    "outro": "不宣稱:營運商實測 telemetry、實測 throughput / jitter / congestion、private gateway schedule、commercial routing、runtime Internet refresh、營運商已驗證 station-to-station service。",
    "cell_sz": 1600,
})

# 20. 參考資料 — 站點公開來源
SLIDES.append({
    "kind": "table",
    "title": "參考資料 — 站點公開來源",
    "intro": None,
    "headers": ["Ref", "Source"],
    "col_widths": [700000, 10600000],
    "rows": [
        ["[1]", "Operator network pages — KSAT Global、SES O3b mPOWER、Intelsat teleport chart"],
        ["[6]", "GEO / LEO / MEO operator pages — Eutelsat GEO-LEO、Telesat、SES gateway update"],
        ["[7]", "Teleport / facility profiles — World Teleport Association、USEI、SANSA、NRCan Inuvik"],
    ],
    "outro": "完整 URL 列於 markdown 完整版進度報告。",
    "cell_sz": 1800,
})

# 21. 參考資料 — 站點補充來源
SLIDES.append({
    "kind": "table",
    "title": "參考資料 — 站點補充來源",
    "intro": None,
    "headers": ["Ref", "Source"],
    "col_widths": [700000, 10600000],
    "rows": [
        ["[8]", "Public filings / facility records — FCC IBFS SES-LIC-20130124-00089;公開地址或設施清單(僅在 operator pages 缺確切座標時引用)"],
        ["[9]", "Public geospatial pages — Wikipedia / Wikidata for Svalbard、Troll、Tromso、Awarua、Fuchsstadt Earth Station 等"],
        ["[10]", "Gateway press / news evidence — Orange Martinique、Speedcast Cali、SpaceNews Peru gateway"],
    ],
    "outro": "完整 URL 列於 markdown 完整版進度報告。",
    "cell_sz": 1800,
})

# 22. 參考資料 — 衛星、標準與地形
SLIDES.append({
    "kind": "table",
    "title": "參考資料 — 衛星、標準與地形",
    "intro": None,
    "headers": ["Ref", "Source"],
    "col_widths": [700000, 10600000],
    "rows": [
        ["[2]", "CelesTrak public GP / SATCAT — celestrak.org/NORAD/elements/gp.php + satcat.csv"],
        ["[3]", "3GPP TR 38.811、TR 38.821 — 3gpp.org/ftp/Specs/archive/38_series/"],
        ["[4]", "ITU-R recommendations P.618 / P.676 / P.838 / P.835 / P.837 / P.839 / P.840 / S.1528 / S.465 via itu.int/rec/"],
        ["[5]", "Terrain / elevation — NASA / USGS SRTM 1″ DEM via earthexplorer.usgs.gov;Open-Elevation"],
    ],
    "outro": "完整 URL 列於 markdown 完整版進度報告。",
    "cell_sz": 1800,
})

# 23. 附錄 — 工程驗證依據
SLIDES.append({
    "kind": "table",
    "title": "附錄 — 工程驗證依據",
    "intro": "本頁不是外部引用來源;只說明本簡報的系統設定、測試數字與基準在專案內哪裡查到。",
    "headers": ["依據", "用途"],
    "col_widths": [4200000, 7100000],
    "rows": [
        ["multi-orbit-public-registry-sources.md", "站點 URL / source snippet / coordinate / capability evidence"],
        ["tle-first-fidelity-uplift.md §7 / §11 / §12.1", "待開發、風險、spike gate"],
        ["slice-0-baseline.md §6.2", "5 組代表路徑面板基準值"],
        ["spike-S1-cap-cadence-perf.md", "LEO cap / cadence p95 測試結果"],
        ["runtime-projection-csv.ts", "CSV 欄位與稽核匯出格式"],
        ["runtime-data-completeness.ts", "來源脈絡 / non-claim / 缺資料狀態"],
    ],
    "outro": "此頁列內部專案文件路徑,非外部引用來源。",
    "cell_sz": 1600,
})


# ---------------- XML helpers ----------------

def rpr_xml(sz: int | None = None, bold: bool = False, kern: bool = False, color: str | None = None) -> str:
    attrs = ['lang="en-US"', 'altLang="zh-TW"']
    if kern:
        attrs.append('kern="0"')
    if sz is not None:
        attrs.append(f'sz="{sz}"')
    if bold:
        attrs.append('b="1"')
    attrs.append('dirty="0"')
    fill = f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>' if color else ''
    return f'<a:rPr {" ".join(attrs)}>{fill}{FONT_RPR}</a:rPr>'


def run_xml(text: str, sz: int | None = None, bold: bool = False, kern: bool = False, color: str | None = None) -> str:
    return f'<a:r>{rpr_xml(sz=sz, bold=bold, kern=kern, color=color)}<a:t>{xml_escape(text)}</a:t></a:r>'


def end_para_rpr(sz: int | None = None) -> str:
    attrs = ['lang="zh-TW"', 'altLang="en-US"']
    if sz is not None:
        attrs.append(f'sz="{sz}"')
    attrs.append('dirty="0"')
    return f'<a:endParaRPr {" ".join(attrs)}>{FONT_RPR}</a:endParaRPr>'


def title_sp(text: str) -> str:
    """Standard title placeholder."""
    return f'''<p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="標題 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>{run_xml(text, kern=True)}{end_para_rpr()}</a:p>
        </p:txBody>
      </p:sp>'''


def textbox_sp(sp_id: int, sp_name: str, x: int, y: int, w: int, h: int, paragraphs: list[str]) -> str:
    """Manual text box at fixed position."""
    body = "".join(paragraphs)
    return f'''<p:sp>
        <p:nvSpPr>
          <p:cNvPr id="{sp_id}" name="{sp_name}"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t"><a:normAutofit/></a:bodyPr>
          <a:lstStyle/>
          {body}
        </p:txBody>
      </p:sp>'''


def bullet_para(text: str, sz: int = 2000, level: int = 0) -> str:
    """Paragraph with bullet (uses ・/· bullet from default Symbol)."""
    indent = level * 285750
    ppr = f'<a:pPr marL="{indent + 285750}" indent="-285750"><a:buFont typeface="Symbol" panose="05050102010706020507" pitchFamily="18" charset="2"/><a:buChar char="·"/></a:pPr>'
    return f'<a:p>{ppr}{run_xml(text, sz=sz)}</a:p>'


def plain_para(text: str, sz: int = 2000) -> str:
    """Paragraph without bullet."""
    return f'<a:p>{run_xml(text, sz=sz)}</a:p>'


def table_xml(x: int, y: int, w: int, headers: list[str], col_widths: list[int],
              rows: list[list[str]], cell_sz: int = 2000, header_sz: int | None = None) -> str:
    """Table as p:graphicFrame."""
    if header_sz is None:
        header_sz = cell_sz
    total_w = sum(col_widths)
    row_h_header = 500000
    row_h_body = 450000
    total_h = row_h_header + len(rows) * row_h_body

    grid_cols = "".join(f'<a:gridCol w="{cw}"><a:extLst><a:ext uri="{{9D8B030D-6E8A-4147-A177-3AD203B41FA5}}"><a16:colId xmlns:a16="http://schemas.microsoft.com/office/drawing/2014/main" val="{1000000 + i}"/></a:ext></a:extLst></a:gridCol>' for i, cw in enumerate(col_widths))

    def cell(text: str, sz: int, bold: bool = False, bg: str | None = None) -> str:
        fill_xml = f'<a:solidFill><a:srgbClr val="{bg}"/></a:solidFill>' if bg else ''
        color = "FFFFFF" if bold else None
        return f'''<a:tc>
          <a:txBody>
            <a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="ctr"><a:normAutofit/></a:bodyPr>
            <a:lstStyle/>
            <a:p>{run_xml(text, sz=sz, bold=bold, color=color)}</a:p>
          </a:txBody>
          <a:tcPr>{fill_xml}</a:tcPr>
        </a:tc>'''

    header_cells = "".join(cell(h, header_sz, bold=True, bg="1F3864") for h in headers)
    header_row = f'<a:tr h="{row_h_header}">{header_cells}</a:tr>'

    body_rows = ""
    for ri, row in enumerate(rows):
        bg = "EEF3FA" if ri % 2 == 0 else None
        cells = "".join(cell(c, cell_sz, bold=False, bg=bg) for c in row)
        body_rows += f'<a:tr h="{row_h_body}">{cells}</a:tr>'

    return f'''<p:graphicFrame>
        <p:nvGraphicFramePr>
          <p:cNvPr id="100" name="表格"/>
          <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
          <p:nvPr/>
        </p:nvGraphicFramePr>
        <p:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{total_w}" cy="{total_h}"/></p:xfrm>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
            <a:tbl>
              <a:tblPr firstRow="1" bandRow="1"><a:tableStyleId>{TABLE_STYLE_ID}</a:tableStyleId></a:tblPr>
              <a:tblGrid>{grid_cols}</a:tblGrid>
              {header_row}
              {body_rows}
            </a:tbl>
          </a:graphicData>
        </a:graphic>
      </p:graphicFrame>''', total_h


def slide_envelope(body_xml: str) -> str:
    return f'''<?xml version="1.0" encoding="utf-8"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm>
      </p:grpSpPr>
      {body_xml}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>
'''


def make_cover_xml(spec: dict) -> str:
    title_run = run_xml(spec["title"], sz=4000, kern=False)
    subtitle_run = run_xml(spec["subtitle"], sz=2800)
    authors_run = run_xml(spec["authors"], sz=2000)
    sp_title = f'''<p:sp>
      <p:nvSpPr>
        <p:cNvPr id="6146" name="標題 1"/>
        <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
        <p:nvPr><p:ph type="ctrTitle"/></p:nvPr>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="1026952" y="1423554"/><a:ext cx="10138096" cy="1873453"/></a:xfrm>
      </p:spPr>
      <p:txBody>
        <a:bodyPr><a:normAutofit/></a:bodyPr>
        <a:lstStyle/>
        <a:p><a:pPr algn="ctr"/>{title_run}</a:p>
      </p:txBody>
    </p:sp>'''
    sp_subtitle = f'''<p:sp>
      <p:nvSpPr>
        <p:cNvPr id="5" name="文字方塊 4"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="577434" y="3617012"/><a:ext cx="11037131" cy="1287963"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
      </p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square"><a:spAutoFit/></a:bodyPr>
        <a:lstStyle/>
        <a:p><a:pPr algn="ctr"><a:lnSpc><a:spcPct val="150000"/></a:lnSpc></a:pPr>{subtitle_run}</a:p>
        <a:p><a:pPr algn="ctr"><a:lnSpc><a:spcPct val="150000"/></a:lnSpc></a:pPr>{authors_run}</a:p>
        <a:p><a:pPr algn="ctr"><a:lnSpc><a:spcPct val="150000"/></a:lnSpc></a:pPr>{run_xml("日期:2026-05-19   版本:2026-05-19 進度快照", sz=1800)}</a:p>
      </p:txBody>
    </p:sp>'''
    return slide_envelope(sp_title + sp_subtitle)


def make_outline_xml(spec: dict) -> str:
    title_block = title_sp(spec["title"])
    paragraphs = [bullet_para(item, sz=2400) for item in spec["items"]]
    paragraphs.append(f'<a:p>{end_para_rpr(sz=2400)}</a:p>')
    body_block = textbox_sp(3, "內容版面配置區 2", 565151, 1021977, 11417300, 5191125, paragraphs)
    return slide_envelope(title_block + body_block)


def make_table_slide_xml(spec: dict) -> str:
    parts = [title_sp(spec["title"])]
    cur_y = TITLE_BOTTOM_Y + 60000  # small gap below title

    # Intro text box (if any)
    if spec.get("intro"):
        intro_para = plain_para(spec["intro"], sz=2000)
        intro_h = 600000
        parts.append(textbox_sp(3, "前言", CONTENT_X, cur_y, CONTENT_W, intro_h, [intro_para]))
        cur_y += intro_h - 100000

    # Table
    cell_sz = spec.get("cell_sz", 2000)
    if spec.get("headers"):
        table_block, table_h = table_xml(
            x=CONTENT_X,
            y=cur_y,
            w=CONTENT_W,
            headers=spec["headers"],
            col_widths=spec["col_widths"],
            rows=spec["rows"],
            cell_sz=cell_sz,
        )
        parts.append(table_block)
        cur_y += table_h + 80000

    # Outro text box (if any)
    if spec.get("outro"):
        outro_paras = [plain_para(line, sz=1700) for line in spec["outro"].split("\n")]
        outro_h = max(450000, len(outro_paras) * 360000)
        # Clamp y so outro stays inside slide
        if cur_y + outro_h > SLIDE_H - 200000:
            cur_y = SLIDE_H - 200000 - outro_h
        parts.append(textbox_sp(4, "備註", CONTENT_X, cur_y, CONTENT_W, outro_h, outro_paras))

    return slide_envelope("\n".join(parts))


# ---------------- orchestration ----------------

def main() -> None:
    slides_dir = UNPACK / "ppt" / "slides"
    rels_dir = slides_dir / "_rels"

    for f in slides_dir.glob("slide*.xml"):
        f.unlink()
    for f in rels_dir.glob("slide*.xml.rels"):
        f.unlink()

    pres_rels_path = UNPACK / "ppt" / "_rels" / "presentation.xml.rels"
    pres_rels = pres_rels_path.read_text(encoding="utf-8")
    pres_rels = re.sub(
        r'\s*<Relationship[^>]*Type="[^"]*relationships/slide"[^>]*/>',
        "",
        pres_rels,
    )
    pres_rels_path.write_text(pres_rels, encoding="utf-8")

    ct_path = UNPACK / "[Content_Types].xml"
    ct = ct_path.read_text(encoding="utf-8")
    ct = re.sub(
        r'\s*<Override[^>]*PartName="/ppt/slides/slide\d+\.xml"[^>]*/>',
        "",
        ct,
    )
    ct_path.write_text(ct, encoding="utf-8")

    existing_rids = [int(m) for m in re.findall(r'Id="rId(\d+)"', pres_rels)]
    next_rid = max(existing_rids) + 1 if existing_rids else 1

    sld_id_entries: list[str] = []
    next_sld_id = 256

    layout_cover = '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
    layout_outline = '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/>'

    for i, spec in enumerate(SLIDES, start=1):
        slide_name = f"slide{i}.xml"
        slide_path = slides_dir / slide_name
        rels_path = rels_dir / f"{slide_name}.rels"

        if spec["kind"] == "cover":
            slide_path.write_text(make_cover_xml(spec), encoding="utf-8")
            layout_rel = layout_cover
        elif spec["kind"] == "outline":
            slide_path.write_text(make_outline_xml(spec), encoding="utf-8")
            layout_rel = layout_outline
        elif spec["kind"] == "table":
            slide_path.write_text(make_table_slide_xml(spec), encoding="utf-8")
            layout_rel = layout_outline
        else:
            raise ValueError(spec["kind"])

        rels_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  {layout_rel}
</Relationships>'''
        rels_path.write_text(rels_xml, encoding="utf-8")

        ct = ct_path.read_text(encoding="utf-8")
        override = f'<Override PartName="/ppt/slides/{slide_name}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        ct = ct.replace("</Types>", f"  {override}\n</Types>")
        ct_path.write_text(ct, encoding="utf-8")

        pres_rels = pres_rels_path.read_text(encoding="utf-8")
        new_rel = f'<Relationship Id="rId{next_rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/{slide_name}"/>'
        pres_rels = pres_rels.replace("</Relationships>", f"  {new_rel}\n</Relationships>")
        pres_rels_path.write_text(pres_rels, encoding="utf-8")

        sld_id_entries.append(f'    <p:sldId id="{next_sld_id}" r:id="rId{next_rid}"/>')
        next_sld_id += 1
        next_rid += 1

    pres_xml_path = UNPACK / "ppt" / "presentation.xml"
    pres_xml = pres_xml_path.read_text(encoding="utf-8")
    new_sld_list = "<p:sldIdLst>\n" + "\n".join(sld_id_entries) + "\n  </p:sldIdLst>"
    pres_xml = re.sub(
        r'<p:sldIdLst>.*?</p:sldIdLst>',
        new_sld_list,
        pres_xml,
        flags=re.DOTALL,
    )
    pres_xml_path.write_text(pres_xml, encoding="utf-8")

    print(f"Wrote {len(SLIDES)} slides into {UNPACK}")


if __name__ == "__main__":
    main()
