interface ParsedTleRecord {
  name: string;
  line1: string;
  line2: string;
}

export const LEO_SCALE_OVERLAY_MODE = "leo-scale-points";
export const LEO_SCALE_OVERLAY_PLANE_COUNT = 18;
export const LEO_SCALE_OVERLAY_SATS_PER_PLANE = 30;
export const LEO_SCALE_OVERLAY_SAT_COUNT =
  LEO_SCALE_OVERLAY_PLANE_COUNT * LEO_SCALE_OVERLAY_SATS_PER_PLANE;

const BASE_WALKER_PLANE_COUNT = 6;
const BASE_WALKER_SATS_PER_PLANE = 3;
const TLE_BODY_LENGTH = 68;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeAngleDegrees(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function parseTleRecords(tleText: string): ReadonlyArray<ParsedTleRecord> {
  const lines = tleText
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  const records: ParsedTleRecord[] = [];

  for (let index = 0; index < lines.length; ) {
    const name = lines[index];
    const line1 = lines[index + 1];
    const line2 = lines[index + 2];

    assert(
      typeof name === "string" &&
        typeof line1 === "string" &&
        typeof line2 === "string",
      "Expanded LEO scale fixture generation requires name + line1 + line2 records."
    );
    assert(
      line1.startsWith("1 ") && line2.startsWith("2 "),
      "Expanded LEO scale fixture generation requires valid TLE line pairs."
    );

    records.push({ name: name.trim(), line1, line2 });
    index += 3;
  }

  assert(
    records.length >= BASE_WALKER_PLANE_COUNT * BASE_WALKER_SATS_PER_PLANE,
    "Expanded LEO scale fixture generation requires the accepted 18-satellite walker baseline."
  );

  return records;
}

function replaceField(
  lineBody: string,
  startIndex: number,
  endIndex: number,
  value: string
): string {
  assert(
    value.length === endIndex - startIndex,
    `Invalid TLE field width replacement for ${value}.`
  );
  return `${lineBody.slice(0, startIndex)}${value}${lineBody.slice(endIndex)}`;
}

function computeTleChecksum(lineBody: string): string {
  assert(
    lineBody.length === TLE_BODY_LENGTH,
    `TLE checksum expects ${TLE_BODY_LENGTH} body characters.`
  );

  let checksum = 0;

  for (const character of lineBody) {
    if (character >= "0" && character <= "9") {
      checksum += Number(character);
    } else if (character === "-") {
      checksum += 1;
    }
  }

  return String(checksum % 10);
}

function withTleChecksum(lineBody: string): string {
  return `${lineBody}${computeTleChecksum(lineBody)}`;
}

function formatSatnum(satnum: number): string {
  assert(Number.isInteger(satnum) && satnum >= 0 && satnum <= 99999, "Invalid satnum.");
  return String(satnum).padStart(5, "0");
}

function formatAngleField(value: number): string {
  return normalizeAngleDegrees(value).toFixed(4).padStart(8, "0");
}

function createScaledName(planeIndex: number, slotIndex: number): string {
  return `L18P${String(planeIndex + 1).padStart(2, "0")}S${String(
    slotIndex + 1
  ).padStart(2, "0")}`;
}

function createScaledLine1(template: ParsedTleRecord, satnum: number): string {
  const lineBody = replaceField(
    template.line1.slice(0, TLE_BODY_LENGTH),
    2,
    7,
    formatSatnum(satnum)
  );
  return withTleChecksum(lineBody);
}

function createScaledLine2(
  template: ParsedTleRecord,
  satnum: number,
  raanDeg: number,
  meanAnomalyDeg: number
): string {
  let lineBody = template.line2.slice(0, TLE_BODY_LENGTH);
  lineBody = replaceField(lineBody, 2, 7, formatSatnum(satnum));
  lineBody = replaceField(lineBody, 17, 25, formatAngleField(raanDeg));
  lineBody = replaceField(lineBody, 43, 51, formatAngleField(meanAnomalyDeg));
  return withTleChecksum(lineBody);
}

export function createLeoScaleWalkerFixtureText(baseWalkerTleText: string): string {
  const baseRecords = parseTleRecords(baseWalkerTleText);
  const planeSpacingDeg = 360 / LEO_SCALE_OVERLAY_PLANE_COUNT;
  const slotSpacingDeg = 360 / LEO_SCALE_OVERLAY_SATS_PER_PLANE;
  const scaledRecords: string[] = [];

  for (let planeIndex = 0; planeIndex < LEO_SCALE_OVERLAY_PLANE_COUNT; planeIndex += 1) {
    for (
      let slotIndex = 0;
      slotIndex < LEO_SCALE_OVERLAY_SATS_PER_PLANE;
      slotIndex += 1
    ) {
      const templateIndex =
        (planeIndex % BASE_WALKER_PLANE_COUNT) * BASE_WALKER_SATS_PER_PLANE +
        (slotIndex % BASE_WALKER_SATS_PER_PLANE);
      const template = baseRecords[templateIndex];
      const satnum = 90000 + planeIndex * LEO_SCALE_OVERLAY_SATS_PER_PLANE + slotIndex + 1;
      const meanAnomalyDeg =
        slotIndex * slotSpacingDeg +
        planeIndex * (slotSpacingDeg / LEO_SCALE_OVERLAY_PLANE_COUNT);

      scaledRecords.push(
        createScaledName(planeIndex, slotIndex),
        createScaledLine1(template, satnum),
        createScaledLine2(template, satnum, planeIndex * planeSpacingDeg, meanAnomalyDeg)
      );
    }
  }

  return `${scaledRecords.join("\n")}\n`;
}
