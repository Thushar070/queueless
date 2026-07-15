/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface PlatformMetrics {
  servedTodayCount: number;
  averageWaitTimeMin: number;
  activeQueueLengths: Array<{ queueId: string; queueName: string; length: number }>;
  cancellationRate: number;
  peakHoursHistogram: Array<{ hour: number; count: number }>;
  averageServiceDurationMin: number;
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
}

export default function AdminAnalyticsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<PlatformMetrics | null>(null);
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
      setError(null);

      const res = await fetch("/api/admin/analytics");
      if (!res.ok) {
        throw new Error("Failed to fetch platform analytics");
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

  if (status === "loading" || (loading && !data)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const maxPeakCount = data ? Math.max(...data.peakHoursHistogram.map((h) => h.count), 1) : 1;

  return (
    <div className="space-y-6 select-none text-left">
      <div>
        <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">Platform-Wide Analytics</h1>
        <p className="text-xs text-muted-foreground mt-1 font-semibold">Aggregated statistics across all tenant queues</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-4 font-semibold">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Business Summary Counts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-2 shadow-sm text-foreground">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Businesses</span>
              <span className="text-3xl font-heading font-extrabold block">{data.totalBusinesses}</span>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 space-y-2 shadow-sm text-foreground">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Active Businesses</span>
              <span className="text-3xl font-heading font-extrabold text-emerald-700 block">{data.activeBusinesses}</span>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 space-y-2 shadow-sm text-foreground">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Suspended Businesses</span>
              <span className="text-3xl font-heading font-extrabold text-amber-700 block">{data.suspendedBusinesses}</span>
            </div>
          </div>

          {/* Core Analytics Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-2 shadow-sm text-foreground">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Served Today</span>
              <span className="text-3xl font-heading font-extrabold block">{data.servedTodayCount}</span>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-2 shadow-sm text-foreground">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Avg Wait Time</span>
              <span className="text-3xl font-heading font-extrabold block">{data.averageWaitTimeMin} min</span>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-2 shadow-sm text-foreground">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Overall Cancellation Rate</span>
              <span className="text-3xl font-heading font-extrabold block">{data.cancellationRate}%</span>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-2 shadow-sm text-foreground">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Avg Service Duration</span>
              <span className="text-3xl font-heading font-extrabold block">{data.averageServiceDurationMin} min</span>
            </div>
          </div>

          {/* Peak Hours Histogram */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 text-foreground">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider font-heading">Peak Checking Hours (UTC)</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Distribution of check-in times across all queues</p>
            </div>

            <div className="flex items-end justify-between gap-1.5 h-48 pt-4 border-b border-border">
              {data.peakHoursHistogram.map((slot) => {
                const percent = (slot.count / maxPeakCount) * 100;
                return (
                  <div key={slot.hour} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip */}
                    <span className="absolute bottom-full mb-2 bg-card text-[9px] font-bold text-foreground px-2 py-1 rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-25 shadow-md">
                      {slot.count} check-ins
                    </span>
                    {/* Bar */}
                    <div
                      style={{ height: `${percent}%` }}
                      className="w-full bg-muted hover:bg-primary/80 transition-colors rounded-t cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>

            {/* Hour Labels */}
            <div className="flex justify-between text-[9px] text-muted-foreground font-bold font-mono px-1">
              <span>00:00</span>
              <span>04:00</span>
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
              <span>23:00</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
