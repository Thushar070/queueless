"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { QueueEntryStatus } from "@prisma/client";
import ThemeToggle from "./theme-toggle";

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
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-6 relative overflow-hidden select-none">
      {/* Theme Toggle Container in top right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      {/* Sleek light grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      {/* Subtle minimalist background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md md:max-w-lg bg-card border border-border rounded-2xl p-8 shadow-sm text-center space-y-6 z-10 relative">
        <div>
          <span className={`text-[10px] font-heading font-bold uppercase tracking-wider px-3 py-1 rounded-full border inline-flex items-center gap-1.5 transition-colors ${
            isConnected ? "text-emerald-700 border-emerald-500/20 bg-emerald-50" : "text-muted-foreground border-border bg-muted"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
            {isConnected ? "Live Socket" : "Polling fallback"}
          </span>
          <h1 className="text-3xl font-heading font-extrabold text-foreground mt-4 tracking-tight">
            {entry.queue.business.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{entry.queue.name}</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs px-4 py-3 rounded-lg text-left">
            {error}
          </div>
        )}

        {/* Dynamic Position Card */}
        <div className="bg-muted/30 border border-border rounded-xl p-8 space-y-6">
          <div>
            <span className="text-[10px] font-heading text-muted-foreground block font-bold uppercase tracking-wider mb-2">Ticket Owner</span>
            <span className="text-xl font-bold text-foreground">{entry.customerName}</span>
          </div>

          <div className="border-t border-border pt-6">
            {entry.status === "WAITING" ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-heading text-muted-foreground block font-bold uppercase tracking-wider">Your Position</span>
                  <span className="text-6xl font-heading font-extrabold text-foreground block mt-2 tracking-tight">
                    #{entry.position}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Est. Wait Time: <span className="font-bold text-foreground">{estWaitTime} mins</span>
                </div>
              </div>
            ) : entry.status === "CALLED" ? (
              <div className="py-4 space-y-2">
                <span className="text-3xl font-heading font-bold text-emerald-600 block animate-bounce">👉 Your Turn!</span>
                <p className="text-sm text-muted-foreground">Please proceed to the counter or check-in desk immediately.</p>
              </div>
            ) : entry.status === "SERVING" ? (
              <div className="py-4 space-y-1">
                <span className="text-2xl font-heading font-bold text-foreground block">⚡ Being Served</span>
                <p className="text-sm text-muted-foreground">You are currently at the service counter.</p>
              </div>
            ) : entry.status === "COMPLETED" ? (
              <div className="py-4 space-y-1">
                <span className="text-xl font-heading font-bold text-emerald-600 block">✅ Completed</span>
                <p className="text-sm text-muted-foreground">Your service has been finished. Thank you!</p>
              </div>
            ) : entry.status === "SKIPPED" ? (
              <div className="py-4 space-y-1">
                <span className="text-xl font-heading font-bold text-amber-600 block">⚠️ Skipped</span>
                <p className="text-sm text-muted-foreground">You were skipped by the staff. Please speak to check-in.</p>
              </div>
            ) : (
              <div className="py-4 space-y-1">
                <span className="text-xl font-heading font-bold text-muted-foreground block">🛑 Cancelled</span>
                <p className="text-sm text-muted-foreground">This waiting ticket has been cancelled.</p>
              </div>
            )}
          </div>
        </div>

        {/* self-cancel button */}
        {entry.status === "WAITING" && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full bg-card hover:bg-destructive/10 disabled:bg-muted text-destructive disabled:text-muted-foreground border border-destructive/20 hover:border-destructive/40 text-xs font-semibold py-2.5 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            {isCancelling ? "Leaving Line..." : "Leave Virtual Line"}
          </button>
        )}

        {/* Info Notice */}
        <div className="border border-border bg-muted/40 rounded-xl p-4 text-[10px] text-muted-foreground leading-relaxed text-left">
          <p className="font-bold mb-1 text-foreground">ℹ️ QueueLess Live Refresh Info</p>
          This ticket tracking page is connected via live Supabase Realtime WebSockets. It will fall back to 10-second polling automatically if the connection is lost.
        </div>
      </div>
    </main>
  );
}
