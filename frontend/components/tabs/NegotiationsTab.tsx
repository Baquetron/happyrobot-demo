"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { SimpleBars, StackedBars } from "@/components/charts/Bars";
import {
  firstRoundAcceptanceRate,
  rateEfficiency,
  roundsDistribution,
  winLossByRound,
} from "@/lib/derive";
import { fmtNum, fmtPct } from "@/lib/format";
import { CallRow, MetricsResponse } from "@/lib/types";

export function NegotiationsTab({
  metrics,
  calls,
}: {
  metrics: MetricsResponse;
  calls: CallRow[];
}) {
  const rounds = roundsDistribution(calls);
  const winLoss = winLossByRound(calls);
  const efficiency = rateEfficiency(metrics.avg_final_rate, metrics.avg_loadboard_rate);
  const firstRound = firstRoundAcceptanceRate(calls);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Avg negotiation rounds"
          value={fmtNum(metrics.avg_negotiation_rounds, 2)}
          hint="Across all logged calls"
        />
        <KpiCard
          label="Rate efficiency"
          value={efficiency != null ? fmtPct(efficiency, 1) : "—"}
          hint={
            metrics.avg_rate_delta != null
              ? `Avg paid ${metrics.avg_rate_delta >= 0 ? "+" : ""}$${Math.round(
                  metrics.avg_rate_delta
                )} vs loadboard`
              : "Final ÷ loadboard rate"
          }
        />
        <KpiCard
          label="First-round acceptance"
          value={fmtPct(firstRound)}
          hint="Share of bookings closed in round 1"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Rounds distribution"
            subtitle="How many rounds calls take"
          />
          <SimpleBars data={rounds} />
        </Card>
        <Card>
          <CardHeader
            title="Win / loss by round"
            subtitle="Booked vs rejected at each round"
          />
          <StackedBars
            data={winLoss}
            series={[
              { key: "booked", label: "Booked", color: "#2563EB" },
              { key: "rejected", label: "Rejected", color: "#F59E0B" },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
