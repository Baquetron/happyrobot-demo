"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { NegotiationsTab } from "@/components/tabs/NegotiationsTab";
import { CarriersTab } from "@/components/tabs/CarriersTab";
import { CallLogTab } from "@/components/tabs/CallLogTab";
import { CallRow, MetricsResponse } from "@/lib/types";

const REFRESH_INTERVAL_MS = 30_000;

export default function Page() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [calls, setCalls] = useState<CallRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const [mRes, cRes] = await Promise.all([
        fetch("/api/metrics", { cache: "no-store" }),
        fetch("/api/calls?limit=500", { cache: "no-store" }),
      ]);
      if (!mRes.ok) throw new Error(`metrics ${mRes.status}`);
      if (!cRes.ok) throw new Error(`calls ${cRes.status}`);
      const m = (await mRes.json()) as MetricsResponse;
      const c = (await cRes.json()) as CallRow[];
      if (!aliveRef.current) return;
      setMetrics(m);
      setCalls(c);
      setError(null);
    } catch (e) {
      if (aliveRef.current) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    refresh();

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer != null) return;
      timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    };
    const stop = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      aliveRef.current = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return (
    <div className="min-h-screen">
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-[1600px] px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-baseline gap-2 leading-none">
              <span
                className="font-black tracking-tight text-3xl sm:text-4xl"
                style={{ color: "var(--chart-1)" }}
              >
                ACME
              </span>
              <span className="font-light italic text-2xl sm:text-3xl text-foreground">
                Logistics
              </span>
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Inbound voice agent — live metrics
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <span className="italic text-sm text-foreground">Powered by</span>
            <a
              href="https://happyrobot.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0E0D0C] rounded-md px-3 py-1.5 flex items-center gap-2 hover:bg-[#1a1918] transition-colors"
              aria-label="Powered by HappyRobot"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/happyrobot-mark.svg"
                alt=""
                aria-hidden="true"
                className="h-5 w-auto"
              />
              <span className="text-white text-sm font-semibold tracking-tight leading-none">
                HappyRobot
              </span>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6">
        {error && (
          <div className="bg-card border border-destructive/30 text-destructive rounded-xl p-4 text-sm">
            Failed to load data: {error}
          </div>
        )}
        {!error && (!metrics || !calls) && <DashboardSkeleton />}
        {!error && metrics && calls && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="self-center">
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-card border border-border rounded-xl animate-pulse"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="h-80 bg-card border border-border rounded-xl animate-pulse lg:col-span-3" />
        <div className="h-80 bg-card border border-border rounded-xl animate-pulse lg:col-span-2" />
      </div>
    </div>
  );
}
