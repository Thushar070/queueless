/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "BUSINESS_OWNER" | "STAFF";
  createdAt: string;
}

export default function StaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"STAFF" | "BUSINESS_OWNER">("STAFF");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    email: string;
    tempPass: string;
  } | null>(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/staff");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized");
          return;
        }
        throw new Error("Failed to fetch staff members");
      }
      const data = await res.json();
      setStaffList(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading staff.");
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
        fetchStaff();
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
            <p className="text-sm text-muted-foreground font-medium">Only Business Owners are authorized to manage staff accounts.</p>
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessData(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create staff member");
      }

      setSuccessData({ email: data.email, tempPass: data.tempPassword });
      setName("");
      setEmail("");
      setRole("STAFF");
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (staffId: string) => {
    if (!confirm("Are you sure you want to remove this staff member? This will invalidate their session immediately.")) {
      return;
    }

    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete staff member");
      }
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8 select-none text-left">
      <div>
        <h2 className="text-3xl font-heading font-extrabold tracking-tight text-foreground font-heading">Staff Management</h2>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Add, manage roles, and delete staff credentials for your business.</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2 text-left">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Temporary password display */}
      {successData && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-3 text-left shadow-sm">
          <h3 className="text-sm font-heading font-extrabold text-foreground flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            Staff Member Account Created
          </h3>
          <p className="text-xs text-muted-foreground font-semibold">
            Please share the temporary password below with <span className="font-bold text-foreground">{successData.email}</span>. They will be forced to change it on their first login.
          </p>
          <div className="bg-muted/30 border border-border rounded-lg p-3 flex items-center justify-between">
            <span className="font-mono text-sm tracking-wider text-emerald-600 font-bold select-all">
              {successData.tempPass}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(successData.tempPass);
                alert("Copied to clipboard!");
              }}
              className="text-[10px] bg-card border border-border hover:bg-muted px-3 py-1.5 rounded-md text-foreground transition-colors font-bold shadow-sm"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setSuccessData(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground underline block"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Form */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6 h-fit shadow-sm">
          <h3 className="text-lg font-heading font-extrabold text-foreground">Create Staff Account</h3>
          <form onSubmit={handleCreate} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-muted/20 border border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@company.com"
                className="w-full bg-muted/20 border border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Assigned Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-muted/20 border border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="STAFF">Staff (Queue Management Only)</option>
                <option value="BUSINESS_OWNER">Business Owner (Full Settings Access)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
              ) : (
                "Generate Credentials"
              )}
            </button>
          </form>
        </div>

        {/* Staff List */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
          <h3 className="text-lg font-heading font-extrabold text-foreground text-left font-heading">Active Members</h3>

          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : staffList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 font-medium">No active staff members found.</p>
          ) : (
            <div className="divide-y divide-border">
              {staffList.map((member) => (
                <div key={member.id} className="py-4 flex items-center justify-between text-left">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{member.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">{member.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] bg-muted border border-border text-muted-foreground font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {member.role.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Joined {new Date(member.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {member.id !== session?.user?.id && (
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="text-xs bg-card hover:bg-destructive/10 text-destructive border border-destructive/20 hover:border-destructive/40 px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
