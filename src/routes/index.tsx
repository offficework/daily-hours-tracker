import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { PunchInput } from "@/components/PunchInput";
import { DailyTable } from "@/components/DailyTable";
import { MonthlySummary } from "@/components/MonthlySummary";
import { Charts } from "@/components/Charts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { parsePunches } from "@/lib/punch-parser";
import { computeAllDays, groupByCycle } from "@/lib/hours-calc";
import { Clock, CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Employee Hours Calculator" },
      { name: "description", content: "Offline daily and monthly attendance hours calculator." },
    ],
  }),
  component: Index,
});

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function Index() {
  const [raw, setRaw] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [moDates, setMoDates] = useState<Date[]>([]);
  const [holidayDates, setHolidayDates] = useState<Date[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string>("");

  const moKey = useMemo(() => moDates.map(toIsoDate).sort().join(","), [moDates]);
  const holKey = useMemo(() => holidayDates.map(toIsoDate).sort().join(","), [holidayDates]);

  const cycles = useMemo(() => {
    if (!submitted.trim()) return [];
    const moSet = new Set(moDates.map(toIsoDate));
    const holSet = new Set(holidayDates.map(toIsoDate));
    const days = computeAllDays(parsePunches(submitted), moSet, holSet);
    return groupByCycle(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, moKey, holKey]);

  const activeCycle = useMemo(() => {
    if (!cycles.length) return null;
    return cycles.find((c) => c.start === selectedCycle) ?? cycles[cycles.length - 1];
  }, [cycles, selectedCycle]);

  const handleCalc = () => setSubmitted(raw);

  const removeMo = (iso: string) =>
    setMoDates((prev) => prev.filter((d) => toIsoDate(d) !== iso));
  const removeHoliday = (iso: string) =>
    setHolidayDates((prev) => prev.filter((d) => toIsoDate(d) !== iso));

  const sortedMo = [...moDates].sort((a, b) => a.getTime() - b.getTime());
  const sortedHol = [...holidayDates].sort((a, b) => a.getTime() - b.getTime());

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Clock className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Employee Hours Calculator</h1>
            <p className="text-xs text-muted-foreground">Cycle: 23rd → 22nd · 8h 40m (Apr–Dec) / 8h 18m (Jan–Mar)</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <PunchInput value={raw} onChange={setRaw} onCalculate={handleCalc} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> MO Dates (optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal")}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {moDates.length ? `${moDates.length} MO date${moDates.length === 1 ? "" : "s"} selected` : "Pick MO dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    selected={moDates}
                    onSelect={(dates) => setMoDates(dates ?? [])}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {moDates.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setMoDates([])}>
                  Clear all
                </Button>
              )}
            </div>
            {sortedMo.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {sortedMo.map((d) => {
                  const iso = toIsoDate(d);
                  return (
                    <Badge key={iso} variant="secondary" className="gap-1 pr-1">
                      {format(d, "dd MMM yyyy")}
                      <button
                        type="button"
                        onClick={() => removeMo(iso)}
                        className="rounded hover:bg-muted-foreground/20 p-0.5"
                        aria-label={`Remove ${iso}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              MO dates are excluded from short-hour and violation calculations and applied automatically.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> Holidays (optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal")}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {holidayDates.length ? `${holidayDates.length} holiday${holidayDates.length === 1 ? "" : "s"} selected` : "Pick holiday dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    selected={holidayDates}
                    onSelect={(dates) => setHolidayDates(dates ?? [])}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {holidayDates.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setHolidayDates([])}>
                  Clear all
                </Button>
              )}
            </div>
            {sortedHol.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {sortedHol.map((d) => {
                  const iso = toIsoDate(d);
                  return (
                    <Badge key={iso} variant="secondary" className="gap-1 pr-1 border-amber-400">
                      {format(d, "dd MMM yyyy")}
                      <button
                        type="button"
                        onClick={() => removeHoliday(iso)}
                        className="rounded hover:bg-muted-foreground/20 p-0.5"
                        aria-label={`Remove ${iso}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Sundays and selected holidays count all worked hours as extra; no short hours or violations apply.
            </p>
          </CardContent>
        </Card>

        {cycles.length > 0 && activeCycle && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">Cycle:</span>
              <Select value={activeCycle.start} onValueChange={setSelectedCycle}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((c) => (
                    <SelectItem key={c.start} value={c.start}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(() => {
                const totExtra = cycles.reduce((s, c) => s + c.totalExtraMins, 0);
                const totShort = cycles.reduce((s, c) => s + c.totalShortMins, 0);
                const totWorked = cycles.reduce((s, c) => s + c.totalMins, 0);
                const net = totExtra - totShort;
                const fmt = (m: number) => {
                  const h = Math.floor(Math.abs(m) / 60);
                  const mm = Math.round(Math.abs(m) % 60);
                  return `${m < 0 ? "-" : ""}${h}h ${String(mm).padStart(2, "0")}m`;
                };
                return (
                  <div className="ml-auto flex flex-wrap gap-2 text-xs">
                    <span className="rounded-md border px-2 py-1">Overall worked: <b>{fmt(totWorked)}</b></span>
                    <span className="rounded-md border px-2 py-1">Overall extra: <b className="text-emerald-700">{fmt(totExtra)}</b></span>
                    <span className="rounded-md border px-2 py-1">Overall short: <b className="text-red-700">{fmt(totShort)}</b></span>
                    <span className={`rounded-md border px-2 py-1 ${net >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                      Overall net: <b>{net >= 0 ? "+" : ""}{fmt(net)}</b>
                    </span>
                  </div>
                );
              })()}
            </div>

            <MonthlySummary cycle={activeCycle} />
            <Charts cycle={activeCycle} />
            <DailyTable days={activeCycle.days} />
          </>
        )}

        {submitted && cycles.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            No valid punches found. Check the format: <code>dd.mm.yyyy &nbsp; HH:mm:ss &nbsp; clock &nbsp; CODE</code>
          </div>
        )}
      </main>

      <footer className="border-t mt-8 py-4 text-center text-xs text-muted-foreground">
        ⚠️ It can make mistakes, check at your own risk.
      </footer>
    </div>
  );
}
