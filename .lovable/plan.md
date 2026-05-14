# Plan: Finalize attendance rules + MO calendar picker

Most rules are already implemented. This pass tightens two gaps and upgrades the MO input UX.

## Changes

### 1. Replace MO textarea with a calendar multi-select (Rule 14)
- File: `src/routes/index.tsx`
- Swap the `<Textarea>` MO input for a Shadcn `Calendar` in `mode="multiple"` inside a `Popover`, plus a chip list of selected dates with a remove (×) button each and a "Clear all" action.
- State becomes `moDates: Date[]` instead of a raw string. Convert to `Set<string>` of `yyyy-mm-dd` before passing into `computeAllDays`.
- Remove `parseMoDates` usage from the route (keep the helper exported for back-compat, or drop it — see Technical notes).
- Trigger recompute automatically when MO dates change (no need to re-click Calculate).

### 2. No violations on MO dates (Rule 14 extension)
- File: `src/lib/hours-calc.ts`, `groupByCycle`
- Currently `late`/`earlyOut` flags from MO days still increment `summary.violations`. Skip violation counting when `day.isMo` is true.
- Also force `late = false` and `earlyOut = false` inside `computeDay` when `isMo` so the daily table doesn't show violation badges on MO rows.

### 3. Sanity pass on existing rules
Verify (no code change expected unless a gap surfaces):
- Rule 1: `REQUIRED_MINS = 520` ✓
- Rule 2: LWRK 12:00–12:30 overlap protected ✓
- Rule 5: late `>10:01`, early `<15:00` ✓
- Rule 6: `<5h ⇒ half` ✓
- Rule 7: first punch `>=11:00 ⇒ half` ✓
- Rule 8a: `<2h ⇒ full leave + hours as extra` ✓
- Rule 8b: half target `4h20m` ✓
- Rule 9: OOUT skips short hours ✓ (also skip violations for parity? — confirm with user, see Q1)
- Rule 10: `>3 violations ⇒ 0.5 day` ✓
- Rule 11: badges + leave shown ✓
- Rule 13: Charts component already rendered ✓

## Technical notes
- Keep `parseMoDates` exported but unused in the route — safe to leave for now, remove in a later cleanup.
- Calendar uses `mode="multiple"`, `selected={moDates}`, `onSelect={setMoDates}`, with `className="p-3 pointer-events-auto"`.
- Selected-date chips use `date-fns` `format(d, "dd MMM yyyy")` for display; storage key is ISO `yyyy-mm-dd`.
- The `useMemo` for `cycles` already depends on the MO source — switch its dep from `submittedMo` to the `moDates` array (stringified) so changes apply live.

## Open question
**Q1.** Rule 9 (OOUT) currently still counts late/early as violations. Should OOUT days also be excluded from violation counting like MO days? (Your spec only excludes short hours for OOUT, so default is **no change** unless you say otherwise.)
