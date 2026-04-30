export interface MiniDonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function MiniDonut({
  segments,
  size = 56,
  thickness = 8,
}: {
  segments: MiniDonutSegment[];
  size?: number;
  thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} className="shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={thickness}
        />
        {segments.map((s) => {
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          const dashOffset = -offset;
          offset += len;
          return (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <ul className="flex-1 min-w-0 space-y-0.5 text-[11px]">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-1.5 h-1.5 rounded-sm shrink-0"
              style={{ background: s.color }}
            />
            <span className="text-muted-foreground truncate flex-1">{s.label}</span>
            <span className="text-foreground tabular-nums shrink-0">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
