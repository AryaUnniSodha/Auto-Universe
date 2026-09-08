import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { api, AttendanceAnalytics } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { Loading, RiskBadge, SectionHeader } from "@/components/ui";

export default function Attendance() {
  const { data, loading } = useFetch<AttendanceAnalytics>(() => api.get("/student/attendance").then((r) => r.data));
  if (loading) return <Loading label="Analyzing attendance patterns..." />;
  if (!data) return null;

  const chartData = [{ week: 0, projected_percentage: data.overall_percentage }, ...data.forecast];

  return (
    <div className="animate-fadeUp space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label mb-1 text-primary-500">Attendance Intelligence</p>
          <h1 className="font-display text-3xl font-semibold text-ink">
            {data.overall_percentage}% overall
          </h1>
          <p className="mt-1 text-sm text-ink-faint">Eligibility threshold: 75% minimum</p>
        </div>
        <RiskBadge level={data.risk_level} />
      </div>

      {/* Forecast chart */}
      <div className="card p-6">
        <SectionHeader eyebrow="Predictive Analytics" title="6-week attendance forecast" />
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
            <defs>
              <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0EA5A4" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0EA5A4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E6E8F2" vertical={false} />
            <XAxis dataKey="week" tickFormatter={(w) => (w === 0 ? "Now" : `Wk ${w}`)} tick={{ fontSize: 12, fill: "#8A8DAE" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#8A8DAE" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #E6E8F2", fontSize: 13 }}
              formatter={(v: number) => [`${v}%`, "Projected"]}
            />
            <ReferenceLine y={75} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: "75% threshold", position: "insideTopRight", fill: "#F59E0B", fontSize: 11 }} />
            <Area type="monotone" dataKey="projected_percentage" stroke="#0EA5A4" strokeWidth={2.5} fill="url(#attGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* What-if scenario */}
      <div className="card p-6">
        <SectionHeader eyebrow="Scenario Simulation" title={`If you miss the next ${data.what_if_miss_next_n.n} classes`} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.what_if_miss_next_n.projections.map((p) => (
            <div key={p.course_code} className={`rounded-lg border p-4 ${p.drops_below_threshold ? "border-signal-rose/30 bg-signal-roseSoft" : "border-line bg-canvas"}`}>
              <p className="font-mono text-xs text-ink-faint">{p.course_code}</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink">{p.new_percentage}%</p>
              {p.drops_below_threshold && (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-signal-rose">
                  <AlertTriangle size={12} /> Drops below eligibility
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Subject-wise breakdown */}
      <div>
        <SectionHeader eyebrow="Subject-wise" title="Attendance by course" />
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-left">
              <tr>
                {["Course", "Attended", "Percentage", "Status", "Classes to eligibility", "Risk"].map((h) => (
                  <th key={h} className="stat-label px-5 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.subjects.map((s) => (
                <tr key={s.course_id}>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink">{s.course_name}</p>
                    <p className="font-mono text-xs text-ink-faint">{s.course_code}</p>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-ink-soft">{s.attended}/{s.total}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line">
                        <div
                          className={`h-full rounded-full ${s.eligible ? "bg-signal-teal" : "bg-signal-rose"}`}
                          style={{ width: `${Math.min(100, s.percentage)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-ink">{s.percentage}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium ${s.eligible ? "text-signal-teal" : "text-signal-rose"}`}>
                      {s.eligible ? "Eligible" : "Not eligible"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-ink-soft">
                    {s.classes_to_eligibility > 0 ? s.classes_to_eligibility : "—"}
                  </td>
                  <td className="px-5 py-3.5"><RiskBadge level={s.risk_level} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card p-6">
        <SectionHeader eyebrow="AI Recommendations" title="What to do next" />
        <ul className="space-y-2.5">
          {data.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-ink-soft">
              <TrendingUp size={15} className="mt-0.5 shrink-0 text-signal-teal" />
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
