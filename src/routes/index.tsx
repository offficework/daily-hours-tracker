import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsightsTab } from "@/components/insights/InsightsTab";
import { parsePunches } from "@/lib/punch-parser";
import { computeAllDays, groupByCycle } from "@/lib/hours-calc";
import { Clock, CalendarDays, X, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Employee Hours Calculator" },
      { name: "description", content: "Offline daily and monthly attendance hours calculator." },
        { property: "og:title", content: "Employee Hours Calculator" },
        { property: "og:description", content: "Offline daily and monthly attendance hours calculator." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
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
  const [funMode, setFunMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("funMode") === "1";
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") window.localStorage.setItem("theme", next);
      return next;
    });
  };

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
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Employee Hours Calculator</h1>
            <p className="text-xs text-muted-foreground">Cycle: 23rd → 22nd · 8h 40m (Apr–Dec) / 8h 18m (Jan–Mar)</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="data" className="space-y-6">
          <TabsList aria-label="Attendance views">
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-6">
            <PunchInput value={raw} onChange={setRaw} onCalculate={handleCalc} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                MO dates are excluded from short-hour and violation calculations.
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
                Sundays & holidays count all worked hours as extra; no short hours or violations.
              </p>
            </CardContent>
          </Card>
        </div>


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
              <div className="ml-auto flex items-center gap-2">
                <Label htmlFor="fun-mode" className="text-xs text-muted-foreground">Hinglish notes</Label>
                <Switch
                  id="fun-mode"
                  checked={funMode}
                  onCheckedChange={(v) => {
                    setFunMode(v);
                    if (typeof window !== "undefined") window.localStorage.setItem("funMode", v ? "1" : "0");
                  }}
                />
              </div>
            </div>

            {(() => {
              const totExtra = cycles.reduce((s, c) => s + c.totalExtraMins, 0);
              const totShort = cycles.reduce((s, c) => s + c.totalShortMins, 0);
              const totWorked = cycles.reduce((s, c) => s + c.totalMins, 0);
              const totViolations = cycles.reduce((s, c) => s + c.violations, 0);
              const totFullDays = cycles.reduce((s, c) => s + c.fullDays, 0);
              const totHalfDays = cycles.reduce((s, c) => s + c.halfDays, 0);
              const totPresentDays = totFullDays + totHalfDays;
              const net = totExtra - totShort;
              const fmt = (m: number) => {
                const h = Math.floor(Math.abs(m) / 60);
                const mm = Math.round(Math.abs(m) % 60);
                return `${m < 0 ? "-" : ""}${h}h ${String(mm).padStart(2, "0")}m`;
              };
              const Tile = ({ label, value, className }: { label: string; value: string; className?: string }) => (
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className={`mt-1 text-2xl font-semibold ${className ?? ""}`}>{value}</div>
                </div>
              );
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Tile label="Overall worked" value={fmt(totWorked)} />
                  <Tile label="Present days" value={`${totPresentDays}`} />
                  <Tile label="Overall extra" value={fmt(totExtra)} className="text-emerald-600 dark:text-emerald-400" />
                  <Tile label="Overall short" value={fmt(totShort)} className="text-red-600 dark:text-red-400" />
                  <Tile
                    label="Overall net"
                    value={`${net >= 0 ? "+" : ""}${fmt(net)}`}
                    className={net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
                  />
                  <Tile
                    label="Violations"
                    value={String(totViolations)}
                    className={totViolations > 3 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}
                  />
                </div>
              );
            })()}


            <MonthlySummary cycle={activeCycle} />
            <Charts cycle={activeCycle} />
            <DailyTable days={activeCycle.days} funMode={funMode} />
          </>
        )}

            {submitted && cycles.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No valid punches found. Check the format: <code>dd.mm.yyyy &nbsp; HH:mm:ss &nbsp; clock &nbsp; CODE</code>
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights">
            <InsightsTab cycles={cycles} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t mt-8 py-4 text-center text-xs text-muted-foreground">
        ⚠️ It can make mistakes, check at your own risk.
      </footer>
    </div>
  );
}
