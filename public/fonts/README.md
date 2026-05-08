This directory contains a V4.11-specific CJK subset of Noto Sans TC for
offline visual-smoke rendering.

- `noto-sans-tc-m8a-v411-subset.ttf`
- Source family: Noto Sans TC (NotoSansTC-VF.ttf, variable font)
- License: SIL Open Font License 1.1
- Scope: glyph fallback for the Chinese labels used by the M8A V4.11
  Correction A rail, inspector, scene cues, W4 candidate token, and the
  Phase 2 inspector validation badge (`驗證狀態：待補`). The V4.11 Phase 4
  regeneration extended the subset to cover every CJK codepoint that
  appears in `src/runtime/m8a-v411-*.ts` and
  `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`,
  closing the 狀/態/補/成/未/組 fallback gap observed in the Phase 2
  inspector header capture (`output/m8a-v4.11-impl-phase2/inspector-header-detail-1440x900.png`).
