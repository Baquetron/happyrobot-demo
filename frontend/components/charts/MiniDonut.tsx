"use client";

import { useState } from "react";

export interface MiniDonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
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
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const [hovered, setHovered] = useState<
    (MiniDonutSegment & { pct: string }) | null
  >(null);

  let acc = 0;
  const slices = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const startDeg = (acc / total) * 360;
      acc += s.value;
      const endDeg = (acc / total) * 360;
      const span = Math.min(endDeg - startDeg, 359.99);
      const pct = ((s.value / total) * 100).toFixed(0);
      return {
        ...s,
        d: arcPath(cx, cy, r, startDeg, startDeg + span),
        pct,
      };
    });

  return (
    <div
      className="relative flex justify-center"
      onMouseLeave={() => setHovered(null)}
    >
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={thickness}
        />
        {slices.map((s) => (
          <path
            key={s.key}
            d={s.d}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeLinecap="butt"
            className="cursor-pointer transition-opacity"
            style={{
              pointerEvents: "stroke",
              opacity: hovered && hovered.key !== s.key ? 0.4 : 1,
            }}
            onMouseEnter={() => setHovered(s)}
          />
        ))}
      </svg>
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
  );
}
