"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createQueueSchema, CreateQueueInput, UpdateQueueInput } from "@/lib/validation/queue";
import { z } from "zod";
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
  sectionId: string | null;
  createdAt: string;
}

interface Section {
  id: string;
  name: string;
}

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
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
      sectionId: "",
    },
  });

  const fetchQueues = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const [queuesRes, sectionsRes] = await Promise.all([
        fetch("/api/queues"),
        fetch("/api/sections"),
      ]);
      if (!queuesRes.ok) {
        throw new Error("Failed to fetch queues");
      }
      const queuesData = await queuesRes.json();
      setQueues(queuesData);

      if (sectionsRes.ok) {
        const sectionsData = await sectionsRes.json();
        setSections(sectionsData);
      }
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
        const [queuesRes, sectionsRes] = await Promise.all([
          fetch("/api/queues"),
          fetch("/api/sections"),
        ]);
        if (!queuesRes.ok) {
          throw new Error("Failed to fetch queues");
        }
        const queuesData = await queuesRes.json();
        let sectionsData = [];
        if (sectionsRes.ok) {
          sectionsData = await sectionsRes.json();
        }

        if (active) {
          setQueues(queuesData);
          setSections(sectionsData);
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

  const onCreateSubmit = async (data: z.infer<typeof createQueueSchema>) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...data,
        sectionId: data.sectionId || null,
      };
      const res = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const onEditSubmit = async (data: z.infer<typeof createQueueSchema>) => {
    if (!editingQueue) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...data,
        sectionId: data.sectionId || null,
      };
      const res = await fetch(`/api/queues/${editingQueue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    setValue("sectionId", queue.sectionId || "");
  };

  const renderQueueCard = (queue: Queue) => (
    <div
      key={queue.id}
      className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="text-left">
            <h3 className="font-heading font-extrabold text-lg text-foreground truncate max-w-[150px]" title={queue.name}>
              {queue.name}
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">/q/{queue.slug}</p>
          </div>
          {/* Status Badge */}
          <button
            onClick={() => toggleStatus(queue.id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer select-none transition-all ${
              queue.status === "OPEN"
                ? "bg-emerald-50 text-emerald-700 border-emerald-500/20 hover:bg-emerald-100"
                : "bg-amber-50 text-amber-700 border-amber-500/20 hover:bg-amber-100"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${queue.status === "OPEN" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            {queue.status}
          </button>
        </div>

        <div className="space-y-2 mt-4 text-xs font-medium text-muted-foreground text-left">
          <div className="flex justify-between">
            <span>Service Time:</span>
            <span className="font-bold text-foreground">{queue.avgServiceTimeMin} min / person</span>
          </div>
          <div className="flex justify-between">
            <span>Max Capacity:</span>
            <span className="font-bold text-foreground">
              {queue.maxCapacity !== null ? `${queue.maxCapacity} people` : "Unlimited"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Hours:</span>
            <span className="font-bold text-foreground">
              {queue.workingHoursStart && queue.workingHoursEnd
                ? `${queue.workingHoursStart} - ${queue.workingHoursEnd}`
                : "No restrictions"}
            </span>
          </div>
        </div>
      </div>

      {/* Card actions */}
      <div className="flex gap-2 mt-6 border-t border-border pt-4 relative z-10">
        <Link
          href={`/dashboard/queues/${queue.id}`}
          className="flex-1 text-center bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-sm"
        >
          Manage Live
        </Link>
         <button
          onClick={() => startEdit(queue)}
          className="bg-card border border-border text-foreground text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          Edit
        </button>
        <button
          onClick={() => deleteQueue(queue.id)}
          className="bg-card hover:bg-destructive/10 text-destructive border border-destructive/20 hover:border-destructive/40 p-2 rounded-lg transition-colors cursor-pointer"
          title="Delete Queue"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-left">
          <h2 className="text-3xl font-heading font-extrabold tracking-tight text-foreground font-heading">Manage Queues</h2>
          <p className="text-muted-foreground text-sm mt-1 font-medium">Create, configure, and monitor your customer waiting lines</p>
        </div>
        <button
          onClick={() => {
            reset();
            setIsCreateOpen(true);
          }}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-5 py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Create Queue
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2 text-left">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : queues.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl p-8">
          <svg className="w-12 h-12 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-bold text-foreground">No queues active</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-6">Create your first virtual queue to start serving walk-in customers.</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Configure First Queue
          </button>
        </div>
      ) : sections.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {queues.map((queue) => renderQueueCard(queue))}
        </div>
      ) : (
        <div className="space-y-12">
          {sections.map((section) => {
            const sectionQueues = queues.filter((q) => q.sectionId === section.id);
            if (sectionQueues.length === 0) return null;
            return (
              <div key={section.id} className="space-y-4">
                <div className="border-b border-border pb-2 text-left">
                  <h3 className="text-sm font-heading font-extrabold text-foreground uppercase tracking-wider">{section.name}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sectionQueues.map((queue) => renderQueueCard(queue))}
                </div>
              </div>
            );
          })}

          {/* Unassigned Queues */}
          {(() => {
            const unassignedQueues = queues.filter(
              (q) => !q.sectionId || !sections.some((s) => s.id === q.sectionId)
            );
            if (unassignedQueues.length === 0) return null;
            return (
              <div className="space-y-4">
                <div className="border-b border-border pb-2 text-left">
                  <h3 className="text-sm font-heading font-extrabold text-foreground uppercase tracking-wider">Unassigned Queues</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {unassignedQueues.map((queue) => renderQueueCard(queue))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Overlay Modal for Create / Edit */}
      {(isCreateOpen || editingQueue !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-extrabold text-foreground">
                {editingQueue ? "Edit Queue Configuration" : "Create New Virtual Queue"}
              </h3>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingQueue(null);
                  reset();
                }}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="name">
                  Queue Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="Checkup Queue"
                  {...register("name")}
                  className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="sectionId">
                  Queue Section (Optional visual grouping)
                </label>
                <select
                  id="sectionId"
                  {...register("sectionId")}
                  className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">No Section (Unassigned)</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
                {errors.sectionId && (
                  <p className="text-destructive text-xs mt-1">{errors.sectionId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="avgServiceTimeMin">
                  Average Service Duration (Minutes per customer)
                </label>
                <input
                  id="avgServiceTimeMin"
                  type="number"
                  required
                  placeholder="8"
                  {...register("avgServiceTimeMin", { valueAsNumber: true })}
                  className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
                {errors.avgServiceTimeMin && (
                  <p className="text-destructive text-xs mt-1">{errors.avgServiceTimeMin.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="maxCapacity">
                  Max Capacity / Capacity Limit (Optional)
                </label>
                <input
                  id="maxCapacity"
                  type="number"
                  placeholder="Unlimited (Leave blank)"
                  {...register("maxCapacity", {
                    setValueAs: (val) => (val === "" ? null : parseInt(val, 10)),
                  })}
                  className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
                {errors.maxCapacity && (
                  <p className="text-destructive text-xs mt-1">{errors.maxCapacity.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="workingHoursStart">
                    Working Hours Start (HH:MM)
                  </label>
                  <input
                    id="workingHoursStart"
                    type="text"
                    placeholder="09:00"
                    {...register("workingHoursStart", {
                      setValueAs: (val) => (val === "" ? null : val),
                    })}
                    className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                  />
                  {errors.workingHoursStart && (
                    <p className="text-destructive text-xs mt-1">{errors.workingHoursStart.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="workingHoursEnd">
                    Working Hours End (HH:MM)
                  </label>
                  <input
                    id="workingHoursEnd"
                    type="text"
                    placeholder="18:00"
                    {...register("workingHoursEnd", {
                      setValueAs: (val) => (val === "" ? null : val),
                    })}
                    className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                  />
                  {errors.workingHoursEnd && (
                    <p className="text-destructive text-xs mt-1">{errors.workingHoursEnd.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-xs font-bold py-3 rounded-lg transition-colors cursor-pointer shadow-sm"
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
