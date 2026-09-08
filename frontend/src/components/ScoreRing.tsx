interface RingSegment {
  label: string;
  value: number; // 0-100
  color: string;
}

/**
 * ScoreRing — the platform's signature visual motif. A composite score is not
 * a single number; it's several concentric bands (academic / attendance /
 * skill / extracurricular) converging into one overall figure. Used on the
 * student overview, the Digital Twin page, and aggregated on the university
 * dashboard — the same visual language at every zoom level of the system.
 */
export function ScoreRing({
  segments,
  overall,
  size = 160,
  label = "Overall",
}: {
  segments: RingSegment[];
  overall: number;
  size?: number;
  label?: string;
}) {
  const strokeWidth = size * 0.055;
  const gap = strokeWidth * 0.6;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const r = cx - strokeWidth / 2 - i * (strokeWidth + gap);
          const circumference = 2 * Math.PI * r;
          const offset = circumference * (1 - seg.value / 100);
          return (
            <g key={seg.label} style={{ ["--ring-full" as any]: circumference, ["--ring-offset" as any]: offset }}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EEF0F7" strokeWidth={strokeWidth} />
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                className="animate-ringGrow"
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-ink">{Math.round(overall)}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

export function RingLegend({ segments }: { segments: RingSegment[] }) {
  return (
    <div className="flex flex-col gap-2">
      {segments.map((s) => (
        <div key={s.label} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2 text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
          <span className="font-mono text-ink">{Math.round(s.value)}</span>
        </div>
      ))}
    </div>
  );
}
