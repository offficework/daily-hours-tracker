import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, Download, Printer, Sheet as SheetIcon } from "lucide-react";
import type { CycleSummary } from "@/lib/punch-types";
import {
  buildInsights, buildObservations, hm, signedHM, isRestDay, MONTH_NAMES,
} from "@/lib/insights";

const GREEN = "#10b981";
const ORANGE = "#f59e0b";
const RED = "#ef4444";
const BLUE = "#3b82f6";

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}-${MONTH_NAMES[Number(m) - 1].slice(0, 3)}-${y}`;
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

const POS = "text-emerald-600 dark:text-emerald-400";
const NEG = "text-red-600 dark:text-red-400";
const WARN = "text-amber-600 dark:text-amber-400";

export function InsightsTab({ cycles }: { cycles: CycleSummary[] }) {
  const [fy, setFy] = useState("all");
  const [cycleKey, setCycleKey] = useState("all");
  const [month, setMonth] = useState("all");

  const allDays = useMemo(() => cycles.flatMap((c) => c.days), [cycles]);
  const all = useMemo(() => buildInsights(allDays), [allDays]);

  const fyOptions = useMemo(() => [...new Set(all.months.map((m) => m.fyKey))].sort(), [all]);
  const cycleOptions = useMemo(
    () => all.months.filter((m) => fy === "all" || m.fyKey === fy),
    [all, fy],
  );

  const filteredDays = useMemo(() => {
    const keep = new Set(
      all.months
        .filter((m) => (fy === "all" || m.fyKey === fy)
          && (cycleKey === "all" || m.key === cycleKey)
          && (month === "all" || String(m.monthIndex) === month))
        .map((m) => m.key),
    );
    return all.months.filter((m) => keep.has(m.key)).flatMap((m) => m.days);
  }, [all, fy, cycleKey, month]);

  const data = useMemo(() => buildInsights(filteredDays), [filteredDays]);
  const obs = useMemo(() => buildObservations(data), [data]);
  const { months, totals } = data;

  const statusPie = [
    { name: "Full Day", value: totals.fullDays, color: GREEN },
    { name: "Half Day", value: totals.halfDays, color: ORANGE },
    { name: "Leave Deducted", value: totals.leaveDeducted, color: RED },
  ].filter((d) => d.value > 0);

  const chartData = months.map((m) => ({
    name: m.shortLabel,
    short: +(m.shortMins / 60).toFixed(2),
    extra: +(m.extraMins / 60).toFixed(2),
    net: +(m.netMins / 60).toFixed(2),
    violations: m.violations,
  }));

  const rows = () => {
    const out: string[][] = [];
    out.push(["Summary"]);
    out.push(["Total Working Hours", hm(totals.workedMins)]);
    out.push(["Total Required Hours", hm(totals.requiredMins)]);
    out.push(["Total Short Hours", hm(totals.shortMins)]);
    out.push(["Total Extra Hours", hm(totals.extraMins)]);
    out.push(["Net Hours", signedHM(totals.netMins)]);
    out.push(["Full Days", String(totals.fullDays)]);
    out.push(["Half Days", String(totals.halfDays)]);
    out.push(["Leave Deducted", String(totals.leaveDeducted)]);
    out.push(["Violations", String(totals.violations)]);
    out.push(["Working Days", String(totals.countedDays)]);
    out.push(["Non-working days worked", String(totals.restWorkedDays)]);
    out.push([]);
    out.push(["Violation Summary"]);
    out.push(["Month", "# of Violations", "Violation List", "Leave Deducted"]);
    for (const m of months) {
      out.push([m.label, String(m.violations), m.violationList.map((v) => `${fmtDate(v.date)} ${v.time}`).join(" | "), m.violationLeave ? `${m.violationLeave} Day` : "No"]);
    }
    out.push([]);
    out.push(["Month Wise Short / Extra Hours"]);
    out.push(["Month", "Short (days)", "Extra (days)", "Neutral (days)", "Net (days)"]);
    for (const m of months) {
      out.push([m.label, `- ${hm(m.shortMins)} (${m.shortDays})`, `+ ${hm(m.extraMins)} (${m.extraDays})`, `00:00 (${m.neutralDays})`, `${signedHM(m.netMins)} (${m.countedDays})`]);
    }
    out.push([]);
    out.push(["Attendance Status Summary"]);
    out.push(["Full Days", String(totals.fullDays)]);
    out.push(["Half Days", String(totals.halfDays)]);
    out.push(["Leave Deducted Days", String(totals.leaveDeducted)]);
    out.push(["Invalid Punch Days", String(totals.errorDays)]);
    out.push(["MO Days", String(totals.moDays)]);
    out.push(["Holiday / Sunday Worked Days", String(totals.restWorkedDays)]);
    out.push(["Full Day Leave Deducted", String(totals.fullDayLeaves)]);
    out.push(["Half Day Leave Deducted", String(totals.halfDayLeaves * 0.5)]);
    out.push(["Violation Based Leave", String(totals.violationLeave)]);
    out.push(["Core Hours Leave", "—"]);
    out.push(["MO Related Leave", "0"]);
    out.push([]);
    out.push(["Key Insights"]);
    for (const i of [...obs.insights, ...obs.alerts, ...obs.positives]) out.push([i.text]);
    return out;
  };

  const exportCsv = () => {
    const csv = rows().map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    download("attendance-insights.csv", csv, "text/csv;charset=utf-8");
  };

  const exportExcel = () => {
    const html = `<html><head><meta charset="utf-8"></head><body><table>${rows()
      .map((r) => `<tr>${(r.length ? r : [""]).map((c) => `<td>${String(c ?? "")}</td>`).join("")}</tr>`)
      .join("")}</table></body></html>`;
    download("attendance-insights.xls", html, "application/vnd.ms-excel");
  };

  if (!cycles.length) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        Paste punch data in the Data tab and press Calculate to see insights.
      </div>
    );
  }

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Select value={fy} onValueChange={(v) => { setFy(v); setCycleKey("all"); }}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Financial year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All financial years</SelectItem>
            {fyOptions.map((f) => <SelectItem key={f} value={f}>FY {f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cycleKey} onValueChange={setCycleKey}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Cycle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cycles (23rd → 22nd)</SelectItem>
            {cycleOptions.map((m) => <SelectItem key={m.key} value={m.key}>{m.cycleLabel}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {MONTH_NAMES.map((n, i) => <SelectItem key={n} value={String(i)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1.5 h-4 w-4" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportExcel}><SheetIcon className="mr-1.5 h-4 w-4" />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Print</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Tile label="Total Working Hours" value={hm(totals.workedMins)} />
        <Tile label="Total Required Hours" value={hm(totals.requiredMins)} />
        <Tile label="Total Short Hours" value={`- ${hm(totals.shortMins)}`} tone={totals.shortMins ? NEG : undefined} />
        <Tile label="Total Extra Hours" value={`+ ${hm(totals.extraMins)}`} tone={totals.extraMins ? POS : undefined} />
        <Tile label="Net Hours" value={signedHM(totals.netMins)} tone={totals.netMins >= 0 ? POS : NEG} />
        <Tile label="Total Full Days" value={String(totals.fullDays)} tone={POS} />
        <Tile label="Total Half Days" value={String(totals.halfDays)} tone={WARN} />
        <Tile label="Leave Deducted" value={`${totals.leaveDeducted}`} tone={totals.leaveDeducted ? NEG : undefined} />
        <Tile label="Total Violations" value={String(totals.violations)} tone={totals.violations ? NEG : undefined} />
        <Tile label="Total Working Days" value={String(totals.countedDays)} />
        <Tile label="Non-Working Days Worked" value={String(totals.restWorkedDays)} tone={BLUEISH} />
        <Tile label="Invalid Punch Days" value={String(totals.errorDays)} tone={totals.errorDays ? NEG : undefined} />
      </div>

      {/* Violation + Month-wise tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base">Violation List</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-center"># of Violation</TableHead>
                  <TableHead>Violation Date &amp; Time</TableHead>
                  <TableHead className="text-center">Leave Deducted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {months.map((m) => (
                  <TableRow key={m.key}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell className={`text-center ${m.violations > 3 ? NEG : ""}`}>{m.violations}</TableCell>
                    <TableCell className="text-xs">
                      {m.violationList.map((v) => (
                        <div key={v.date + v.time}>{fmtDate(v.date)} {v.time} <span className="text-muted-foreground">({v.reason})</span></div>
                      ))}
                    </TableCell>
                    <TableCell className={`text-center ${m.violationLeave ? NEG : ""}`}>
                      {m.violationLeave ? `${m.violationLeave} Day` : "No"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{totals.violations}</TableCell>
                  <TableCell />
                  <TableCell className="text-center">{totals.violationLeave ? `${totals.violationLeave} Day` : "No"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base">Month Wise Short Hours</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-center">Short (days)</TableHead>
                  <TableHead className="text-center">Extra (days)</TableHead>
                  <TableHead className="text-center">Neutral (days)</TableHead>
                  <TableHead className="text-center">Total (days)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {months.map((m) => (
                  <TableRow key={m.key}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell className={`text-center ${m.shortMins ? NEG : ""}`}>- {hm(m.shortMins)} ({m.shortDays})</TableCell>
                    <TableCell className={`text-center ${m.extraMins ? POS : ""}`}>+ {hm(m.extraMins)} ({m.extraDays})</TableCell>
                    <TableCell className="text-center">00:00 ({m.neutralDays})</TableCell>
                    <TableCell className={`text-center font-medium ${m.netMins >= 0 ? POS : NEG}`}>{signedHM(m.netMins)} ({m.countedDays})</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">- {hm(totals.shortMins)} ({totals.shortDays})</TableCell>
                  <TableCell className="text-center">+ {hm(totals.extraMins)} ({totals.extraDays})</TableCell>
                  <TableCell className="text-center">00:00 ({totals.neutralDays})</TableCell>
                  <TableCell className={`text-center ${totals.netMins >= 0 ? POS : NEG}`}>{signedHM(totals.netMins)} ({totals.countedDays})</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Attendance status summary */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Attendance Status Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Tile label="Full Days" value={String(totals.fullDays)} tone={POS} />
          <Tile label="Half Days" value={String(totals.halfDays)} tone={WARN} />
          <Tile label="Leave Deducted Days" value={String(totals.leaveDeducted)} tone={totals.leaveDeducted ? NEG : undefined} />
          <Tile label="Invalid Punch Days" value={String(totals.errorDays)} tone={totals.errorDays ? NEG : undefined} />
          <Tile label="MO Days" value={String(totals.moDays)} />
          <Tile label="Holiday / Sunday Worked" value={String(totals.restWorkedDays)} />
          <Tile label="Full Day Leave Deducted" value={String(totals.fullDayLeaves)} tone={totals.fullDayLeaves ? NEG : undefined} />
          <Tile label="Half Day Leave Deducted" value={String(totals.halfDayLeaves * 0.5)} tone={totals.halfDayLeaves ? NEG : undefined} />
          <Tile label="Violation Based Leave" value={String(totals.violationLeave)} tone={totals.violationLeave ? NEG : undefined} />
          <Tile label="Core Hours Leave" value="—" />
          <Tile label="MO Related Leave" value="0" />
          <Tile label="Absent Days" value={String(totals.absents)} tone={totals.absents ? NEG : undefined} />
        </CardContent>
      </Card>

      {/* Monthly performance */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Monthly Performance</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-center">Full</TableHead>
                <TableHead className="text-center">Half</TableHead>
                <TableHead className="text-center">Violations</TableHead>
                <TableHead className="text-center">Leave Deducted</TableHead>
                <TableHead className="text-center">Short</TableHead>
                <TableHead className="text-center">Extra</TableHead>
                <TableHead className="text-center">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((m) => (
                <TableRow key={m.key}>
                  <TableCell className="font-medium">{m.label}</TableCell>
                  <TableCell className="text-center">{m.fullDays}</TableCell>
                  <TableCell className="text-center">{m.halfDays}</TableCell>
                  <TableCell className={`text-center ${m.violations > 3 ? NEG : m.violations ? WARN : ""}`}>{m.violations}</TableCell>
                  <TableCell className={`text-center ${m.leaveDeducted ? NEG : ""}`}>{m.leaveDeducted.toFixed(1)}</TableCell>
                  <TableCell className={`text-center ${m.shortMins ? NEG : ""}`}>- {hm(m.shortMins)}</TableCell>
                  <TableCell className={`text-center ${m.extraMins ? POS : ""}`}>+ {hm(m.extraMins)}</TableCell>
                  <TableCell className={`text-center font-medium ${m.netMins >= 0 ? POS : NEG}`}>{signedHM(m.netMins)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base">Full vs Half vs Leave Deducted</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                  {statusPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base">Month-wise Short vs Extra (hrs)</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="short" name="Short" fill={RED} />
                <Bar dataKey="extra" name="Extra" fill={GREEN} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base">Monthly Violations</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="violations" name="Violations">
                  {chartData.map((d, i) => <Cell key={i} fill={d.violations > 3 ? RED : ORANGE} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base">Net Hours Trend (hrs)</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="net" name="Net hrs" stroke={BLUE} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights / alerts / positives */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base">Attendance Insights</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {obs.insights.map((i) => <div key={i.text}>• {i.text}</div>)}
            {!obs.insights.length && <div className="text-muted-foreground">No data.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Attention Required</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {obs.alerts.map((i) => <div key={i.text} className={WARN}>⚠ {i.text}</div>)}
            {!obs.alerts.length && <div className="text-muted-foreground">Nothing needs attention.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Positive Performance</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {obs.positives.map((i) => <div key={i.text} className={POS}>✓ {i.text}</div>)}
            {!obs.positives.length && <div className="text-muted-foreground">No highlights yet.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const BLUEISH = "text-blue-600 dark:text-blue-400";

export { isRestDay };
