"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      await Promise.resolve();
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAnalytics();
    }
  }, [status]);

  if (status === "loading" || (loading && !data)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
      </div>
    );
  }

  const maxPeakCount = data ? Math.max(...data.peakHoursHistogram.map((h) => h.count), 1) : 1;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden select-none">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-xl font-bold text-white tracking-tight">
            QueueLess Admin
          </Link>
          <nav className="hidden md:flex gap-4">
            <Link href="/admin" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Overview
            </Link>
            <Link href="/admin/businesses" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Businesses
            </Link>
            <Link href="/admin/analytics" className="text-sm font-semibold text-white border-b-2 border-white pb-1">
              Analytics
            </Link>
            <Link href="/admin/audit-logs" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Audit Logs
            </Link>
          </nav>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold px-4 py-2 rounded-lg hover:text-white transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-6 z-10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform-Wide Analytics</h1>
          <p className="text-xs text-zinc-400 mt-1">Aggregated statistics across all tenant queues</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Business Summary Counts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-2 shadow-xl">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Total Businesses</span>
                <span className="text-3xl font-extrabold text-white block">{data.totalBusinesses}</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-2 shadow-xl">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Active Businesses</span>
                <span className="text-3xl font-extrabold text-emerald-400 block">{data.activeBusinesses}</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-2 shadow-xl">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Suspended Businesses</span>
                <span className="text-3xl font-extrabold text-amber-400 block">{data.suspendedBusinesses}</span>
              </div>
            </div>

            {/* Core Analytics Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-2 shadow-xl">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Served Today</span>
                <span className="text-3xl font-extrabold text-white block">{data.servedTodayCount}</span>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-2 shadow-xl">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Avg Wait Time</span>
                <span className="text-3xl font-extrabold text-white block">{data.averageWaitTimeMin} min</span>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-2 shadow-xl">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Overall Cancellation Rate</span>
                <span className="text-3xl font-extrabold text-white block">{data.cancellationRate}%</span>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-2 shadow-xl">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Avg Service Duration</span>
                <span className="text-3xl font-extrabold text-white block">{data.averageServiceDurationMin} min</span>
              </div>
            </div>

            {/* Peak Hours Histogram */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Peak Checking Hours (UTC)</h3>
                <p className="text-[10px] text-zinc-450 mt-0.5">Distribution of check-in times across all queues</p>
              </div>

              <div className="flex items-end justify-between gap-1.5 h-48 pt-4 border-b border-zinc-900">
                {data.peakHoursHistogram.map((slot) => {
                  const percent = (slot.count / maxPeakCount) * 100;
                  return (
                    <div key={slot.hour} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <span className="absolute bottom-full mb-2 bg-zinc-900 text-[9px] font-bold text-white px-2 py-1 rounded border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-25">
                        {slot.count} check-ins
                      </span>
                      {/* Bar */}
                      <div
                        style={{ height: `${percent}%` }}
                        className="w-full bg-white/20 group-hover:bg-white/40 transition-colors rounded-t"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Hour Labels */}
              <div className="flex justify-between text-[9px] text-zinc-450 font-bold font-mono px-1">
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
      </main>
    </div>
  );
}
