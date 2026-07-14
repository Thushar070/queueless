"use client";

import { useState, useEffect } from "react";
import { QueueEntryStatus } from "@prisma/client";

interface SerializedEntry {
  id: string;
  customerName: string;
  position: number;
  status: QueueEntryStatus;
  joinedAt: string;
  trackingToken: string;
  queue: {
    name: string;
    avgServiceTimeMin: number;
    business: {
      name: string;
    };
  };
}

interface TrackDashboardProps {
  initialEntry: SerializedEntry;
}

export default function TrackDashboard({ initialEntry }: TrackDashboardProps) {
  const [entry, setEntry] = useState<SerializedEntry>(initialEntry);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for queue status updates every 10 seconds (as static reads / refreshes in Phase 3)
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/queues/status-check?token=${entry.trackingToken}`);
        if (!res.ok) return;
        const data = await res.json();
        if (active) {
          setEntry((prev) => ({ ...prev, ...data }));
        }
      } catch {
        // Silent catch for background polling
      }
    }, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [entry.trackingToken]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to leave the virtual line?")) {
      return;
    }
    setIsCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/entries/${entry.trackingToken}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to leave queue");
      }

      const updated = await res.json();
      setEntry((prev) => ({ ...prev, status: updated.status, position: 0 }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsCancelling(false);
    }
  };

  // Wait time calculation: (position - 1) * avgServiceTimeMin
  const estWaitTime = entry.position > 0 ? (entry.position - 1) * entry.queue.avgServiceTimeMin : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background glow elements */}
      <div className="absolute top-[-30%] left-[-20%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-30%] right-[-20%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl text-center space-y-6">
        <div>
          <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-full">
            Live Ticket Status
          </span>
          <h1 className="text-3xl font-extrabold text-slate-100 mt-4 tracking-tight">
            {entry.queue.business.name}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{entry.queue.name}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg text-left">
            {error}
          </div>
        )}

        {/* Dynamic Position Card */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-8 space-y-6">
          <div>
            <span className="text-xs text-slate-500 block font-semibold uppercase tracking-wider mb-2">Ticket Owner</span>
            <span className="text-xl font-bold text-slate-200">{entry.customerName}</span>
          </div>

          <div className="border-t border-slate-850/60 pt-6">
            {entry.status === "WAITING" ? (
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-500 block font-semibold uppercase tracking-wider">Your Position</span>
                  <span className="text-6xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent block mt-2">
                    #{entry.position}
                  </span>
                </div>
                <div className="text-sm text-slate-400">
                  Est. Wait Time: <span className="font-bold text-slate-200">{estWaitTime} mins</span>
                </div>
              </div>
            ) : entry.status === "CALLED" ? (
              <div className="py-4 space-y-2">
                <span className="text-3xl font-bold text-emerald-400 block animate-bounce">👉 Your Turn!</span>
                <p className="text-sm text-slate-400">Please proceed to the counter or check-in desk immediately.</p>
              </div>
            ) : entry.status === "SERVING" ? (
              <div className="py-4 space-y-1">
                <span className="text-2xl font-bold text-indigo-400 block">⚡ Being Served</span>
                <p className="text-sm text-slate-400">You are currently at the service counter.</p>
              </div>
            ) : entry.status === "COMPLETED" ? (
              <div className="py-4 space-y-1">
                <span className="text-xl font-bold text-emerald-500 block">✅ Completed</span>
                <p className="text-sm text-slate-400">Your service has been finished. Thank you!</p>
              </div>
            ) : entry.status === "SKIPPED" ? (
              <div className="py-4 space-y-1">
                <span className="text-xl font-bold text-amber-500 block">⚠️ Skipped</span>
                <p className="text-sm text-slate-400">You were skipped by the staff. Please speak to check-in.</p>
              </div>
            ) : (
              <div className="py-4 space-y-1">
                <span className="text-xl font-bold text-slate-500 block">🛑 Cancelled</span>
                <p className="text-sm text-slate-400">This waiting ticket has been cancelled.</p>
              </div>
            )}
          </div>
        </div>

        {/* self-cancel button */}
        {entry.status === "WAITING" && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full bg-red-500/10 hover:bg-red-500/20 disabled:bg-red-500/5 text-red-400 disabled:text-red-400/50 border border-red-500/20 text-xs font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            {isCancelling ? "Leaving Line..." : "Leave Virtual Line"}
          </button>
        )}

        {/* Phase 3 Notice */}
        <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-xl p-4 text-[10px] text-indigo-400/80 leading-relaxed text-left">
          <p className="font-bold mb-1">ℹ️ Phase 3 Architecture Note</p>
          This ticket tracking page is a client component which updates via background polling (refresh) every 10 seconds. Realtime WebSockets updates via Supabase Subscriptions are deferred to Phase 4.
        </div>
      </div>
    </main>
  );
}
