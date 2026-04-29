"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Donut } from "@/components/charts/Donut";
import { SimpleBars } from "@/components/charts/Bars";
import { OUTCOME_COLORS, OUTCOME_LABELS, SENTIMENT_COLORS, SENTIMENT_LABELS } from "@/lib/colors";
import { failedVerificationRate } from "@/lib/derive";
import { fmtPct } from "@/lib/format";
import { MetricsResponse } from "@/lib/types";

const NEGATIVE_OUTCOMES = ["rejected", "no_load", "failed_verification"];

export function CarriersTab({ metrics }: { metrics: MetricsResponse }) {
  const sentimentDonut = metrics.sentiments.map((s) => ({
    key: s.sentiment,
    label: SENTIMENT_LABELS[s.sentiment] ?? s.sentiment,
    value: s.count,
    color: SENTIMENT_COLORS[s.sentiment] ?? "#94A3B8",
  }));

  const rejectionBars = NEGATIVE_OUTCOMES.map((o) => {
    const count = metrics.outcomes.find((x) => x.outcome === o)?.count ?? 0;
    return {
      label: OUTCOME_LABELS[o],
      value: count,
      color: OUTCOME_COLORS[o],
    };
  });

  const failedRate = failedVerificationRate(metrics.outcomes);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Failed verification rate"
          value={fmtPct(failedRate)}
          hint="Share of calls failing FMCSA check"
        />
        <KpiCard
          label="Carriers reached"
          value={String(metrics.total_calls)}
          hint="Total inbound calls logged"
        />
        <KpiCard
          label="Booked carriers"
          value={String(metrics.booked_calls)}
          hint={`${fmtPct(metrics.conversion_rate)} conversion`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Carrier sentiment"
            subtitle="Tone captured at end of call"
          />
          <Donut data={sentimentDonut} />
        </Card>
        <Card>
          <CardHeader
            title="Top non-booking outcomes"
            subtitle="Why calls don't convert"
          />
          <SimpleBars data={rejectionBars} />
        </Card>
      </div>
    </div>
  );
}
