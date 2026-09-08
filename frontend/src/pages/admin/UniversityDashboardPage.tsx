import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { Building2, Users, GraduationCap, AlertTriangle, Target, RefreshCw } from "lucide-react";
import { useState } from "react";
import { api, type UniversityDashboard } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { useAuth } from "@/context/AuthContext";
import { Loading, SectionHeader } from "@/components/ui";

export default function UniversityDashboardPage() {
  const { data, loading } = useFetch<UniversityDashboard>(() => api.get("/admin/dashboard").then((r) => r.data));
  const { user } = useAuth();
  const [retraining, setRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState<string | null>(null);

  async function retrain() {
    setRetraining(true);
    setRetrainMsg(null);
    try {
      const res = await api.post("/admin/retrain-models");
      setRetrainMsg(`Models retrained on ${res.data.cohort_size} samples (CGPA MAE ${res.data.cgpa_mae}).`);
    } finally {
      setRetraining(false);
    }
  }

  if (loading) return <Loading label="Synthesizing university-wide intelligence..." />;
  if (!data) return null;

  const deptChart = data.department_health.map((d) => ({ name: d.department, value: d.avg_health_score }));

  return (
    <div className="animate-fadeUp space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label mb-1 text-primary-500">{data.scope} Digital Twin</p>
          <h1 className="font-display text-3xl font-semibold text-ink">
            {data.scope === "University" ? "Institutional intelligence" : `${data.scope} intelligence`}
          </h1>
          <p className="mt-1 text-sm text-ink-faint">
            {data.scope === "University"
              ? "Live, aggregated across every student's individual digital twin."
              : "Live, aggregated across every student's individual digital twin in this department."}
          </p>
        </div>
        {user?.role === "admin" && (
          <button
            onClick={retrain}
            disabled={retraining}
            className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:border-primary-500 hover:text-primary-700 disabled:opacity-60"
          >
            <RefreshCw size={15} className={retraining ? "animate-spin" : ""} /> {retraining ? "Retraining..." : "Retrain ML models"}
          </button>
        )}
      </div>
      {retrainMsg && <p className="text-sm text-signal-teal">{retrainMsg}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Metric icon={Users} label="Students" value={data.total_students} />
        <Metric icon={GraduationCap} label="Faculty" value={data.total_faculty} />
        <Metric icon={Building2} label="Avg attendance" value={`${data.avg_attendance}%`} />
        <Metric icon={Target} label="Avg CGPA" value={data.avg_cgpa.toFixed(2)} />
        <Metric icon={Target} label="Placement readiness" value={`${data.placement_readiness_avg}/100`} />
        <Metric icon={AlertTriangle} label="At-risk students" value={data.at_risk_students} tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <SectionHeader eyebrow="Academic Health" title="Department-wise health score" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptChart} margin={{ left: -20, right: 10 }}>
              <CartesianGrid stroke="#E6E8F2" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8A8DAE" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#8A8DAE" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E8F2", fontSize: 13 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {deptChart.map((_, i) => (
                  <Cell key={i} fill={["#3B45A8", "#0EA5A4", "#7C5CFC", "#F59E0B"][i % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <SectionHeader eyebrow="Early Warning System" title="Students needing intervention" />
          <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {data.early_warnings.length === 0 ? (
              <p className="text-sm text-ink-faint">No active risk flags — institution-wide indicators are healthy.</p>
            ) : (
              data.early_warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-signal-rose/20 bg-signal-roseSoft px-3.5 py-2.5">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-signal-rose" />
                  <div>
                    <p className="text-sm font-medium text-ink">{w.student} <span className="font-mono text-xs text-ink-faint">({w.roll_number})</span></p>
                    <p className="text-xs text-signal-rose">{w.issue}</p>
                    {w.department && <p className="text-xs text-ink-faint">{w.department}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone?: "rose" }) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <Icon size={14} className={tone === "rose" ? "text-signal-rose" : "text-primary-500"} />
      </div>
      <p className={`font-display text-xl font-semibold ${tone === "rose" ? "text-signal-rose" : "text-ink"}`}>{value}</p>
    </div>
  );
}
