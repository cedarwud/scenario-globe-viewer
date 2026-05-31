// Formatting helpers for the V4 selected-pair projection panel.

export function formatDurationMs(ms: number): string {
  if (ms <= 0) {
    return "0s";
  }
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}s`;
  }
  const minutes = Math.floor(totalSec / 60);
  const sec = totalSec - minutes * 60;
  return sec === 0 ? `${minutes}m` : `${minutes}m ${sec}s`;
}

export function getLocalTimezoneLabel(dateInput?: Date | string): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  const offsetMin = -date.getTimezoneOffset();
  if (offsetMin === 0) return "UTC";
  const sign = offsetMin > 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offsetMin) / 60);
  const mins = Math.abs(offsetMin) % 60;
  const minsStr = mins > 0 ? `:${String(mins).padStart(2, "0")}` : "";
  return `UTC${sign}${hours}${minsStr}`;
}

export function formatIsoShort(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return iso;
  }
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${date} ${hours}:${minutes}:${seconds} (${getLocalTimezoneLabel(d)})`;
}

export function formatIsoSecond(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return iso;
  }
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${date}T${hours}:${minutes}:${seconds} (${getLocalTimezoneLabel(d)})`;
}

export function formatUtcClock(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return iso;
  }
  const d = new Date(ms);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatUtcClockWithSeconds(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return iso;
  }
  const d = new Date(ms);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function formatUtcMidpointClock(startIso: string, endIso: string): string {
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return "mid";
  }
  return formatUtcClock(new Date(startMs + (endMs - startMs) / 2).toISOString());
}

export function formatStationPanelName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\b(Satellite Station|Ground Station|Earth Station|Teleport|Space Center)\b/g, "")
    .trim();
}

export function formatSatelliteShort(satelliteId: string | null): string {
  if (!satelliteId) {
    return "—";
  }
  const trimmed = satelliteId.trim();
  if (trimmed.length <= 22) {
    return trimmed;
  }
  return `${trimmed.slice(0, 19)}...`;
}

export function formatReasonLabel(
  reasonKind: string,
  fromSatelliteId: string | null
): string {
  if (fromSatelliteId === null) {
    return "Initial acquisition";
  }
  if (reasonKind === "cross-orbit-migration") {
    return "Cross-orbit migration (V-MO1)";
  }
  return reasonKind.replace(/-/g, " ");
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 100);
}

export function sampleEvenly<T>(items: ReadonlyArray<T>, limit: number): ReadonlyArray<T> {
  if (items.length <= limit) {
    return items;
  }
  if (limit <= 1) {
    return items.slice(0, 1);
  }
  const sampled: T[] = [];
  const used = new Set<number>();
  for (let index = 0; index < limit; index += 1) {
    const sourceIndex = Math.round((index * (items.length - 1)) / (limit - 1));
    if (!used.has(sourceIndex)) {
      used.add(sourceIndex);
      sampled.push(items[sourceIndex]);
    }
  }
  return sampled;
}

export function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatSummaryCountLabel(
  count: number,
  previewLimit: number,
  singular: string,
  plural: string
): string {
  const base = formatCountLabel(count, singular, plural);
  if (count === 0) {
    return base;
  }
  return `${base} · showing next ${Math.min(count, previewLimit)}`;
}

export function formatCount(value: number): string {
  return String(Math.round(value));
}

export function formatMbpsValue(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)} Mbps`;
}


export function formatSignedPercent(fraction: number): string {
  const pct = fraction * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) {
    return "0%";
  }
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}${Math.abs(rounded)}%`;
}

export function formatSpeedMbps(mbps: number): string {
  if (mbps >= 100) {
    return `${Math.round(mbps)} Mbps`;
  }
  if (mbps >= 10) {
    return `${(Math.round(mbps * 10) / 10).toFixed(1)} Mbps`;
  }
  return `${(Math.round(mbps * 100) / 100).toFixed(2)} Mbps`;
}
