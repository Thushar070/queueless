"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/30 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          QueueLess Dashboard
        </h1>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 relative overflow-hidden shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="text-2xl font-extrabold text-slate-100 mb-6">Welcome Back!</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-1">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Authenticated As</span>
              <p className="text-sm text-slate-200 font-semibold truncate">{session?.user?.email}</p>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-1">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Assigned Role</span>
              <p className="text-sm text-slate-200 font-semibold text-emerald-400">{session?.user?.role}</p>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-1">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Business ID</span>
              <p className="text-sm text-slate-200 font-mono text-indigo-300 truncate">
                {session?.user?.businessId || "N/A"}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/60">
            <p className="text-sm text-slate-400">
              This is the empty dashboard shell for Phase 1. Complete tenant isolation is verified.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
