import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, ComposedChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { CycleSummary } from "@/lib/punch-types";
import { requiredMinsForDate } from "@/lib/punch-types";

const STATUS_COLORS = { full: "#10b981", half: "#f59e0b", absent: "#ef4444" };

export function Charts({ cycle }: { cycle: CycleSummary }) {
  const daily = cycle.days.map((d) => ({
    date: d.date.slice(5),
    hours: +(d.workedMins / 60).toFixed(2),
    required: +(requiredMinsForDate(d.date) / 60).toFixed(2),
    late: d.late ? 1 : 0,
    early: d.earlyOut ? 1 : 0,
  }));

  let cum = 0;
  const cumulative = cycle.days.map((d) => {
    cum += d.workedMins / 60;
    return { date: d.date.slice(5), cumulative: +cum.toFixed(2) };
  });

  const statusData = [
    { name: "Full", value: cycle.fullDays, color: STATUS_COLORS.full },
    { name: "Half", value: cycle.halfDays, color: STATUS_COLORS.half },
    { name: "Absent", value: cycle.absents, color: STATUS_COLORS.absent },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Daily Hours vs Required</CardTitle></CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer>
            <ComposedChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="hours" name="Hours">
                {daily.map((d, i) => (
                  <Cell key={i} fill={d.hours >= d.required ? STATUS_COLORS.full : d.hours >= 2 ? STATUS_COLORS.half : STATUS_COLORS.absent} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="required" stroke="#1f2937" dot={false} name="Required" strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Day Status Distribution</CardTitle></CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Violations per Day</CardTitle></CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="late" stackId="v" fill="#ef4444" name="Late" />
              <Bar dataKey="early" stackId="v" fill="#f97316" name="Early Out" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cumulative Hours</CardTitle></CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer>
            <ComposedChart data={cumulative}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={2} name="Cumulative hrs" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
