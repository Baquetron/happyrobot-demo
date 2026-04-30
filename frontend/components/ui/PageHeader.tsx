"use client";

export type DateRangeKey = "all" | "30d" | "7d";

const RANGES: { id: DateRangeKey; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "30d", label: "Last 30 days" },
  { id: "7d", label: "Last 7 days" },
];

export function PageHeader({
  title,
  subtitle,
  range,
  onRangeChange,
}: {
  title: string;
  subtitle: string;
  range: DateRangeKey;
  onRangeChange: (r: DateRangeKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">{title}</h1>
        <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>
      </div>
      <div className="inline-flex bg-white border border-border rounded-md p-0.5 shadow-card">
        {RANGES.map((r) => {
          const active = r.id === range;
          return (
            <button
              key={r.id}
              onClick={() => onRangeChange(r.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[5px] transition-colors ${
                active
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function rangeToDays(r: DateRangeKey): number | null {
  if (r === "7d") return 7;
  if (r === "30d") return 30;
  return null;
}
