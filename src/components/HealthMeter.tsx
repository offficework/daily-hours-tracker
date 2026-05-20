import type { CycleSummary } from "@/lib/punch-types";

export function computeHealthScore(c: CycleSummary): number {
  let score = 100;
  score -= c.violations * 2;
  score -= c.halfDays * 5;
  score -= c.absents * 10;
  score -= c.fullDayLeaves * 10;
  const extraDays = c.days.filter((d) => !d.hasError && d.extraMins > 0).length;
  score += Math.min(10, extraDays);
  return Math.max(0, Math.min(100, score));
}

function band(score: number) {
  if (score >= 90) return { label: "Excellent", color: "#10b981", tag: "Aaj toh HR bhi khush hoga 😎" };
  if (score >= 70) return { label: "Good", color: "#3b82f6", tag: "Solid month, keep going 💪" };
  if (score >= 50) return { label: "Risk Zone", color: "#f59e0b", tag: "Thoda sambhalna padega ⚠️" };
  return { label: "HR Incoming ☎️", color: "#ef4444", tag: "Resume update kar lo bhai 😬" };
}

export function HealthMeter({ cycle }: { cycle: CycleSummary }) {
  const score = computeHealthScore(cycle);
  const b = band(score);
  // semicircle arc 0..180deg, score maps to angle
  const angle = (score / 100) * 180;
  const r = 80;
  const cx = 100;
  const cy = 100;
  const rad = (deg: number) => ((180 - deg) * Math.PI) / 180;
  const px = cx + r * Math.cos(rad(angle));
  const py = cy - r * Math.sin(rad(angle));
  const largeArc = angle > 180 ? 1 : 0;
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${px} ${py}`;
  const fullPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;

  return (
    <div className="rounded-lg border bg-card p-4 flex items-center gap-5">
      <svg viewBox="0 0 200 120" className="h-28 w-44 shrink-0">
        <path d={fullPath} fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round" />
        <path d={arcPath} fill="none" stroke={b.color} strokeWidth="14" strokeLinecap="round" />
        <text x="100" y="92" textAnchor="middle" fontSize="34" fontWeight="700" fill={b.color}>
          {score}
        </text>
        <text x="100" y="112" textAnchor="middle" fontSize="11" fill="#6b7280">/ 100</text>
      </svg>
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Attendance Health</div>
        <div className="text-2xl font-semibold" style={{ color: b.color }}>{b.label}</div>
        <div className="text-sm text-muted-foreground italic mt-1">{b.tag}</div>
      </div>
    </div>
  );
}
