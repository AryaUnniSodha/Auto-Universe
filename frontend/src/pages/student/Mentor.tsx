import { Sparkles, Clock, MessageSquareText, Search } from "lucide-react";
import { useState } from "react";
import { api, MentorPlan } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { Loading, SectionHeader, Priority } from "@/components/ui";

export default function Mentor() {
  const { data, loading } = useFetch<MentorPlan>(() => api.get("/student/mentor-plan").then((r) => r.data));
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; sources: any[] } | null>(null);
  const [asking, setAsking] = useState(false);

  async function ask() {
    if (!question.trim()) return;
    setAsking(true);
    try {
      const res = await api.get("/rag/ask", { params: { question } });
      setAnswer(res.data);
    } finally {
      setAsking(false);
    }
  }

  if (loading) return <Loading label="Your AI mentor is preparing today's plan..." />;
  if (!data) return null;

  return (
    <div className="animate-fadeUp space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal-violet/10 text-signal-violet">
          <Sparkles size={20} />
        </div>
        <div>
          <p className="stat-label mb-0.5 text-primary-500">AI Mentor</p>
          <h1 className="font-display text-3xl font-semibold text-ink capitalize">{data.plan_type} plan</h1>
        </div>
      </div>

      <div className="card p-6">
        <p className="text-sm leading-relaxed text-ink-soft">{data.rationale}</p>
      </div>

      <div>
        <SectionHeader eyebrow="Adaptive Plan" title="Today's tasks" />
        <div className="card divide-y divide-line">
          {data.tasks.map((t, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 font-mono text-xs text-primary-700">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  <p className="text-xs text-ink-faint">{t.why}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {t.minutes > 0 && (
                  <span className="flex items-center gap-1 font-mono text-xs text-ink-faint">
                    <Clock size={12} /> {t.minutes} min
                  </span>
                )}
                <Priority level={t.priority} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <SectionHeader eyebrow="RAG Assistant" title="Ask about your course material" />
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="e.g. What topics are covered in Database Management Systems?"
            className="flex-1 rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary-500"
          />
          <button
            onClick={ask}
            disabled={asking}
            className="flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
          >
            <Search size={15} /> {asking ? "Searching..." : "Ask"}
          </button>
        </div>

        {answer && (
          <div className="mt-4 rounded-lg border border-line bg-canvas p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary-600">
              <MessageSquareText size={14} /> Grounded answer
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">{answer.answer}</p>
            {answer.sources.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {answer.sources.map((s: any, i: number) => (
                  <span key={i} className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                    {s.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="mt-3 text-xs text-ink-faint">
          Answers are retrieved from faculty-uploaded notes and syllabus material indexed locally — nothing is sent to the internet.
        </p>
      </div>
    </div>
  );
}
