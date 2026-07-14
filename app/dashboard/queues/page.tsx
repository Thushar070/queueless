"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createQueueSchema, CreateQueueInput } from "@/lib/validation/queue";
import Link from "next/link";

interface Queue {
  id: string;
  name: string;
  slug: string;
  status: "OPEN" | "CLOSED";
  avgServiceTimeMin: number;
  maxCapacity: number | null;
  workingHoursStart: string | null;
  workingHoursEnd: string | null;
  qrCodeUrl: string | null;
  createdAt: string;
}

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals/forms state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup using react-hook-form and zod validation
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createQueueSchema),
    defaultValues: {
      name: "",
      avgServiceTimeMin: 8,
      maxCapacity: null,
      workingHoursStart: "",
      workingHoursEnd: "",
    },
  });

  const fetchQueues = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const res = await fetch("/api/queues");
      if (!res.ok) {
        throw new Error("Failed to fetch queues");
      }
      const data = await res.json();
      setQueues(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/queues");
        if (!res.ok) {
          throw new Error("Failed to fetch queues");
        }
        const data = await res.json();
        if (active) {
          setQueues(data);
        }
      } catch (err: unknown) {
        if (active) {
          const message = err instanceof Error ? err.message : "An error occurred";
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const onCreateSubmit = async (data: CreateQueueInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create queue");
      }

      await fetchQueues(false);
      setIsCreateOpen(false);
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditSubmit = async (data: CreateQueueInput) => {
    if (!editingQueue) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/queues/${editingQueue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update queue");
      }

      await fetchQueues(false);
      setEditingQueue(null);
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (queueId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/queues/${queueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle queue status");
      }

      await fetchQueues(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    }
  };

  const deleteQueue = async (queueId: string) => {
    if (!confirm("Are you sure you want to delete this queue? This is a soft-delete and cannot be undone easily.")) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/queues/${queueId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete queue");
      }

      await fetchQueues(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    }
  };

  const startEdit = (queue: Queue) => {
    setEditingQueue(queue);
    setValue("name", queue.name);
    setValue("avgServiceTimeMin", queue.avgServiceTimeMin);
    setValue("maxCapacity", queue.maxCapacity);
    setValue("workingHoursStart", queue.workingHoursStart || "");
    setValue("workingHoursEnd", queue.workingHoursEnd || "");
  };

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
            <Link href="/dashboard/queues" className="text-sm font-semibold text-white border-b-2 border-white pb-1">
              Queues
            </Link>
            <Link href="/dashboard/qr-codes" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              QR Codes
            </Link>
          </nav>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-zinc-400 hover:text-white border border-zinc-800 rounded-lg px-3 py-1.5 transition-colors"
        >
          Back to Overview
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Manage Queues</h2>
            <p className="text-zinc-400 text-sm mt-1">Create, configure, and monitor your customer waiting lines</p>
          </div>
          <button
            onClick={() => {
              reset();
              setIsCreateOpen(true);
            }}
            className="bg-white hover:bg-zinc-200 text-black font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create Queue
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2 text-left">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
          </div>
        ) : queues.length === 0 ? (
          <div className="text-center py-20 bg-zinc-950 border border-zinc-900 rounded-2xl p-8">
            <svg className="w-12 h-12 mx-auto text-zinc-650 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-bold text-zinc-300">No queues active</h3>
            <p className="text-zinc-500 text-sm mt-1 mb-6">Create your first virtual queue to start serving walk-in customers.</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Configure First Queue
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {queues.map((queue) => (
              <div
                key={queue.id}
                className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 relative overflow-hidden transition-all hover:-translate-y-0.5 shadow-md flex flex-col justify-between"
              >
                {/* Upper Details */}
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-100">{queue.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">/q/{queue.slug}</p>
                    </div>
                    {/* Status Badge */}
                    <button
                      onClick={() => toggleStatus(queue.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer select-none transition-all ${
                        queue.status === "OPEN"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${queue.status === "OPEN" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                      {queue.status}
                    </button>
                  </div>

                  <div className="space-y-2 mt-4 text-sm text-slate-400">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Service Time:</span>
                      <span className="font-medium text-slate-200">{queue.avgServiceTimeMin} min / person</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max Capacity:</span>
                      <span className="font-medium text-slate-200">
                        {queue.maxCapacity !== null ? `${queue.maxCapacity} people` : "Unlimited"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hours:</span>
                      <span className="font-medium text-slate-200">
                        {queue.workingHoursStart && queue.workingHoursEnd
                          ? `${queue.workingHoursStart} - ${queue.workingHoursEnd}`
                          : "No restrictions"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action footer */}
                <div className="flex gap-2 mt-6 border-t border-slate-800/60 pt-4 relative z-10">
                  <button
                    onClick={() => startEdit(queue)}
                    className="flex-1 text-center bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-medium py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Edit Settings
                  </button>
                  <button
                    onClick={() => deleteQueue(queue.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-lg transition-colors cursor-pointer"
                    title="Delete Queue"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Overlay Modal for Create / Edit */}
      {/* Overlay Modal for Create / Edit */}
      {(isCreateOpen || editingQueue !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-2xl space-y-6 relative overflow-hidden">

            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {editingQueue ? "Edit Queue Configuration" : "Create New Virtual Queue"}
              </h3>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingQueue(null);
                  reset();
                }}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleSubmit(editingQueue ? onEditSubmit : onCreateSubmit)}
              className="space-y-4 text-left"
            >
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1" htmlFor="name">
                  Queue Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="Checkup Queue"
                  {...register("name")}
                  className="w-full bg-black border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1" htmlFor="avgServiceTimeMin">
                  Average Service Duration (Minutes per customer)
                </label>
                <input
                  id="avgServiceTimeMin"
                  type="number"
                  required
                  placeholder="8"
                  {...register("avgServiceTimeMin", { valueAsNumber: true })}
                  className="w-full bg-black border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                />
                {errors.avgServiceTimeMin && (
                  <p className="text-red-400 text-xs mt-1">{errors.avgServiceTimeMin.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1" htmlFor="maxCapacity">
                  Max Capacity / Capacity Limit (Optional)
                </label>
                <input
                  id="maxCapacity"
                  type="number"
                  placeholder="Unlimited (Leave blank)"
                  {...register("maxCapacity", {
                    setValueAs: (val) => (val === "" ? null : parseInt(val, 10)),
                  })}
                  className="w-full bg-black border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                />
                {errors.maxCapacity && (
                  <p className="text-red-400 text-xs mt-1">{errors.maxCapacity.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1" htmlFor="workingHoursStart">
                    Working Hours Start (HH:MM)
                  </label>
                  <input
                    id="workingHoursStart"
                    type="text"
                    placeholder="09:00"
                    {...register("workingHoursStart", {
                      setValueAs: (val) => (val === "" ? null : val),
                    })}
                    className="w-full bg-black border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                  {errors.workingHoursStart && (
                    <p className="text-red-400 text-xs mt-1">{errors.workingHoursStart.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1" htmlFor="workingHoursEnd">
                    Working Hours End (HH:MM)
                  </label>
                  <input
                    id="workingHoursEnd"
                    type="text"
                    placeholder="18:00"
                    {...register("workingHoursEnd", {
                      setValueAs: (val) => (val === "" ? null : val),
                    })}
                    className="w-full bg-black border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                  {errors.workingHoursEnd && (
                    <p className="text-red-400 text-xs mt-1">{errors.workingHoursEnd.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-850 disabled:text-zinc-650 text-black text-sm font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                {isSubmitting
                  ? "Saving Changes..."
                  : editingQueue
                  ? "Update Queue Settings"
                  : "Create Active Queue"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
