import {
  type Punch,
  type DayResult,
  type CycleSummary,
  REQUIRED_MINS,
  HALF_MINS,
  MIN_HALF_MINS,
  LATE_CUTOFF_MINS,
  EARLY_CUTOFF_MINS,
  HALF_DAY_PUNCH_CUTOFF,
} from "./punch-types";

const LUNCH_START = 12 * 60; // 720
const LUNCH_END = 12 * 60 + 30; // 750

export function fmtHM(mins: number): string {
  if (!isFinite(mins) || mins <= 0) return "0h 00m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function overlap(a1: number, a2: number, b1: number, b2: number) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

function isSundayDate(date: string): boolean {
  // date is yyyy-mm-dd; construct as UTC to avoid TZ shift
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

export function computeDay(
  date: string,
  dayPunches: Punch[],
  isMo = false,
  isHoliday = false,
): DayResult {
  const punches = [...dayPunches].sort((a, b) => a.minutes - b.minutes);
  const notes: string[] = [];
  const isSunday = isSundayDate(date);
  const isRest = isHoliday || isSunday; // Holidays + Sundays => any work counts as extra

  if (punches.length === 0) {
    if (isMo) {
      return {
        date, firstIn: null, lastOut: null,
        workedMins: REQUIRED_MINS, lunchMins: 0,
        status: "full", shortMins: 0, extraMins: 0,
        fullDayLeave: false, late: false, earlyOut: false,
        notes: ["MO (no short hours)"], punches,
        isMo: true, isOout: false, isHoliday, isSunday,
      };
    }
    if (isRest) {
      return {
        date, firstIn: null, lastOut: null,
        workedMins: 0, lunchMins: 0,
        status: "full", shortMins: 0, extraMins: 0,
        fullDayLeave: false, late: false, earlyOut: false,
        notes: [isHoliday ? "Holiday" : "Sunday"], punches,
        isMo: false, isOout: false, isHoliday, isSunday,
      };
    }
    return {
      date, firstIn: null, lastOut: null,
      workedMins: 0, lunchMins: 0,
      status: "absent", shortMins: 0, extraMins: 0,
      fullDayLeave: true, late: false, earlyOut: false,
      notes: ["No punches"], punches,
      isMo: false, isOout: false, isHoliday, isSunday,
    };
  }

  let lwrkDeduct = 0;
  let lwrkRawMins = 0;
  let lwrkProtected = 0;
  let hasLwrk = false;
  let hasOout = punches.some((p) => p.code === "OOUT");

  const lwrkIdx = punches.map((p, i) => (p.code === "LWRK" ? i : -1)).filter((i) => i >= 0);
  for (let k = 0; k + 1 < lwrkIdx.length; k += 2) {
    const a = punches[lwrkIdx[k]];
    const b = punches[lwrkIdx[k + 1]];
    const dur = b.minutes - a.minutes;
    if (dur <= 0) continue;
    hasLwrk = true;
    lwrkRawMins += dur;
    const prot = overlap(a.minutes, b.minutes, LUNCH_START, LUNCH_END);
    lwrkProtected += prot;
    lwrkDeduct += dur - prot;
  }

  const codes = new Set(punches.map((p) => p.code));
  if (codes.has("OOUT")) hasOout = true;

  const firstIn = punches[0];
  const lastOut = punches[punches.length - 1];
  const totalSpan = lastOut.minutes - firstIn.minutes;
  let computedWork = totalSpan - lwrkDeduct;
  if (computedWork < 0) computedWork = 0;

  if (hasLwrk) {
    notes.push(
      lwrkProtected > 0
        ? `LWRK ${fmtHM(lwrkRawMins)} (−${fmtHM(lwrkDeduct)}, ${fmtHM(lwrkProtected)} in 12:00–12:30 kept)`
        : `LWRK ${fmtHM(lwrkRawMins)} deducted`
    );
  }
  if (hasOout) notes.push("OOUT (no short hours)");
  if (codes.has("REG")) notes.push("REG");
  if (codes.has("POUT")) notes.push("POUT");
  if (isMo) notes.push("MO (no short hours)");
  if (isHoliday) notes.push("Holiday — all hours extra");
  else if (isSunday) notes.push("Sunday — all hours extra");

  // No violations on rest days / MO
  const late = isMo || isRest ? false : firstIn.minutes > LATE_CUTOFF_MINS;
  const earlyOut = isMo || isRest ? false : lastOut.minutes < EARLY_CUTOFF_MINS;

  let status: DayResult["status"];
  let shortMins = 0;
  let extraMins = 0;
  let fullDayLeave = false;

  if (isRest) {
    // Holiday or Sunday: every minute worked is extra, no short
    status = "full";
    extraMins = Math.round(computedWork);
  } else if (isMo) {
    status = "full";
  } else if (computedWork < MIN_HALF_MINS) {
    status = "absent";
    fullDayLeave = true;
    extraMins = Math.round(computedWork);
    notes.push("< 2h — full day leave; hours = extra");
  } else if (firstIn.minutes >= HALF_DAY_PUNCH_CUTOFF || computedWork < 5 * 60) {
    status = "half";
    if (computedWork >= HALF_MINS) extraMins = computedWork - HALF_MINS;
    else shortMins = HALF_MINS - computedWork;
  } else if (computedWork < REQUIRED_MINS) {
    status = "full";
    shortMins = REQUIRED_MINS - computedWork;
  } else {
    status = "full";
    extraMins = computedWork - REQUIRED_MINS;
  }

  shortMins = Math.round(shortMins);
  extraMins = Math.round(extraMins);

  if (hasOout || isMo || isRest) shortMins = 0;

  return {
    date,
    firstIn: firstIn.time,
    lastOut: lastOut.time,
    workedMins: Math.round(computedWork),
    lunchMins: Math.round(lwrkDeduct),
    status,
    shortMins,
    extraMins,
    fullDayLeave,
    late,
    earlyOut,
    notes,
    punches,
    isMo,
    isOout: hasOout,
    isHoliday,
    isSunday,
  };
}

export function computeAllDays(
  punches: Punch[],
  moDates: Set<string> = new Set(),
  holidayDates: Set<string> = new Set(),
): DayResult[] {
  const byDate = new Map<string, Punch[]>();
  for (const p of punches) {
    if (!byDate.has(p.date)) byDate.set(p.date, []);
    byDate.get(p.date)!.push(p);
  }
  for (const d of moDates) {
    if (!byDate.has(d)) byDate.set(d, []);
  }
  for (const d of holidayDates) {
    if (!byDate.has(d)) byDate.set(d, []);
  }
  const dates = [...byDate.keys()].sort();
  return dates.map((d) =>
    computeDay(d, byDate.get(d)!, moDates.has(d), holidayDates.has(d)),
  );
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
        totalShortMins: 0,
        totalExtraMins: 0,
        violations: 0,
        leaveDeducted: 0,
        fullDayLeaves: 0,
        violationLeave: 0,
      });
    }
    const summary = map.get(key)!;
    summary.days.push(day);
    summary.totalMins += day.workedMins;
    summary.totalShortMins += day.shortMins;
    summary.totalExtraMins += day.extraMins;
    if (day.fullDayLeave) summary.fullDayLeaves += 1;
    if (day.status === "full") summary.fullDays += 1;
    else if (day.status === "half") summary.halfDays += 1;
    else summary.absents += 1;
    if (!day.isMo && !day.isHoliday && !day.isSunday) {
      if (day.late) summary.violations += 1;
      if (day.earlyOut) summary.violations += 1;
    }
  }
  for (const s of map.values()) {
    s.violationLeave = s.violations > 3 ? 0.5 : 0; // Rule 10
    s.leaveDeducted = s.fullDayLeaves + s.violationLeave;
    s.days.sort((a, b) => a.date.localeCompare(b.date));
  }
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
}

// Helpers for MO date input
export function parseMoDates(raw: string): Set<string> {
  const out = new Set<string>();
  if (!raw.trim()) return out;
  const tokens = raw.split(/[\s,;]+/).filter(Boolean);
  for (const t of tokens) {
    // dd.mm.yyyy or dd/mm/yyyy or yyyy-mm-dd
    let m = /^(\d{2})[./-](\d{2})[./-](\d{4})$/.exec(t);
    if (m) {
      out.add(`${m[3]}-${m[2]}-${m[1]}`);
      continue;
    }
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (m) out.add(t);
  }
  return out;
}
