# Employee Hours Calculator — Plan

A fully offline, single-page web app where you paste punch text or upload a `.txt` file and get daily + monthly summaries with charts. Runs in the browser, no backend, no network calls.

## What it does

**Input**
- Large textarea to paste raw punch lines (same format as your sample).
- File upload button accepting `.txt` / `.csv`.
- Parser is tolerant of extra whitespace/tabs and the header row.

**Per-day calculation**
For each date, punches are sorted by time and paired sequentially (in/out/in/out…).
- **Worked time** = sum of (out − in) across all pairs, EXCLUDING:
  - LWRK pairs (lunch) — these are lunch out/in, not worked
  - For STD/REG/POUT: counts as worked
  - For OOUT: counts as worked, no lunch deduction applied
- **Lunch handling (Rule 2)**: If the day has an LWRK pair, the actual LWRK duration is the lunch break (no implicit deduction). If the day has NO LWRK pair and the worked window spans 12:00–12:30, deduct 30 min as default lunch (no "short hours" penalty). Days with OOUT also skip lunch deduction (Rule 9).
- First IN time and last OUT time captured for violation checks.

**Day classification**
- Required full day = **8h 40m**
- Half day = **4h 20m**, minimum 2h to count as half day
- Half day if: total worked < 5h OR first punch ≥ 11:00:00 OR (worked ≥ 2h but < required)
- Otherwise: full day
- < 2h worked = absent (no credit)

**Violations (per day)**
- Late: first IN > 10:01:00
- Early-out: last OUT < 15:00:00
A day can have 0, 1, or 2 violations. Total counted per monthly cycle.

**Monthly cycle (23rd → 22nd)**
- Selectable month (defaults to cycle containing today).
- Aggregates: full days, half days, absents, total hours, violations.
- If violations > 3 in the cycle: **0.5 day leave deducted** (shown explicitly).

**Reports & UI**
1. **Daily table**: Date, First In, Last Out, Worked (h:mm), Lunch, Status (Full/Half/Absent), Violations (Late/Early flags), Notes (LWRK, OOUT, REG, etc.)
2. **Monthly summary card**: cycle range, full days, half days, absents, total hours, violations count, leave deducted.
3. **Charts** (using Recharts):
   - Bar chart: daily worked hours vs required line at 8h40m
   - Pie chart: Full / Half / Absent distribution
   - Bar chart: violations per day (late vs early)
   - Line chart: cumulative hours across the cycle
4. **Cycle selector** dropdown (auto-detects all cycles present in the data).
5. **Export**: download the daily table as CSV.

**Offline guarantee**
- Pure client-side: parsing, calc, charts all in-browser.
- I'll add a "Download standalone HTML" button later if you want a single-file deployable, but the dev build also runs offline once loaded.

## Technical details

- New route `src/routes/index.tsx` replacing the placeholder.
- `src/lib/punch-parser.ts` — tokenizes lines, handles tab/space irregularities, parses `dd.mm.yyyy` and `HH:mm:ss`.
- `src/lib/hours-calc.ts` — pure functions: `computeDay(punches)`, `computeCycle(days, cycleStart)`, `getCycleForDate(date)`.
- `src/lib/punch-types.ts` — types and rule constants (REQUIRED_MINS=520, HALF_MINS=260, LATE_CUTOFF, EARLY_CUTOFF, etc.).
- `src/components/PunchInput.tsx` — textarea + file upload.
- `src/components/DailyTable.tsx`, `MonthlySummary.tsx`, `Charts.tsx`.
- Charts via `recharts` (already common in shadcn templates; will `bun add` if missing).
- Unit-test the calc against your sample data inline (dev-only sanity check in console) — no test runner needed.

## Open assumptions (flagging — let me know if any are wrong)

1. **Punch pairing**: I'll pair sorted punches sequentially (1st=IN, 2nd=OUT, 3rd=IN…). LWRK pairs are treated as a lunch-out/lunch-in segment that's subtracted, not added to work.
2. **Default lunch**: 30 min auto-deducted for STD-only days whose worked span crosses 12:00–12:30; skipped if LWRK or OOUT present. Tell me if you'd rather never auto-deduct.
3. **REG punch**: treated like STD (regularised normal punch).
4. **"Leave deducted" on >3 violations**: shown as 0.5 day deduction in the monthly card; not subtracted from worked hours, just reported.
5. **Multiple employees**: Sample shows one person. The UI handles one paste at a time. If you need multi-employee batches in the same paste, say the word and I'll add an employee splitter (would need an ID column in the data).

Approve and I'll build it.
