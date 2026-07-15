"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { QueueEntryStatus } from "@prisma/client";
import {
  QrCode,
  Volume2,
  Trash2,
  Play,
  Check,
  ArrowUp,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

interface SerializedEntry {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  position: number;
  status: QueueEntryStatus;
  joinedAt: string;
  calledAt: string | null;
  servingAt: string | null;
}

interface StaffQueueDashboardProps {
  queueId: string;
  queueName: string;
  initialEntries: SerializedEntry[];
  supabaseUrl: string;
  supabaseAnonKey: string;
  qrCodeUrl?: string | null;
}

export default function StaffQueueDashboard({
  queueId,
  queueName,
  initialEntries,
  supabaseUrl,
  supabaseAnonKey,
  qrCodeUrl
}: StaffQueueDashboardProps) {
  const [entries, setEntries] = useState<SerializedEntry[]>(initialEntries);
  const [isMutating, setIsMutating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Settings states connected to database values
  const [targetTime, setTargetTime] = useState(10);
  const [maxCapacity, setMaxCapacity] = useState(50);
  const [isAutoCall, setIsAutoCall] = useState(true);
  const [isNotifyBottleneck, setIsNotifyBottleneck] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(true);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/queues/${queueId}/entries`);
      if (!res.ok) throw new Error("Failed to fetch queue entries");
      const data = await res.json();
      setEntries(data);
    } catch (err: unknown) {
      console.error("Dashboard reload failed:", err);
    }
  }, [queueId]);

  // Load initial settings parameters
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/queues`);
        if (!res.ok) return;
        const queues = await res.json();
        const active = queues.find((q: { id: string }) => q.id === queueId);
        if (active) {
          setTargetTime(active.avgServiceTimeMin);
          setMaxCapacity(active.maxCapacity ?? 50);
          setIsQueueOpen(active.status === "OPEN");
        }
      } catch (err) {
        console.error("Failed to load queue settings:", err);
      }
    };
    fetchSettings();
  }, [queueId]);

  // Save Settings changes dynamically
  const saveSettings = async (updates: { avgServiceTimeMin?: number; maxCapacity?: number }) => {
    try {
      await fetch(`/api/queues/${queueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error("Settings update failed:", err);
    }
  };

  // Toggle Admissions (Pause / Resume)
  const handleToggleAdmissions = async () => {
    setIsMutating("toggle-admissions");
    setError(null);
    try {
      const res = await fetch(`/api/queues/${queueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });
      if (!res.ok) throw new Error("Failed to toggle admissions status");
      const data = await res.json();
      setIsQueueOpen(data.status === "OPEN");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Toggle admissions failed");
    } finally {
      setIsMutating(null);
    }
  };

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const channel = supabase
      .channel(`queue-entries-${queueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "QueueEntry",
          filter: `queueId=eq.${queueId}`,
        },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queueId, supabaseUrl, supabaseAnonKey, fetchEntries]);

  // Polling Fallback (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEntries();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchEntries]);

  const handleAction = async (actionUrl: string, entryId: string | null = null, actionName: string) => {
    const mutationKey = entryId ? `${actionName}-${entryId}` : actionName;
    setIsMutating(mutationKey);
    setError(null);
    try {
      const res = await fetch(actionUrl, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to execute ${actionName}`);
      }

      await fetchEntries();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsMutating(null);
    }
  };

  // Sort and filter entries
  const servingEntries = entries.filter((e) => e.status === QueueEntryStatus.SERVING);
  const calledEntries = entries.filter((e) => e.status === QueueEntryStatus.CALLED);
  const waitingEntries = entries.filter((e) => e.status === QueueEntryStatus.WAITING);

  // Top active items to render as detailed cards
  const topActiveEntries = [...servingEntries, ...calledEntries, ...waitingEntries.slice(0, 1)];
  const remainingWaiting = waitingEntries.slice(1);

  return (
    <div className="space-y-8 select-none">
      {/* Dashboard Top Header Control Board */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card border border-border p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-heading font-extrabold tracking-tight text-foreground">{queueName}</h1>
          <p className="text-xs text-muted-foreground mt-1">Live staff operations control board</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowQrModal(true)}
            className="w-full md:w-auto bg-white hover:bg-muted border border-border text-foreground font-semibold px-4 py-2.5 rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <QrCode className="size-4 text-muted-foreground" />
            Show QR Code
          </button>

          <button
            onClick={() => handleAction(`/api/queues/${queueId}/call-next`, null, "call-next")}
            disabled={isMutating !== null || waitingEntries.length === 0}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-bold px-6 py-2.5 rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {isMutating === "call-next" ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                Calling...
              </>
            ) : (
              "Call Next Customer"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs px-4 py-3 rounded-lg text-left">
          {error}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: QUEUE FLOW */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-sm font-heading font-bold text-foreground uppercase tracking-widest">
              Queue Flow
            </h2>
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Updates Active
            </span>
          </div>

          <div className="space-y-4">
            {topActiveEntries.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-xs">
                No active tickets in queue. Click &quot;Call Next Customer&quot; above to serve.
              </div>
            ) : (
              topActiveEntries.map((entry) => {
                const isServing = entry.status === QueueEntryStatus.SERVING;
                const isCalled = entry.status === QueueEntryStatus.CALLED;
                
                // Set badge styling depending on state
                let badgeClass = "text-zinc-650 bg-zinc-100 border-zinc-200";
                if (isServing) badgeClass = "text-emerald-750 bg-emerald-50 border-emerald-500/10";
                if (isCalled) badgeClass = "text-amber-700 bg-amber-50 border-amber-500/10";

                // Set token background color
                let tokenBg = "bg-muted text-muted-foreground border-border";
                if (isServing) tokenBg = "bg-primary text-primary-foreground border-transparent";
                if (isCalled) tokenBg = "bg-zinc-500 text-white border-transparent";

                return (
                  <div key={entry.id} className="bg-card border border-border p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      {/* Token Badge */}
                      <div className={`w-16 h-16 border rounded-xl flex flex-col items-center justify-center shrink-0 ${tokenBg}`}>
                        <span className="text-[9px] font-heading font-bold tracking-widest opacity-60">TOKEN</span>
                        <span className="text-xl font-heading font-extrabold tracking-tight">A{entry.position}</span>
                      </div>

                      {/* Customer Info details */}
                      <div className="text-left space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-heading font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${badgeClass}`}>
                            {entry.status}
                          </span>
                          {isServing && <span className="text-[10px] text-muted-foreground">Counter 04</span>}
                          {isCalled && <span className="text-[10px] text-muted-foreground">Waiting at entrance</span>}
                        </div>
                        <h4 className="text-base font-bold text-foreground leading-tight">{entry.customerName}</h4>
                        <p className="text-xs text-muted-foreground">
                          {isServing && "Started 4m 12s ago"}
                          {isCalled && "Called 1m 45s ago"}
                          {!isServing && !isCalled && "Joined 12m ago • Est. wait: 2m"}
                        </p>
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-border pt-3 sm:pt-0">
                      {isServing && (
                        <>
                          <button
                            onClick={() => handleAction(`/api/entries/${entry.id}/complete`, entry.id, "complete")}
                            disabled={isMutating !== null}
                            className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Check className="size-3.5" />
                            {isMutating === `complete-${entry.id}` ? "Completing..." : "Complete"}
                          </button>
                        </>
                      )}

                      {isCalled && (
                        <>
                          <button
                            onClick={() => handleAction(`/api/entries/${entry.id}/serving`, entry.id, "serving")}
                            disabled={isMutating !== null}
                            className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Play className="size-3.5" />
                            {isMutating === `serving-${entry.id}` ? "Serving..." : "Start Service"}
                          </button>
                          <button
                            onClick={() => handleAction(`/api/entries/${entry.id}/cancel`, entry.id, "cancel")}
                            disabled={isMutating !== null}
                            className="flex-1 sm:flex-none bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            {isMutating === `cancel-${entry.id}` ? "Cancelling..." : "No Show"}
                          </button>
                        </>
                      )}

                      {!isServing && !isCalled && (
                        <>
                          <button
                            onClick={() => handleAction(`/api/entries/${entry.id}/call`, entry.id, "call")}
                            disabled={isMutating !== null}
                            className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Volume2 className="size-3.5" />
                            {isMutating === `call-${entry.id}` ? "Calling..." : "Call Next"}
                          </button>
                          <button
                            onClick={() => handleAction(`/api/entries/${entry.id}/cancel`, entry.id, "cancel")}
                            disabled={isMutating !== null}
                            className="p-2 bg-white hover:bg-red-50 text-destructive border border-destructive/20 hover:border-destructive/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Remaining Waiting Rows */}
          {remainingWaiting.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden mt-6 shadow-sm">
              <div className="px-5 py-4 border-b border-border bg-muted/20 text-left">
                <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-wider">Remaining Waiting Line</span>
              </div>
              <div className="divide-y divide-border">
                {remainingWaiting.map((entry) => (
                  <div key={entry.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-left">
                      <span className="w-8 h-8 rounded-lg bg-muted text-muted-foreground border border-border flex items-center justify-center font-bold text-xs">
                        A{entry.position}
                      </span>
                      <div>
                        <span className="text-sm font-bold text-foreground block">{entry.customerName}</span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">{entry.customerPhone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAction(`/api/entries/${entry.id}/call`, entry.id, "call")}
                        disabled={isMutating !== null}
                        className="bg-white hover:bg-muted border border-border text-foreground text-xs font-semibold py-1 px-3 rounded-lg transition-colors cursor-pointer"
                      >
                        Call
                      </button>
                      <button
                        onClick={() => handleAction(`/api/entries/${entry.id}/skip`, entry.id, "skip")}
                        disabled={isMutating !== null}
                        className="bg-white hover:bg-muted border border-border text-foreground text-xs font-semibold py-1 px-3 rounded-lg transition-colors cursor-pointer"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => handleAction(`/api/entries/${entry.id}/move-to-top`, entry.id, "move-to-top")}
                        disabled={isMutating !== null}
                        className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold py-1 px-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <ArrowUp className="size-3" /> Top
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: METRICS & CONTROLS */}
        <div className="space-y-6">
          
          {/* Served Today Metric Card */}
          <div className="bg-card border border-border p-6 rounded-2xl text-left shadow-sm">
            <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">Served Today</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl font-heading font-extrabold tracking-tight text-foreground">142</span>
              <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <TrendingUp className="size-3" /> +12%
              </span>
            </div>
          </div>

          {/* Average Wait & Active Length */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border p-5 rounded-2xl text-left shadow-sm">
              <span className="text-[9px] font-heading font-bold text-muted-foreground uppercase tracking-wider block">Avg Wait</span>
              <span className="text-2xl font-heading font-bold text-foreground block mt-1">08:42</span>
            </div>
            <div className="bg-card border border-border p-5 rounded-2xl text-left shadow-sm">
              <span className="text-[9px] font-heading font-bold text-muted-foreground uppercase tracking-wider block">Active Length</span>
              <span className="text-2xl font-heading font-bold text-foreground block mt-1">{entries.length}</span>
            </div>
          </div>

          {/* Load Monitor (Dark styled accent card) */}
          <div className="bg-black border border-zinc-950 text-white p-6 rounded-2xl text-left relative overflow-hidden shadow-md">
            <div className="absolute top-4 right-4 text-zinc-700">
              <div className="flex items-end gap-0.5 h-6">
                <div className="w-1 bg-zinc-700 h-2 rounded-sm" />
                <div className="w-1 bg-zinc-700 h-3 rounded-sm" />
                <div className="w-1 bg-zinc-700 h-4 rounded-sm" />
                <div className="w-1 bg-zinc-650 h-5 rounded-sm" />
                <div className="w-1 bg-white h-6 rounded-sm" />
              </div>
            </div>
            <span className="text-[10px] font-heading font-bold text-zinc-400 uppercase tracking-widest">Load Monitor</span>
            <span className="text-4xl font-heading font-extrabold tracking-tight block mt-2">92%</span>
            <span className="text-[10px] text-zinc-550 block mt-1">Peak efficiency threshold reached</span>
          </div>

          {/* Queue Settings */}
          <div className="bg-card border border-border p-6 rounded-2xl text-left space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground font-heading">Queue Settings</h3>
            <hr className="border-border" />
            
            {/* Target service time slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>Target Service Time</span>
                <span className="font-bold">{targetTime}:00m</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={targetTime}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setTargetTime(val);
                  saveSettings({ avgServiceTimeMin: val });
                }}
                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-black"
              />
            </div>

            {/* Max Capacity slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>Max Queue Capacity</span>
                <span className="font-bold">{maxCapacity}</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={maxCapacity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setMaxCapacity(val);
                  saveSettings({ maxCapacity: val });
                }}
                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-black"
              />
            </div>

            {/* Custom checkboxes / toggles */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-foreground font-medium">Auto-call next on completion</span>
                <button
                  type="button"
                  onClick={() => setIsAutoCall(!isAutoCall)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    isAutoCall ? "bg-black" : "bg-muted"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all ${
                    isAutoCall ? "right-0.75" : "left-0.75"
                  }`} />
                </button>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-foreground font-medium">Notify staff on bottleneck</span>
                <button
                  type="button"
                  onClick={() => setIsNotifyBottleneck(!isNotifyBottleneck)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    isNotifyBottleneck ? "bg-black" : "bg-muted"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all ${
                    isNotifyBottleneck ? "right-0.75" : "left-0.75"
                  }`} />
                </button>
              </label>
            </div>
          </div>

          {/* Emergency Overflow Controls */}
          <div className="border border-dashed border-destructive/30 rounded-2xl p-6 space-y-4 text-center">
            <span className="text-xs italic font-medium text-foreground/80 block">Emergency Overflow Controls</span>
            
            <button
              onClick={handleToggleAdmissions}
              disabled={isMutating === "toggle-admissions"}
              className="w-full bg-destructive hover:bg-destructive/90 disabled:bg-muted text-destructive-foreground font-bold py-2.5 rounded-lg transition-all text-xs tracking-wider uppercase cursor-pointer"
            >
              {isMutating === "toggle-admissions"
                ? "Processing..."
                : isQueueOpen
                ? "Pause Admissions"
                : "Resume Admissions"}
            </button>

            <button
              onClick={() => alert("Broadcast update message triggers Twilio alerts overlay.")}
              className="w-full bg-white hover:bg-muted border border-border text-foreground font-bold py-2.5 rounded-lg transition-all text-xs tracking-wider uppercase cursor-pointer shadow-sm"
            >
              Broadcast Update
            </button>
          </div>
        </div>

      </div>

      {/* QR Code Modal Overlay */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 text-center space-y-6 shadow-2xl relative">
            <h3 className="text-lg font-heading font-extrabold text-foreground">Queue Registration QR</h3>
            <div className="flex justify-center border border-border p-4 bg-white rounded-xl">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Queue QR Code" className="size-48" />
              ) : (
                <div className="size-48 flex items-center justify-center text-muted-foreground text-xs">
                  No QR Code generated
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Place this QR code at your business entrance. Customers can scan to join the virtual line instantly.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowQrModal(false)}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
