"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Donut } from "@/components/charts/Donut";
import { VolumeLine } from "@/components/charts/Line";
import { OUTCOME_COLORS, OUTCOME_LABELS } from "@/lib/colors";
import { callsByDay } from "@/lib/derive";
import { fmtDuration, fmtNum, fmtPct } from "@/lib/format";
import { CallRow, MetricsResponse } from "@/lib/types";

export function OverviewTab({
  metrics,
  calls,
}: {
  metrics: MetricsResponse;
  calls: CallRow[];
}) {
  const volume = callsByDay(calls);
  const outcomeDonut = metrics.outcomes.map((o) => ({
    key: o.outcome,
    label: OUTCOME_LABELS[o.outcome] ?? o.outcome,
    value: o.count,
    color: OUTCOME_COLORS[o.outcome] ?? "#94A3B8",
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Booking rate"
          value={fmtPct(metrics.conversion_rate)}
          hint={`${metrics.booked_calls} of ${metrics.total_calls} calls booked`}
        />
        <KpiCard label="Total calls" value={fmtNum(metrics.total_calls)} />
        <KpiCard
          label="Avg call duration"
          value={fmtDuration(metrics.avg_call_duration)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Call volume" subtitle="Calls per day" />
          {volume.length ? (
            <VolumeLine data={volume} />
          ) : (
            <EmptyChart />
          )}
        </Card>
        <Card>
          <CardHeader title="Outcomes" subtitle="Distribution across all calls" />
          <Donut data={outcomeDonut} />
        </Card>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[260px] flex items-center justify-center text-sm text-ink-subtle">
      No data
    </div>
  );
}
