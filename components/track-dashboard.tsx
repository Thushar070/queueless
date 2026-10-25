"use client";

import { useState, useEffect, useCallback } from "react";
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
}

export default function TrackDashboard({
  initialEntry,
}: TrackDashboardProps) {
  const [entry, setEntry] = useState<SerializedEntry>(initialEntry);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Poll the authoritative API so updates use the same access checks as the rest of the app.
  useEffect(() => {
    // Poll every 5s if active or waiting
    if (entry.status === "COMPLETED" || entry.status === "CANCELLED" || entry.status === "SKIPPED") {
      return;
    }

    const interval = setInterval(async () => {
      await refetchEntry();
    }, 5000);

    return () => clearInterval(interval);
  }, [entry.status, refetchEntry]);

  // Refresh when the browser reconnects or the customer returns to the tab.
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

      {/* Subtle minimalist background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md md:max-w-lg bg-card border border-border rounded-2xl p-8 shadow-sm text-center space-y-6 z-10 relative">
        <div>
          <span className="text-[10px] font-heading font-bold uppercase tracking-wider px-3 py-1 rounded-full border inline-flex items-center gap-1.5 text-muted-foreground border-border bg-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            Auto-refresh · every 5 seconds
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
