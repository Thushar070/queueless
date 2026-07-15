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
        // Handled below
      } else {
        fetchSettings();
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session?.user?.role !== "BUSINESS_OWNER") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-xl relative z-10 space-y-6">
          <svg className="w-12 h-12 text-destructive mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="space-y-2">
            <h2 className="text-xl font-heading font-extrabold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground font-medium">Only Business Owners are authorized to modify business settings.</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-block text-xs bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
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
    <div className="space-y-8 select-none text-left">
      <div>
        <h2 className="text-3xl font-heading font-extrabold tracking-tight text-foreground font-heading">Business Settings</h2>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Configure profile details and default working hours for your business.</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2 text-left">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-500/20 text-emerald-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2 text-left font-semibold">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Business settings updated successfully.</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-8 max-w-2xl mx-auto shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Business Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc."
                className="w-full bg-muted/20 border border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Contact Phone (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+15550199000"
                className="w-full bg-muted/20 border border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Default Opening Hours (HH:MM)</label>
                <input
                  type="text"
                  value={workingHoursStart}
                  onChange={(e) => setWorkingHoursStart(e.target.value)}
                  placeholder="09:00"
                  className="w-full bg-muted/20 border border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Default Closing Hours (HH:MM)</label>
                <input
                  type="text"
                  value={workingHoursEnd}
                  onChange={(e) => setWorkingHoursEnd(e.target.value)}
                  placeholder="17:00"
                  className="w-full bg-muted/20 border border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground font-medium">
              Opening and closing times must use 24-hour format (e.g. 08:30 and 18:00). These business-level defaults apply to all queues unless overridden on a specific queue.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
              ) : (
                "Save Changes"
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
