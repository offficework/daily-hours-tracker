## Goal

Show every punch (time + code) for each day in the Daily Report table.

## Change

`src/components/DailyTable.tsx` — Remove the lunch column.  Add a new "Punches" column between "In"(first punch) and "Out"(last punch) that lists all punches for the day as small chips, e.g. `09:43:07 STD`, `12:05:11 LWRK`, `12:28:42 LWRK`, `19:05:43 STD`. Each chip uses a Badge with a subtle color per code (STD=slate, LWRK=violet, OOUT=blue, POUT=amber, REG=emerald, NGHT=indigo, LLCH=orange, CANT=teal, DEL=red, fallback=outline). Chips wrap inside the cell. Also include them in the CSV export as a single `Punches` column (semicolon-separated `HH:mm:ss/CODE`).

## Out of scope

No calculation/business-logic changes. No edits to parser, hours-calc, or routes.