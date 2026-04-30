"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface SimpleBarDatum {
  label: string;
  value: number;
  color?: string;
}

export function SimpleBars({
  data,
  height = 240,
  defaultColor = "var(--chart-1)",
}: {
  data: SimpleBarDatum[];
  height?: number;
  defaultColor?: string;
}) {
  const config = { value: { label: "Value", color: defaultColor } } satisfies ChartConfig;

  return (
    <ChartContainer config={config} style={{ width: "100%", height }}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={<ChartTooltipContent />}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? defaultColor} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export interface StackedBarDatum {
  label: string;
  [seriesKey: string]: string | number;
}

export function StackedBars({
  data,
  series,
  height = 260,
}: {
  data: StackedBarDatum[];
  series: { key: string; label: string; color: string }[];
  height?: number;
}) {
  const config = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }]),
  ) satisfies ChartConfig;

  return (
    <ChartContainer config={config} style={{ width: "100%", height }}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={<ChartTooltipContent />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="x"
            fill={`var(--color-${s.key})`}
            radius={i === series.length - 1 ? [6, 6, 0, 0] : 0}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
