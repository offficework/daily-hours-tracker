import type { Punch } from "./punch-types";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function parseDate(dmy: string): string {
  // dd.mm.yyyy -> yyyy-mm-dd
  const [d, m, y] = dmy.split(".");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function parsePunches(raw: string): Punch[] {
  const punches: Punch[] = [];
  const lines = raw.split(/\r?\n/);
  for (const rawLine of lines) {
    // Strip pipe table characters and collapse whitespace
    const line = rawLine.replace(/\|/g, " ").trim();
    if (!line) continue;
    // Skip separator rows like "---------"
    if (/^[-=_]+$/.test(line)) continue;
    // Skip header / metadata lines
    if (/^Staff\s*No/i.test(line)) continue;
    if (/^Att/i.test(line) || /^Codes/i.test(line)) continue;
    if (/^[A-Z]+->/i.test(line)) continue;
    const tokens = line.split(/\s+/);
    if (tokens.length < 4) continue;
    const [dStr, tStr, clock, code] = tokens;
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dStr)) continue;
    if (!/^\d{2}:\d{2}:\d{2}$/.test(tStr)) continue;
    const hhmm = tStr.slice(0, 5);
    punches.push({
      date: parseDate(dStr),
      time: hhmm,
      minutes: toMinutes(hhmm),
      clock,
      code: code.toUpperCase(),
    });
  }
  return punches;
}
