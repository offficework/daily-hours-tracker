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
  status: "full" | "half" | "absent" | "error";
  shortMins: number;
  extraMins: number;
  fullDayLeave: boolean;
  halfDayLeave: boolean;
  late: boolean;
  earlyOut: boolean;
  notes: string[];
  funNote?: string;
  punches: Punch[];
  isMo: boolean;
  isOout: boolean;
  isHoliday: boolean;
  isSunday: boolean;
  isOffSaturday: boolean;
  hasError: boolean;
}

// Full-day required minutes:
//   Apr – Dec: 8h 40m (520)
//   Jan – Mar: 8h 18m (498)
export function requiredMinsForDate(date: string): number {
  const m = Number(date.split("-")[1]);
  return m >= 1 && m <= 3 ? 8 * 60 + 18 : 8 * 60 + 40;
}

// Half-day required minutes = exactly half of full-day required.
export function halfRequiredMinsForDate(date: string): number {
  return Math.round(requiredMinsForDate(date) / 2);
}

// Off-Saturday rules:
//   - Apr–Dec of any year: 1st & 3rd Saturday off
//   - Jan–Mar of year >= 2026 (FY 2025-26 Q4): 1st Saturday off
export function isOffSaturdayDate(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCDay() !== 6) return false;
  // Which Saturday of the month? (1-indexed)
  const nth = Math.floor((d - 1) / 7) + 1;
  if (m >= 4 && m <= 12) {
    return nth === 1 || nth === 3;
  }
  if (m >= 1 && m <= 3 && y >= 2026) {
    return nth === 1;
  }
  return false;
}

export interface CycleSummary {
  label: string;
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
  leaveDeducted: number;
  fullDayLeaves: number;
  halfDayLeaves: number;
  violationLeave: number;
}

export const REQUIRED_MINS = 8 * 60 + 40;
export const HALF_MINS = 4 * 60 + 20;
export const MIN_HALF_MINS = 2 * 60;
export const LATE_CUTOFF_MINS = 10 * 60 + 1; // > 10:00 ⇒ late-arrival (full-day violation)
export const EARLY_CUTOFF_MINS = 15 * 60; // < 15:00 ⇒ early-out
export const HALF_DAY_PUNCH_CUTOFF = 11 * 60; // > 11:00 ⇒ half day
export const FULL_DAY_MIN_MINS = 5 * 60;
