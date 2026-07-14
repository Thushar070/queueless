import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-between relative overflow-hidden select-none">
      {/* Sleek B&W grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      {/* Subtle minimalist background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-white">
            QueueLess
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="bg-white hover:bg-zinc-200 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto w-full px-6 text-center space-y-8 py-20 z-10 flex-1 flex flex-col justify-center items-center">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800">
            ✨ Virtual waitlists & queue management
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-white">
            Ditch the physical line. <br />
            Go QueueLess.
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-xl mx-auto leading-relaxed">
            The next-generation virtual waitlist and queue management platform for medical checkups, retail services, and smart businesses.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-black font-bold px-8 py-3 rounded-lg shadow-lg transition-all text-center"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 font-semibold px-8 py-3 rounded-lg transition-all text-center"
          >
            Owner Dashboard
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 max-w-5xl w-full">
          <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-xl text-left space-y-2 hover:border-zinc-800 transition-colors">
            <h3 className="font-bold text-zinc-100 text-lg flex items-center gap-2">
              📱 Smart QR Codes
            </h3>
            <p className="text-sm text-zinc-450">
              Instantly generate scan-and-join codes for each line. Place them at your entrance for touchless registrations.
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-xl text-left space-y-2 hover:border-zinc-800 transition-colors">
            <h3 className="font-bold text-zinc-100 text-lg flex items-center gap-2">
              🔒 Tenant Isolation
            </h3>
            <p className="text-sm text-zinc-450">
              Advanced Supabase database Row-Level Security ensures that your staff, queue statistics, and metrics are completely private.
            </p>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-xl text-left space-y-2 hover:border-zinc-800 transition-colors">
            <h3 className="font-bold text-zinc-100 text-lg flex items-center gap-2">
              ⚡ Real-time Updates
            </h3>
            <p className="text-sm text-zinc-450">
              Serve walk-ins efficiently with dynamic estimation metrics and interactive management screens for staff.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900/60 bg-zinc-950/20 py-8 text-center text-xs text-zinc-500 z-10">
        &copy; {new Date().getFullYear()} QueueLess Inc. All rights reserved. Built for supreme developer and customer experience.
      </footer>
    </main>
  );
}
