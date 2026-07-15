"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
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
            <Link href="/dashboard/audit-logs" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
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
      <main className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-8 z-10 flex flex-col justify-center">
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 shadow-xl space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Welcome Back!</h2>
            <p className="text-xs text-zinc-400 mt-1">Tenant verification and session parameters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black border border-zinc-900 rounded-xl p-4 space-y-1">
              <span className="text-[10px] text-zinc-550 font-semibold uppercase tracking-wider block">Authenticated As</span>
              <span className="text-sm text-zinc-200 font-bold truncate block">{session?.user?.email}</span>
            </div>

            <div className="bg-black border border-zinc-900 rounded-xl p-4 space-y-1">
              <span className="text-[10px] text-zinc-550 font-semibold uppercase tracking-wider block">Assigned Role</span>
              <span className="text-sm text-zinc-200 font-bold block">{session?.user?.role}</span>
            </div>

            <div className="bg-black border border-zinc-900 rounded-xl p-4 space-y-1">
              <span className="text-[10px] text-zinc-550 font-semibold uppercase tracking-wider block">Business ID</span>
              <span className="text-sm text-zinc-300 font-mono truncate block">
                {session?.user?.businessId || "N/A"}
              </span>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-900 text-left">
            <p className="text-xs text-zinc-500">
              Account linked successfully. Use the &quot;Manage Queues&quot; panel above to configure queues, call customers, and monitor live statuses.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
