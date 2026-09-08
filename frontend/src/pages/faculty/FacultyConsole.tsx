import { useState } from "react";
import {
  Users, CalendarPlus, ClipboardList, Target, BookOpen, FileSpreadsheet, Upload, CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { Loading, SectionHeader, EmptyState } from "@/components/ui";

interface CourseSummary { id: number; code: string; name: string; semester: number }
interface RosterEntry { student_id: number; roll_number: string; full_name: string }
interface COAttainment { co_code: string; description: string; target_attainment: number; actual_attainment: number; attained: boolean }

const TABS = [
  { id: "attendance", label: "Mark Attendance", icon: CalendarPlus },
  { id: "marks", label: "Enter Marks", icon: ClipboardList },
  { id: "co", label: "CO/PO Attainment", icon: Target },
  { id: "syllabus", label: "Syllabus & Blueprint", icon: BookOpen },
  { id: "notes", label: "Upload Notes (RAG)", icon: Upload },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function FacultyConsole() {
  const courses = useFetch<CourseSummary[]>(() => api.get("/faculty/courses").then((r) => r.data));
  const [courseId, setCourseId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabId>("attendance");
  const active = courseId ?? courses.data?.[0]?.id ?? null;

  if (courses.loading) return <Loading label="Loading your courses..." />;
  if (!courses.data || courses.data.length === 0) {
    return <EmptyState title="No courses assigned" description="Once courses are assigned to you, faculty automation tools will appear here." />;
  }

  return (
    <div className="animate-fadeUp space-y-8">
      <div>
        <p className="stat-label mb-1 text-primary-500">Faculty Automation</p>
        <h1 className="font-display text-3xl font-semibold text-ink">Faculty console</h1>
        <p className="mt-1 text-sm text-ink-faint">
          Upload once — attendance, marks and syllabus updates automatically flow into every student's AI insights.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {courses.data.map((c) => (
          <button
            key={c.id}
            onClick={() => setCourseId(c.id)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
              active === c.id ? "border-primary-600 bg-primary-700 text-white" : "border-line bg-surface text-ink-soft hover:border-primary-300"
            }`}
          >
            {c.code} · {c.name}
          </button>
        ))}
      </div>

      <div className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
              tab === t.id ? "border-primary-600 text-primary-700" : "border-transparent text-ink-faint hover:text-ink-soft"
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {active && tab === "attendance" && <MarkAttendance courseId={active} />}
      {active && tab === "marks" && <EnterMarks courseId={active} />}
      {active && tab === "co" && <COAttainmentPanel courseId={active} />}
      {active && tab === "syllabus" && <SyllabusBlueprint courseId={active} />}
      {active && tab === "notes" && <UploadNotes courseId={active} />}
    </div>
  );
}

function MarkAttendance({ courseId }: { courseId: number }) {
  const roster = useFetch<RosterEntry[]>(() => api.get(`/faculty/course/${courseId}/students`).then((r) => r.data), [courseId]);
  const [present, setPresent] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState(false);

  if (roster.loading) return <Loading label="Loading roster..." />;
  if (!roster.data) return null;

  function toggle(id: number) {
    setPresent((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function submit() {
    const allIds = roster.data!.map((r) => r.student_id);
    const absentIds = allIds.filter((id) => !present.has(id));
    await api.post("/faculty/attendance/mark", {
      course_id: courseId,
      date: new Date().toISOString().slice(0, 10),
      present_student_ids: Array.from(present),
      absent_student_ids: absentIds,
    });
    setSaved(true);
  }

  return (
    <div className="card p-6">
      <SectionHeader
        eyebrow="Today's session"
        title={`Roster · ${roster.data.length} students`}
        action={
          <button onClick={submit} className="flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600">
            <CalendarPlus size={15} /> Save attendance
          </button>
        }
      />
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-signal-tealSoft px-3.5 py-2.5 text-sm text-signal-teal">
          <CheckCircle2 size={15} /> Attendance recorded — student insights will update automatically.
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {roster.data.map((s) => (
          <button
            key={s.student_id}
            onClick={() => toggle(s.student_id)}
            className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm transition ${
              present.has(s.student_id) ? "border-signal-teal bg-signal-tealSoft text-signal-teal" : "border-line bg-canvas text-ink-soft"
            }`}
          >
            <span>
              <span className="block font-medium">{s.full_name}</span>
              <span className="font-mono text-xs opacity-70">{s.roll_number}</span>
            </span>
            <Users size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}

function EnterMarks({ courseId }: { courseId: number }) {
  const roster = useFetch<RosterEntry[]>(() => api.get(`/faculty/course/${courseId}/students`).then((r) => r.data), [courseId]);
  const [markType, setMarkType] = useState("internal1");
  const [maxMarks, setMaxMarks] = useState(25);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [saved, setSaved] = useState(false);

  if (roster.loading) return <Loading label="Loading roster..." />;
  if (!roster.data) return null;

  async function submit() {
    const entries = Object.entries(scores).map(([sid, marks_obtained]) => ({ student_id: Number(sid), marks_obtained }));
    if (entries.length === 0) return;
    await api.post("/faculty/marks/bulk", { course_id: courseId, mark_type: markType, max_marks: maxMarks, entries });
    setSaved(true);
  }

  return (
    <div className="card p-6">
      <SectionHeader
        eyebrow="Bulk entry"
        title="Enter marks"
        action={
          <button onClick={submit} className="flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600">
            <FileSpreadsheet size={15} /> Save marks
          </button>
        }
      />
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-signal-tealSoft px-3.5 py-2.5 text-sm text-signal-teal">
          <CheckCircle2 size={15} /> Marks recorded — CGPA predictions will refresh automatically.
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-3">
        <select value={markType} onChange={(e) => setMarkType(e.target.value)} className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink">
          {["internal1", "internal2", "assignment", "quiz", "endsem", "lab"].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          type="number" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))}
          className="w-28 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink" placeholder="Max marks"
        />
      </div>
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left"><tr>
            <th className="stat-label px-4 py-2.5 font-medium">Student</th>
            <th className="stat-label px-4 py-2.5 font-medium">Marks obtained</th>
          </tr></thead>
          <tbody className="divide-y divide-line">
            {roster.data.map((s) => (
              <tr key={s.student_id}>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-ink">{s.full_name}</p>
                  <p className="font-mono text-xs text-ink-faint">{s.roll_number}</p>
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="number" min={0} max={maxMarks}
                    value={scores[s.student_id] ?? ""}
                    onChange={(e) => setScores((prev) => ({ ...prev, [s.student_id]: Number(e.target.value) }))}
                    className="w-24 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function COAttainmentPanel({ courseId }: { courseId: number }) {
  const { data, loading } = useFetch<COAttainment[]>(() => api.get(`/faculty/co-attainment/${courseId}`).then((r) => r.data), [courseId]);
  if (loading) return <Loading label="Computing CO/PO attainment..." />;
  if (!data) return null;

  return (
    <div className="card p-6">
      <SectionHeader eyebrow="Outcome-based education" title="Course Outcome attainment" />
      {data.length === 0 ? (
        <p className="text-sm text-ink-faint">No Course Outcomes defined for this course yet.</p>
      ) : (
        <div className="space-y-4">
          {data.map((co) => (
            <div key={co.co_code} className="rounded-lg border border-line p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">{co.co_code}</p>
                  <p className="text-xs text-ink-faint">{co.description}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${co.attained ? "bg-signal-tealSoft text-signal-teal" : "bg-signal-roseSoft text-signal-rose"}`}>
                  {co.attained ? "Attained" : "Below target"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${co.attained ? "bg-signal-teal" : "bg-signal-rose"}`}
                  style={{ width: `${Math.min(100, co.actual_attainment)}%` }}
                />
              </div>
              <p className="mt-1.5 font-mono text-xs text-ink-faint">
                {co.actual_attainment}% actual · {co.target_attainment}% target
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SyllabusBlueprint({ courseId }: { courseId: number }) {
  const syllabus = useFetch<any>(() => api.get(`/student/syllabus/${courseId}`).then((r) => r.data), [courseId]);
  const [blueprint, setBlueprint] = useState<any>(null);
  const [loadingBp, setLoadingBp] = useState(false);

  async function generateBlueprint() {
    setLoadingBp(true);
    try {
      const res = await api.get(`/faculty/question-paper/blueprint/${courseId}`);
      setBlueprint(res.data);
    } catch {
      setBlueprint({ error: "Define Course Outcomes for this course before generating a blueprint." });
    } finally {
      setLoadingBp(false);
    }
  }

  async function markTopic(topicId: number, status: string) {
    await api.put(`/faculty/syllabus/topic/${topicId}/status`, null, { params: { status } });
    syllabus.reload();
  }

  if (syllabus.loading) return <Loading />;
  if (!syllabus.data) return null;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <SectionHeader eyebrow="Coverage" title={`${syllabus.data.percent_complete}% syllabus complete`} />
        <div className="space-y-2">
          {syllabus.data.topics.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-ink">{t.topic}</p>
                <p className="text-xs text-ink-faint">{t.unit}</p>
              </div>
              <select
                value={t.status}
                onChange={(e) => markTopic(t.id, e.target.value)}
                className="rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs"
              >
                {["pending", "in_progress", "completed", "revision"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <SectionHeader
          eyebrow="AI-assisted"
          title="Question paper blueprint"
          action={
            <button onClick={generateBlueprint} disabled={loadingBp} className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600">
              {loadingBp ? "Generating..." : "Generate blueprint"}
            </button>
          }
        />
        {blueprint?.error && <p className="text-sm text-signal-rose">{blueprint.error}</p>}
        {blueprint?.blueprint && (
          <div className="space-y-4">
            {blueprint.blueprint.map((b: any) => (
              <div key={b.co_code} className="rounded-lg border border-line p-4">
                <p className="mb-2 text-sm font-semibold text-ink">{b.co_code} — {b.total_marks} marks</p>
                <div className="flex flex-wrap gap-2">
                  {b.distribution.map((d: any) => (
                    <span key={d.bloom_level} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                      {d.bloom_level}: {d.marks}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadNotes({ courseId }: { courseId: number }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !text.trim()) return;
    const res = await api.post("/faculty/notes/upload", null, { params: { course_id: courseId, title, text } });
    setStatus(`Indexed ${res.data.chunks_added} chunk(s). Students can now ask questions grounded in this material.`);
    setTitle("");
    setText("");
  }

  return (
    <div className="card p-6">
      <SectionHeader eyebrow="Retrieval-Augmented Generation" title="Upload notes / syllabus material" />
      <p className="mb-4 text-sm text-ink-faint">
        Indexed locally (TF-IDF + FAISS) — no external API calls, nothing leaves this device.
      </p>
      <input
        value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Unit 3 — Normalization)"
        className="mb-3 w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm"
      />
      <textarea
        value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Paste notes or syllabus text here..."
        className="w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm"
      />
      <button onClick={submit} className="mt-3 flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600">
        <Upload size={15} /> Index material
      </button>
      {status && <p className="mt-3 text-sm text-signal-teal">{status}</p>}
    </div>
  );
}
