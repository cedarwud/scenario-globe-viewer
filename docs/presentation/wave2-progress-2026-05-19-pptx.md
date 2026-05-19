# wave-2 進度報告 pptx 版面摘要

簡報檔:`wave2-progress-2026-05-19.pptx`
版型:`docs/presentation/template.pptx` (Times New Roman + 標楷體;13.33" × 7.5" 16:9)
產生方式:`/tmp/wave2-pptx-build.py` (template unpack → 改寫 slide XML → pack)
共 23 張投影片;每張投影片的 title + 條列內容對應 `wave2-progress-2026-05-19.md` 同名段落。

| # | 標題 | 對應 markdown 完整版 section |
| --- | --- | --- |
| 1 | Selected-pair 公開軌道資料模擬 — wave 2 進度報告 (cover) | Slide 1 |
| 2 | 簡報結構 (outline) | Slide 1 後半 + slide 結構列表 |
| 3 | 名詞說明 | Slide 2 |
| 4 | 站點標記規則 | Slide 3 |
| 5 | 站點篩選條件 | Slide 4 |
| 6 | 站點命名規則 | Slide 5 |
| 7 | 站點資訊卡 | Slide 6 |
| 8 | Selected-pair 衛星篩選 | Slide 7 |
| 9 | Selected-pair 顯示取捨 | Slide 8 |
| 10 | Selected-pair 軌跡與可視窗 | Slide 9 |
| 11 | Selected-pair 連線與傳輸模型 | Slide 10 |
| 12 | Selected-pair 真實性邊界 | Slide 11 |
| 13 | Download CSV 稽核資料 | Slide 12 |
| 14 | Rain rate 控制重點 | Slide 13 |
| 15 | 公開軌道資料模擬目標 | Slide 14 |
| 16 | 目前已完成基礎 | Slide 15 (markdown 含截圖;pptx 此版未嵌入,需手動加) |
| 17 | 仍在開發與待確認 | Slide 16 |
| 18 | 目前可驗證證據 | Slide 17 |
| 19 | 資料可信度說明 | Slide 18 |
| 20 | 參考資料 — 站點公開來源 | Slide 19 |
| 21 | 參考資料 — 站點補充來源 | Slide 20 |
| 22 | 參考資料 — 衛星、標準與地形 | Slide 21 |
| 23 | 附錄 — 工程驗證依據 | Slide 22 |

## 版面決策

- 標題保留 markdown 原版正式段落名,不口語化
- 表格內容轉成條列 (template 沒有 table layout);兩層條列 (`<a:pPr lvl="0..1">`)
- 字型:Latin = `Times New Roman`、East Asian = `標楷體`,於每個 `<a:rPr>` 同時宣告 `<a:latin>` 與 `<a:ea>`,讓 PowerPoint 自動依字符語系切換
- 內文字級:1500–1800 (依條列密度逐張調整),title 沿用 template 既有 large title 樣式

## 已知差異

- Slide 16「目前已完成基礎」原 markdown 版含 `current-selected-pair-overview.png` 截圖;pptx 此版未嵌入,如需要可在 PowerPoint 中手動插入或下次 build 加入 `addImage` step
- 原 markdown 版 22 張 + section divider 概念,pptx 版採 23 張無 section divider 結構

## 重建方式

```bash
cp -r /tmp/template-unpack /tmp/wave2-build  # 重新展開 template
python3 /tmp/wave2-pptx-build.py             # 重寫 slide XML
python3 ~/.claude/skills/pptx/scripts/clean.py /tmp/wave2-build
python3 ~/.claude/skills/pptx/scripts/office/pack.py \
  /tmp/wave2-build docs/presentation/wave2-progress-2026-05-19.pptx \
  --original docs/presentation/template.pptx
```
