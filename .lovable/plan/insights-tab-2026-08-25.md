# Insights Tab

Add a second tab, **Insights**, beside the existing **Data** tab. The Data tab keeps today's page exactly as-is (input, MO/holiday pickers, overall strip, monthly summary, charts, daily table). Insights is a pure reporting layer over the already-computed cycles — no calculation rule changes.

## Structure

- `src/routes/index.tsx` gets a Tabs shell: `Data` (existing content, unmoved) and `Insights` (new). Punch text, MO/holiday dates, theme, and Hinglish toggle stay shared state so both tabs see the same results.
- New `src/components/insights/*` components; a new `src/lib/insights.ts` aggregates `CycleSummary[]` / `DayResult[]` into month- and period-level rollups. It only reads existing fields (`workedMins`, `shortMins`, `extraMins`, `status`, `late`, `earlyOut`, `fullDayLeave`, `halfDayLeave`, `hasError`, `isMo`, `isHoliday`, `isSunday`, `isOffSaturday`, `violations`, `leaveDeducted`, `violationLeave`).

## Filters (top of Insights)

- Financial year (Apr–Mar, derived from loaded data)
- Attendance cycle (23rd → 22nd, existing cycle list) — "All cycles" or a specific one
- Month

Every card, table, chart, and insight recomputes from the filtered day set.

## Sections

1. **Summary cards** — Total worked, required, short, extra, net (`extra − short`, signed `+`/`−`, zero as `00:00`), full days, half days, leave deducted, violations, working days, non-working days worked.
2. **Violation summary table** — Month | # violations | violation date+time list | leave deducted (`(violations − 3) × 0.5` day when > 3, else "No").
3. **Month-wise short/extra table** — Month | Short hh:mm (days) | Extra hh:mm (days) | Neutral 00:00 (days, where short = extra = 0) | Net hh:mm (days), with a Total row.
4. **Attendance status summary** — full, half, leave-deducted, invalid-punch, MO, holiday/Sunday-worked days; leave deduction split into full-day, half-day, violation-based, and MO-related.
5. **Monthly performance table** — Month | Full | Half | Violations | Leave deducted | Short | Extra | Net.
6. **Charts** (recharts, responsive): donut Full/Half/Leave-deducted; grouped bar month-wise short vs extra; bar monthly violations (months > 3 highlighted red); line net-hours trend.
7. **Attendance Insights** — auto-generated observations (best/worst month, highest short/extra/violation month, totals, full/half/leave percentages), only when data supports them.
8. **Attention Required** — warnings: violations remaining before next deduction, highest-violation month, highest-short month, invalid punch days, leave deducted for insufficient hours.
9. **Positive Performance** — net-positive total, non-working days worked, best extra-hours month, violation-free months.
10. **Export** — CSV, Excel (SheetJS-style CSV/XLSX), and Print view covering summary cards, violation table, month-wise table, status summary, and insights.

## Colors

Green positive/full/extra, orange half/warning, red violation/leave/short, blue neutral — using existing tokens and the current card/table styling. Minimal animation.

## Note

The spec lists a "Core Hours Condition Leave Deduction" row. That rule was removed from the calculator earlier, so this row will render as `—` (0) rather than reintroducing the rule.
