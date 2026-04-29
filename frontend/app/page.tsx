"use client";

import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { NegotiationsTab } from "@/components/tabs/NegotiationsTab";
import { CarriersTab } from "@/components/tabs/CarriersTab";
import { CallLogTab } from "@/components/tabs/CallLogTab";
import { CallRow, MetricsResponse } from "@/lib/types";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "negotiations", label: "Negotiations" },
  { id: "carriers", label: "Carriers" },
  { id: "calls", label: "Call Log" },
];

export default function Page() {
  const [active, setActive] = useState("overview");
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [calls, setCalls] = useState<CallRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [mRes, cRes] = await Promise.all([
          fetch("/api/metrics"),
          fetch("/api/calls?limit=500"),
        ]);
        if (!mRes.ok) throw new Error(`metrics ${mRes.status}`);
        if (!cRes.ok) throw new Error(`calls ${cRes.status}`);
        const m = (await mRes.json()) as MetricsResponse;
        const c = (await cRes.json()) as CallRow[];
        if (!alive) return;
        setMetrics(m);
        setCalls(c);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-semibold text-sm">
              HR
            </div>
            <div>
              <h1 className="text-base font-semibold text-ink">
                Carrier Sales Dashboard
              </h1>
              <p className="text-xs text-ink-subtle">
                HappyRobot inbound voice agent — live metrics
              </p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6">
          <Tabs tabs={TABS} active={active} onChange={setActive} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-white border border-negative/30 text-negative rounded-card p-4 text-sm">
            Failed to load data: {error}
          </div>
        )}
        {!error && (!metrics || !calls) && <DashboardSkeleton />}
        {!error && metrics && calls && (
          <>
            {active === "overview" && <OverviewTab metrics={metrics} calls={calls} />}
            {active === "negotiations" && (
              <NegotiationsTab metrics={metrics} calls={calls} />
            )}
            {active === "carriers" && <CarriersTab metrics={metrics} />}
            {active === "calls" && <CallLogTab calls={calls} />}
          </>
        )}
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-white border border-border rounded-card shadow-card animate-pulse"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-80 bg-white border border-border rounded-card shadow-card animate-pulse lg:col-span-2" />
        <div className="h-80 bg-white border border-border rounded-card shadow-card animate-pulse" />
      </div>
    </div>
  );
}
