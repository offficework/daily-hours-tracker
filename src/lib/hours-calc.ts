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
  FULL_DAY_MIN_MINS,
  requiredMinsForDate,
  halfRequiredMinsForDate,
  isOffSaturdayDate,
} from "./punch-types";
import { funNoteFor } from "./hinglish-notes";

const LUNCH_START = 12 * 60;
const LUNCH_END = 12 * 60 + 30;
const HALF_DAY_VIOLATION_CUTOFF = 13 * 60 + 30; // > 13:30 ⇒ half + violation
const CORE_MORNING_END = 10 * 60; // before 10:00
const CORE_AFTERNOON_START = 12 * 60 + 30; // after 12:30

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
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

function emptyDay(date: string, extra: Partial<DayResult>): DayResult {
  return {
    date,
    firstIn: null,
    lastOut: null,
    workedMins: 0,
    lunchMins: 0,
    status: "absent",
    shortMins: 0,
    extraMins: 0,
    fullDayLeave: false,
    halfDayLeave: false,
    late: false,
    earlyOut: false,
    notes: [],
    punches: [],
    isMo: false,
    isOout: false,
    isHoliday: false,
    isSunday: false,
    isOffSaturday: false,
    hasError: false,
    ...extra,
  };
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
  const isOffSat = isOffSaturdayDate(date);
  const isRest = isHoliday || isSunday || isOffSat;
  const REQ = requiredMinsForDate(date);
  const HALF_REQ = halfRequiredMinsForDate(date);

  if (punches.length === 0) {
    if (isMo) {
      return emptyDay(date, {
        workedMins: REQ, status: "full", notes: ["MO (no short hours)"],
        isMo: true, isHoliday, isSunday, isOffSaturday: isOffSat,
      });
    }
    if (isRest) {
      const label = isHoliday ? "Holiday" : isOffSat ? "Off Saturday" : "Sunday";
      return emptyDay(date, {
        status: "full", notes: [label],
        isHoliday, isSunday, isOffSaturday: isOffSat,
      });
    }
    return emptyDay(date, {
      status: "absent", fullDayLeave: true, notes: ["No punches — 1 day leave"],
      isHoliday, isSunday, isOffSaturday: isOffSat,
    });
  }

  if (punches.length % 2 !== 0) {
    return emptyDay(date, {
      firstIn: punches[0].time,
      lastOut: punches[punches.length - 1].time,
      status: "error",
      notes: [`Invalid Punch Data — odd punches (${punches.length})`],
      punches,
      isMo, isHoliday, isSunday, isOffSaturday: isOffSat,
      hasError: true,
    });
  }

  // LWRK lunch protection
  let lwrkDeduct = 0;
  let lwrkRawMins = 0;
  let lwrkProtected = 0;
  let hasLwrk = false;
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
  const hasOout = codes.has("OOUT");

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
  if (isMo) notes.push("MO day");
  if (isHoliday) notes.push("Holiday — all hours extra");
  else if (isOffSat) notes.push("Off Saturday — all hours extra");
  else if (isSunday) notes.push("Sunday — all hours extra");

  const lateHalfDay = firstIn.minutes > HALF_DAY_VIOLATION_CUTOFF; // > 13:30
  const lateFullDayArrival =
    firstIn.minutes >= LATE_CUTOFF_MINS && firstIn.minutes < HALF_DAY_PUNCH_CUTOFF;
  // Early-out only relevant for full-day attempts (firstIn < 11:00) AND when worked ≥ 5h.
  const earlyOutCandidate =
    firstIn.minutes < HALF_DAY_PUNCH_CUTOFF &&
    lastOut.minutes < EARLY_CUTOFF_MINS &&
    lastOut.minutes >= HALF_DAY_VIOLATION_CUTOFF; // out in [13:30, 15:00)
  const earlyOut = !isMo && !isRest && earlyOutCandidate && computedWork >= FULL_DAY_MIN_MINS;

  let status: DayResult["status"];
  let shortMins = 0;
  let extraMins = 0;
  let fullDayLeave = false;
  let halfDayLeave = false;

  if (isMo) {
    // MO day with punches: show actual worked time but no short/extra/violation/leave impact.
    status = "full";
    notes.push("MO day — no short/extra/violation");
  } else if (isRest) {
    status = "full";
    extraMins = Math.round(computedWork);
  } else if (computedWork < MIN_HALF_MINS) {
    status = "absent";
    fullDayLeave = true;
    notes.push("< 2h — full day leave; hours = extra");
    extraMins = Math.round(computedWork);
  } else if (
    firstIn.minutes >= HALF_DAY_PUNCH_CUTOFF ||
    lateHalfDay ||
    computedWork < FULL_DAY_MIN_MINS ||
    (lastOut.minutes < HALF_DAY_VIOLATION_CUTOFF) // out before 13:30 ⇒ half
  ) {
    status = "half";
    if (lateHalfDay) notes.push("Arrived > 13:30 — half day + violation");
    if (computedWork >= HALF_REQ) extraMins = computedWork - HALF_REQ;
    else shortMins = HALF_REQ - computedWork;
  } else if (computedWork < REQ) {
    status = "full";
    shortMins = REQ - computedWork;
  } else {
    status = "full";
    extraMins = computedWork - REQ;
  }

  shortMins = Math.round(shortMins);
  extraMins = Math.round(extraMins);

  if (hasOout || isMo || isRest) shortMins = 0;

  // Violation determination
  let late = false;
  let early = false;
  if (!isMo && !isRest && !fullDayLeave) {
    late = (status === "full" && lateFullDayArrival) || lateHalfDay;
    early = earlyOut;
  }

  // Half-day violation: morning-out < 11:00 (rule 33) — when person had a half day and the FIRST out is before 11:00.
  if (!isMo && !isRest && !fullDayLeave && status === "half" && punches.length >= 2) {
    const firstOut = punches[1];
    if (firstOut.minutes < HALF_DAY_PUNCH_CUTOFF && firstIn.minutes < CORE_MORNING_END) {
      late = late || false;
      // mark as a violation via earlyOut flag
      early = true;
      notes.push("Morning session ended < 11:00 — violation");
    }
  }

  const result: DayResult = {
    date,
    firstIn: firstIn.time,
    lastOut: lastOut.time,
    workedMins: Math.round(computedWork),
    lunchMins: Math.round(lwrkDeduct),
    status,
    shortMins,
    extraMins,
    fullDayLeave,
    halfDayLeave,
    late,
    earlyOut: early,
    notes,
    punches,
    isMo,
    isOout: hasOout,
    isHoliday,
    isSunday,
    isOffSaturday: isOffSat,
    hasError: false,
  };
  result.funNote = funNoteFor(result);
  return result;
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
  for (const d of moDates) if (!byDate.has(d)) byDate.set(d, []);
  for (const d of holidayDates) if (!byDate.has(d)) byDate.set(d, []);
  const dates = [...byDate.keys()].sort();
  return dates.map((d) =>
    computeDay(d, byDate.get(d)!, moDates.has(d), holidayDates.has(d)),
  );
}

