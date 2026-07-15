"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Business {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  status: string;
  createdAt: string;
  _count: {
    staff: number;
    queues: number;
  };
}

export default function AdminBusinessesPage() {
  const { status } = useSession();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Confirmation State
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [actionType, setActionType] = useState<"suspend" | "reactivate" | "delete" | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  async function fetchBusinesses(page = 1) {
    try {
      await Promise.resolve();
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/businesses?page=${page}&limit=10`);
      if (!res.ok) {
        throw new Error("Failed to fetch businesses");
      }
      const data = await res.json();
      setBusinesses(data.businesses);
      setTotal(data.total);
      setPages(data.pages);
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
      fetchBusinesses(1);
    }
  }, [status]);

  const openConfirmation = (business: Business, type: "suspend" | "reactivate" | "delete") => {
    setSelectedBusiness(business);
    setActionType(type);
    setIsConfirming(true);
    setConfirmPhrase("");
  };

  const handleAction = async () => {
    if (!selectedBusiness || !actionType) return;

    // For delete action, require explicit verification typing
    if (actionType === "delete" && confirmPhrase !== selectedBusiness.slug) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: selectedBusiness.id,
          action: actionType,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || `Failed to ${actionType} business`);
      }

      // Close modal and refresh current page
      setIsConfirming(false);
      setSelectedBusiness(null);
      setActionType(null);
      fetchBusinesses(currentPage);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || (loading && businesses.length === 0)) {
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
          <Link href="/admin" className="text-xl font-bold text-white tracking-tight">
            QueueLess Admin
          </Link>
          <nav className="hidden md:flex gap-4">
            <Link href="/admin" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Overview
            </Link>
            <Link href="/admin/businesses" className="text-sm font-semibold text-white border-b-2 border-white pb-1">
              Businesses
            </Link>
            <Link href="/admin/analytics" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Analytics
            </Link>
            <Link href="/admin/audit-logs" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Audit Logs
            </Link>
          </nav>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold px-4 py-2 rounded-lg hover:text-white transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-6 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Manage Businesses</h1>
            <p className="text-xs text-zinc-400 mt-1">Total registered businesses: {total}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4">
            {error}
          </div>
        )}

        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-450 text-[10px] uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Business Details</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4 text-center">Staff Count</th>
                  <th className="px-6 py-4 text-center">Queue Count</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-sm">
                {businesses.map((biz) => (
                  <tr key={biz.id} className="hover:bg-zinc-950/40 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-white block">{biz.name}</span>
                      <span className="text-xs text-zinc-450">{biz.email || "No contact email"}</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-mono text-xs">{biz.slug}</td>
                    <td className="px-6 py-4 text-center text-zinc-300 font-bold">{biz._count.staff}</td>
                    <td className="px-6 py-4 text-center text-zinc-300 font-bold">{biz._count.queues}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        biz.status === "ACTIVE" ? "text-emerald-400" : "text-amber-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          biz.status === "ACTIVE" ? "bg-emerald-400" : "bg-amber-400"
                        }`} />
                        {biz.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {biz.status === "ACTIVE" ? (
                        <button
                          onClick={() => openConfirmation(biz, "suspend")}
                          className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => openConfirmation(biz, "reactivate")}
                          className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Reactivate
                        </button>
                      )}
                      <button
                        onClick={() => openConfirmation(biz, "delete")}
                        className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {businesses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-zinc-550 text-xs">
                      No businesses registered on this platform.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {pages > 1 && (
            <div className="border-t border-zinc-900 px-6 py-4 flex items-center justify-between">
              <span className="text-xs text-zinc-450">
                Page {currentPage} of {pages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => fetchBusinesses(currentPage - 1)}
                  className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === pages}
                  onClick={() => fetchBusinesses(currentPage + 1)}
                  className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal */}
      {isConfirming && selectedBusiness && actionType && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div>
              <h3 className="text-lg font-bold text-white capitalize">
                {actionType} Business
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Are you sure you want to {actionType} &quot;{selectedBusiness.name}&quot;?
              </p>
            </div>

            {actionType === "delete" && (
              <div className="space-y-2 bg-red-500/5 border border-red-500/10 p-4 rounded-xl">
                <p className="text-[11px] text-red-400 font-semibold leading-relaxed">
                  WARNING: Soft-deleting this business is terminal. It will lock out all staff accounts and remove public access to their queues immediately.
                </p>
                <label className="block text-[10px] text-zinc-450 font-bold uppercase tracking-wider mt-2">
                  Type business slug <span className="text-white font-mono">{selectedBusiness.slug}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  className="w-full bg-black border border-zinc-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-750 font-mono"
                  placeholder="slug"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsConfirming(false)}
                className="text-xs border border-zinc-850 hover:bg-zinc-900 text-zinc-300 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionType === "delete" && confirmPhrase !== selectedBusiness.slug}
                className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  actionType === "delete"
                    ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 disabled:opacity-50"
                    : actionType === "suspend"
                    ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/20"
                    : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                Confirm {actionType}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
