## Goal

Align the calculator with the latest rules. Most rules already work; this plan covers the gaps:

1. **Rule 16** — Arrival 10:00–10:59:59 with 2h ≤ worked < 5h must be a half day **without** violation. Today it's marked late (violation) because `lateFullDay` is set whenever first-in ≥ 10:01 and < 11:00, regardless of how long they worked.

2. **Rule 10** — Each violation beyond 3 in a cycle deducts **0.5 day** (currently a flat one-time 0.5). Also surface a "Leave deducted: X day(s) for extra violations" note in the cycle summary / day notes.

3. **Required-hours line in the Daily Hours chart** — Currently hard-coded to 8h 40m via `REQUIRED_MINS`. Change to a per-bar required line using `requiredMinsForDate` so Jan–Mar shows 8h 18m.

## Technical changes

### `src/lib/hours-calc.ts` — `computeDay`
- Re-classify lateness after status is decided:
  - If final `status === "half"` and `firstIn.minutes < HALF_DAY_PUNCH_CUTOFF` (i.e. came before 11:00 but only worked <5h), set `late = false` and drop the violation note. Keep `lateHalfDay` violation only when firstIn ≥ 13:30.
  - Keep `lateFullDay` violation only when final status is `"full"` and firstIn is in 10:01–10:59:59 (i.e. they actually completed a full day despite being late).
- Net effect: violation for "late" only when (a) full day completed but came 10:01–10:59, or (b) came ≥ 13:30.

### `src/lib/hours-calc.ts` — `groupByCycle`
- Replace flat `violationLeave = violations > 3 ? 0.5 : 0` with `violationLeave = Math.max(0, violations - 3) * 0.5`.
- Append a synthetic note on the cycle (or on the last violation day) like `"+0.5 day leave deducted (violation #4)"` for each violation past 3, so it's visible in the Daily Report notes.

### `src/components/Charts.tsx`
- Compute `reqHrs` per day from `requiredMinsForDate(d.date)`; add a `required` field to the `daily` dataset and render the dashed line via `dataKey="required"` instead of a constant.
- Update chart title to "Daily Hours vs Required".

## Out of scope

- No parser, route, calendar UI, or styling changes.
- No edits to `punch-types.ts` constants.
- MO calendar picker, holiday picker, charts, footer caution, and even-punch error already exist and are unchanged.
