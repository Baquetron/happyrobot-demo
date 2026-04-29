"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function Donut({ data }: { data: DonutDatum[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-40 h-40 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={48}
              outerRadius={72}
              stroke="white"
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              cursor={false}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E5E7EB",
                fontSize: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
              formatter={(v) => {
                const n = typeof v === "number" ? v : Number(v);
                return [`${n} (${((n / total) * 100).toFixed(0)}%)`, ""];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-semibold text-ink tabular-nums">{total}</span>
          <span className="text-xs text-ink-subtle">total</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: d.color }}
              />
              <span className="text-ink-muted">{d.label}</span>
            </span>
            <span className="text-ink font-medium tabular-nums">
              {d.value}
              <span className="text-ink-subtle ml-1.5 text-xs">
                {total ? `${((d.value / total) * 100).toFixed(0)}%` : "0%"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
