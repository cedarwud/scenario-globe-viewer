import { type RuntimeProjectionResult } from "./runtime-projection";
import { EVIDENCE_REPORT_STYLES } from "./runtime-projection-evidence-report-styles";
import {
  escapeHtml,
  formatReportTitleStation,
  durationMs,
  formatIsoShort,
  sanitizeFilenameSegment,
  compactUtcForFilename,
  section
} from "./runtime-projection-evidence-report-html-helpers";
import {
  buildSummaryTab,
  buildVisibilityTab,
  buildRequirementsTab,
  buildHandoverTab,
  buildSourcesTab,
  buildModelsTab,
  buildRuntimeTab
} from "./runtime-projection-evidence-report-tabs";
import { buildAuditTab } from "./runtime-projection-evidence-report-audit";

export function buildRuntimeProjectionEvidenceReportHtml(
  result: RuntimeProjectionResult,
  // Optional injected generation timestamp. Defaults to wall-clock, so every
  // existing single-argument caller stays byte-for-byte identical; the golden
  // test passes a fixed value to make the whole report deterministic. This is
  // the report's only wall-clock input and is excluded from the payload
  // checksum (see the Determinism callout in the Audit & evidence tab).
  generatedAtUtc: string = new Date().toISOString()
): string {
  const title = `${formatReportTitleStation(result.pair.stationA)} - ${formatReportTitleStation(result.pair.stationB)}`;
  const filename = buildRuntimeProjectionEvidenceReportFilename(result);
  const tabs = [
    ["summary", "Summary"],
    ["requirements", "Requirements"],
    ["visibility", "Visibility"],
    ["handover", "Handover"],
    ["sources", "Sources"],
    ["models", "Models"],
    ["audit", "Audit & evidence"],
    ["runtime", "Raw data"]
  ] as const;
  const tabButtons = tabs
    .map(
      ([id, label], index) =>
        `<button type="button" id="tab-${id}" role="tab" data-tab-target="${id}" aria-controls="${id}" aria-selected="${index === 0 ? "true" : "false"}" tabindex="${index === 0 ? "0" : "-1"}">${escapeHtml(label)}</button>`
    )
    .join("");
  const panels = [
    section("summary", "Summary", buildSummaryTab(result), true),
    section("requirements", "Requirements", buildRequirementsTab(result)),
    section("visibility", "Visibility windows", buildVisibilityTab(result)),
    section("handover", "Handover events", buildHandoverTab(result)),
    section("sources", "Sources", buildSourcesTab(result)),
    section("models", "Assumptions & models", buildModelsTab(result)),
    section("audit", "Audit & evidence", buildAuditTab(result, generatedAtUtc)),
    section("runtime", "Runtime data", buildRuntimeTab(result))
  ].join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
${EVIDENCE_REPORT_STYLES}
  </style>
</head>
<body data-report-filename="${escapeHtml(filename)}">
  <input type="checkbox" id="evidence-detail-toggle" aria-label="Evidence Detail" hidden>
  <header>
    <div class="report-header">
      <div class="header-top">
        <div>
          <h1 title="${escapeHtml(title)}">${escapeHtml(title)}</h1>
          <p class="meta">Generated ${escapeHtml(generatedAtUtc)} · ${escapeHtml(formatIsoShort(result.timeWindow.startUtc))} to ${escapeHtml(formatIsoShort(result.timeWindow.endUtc))}</p>
        </div>
        <div class="report-actions">
          <button type="button" class="report-button" data-download-html>Download HTML</button>
        </div>
      </div>
    </div>
  </header>
  <div class="toolbar">
    <div class="toolbar-inner">
      <div role="tablist" aria-label="Evidence report sections">${tabButtons}</div>
      <input type="search" data-report-filter aria-label="Filter active section" placeholder="Filter active section">
      <div class="toolbar-actions">
        <label class="detail-toggle-control" for="evidence-detail-toggle" title="Show methods, assumptions, formulas, and limits">
          <span class="detail-toggle-knob" aria-hidden="true"></span>
          <span class="evidence-detail-label">Evidence Detail</span>
        </label>
      </div>
    </div>
  </div>
  <main>${panels}</main>
  <script>
    (() => {
      const tabs = Array.from(document.querySelectorAll("[data-tab-target]"));
      const panels = Array.from(document.querySelectorAll("[data-tab-panel]"));
      const filter = document.querySelector("[data-report-filter]");
      const toolbar = document.querySelector(".toolbar");
      let activeTabId =
        panels.find((panel) => !panel.hidden)?.dataset.tabPanel ??
        tabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.dataset.tabTarget ??
        "summary";
      const visitedTabs = new Set(activeTabId ? [activeTabId] : []);
      const scrollPositions = new Map();
      let outlineRaf = 0;
      const clearActiveOutlineLinks = () => {
        for (const link of document.querySelectorAll("[data-section-outline-link='true']")) {
          link.classList.remove("is-active");
          link.removeAttribute("aria-current");
        }
      };
      const targetIdFromOutlineLink = (link) => {
        const href = link.getAttribute("href") || "";
        if (!href.startsWith("#")) return "";
        try {
          return decodeURIComponent(href.slice(1));
        } catch {
          return href.slice(1);
        }
      };
      const keepOutlineLinkVisible = (link) => {
        const outline = link.closest(".section-outline");
        if (!outline) return;
        const top = link.offsetTop;
        const bottom = top + link.offsetHeight;
        const viewTop = outline.scrollTop;
        const viewBottom = viewTop + outline.clientHeight;
        if (top < viewTop) {
          outline.scrollTop = Math.max(0, top - 8);
        } else if (bottom > viewBottom) {
          outline.scrollTop = bottom - outline.clientHeight + 8;
        }
        const left = link.offsetLeft;
        const right = left + link.offsetWidth;
        const viewLeft = outline.scrollLeft;
        const viewRight = viewLeft + outline.clientWidth;
        if (left < viewLeft) {
          outline.scrollLeft = Math.max(0, left - 8);
        } else if (right > viewRight) {
          outline.scrollLeft = right - outline.clientWidth + 8;
        }
      };
      const setActiveOutlineLink = (link) => {
        if (!link) return;
        clearActiveOutlineLinks();
        link.classList.add("is-active");
        link.setAttribute("aria-current", "location");
        keepOutlineLinkVisible(link);
      };
      const updateActiveOutline = () => {
        const activePanel = panels.find((panel) => !panel.hidden);
        if (!activePanel) return;
        const links = Array.from(
          activePanel.querySelectorAll("[data-section-outline-link='true']")
        );
        if (links.length === 0) return;
        const probeY = Math.max(
          (toolbar?.getBoundingClientRect().bottom ?? 0) + 72,
          window.innerHeight * 0.18
        );
        let activeLink = links[0];
        const atBottom =
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 4;
        if (atBottom) {
          activeLink = links[links.length - 1];
        } else {
          for (const link of links) {
            const target = document.getElementById(targetIdFromOutlineLink(link));
            if (!target) continue;
            if (target.getBoundingClientRect().top <= probeY) {
              activeLink = link;
            } else {
              break;
            }
          }
        }
        setActiveOutlineLink(activeLink);
      };
      const scheduleActiveOutlineUpdate = () => {
        if (outlineRaf !== 0) return;
        outlineRaf = window.requestAnimationFrame(() => {
          outlineRaf = 0;
          updateActiveOutline();
        });
      };
      const activate = (id) => {
        if (!id || id === activeTabId) {
          return;
        }
        if (activeTabId) {
          scrollPositions.set(activeTabId, window.scrollY);
        }
        const hasVisited = visitedTabs.has(id);
        for (const tab of tabs) {
          const active = tab.dataset.tabTarget === id;
          tab.setAttribute("aria-selected", String(active));
          tab.setAttribute("tabindex", active ? "0" : "-1");
        }
        for (const panel of panels) panel.hidden = panel.dataset.tabPanel !== id;
        activeTabId = id;
        visitedTabs.add(id);
        if (filter) filter.value = "";
        applyFilter("");
        const targetScrollY = hasVisited ? scrollPositions.get(id) ?? 0 : 0;
        window.scrollTo({ top: Math.max(0, targetScrollY), left: 0, behavior: "auto" });
        window.requestAnimationFrame(scheduleActiveOutlineUpdate);
      };
      const applyFilter = (value) => {
        const query = value.trim().toLowerCase();
        const activePanel = panels.find((panel) => !panel.hidden);
        if (!activePanel) return;
        for (const row of activePanel.querySelectorAll("tbody tr")) {
          row.hidden = query.length > 0 && !row.textContent.toLowerCase().includes(query);
        }
      };
      const downloadHtml = () => {
        const filename = document.body.dataset.reportFilename || "selected-pair-evidence-report.html";
        const blob = new Blob(["<!doctype html>\\n" + document.documentElement.outerHTML], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      };
      for (const tab of tabs) {
        tab.addEventListener("click", () => activate(tab.dataset.tabTarget));
        tab.addEventListener("keydown", (event) => {
          const current = tabs.indexOf(tab);
          const previous = (current - 1 + tabs.length) % tabs.length;
          const next = (current + 1) % tabs.length;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            activate(tabs[previous].dataset.tabTarget);
            tabs[previous].focus();
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            activate(tabs[next].dataset.tabTarget);
            tabs[next].focus();
          } else if (event.key === "Home") {
            event.preventDefault();
            activate(tabs[0].dataset.tabTarget);
            tabs[0].focus();
          } else if (event.key === "End") {
            event.preventDefault();
            activate(tabs[tabs.length - 1].dataset.tabTarget);
            tabs[tabs.length - 1].focus();
          }
        });
      }
      for (const link of document.querySelectorAll("[data-section-outline-link='true']")) {
        link.addEventListener("click", () => {
          setActiveOutlineLink(link);
          window.setTimeout(scheduleActiveOutlineUpdate, 0);
        });
      }
      window.addEventListener("scroll", scheduleActiveOutlineUpdate, { passive: true });
      window.addEventListener("resize", scheduleActiveOutlineUpdate);
      updateActiveOutline();
      document.querySelector("[data-download-html]")?.addEventListener("click", downloadHtml);
      filter?.addEventListener("input", () => applyFilter(filter.value));
      document.querySelector("[data-json-expand-all]")?.addEventListener("click", () => {
        for (const details of document.querySelectorAll(".json-explorer details")) {
          details.open = true;
        }
      });
      document.querySelector("[data-json-collapse-all]")?.addEventListener("click", () => {
        for (const details of document.querySelectorAll(".json-explorer details")) {
          details.open = false;
        }
      });
      const backToTopBtn = document.querySelector("[data-back-to-top]");
      if (backToTopBtn) {
        const handleScroll = () => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
          if (scrollTop > 100) {
            backToTopBtn.classList.add("visible");
          } else {
            backToTopBtn.classList.remove("visible");
          }
        };
        window.addEventListener("scroll", handleScroll);
        // Initialize once to guarantee correct state on load/reload
        handleScroll();

        backToTopBtn.addEventListener("click", () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    })();
  </script>
  <button type="button" class="back-to-top-btn" data-back-to-top aria-label="Scroll to top" title="Scroll to top">
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  </button>
</body>
</html>`;
}

export function buildRuntimeProjectionEvidenceReportFilename(
  result: RuntimeProjectionResult
): string {
  const stationAId = sanitizeFilenameSegment(result.pair.stationA.id);
  const stationBId = sanitizeFilenameSegment(result.pair.stationB.id);
  const startUtc = compactUtcForFilename(result.timeWindow.startUtc);
  const windowMs = durationMs(result.timeWindow.startUtc, result.timeWindow.endUtc);
  const durationMinutes =
    windowMs === null ? "unknown" : Math.round(windowMs / 60_000);
  return `runtime-projection-evidence-${stationAId}-${stationBId}-${startUtc}-${durationMinutes}m.html`;
}
