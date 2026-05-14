import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import type { DayResult } from "@/lib/punch-types";
import { fmtHM } from "@/lib/hours-calc";

function statusBadge(s: DayResult["status"]) {
  if (s === "full") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Full</Badge>;
  if (s === "half") return <Badge className="bg-amber-500 hover:bg-amber-500">Half</Badge>;
  return <Badge variant="destructive">Absent</Badge>;
}

export function DailyTable({ days }: { days: DayResult[] }) {
  const exportCsv = () => {
    const rows = [
      ["Date", "First In", "Last Out", "Worked", "Lunch", "Status", "Late", "Early Out", "Notes"],
      ...days.map((d) => [
        d.date,
        d.firstIn ?? "",
        d.lastOut ?? "",
        fmtHM(d.workedMins),
        fmtHM(d.lunchMins),
        d.status,
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
              <TableHead>In</TableHead>
              <TableHead>Out</TableHead>
              <TableHead>Worked</TableHead>
              <TableHead>Lunch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Violations</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((d) => (
              <TableRow key={d.date}>
                <TableCell className="font-mono text-xs">{d.date}</TableCell>
                <TableCell className="font-mono text-xs">{d.firstIn ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{d.lastOut ?? "—"}</TableCell>
                <TableCell>{fmtHM(d.workedMins)}</TableCell>
                <TableCell className="text-muted-foreground">{fmtHM(d.lunchMins)}</TableCell>
                <TableCell>{statusBadge(d.status)}</TableCell>
                <TableCell className="space-x-1">
                  {d.late && <Badge variant="outline" className="border-red-500 text-red-600">Late</Badge>}
                  {d.earlyOut && <Badge variant="outline" className="border-orange-500 text-orange-600">Early</Badge>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.notes.join(", ")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
