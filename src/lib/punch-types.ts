export type PunchCode = "STD" | "OOUT" | "POUT" | "NGHT" | "LLCH" | "CANT" | "REG" | "DEL" | "LWRK" | string;

export interface Punch {
  date: string; // yyyy-mm-dd
  time: string; // HH:mm:ss
  minutes: number; // minutes since midnight
  clock: string;
  code: PunchCode;
}

export interface DayResult {
  date: string;
  firstIn: string | null;
  lastOut: string | null;
  workedMins: number;
  lunchMins: number;
  status: "full" | "half" | "absent";
  shortMins: number; // shortfall from required (full or half target)
  extraMins: number; // worked minutes counted as extra (when < 2h, full leave deducted)
  fullDayLeave: boolean; // true when < 2h ⇒ 1 full day leave deducted
  late: boolean;
  earlyOut: boolean;
  notes: string[];
  punches: Punch[];
  isMo: boolean;
  isOout: boolean;
}

export interface CycleSummary {
  label: string; // e.g. "Apr 23 – May 22, 2026"
  start: string;
  end: string;
  days: DayResult[];
  fullDays: number;
  halfDays: number;
  absents: number;
  totalMins: number;
  totalShortMins: number;
  totalExtraMins: number;
  violations: number;
  leaveDeducted: number; // total days: full-day leaves from <2h days + 0.5 if violations>3
  fullDayLeaves: number;
  violationLeave: number; // 0 or 0.5
}

export const REQUIRED_MINS = 8 * 60 + 40; // 520
export const HALF_MINS = 4 * 60 + 20; // 260
export const MIN_HALF_MINS = 2 * 60; // 120
export const LATE_CUTOFF_MINS = 10 * 60 + 1; // 601 — after 10:01:00
export const EARLY_CUTOFF_MINS = 15 * 60; // 900 — before 15:00:00
export const HALF_DAY_PUNCH_CUTOFF = 11 * 60; // 660 — punch >= 11:00 ⇒ half day
export const FULL_DAY_MIN_MINS = 5 * 60; // 300 — < 5h is half day
