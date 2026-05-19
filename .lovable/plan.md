## Goal

1. **UI**: bigger overall summary tiles; put MO Dates and Holidays pickers side-by-side (50/50) in one row.
2. **Logic fixes** to match the canonical examples:
   - Half-day violation cutoff is **strictly after 13:30:00** (currently `≥ 13:30` flags 13:30:00 itself).
   - `earlyOut` violation must only apply to **full-day attempts**, not to half days that come from `firstIn ≥ 11:00`. Today a half-day with `lastOut < 15:00` still flips `earlyOut=true`, producing a phantom violation.
   - When `< 2h` worked, status badge says "Absent". Per Rule 20 it should display as **"Leave"** (Full Day Leave Deducted), distinct from a no-punch absent day.

Everything else in `hours-calc.ts` already matches the example table (full-day pre-15:00 exit violation, late 10:01–10:59 full-day violation, half-day no-violation for 11:00–13:30 in, half-day no-violation for 10:00–11:00 with 2–5h, etc.).

## Technical changes

### `src/routes/index.tsx`
- Wrap the MO Dates `Card` and Holidays `Card` in a `grid grid-cols-1 md:grid-cols-2 gap-4` container; remove their stand-alone stacking. Cards keep their existing internal markup.
- Replace the inline overall summary chips (currently `text-xs … rounded-md border px-2 py-1`) with a 4-column responsive card grid (`grid grid-cols-2 md:grid-cols-4 gap-3`) where each tile shows a small uppercase label and a large value (e.g. `text-sm` label + `text-2xl font-semibold` value, with the same color accents for extra/short/net). Move it out of the cycle-selector row into its own block above `MonthlySummary`.

### `src/lib/hours-calc.ts`
- Change `HALF_DAY_VIOLATION_CUTOFF` comparison from `firstIn.minutes >= 810` to `firstIn.minutes > 810` (rule 19: `> 13:30:00`).
- Compute `earlyOut` only when the day is a full-day attempt: `earlyOut = !isMo && !isRest && firstIn.minutes < HALF_DAY_PUNCH_CUTOFF && lastOut.minutes < EARLY_CUTOFF_MINS`. This keeps rule 13's violation for the `08:16 – 14:58` case while removing the false positive for `11:00 – 14:30` etc.
- Add a new status `"leave"` (or reuse `fullDayLeave` flag with a dedicated badge) so `DailyTable` can render "Leave" for the `<2h` case instead of "Absent". Simplest: keep `status: "absent"` but in `DailyTable.statusBadge`, branch on `d.fullDayLeave` first and render a distinct badge (`bg-rose-600` "Leave"). No type change needed.

### `src/components/DailyTable.tsx`
- In `statusBadge`, return a "Leave" badge when `d.fullDayLeave` is true (checked before the existing absent branch).

## Out of scope

- No parser, route, or chart changes.
- No new types in `punch-types.ts`.
- No changes to MO / Holiday calendar mechanics, just their layout.
