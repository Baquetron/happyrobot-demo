"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { NegotiationsTab } from "@/components/tabs/NegotiationsTab";
import { CarriersTab } from "@/components/tabs/CarriersTab";
import { CallLogTab } from "@/components/tabs/CallLogTab";
import { CallRow, MetricsResponse } from "@/lib/types";

export default function Page() {
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
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
              HR
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                Carrier Sales Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">
                HappyRobot inbound voice agent — live metrics
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-card border border-destructive/30 text-destructive rounded-xl p-4 text-sm">
            Failed to load data: {error}
          </div>
        )}
        {!error && (!metrics || !calls) && <DashboardSkeleton />}
        {!error && metrics && calls && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="negotiations">Negotiations</TabsTrigger>
              <TabsTrigger value="carriers">Carriers</TabsTrigger>
              <TabsTrigger value="calls">Call Log</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <OverviewTab metrics={metrics} calls={calls} />
            </TabsContent>
            <TabsContent value="negotiations">
              <NegotiationsTab metrics={metrics} calls={calls} />
            </TabsContent>
            <TabsContent value="carriers">
              <CarriersTab metrics={metrics} />
            </TabsContent>
            <TabsContent value="calls">
              <CallLogTab calls={calls} />
            </TabsContent>
          </Tabs>
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
            className="h-28 bg-card border border-border rounded-xl animate-pulse"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-80 bg-card border border-border rounded-xl animate-pulse lg:col-span-2" />
        <div className="h-80 bg-card border border-border rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
