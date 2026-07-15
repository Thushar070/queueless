"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AnalyticsData {
  servedTodayCount: number;
  averageWaitTimeMin: number;
  activeQueueLengths: Array<{ queueId: string; queueName: string; length: number }>;
  cancellationRate: number;
  peakHoursHistogram: Array<{ hour: number; count: number }>;
  averageServiceDurationMin: number;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
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
      await Promise.resolve();
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAnalytics();
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold px-4 py-2 rounded-lg hover:text-white transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const maxHistogramCount = data ? Math.max(...data.peakHoursHistogram.map((h) => h.count), 1) : 1;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden select-none">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-white tracking-tight">
            QueueLess
          </Link>
          <nav className="hidden md:flex gap-4">
            <Link href="/dashboard/queues" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Queues
            </Link>
            <Link href="/dashboard/qr-codes" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              QR Codes
            </Link>
            <Link href="/dashboard/analytics" className="text-sm font-semibold text-white transition-colors">
              Analytics
            </Link>
            <Link href="/dashboard/audit-logs" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Audit Logs
            </Link>
            {session?.user?.role === "BUSINESS_OWNER" && (
              <>
                <Link href="/dashboard/staff" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                  Staff
                </Link>
                <Link href="/dashboard/settings" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                  Settings
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold px-4 py-2 rounded-lg hover:text-white transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 z-10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Real-time metrics, historical trends, and queue statistics</p>
        </div>

        {/* Primary KPI Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Customers Served Today */}
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Served Today</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{data?.servedTodayCount ?? 0}</span>
              <span className="text-zinc-500 text-sm">customers</span>
            </div>
            <p className="text-xs text-zinc-600 mt-2">Completed entries since UTC midnight</p>
          </div>

          {/* Cancellation Rate */}
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cancellation Rate</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{data?.cancellationRate ?? 0}%</span>
            </div>
            <p className="text-xs text-zinc-600 mt-2">Cancelled ÷ terminal-state entries</p>
          </div>

          {/* Average Wait Time */}
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Avg Wait Time</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{data?.averageWaitTimeMin ?? 0}</span>
              <span className="text-zinc-500 text-sm">min</span>
            </div>
            <p className="text-xs text-zinc-600 mt-2">Time from join to called by staff</p>
          </div>

          {/* Average Service Duration */}
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Avg Service Duration</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{data?.averageServiceDurationMin ?? 0}</span>
              <span className="text-zinc-500 text-sm">min</span>
            </div>
            <p className="text-xs text-zinc-600 mt-2">Time from serving start to completion</p>
          </div>
        </div>

        {/* Secondary Charts / Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Queue Lengths */}
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 flex flex-col col-span-1">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Active Queue Lengths</span>
            {data?.activeQueueLengths && data.activeQueueLengths.length > 0 ? (
              <div className="space-y-4 flex-1">
                {data.activeQueueLengths.map((q) => (
                  <div key={q.queueId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-300 font-medium">{q.queueName}</span>
                      <span className="text-white font-semibold font-mono">{q.length} waiting</span>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-white h-full transition-all duration-500 rounded-full" 
                        style={{ width: `${Math.min((q.length / 20) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm py-8">
                No active queues found
              </div>
            )}
          </div>

          {/* Peak Hours Histogram */}
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 flex flex-col col-span-1 lg:col-span-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Peak Joining Hours (UTC)</span>
            <div className="flex-1 flex items-end justify-between gap-1.5 h-64 pt-6 pb-2 border-b border-zinc-900">
              {data?.peakHoursHistogram.map((h) => {
                const pct = (h.count / maxHistogramCount) * 100;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-zinc-900 text-white text-[10px] py-1 px-2 rounded border border-zinc-800 pointer-events-none whitespace-nowrap z-20 font-mono shadow-md">
                      {h.count} joins at {String(h.hour).padStart(2, "0")}:00
                    </div>
                    {/* Bar */}
                    <div 
                      className="w-full bg-zinc-800 hover:bg-white rounded-t transition-colors duration-200" 
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            {/* X-Axis labels */}
            <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-2 px-1">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
