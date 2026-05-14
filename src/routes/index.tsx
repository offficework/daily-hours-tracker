import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PunchInput } from "@/components/PunchInput";
import { DailyTable } from "@/components/DailyTable";
import { MonthlySummary } from "@/components/MonthlySummary";
import { Charts } from "@/components/Charts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { parsePunches } from "@/lib/punch-parser";
import { computeAllDays, groupByCycle, parseMoDates } from "@/lib/hours-calc";
import { Clock, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Employee Hours Calculator" },
      { name: "description", content: "Offline daily and monthly attendance hours calculator." },
    ],
  }),
  component: Index,
});

function Index() {
  const [raw, setRaw] = useState("");
  const [moRaw, setMoRaw] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [submittedMo, setSubmittedMo] = useState("");
  const [selectedCycle, setSelectedCycle] = useState<string>("");

  const cycles = useMemo(() => {
    if (!submitted.trim()) return [];
    const moDates = parseMoDates(submittedMo);
    const days = computeAllDays(parsePunches(submitted), moDates);
    return groupByCycle(days);
  }, [submitted, submittedMo]);

  const activeCycle = useMemo(() => {
    if (!cycles.length) return null;
    return cycles.find((c) => c.start === selectedCycle) ?? cycles[cycles.length - 1];
  }, [cycles, selectedCycle]);

  const handleCalc = () => {
    setSubmitted(raw);
    setSubmittedMo(moRaw);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Clock className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Employee Hours Calculator</h1>
            <p className="text-xs text-muted-foreground">Cycle: 23rd → 22nd · Required 8h 40m · Runs fully offline</p>
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
          <CardContent className="space-y-2">
            <Textarea
              value={moRaw}
              onChange={(e) => setMoRaw(e.target.value)}
              placeholder="One date per line, comma or space-separated. e.g.&#10;15.04.2026&#10;22.04.2026, 30.04.2026"
              className="min-h-[80px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              On MO dates short hours are not calculated. Click Calculate above to apply.
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
    </div>
  );
}
