"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { QueueEntryStatus } from "@prisma/client";

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
}

export default function StaffQueueDashboard({
  queueId,
  queueName,
  initialEntries,
  supabaseUrl,
  supabaseAnonKey,
}: StaffQueueDashboardProps) {
  const [entries, setEntries] = useState<SerializedEntry[]>(initialEntries);
  const [isMutating, setIsMutating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // 1. Supabase Realtime Subscription
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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to Supabase Realtime for queue: ${queueId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queueId, supabaseUrl, supabaseAnonKey, fetchEntries]);

  // 2. Polling Fallback (every 10 seconds)
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

      // Optimistic state sync after action completes
      await fetchEntries();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsMutating(null);
    }
  };

  // Filter entries into their corresponding dashboard states
  const servingEntries = entries.filter((e) => e.status === QueueEntryStatus.SERVING);
  const calledEntries = entries.filter((e) => e.status === QueueEntryStatus.CALLED);
  const waitingEntries = entries.filter((e) => e.status === QueueEntryStatus.WAITING);

  return (
    <div className="space-y-6">
      {/* Dashboard Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">{queueName}</h1>
          <p className="text-sm text-slate-400 mt-1">Live staff operations control board</p>
        </div>

        <div>
          <button
            onClick={() => handleAction(`/api/queues/${queueId}/call-next`, null, "call-next")}
            disabled={isMutating !== null || waitingEntries.length === 0}
            className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-800 disabled:to-purple-800 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {isMutating === "call-next" ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-slate-100" />
                Calling...
              </>
            ) : (
              "Call Next Customer"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg text-left">
          {error}
        </div>
      )}

      {/* Tri-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: CURRENTLY SERVING */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              Serving ({servingEntries.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {servingEntries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-8">
                No customer currently being served
              </div>
            ) : (
              servingEntries.map((entry) => (
                <div key={entry.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
                  <div className="text-left">
                    <span className="text-sm font-bold text-slate-200 block">{entry.customerName}</span>
                    <span className="text-xs text-slate-500 block mt-0.5">{entry.customerPhone}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(`/api/entries/${entry.id}/complete`, entry.id, "complete")}
                      disabled={isMutating !== null}
                      className="flex-1 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      {isMutating === `complete-${entry.id}` ? "Completing..." : "Complete"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: CALLED CUSTOMERS */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              Called ({calledEntries.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {calledEntries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-8">
                No customer called yet
              </div>
            ) : (
              calledEntries.map((entry) => (
                <div key={entry.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
                  <div className="text-left">
                    <span className="text-sm font-bold text-slate-200 block">{entry.customerName}</span>
                    <span className="text-xs text-slate-500 block mt-0.5">{entry.customerPhone}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(`/api/entries/${entry.id}/serving`, entry.id, "serving")}
                      disabled={isMutating !== null}
                      className="flex-1 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      {isMutating === `serving-${entry.id}` ? "Serving..." : "Serve"}
                    </button>
                    <button
                      onClick={() => handleAction(`/api/entries/${entry.id}/cancel`, entry.id, "cancel")}
                      disabled={isMutating !== null}
                      className="flex-1 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      {isMutating === `cancel-${entry.id}` ? "Cancelling..." : "Cancel"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: WAITING CUSTOMERS */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              Waiting ({waitingEntries.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {waitingEntries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-8">
                Waiting line is empty
              </div>
            ) : (
              waitingEntries.map((entry) => (
                <div key={entry.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="text-left">
                      <span className="text-sm font-bold text-slate-200 block">{entry.customerName}</span>
                      <span className="text-xs text-slate-500 block mt-0.5">{entry.customerPhone}</span>
                    </div>
                    <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      #{entry.position}
                    </span>
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleAction(`/api/entries/${entry.id}/call`, entry.id, "call")}
                      disabled={isMutating !== null}
                      className="flex-1 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-400 text-[10px] font-semibold py-1.5 rounded-lg transition-colors cursor-pointer min-w-[50px]"
                    >
                      {isMutating === `call-${entry.id}` ? "Calling..." : "Call"}
                    </button>
                    <button
                      onClick={() => handleAction(`/api/entries/${entry.id}/skip`, entry.id, "skip")}
                      disabled={isMutating !== null}
                      className="flex-1 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/35 text-slate-300 text-[10px] font-semibold py-1.5 rounded-lg transition-colors cursor-pointer min-w-[50px]"
                    >
                      {isMutating === `skip-${entry.id}` ? "Skipping..." : "Skip"}
                    </button>
                    <button
                      onClick={() => handleAction(`/api/entries/${entry.id}/cancel`, entry.id, "cancel")}
                      disabled={isMutating !== null}
                      className="flex-1 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 text-[10px] font-semibold py-1.5 rounded-lg transition-colors cursor-pointer min-w-[50px]"
                    >
                      {isMutating === `cancel-${entry.id}` ? "Leaving..." : "Cancel"}
                    </button>
                    {entry.position > 1 && (
                      <button
                        onClick={() => handleAction(`/api/entries/${entry.id}/move-to-top`, entry.id, "move-to-top")}
                        disabled={isMutating !== null}
                        className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        {isMutating === `move-to-top-${entry.id}` ? "Moving..." : "⚡ Move to Top"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
