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
import { MiniDonut } from "@/components/charts/MiniDonut";
import { SegBar } from "@/components/charts/SegBar";
import { OUTCOME_COLORS, OUTCOME_LABELS } from "@/lib/colors";
import {
  bookingsByRound,
  callDurationBuckets,
  callsByDay,
  recentCalls,
} from "@/lib/derive";
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
  const recent = recentCalls(calls, 30);

  const outcomeSegments = metrics.outcomes.map((o) => ({
    key: o.outcome,
    label: OUTCOME_LABELS[o.outcome] ?? o.outcome,
    value: o.count,
    color: OUTCOME_COLORS[o.outcome] ?? "var(--muted-foreground)",
  }));

  const totalBooked = metrics.booked_calls;
  const totalNotBooked = Math.max(0, metrics.total_calls - totalBooked);
  const totalCallsSegments = [
    { key: "booked", label: "Booked", value: totalBooked, color: "var(--chart-1)" },
    { key: "other", label: "Not booked", value: totalNotBooked, color: "var(--chart-3)" },
  ];

  const rounds = bookingsByRound(calls);
  // Hover tooltip uses these labels — kept explicit so the popover reads clearly.
  // Inline under-bar legend is suppressed for this card (showLegend={false}) since
  // the title + hint already convey context and the labels would overlap.
  const roundsSegments = [
    { key: "r1", label: "1 round", value: rounds[0].value, color: "var(--chart-1)" },
    { key: "r2", label: "2 rounds", value: rounds[1].value, color: "var(--chart-2)" },
    { key: "r3", label: "3+ rounds", value: rounds[2].value, color: "var(--chart-3)" },
  ];

  const durations = callDurationBuckets(calls);
  const durationSegments = [
    { key: "u", label: durations[0].label, value: durations[0].value, color: "var(--chart-4)" },
    { key: "m", label: durations[1].label, value: durations[1].value, color: "var(--chart-1)" },
    { key: "o", label: durations[2].label, value: durations[2].value, color: "var(--chart-3)" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Left column: KPIs row + Call Volume row */}
      <div className="lg:col-span-3 space-y-4 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Booking rate"
            value={fmtPct(metrics.conversion_rate)}
            hint={`${metrics.booked_calls} of ${metrics.total_calls} booked`}
          >
            <MiniDonut segments={outcomeSegments} />
          </KpiCard>

          <KpiCard label="Total calls" value={fmtNum(metrics.total_calls)}>
            <SegBar segments={totalCallsSegments} />
          </KpiCard>

          <KpiCard
            label="Avg negotiation rounds"
            value={fmtNum(metrics.avg_negotiation_rounds, 2)}
            hint="Bookings closed at each round"
          >
            <SegBar segments={roundsSegments} showLegend={false} />
          </KpiCard>

          <KpiCard
            label="Avg call duration"
            value={fmtDuration(metrics.avg_call_duration)}
          >
            <SegBar segments={durationSegments} />
          </KpiCard>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Call volume</CardTitle>
            <CardDescription>Calls per day</CardDescription>
          </CardHeader>
          <CardContent>
            {volume.length ? <VolumeLine data={volume} /> : <EmptyChart />}
          </CardContent>
        </Card>
      </div>

      {/* Right column wrapper. On lg the wrapper is positioned relative and the
          Card is absolute inset-0, so the wrapper contributes 0 to the grid row
          sizing — the row height is dictated by the left column, the Card
          stretches into that bounded box and scrolls internally. */}
      <div className="lg:col-span-2 lg:relative">
        <Card className="flex flex-col overflow-hidden lg:absolute lg:inset-0 lg:max-h-none max-h-[60vh]">
          <CardHeader>
            <CardTitle>Call Log</CardTitle>
            <CardDescription>Most recent calls</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
            <ul className="h-full overflow-y-auto divide-y divide-border">
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
      </div>
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
