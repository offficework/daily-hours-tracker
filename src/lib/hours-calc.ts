import {
  type Punch,
  type DayResult,
  type CycleSummary,
  REQUIRED_MINS,
  MIN_HALF_MINS,
  LATE_CUTOFF_MINS,
  EARLY_CUTOFF_MINS,
  HALF_DAY_PUNCH_CUTOFF,
  FULL_DAY_MIN_MINS,
} from "./punch-types";

export function fmtHM(mins: number): string {
  if (!isFinite(mins) || mins <= 0) return "0h 00m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function computeDay(date: string, dayPunches: Punch[]): DayResult {
  const punches = [...dayPunches].sort((a, b) => a.minutes - b.minutes);
  const notes: string[] = [];
  if (punches.length === 0) {
    return {
      date,
      firstIn: null,
      lastOut: null,
      workedMins: 0,
      lunchMins: 0,
      status: "absent",
      shortMins: 0,
      extraMins: 0,
      fullDayLeave: true,
      late: false,
      earlyOut: false,
      notes: ["No punches"],
      punches,
    };
  }

  // Pair sequentially. LWRK pairs are lunch (subtract). Other pairs are work.
  let workMins = 0;
  let lunchMins = 0;

  // Group into segments by code-pairs. Pair every two consecutive punches.
  for (let i = 0; i + 1 < punches.length; i += 2) {
    const a = punches[i];
    const b = punches[i + 1];
    const dur = b.minutes - a.minutes;
    if (dur <= 0) continue;
    const isLwrk = a.code === "LWRK" || b.code === "LWRK";
    if (isLwrk) {
      lunchMins += dur;
    } else {
      workMins += dur;
    }
  }

  const codes = new Set(punches.map((p) => p.code));
  const hasLwrk = codes.has("LWRK");
  const hasOout = codes.has("OOUT");

  // Worked time = total span between first and last MINUS lunch segments
  // Recompute using span approach for accuracy when pairs intermix
  const firstIn = punches[0];
  const lastOut = punches[punches.length - 1];
  const totalSpan = lastOut.minutes - firstIn.minutes;
  let computedWork = totalSpan - lunchMins;

  // Default lunch deduction if no LWRK and no OOUT, and span crosses 12:00-12:30
  let defaultLunch = 0;
  if (!hasLwrk && !hasOout) {
    if (firstIn.minutes <= 12 * 60 && lastOut.minutes >= 12 * 60 + 30) {
      defaultLunch = 30;
      computedWork -= 30;
      notes.push("Auto lunch −30m");
    }
  }
  if (hasLwrk) notes.push("LWRK");
  if (hasOout) notes.push("OOUT (no lunch)");
  if (codes.has("REG")) notes.push("REG");
  if (codes.has("POUT")) notes.push("POUT");

  if (computedWork < 0) computedWork = 0;

  // Status (per Rule 8)
  // - worked < 2h ⇒ absent: full-day leave deducted, hours count as extra
  // - worked >= 8h40 ⇒ full
  // - else ⇒ half (target 4h20); shortMins = max(0, target - worked)
  // - first punch >= 11:00 forces half (cannot earn full-day credit)
  const late = firstIn.minutes > LATE_CUTOFF_MINS;
  const earlyOut = lastOut.minutes < EARLY_CUTOFF_MINS;
  let status: DayResult["status"];
  let shortMins = 0;
  let extraMins = 0;
  let fullDayLeave = false;

  if (computedWork < MIN_HALF_MINS) {
    status = "absent";
    fullDayLeave = true;
    extraMins = Math.round(computedWork);
    notes.push("< 2h — full day leave; hours = extra");
  } else if (firstIn.minutes >= HALF_DAY_PUNCH_CUTOFF || computedWork < REQUIRED_MINS) {
    status = "half";
    shortMins = Math.max(0, MIN_HALF_TARGET - computedWork);
  } else {
    status = "full";
    shortMins = 0;
  }

  return {
    date,
    firstIn: firstIn.time,
    lastOut: lastOut.time,
    workedMins: Math.round(computedWork),
    lunchMins: Math.round(lunchMins + defaultLunch),
    status,
    shortMins: Math.round(shortMins),
    extraMins,
    fullDayLeave,
    late,
    earlyOut,
    notes,
    punches,
  };
}

export function computeAllDays(punches: Punch[]): DayResult[] {
  const byDate = new Map<string, Punch[]>();
  for (const p of punches) {
    if (!byDate.has(p.date)) byDate.set(p.date, []);
    byDate.get(p.date)!.push(p);
  }
  const dates = [...byDate.keys()].sort();
  return dates.map((d) => computeDay(d, byDate.get(d)!));
}

// Cycle = 23rd of month X to 22nd of month X+1
export function cycleForDate(dateStr: string): { start: string; end: string; label: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  let startY = y;
  let startM = m;
  if (d < 23) {
    startM -= 1;
    if (startM < 1) {
      startM = 12;
      startY -= 1;
    }
  }
  let endY = startY;
  let endM = startM + 1;
  if (endM > 12) {
    endM = 1;
    endY += 1;
  }
  const start = `${startY}-${String(startM).padStart(2, "0")}-23`;
  const end = `${endY}-${String(endM).padStart(2, "0")}-22`;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const label = `${monthNames[startM - 1]} 23 – ${monthNames[endM - 1]} 22, ${endY}`;
  return { start, end, label };
}

export function groupByCycle(days: DayResult[]): CycleSummary[] {
  const map = new Map<string, CycleSummary>();
  for (const day of days) {
    const c = cycleForDate(day.date);
    const key = c.start;
    if (!map.has(key)) {
      map.set(key, {
        label: c.label,
        start: c.start,
        end: c.end,
        days: [],
        fullDays: 0,
        halfDays: 0,
        absents: 0,
        totalMins: 0,
        violations: 0,
        leaveDeducted: 0,
      });
    }
    const summary = map.get(key)!;
    summary.days.push(day);
    summary.totalMins += day.workedMins;
    if (day.status === "full") summary.fullDays += 1;
    else if (day.status === "half") summary.halfDays += 1;
    else summary.absents += 1;
    if (day.late) summary.violations += 1;
    if (day.earlyOut) summary.violations += 1;
  }
  for (const s of map.values()) {
    s.leaveDeducted = s.violations > 3 ? 0.5 : 0;
    s.days.sort((a, b) => a.date.localeCompare(b.date));
  }
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
}
