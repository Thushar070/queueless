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
    <main className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-6 relative overflow-hidden select-none">
      {/* Sleek B&W grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      {/* Subtle minimalist background glows */}
      <div className="absolute top-[-30%] left-[-20%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-30%] right-[-20%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl p-8 backdrop-blur-md shadow-2xl text-center space-y-6 z-10 relative">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-300 font-bold bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
            Live Ticket Status
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-4 tracking-tight">
            {entry.queue.business.name}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{entry.queue.name}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg text-left">
            {error}
          </div>
        )}

        {/* Dynamic Position Card */}
        <div className="bg-black border border-zinc-900 rounded-xl p-8 space-y-6">
          <div>
            <span className="text-xs text-zinc-550 block font-semibold uppercase tracking-wider mb-2">Ticket Owner</span>
            <span className="text-xl font-bold text-zinc-200">{entry.customerName}</span>
          </div>

          <div className="border-t border-zinc-900 pt-6">
            {entry.status === "WAITING" ? (
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-zinc-550 block font-semibold uppercase tracking-wider">Your Position</span>
                  <span className="text-6xl font-extrabold text-white block mt-2">
                    #{entry.position}
                  </span>
                </div>
                <div className="text-sm text-zinc-400">
                  Est. Wait Time: <span className="font-bold text-white">{estWaitTime} mins</span>
                </div>
              </div>
            ) : entry.status === "CALLED" ? (
              <div className="py-4 space-y-2">
                <span className="text-3xl font-bold text-emerald-450 block animate-bounce">👉 Your Turn!</span>
                <p className="text-sm text-zinc-450">Please proceed to the counter or check-in desk immediately.</p>
              </div>
            ) : entry.status === "SERVING" ? (
              <div className="py-4 space-y-1">
                <span className="text-2xl font-bold text-zinc-200 block">⚡ Being Served</span>
                <p className="text-sm text-zinc-450">You are currently at the service counter.</p>
              </div>
            ) : entry.status === "COMPLETED" ? (
              <div className="py-4 space-y-1">
                <span className="text-xl font-bold text-emerald-500 block">✅ Completed</span>
                <p className="text-sm text-zinc-450">Your service has been finished. Thank you!</p>
              </div>
            ) : entry.status === "SKIPPED" ? (
              <div className="py-4 space-y-1">
                <span className="text-xl font-bold text-amber-500 block">⚠️ Skipped</span>
                <p className="text-sm text-zinc-450">You were skipped by the staff. Please speak to check-in.</p>
              </div>
            ) : (
              <div className="py-4 space-y-1">
                <span className="text-xl font-bold text-zinc-550 block">🛑 Cancelled</span>
                <p className="text-sm text-zinc-450">This waiting ticket has been cancelled.</p>
              </div>
            )}
          </div>
        </div>

        {/* self-cancel button */}
        {entry.status === "WAITING" && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full bg-red-600/10 hover:bg-red-600/20 disabled:bg-red-600/5 text-red-400 disabled:text-red-400/50 border border-red-500/20 text-xs font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            {isCancelling ? "Leaving Line..." : "Leave Virtual Line"}
          </button>
        )}

        {/* Info Notice */}
        <div className="border border-zinc-900 bg-zinc-950 rounded-xl p-4 text-[10px] text-zinc-450 leading-relaxed text-left">
          <p className="font-bold mb-1 text-zinc-350">ℹ️ QueueLess Live Refresh Info</p>
          This ticket tracking page is a client component which updates via background polling (refresh) every 10 seconds. Realtime WebSockets updates via Supabase Subscriptions are configured on the staff operations panel.
        </div>
      </div>
    </main>
  );
}
