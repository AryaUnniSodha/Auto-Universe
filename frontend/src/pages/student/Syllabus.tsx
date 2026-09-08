import { useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, RotateCcw } from "lucide-react";
import { api, EnrollmentSummary, SyllabusStatus } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { Loading, SectionHeader, EmptyState } from "@/components/ui";

const STATUS_STYLES: Record<string, { icon: any; cls: string }> = {
  completed: { icon: CheckCircle2, cls: "text-signal-teal" },
  in_progress: { icon: RotateCcw, cls: "text-signal-amber" },
  revision: { icon: RotateCcw, cls: "text-signal-violet" },
  pending: { icon: Circle, cls: "text-ink-faint" },
};

export default function Syllabus() {
  const enrollments = useFetch<EnrollmentSummary[]>(() => api.get("/student/enrollments").then((r) => r.data));
  const [courseId, setCourseId] = useState<number | null>(null);

  const active = courseId ?? enrollments.data?.[0]?.course_id ?? null;

  const syllabus = useFetch<SyllabusStatus>(
    () => api.get(`/student/syllabus/${active}`).then((r) => r.data),
    [active]
  );

  if (enrollments.loading) return <Loading label="Loading enrolled courses..." />;
  if (!enrollments.data || enrollments.data.length === 0) {
    return <EmptyState title="No enrollments yet" description="Once you're enrolled in courses, syllabus progress will appear here." />;
  }

  return (
    <div className="animate-fadeUp space-y-8">
      <div>
        <p className="stat-label mb-1 text-primary-500">Syllabus Intelligence</p>
        <h1 className="font-display text-3xl font-semibold text-ink">Coverage tracking</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {enrollments.data.map((c) => (
          <button
            key={c.course_id}
            onClick={() => setCourseId(c.course_id)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
              active === c.course_id
                ? "border-primary-600 bg-primary-700 text-white"
                : "border-line bg-surface text-ink-soft hover:border-primary-300"
            }`}
          >
            {c.code}
          </button>
        ))}
      </div>

      {syllabus.loading && <Loading />}
      {syllabus.data && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="card p-6 lg:col-span-1">
              <SectionHeader eyebrow={syllabus.data.course_name} title={`${syllabus.data.percent_complete}% complete`} />
              <div className="h-2.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-primary-600" style={{ width: `${syllabus.data.percent_complete}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="stat-label mb-1">Completed</p>
                  <p className="font-display text-xl font-semibold text-signal-teal">{syllabus.data.completed}</p>
                </div>
                <div>
                  <p className="stat-label mb-1">Pending</p>
                  <p className="font-display text-xl font-semibold text-ink">{syllabus.data.pending}</p>
                </div>
              </div>
              {syllabus.data.estimated_completion_date && (
                <p className="mt-4 text-xs text-ink-faint">
                  Estimated completion: <span className="font-mono text-ink">{syllabus.data.estimated_completion_date}</span>
                </p>
              )}
            </div>

            <div className="card p-6 lg:col-span-2">
              <SectionHeader eyebrow="AI Alerts" title="Completion risk" />
              {syllabus.data.alerts.length === 0 ? (
                <p className="text-sm text-ink-faint">No risks detected — syllabus pacing looks healthy.</p>
              ) : (
                <ul className="space-y-2.5">
                  {syllabus.data.alerts.map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 rounded-lg bg-signal-amberSoft px-3.5 py-2.5 text-sm text-signal-amber">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <SectionHeader eyebrow="Topic-level" title="Syllabus breakdown" />
            <div className="card divide-y divide-line">
              {syllabus.data.topics.map((t) => {
                const s = STATUS_STYLES[t.status] ?? STATUS_STYLES.pending;
                const Icon = s.icon;
                return (
                  <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={s.cls} />
                      <div>
                        <p className="text-sm font-medium text-ink">{t.topic}</p>
                        <p className="text-xs text-ink-faint">{t.unit}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium capitalize ${s.cls}`}>{t.status.replace("_", " ")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
