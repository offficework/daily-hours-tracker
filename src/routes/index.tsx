import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PunchInput } from "@/components/PunchInput";
import { DailyTable } from "@/components/DailyTable";
import { MonthlySummary } from "@/components/MonthlySummary";
import { Charts } from "@/components/Charts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parsePunches } from "@/lib/punch-parser";
import { computeAllDays, groupByCycle } from "@/lib/hours-calc";
import { Clock } from "lucide-react";

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
  const [submitted, setSubmitted] = useState("");
  const [selectedCycle, setSelectedCycle] = useState<string>("");

  const cycles = useMemo(() => {
    if (!submitted.trim()) return [];
    const days = computeAllDays(parsePunches(submitted));
    return groupByCycle(days);
  }, [submitted]);

  const activeCycle = useMemo(() => {
    if (!cycles.length) return null;
    return cycles.find((c) => c.start === selectedCycle) ?? cycles[cycles.length - 1];
  }, [cycles, selectedCycle]);

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
        <PunchInput value={raw} onChange={setRaw} onCalculate={() => setSubmitted(raw)} />

        {cycles.length > 0 && activeCycle && (
          <>
            <div className="flex items-center gap-3">
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
