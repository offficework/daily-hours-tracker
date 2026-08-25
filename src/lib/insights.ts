import type { DayResult } from "./punch-types";
import { requiredMinsForDate, halfRequiredMinsForDate } from "./punch-types";
import { cycleForDate } from "./hours-calc";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** hh:mm without sign. */
export function hm(mins: number): string {
  const m = Math.round(Math.abs(mins));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Signed hh:mm; zero renders as 00:00. */
export function signedHM(mins: number): string {
  const r = Math.round(mins);
  if (r === 0) return "00:00";
  return `${r > 0 ? "+ " : "- "}${hm(r)}`;
}

export function isRestDay(d: DayResult): boolean {
  return d.isHoliday || d.isSunday || d.isOffSaturday;
}

export function dayViolations(d: DayResult): number {
  if (d.hasError || d.isMo || isRestDay(d) || d.fullDayLeave) return 0;
  return (d.late ? 1 : 0) + (d.earlyOut ? 1 : 0);
}

export function requiredMinsForDay(d: DayResult): number {
  if (d.hasError || d.isMo || isRestDay(d)) return 0;
  if (d.status === "half") return halfRequiredMinsForDate(d.date);
  if (d.status === "full") return requiredMinsForDate(d.date);
  return 0;
}

export interface ViolationEntry {
  date: string;
  time: string;
  reason: string;
}

export interface MonthBucket {
  key: string; // cycle start
  label: string; // e.g. "April 2026"
  shortLabel: string; // e.g. "Apr"
  cycleLabel: string;
  fyKey: string; // e.g. "2026-27"
  monthIndex: number; // 0-11 of the attendance month
  days: DayResult[];
  workedMins: number;
  requiredMins: number;
  shortMins: number;
  extraMins: number;
  netMins: number;
  shortDays: number;
  extraDays: number;
  neutralDays: number;
  countedDays: number;
  fullDays: number;
  halfDays: number;
  absents: number;
  errorDays: number;
  moDays: number;
  restWorkedDays: number;
  fullDayLeaves: number;
  halfDayLeaves: number;
  violations: number;
  violationList: ViolationEntry[];
  violationLeave: number;
  leaveDeducted: number;
}

export interface InsightsData {
  months: MonthBucket[];
  totals: Omit<MonthBucket, "key" | "label" | "shortLabel" | "cycleLabel" | "fyKey" | "monthIndex">;
}

function emptyBucket(key: string, label: string, shortLabel: string, cycleLabel: string, fyKey: string, monthIndex: number): MonthBucket {
  return {
    key, label, shortLabel, cycleLabel, fyKey, monthIndex,
    days: [], workedMins: 0, requiredMins: 0, shortMins: 0, extraMins: 0, netMins: 0,
    shortDays: 0, extraDays: 0, neutralDays: 0, countedDays: 0,
    fullDays: 0, halfDays: 0, absents: 0, errorDays: 0, moDays: 0, restWorkedDays: 0,
    fullDayLeaves: 0, halfDayLeaves: 0, violations: 0, violationList: [], violationLeave: 0, leaveDeducted: 0,
  };
}

export function attendanceMonthOf(date: string) {
  const c = cycleForDate(date);
  const [ey, em] = c.end.split("-").map(Number);
  const fyStart = em >= 4 ? ey : ey - 1;
  return {
    key: c.start,
    cycleLabel: c.label,
    label: `${MONTH_NAMES[em - 1]} ${ey}`,
    shortLabel: MONTH_NAMES[em - 1].slice(0, 3),
    monthIndex: em - 1,
    fyKey: `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`,
  };
}

export function buildInsights(days: DayResult[]): InsightsData {
  const map = new Map<string, MonthBucket>();

  for (const d of days) {
    const m = attendanceMonthOf(d.date);
    if (!map.has(m.key)) map.set(m.key, emptyBucket(m.key, m.label, m.shortLabel, m.cycleLabel, m.fyKey, m.monthIndex));
    const b = map.get(m.key)!;
    b.days.push(d);

    if (d.hasError) {
      b.errorDays += 1;
      continue;
    }

    b.workedMins += d.workedMins;
    b.requiredMins += requiredMinsForDay(d);
    b.shortMins += d.shortMins;
    b.extraMins += d.extraMins;
    if (d.shortMins > 0) b.shortDays += 1;
    if (d.extraMins > 0) b.extraDays += 1;
    if (d.shortMins === 0 && d.extraMins === 0) b.neutralDays += 1;
    b.countedDays += 1;

    if (d.status === "full") b.fullDays += 1;
    else if (d.status === "half") b.halfDays += 1;
    else if (d.status === "absent") b.absents += 1;

    if (d.isMo) b.moDays += 1;
    if (isRestDay(d) && d.workedMins > 0) b.restWorkedDays += 1;
    if (d.fullDayLeave) b.fullDayLeaves += 1;
    if (d.halfDayLeave) b.halfDayLeaves += 1;

    const v = dayViolations(d);
    if (v > 0) {
      b.violations += v;
      if (d.late && d.firstIn) b.violationList.push({ date: d.date, time: d.firstIn, reason: "Late arrival" });
      if (d.earlyOut && d.lastOut) b.violationList.push({ date: d.date, time: d.lastOut, reason: "Early out" });
    }
  }

  const months = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const b of months) {
    b.netMins = b.extraMins - b.shortMins;
    b.violationLeave = Math.max(0, b.violations - 3) * 0.5;
    b.leaveDeducted = b.fullDayLeaves + b.halfDayLeaves * 0.5 + b.violationLeave;
    b.violationList.sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
    b.days.sort((x, y) => x.date.localeCompare(y.date));
  }

  const totals = emptyBucket("", "", "", "", "", 0);
  for (const b of months) {
    totals.days.push(...b.days);
    totals.workedMins += b.workedMins;
    totals.requiredMins += b.requiredMins;
    totals.shortMins += b.shortMins;
    totals.extraMins += b.extraMins;
    totals.shortDays += b.shortDays;
    totals.extraDays += b.extraDays;
    totals.neutralDays += b.neutralDays;
    totals.countedDays += b.countedDays;
    totals.fullDays += b.fullDays;
    totals.halfDays += b.halfDays;
    totals.absents += b.absents;
    totals.errorDays += b.errorDays;
    totals.moDays += b.moDays;
    totals.restWorkedDays += b.restWorkedDays;
    totals.fullDayLeaves += b.fullDayLeaves;
    totals.halfDayLeaves += b.halfDayLeaves;
    totals.violations += b.violations;
    totals.violationList.push(...b.violationList);
    totals.violationLeave += b.violationLeave;
    totals.leaveDeducted += b.leaveDeducted;
  }
  totals.netMins = totals.extraMins - totals.shortMins;

  const { key: _k, label: _l, shortLabel: _s, cycleLabel: _c, fyKey: _f, monthIndex: _m, ...rest } = totals;
  return { months, totals: rest };
}

