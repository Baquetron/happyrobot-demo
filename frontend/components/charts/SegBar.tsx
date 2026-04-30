export interface SegBarSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function SegBar({ segments }: { segments: SegBarSegment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
        {segments.map((s) => (
          <div
            key={s.key}
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
            }}
          />
        ))}
      </div>
      <ul className="flex justify-between gap-2 text-[11px]">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1 min-w-0">
            <span
              className="w-1.5 h-1.5 rounded-sm shrink-0"
              style={{ background: s.color }}
            />
            <span className="text-muted-foreground truncate">{s.label}</span>
            <span className="text-foreground tabular-nums shrink-0">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
