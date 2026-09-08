import { useState } from "react";
import { ClipboardCheck, Clock, CheckCircle2, CalendarDays, Building2 } from "lucide-react";
import { api, type TestForStudent, type TestDetail, type JobEventItem } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { Loading, SectionHeader } from "@/components/ui";

export default function AssignedTests() {
  const tests = useFetch<TestForStudent[]>(() => api.get("/placement/tests/mine").then((r) => r.data));
  const events = useFetch<JobEventItem[]>(() => api.get("/placement/events").then((r) => r.data));
  const [activeTestId, setActiveTestId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <SectionHeader eyebrow="Placement Cell" title="Assigned tests" />
        {tests.loading ? (
          <Loading label="Loading assigned tests..." />
        ) : !tests.data || tests.data.length === 0 ? (
          <p className="text-sm text-ink-faint">No tests assigned yet — check back once the placement cell publishes one.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {tests.data.map((t) => (
              <div key={t.id} className="rounded-lg border border-line p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">{t.title}</p>
                    <p className="text-xs capitalize text-ink-faint">{t.type} · {t.question_count} questions</p>
                  </div>
                  <span className="flex items-center gap-1 font-mono text-xs text-ink-faint"><Clock size={12} /> {t.duration_minutes} min</span>
                </div>
                {t.description && <p className="mb-3 text-xs text-ink-faint">{t.description}</p>}
                {t.status === "completed" ? (
                  <div className="flex items-center gap-2 rounded-lg bg-signal-tealSoft px-3 py-2 text-sm text-signal-teal">
                    <CheckCircle2 size={15} /> Completed · {t.score}/{t.max_score}
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveTestId(t.id)}
                    className="w-full rounded-lg bg-primary-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
                  >
                    Start test
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <SectionHeader eyebrow="Placement Cell" title="Upcoming drives & events" />
        {events.loading ? (
          <Loading label="Loading events..." />
        ) : !events.data || events.data.length === 0 ? (
          <p className="text-sm text-ink-faint">No upcoming events match your eligibility right now.</p>
        ) : (
          <div className="space-y-2.5">
            {events.data.map((e) => (
              <div key={e.id} className="flex items-start gap-3 rounded-lg border border-line px-4 py-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  {e.event_type === "deadline" ? <Clock size={15} /> : <Building2 size={15} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{e.title} {e.company_name && <span className="text-ink-faint">· {e.company_name}</span>}</p>
                  {e.description && <p className="text-xs text-ink-faint">{e.description}</p>}
                  <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-ink-faint">
                    <CalendarDays size={11} /> {new Date(e.event_date).toLocaleString()} · <span className="capitalize">{e.event_type}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeTestId && (
        <TestTaker
          testId={activeTestId}
          onClose={() => setActiveTestId(null)}
          onSubmitted={() => {
            setActiveTestId(null);
            tests.reload();
          }}
        />
      )}
    </div>
  );
}

function TestTaker({ testId, onClose, onSubmitted }: { testId: number; onClose: () => void; onSubmitted: () => void }) {
  const { data, loading } = useFetch<TestDetail>(() => api.get(`/placement/tests/${testId}`).then((r) => r.data), [testId]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ score: number; max_score: number; percentage: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!data) return;
    setSubmitting(true);
    try {
      const ordered = data.questions.map((_, i) => answers[i] ?? -1);
      const res = await api.post(`/placement/tests/${testId}/submit`, { answers: ordered });
      setResult(res.data);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl2 bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        {loading || !data ? (
          <Loading label="Loading test..." />
        ) : result ? (
          <div className="py-8 text-center">
            <ClipboardCheck size={36} className="mx-auto mb-3 text-signal-teal" />
            <p className="font-display text-2xl font-semibold text-ink">{result.score}/{result.max_score}</p>
            <p className="mt-1 text-sm text-ink-faint">{result.percentage}% — your placement readiness will update shortly.</p>
            <button onClick={onSubmitted} className="mt-5 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600">Done</button>
          </div>
        ) : (
          <>
            <SectionHeader eyebrow={data.type} title={data.title} />
            <div className="space-y-5">
              {data.questions.map((q, qi) => (
                <div key={qi}>
                  <p className="mb-2 text-sm font-medium text-ink">{qi + 1}. {q.question}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <label key={oi} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:bg-canvas">
                        <input
                          type="radio" name={`q-${qi}`} checked={answers[qi] === oi}
                          onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                          className="accent-primary-600"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-canvas">Cancel</button>
              <button
                onClick={submit} disabled={submitting}
                className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit test"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
