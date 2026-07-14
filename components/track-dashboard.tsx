"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
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
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export default function TrackDashboard({
  initialEntry,
  supabaseUrl,
  supabaseAnonKey,
}: TrackDashboardProps) {
  const [entry, setEntry] = useState<SerializedEntry>(initialEntry);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(!!(supabaseUrl && supabaseAnonKey));

  // Authoritative server refetch of position/status
  const refetchEntry = useCallback(async () => {
    try {
      const res = await fetch(`/api/queues/status-check?token=${entry.trackingToken}`);
      if (!res.ok) return;
      const data = await res.json();
      setEntry((prev) => ({ ...prev, ...data }));
    } catch (err: unknown) {
      console.error("Dashboard reload failed:", err);
    }
  }, [entry.trackingToken]);

  // 1. Supabase Realtime WebSocket Subscription
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    let connected = false;

    // Timeout of 3s to declare socket connection failure/fallback
    const timeout = setTimeout(() => {
      if (!connected) {
        setIsConnected(false);
      }
    }, 3000);

    const channel = supabase
      .channel(`queue-entry-${entry.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "QueueEntry",
          filter: `id=eq.${entry.id}`,
        },
        (payload) => {
          if (payload.new) {
            const newRecord = payload.new as { position?: number | null; status?: QueueEntryStatus };
            setEntry((prev) => ({
              ...prev,
              position: typeof newRecord.position === "number" ? newRecord.position : prev.position,
              status: newRecord.status || prev.status,
            }));
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          connected = true;
          setIsConnected(true);
          clearTimeout(timeout);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [entry.id, supabaseUrl, supabaseAnonKey]);

  // 2. Poll fallback (every 10s) triggered if live socket is disconnected
  useEffect(() => {
    if (isConnected) return;

    const interval = setInterval(async () => {
      await refetchEntry();
    }, 10000);

    return () => clearInterval(interval);
  }, [isConnected, refetchEntry]);

  // 3. One-time authoritative refetch on browser reconnect or tab visibility regain
  useEffect(() => {
    const handleRefetch = () => {
      if (document.visibilityState === "visible") {
        refetchEntry();
      }
    };

    window.addEventListener("online", refetchEntry);
    document.addEventListener("visibilitychange", handleRefetch);

    return () => {
      window.removeEventListener("online", refetchEntry);
      document.removeEventListener("visibilitychange", handleRefetch);
    };
  }, [refetchEntry]);

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
          <span className={`text-[10px] uppercase tracking-wider font-bold bg-zinc-900 border px-3 py-1 rounded-full inline-flex items-center gap-1.5 transition-colors ${
            isConnected ? "text-emerald-450 border-emerald-500/20" : "text-zinc-400 border-zinc-800"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-550"}`} />
            {isConnected ? "Live Socket" : "Polling fallback"}
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
          This ticket tracking page is connected via live Supabase Realtime WebSockets. It will fall back to 10-second polling automatically if the connection is lost.
        </div>
      </div>
    </main>
  );
}