export function cycleForDate(dateStr: string): { start: string; end: string; label: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  let startY = y;
  let startM = m;
  if (d < 23) {
    startM -= 1;
    if (startM < 1) { startM = 12; startY -= 1; }
  }
  let endY = startY;
  let endM = startM + 1;
  if (endM > 12) { endM = 1; endY += 1; }
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
        label: c.label, start: c.start, end: c.end, days: [],
        fullDays: 0, halfDays: 0, absents: 0,
        totalMins: 0, totalShortMins: 0, totalExtraMins: 0,
        violations: 0, leaveDeducted: 0, fullDayLeaves: 0, halfDayLeaves: 0, violationLeave: 0,
      });
    }
    const summary = map.get(key)!;
    summary.days.push(day);
    if (day.hasError) continue;
    summary.totalMins += day.workedMins;
    summary.totalShortMins += day.shortMins;
    summary.totalExtraMins += day.extraMins;
    if (day.fullDayLeave) summary.fullDayLeaves += 1;
    if (day.halfDayLeave) summary.halfDayLeaves += 1;
    if (day.status === "full") summary.fullDays += 1;
    else if (day.status === "half") summary.halfDays += 1;
    else if (day.status === "absent") summary.absents += 1;
    if (!day.isMo && !day.isHoliday && !day.isSunday && !day.isOffSaturday && !day.fullDayLeave) {
      if (day.late) summary.violations += 1;
      if (day.earlyOut) summary.violations += 1;
    }
  }
  for (const s of map.values()) {
    s.violationLeave = Math.max(0, s.violations - 3) * 0.5;
    s.leaveDeducted = s.fullDayLeaves + s.halfDayLeaves * 0.5 + s.violationLeave;
    s.days.sort((a, b) => a.date.localeCompare(b.date));
    let vCount = 0;
    for (const day of s.days) {
      if (day.hasError || day.isMo || day.isHoliday || day.isSunday || day.isOffSaturday || day.fullDayLeave) continue;
      const dayViolations = (day.late ? 1 : 0) + (day.earlyOut ? 1 : 0);
      for (let i = 0; i < dayViolations; i++) {
        vCount += 1;
        if (vCount > 3) {
          day.notes.push("Half Day Leave Deducted Due To Excess Violations");
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
}

export function parseMoDates(raw: string): Set<string> {
  const out = new Set<string>();
  if (!raw.trim()) return out;
  const tokens = raw.split(/[\s,;]+/).filter(Boolean);
  for (const t of tokens) {
    let m = /^(\d{2})[./-](\d{2})[./-](\d{4})$/.exec(t);
    if (m) { out.add(`${m[3]}-${m[2]}-${m[1]}`); continue; }
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (m) out.add(t);
  }
  return out;
}

export { REQUIRED_MINS, HALF_MINS, MIN_HALF_MINS, LATE_CUTOFF_MINS, EARLY_CUTOFF_MINS, HALF_DAY_PUNCH_CUTOFF };