export interface Observation {
  text: string;
  tone: "positive" | "warning" | "info";
}

export function buildObservations(data: InsightsData) {
  const { months, totals } = data;
  const insights: Observation[] = [];
  const alerts: Observation[] = [];
  const positives: Observation[] = [];
  if (!months.length) return { insights, alerts, positives };

  const withData = months.filter((m) => m.countedDays > 0);
  const best = [...withData].sort((a, b) => b.netMins - a.netMins)[0];
  const worstShort = [...withData].sort((a, b) => b.shortMins - a.shortMins)[0];
  const bestExtra = [...withData].sort((a, b) => b.extraMins - a.extraMins)[0];
  const worstViol = [...withData].sort((a, b) => b.violations - a.violations)[0];

  if (best) insights.push({ text: `Best attendance month: ${best.label} with ${signedHM(best.netMins)} net hours.`, tone: "positive" });
  if (worstShort && worstShort.shortMins > 0) insights.push({ text: `Highest short hours: ${worstShort.label} with - ${hm(worstShort.shortMins)}.`, tone: "warning" });
  if (bestExtra && bestExtra.extraMins > 0) insights.push({ text: `Highest extra hours: ${bestExtra.label} with + ${hm(bestExtra.extraMins)}.`, tone: "positive" });
  if (worstViol && worstViol.violations > 0) insights.push({ text: `Highest violation month: ${worstViol.label} with ${worstViol.violations} violation${worstViol.violations === 1 ? "" : "s"}.`, tone: "warning" });
  insights.push({ text: `Total net hours across selected period: ${signedHM(totals.netMins)}.`, tone: totals.netMins >= 0 ? "positive" : "warning" });

  const statusTotal = totals.fullDays + totals.halfDays + totals.absents;
  if (statusTotal > 0) {
    const pct = (n: number) => `${Math.round((n / statusTotal) * 100)}%`;
    insights.push({ text: `Full day percentage: ${pct(totals.fullDays)}.`, tone: "info" });
    insights.push({ text: `Half day percentage: ${pct(totals.halfDays)}.`, tone: "info" });
    insights.push({ text: `Leave deduction percentage: ${pct(totals.leaveDeducted)}.`, tone: "info" });
  }

  // Alerts
  for (const m of withData) {
    if (m.violations > 0 && m.violations <= 3) {
      alerts.push({ text: `${m.label}: ${3 - m.violations} violation${3 - m.violations === 1 ? "" : "s"} remaining before additional leave deduction.`, tone: "warning" });
    }
    if (m.violations > 3) {
      alerts.push({ text: `${m.label}: ${m.violations} violations — ${m.violationLeave} day leave deducted for excess violations.`, tone: "warning" });
    }
  }
  if (worstViol && worstViol.violations > 0) alerts.push({ text: `${worstViol.label} has the highest violation count (${worstViol.violations}).`, tone: "warning" });
  if (worstShort && worstShort.shortMins > 0) alerts.push({ text: `${worstShort.label} has the highest short-hour total (- ${hm(worstShort.shortMins)}).`, tone: "warning" });
  if (totals.errorDays > 0) alerts.push({ text: `Invalid punch data found on ${totals.errorDays} day${totals.errorDays === 1 ? "" : "s"}.`, tone: "warning" });
  if (totals.fullDayLeaves > 0) alerts.push({ text: `Leave deduction occurred on ${totals.fullDayLeaves} day${totals.fullDayLeaves === 1 ? "" : "s"} due to insufficient working hours.`, tone: "warning" });
  if (totals.netMins < 0) alerts.push({ text: `Overall net hours are negative (${signedHM(totals.netMins)}).`, tone: "warning" });

  // Positives
  if (totals.netMins > 0) positives.push({ text: `Great! You have ${signedHM(totals.netMins)} net hours overall.`, tone: "positive" });
  if (totals.restWorkedDays > 0) positives.push({ text: `You worked on ${totals.restWorkedDays} non-working day${totals.restWorkedDays === 1 ? "" : "s"}.`, tone: "positive" });
  if (bestExtra && bestExtra.extraMins > 0) positives.push({ text: `You completed the maximum extra hours in ${bestExtra.label} (+ ${hm(bestExtra.extraMins)}).`, tone: "positive" });
  const clean = withData.filter((m) => m.violations === 0).map((m) => m.shortLabel);
  if (clean.length) positives.push({ text: `No violations were recorded in ${clean.join(", ")}.`, tone: "positive" });
  if (totals.leaveDeducted === 0 && totals.countedDays > 0) positives.push({ text: "No leave was deducted in the selected period.", tone: "positive" });

  return { insights, alerts, positives };
}
