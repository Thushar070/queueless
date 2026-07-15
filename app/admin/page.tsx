"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPage() {
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
          <Link href="/admin" className="text-xl font-bold text-white tracking-tight">
            QueueLess Admin
          </Link>
          <nav className="hidden md:flex gap-4">
            <Link href="/admin" className="text-sm font-semibold text-white border-b-2 border-white pb-1">
              Overview
            </Link>
            <Link href="/admin/businesses" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
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
      <main className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-8 z-10 flex flex-col justify-center">
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 shadow-xl space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Super Admin Dashboard</h2>
            <p className="text-xs text-zinc-400 mt-1">Platform management and session parameters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black border border-zinc-900 rounded-xl p-4 space-y-1">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Authenticated As</span>
              <span className="text-sm text-zinc-200 font-bold truncate block">{session?.user?.email}</span>
            </div>

            <div className="bg-black border border-zinc-900 rounded-xl p-4 space-y-1">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Assigned Role</span>
              <span className="text-sm text-zinc-200 font-bold block">{session?.user?.role}</span>
            </div>

            <div className="bg-black border border-zinc-900 rounded-xl p-4 space-y-1">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Platform Scope</span>
              <span className="text-sm text-zinc-450 font-bold">Global / Multi-tenant Admin</span>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-900 text-left">
            <p className="text-xs text-zinc-500">
              Only authenticated users with the role `SUPER_ADMIN` can access this control panel. Use the links above to manage businesses, inspect platform-wide analytics aggregates, and audit security log events.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
