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
        // Rendered inline permission denied or handled below
      } else {
        fetchStaff();
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
            <p className="text-sm text-zinc-400">Only Business Owners are authorized to manage staff accounts.</p>
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
            <Link href="/dashboard/staff" className="text-sm font-semibold text-white border-b-2 border-white pb-1">
              Staff
            </Link>
            <Link href="/dashboard/settings" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
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
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-8 z-10">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Staff Management</h2>
          <p className="text-zinc-400 text-sm mt-1">Add, manage roles, and delete staff credentials for your business.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2 text-left">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Temporary password display */}
        {successData && (
          <div className="bg-zinc-950 border border-white/20 rounded-xl p-6 space-y-3 text-left">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
              Staff Member Account Created
            </h3>
            <p className="text-xs text-zinc-400">
              Please share the temporary password below with <span className="font-semibold text-white">{successData.email}</span>. They will be forced to change it on their first login.
            </p>
            <div className="bg-black border border-zinc-900 rounded-lg p-3 flex items-center justify-between">
              <span className="font-mono text-sm tracking-wider text-green-400 font-bold select-all">
                {successData.tempPass}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(successData.tempPass);
                  alert("Copied to clipboard!");
                }}
                className="text-[10px] bg-zinc-900 border border-zinc-800 hover:text-white px-3 py-1.5 rounded-md text-zinc-400 transition-colors"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setSuccessData(null)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 underline block"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Form */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 h-fit">
            <h3 className="text-lg font-bold text-white">Create Staff Account</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-black border border-zinc-900 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-zinc-800 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@company.com"
                  className="w-full bg-black border border-zinc-900 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-zinc-800 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-black border border-zinc-900 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-800 transition-colors"
                >
                  <option value="STAFF">Staff (Queue Management Only)</option>
                  <option value="BUSINESS_OWNER">Business Owner (Full Settings Access)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-black" />
                ) : (
                  "Generate Credentials"
                )}
              </button>
            </form>
          </div>

          {/* Staff List */}
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white text-left">Active Members</h3>

            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white" />
              </div>
            ) : staffList.length === 0 ? (
              <p className="text-sm text-zinc-500 py-12">No active staff members found.</p>
            ) : (
              <div className="divide-y divide-zinc-900">
                {staffList.map((member) => (
                  <div key={member.id} className="py-4 flex items-center justify-between text-left">
                    <div>
                      <h4 className="text-sm font-bold text-white">{member.name}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">{member.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {member.role.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-zinc-650">
                          Joined {new Date(member.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {member.id !== session?.user?.id && (
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="text-xs border border-zinc-900 hover:border-red-900/50 hover:bg-red-950/20 text-zinc-450 hover:text-red-400 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
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
      </main>
    </div>
  );
}
