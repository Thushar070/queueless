/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AnalyticsData {
  servedTodayCount: number;
  averageWaitTimeMin: number;
  activeQueueLengths: Array<{ queueId: string; queueName: string; length: number }>;
  cancellationRate: number;
  peakHoursHistogram: Array<{ hour: number; count: number }>;
  averageServiceDurationMin: number;
}

export default function AnalyticsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics");
      if (!res.ok) {
        throw new Error("Failed to fetch analytics metrics");
      }
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchAnalytics();
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center select-none">
        <p className="text-destructive mb-4 font-bold">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const maxHistogramCount = data ? Math.max(...data.peakHoursHistogram.map((h) => h.count), 1) : 1;

  return (
    <div className="space-y-8 select-none text-left">
      <div>
        <h2 className="text-3xl font-heading font-extrabold tracking-tight text-foreground font-heading">Analytics Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Real-time metrics, historical trends, and queue statistics</p>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Customers Served Today */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">Served Today</span>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-heading font-extrabold text-foreground tracking-tight">{data?.servedTodayCount ?? 0}</span>
            <span className="text-muted-foreground text-xs font-semibold">customers</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium mt-2">Completed entries since UTC midnight</p>
        </div>

        {/* Cancellation Rate */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">Cancellation Rate</span>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-heading font-extrabold text-foreground tracking-tight">{data?.cancellationRate ?? 0}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium mt-2">Cancelled ÷ terminal-state entries</p>
        </div>

        {/* Average Wait Time */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">Avg Wait Time</span>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-heading font-extrabold text-foreground tracking-tight">{data?.averageWaitTimeMin ?? 0}</span>
            <span className="text-muted-foreground text-xs font-semibold">min</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium mt-2">Time from join to called by staff</p>
        </div>

        {/* Average Service Duration */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">Avg Service Duration</span>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-heading font-extrabold text-foreground tracking-tight">{data?.averageServiceDurationMin ?? 0}</span>
            <span className="text-muted-foreground text-xs font-semibold">min</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium mt-2">Time from serving start to completion</p>
        </div>
      </div>

      {/* Secondary Charts / Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Queue Lengths */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col col-span-1 shadow-sm">
          <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest mb-4">Active Queue Lengths</span>
          {data?.activeQueueLengths && data.activeQueueLengths.length > 0 ? (
            <div className="space-y-4 flex-1">
              {data.activeQueueLengths.map((q) => (
                <div key={q.queueId} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-foreground">{q.queueName}</span>
                    <span className="text-muted-foreground font-mono">{q.length} waiting</span>
                  </div>
                  {/* Visual bar */}
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-500 rounded-full" 
                      style={{ width: `${Math.min((q.length / 20) * 100, 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs py-8">
              No active queues found
            </div>
          )}
        </div>

        {/* Peak Hours Histogram */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col col-span-1 lg:col-span-2 shadow-sm">
          <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest mb-4">Peak Joining Hours (UTC)</span>
          <div className="flex-1 flex items-end justify-between gap-1.5 h-64 pt-6 pb-2 border-b border-border">
            {data?.peakHoursHistogram.map((h) => {
              const pct = (h.count / maxHistogramCount) * 100;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip */}
                  <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-card text-foreground text-[10px] py-1 px-2 rounded border border-border pointer-events-none whitespace-nowrap z-20 font-mono shadow-md">
                    {h.count} joins at {String(h.hour).padStart(2, "0")}:00
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-full bg-muted hover:bg-primary/80 rounded-t transition-colors duration-200" 
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
          {/* X-Axis labels */}
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-2 px-1">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
