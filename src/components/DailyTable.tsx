import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import type { DayResult, Punch } from "@/lib/punch-types";
import { fmtHM } from "@/lib/hours-calc";

function statusBadge(d: DayResult) {
  if (d.hasError) return <Badge variant="destructive">Error</Badge>;
  if (d.isMo) return <Badge className="bg-indigo-600 hover:bg-indigo-600">MO</Badge>;
  if (d.isHoliday) return <Badge className="bg-amber-600 hover:bg-amber-600">Holiday</Badge>;
  if (d.isOffSaturday) return <Badge className="bg-teal-600 hover:bg-teal-600">Off Sat</Badge>;
  if (d.isSunday) return <Badge className="bg-sky-600 hover:bg-sky-600">Sunday</Badge>;
  if (d.fullDayLeave) return <Badge className="bg-rose-600 hover:bg-rose-600">Leave</Badge>;
  if (d.status === "full") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Full</Badge>;
  if (d.status === "half") return <Badge className="bg-amber-500 hover:bg-amber-500">Half</Badge>;
  return <Badge variant="destructive">Absent</Badge>;
}

const CODE_CLASS: Record<string, string> = {
  STD: "border-slate-400 text-slate-700 dark:text-slate-300",
  LWRK: "border-violet-500 text-violet-600",
  OOUT: "border-blue-500 text-blue-600",
  POUT: "border-amber-500 text-amber-600",
  REG: "border-emerald-500 text-emerald-600",
  NGHT: "border-indigo-500 text-indigo-600",
  LLCH: "border-orange-500 text-orange-600",
  CANT: "border-teal-500 text-teal-600",
  DEL: "border-red-500 text-red-600",
};

function PunchChip({ p }: { p: Punch }) {
  const cls = CODE_CLASS[p.code] ?? "border-muted-foreground/40 text-muted-foreground";
  return (
    <Badge variant="outline" className={`mr-1 mb-1 font-mono text-[10px] ${cls}`}>
      {p.time} <span className="ml-1 font-semibold">{p.code}</span>
    </Badge>
  );
}

export function DailyTable({ days, funMode = true }: { days: DayResult[]; funMode?: boolean }) {
  const exportCsv = () => {
    const rows = [
      ["Date", "Punches", "Worked", "Status", "Short/Extra", "Late", "Early Out", "Notes"],
      ...days.map((d) => [
        d.date,
        d.punches.map((p) => `${p.time}/${p.code}`).join("; "),
        d.hasError ? "" : fmtHM(d.workedMins),
        d.hasError ? "error" : d.status,
        d.hasError ? "" : d.shortMins ? `-${fmtHM(d.shortMins)}` : d.extraMins ? `+${fmtHM(d.extraMins)}` : "",
        d.late ? "Y" : "",
        d.earlyOut ? "Y" : "",
        d.notes.join("; "),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "daily-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Daily Report</CardTitle>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Punches</TableHead>
              <TableHead>Worked</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Short / Extra</TableHead>
              <TableHead>Violations</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((d) => (
              <TableRow key={d.date} className={d.hasError ? "bg-red-50/40" : undefined}>
                <TableCell className="font-mono text-xs">{d.date}</TableCell>
                <TableCell className="min-w-[220px]">
                  <div className="flex flex-wrap">
                    {d.punches.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      d.punches.map((p, i) => <PunchChip key={i} p={p} />)
                    )}
                  </div>
                </TableCell>
                <TableCell>{d.hasError ? <span className="text-xs text-red-600">—</span> : fmtHM(d.workedMins)}</TableCell>
                <TableCell>{statusBadge(d)}</TableCell>
                <TableCell className="space-x-1 text-xs">
                  {!d.hasError && d.shortMins > 0 && <Badge variant="outline" className="border-red-500 text-red-600">−{fmtHM(d.shortMins)}</Badge>}
                  {!d.hasError && d.extraMins > 0 && <Badge variant="outline" className="border-blue-500 text-blue-600">+{fmtHM(d.extraMins)}</Badge>}
                  {d.fullDayLeave && <Badge variant="destructive">1d leave</Badge>}
                  {d.halfDayLeave && <Badge className="bg-rose-500 hover:bg-rose-500">½d leave</Badge>}
                </TableCell>
                <TableCell className="space-x-1">
                  {d.late && <Badge variant="outline" className="border-red-500 text-red-600">Late</Badge>}
                  {d.earlyOut && <Badge variant="outline" className="border-orange-500 text-orange-600">Early</Badge>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <div>{d.notes.join(", ")}</div>
                  {funMode && d.funNote && (
                    <div className="mt-1 italic text-[11px] text-indigo-500/80">{d.funNote}</div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
