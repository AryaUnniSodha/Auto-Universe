import { api, DigitalTwin } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { Loading, SectionHeader } from "@/components/ui";
import { ScoreRing, RingLegend } from "@/components/ScoreRing";

export default function DigitalTwinPage() {
  const { data, loading } = useFetch<DigitalTwin>(() => api.get("/student/digital-twin").then((r) => r.data));
  if (loading) return <Loading label="Synthesizing digital twin..." />;
  if (!data) return null;

  const segments = [
    { label: "Academic", value: data.academic_score, color: "#3B45A8" },
    { label: "Attendance", value: data.attendance_score, color: "#0EA5A4" },
    { label: "Skill / Placement", value: data.skill_score, color: "#F59E0B" },
    { label: "Extracurricular", value: data.extracurricular_score, color: "#7C5CFC" },
  ];

  const nodes = data.skill_graph?.nodes ?? [];
  const maxNodes = 10;

  return (
    <div className="animate-fadeUp space-y-8">
      <div>
        <p className="stat-label mb-1 text-primary-500">Student Digital Twin</p>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Holistic profile · {Math.round(data.overall_score)}/100
        </h1>
        <p className="mt-1 text-sm text-ink-faint">
          Last synthesized {new Date(data.generated_at).toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card flex flex-col items-center gap-6 p-6">
          <p className="stat-label self-start">Composite score</p>
          <ScoreRing segments={segments} overall={data.overall_score} size={200} />
          <RingLegend segments={segments} />
        </div>

        <div className="card p-6 lg:col-span-2">
          <SectionHeader eyebrow="Explainable AI" title="Narrative summary" />
          <p className="text-[15px] leading-relaxed text-ink-soft">{data.narrative}</p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {segments.map((s) => (
              <div key={s.label} className="rounded-lg border border-line bg-canvas p-3.5">
                <p className="stat-label mb-1">{s.label}</p>
                <p className="font-display text-lg font-semibold" style={{ color: s.color }}>
                  {Math.round(s.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skill relationship graph, rendered as a radial cluster */}
      <div className="card p-6">
        <SectionHeader eyebrow="Graph-based modeling" title="Skill & subject relationship map" />
        <div className="relative mx-auto flex h-[340px] w-full max-w-2xl items-center justify-center">
          <div className="absolute rounded-full border border-dashed border-line" style={{ width: 260, height: 260 }} />
          <div className="z-10 rounded-full bg-primary-700 px-4 py-3 text-center text-white shadow-pop">
            <p className="text-[10px] uppercase tracking-wide text-white/70">Outcome</p>
            <p className="font-display text-sm font-semibold">Placement Readiness</p>
          </div>
          {nodes.slice(0, maxNodes).map((n, i) => {
            const angle = (2 * Math.PI * i) / Math.min(nodes.length, maxNodes);
            const radius = 155;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const color = n.type === "skill" ? "#F59E0B" : n.type === "outcome" ? "#7C5CFC" : "#0EA5A4";
            return (
              <div
                key={n.id + i}
                className="absolute flex flex-col items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-2 text-center shadow-card"
                style={{ transform: `translate(${x}px, ${y}px)`, minWidth: 88 }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                <p className="text-[11px] font-medium leading-tight text-ink">{n.id}</p>
                <p className="font-mono text-[10px] text-ink-faint">{Math.round(n.value)}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-ink-faint">
          Nodes represent subjects and skills; proximity to the center reflects contribution to overall placement readiness.
        </p>
      </div>
    </div>
  );
}
