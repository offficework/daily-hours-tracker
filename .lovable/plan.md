## Plan: Rule refinements + Hinglish notes + Health Meter

### 1. Rule corrections in `src/lib/hours-calc.ts`

**A. Leave-deducted days suppress violations (NEW core rule)**
- When `fullDayLeave === true` (worked < 2h, or half-day core-hours fail):
  - Force `late = false`, `earlyOut = false`
  - Skip violation counting in `groupByCycle`
- Also when `isMo`, already handled.

**B. Off-Saturday support (rules 5–7)**
- Add helper `isOffSaturday(date)`:
  - 2022-23 fiscal years (Apr 2022 – Mar 2025-ish): 1st & 3rd Saturday of month off, only in fiscal Q1–Q3 (Apr–Dec)
  - From fiscal 2025-26 onward (Apr 2025+): only 1st Saturday off, only in fiscal Q4 (Jan–Mar)
- Treat off-Saturday like Sunday/Holiday: all hours extra, no short, no violation. Status badge "Off Sat".

**C. Half-day core-hours rule (31–32)**
- Half day requires ≥ 2 core hrs either before 10:00 OR after 12:30.
- If neither satisfied → `fullDayLeave = true`, note "Half day core hours not met — leave deducted".

**D. Full-day boundary clarifications (23–25)**
- Rule 23: firstIn < 10:01 AND lastOut ≥ 15:00 AND work ≥ 5h → Full, no violation.
- Rule 24: firstIn in [10:00, 11:00] AND work ≥ 5h → Full + violation (already covered by `lateFullDayArrival`).
- Rule 25: lastOut in [13:30, 15:00) AND work ≥ 5h → Full + violation. Currently `earlyOut` triggers if `lastOut < 15:00` regardless of work hours — refine so it only marks Full+violation when work ≥ 5h; otherwise it's Half.

**E. Half-day violation rules (33–35)**
- Rule 33: If FirstHalf OUT < 11:00 (i.e. employee left before 11:00 in morning session) → violation.
- Rule 34: If SecondHalf IN > 13:30 → violation.
- Rule 35: firstIn > 13:30 AND work ≥ 2h → Half + violation. (currently using `>`, keep.)

**F. MO date adjustments (18–21)**
- MO: no violations (already), but if worked < 2h → Half Day Leave (not Full). Currently full-day leave; change to half-day leave for MO.

**G. Monthly excess-violation note (37)**
- Change current per-day note text to: "Half Day Leave Deducted Due To Excess Violations".

### 2. Hinglish notes layer

New file `src/lib/hinglish-notes.ts` exporting `funNote(day)` that returns a random emoji-tagged line based on day flags:
- late → late pool
- earlyOut → early-exit pool
- status === "half" → half-day pool
- violations on day → violation pool
- status === "full" && no issues → full-day pool
- extraMins > 0 → extra pool
- fullDayLeave → leave pool

Render in `DailyTable.tsx` as a small italic line under existing notes, toggleable via a "Fun mode" switch in the index header (default ON). State stored in `localStorage`.

### 3. Attendance Health Meter

New component `src/components/HealthMeter.tsx`:
- Score formula per cycle:
  - Start 100
  - −2 per violation
  - −5 per half day
  - −10 per absent / leave deducted
  - +1 per day with extra hours (cap +10)
  - clamp 0–100
- Bands: 90+ Excellent (emerald), 70–89 Good (sky), 50–69 Risk Zone (amber), <50 HR Incoming ☎️ (rose).
- Display as a large semicircular gauge (SVG arc) + label + funny tagline, placed at top of each `MonthlySummary` card.

### 4. UI touches in `src/routes/index.tsx`
- Add "Fun mode" toggle (Switch) next to existing controls.
- Pass `funMode` down to DailyTable.

### Files to edit / add
- edit `src/lib/punch-types.ts` — add `isOffSaturday` flag to `DayResult`, half-day required mins helper.
- edit `src/lib/hours-calc.ts` — rules A–G above.
- add `src/lib/hinglish-notes.ts` — fun note pools + picker.
- add `src/components/HealthMeter.tsx` — gauge component.
- edit `src/components/DailyTable.tsx` — render fun note, "Off Sat"/"Leave" badges, suppress late/early badges when fullDayLeave.
- edit `src/components/MonthlySummary.tsx` — embed HealthMeter at top.
- edit `src/routes/index.tsx` — Fun mode toggle.

### Out of scope
- No parser changes, no backend, no new routes.
