/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none text-left">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">Manage Businesses</h1>
          <p className="text-xs text-muted-foreground mt-1 font-semibold">Total registered businesses: {total}</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-4 font-semibold">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-[10px] uppercase font-bold tracking-wider bg-muted/20">
                <th className="px-6 py-4">Business Details</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4 text-center">Staff Count</th>
                <th className="px-6 py-4 text-center">Queue Count</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm text-foreground">
              {businesses.map((biz) => (
                <tr key={biz.id} className="hover:bg-muted/10 transition-colors border-b border-border">
                  <td className="px-6 py-4">
                    <span className="font-bold text-foreground block">{biz.name}</span>
                    <span className="text-xs text-muted-foreground font-semibold">{biz.email || "No contact email"}</span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{biz.slug}</td>
                  <td className="px-6 py-4 text-center text-foreground font-bold">{biz._count.staff}</td>
                  <td className="px-6 py-4 text-center text-foreground font-bold">{biz._count.queues}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                      biz.status === "ACTIVE" ? "text-emerald-700" : "text-amber-700"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        biz.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-500"
                      }`} />
                      {biz.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {biz.status === "ACTIVE" ? (
                      <button
                        onClick={() => openConfirmation(biz, "suspend")}
                        className="text-xs bg-card hover:bg-amber-500/10 text-amber-700 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => openConfirmation(biz, "reactivate")}
                        className="text-xs bg-card hover:bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                      >
                        Reactivate
                      </button>
                    )}
                    <button
                      onClick={() => openConfirmation(biz, "delete")}
                      className="text-xs bg-card hover:bg-destructive/10 text-destructive border border-destructive/20 hover:border-destructive/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {businesses.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground text-xs font-medium">
                    No businesses registered on this platform.
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
                onClick={() => fetchBusinesses(currentPage - 1)}
                className="text-xs bg-card border border-border text-foreground hover:bg-muted disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Previous
              </button>
              <button
                disabled={currentPage === pages}
                onClick={() => fetchBusinesses(currentPage + 1)}
                className="text-xs bg-card border border-border text-foreground hover:bg-muted disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {isConfirming && selectedBusiness && actionType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-left">
            <div>
              <h3 className="text-lg font-heading font-extrabold text-foreground capitalize">
                {actionType} Business
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-semibold">
                Are you sure you want to {actionType} &quot;{selectedBusiness.name}&quot;?
              </p>
            </div>

            {actionType === "delete" && (
              <div className="space-y-2 bg-destructive/5 border border-destructive/10 p-4 rounded-xl">
                <p className="text-[11px] text-destructive font-bold leading-relaxed">
                  WARNING: Soft-deleting this business is terminal. It will lock out all staff accounts and remove public access to their queues immediately.
                </p>
                <label className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-2">
                  Type business slug <span className="text-foreground font-mono font-bold">{selectedBusiness.slug}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                  placeholder="slug"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsConfirming(false)}
                className="text-xs bg-card border border-border hover:bg-muted text-foreground px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionType === "delete" && confirmPhrase !== selectedBusiness.slug}
                className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm ${
                  actionType === "delete"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-muted disabled:text-muted-foreground"
                    : actionType === "suspend"
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
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
