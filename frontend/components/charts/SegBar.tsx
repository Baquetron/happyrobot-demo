"use client";

import { useState } from "react";

export interface SegBarSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function SegBar({
  segments,
  showLegend = true,
}: {
  segments: SegBarSegment[];
  showLegend?: boolean;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const [hovered, setHovered] = useState<
    (SegBarSegment & { pct: string }) | null
  >(null);

  return (
    <div className="space-y-1.5">
      <div
        className="relative"
        onMouseLeave={() => setHovered(null)}
      >
        <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
          {segments.map((s) => {
            const pct = ((s.value / total) * 100).toFixed(0);
            return (
              <div
                key={s.key}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHovered({ ...s, pct })}
                style={{
                  width: `${(s.value / total) * 100}%`,
                  background: s.color,
                  opacity: hovered && hovered.key !== s.key ? 0.4 : 1,
                }}
              />
            );
          })}
        </div>
        {hovered && (
          <div
            role="tooltip"
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md z-10"
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-sm mr-1.5 align-middle"
              style={{ background: hovered.color }}
            />
            <span className="font-medium">{hovered.label}</span>
            <span className="text-muted-foreground">
              {" "}
              · {hovered.value} ({hovered.pct}%)
            </span>
          </div>
        )}
      </div>
      {showLegend && (
        <ul className="flex justify-between gap-2 text-[11px]">
          {segments.map((s) => (
            <li key={s.key} className="flex items-center gap-1 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-sm shrink-0"
                style={{ background: s.color }}
              />
              <span className="text-muted-foreground truncate">{s.label}</span>
              <span className="text-foreground tabular-nums shrink-0">
                {s.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
