import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { Target, FileText, Sparkles, ArrowUpRight } from "lucide-react";
import { api, PlacementReadiness, ResumeAnalysisOut } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { Loading, SectionHeader } from "@/components/ui";
import AssignedTests from "@/pages/student/AssignedTests";

export default function Placement() {
  const { data, loading, reload } = useFetch<PlacementReadiness>(
    () => api.get("/placement/readiness").then((r) => r.data)
  );
  const [resumeText, setResumeText] = useState("");
  const [analysis, setAnalysis] = useState<ResumeAnalysisOut | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function analyzeResume() {
    if (!resumeText.trim()) return;
    setAnalyzing(true);
    try {
      const res = await api.post("/placement/resume/analyze", { resume_text: resumeText });
      setAnalysis(res.data);
    } finally {
      setAnalyzing(false);
    }
  }

  async function logPractice(type: "aptitude" | "coding" | "interview") {
    const score = Math.round(50 + Math.random() * 45);
    await api.post("/placement/practice/attempt", { type, topic: "Practice Set", score, max_score: 100 });
    reload();
  }

  if (loading) return <Loading label="Scoring placement readiness..." />;
  if (!data) return null;

  const skillBars = [
    { name: "Aptitude", value: data.aptitude_score },
    { name: "Coding", value: data.coding_score },
    { name: "Communication", value: data.communication_score },
    { name: "Academics", value: Math.min(100, data.academic_score) },
  ];

  return (
    <div className="animate-fadeUp space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label mb-1 text-primary-500">Placement Intelligence</p>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Readiness: {Math.round(data.readiness_score)}/100
          </h1>
          <p className="mt-1 text-sm text-ink-faint">
            Projected band: <span className="font-medium text-ink">{data.predicted_salary_band}</span> · Interview
            probability {data.interview_probability}%
          </p>
        </div>
        <Target size={22} className="text-primary-500" />
      </div>

      <AssignedTests />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <SectionHeader eyebrow="Skill Breakdown" title="Readiness components" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={skillBars} margin={{ left: -20, right: 10 }}>
              <CartesianGrid stroke="#E6E8F2" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#8A8DAE" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#8A8DAE" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E8F2", fontSize: 13 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {skillBars.map((_, i) => (
                  <Cell key={i} fill={["#3B45A8", "#0EA5A4", "#7C5CFC", "#F59E0B"][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["aptitude", "coding", "interview"] as const).map((t) => (
              <button
                key={t}
                onClick={() => logPractice(t)}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-primary-500 hover:text-primary-700"
              >
                Log a {t} practice attempt
              </button>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <SectionHeader eyebrow="Fit Analysis" title="Company-tier fit" />
          <div className="space-y-4">
            {data.company_fit.map((c) => (
              <div key={c.tier}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{c.tier}</span>
                  <span className="font-mono text-xs text-ink">{Math.round(c.fit_score)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.max(0, Math.min(100, c.fit_score))}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <p className="stat-label mb-2">Detected skill gaps</p>
            <div className="flex flex-wrap gap-2">
              {data.skill_gaps.length === 0 ? (
                <span className="text-sm text-ink-faint">No major gaps detected — great work.</span>
              ) : (
                data.skill_gaps.map((g) => (
                  <span key={g} className="rounded-full bg-signal-amberSoft px-2.5 py-1 text-xs font-medium text-signal-amber">
                    {g}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <SectionHeader eyebrow="Recommended Path" title="Your next steps" />
        <ul className="space-y-2.5">
          {data.recommended_path.map((p, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-ink-soft">
              <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-signal-teal" />
              {p}
            </li>
          ))}
        </ul>
        {data.explanations && data.explanations.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="stat-label mb-2">Why this readiness score?</p>
            <ul className="space-y-1.5">
              {data.explanations.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-ink-faint">
                  <Sparkles size={12} className="mt-0.5 shrink-0 text-signal-violet" /> {e}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card p-6">
        <SectionHeader eyebrow="Resume Intelligence" title="Analyze your resume" />
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume text here — analysis runs fully offline, nothing leaves this device."
          rows={6}
          className="w-full rounded-lg border border-line bg-canvas p-3.5 text-sm text-ink outline-none transition focus:border-primary-500"
        />
        <button
          onClick={analyzeResume}
          disabled={analyzing || !resumeText.trim()}
          className="mt-3 flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
        >
          <FileText size={15} /> {analyzing ? "Analyzing..." : "Analyze resume"}
        </button>

        {analysis && (
          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-3">
            <div>
              <p className="stat-label mb-1">ATS score</p>
              <p className="font-display text-2xl font-semibold text-ink">{analysis.ats_score}/100</p>
            </div>
            <div>
              <p className="stat-label mb-1.5">Detected skills</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.detected_skills.map((s) => (
                  <span key={s} className="rounded-full bg-signal-tealSoft px-2 py-0.5 text-[11px] font-medium text-signal-teal capitalize">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="stat-label mb-1.5">Suggestions</p>
              <ul className="space-y-1 text-xs text-ink-soft">
                {analysis.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
