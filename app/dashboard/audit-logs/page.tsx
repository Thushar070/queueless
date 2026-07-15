/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AuditLog {
  id: string;
  businessId: string | null;
  actorId: string | null;
  actorRole: string | null;
  actorName: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: unknown;
  createdAt: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
}

export default function AuditLogsPage() {
  const { status } = useSession();
  const router = useRouter();

  // Logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");

  // Staff members list for dropdown
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // Metadata detail view modal state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  async function fetchStaff() {
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch (err) {
      console.error("Failed to load staff list for dropdown:", err);
    }
  }

  async function fetchLogs(page = 1) {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });

      if (startDate) params.append("startDate", new Date(startDate).toISOString());
      if (endDate) params.append("endDate", new Date(endDate).toISOString());
      if (actorId) params.append("actorId", actorId);
      if (action) params.append("action", action);
      if (targetType) params.append("targetType", targetType);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const json = await res.json();
      setLogs(json.logs);
      setTotal(json.total);
      setPages(json.pages);
      setCurrentPage(page);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchStaff();
      fetchLogs(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setActorId("");
    setAction("");
    setTargetType("");
    setTimeout(() => fetchLogs(1), 0);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none text-left">
      <div>
        <h2 className="text-3xl font-heading font-extrabold tracking-tight text-foreground font-heading">Audit Logs</h2>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Track modifications, configurations, and queue interactions</p>
      </div>

      {/* Filter Form Card */}
      <form onSubmit={handleFilterSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Actor Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider">Actor</label>
            <select
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              className="bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">All Actors</option>
              <option value="system">System</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>

          {/* Action Type Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">All Actions</option>
              <option value="STAFF_CREATED">Staff Created</option>
              <option value="STAFF_REMOVED">Staff Removed</option>
              <option value="BUSINESS_SETTINGS_UPDATED">Settings Updated</option>
              <option value="QUEUE_CREATED">Queue Created</option>
              <option value="QUEUE_UPDATED">Queue Updated</option>
              <option value="QUEUE_DELETED">Queue Deleted</option>
              <option value="QUEUE_ENTRY_JOINED">Entry Joined</option>
              <option value="QUEUE_ENTRY_CALLED">Entry Called</option>
              <option value="QUEUE_ENTRY_SERVING">Entry Serving</option>
              <option value="QUEUE_ENTRY_COMPLETED">Entry Completed</option>
              <option value="QUEUE_ENTRY_SKIPPED">Entry Skipped</option>
              <option value="QUEUE_ENTRY_CANCELLED">Entry Cancelled</option>
            </select>
          </div>

          {/* Target Type Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-foreground uppercase tracking-wider">Target Type</label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">All Targets</option>
              <option value="Business">Business</option>
              <option value="Staff">Staff</option>
              <option value="Queue">Queue</option>
              <option value="QueueEntry">QueueEntry</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetFilters}
            className="bg-card hover:bg-muted border border-border text-foreground text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            Reset Filters
          </button>
          <button
            type="submit"
            className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Logs Table Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <div className="p-8 text-center">
            <p className="text-destructive text-sm mb-2 font-semibold">{error}</p>
            <button
              onClick={() => fetchLogs(currentPage)}
              className="bg-card hover:bg-muted border border-border text-foreground text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="p-16 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground text-sm font-medium">
            No audit logs found matching criteria
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider bg-muted/20">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Actor</th>
                  <th className="py-4 px-6">Action</th>
                  <th className="py-4 px-6">Target</th>
                  <th className="py-4 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-foreground">
                {logs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-muted/20 transition-colors cursor-pointer border-b border-border"
                    onClick={() => setSelectedLog(log)}
                  >
                    {/* Timestamp */}
                    <td className="py-4 px-6 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    {/* Actor */}
                    <td className="py-4 px-6">
                      <div className="font-bold text-foreground">{log.actorName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{log.actorEmail}</div>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-muted border border-border text-foreground font-mono">
                        {log.action}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="py-4 px-6">
                      <div className="text-foreground font-bold text-xs font-mono">{log.targetType}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">ID: {log.targetId}</div>
                    </td>

                    {/* Inspect details button */}
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="bg-card hover:bg-muted border border-border text-foreground text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {pages > 1 && (
          <div className="border-t border-border p-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">
              Showing {logs.length} of {total} logs
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1 || loading}
                onClick={() => fetchLogs(currentPage - 1)}
                className="bg-card hover:bg-muted border border-border disabled:opacity-50 disabled:pointer-events-none text-foreground text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground font-bold font-mono px-2">
                Page {currentPage} of {pages}
              </span>
              <button
                disabled={currentPage >= pages || loading}
                onClick={() => fetchLogs(currentPage + 1)}
                className="bg-card hover:bg-muted border border-border disabled:opacity-50 disabled:pointer-events-none text-foreground text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Row detail metadata modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full flex flex-col max-h-[85vh] shadow-2xl relative overflow-hidden">
            {/* Modal Header */}
            <div className="border-b border-border p-6 flex justify-between items-start">
              <div>
                <h3 className="font-heading font-extrabold text-lg text-foreground">Log Details</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm text-foreground">
              <div className="grid grid-cols-2 gap-4 border-b border-border pb-4 text-left">
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold">Timestamp</span>
                  <span className="text-foreground font-mono font-semibold">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold">Action</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs bg-muted border border-border text-foreground font-mono font-bold">
                    {selectedLog.action}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold">Actor</span>
                  <span className="text-foreground font-bold">{selectedLog.actorName}</span>
                  <span className="block text-xs text-muted-foreground font-mono">{selectedLog.actorEmail}</span>
                </div>
                <div className="mt-2">
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold">Target</span>
                  <span className="text-foreground font-mono font-bold">{selectedLog.targetType}</span>
                  <span className="block text-xs text-muted-foreground font-mono">ID: {selectedLog.targetId}</span>
                </div>
              </div>

              {/* Metadata JSON Viewer */}
              <div className="text-left">
                <span className="block text-[10px] text-muted-foreground uppercase font-bold mb-2">Metadata</span>
                <pre className="bg-muted/30 border border-border rounded-xl p-4 overflow-x-auto text-xs font-mono text-foreground max-h-64">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border p-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
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
