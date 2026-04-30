"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/components/ui/KpiCard";
import { VolumeLine } from "@/components/charts/Line";
import { OUTCOME_COLORS, OUTCOME_LABELS } from "@/lib/colors";
import { callsByDay, recentCalls } from "@/lib/derive";
import { fmtDateTime, fmtDuration, fmtNum, fmtPct } from "@/lib/format";
import { CallRow, MetricsResponse } from "@/lib/types";

export function OverviewTab({
  metrics,
  calls,
}: {
  metrics: MetricsResponse;
  calls: CallRow[];
}) {
  const volume = callsByDay(calls).map((d) => ({ label: d.label, value: d.total }));
  const recent = recentCalls(calls, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:auto-rows-min">
      {/* KPIs (top-left, 4 cols on lg) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:col-span-3">
        <KpiCard
          label="Booking rate"
          value={fmtPct(metrics.conversion_rate)}
          hint={`${metrics.booked_calls} of ${metrics.total_calls} booked`}
        />
        <KpiCard label="Total calls" value={fmtNum(metrics.total_calls)} />
        <KpiCard
          label="Avg negotiation rounds"
          value={fmtNum(metrics.avg_negotiation_rounds, 2)}
        />
        <KpiCard
          label="Avg call duration"
          value={fmtDuration(metrics.avg_call_duration)}
        />
      </div>

      {/* Call Log preview (right column, spans both rows) */}
      <Card className="lg:col-start-4 lg:col-span-2 lg:row-start-1 lg:row-span-2">
        <CardHeader>
          <CardTitle>Call Log</CardTitle>
          <CardDescription>Most recent calls</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {recent.map((c) => (
              <li key={c.id} className="px-4 py-3 flex items-center gap-3">
                <span
                  className="w-1.5 h-8 rounded-full shrink-0"
                  style={{
                    background:
                      OUTCOME_COLORS[c.outcome] ?? "var(--muted-foreground)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {c.carrier_name ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {fmtDuration(c.duration_seconds)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">
                      {OUTCOME_LABELS[c.outcome] ?? c.outcome}
                      {c.load_id ? ` · ${c.load_id}` : ""}
                    </span>
                    <span className="shrink-0">{fmtDateTime(c.created_at)}</span>
                  </div>
                </div>
              </li>
            ))}
            {recent.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                No calls yet.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Call Volume (left, spans 4 cols) */}
      <Card className="lg:col-span-3 lg:row-start-2">
        <CardHeader>
          <CardTitle>Call volume</CardTitle>
          <CardDescription>Calls per day</CardDescription>
        </CardHeader>
        <CardContent>
          {volume.length ? <VolumeLine data={volume} /> : <EmptyChart />}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
      No data
    </div>
  );
}
