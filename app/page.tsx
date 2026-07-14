import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background neon glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            QueueLess
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-300 hover:text-slate-100 transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="bg-indigo-600/10 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto w-full px-6 text-center space-y-8 py-20 z-10 flex-1 flex flex-col justify-center items-center">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            ✨ Now Live: Phase 2 CRUD & QR Codes
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-slate-100">
            Ditch the physical line. <br />
            Go{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              QueueLess
            </span>
            .
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto leading-relaxed">
            The next-generation virtual waitlist and queue management platform for medical checkups, retail services, and smart businesses.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 py-3 rounded-lg shadow-lg hover:shadow-indigo-500/10 transition-all text-center"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold px-8 py-3 rounded-lg transition-all text-center"
          >
            Owner Dashboard
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 max-w-5xl w-full">
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl text-left space-y-2 hover:border-slate-800 transition-colors">
            <h3 className="font-bold text-slate-200 text-lg flex items-center gap-2">
              📱 Smart QR Codes
            </h3>
            <p className="text-sm text-slate-400">
              Instantly generate scan-and-join codes for each line. Place them at your entrance for touchless registrations.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl text-left space-y-2 hover:border-slate-800 transition-colors">
            <h3 className="font-bold text-slate-200 text-lg flex items-center gap-2">
              🔒 Tenant Isolation
            </h3>
            <p className="text-sm text-slate-400">
              Advanced Supabase database Row-Level Security ensures that your staff, queue statistics, and metrics are completely private.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl text-left space-y-2 hover:border-slate-800 transition-colors">
            <h3 className="font-bold text-slate-200 text-lg flex items-center gap-2">
              ⚡ Real-time Updates
            </h3>
            <p className="text-sm text-slate-400">
              Serve walk-ins efficiently with dynamic estimation metrics and interactive management screens for staff.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 bg-slate-900/20 py-8 text-center text-xs text-slate-500 z-10">
        &copy; {new Date().getFullYear()} QueueLess Inc. All rights reserved. Built for supreme developer and customer experience.
      </footer>
    </main>
  );
}
