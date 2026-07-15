/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [workingHoursStart, setWorkingHoursStart] = useState("");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (!res.ok) {
        throw new Error("Failed to load settings");
      }
      const data = await res.json();
      setName(data.name || "");
      setPhone(data.phone || "");
      setWorkingHoursStart(data.workingHoursStart || "");
      setWorkingHoursEnd(data.workingHoursEnd || "");
    } catch (err: any) {
      setError(err.message || "An error occurred while loading settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      if (session?.user?.role !== "BUSINESS_OWNER") {
        // Handled via Access Denied rendering below
      } else {
        fetchSettings();
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
      </div>
    );
  }

  if (session?.user?.role !== "BUSINESS_OWNER") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25 pointer-events-none" />
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 max-w-md w-full shadow-2xl relative z-10 space-y-6">
          <svg className="w-12 h-12 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Access Denied</h2>
            <p className="text-sm text-zinc-400">Only Business Owners are authorized to modify business settings.</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-block text-xs bg-white text-black font-bold px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          workingHoursStart: workingHoursStart || null,
          workingHoursEnd: workingHoursEnd || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.details?.formErrors && data.details.formErrors.length > 0) {
          throw new Error(data.details.formErrors.join(", "));
        }
        if (data.details?.fieldErrors) {
          const fieldMsgs = Object.values(data.details.fieldErrors).flat();
          if (fieldMsgs.length > 0) {
            throw new Error(fieldMsgs.join(", "));
          }
        }
        throw new Error(data.error || "Failed to update settings");
      }

      setSuccess(true);
      fetchSettings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
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
            <Link href="/dashboard/queues" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Queues
            </Link>
            <Link href="/dashboard/qr-codes" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              QR Codes
            </Link>
            <Link href="/dashboard/analytics" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Analytics
            </Link>
            <Link href="/dashboard/audit-logs" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Audit Logs
            </Link>
            <Link href="/dashboard/staff" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Staff
            </Link>
            <Link href="/dashboard/settings" className="text-sm font-semibold text-white border-b-2 border-white pb-1">
              Settings
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
      <main className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-8 z-10">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Business Settings</h2>
          <p className="text-zinc-400 text-sm mt-1">Configure profile details and default working hours for your business.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2 text-left">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2 text-left">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Business settings updated successfully.</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white" />
          </div>
        ) : (
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 max-w-2xl mx-auto shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Business Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Inc."
                  className="w-full bg-black border border-zinc-900 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-zinc-800 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Contact Phone (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+15550199000"
                  className="w-full bg-black border border-zinc-900 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-zinc-800 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Default Opening Hours (HH:MM)</label>
                  <input
                    type="text"
                    value={workingHoursStart}
                    onChange={(e) => setWorkingHoursStart(e.target.value)}
                    placeholder="09:00"
                    className="w-full bg-black border border-zinc-900 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-zinc-800 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Default Closing Hours (HH:MM)</label>
                  <input
                    type="text"
                    value={workingHoursEnd}
                    onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    placeholder="17:00"
                    className="w-full bg-black border border-zinc-900 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-zinc-800 transition-colors"
                  />
                </div>
              </div>

              <p className="text-[10px] text-zinc-500">
                Opening and closing times must use 24-hour format (e.g. 08:30 and 18:00). These business-level defaults apply to all queues unless overridden on a specific queue.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-black" />
                ) : (
                  "Save Changes"
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
