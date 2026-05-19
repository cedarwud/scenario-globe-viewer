# 進度報告 pptx 版面摘要

簡報檔:`wave2-progress-2026-05-19.pptx`
版型:`docs/presentation/template.pptx` (Times New Roman + 標楷體;13.33" × 7.5" 16:9)
產生方式:`docs/presentation/wave2-progress-2026-05-19-assets/build-pptx.py` (template unpack → 改寫 slide XML → pack)
共 23 張投影片;每張 title + 表格 + 備註對應 `wave2-progress-2026-05-19.md` 同名段落。

## 投影片清單

| # | 標題 | 對應 markdown 完整版 section |
| --- | --- | --- |
| 1 | 多軌道衛星-地面站連線模擬展示 — 進度報告 (cover) | Slide 1 |
| 2 | 報告大綱 | 結構導覽 |
| 3 | 名詞說明 | Slide 2 |
| 4 | 站點標記規則 | Slide 3 |
| 5 | 站點篩選條件 | Slide 4 |
| 6 | 站點命名規則 | Slide 5 |
| 7 | 站點資訊卡 | Slide 6 |
| 8 | 地面站對衛星篩選 | Slide 7 |
| 9 | 地面站對顯示取捨 | Slide 8 |
| 10 | 地面站對軌跡與可視窗 | Slide 9 |
| 11 | 地面站對連線與傳輸模型 | Slide 10 |
| 12 | 地面站對結果可信度邊界 | Slide 11 |
| 13 | 通訊稽核 CSV 匯出 | Slide 12 |
| 14 | 雨衰滑桿 (Rain rate) 控制重點 | Slide 13 |
| 15 | 公開軌道資料模擬目標 | Slide 14 |
| 16 | 目前已完成基礎 | Slide 15 |
| 17 | 仍在開發與待確認 | Slide 16 |
| 18 | 目前可驗證證據 | Slide 17 |
| 19 | 資料可信度說明 | Slide 18 |
| 20 | 參考資料 — 站點公開來源 | Slide 19 |
| 21 | 參考資料 — 站點補充來源 | Slide 20 |
| 22 | 參考資料 — 衛星、標準與地形 | Slide 21 |
| 23 | 附錄 — 工程驗證依據 | Slide 22 |

## 版面與用字決策

- 版型:全部 content slides 使用 `slideLayout2.xml` (Title + Object),與「報告大綱」一頁同款。
- 內文:每張 content slide = 引言 (1 行) + 表格 + 備註 (1–3 行)。
- 字型:Latin = `Times New Roman`、East Asian = `標楷體`,於每個 `<a:rPr>` 同時宣告。
- 內文字級:base 20pt (sz=2000);表格欄位密度高時降至 16–18pt。
- 表格:用 `<p:graphicFrame>` + table XML 嵌入;header 列為深藍底白字,內容列交替淺藍底。
- 用字:
  - 不用內部開發階段詞 (例如 「wave 2」),改用 「進度報告 — 2026-05-19」。
  - 不用 internal feature 名稱 「Selected-pair」,改用 「地面站對」 (首次出現附 Station Pair 英對照)。
  - 不出現客戶代稱;報告中講案件本質「多軌道衛星-地面站連線模擬展示」。

## 已知差異與後續

- Slide 16 markdown 完整版含 `current-selected-pair-overview.png` 截圖;pptx 此版未嵌入,PowerPoint 開啟後可手動插入。
- 排版 layout overflow 風險:slides 內文較密的頁(slide 11, 13)cell_sz 降至 16pt;若實機 PowerPoint 顯示溢出,可再降字級。
- 此檔為 layout summary,字串細節以 build-pptx.py 中 SLIDES dict 為準。

## 重建方式

```bash
cp -r /tmp/template-unpack /tmp/wave2-build2  # 或重新 unpack template.pptx
python3 docs/presentation/wave2-progress-2026-05-19-assets/build-pptx.py
python3 ~/.claude/skills/pptx/scripts/clean.py /tmp/wave2-build2
python3 ~/.claude/skills/pptx/scripts/office/pack.py \
  /tmp/wave2-build2 docs/presentation/wave2-progress-2026-05-19.pptx \
  --original docs/presentation/template.pptx
```
