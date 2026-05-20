import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CycleSummary } from "@/lib/punch-types";
import { fmtHM } from "@/lib/hours-calc";
import { HealthMeter } from "@/components/HealthMeter";
import { AlertTriangle, CheckCircle2, Clock, MinusCircle } from "lucide-react";

function Stat({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-lg border p-4 flex items-center gap-3">
      <div className={`rounded-md p-2 ${tone ?? "bg-muted text-foreground"}`}>{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

export function MonthlySummary({ cycle }: { cycle: CycleSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Summary — {cycle.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <HealthMeter cycle={cycle} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Full Days" value={String(cycle.fullDays)} icon={<CheckCircle2 className="h-5 w-5" />} tone="bg-emerald-100 text-emerald-700" />
        <Stat label="Half Days" value={String(cycle.halfDays)} icon={<MinusCircle className="h-5 w-5" />} tone="bg-amber-100 text-amber-700" />
        <Stat label="Absents" value={String(cycle.absents)} icon={<AlertTriangle className="h-5 w-5" />} tone="bg-red-100 text-red-700" />
        <Stat label="Total Hours" value={fmtHM(cycle.totalMins)} icon={<Clock className="h-5 w-5" />} tone="bg-blue-100 text-blue-700" />
        <Stat label="Short Hours" value={fmtHM(cycle.totalShortMins)} icon={<MinusCircle className="h-5 w-5" />} tone={cycle.totalShortMins > 0 ? "bg-red-100 text-red-700" : "bg-muted"} />
        <Stat label="Extra Hours" value={fmtHM(cycle.totalExtraMins)} icon={<Clock className="h-5 w-5" />} tone={cycle.totalExtraMins > 0 ? "bg-blue-100 text-blue-700" : "bg-muted"} />
        {(() => {
          const net = cycle.totalExtraMins - cycle.totalShortMins;
          const sign = net < 0 ? "-" : "+";
          return (
            <Stat
              label="Net Hours"
              value={`${sign}${fmtHM(Math.abs(net))}`}
              icon={<Clock className="h-5 w-5" />}
              tone={net >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}
            />
          );
        })()}
        <Stat label="Violations" value={String(cycle.violations)} icon={<AlertTriangle className="h-5 w-5" />} tone={cycle.violations > 3 ? "bg-red-100 text-red-700" : "bg-muted"} />
        <Stat
          label="Leave Deducted"
          value={cycle.leaveDeducted ? `${cycle.leaveDeducted} day${cycle.leaveDeducted === 1 ? "" : "s"}` : "—"}
          icon={<MinusCircle className="h-5 w-5" />}
          tone={cycle.leaveDeducted ? "bg-red-100 text-red-700" : "bg-muted"}
        />
        </div>
      </CardContent>
    </Card>
  );
}
