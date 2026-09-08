import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    low: "bg-signal-tealSoft text-signal-teal",
    moderate: "bg-signal-amberSoft text-signal-amber",
    high: "bg-signal-amberSoft text-signal-amber",
    critical: "bg-signal-roseSoft text-signal-rose",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${styles[level] ?? "bg-primary-50 text-primary-700"}`}>
      {level} risk
    </span>
  );
}

export function TrendBadge({ trend }: { trend: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    improving: { label: "↑ Improving", cls: "text-signal-teal" },
    declining: { label: "↓ Declining", cls: "text-signal-rose" },
    stable: { label: "→ Stable", cls: "text-ink-faint" },
  };
  const t = map[trend] ?? map.stable;
  return <span className={`text-xs font-medium ${t.cls}`}>{t.label}</span>;
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <p className="stat-label mb-1 text-primary-500">{eyebrow}</p>
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Loading({ label = "Loading intelligence..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-ink-faint">
      <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-1 px-6 py-14 text-center">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-ink-faint">{description}</p>
    </div>
  );
}

export function Priority({ level }: { level: string }) {
  const cls: Record<string, string> = {
    high: "bg-signal-roseSoft text-signal-rose",
    medium: "bg-signal-amberSoft text-signal-amber",
    low: "bg-signal-tealSoft text-signal-teal",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls[level] ?? cls.low}`}>{level}</span>;
}
