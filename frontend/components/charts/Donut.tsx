"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface DonutDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function Donut({ data }: { data: DonutDatum[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const config = Object.fromEntries(
    data.map((d) => [d.key, { label: d.label, color: d.color }]),
  ) satisfies ChartConfig;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-40 h-40 shrink-0">
        <ChartContainer config={config} className="w-full h-full">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={48}
              outerRadius={72}
              stroke="var(--background)"
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(v) => {
                    const n = typeof v === "number" ? v : Number(v);
                    return `${n} (${total ? ((n / total) * 100).toFixed(0) : 0}%)`;
                  }}
                />
              }
            />
          </PieChart>
        </ChartContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-semibold text-foreground tabular-nums">
            {total}
          </span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
      </div>
      <ul className="flex-1 min-w-0 w-full space-y-2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: d.color }}
              />
              <span className="text-muted-foreground truncate">{d.label}</span>
            </span>
            <span className="text-foreground font-medium tabular-nums shrink-0">
              {d.value}
              <span className="text-muted-foreground ml-1.5 text-xs">
                {total ? `${((d.value / total) * 100).toFixed(0)}%` : "0%"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
