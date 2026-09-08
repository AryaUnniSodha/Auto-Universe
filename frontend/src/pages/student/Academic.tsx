import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Lightbulb, Clock } from "lucide-react";
import { api, AcademicAnalytics } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { Loading, SectionHeader, TrendBadge, Priority } from "@/components/ui";

export default function Academic() {
  const { data, loading } = useFetch<AcademicAnalytics>(() => api.get("/student/academic").then((r) => r.data));
  if (loading) return <Loading label="Modeling academic trajectory..." />;
  if (!data) return null;

  const radarData = Object.entries(data.radar).map(([k, v]) => ({ metric: k, value: v }));

  return (
    <div className="animate-fadeUp space-y-8">
      <div>
        <p className="stat-label mb-1 text-primary-500">Academic Intelligence</p>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Predicted CGPA: {data.predicted_cgpa.toFixed(2)}
        </h1>
        <p className="mt-1 text-sm text-ink-faint">
          Current: {data.current_cgpa.toFixed(2)} · Model confidence {Math.round(data.confidence * 100)}%
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Radar */}
        <div className="card p-6">
          <SectionHeader eyebrow="Concept Mastery" title="Performance radar" />
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E6E8F2" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "#4A4E6E" }} />
              <Radar dataKey="value" stroke="#3B45A8" fill="#3B45A8" fillOpacity={0.28} strokeWidth={2} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E8F2", fontSize: 13 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Semester trend */}
        <div className="card p-6">
          <SectionHeader eyebrow="Trajectory" title="Semester-wise CGPA trend" />
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.semester_trend} margin={{ left: -20, right: 10 }}>
              <CartesianGrid stroke="#E6E8F2" vertical={false} />
              <XAxis dataKey="semester" tickFormatter={(s) => `Sem ${s}`} tick={{ fontSize: 12, fill: "#8A8DAE" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: "#8A8DAE" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E8F2", fontSize: 13 }} />
              <Line type="monotone" dataKey="cgpa" stroke="#7C5CFC" strokeWidth={2.5} dot={{ r: 4, fill: "#7C5CFC" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Explanations */}
      <div className="card p-6">
        <SectionHeader eyebrow="Explainable AI" title="Why this prediction?" />
        <ul className="space-y-2.5">
          {data.explanations.map((e, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-ink-soft">
              <Lightbulb size={15} className="mt-0.5 shrink-0 text-signal-amber" />
              {e}
            </li>
          ))}
        </ul>
      </div>

      {/* Weak / strong subjects */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SubjectList title="Needs focus" subjects={data.weak_subjects} tone="rose" />
        <SubjectList title="Strong subjects" subjects={data.strong_subjects} tone="teal" />
      </div>

      {/* Study plan */}
      <div>
        <SectionHeader eyebrow="Individualized" title="Recommended study plan" />
        <div className="card divide-y divide-line">
          {data.study_plan.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-ink">{s.subject}</p>
                <p className="text-xs text-ink-faint">{s.focus}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="flex items-center gap-1 font-mono text-xs text-ink-faint">
                  <Clock size={12} /> {s.estimated_minutes} min
                </span>
                <Priority level={s.priority} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubjectList({ title, subjects, tone }: { title: string; subjects: AcademicAnalytics["weak_subjects"]; tone: "rose" | "teal" }) {
  return (
    <div className="card p-6">
      <SectionHeader eyebrow={tone === "rose" ? "Attention needed" : "Keep it up"} title={title} />
      {subjects.length === 0 ? (
        <p className="text-sm text-ink-faint">Nothing here yet.</p>
      ) : (
        <div className="space-y-3">
          {subjects.map((s) => (
            <div key={s.course_id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{s.course_name}</p>
                <p className="text-xs text-ink-faint">{s.mastery_level}</p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-sm font-semibold ${tone === "rose" ? "text-signal-rose" : "text-signal-teal"}`}>
                  {s.average_percentage}%
                </p>
                <TrendBadge trend={s.trend} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
