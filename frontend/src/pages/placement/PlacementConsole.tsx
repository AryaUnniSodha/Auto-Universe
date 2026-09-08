import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Target, Users, TrendingUp, CalendarClock, Plus, Trash2, CheckCircle2, Briefcase, X,
} from "lucide-react";
import { api, type PlacementDashboard, type JobEventItem, type StudentRosterEntry } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { Loading, SectionHeader } from "@/components/ui";

const TABS = [
  { id: "overview", label: "Overview", icon: Target },
  { id: "tests", label: "Tests", icon: CheckCircle2 },
  { id: "events", label: "Job Events", icon: CalendarClock },
  { id: "roster", label: "Student Roster", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function PlacementConsole() {
  const [tab, setTab] = useState<TabId>("overview");
  const dashboard = useFetch<PlacementDashboard>(() => api.get("/placement/dashboard").then((r) => r.data));

  return (
    <div className="animate-fadeUp space-y-8">
      <div>
        <p className="stat-label mb-1 text-primary-500">Placement Cell</p>
        <h1 className="font-display text-3xl font-semibold text-ink">Placement officer console</h1>
        <p className="mt-1 text-sm text-ink-faint">
          Assign aptitude/coding tests, post job drives, and track placement outcomes across the institution.
        </p>
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

      {tab === "overview" && <Overview dashboard={dashboard.data} loading={dashboard.loading} />}
      {tab === "tests" && <TestsPanel onChanged={dashboard.reload} />}
      {tab === "events" && <EventsPanel />}
      {tab === "roster" && <RosterPanel onChanged={dashboard.reload} />}
    </div>
  );
}

function Overview({ dashboard, loading }: { dashboard: PlacementDashboard | null; loading: boolean }) {
  if (loading) return <Loading label="Synthesizing placement intelligence..." />;
  if (!dashboard) return null;

  const testChart = dashboard.tests.map((t) => ({
    name: t.title.length > 16 ? t.title.slice(0, 16) + "…" : t.title,
    completion: t.eligible_count ? Math.round((t.completed_count / t.eligible_count) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Metric icon={Users} label="Total students" value={dashboard.total_students} />
        <Metric icon={Briefcase} label="Placed" value={dashboard.placed_count} tone="teal" />
        <Metric icon={TrendingUp} label="Placement rate" value={`${dashboard.placement_rate}%`} tone="teal" />
        <Metric icon={CheckCircle2} label="Aptitude completion" value={`${dashboard.aptitude_completion_rate}%`} />
        <Metric icon={CheckCircle2} label="Coding completion" value={`${dashboard.coding_completion_rate}%`} />
        <Metric icon={CalendarClock} label="Upcoming events" value={dashboard.upcoming_events_count} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <SectionHeader eyebrow="Assessment Coverage" title="Test completion rate" />
          {testChart.length === 0 ? (
            <p className="text-sm text-ink-faint">No tests created yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={testChart} margin={{ left: -20, right: 10 }}>
                <CartesianGrid stroke="#E6E8F2" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8A8DAE" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#8A8DAE" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E8F2", fontSize: 13 }} formatter={(v: number) => [`${v}%`, "Completed"]} />
                <Bar dataKey="completion" radius={[6, 6, 0, 0]} fill="#0EA5A4" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <SectionHeader eyebrow="Recent Outcomes" title="Latest placements" />
          {dashboard.recent_placements.length === 0 ? (
            <p className="text-sm text-ink-faint">No placements recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {dashboard.recent_placements.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{p.student}</p>
                    <p className="font-mono text-xs text-ink-faint">{p.roll_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-signal-teal">{p.company}</p>
                    <p className="font-mono text-xs text-ink-faint">{p.package_lpa} LPA</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone?: "teal" }) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <Icon size={14} className={tone === "teal" ? "text-signal-teal" : "text-primary-500"} />
      </div>
      <p className={`font-display text-xl font-semibold ${tone === "teal" ? "text-signal-teal" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function TestsPanel({ onChanged }: { onChanged: () => void }) {
  const { data, loading, reload } = useFetch<any[]>(() => api.get("/placement/tests").then((r) => r.data));
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600">
          <Plus size={15} /> Create test
        </button>
      </div>

      {creating && (
        <CreateTestForm
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            reload();
            onChanged();
          }}
        />
      )}

      {loading ? (
        <Loading label="Loading tests..." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(data ?? []).map((t) => (
            <div key={t.id} className="card p-5">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  <p className="text-xs capitalize text-ink-faint">{t.type} · {t.department_scope} · {t.question_count} questions</p>
                </div>
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">{t.duration_minutes} min</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3">
                <div>
                  <p className="stat-label mb-0.5">Eligible</p>
                  <p className="font-mono text-sm text-ink">{t.eligible_count}</p>
                </div>
                <div>
                  <p className="stat-label mb-0.5">Completed</p>
                  <p className="font-mono text-sm text-signal-teal">{t.completed_count}</p>
                </div>
                <div>
                  <p className="stat-label mb-0.5">Avg score</p>
                  <p className="font-mono text-sm text-ink">{t.avg_score !== null ? `${t.avg_score}%` : "—"}</p>
                </div>
              </div>
            </div>
          ))}
          {(!data || data.length === 0) && (
            <p className="text-sm text-ink-faint">No tests created yet — click "Create test" to assign one.</p>
          )}
        </div>
      )}
    </div>
  );
}

function CreateTestForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("aptitude");
  const [description, setDescription] = useState("");
  const [departmentScope, setDepartmentScope] = useState("ALL");
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState([{ question: "", options: ["", ""], correct_index: 0 }]);
  const [saving, setSaving] = useState(false);

  function addQuestion() {
    setQuestions((q) => [...q, { question: "", options: ["", ""], correct_index: 0 }]);
  }
  function updateQuestion(i: number, patch: Partial<(typeof questions)[0]>) {
    setQuestions((q) => q.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }
  function updateOption(qi: number, oi: number, value: string) {
    setQuestions((q) => q.map((item, idx) => idx === qi ? { ...item, options: item.options.map((o, j) => j === oi ? value : o) } : item));
  }
  function addOption(qi: number) {
    setQuestions((q) => q.map((item, idx) => idx === qi ? { ...item, options: [...item.options, ""] } : item));
  }
  function removeQuestion(i: number) {
    setQuestions((q) => q.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!title.trim() || questions.some((q) => !q.question.trim() || q.options.some((o) => !o.trim()))) return;
    setSaving(true);
    try {
      await api.post("/placement/tests", {
        title, type, description, department_scope: departmentScope, duration_minutes: duration, questions,
      });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-4 p-6">
      <div className="flex items-center justify-between">
        <SectionHeader eyebrow="New assessment" title="Create test" />
        <button onClick={onClose} className="rounded-lg p-1.5 text-ink-faint hover:bg-canvas"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Test title" className="rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm">
          <option value="aptitude">Aptitude</option>
          <option value="coding">Coding</option>
        </select>
        <input value={departmentScope} onChange={(e) => setDepartmentScope(e.target.value)} placeholder="Department scope (e.g. ALL or CSE,IT)" className="rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm" />
        <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} placeholder="Duration (minutes)" className="rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm" />
      </div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm" />

      <div className="space-y-4 border-t border-line pt-4">
        <p className="stat-label">Questions</p>
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-lg border border-line bg-canvas p-4">
            <div className="mb-2 flex items-center justify-between">
              <input
                value={q.question} onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                placeholder={`Question ${qi + 1}`} className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm"
              />
              <button onClick={() => removeQuestion(qi)} className="ml-2 rounded-md p-1.5 text-signal-rose hover:bg-signal-roseSoft"><Trash2 size={14} /></button>
            </div>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio" checked={q.correct_index === oi} onChange={() => updateQuestion(qi, { correct_index: oi })}
                    className="accent-signal-teal"
                  />
                  <input
                    value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`} className="flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
            <button onClick={() => addOption(qi)} className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700">+ Add option</button>
          </div>
        ))}
        <button onClick={addQuestion} className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
          <Plus size={14} /> Add question
        </button>
      </div>

      <button onClick={submit} disabled={saving} className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60">
        {saving ? "Saving..." : "Publish test"}
      </button>
    </div>
  );
}

function EventsPanel() {
  const { data, loading, reload } = useFetch<JobEventItem[]>(() => api.get("/placement/events").then((r) => r.data));
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [eventType, setEventType] = useState("drive");
  const [eventDate, setEventDate] = useState("");
  const [minCgpa, setMinCgpa] = useState(0);
  const [deptScope, setDeptScope] = useState("ALL");
  const [description, setDescription] = useState("");

  async function submit() {
    if (!title.trim() || !eventDate) return;
    await api.post("/placement/events", {
      title, company_name: company, event_type: eventType, event_date: eventDate,
      min_cgpa: minCgpa, department_scope: deptScope, description,
    });
    setCreating(false);
    setTitle(""); setCompany(""); setEventDate(""); setDescription("");
    reload();
  }

  async function remove(id: number) {
    await api.delete(`/placement/events/${id}`);
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setCreating((v) => !v)} className="flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600">
          <Plus size={15} /> Post event
        </button>
      </div>

      {creating && (
        <div className="card space-y-3 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm" />
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" className="rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm" />
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm">
              <option value="drive">Drive</option>
              <option value="webinar">Webinar</option>
              <option value="workshop">Workshop</option>
              <option value="deadline">Deadline</option>
            </select>
            <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm" />
            <input type="number" value={minCgpa} onChange={(e) => setMinCgpa(Number(e.target.value))} placeholder="Minimum CGPA" className="rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm" />
            <input value={deptScope} onChange={(e) => setDeptScope(e.target.value)} placeholder="Department scope (ALL or CSE,IT)" className="rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm" />
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2} className="w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm" />
          <button onClick={submit} className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600">Publish</button>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : (
        <div className="card divide-y divide-line">
          {(data ?? []).map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-ink">{e.title} {e.company_name && <span className="text-ink-faint">· {e.company_name}</span>}</p>
                <p className="text-xs text-ink-faint">
                  {new Date(e.event_date).toLocaleString()} · <span className="capitalize">{e.event_type}</span> · {e.department_scope} · min CGPA {e.min_cgpa}
                </p>
              </div>
              <button onClick={() => remove(e.id)} className="rounded-lg p-1.5 text-signal-rose hover:bg-signal-roseSoft"><Trash2 size={14} /></button>
            </div>
          ))}
          {(!data || data.length === 0) && <p className="px-5 py-6 text-sm text-ink-faint">No events posted yet.</p>}
        </div>
      )}
    </div>
  );
}

function RosterPanel({ onChanged }: { onChanged: () => void }) {
  const { data, loading, reload } = useFetch<StudentRosterEntry[]>(() => api.get("/placement/roster").then((r) => r.data));
  const [editing, setEditing] = useState<number | null>(null);
  const [status, setStatus] = useState("placed");
  const [company, setCompany] = useState("");
  const [pkg, setPkg] = useState(0);

  async function save(studentId: number) {
    await api.put(`/placement/students/${studentId}/status`, { status, company, package_lpa: pkg });
    setEditing(null);
    reload();
    onChanged();
  }

  if (loading) return <Loading label="Loading student roster..." />;

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-canvas text-left">
          <tr>
            {["Student", "Dept / Sem", "CGPA", "Aptitude", "Coding", "Readiness", "Status", ""].map((h) => (
              <th key={h} className="stat-label px-4 py-2.5 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {(data ?? []).map((s) => (
            <tr key={s.student_id}>
              <td className="px-4 py-3">
                <p className="font-medium text-ink">{s.full_name}</p>
                <p className="font-mono text-xs text-ink-faint">{s.roll_number}</p>
              </td>
              <td className="px-4 py-3 text-xs text-ink-soft">{s.department} · Sem {s.semester}</td>
              <td className="px-4 py-3 font-mono text-ink-soft">{s.cgpa.toFixed(2)}</td>
              <td className="px-4 py-3 font-mono text-ink-soft">{s.aptitude_score}</td>
              <td className="px-4 py-3 font-mono text-ink-soft">{s.coding_score}</td>
              <td className="px-4 py-3 font-mono text-ink-soft">{s.readiness_score}</td>
              <td className="px-4 py-3">
                {s.placement_status === "placed" ? (
                  <span className="rounded-full bg-signal-tealSoft px-2.5 py-1 text-xs font-medium text-signal-teal">
                    {s.placed_company} · {s.placed_package_lpa} LPA
                  </span>
                ) : (
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 capitalize">{s.placement_status}</span>
                )}
              </td>
              <td className="px-4 py-3">
                {editing === s.student_id ? (
                  <div className="flex flex-col gap-1.5">
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-line bg-canvas px-2 py-1 text-xs">
                      <option value="placed">Placed</option>
                      <option value="not_placed">Not placed</option>
                      <option value="opted_out">Opted out</option>
                    </select>
                    {status === "placed" && (
                      <>
                        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="rounded-md border border-line bg-canvas px-2 py-1 text-xs" />
                        <input type="number" value={pkg} onChange={(e) => setPkg(Number(e.target.value))} placeholder="Package (LPA)" className="rounded-md border border-line bg-canvas px-2 py-1 text-xs" />
                      </>
                    )}
                    <button onClick={() => save(s.student_id)} className="rounded-md bg-primary-700 px-2 py-1 text-xs font-medium text-white">Save</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditing(s.student_id); setStatus(s.placement_status); setCompany(s.placed_company ?? ""); setPkg(s.placed_package_lpa ?? 0); }}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    Update
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
