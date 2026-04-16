import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const contractPath = new URL("../src/features/time/replay-clock.ts", import.meta.url);
const indexPath = new URL("../src/features/time/index.ts", import.meta.url);

const [contractSource, indexSource] = await Promise.all([
  readFile(contractPath, "utf8"),
  readFile(indexPath, "utf8")
]);

const requiredContractSnippets = [
  'export type ClockMode = "real-time" | "prerecorded";',
  "export type ClockTimestamp = string | number;",
  "export interface ReplayClockState {",
  "mode: ClockMode;",
  "currentTime: ClockTimestamp;",
  "startTime: ClockTimestamp;",
  "stopTime: ClockTimestamp;",
  "multiplier: number;",
  "isPlaying: boolean;",
  "export interface ReplayClock {",
  "getState(): ReplayClockState;",
  "play(): void;",
  "pause(): void;",
  "setMultiplier(x: number): void;",
  "seek(t: ClockTimestamp): void;",
  "mode: ClockMode,",
  "range?: { start: ClockTimestamp; stop: ClockTimestamp }",
  "onTick(listener: (state: ReplayClockState) => void): () => void;",
  "Negative multipliers indicate reverse playback.",
  "Changing speed does not imply play/pause state changes.",
  "Seek uses absolute positioning, not relative offsets.",
  "Switching mode may also reset the active start/stop range."
];

for (const snippet of requiredContractSnippets) {
  assert(
    contractSource.includes(snippet),
    `Missing required replay-clock contract snippet: ${snippet}`
  );
}

assert(
  indexSource.includes("ClockMode") &&
    indexSource.includes("ClockTimestamp") &&
    indexSource.includes("ReplayClock") &&
    indexSource.includes("ReplayClockState"),
  "Time module boundary must re-export the replay-clock public contract."
);

const forbiddenPatterns = [
  {
    pattern: /\bJulianDate\b/,
    message: "Public replay-clock contract must not mention JulianDate."
  },
  {
    pattern: /\bCartesian3\b/,
    message: "Public replay-clock contract must not mention Cartesian3."
  },
  {
    pattern: /\bViewer\b/,
    message: "Public replay-clock contract must not mention Viewer."
  },
  {
    pattern: /from\s+["']cesium["']/,
    message: "Public replay-clock contract must not import from cesium."
  }
];

for (const { pattern, message } of forbiddenPatterns) {
  assert(!pattern.test(contractSource), message);
}

console.log("Phase 3.2 replay-clock contract verification passed.");
