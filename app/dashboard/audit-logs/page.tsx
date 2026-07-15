"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  const { data: session, status } = useSession();
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
      await Promise.resolve();
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
      await Promise.resolve();
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // Wait for state updates then fetch
    setTimeout(() => fetchLogs(1), 0);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
      </div>
    );
  }

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
            <Link href="/dashboard/queues" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Queues
            </Link>
            <Link href="/dashboard/qr-codes" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              QR Codes
            </Link>
            <Link href="/dashboard/analytics" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Analytics
            </Link>
            <Link href="/dashboard/audit-logs" className="text-sm font-semibold text-white transition-colors">
              Audit Logs
            </Link>
            {session?.user?.role === "BUSINESS_OWNER" && (
              <>
                <Link href="/dashboard/staff" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                  Staff
                </Link>
                <Link href="/dashboard/settings" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                  Settings
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold px-4 py-2 rounded-lg hover:text-white transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 z-10 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Audit Logs</h1>
          <p className="text-sm text-zinc-500 mt-1">Track modifications, configurations, and queue interactions</p>
        </div>

        {/* Filter Form Card */}
        <form onSubmit={handleFilterSubmit} className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Start Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Actor Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Actor</label>
              <select
                value={actorId}
                onChange={(e) => setActorId(e.target.value)}
                className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
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
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
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
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Target Type</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
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
              className="bg-transparent border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              type="submit"
              className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </form>

        {/* Logs Table Card */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl overflow-hidden">
          {error ? (
            <div className="p-8 text-center">
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button
                onClick={() => fetchLogs(currentPage)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold px-4 py-2 rounded-lg hover:text-white transition-colors"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="p-16 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center text-zinc-500 text-sm">
              No audit logs found matching criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Actor</th>
                    <th className="py-4 px-6">Action</th>
                    <th className="py-4 px-6">Target</th>
                    <th className="py-4 px-6 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-sm">
                  {logs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="hover:bg-zinc-900/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="py-4 px-6 text-zinc-400 font-mono text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      {/* Actor */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-zinc-200">{log.actorName}</div>
                        <div className="text-xs text-zinc-500 font-mono">{log.actorEmail}</div>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
                          {log.action}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="py-4 px-6">
                        <div className="text-zinc-300 font-medium text-xs font-mono">{log.targetType}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">ID: {log.targetId}</div>
                      </td>

                      {/* Inspect details button */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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
            <div className="border-t border-zinc-900 p-4 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                Showing {logs.length} of {total} logs
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1 || loading}
                  onClick={() => fetchLogs(currentPage - 1)}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-50 disabled:pointer-events-none text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs text-zinc-400 font-medium font-mono px-2">
                  Page {currentPage} of {pages}
                </span>
                <button
                  disabled={currentPage >= pages || loading}
                  onClick={() => fetchLogs(currentPage + 1)}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-50 disabled:pointer-events-none text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Row detail metadata modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl max-w-2xl w-full flex flex-col max-h-[85vh] shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-zinc-900 p-6 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-white">Log Details</h3>
                <p className="text-xs text-zinc-500 font-mono mt-1">ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-500 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-900/60 pb-4">
                <div>
                  <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Timestamp</span>
                  <span className="text-zinc-200 font-mono">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Action</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Actor</span>
                  <span className="text-zinc-200 font-semibold">{selectedLog.actorName}</span>
                  <span className="block text-xs text-zinc-500 font-mono">{selectedLog.actorEmail}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Target</span>
                  <span className="text-zinc-200 font-mono">{selectedLog.targetType}</span>
                  <span className="block text-xs text-zinc-500 font-mono">ID: {selectedLog.targetId}</span>
                </div>
              </div>

              {/* Metadata JSON Viewer */}
              <div>
                <span className="block text-[10px] text-zinc-500 uppercase font-semibold mb-2">Metadata</span>
                <pre className="bg-black border border-zinc-900 rounded-lg p-4 overflow-x-auto text-xs font-mono text-zinc-300 max-h-64">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-900 p-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
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
