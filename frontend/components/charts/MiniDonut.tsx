export interface MiniDonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function MiniDonut({
  segments,
  size = 96,
  thickness = 12,
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
    <div className="flex justify-center">
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={segments
          .map((s) => `${s.label}: ${s.value}`)
          .join(", ")}
      >
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
          const pct = ((s.value / total) * 100).toFixed(0);
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
              className="cursor-pointer transition-opacity hover:opacity-80"
            >
              <title>{`${s.label}: ${s.value} (${pct}%)`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
