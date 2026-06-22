// Evidence-report stylesheet — extracted verbatim from
// buildRuntimeProjectionEvidenceReportHtml so the renderer stays navigable.
// Pure static CSS, no interpolation. The byte-exact golden
// (tests/unit/runtime-projection-evidence-report-golden.test.mjs) guards that
// this extraction changed nothing in the delivered report.
export const EVIDENCE_REPORT_STYLES = `    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
    :root {
      color-scheme: dark;
      --bg-base: #060e18;
      --bg-gradient: linear-gradient(135deg, #060e18 0%, #0c1a2c 100%);
      --bg-surface: rgba(12, 26, 42, 0.85);
      --bg-card: rgba(16, 32, 52, 0.6);
      --bg-elevated: rgba(22, 42, 66, 0.7);
      --border-subtle: rgba(157, 196, 232, 0.12);
      --border-default: rgba(157, 196, 232, 0.18);
      --border-accent: rgba(52, 211, 153, 0.4);
      --text-primary: #f1f5f9;
      --text-secondary: #cbd5e1;
      --text-muted: #8ba2bd;
      --accent: #34d399;
      --accent-dim: #059669;
      --accent-glow: rgba(52, 211, 153, 0.15);
      --tone-ok: #34d399;
      --tone-warn: #f59e0b;
      --tone-info: #3b82f6;
      --tone-ok-bg: rgba(52, 211, 153, 0.08);
      --tone-warn-bg: rgba(245, 158, 11, 0.08);
      --tone-info-bg: rgba(59, 130, 246, 0.08);
      --tone-model: #60a5fa;
      --tone-model-bg: rgba(96, 165, 250, 0.085);
      --tone-public: #34d399;
      --tone-public-bg: rgba(52, 211, 153, 0.075);
      --tone-standard: #a78bfa;
      --tone-standard-bg: rgba(167, 139, 250, 0.075);
      --tone-display: #fbbf24;
      --tone-display-bg: rgba(251, 191, 36, 0.075);
      --tone-gap: #fb7185;
      --tone-gap-bg: rgba(251, 113, 133, 0.09);
      font-family: Inter, system-ui, -apple-system, sans-serif;
      background: var(--bg-base);
      color: var(--text-primary);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg-gradient);
      color: var(--text-primary);
      min-height: 100vh;
      font-size: 19px;
      line-height: 1.6;
    }
    header {
      background: linear-gradient(180deg, rgba(52, 211, 153, 0.06) 0%, transparent 100%);
      border-bottom: 1px solid var(--border-subtle);
    }
    .report-header {
      max-width: 1440px;
      margin: 0 auto;
      padding: 14px 24px 10px;
    }
    .header-top {
      display: flex;
      gap: 14px;
      align-items: center;
      justify-content: space-between;
    }
    .header-top > div:first-child {
      min-width: 0;
      flex: 1 1 auto;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: Outfit, sans-serif;
      letter-spacing: 0;
    }
    h1 {
      max-width: none;
      margin: 0 0 6px;
      font-size: clamp(19px, 2vw, 24px);
      font-weight: 800;
      line-height: 1.16;
      letter-spacing: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-primary);
    }
    h2, h3 {
      margin: 28px 0 14px;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.25;
      letter-spacing: 0;
      color: var(--text-primary);
    }
    p { line-height: 1.6; }
    .meta {
      color: var(--text-muted);
      margin: 0;
      font-size: 15px;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .report-actions {
      display: flex;
      flex: 0 0 auto;
      gap: 12px;
      align-items: center;
    }
    .report-button {
      min-height: 38px;
      padding: 0 16px;
      border: 1px solid var(--accent-dim);
      border-radius: 8px;
      background: var(--accent-dim);
      color: #ffffff;
      font: inherit;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0;
      cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
    }
    .report-button:hover {
      background: var(--accent);
      box-shadow: 0 0 16px var(--accent-glow);
    }
    .report-button--secondary {
      background: var(--bg-card);
      border-color: var(--border-default);
      color: var(--text-secondary);
    }
    .report-button--secondary:hover {
      background: var(--bg-elevated);
      border-color: var(--border-accent);
      color: var(--text-primary);
    }
    .json-explorer-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .truth-chip {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--border-default);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 700;
      line-height: 1.4;
      vertical-align: middle;
      white-space: nowrap;
    }
    .truth-chip[data-tone="model"] {
      border-color: rgba(96, 165, 250, 0.45);
      background: var(--tone-model-bg);
      color: #bfdbfe;
    }
    .truth-chip[data-tone="public"],
    .truth-chip[data-tone="external"] {
      border-color: rgba(52, 211, 153, 0.45);
      background: var(--tone-public-bg);
      color: #a7f3d0;
    }
    .truth-chip[data-tone="standard"] {
      border-color: rgba(167, 139, 250, 0.45);
      background: var(--tone-standard-bg);
      color: #ddd6fe;
    }
    .truth-chip[data-tone="display"] {
      border-color: rgba(251, 191, 36, 0.45);
      background: var(--tone-display-bg);
      color: #fde68a;
    }
    .truth-chip[data-tone="gap"] {
      border-color: rgba(251, 113, 133, 0.55);
      background: var(--tone-gap-bg);
      color: #fecdd3;
    }
    .source-issue-marker {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      margin: 6px 8px 6px 0;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(248, 113, 113, 0.45);
      background: rgba(248, 113, 113, 0.1);
      color: #fecaca;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.4;
      vertical-align: middle;
    }
    .source-issue-marker:focus-visible {
      outline: 2px solid rgba(248, 113, 113, 0.65);
      outline-offset: 2px;
    }
    .lineage-panel,
    .field-guide {
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      background: var(--bg-card);
      padding: 18px;
      margin: 0 0 22px;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }
    .lineage-panel__header {
      display: flex;
      gap: 10px;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .lineage-panel__header span {
      color: var(--text-muted);
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .lineage-panel__header strong {
      color: var(--text-primary);
      font-size: 19px;
    }
    .lineage-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      min-width: 0;
    }
    .lineage-item {
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.025);
      padding: 14px;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .lineage-item:has(.truth-chip[data-tone="model"]) {
      border-left: 3px solid rgba(96, 165, 250, 0.62);
      background: linear-gradient(90deg, rgba(96, 165, 250, 0.045), rgba(255, 255, 255, 0.018));
    }
    .lineage-item:has(.truth-chip[data-tone="public"]),
    .lineage-item:has(.truth-chip[data-tone="external"]) {
      border-left: 3px solid rgba(52, 211, 153, 0.62);
      background: linear-gradient(90deg, rgba(52, 211, 153, 0.04), rgba(255, 255, 255, 0.018));
    }
    .lineage-item:has(.truth-chip[data-tone="standard"]) {
      border-left: 3px solid rgba(167, 139, 250, 0.58);
      background: linear-gradient(90deg, rgba(167, 139, 250, 0.04), rgba(255, 255, 255, 0.018));
    }
    .lineage-item:has(.truth-chip[data-tone="display"]) {
      border-left: 3px solid rgba(251, 191, 36, 0.58);
      background: linear-gradient(90deg, rgba(251, 191, 36, 0.04), rgba(255, 255, 255, 0.018));
    }
    .lineage-item:has(.truth-chip[data-tone="gap"]) {
      border-left: 3px solid rgba(251, 113, 133, 0.7);
      background: linear-gradient(90deg, rgba(251, 113, 133, 0.055), rgba(255, 255, 255, 0.018));
    }
    .lineage-item__top {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
    }
    .lineage-label {
      font-weight: 800;
      color: var(--text-primary);
    }
    .lineage-item p {
      margin: 8px 0;
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .lineage-sources {
      display: block;
      color: var(--text-muted);
      font-family: "IBM Plex Mono", monospace;
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .evidence-detail-panel {
      margin: 12px 0 0;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(15, 23, 42, 0.76);
      box-shadow: inset 3px 0 0 rgba(56, 189, 248, 0.52);
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow-wrap: anywhere;
    }
    .evidence-detail-panel div {
      display: grid;
      grid-template-columns: minmax(118px, 0.26fr) minmax(0, 1fr);
      gap: 14px;
      padding: 9px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      min-width: 0;
    }
    .evidence-detail-panel div:last-child { border-bottom: 0; }
    .evidence-detail-panel dt {
      color: var(--text-primary);
      font-weight: 800;
      font-size: 15px;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .evidence-detail-panel dd {
      margin: 0;
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.55;
      min-width: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .evidence-detail-panel--stacked div,
    #handover .evidence-detail-panel div {
      display: block;
      padding: 10px 0 12px;
    }
    .evidence-detail-panel--stacked dt,
    #handover .evidence-detail-panel dt {
      display: block;
      margin-bottom: 3px;
      color: #7dd3fc;
    }
    .evidence-detail-panel--stacked dd,
    #handover .evidence-detail-panel dd {
      display: block;
    }
    .field-guide .table-wrap {
      margin-top: 10px;
      border-color: rgba(56, 189, 248, 0.22);
      background: rgba(15, 23, 42, 0.62);
    }
    .field-guide-table {
      margin-top: 12px;
      border: 1px solid rgba(56, 189, 248, 0.22);
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.62);
      overflow: hidden;
    }
    .field-guide-table__head,
    .field-guide-table__row {
      display: grid;
      grid-template-columns: minmax(150px, 0.75fr) repeat(3, minmax(0, 1fr));
      min-width: 0;
    }
    .field-guide-table__head {
      background: rgba(12, 26, 42, 0.97);
      border-bottom: 1px solid rgba(56, 189, 248, 0.18);
    }
    .field-guide-table__head span {
      color: var(--accent);
      font-size: 15px;
      font-weight: 800;
      line-height: 1.35;
      text-transform: uppercase;
    }
    .field-guide-table__head span:nth-child(2),
    .field-guide-table__row span:nth-child(2) {
      background: rgba(96, 165, 250, 0.035);
    }
    .field-guide-table__head span:nth-child(3),
    .field-guide-table__row span:nth-child(3) {
      background: rgba(52, 211, 153, 0.035);
    }
    .field-guide-table__head span:nth-child(4),
    .field-guide-table__row span:nth-child(4) {
      background: rgba(245, 158, 11, 0.035);
    }
    .field-guide-table__row {
      border-top: 1px solid rgba(255, 255, 255, 0.075);
    }
    .field-guide-table__row:first-of-type {
      border-top: 0;
    }
    .field-guide-table__row:nth-child(odd) {
      background: rgba(255, 255, 255, 0.018);
    }
    .field-guide-table__head span,
    .field-guide-table__row strong,
    .field-guide-table__row span {
      padding: 13px 14px;
      border-left: 1px solid rgba(255, 255, 255, 0.055);
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .field-guide-table__head span:first-child,
    .field-guide-table__row strong:first-child {
      border-left: 0;
    }
    .field-guide-table__row strong {
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 800;
      line-height: 1.45;
    }
    .field-guide-table__row span {
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.55;
    }
    .toolbar-actions {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 10px;
    }
    .detail-toggle-control {
      display: inline-flex;
      min-height: 38px;
      align-items: center;
      gap: 10px;
      padding: 0 12px;
      border: 1px solid var(--border-default);
      border-radius: 8px;
      background: var(--bg-card);
      color: var(--text-secondary);
      cursor: pointer;
      user-select: none;
    }
    .detail-toggle-control:hover {
      border-color: var(--border-accent);
      color: var(--text-primary);
    }
    .detail-toggle-knob {
      width: 38px;
      height: 20px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      position: relative;
    }
    .detail-toggle-knob::after {
      content: "";
      position: absolute;
      width: 14px;
      height: 14px;
      top: 3px;
      left: 3px;
      border-radius: 50%;
      background: var(--text-muted);
      transition: transform 0.2s, background 0.2s;
    }
    .evidence-detail-label {
      font-size: 16px;
      font-weight: 700;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      background: rgba(6, 14, 24, 0.92);
      border-bottom: 1px solid var(--border-subtle);
      backdrop-filter: blur(12px);
    }
    .toolbar-inner {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;
      align-items: center;
      padding: 8px 24px;
    }
    [role="tablist"] {
      display: flex;
      flex: 1 1 auto;
      flex-wrap: nowrap;
      gap: 6px;
      min-width: 0;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    [role="tab"] {
      flex: 0 0 auto;
      min-height: 38px;
      padding: 0 13px;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      background: var(--bg-card);
      color: var(--text-secondary);
      font: inherit;
      font-size: 16px;
      cursor: pointer;
      letter-spacing: 0;
      transition: all 0.15s;
    }
    [role="tab"]:hover {
      border-color: var(--border-accent);
      color: var(--text-primary);
    }
    [role="tab"][aria-selected="true"] {
      border-color: var(--accent);
      background: var(--accent-glow);
      color: var(--accent);
      font-weight: 600;
      box-shadow: 0 0 12px var(--accent-glow);
    }
    input[type="search"] {
      flex: 0 0 260px;
      min-height: 38px;
      min-width: 220px;
      margin-left: 0;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      background: var(--bg-card);
      color: var(--text-primary);
      font: inherit;
      font-size: 16px;
      letter-spacing: 0;
      outline: none;
      transition: border-color 0.15s;
    }
    input[type="search"]::placeholder {
      color: var(--text-muted);
    }
    input[type="search"]:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }
    main {
      max-width: 1440px;
      margin: 0 auto;
      padding: 26px 24px 54px;
    }
    .panel-layout {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      gap: 24px;
      align-items: start;
    }
    .panel-content {
      min-width: 0;
    }
    .panel-content > h3 {
      scroll-margin-top: 112px;
    }
    .section-outline {
      position: sticky;
      top: 72px;
      align-self: start;
      max-height: calc(100vh - 92px);
      overflow: auto;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      background: rgba(12, 26, 42, 0.76);
      padding: 8px;
      backdrop-filter: blur(10px);
    }
    .section-outline__links {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .section-outline__link {
      display: block;
      color: var(--text-secondary);
      text-decoration: none;
      border: 1px solid transparent;
      border-radius: 6px;
      padding: 9px 10px;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.32;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .section-outline__link:hover,
    .section-outline__link:focus-visible,
    .section-outline__link.is-active,
    .section-outline__link[aria-current="location"] {
      color: var(--accent);
      border-color: var(--border-accent);
      background: var(--accent-glow);
      outline: none;
    }
    .section-outline__link.is-active,
    .section-outline__link[aria-current="location"] {
      box-shadow: inset 3px 0 0 var(--accent);
      font-weight: 750;
    }
    .section-outline__link span {
      display: block;
      overflow-wrap: anywhere;
    }
    .summary-grid,
    .evidence-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .metric-card,
    .evidence-card,
    .report-section,
    .callout {
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      background: var(--bg-card);
      backdrop-filter: blur(8px);
      padding: 20px;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .metric-card:hover,
    .evidence-card:hover {
      border-color: var(--border-accent);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    .metric-card span,
    .evidence-card span {
      display: block;
      color: var(--text-muted);
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .metric-card strong,
    .evidence-card strong {
      display: block;
      margin-top: 8px;
      color: #ffffff;
      font-size: clamp(24px, 2.5vw, 30px);
      font-weight: 700;
      line-height: 1.18;
      overflow-wrap: anywhere;
    }
    .metric-card p,
    .evidence-card p,
    .callout p {
      margin: 10px 0 0;
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    .evidence-card[data-tone="ok"] {
      border-left: 3px solid var(--tone-ok);
      background: var(--tone-ok-bg);
    }
    .evidence-card[data-tone="ok"] strong {
      color: var(--tone-ok);
    }
    .evidence-card[data-tone="warn"],
    .callout[data-tone="warn"] {
      border-left: 3px solid var(--tone-warn);
      background: var(--tone-warn-bg);
    }
    .evidence-card[data-tone="warn"] strong {
      color: var(--tone-warn);
    }
    .evidence-card[data-tone="info"],
    .callout[data-tone="info"] {
      border-left: 3px solid var(--tone-info);
      background: var(--tone-info-bg);
    }
    .evidence-card[data-tone="info"] strong {
      color: var(--tone-info);
    }
    .callout strong {
      color: #ffffff;
      font-size: 18px;
    }
    .report-section,
    .callout {
      margin-top: 24px;
    }
    .report-section h3 {
      margin-top: 0;
    }
    .table-wrap {
      width: 100%;
      overflow-x: auto;
      overflow-y: visible;
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      background: var(--bg-card);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 17px;
    }
    th,
    td {
      padding: 16px 18px;
      border-bottom: 1px solid var(--border-subtle);
      text-align: left;
      vertical-align: top;
    }
    th {
      background: rgba(12, 26, 42, 0.97);
      color: var(--accent);
      font-weight: 600;
      font-size: 15px;
      letter-spacing: 0;
      text-transform: uppercase;
      white-space: nowrap;
    }
    td {
      color: var(--text-secondary);
      overflow-wrap: anywhere;
      line-height: 1.5;
    }
    tbody tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.018);
    }
    tbody tr:has(.truth-chip[data-tone="model"]) {
      box-shadow: inset 3px 0 0 rgba(96, 165, 250, 0.5);
    }
    tbody tr:has(.truth-chip[data-tone="public"]),
    tbody tr:has(.truth-chip[data-tone="external"]) {
      box-shadow: inset 3px 0 0 rgba(52, 211, 153, 0.5);
    }
    tbody tr:has(.truth-chip[data-tone="standard"]) {
      box-shadow: inset 3px 0 0 rgba(167, 139, 250, 0.48);
    }
    tbody tr:has(.truth-chip[data-tone="display"]) {
      box-shadow: inset 3px 0 0 rgba(251, 191, 36, 0.5);
    }
    tbody tr:has(.truth-chip[data-tone="gap"]) {
      background: linear-gradient(90deg, rgba(251, 113, 133, 0.045), rgba(255, 255, 255, 0.012));
      box-shadow: inset 3px 0 0 rgba(251, 113, 133, 0.68);
    }
    .model-cards-list {
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin-top: 16px;
      margin-bottom: 32px;
    }
    .model-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    .model-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.02);
      padding: 16px 24px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .model-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .model-kind-badge {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0;
      font-weight: 600;
      color: var(--accent);
      background: rgba(52, 211, 153, 0.08);
      border: 1px solid rgba(52, 211, 153, 0.2);
      padding: 4px 8px;
      border-radius: 6px;
    }
    .model-name {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
    }
    .model-unit-badge {
      font-size: 15px;
      font-weight: 600;
      color: var(--accent);
      background: rgba(52, 211, 153, 0.06);
      border: 1px solid rgba(52, 211, 153, 0.15);
      padding: 6px 12px;
      border-radius: 8px;
      font-family: var(--font-mono, monospace);
    }
    .model-unit-badge.term-contribution {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.06);
      border-color: rgba(56, 189, 248, 0.15);
    }
    .model-card-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      padding: 24px;
    }
    @media (max-width: 900px) {
      .model-card-body {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }
    .model-info-column {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .meta-grid {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .meta-label {
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0;
      color: var(--text-muted);
    }
    .meta-val.badge {
      font-size: 15px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .badge-ok {
      color: #34d399;
      background: rgba(52, 211, 153, 0.08);
      border: 1px solid rgba(52, 211, 153, 0.15);
    }
    .badge-info {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.15);
    }
    .badge-warn {
      color: #fb7185;
      background: rgba(251, 113, 133, 0.08);
      border: 1px solid rgba(251, 113, 133, 0.15);
    }
    .section-label {
      display: block;
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 8px;
      border-left: 3px solid var(--accent);
      padding-left: 8px;
    }
    .standards-section ul {
      margin: 0;
      padding-left: 18px;
      color: var(--text-secondary);
    }
    .standards-section li {
      font-size: 16px;
      margin-bottom: 4px;
    }
    .non-claim-section p {
      margin: 0;
      font-size: 16px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .model-inputs-column {
      display: flex;
      flex-direction: column;
    }
    .inputs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 10px 12px;
      font-size: 16px;
      line-height: 1.4;
      margin: 6px 0;
    }
    .inputs-item {
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.025);
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: background 0.15s, border-color 0.15s;
    }
    .inputs-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(52, 211, 153, 0.15);
    }
    .inputs-label {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0;
      color: var(--text-muted);
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .inputs-value {
      font-weight: 600;
      color: var(--text-secondary);
      font-family: var(--font-mono, monospace);
      font-size: 16px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    tbody tr {
      transition: background 0.12s;
    }
    tbody tr:hover {
      background: rgba(52, 211, 153, 0.04);
    }
    tr[hidden] { display: none; }
    ul {
      margin-top: 8px;
      line-height: 1.6;
      color: var(--text-secondary);
      padding-left: 20px;
    }
    ul li {
      margin-bottom: 6px;
      font-size: 17px;
    }
    ul li::marker {
      color: var(--accent-dim);
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 16px;
      background: rgba(4, 10, 18, 0.9);
      color: #a5f3c4;
      font-family: "IBM Plex Mono", "Fira Code", monospace;
      font-size: 16px;
      line-height: 1.5;
    }
    .section-desc {
      color: var(--text-secondary);
      font-size: 16px;
      margin-top: -4px;
      margin-bottom: 16px;
      line-height: 1.55;
    }
    .json-explorer {
      font-family: "IBM Plex Mono", "Fira Code", monospace;
      font-size: 16px;
      line-height: 1.6;
      background: rgba(4, 10, 18, 0.95);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 18px;
      color: #cbd5e1;
    }
    .json-node {
      margin-left: 12px;
    }
    .json-node > summary {
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
      list-style: none;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s;
    }
    .json-node > summary::before {
      content: "▶";
      display: inline-block;
      font-size: 12px;
      color: var(--accent-dim);
      transition: transform 0.15s;
    }
    .json-node[open] > summary::before {
      transform: rotate(90deg);
    }
    .json-node > summary:hover {
      background: rgba(52, 211, 153, 0.06);
    }
    .json-children {
      border-left: 1px dashed rgba(126, 226, 184, 0.15);
      margin-left: 10px;
      padding-left: 14px;
      margin-top: 2px;
      margin-bottom: 2px;
    }
    .json-leaf {
      margin-left: 20px;
      padding: 3px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .json-key {
      color: #818cf8; /* lavender/blue */
      font-weight: 500;
    }
    .json-meta {
      color: var(--text-muted);
      font-size: 14px;
      background: rgba(255, 255, 255, 0.04);
      padding: 1px 6px;
      border-radius: 4px;
    }
    .json-val {
      overflow-wrap: anywhere;
    }
    .json-string { color: #34d399; }
    .json-number { color: #f59e0b; }
    .json-boolean { color: #3b82f6; }
    .json-null { color: #ef4444; }
    .json-empty { color: var(--text-muted); }
    .empty { color: var(--text-muted); font-style: italic; }
    /* scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--accent-dim); }

    /* Summary Dashboard styling */
    .summary-dashboard {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    @media (max-width: 900px) {
      .summary-dashboard {
        grid-template-columns: 1fr;
      }
    }
    .dashboard-card {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 24px;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      backdrop-filter: blur(8px);
      transition: all 0.2s;
    }
    .dashboard-card:hover {
      border-color: var(--border-accent);
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    .dashboard-card .card-content {
      flex: 1;
      min-width: 0;
    }
    .dashboard-card .dashboard-detail-row {
      flex: 1 0 100%;
      width: 100%;
      margin-top: 4px;
    }
    .dashboard-card .card-title {
      display: block;
      color: var(--text-muted);
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    .dashboard-card .card-value {
      display: block;
      margin-top: 8px;
      font-size: clamp(28px, 3vw, 36px);
      font-weight: 800;
      color: #ffffff;
      font-family: Outfit, sans-serif;
    }
    .dashboard-card .card-desc {
      margin: 8px 0 0;
      font-size: 16px;
      color: var(--text-muted);
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .dashboard-card .card-visual {
      flex: 0 0 130px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .dashboard-card .card-visual.flex-column {
      flex-direction: column;
      align-items: stretch;
      flex: 0 0 220px;
    }
    .visual-label {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0;
      color: var(--text-muted);
      margin-bottom: 8px;
      font-weight: 600;
      text-align: right;
    }
    
    /* Availability Gauge */
    .availability-gauge-container {
      position: relative;
      width: 120px;
      height: 120px;
    }
    .availability-gauge {
      width: 120px;
      height: 120px;
    }
    
    /* Orbit Distribution Bar */
    .orbit-distribution-container {
      width: 100%;
    }
    .orbit-bar {
      display: flex;
      height: 16px;
      border-radius: 8px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 12px;
    }
    .orbit-bar-segment {
      height: 100%;
      transition: width 0.3s ease;
    }
    .segment-leo {
      background: #fbbf24;
      box-shadow: 0 0 8px rgba(251, 191, 36, 0.3);
    }
    .segment-meo {
      background: #5eead4;
      box-shadow: 0 0 8px rgba(94, 234, 212, 0.3);
    }
    .segment-geo {
      background: #38bdf8;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.3);
    }
    .segment-empty {
      background: rgba(255, 255, 255, 0.05);
    }
    .orbit-legend {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 12px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      font-size: 14px;
      color: var(--text-muted);
      font-weight: 500;
    }
    .legend-item .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .dot-leo { background: #fbbf24; }
    .dot-meo { background: #5eead4; }
    .dot-geo { background: #38bdf8; }

    /* Provenance Badges */
    .badge-provenance {
      font-size: 14px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      margin-left: 8px;
      vertical-align: middle;
      border: 1px solid transparent;
      white-space: nowrap;
    }
    .badge-tier-1 {
      color: #34d399;
      background: rgba(52, 211, 153, 0.08);
      border-color: rgba(52, 211, 153, 0.2);
    }
    .badge-tier-2 {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
      border-color: rgba(56, 189, 248, 0.2);
    }
    .badge-tier-3 {
      color: #94a3b8;
      background: rgba(148, 163, 184, 0.08);
      border-color: rgba(148, 163, 184, 0.2);
    }
    .badge-formula {
      color: #fb923c;
      background: rgba(251, 146, 60, 0.08);
      border-color: rgba(251, 146, 60, 0.2);
    }
    .badge-simulation {
      color: #c084fc;
      background: rgba(192, 132, 252, 0.08);
      border-color: rgba(192, 132, 252, 0.2);
    }

    /* Evidence Detail disclosure */
    .mode-selector {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.03);
      padding: 6px 16px;
      border-radius: 20px;
      border: 1px solid var(--border-subtle);
    }
    .mode-label {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-muted);
      user-select: none;
      transition: color 0.2s;
    }
    .toggle-switch-wrapper {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 22px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 11px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .toggle-switch-slider {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background: var(--text-muted);
      border-radius: 50%;
      transition: transform 0.2s, background 0.2s;
    }

    .context-only,
    .evidence-detail-only {
      display: none !important;
    }
    #evidence-detail-toggle:checked ~ main .context-only,
    #evidence-detail-toggle:checked ~ header .context-only,
    #evidence-detail-toggle:checked ~ .toolbar .context-only,
    #evidence-detail-toggle:checked ~ main .evidence-detail-only,
    #evidence-detail-toggle:checked ~ header .evidence-detail-only,
    #evidence-detail-toggle:checked ~ .toolbar .evidence-detail-only {
      display: block !important;
    }
    #evidence-detail-toggle:checked ~ main span.context-only.badge-provenance {
      display: inline-block !important;
    }
    #evidence-detail-toggle:checked ~ .toolbar .detail-toggle-control {
      color: var(--accent);
      border-color: var(--accent);
      background: var(--accent-glow);
    }
    #evidence-detail-toggle:checked ~ .toolbar .detail-toggle-knob::after {
      transform: translateX(18px);
      background: var(--accent);
    }
    
    #evidence-detail-toggle:checked ~ main div.context-only.context-interpretation {
      display: block !important;
      margin-top: 12px;
      padding: 10px 14px;
      background: rgba(59, 130, 246, 0.08);
      border-left: 3px solid var(--tone-info);
      border-radius: 4px;
      font-size: 16px;
      line-height: 1.5;
      color: var(--text-secondary);
    }

    /* Formulas styling */
    .context-formulas-block {
      margin-top: 24px;
      border-top: 1px solid var(--border-subtle);
      padding-top: 24px;
    }
    .formula-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 18px;
      margin-bottom: 16px;
    }
    .formula-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .formula-header h4 {
      margin: 0;
      font-size: 17px;
      color: #ffffff;
    }
    .badge-standard {
      font-size: 14px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93c5fd;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .formula-math {
      font-family: "IBM Plex Mono", monospace;
      font-size: 16px;
      background: rgba(0,0,0,0.2);
      padding: 10px 14px;
      border-radius: 6px;
      border-left: 3px solid var(--accent);
      color: #a5f3c4;
      margin-bottom: 10px;
      overflow-x: auto;
    }
    .formula-card p {
      margin: 0;
      font-size: 16px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    @media (max-width: 900px) {
      .report-header,
      .toolbar-inner,
      main {
        padding-left: 16px;
        padding-right: 16px;
      }
      .toolbar-inner {
        flex-wrap: wrap;
      }
      [role="tablist"] {
        flex: 1 0 100%;
        order: 0;
      }
      input[type="search"],
      .toolbar-actions {
        order: 1;
      }
      .panel-layout {
        display: block;
      }
      .section-outline {
        position: sticky;
        top: 58px;
        z-index: 1;
        max-height: none;
        margin-bottom: 18px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 10px;
      }
      .section-outline__links {
        flex-direction: row;
        gap: 8px;
        min-width: max-content;
      }
      .section-outline__link {
        white-space: nowrap;
      }
      .header-top {
        flex-direction: column;
        gap: 16px;
      }
      .summary-grid,
      .evidence-grid {
        grid-template-columns: 1fr;
      }
      .lineage-grid {
        grid-template-columns: 1fr;
      }
      .dashboard-card {
        align-items: stretch;
        flex-direction: column;
      }
      .dashboard-card .card-visual,
      .dashboard-card .card-visual.flex-column {
        flex: 0 0 auto;
        width: 100%;
      }
      input[type="search"] {
        margin-left: 0;
        flex: 1 1 220px;
      }
    }
    @media (max-width: 720px) {
      .evidence-detail-panel div {
        grid-template-columns: 1fr;
        gap: 4px;
      }
      .evidence-detail-panel dt {
        color: #7dd3fc;
      }
      .field-guide-table__head {
        display: none;
      }
      .field-guide-table__row {
        display: block;
        padding: 10px 0;
      }
      .field-guide-table__row strong,
      .field-guide-table__row span {
        display: block;
        border-left: 0;
        padding: 7px 12px;
      }
      .field-guide-table__row span::before {
        content: attr(data-label);
        display: block;
        margin-bottom: 3px;
        color: #7dd3fc;
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
      }
    }
    @media (max-width: 560px) {
      [role="tab"] {
        flex: 1 1 auto;
      }
    }
    .back-to-top-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 1px solid var(--accent);
      background: var(--bg-surface);
      color: var(--accent);
      backdrop-filter: blur(12px);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transform: translateY(16px);
      transition: opacity 0.25s, transform 0.25s, background 0.2s, border-color 0.2s, box-shadow 0.2s;
      z-index: 99;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
    .back-to-top-btn:hover {
      background: var(--accent);
      color: #ffffff;
      box-shadow: 0 0 16px var(--accent-glow);
      transform: translateY(-2px);
    }
    .back-to-top-btn:active {
      transform: translateY(0);
    }
    .back-to-top-btn.visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }`;
