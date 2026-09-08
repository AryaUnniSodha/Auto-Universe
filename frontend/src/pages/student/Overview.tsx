import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { CalendarCheck, BrainCircuit, Target, ArrowRight, Sparkles } from "lucide-react";
import { api, type AttendanceAnalytics, type AcademicAnalytics, type DigitalTwin, type MentorPlan, type StudentProfile } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { ScoreRing, RingLegend } from "@/components/ScoreRing";
import { Loading, RiskBadge, SectionHeader, Priority } from "@/components/ui";

export default function StudentOverview() {
  const profile = useFetch<StudentProfile>(() => api.get("/student/profile").then((r) => r.data));
  const twin = useFetch<DigitalTwin>(() => api.get("/student/digital-twin").then((r) => r.data));
  const attendance = useFetch<AttendanceAnalytics>(() => api.get("/student/attendance").then((r) => r.data));
  const academic = useFetch<AcademicAnalytics>(() => api.get("/student/academic").then((r) => r.data));
  const mentor = useFetch<MentorPlan>(() => api.get("/student/mentor-plan").then((r) => r.data));

  if (twin.loading || attendance.loading || academic.loading) return <Loading />;
  if (!twin.data || !attendance.data || !academic.data) return null;

  const segments = [
    { label: "Academic", value: twin.data.academic_score, color: "#3B45A8" },
    { label: "Attendance", value: twin.data.attendance_score, color: "#0EA5A4" },
    { label: "Skill / Placement", value: twin.data.skill_score, color: "#F59E0B" },
    { label: "Extracurricular", value: twin.data.extracurricular_score, color: "#7C5CFC" },
  ];

  return (
    <div className="animate-fadeUp space-y-8">
      <div>
        <p className="stat-label mb-1 text-primary-500">
          {profile.data?.department} · Semester {profile.data?.semester} · {profile.data?.roll_number}
        </p>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Welcome back{profile.data ? `, ${profile.data.full_name.split(" ")[0]}` : ""}.
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Digital twin ring */}
        <div className="card flex flex-col items-center gap-6 p-6 lg:col-span-1">
          <p className="stat-label self-start">Digital Twin Composite</p>
          <ScoreRing segments={segments} overall={twin.data.overall_score} size={180} />
          <RingLegend segments={segments} />
          <Link
            to="/student/digital-twin"
            className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View full digital twin <ArrowRight size={14} />
          </Link>
        </div>

        {/* Quick stats + narrative */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="card p-6">
            <p className="stat-label mb-2 text-primary-500">AI-generated summary</p>
            <p className="text-[15px] leading-relaxed text-ink-soft">{twin.data.narrative}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={CalendarCheck}
              label="Attendance"
              value={`${attendance.data.overall_percentage}%`}
              footer={<RiskBadge level={attendance.data.risk_level} />}
              to="/student/attendance"
            />
            <StatCard
              icon={BrainCircuit}
              label="Predicted CGPA"
              value={academic.data.predicted_cgpa.toFixed(2)}
              footer={<span className="text-xs text-ink-faint">Confidence {Math.round(academic.data.confidence * 100)}%</span>}
              to="/student/academic"
            />
            <StatCard
              icon={Target}
              label="Placement Readiness"
              value={`${Math.round(twin.data.placement_readiness)}/100`}
              footer={<span className="text-xs text-ink-faint">See breakdown</span>}
              to="/student/placement"
            />
          </div>
        </div>
      </div>

      {/* Today's mentor plan */}
      <div>
        <SectionHeader
          eyebrow="AI Mentor"
          title="Today's plan"
          action={
            <Link to="/student/mentor" className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
              Full plan <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="card divide-y divide-line">
          {mentor.loading && <div className="p-6"><Loading label="Generating today's plan..." /></div>}
          {mentor.data?.tasks.map((t, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <Sparkles size={16} className="mt-0.5 shrink-0 text-signal-violet" />
                <div>
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  <p className="text-xs text-ink-faint">{t.why}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {t.minutes > 0 && <span className="font-mono text-xs text-ink-faint">{t.minutes} min</span>}
                <Priority level={t.priority} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, footer, to,
}: { icon: any; label: string; value: string; footer: ReactNode; to: string }) {
  return (
    <Link to={to} className="card flex flex-col gap-3 p-5 transition hover:shadow-pop">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <Icon size={16} className="text-primary-500" />
      </div>
      <span className="font-display text-2xl font-semibold text-ink">{value}</span>
      {footer}
    </Link>
  );
}
