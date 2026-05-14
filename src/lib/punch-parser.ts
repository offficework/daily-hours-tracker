import type { Punch } from "./punch-types";

function toMinutes(time: string): number {
  const [h, m, s] = time.split(":").map(Number);
  return h * 60 + m + (s || 0) / 60;
}

function parseDate(dmy: string): string {
  // dd.mm.yyyy -> yyyy-mm-dd
  const [d, m, y] = dmy.split(".");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function parsePunches(raw: string): Punch[] {
  const punches: Punch[] = [];
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip header lines
    if (/^Att/i.test(trimmed) || /^Codes/i.test(trimmed)) continue;
    if (/^[A-Z]+->/i.test(trimmed)) continue;
    // tokenize on whitespace
    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 4) continue;
    const [dStr, tStr, clock, code] = tokens;
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dStr)) continue;
    if (!/^\d{2}:\d{2}:\d{2}$/.test(tStr)) continue;
    punches.push({
      date: parseDate(dStr),
      time: tStr,
      minutes: toMinutes(tStr),
      clock,
      code: code.toUpperCase(),
    });
  }
  return punches;
}
