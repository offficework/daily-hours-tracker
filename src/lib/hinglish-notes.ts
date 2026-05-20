import type { DayResult } from "./punch-types";

const POOLS = {
  late: [
    "Aaj fir alarm jeet gaya 😴",
    "Traffic tha ya neend zyada thi? 🚦",
    "10 baje ke baad entry cinematic lagti hai 🎬",
  ],
  early: [
    "Office se emotional disconnect detected 🏃",
    "Dil toh office mein tha hi nahi 😄",
  ],
  half: [
    "Aaj attendance ne bhi half commitment diya 😅",
    "Lunch ke baad system hi nahi utha 🍛",
  ],
  violation: [
    "HR watching silently 👀",
    "Violation combo unlocked 🎯",
  ],
  full: [
    "Corporate warrior mode ON ⚔️",
    "Aaj toh HR bhi khush hoga 😎",
  ],
  extra: [
    "Overtime ka prachand pradarshan 🔥",
    "Office ne ghar jaisa feel kar diya 🏢",
  ],
  leave: [
    "Salary slipped slightly 💸",
    "Leave balance ko nazar lag gayi 😭",
  ],
  rest: [
    "Aaram haram nahi hai 🛌",
    "Off day vibes ✨",
  ],
  error: [
    "Punch machine ne dhokha de diya 🤖",
  ],
};

// deterministic pseudo-random pick based on date so the note is stable
function pick(arr: string[], seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

export function funNoteFor(d: DayResult): string {
  if (d.hasError) return pick(POOLS.error, d.date);
  if (d.fullDayLeave || d.halfDayLeave) return pick(POOLS.leave, d.date);
  if (d.isHoliday || d.isSunday || d.isOffSaturday) return pick(POOLS.rest, d.date);
  if (d.isMo) return "MO chill mode 🧘";
  if (d.late || d.earlyOut) {
    const parts: string[] = [];
    if (d.late) parts.push(pick(POOLS.late, d.date));
    if (d.earlyOut) parts.push(pick(POOLS.early, d.date + "e"));
    if (parts.length === 2) parts.push(pick(POOLS.violation, d.date + "v"));
    return parts.join(" · ");
  }
  if (d.status === "half") return pick(POOLS.half, d.date);
  if (d.extraMins >= 30) return pick(POOLS.extra, d.date);
  if (d.status === "full") return pick(POOLS.full, d.date);
  return "";
}
