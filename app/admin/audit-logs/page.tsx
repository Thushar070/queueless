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

interface Business {
  id: string;
  name: string;
}

export default function AdminAuditLogsPage() {
  const { status } = useSession();
  const router = useRouter();

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
  const [targetBusinessId, setTargetBusinessId] = useState("");

  // Business list for dropdown filter
  const [businesses, setBusinesses] = useState<Business[]>([]);

  // Metadata detail view modal state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  async function fetchBusinesses() {
    try {
      const res = await fetch("/api/admin/businesses?limit=100");
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses);
      }
    } catch (err) {
      console.error("Failed to load business list for dropdown:", err);
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
      if (targetBusinessId) params.append("targetBusinessId", targetBusinessId);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch platform audit logs");
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
      fetchBusinesses();
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
    setTargetBusinessId("");
    setTimeout(() => fetchLogs(1), 0);
  };

  if (status === "loading" || (loading && logs.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none text-left">
      <div>
        <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">Platform Audit Logs</h1>
        <p className="text-xs text-muted-foreground mt-1 font-semibold">Platform-wide security events and system actions — Total events found: {total}</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-4 font-semibold">
          {error}
        </div>
      )}

      {/* Filter panel */}
      <form onSubmit={handleFilterSubmit} className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4 text-foreground">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Business Dropdown filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Scope by Business</label>
            <select
              value={targetBusinessId}
              onChange={(e) => setTargetBusinessId(e.target.value)}
              className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">All Businesses / Platform Actions</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range filters */}
          <div className="space-y-1">
            <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Actor ID filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Actor ID</label>
            <input
              type="text"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder="Staff or Admin ID"
              className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Action Type filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Action Type</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">All Actions</option>
              <option value="STAFF_CREATED">STAFF_CREATED</option>
              <option value="STAFF_REMOVED">STAFF_REMOVED</option>
              <option value="BUSINESS_SETTINGS_UPDATED">BUSINESS_SETTINGS_UPDATED</option>
              <option value="BUSINESS_SUSPENDED">BUSINESS_SUSPENDED</option>
              <option value="BUSINESS_REACTIVATED">BUSINESS_REACTIVATED</option>
              <option value="BUSINESS_DELETED">BUSINESS_DELETED</option>
            </select>
          </div>

          {/* Target Type filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Target Type</label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">All Target Types</option>
              <option value="Business">Business</option>
              <option value="Staff">Staff</option>
              <option value="Queue">Queue</option>
              <option value="QueueEntry">QueueEntry</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs bg-card border border-border hover:bg-muted text-foreground font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            Reset Filters
          </button>
          <button
            type="submit"
            className="text-xs bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden text-foreground">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-[10px] uppercase font-bold tracking-wider bg-muted/20">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Target Type</th>
                <th className="px-6 py-4">Target ID</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/10 transition-colors border-b border-border">
                  <td className="px-6 py-4 text-muted-foreground font-mono text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-foreground block">{log.actorName}</span>
                    <span className="text-xs text-muted-foreground font-semibold">{log.actorEmail}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex bg-muted border border-border px-2 py-1 rounded text-xs font-mono font-bold text-foreground">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-foreground font-semibold">{log.targetType}</td>
                  <td className="px-6 py-4 text-muted-foreground font-mono text-xs truncate max-w-[120px]">
                    {log.targetId}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-xs bg-card hover:bg-muted border border-border text-foreground px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm font-bold"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground text-xs font-medium">
                    No matching audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pages > 1 && (
          <div className="border-t border-border px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">
              Page {currentPage} of {pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => fetchLogs(currentPage - 1)}
                className="text-xs bg-white border border-border text-foreground hover:bg-muted disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm font-bold"
              >
                Previous
              </button>
              <button
                disabled={currentPage === pages}
                onClick={() => fetchLogs(currentPage + 1)}
                className="text-xs bg-white border border-border text-foreground hover:bg-muted disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm font-bold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Inspector Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative text-left">
            <div>
              <h3 className="text-lg font-heading font-extrabold text-foreground">Log Event Metadata</h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-semibold">Payload details and action context parameters</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs text-foreground font-semibold">
                <div>
                  <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[10px]">Log Event ID</span>
                  <span className="font-mono">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[10px]">Business ID</span>
                  <span className="font-mono">{selectedLog.businessId || "Platform level"}</span>
                </div>
              </div>

              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
                <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[10px]">JSON Payload</span>
                <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap font-mono max-h-48 leading-relaxed">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="text-xs bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
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
