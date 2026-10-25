import Link from "next/link";
import { QrCode, Shield, RefreshCw } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between overflow-x-hidden font-sans">
      {/* 1. DARK HERO SECTION */}
      <div className="bg-black text-white relative overflow-hidden select-none border-b border-zinc-900 pb-20">
        {/* Navigation Header */}
        <header className="max-w-6xl mx-auto w-full px-6 py-6 flex justify-between items-center z-10 relative">
          <span className="text-xl font-heading font-extrabold tracking-tight text-white">
            QueueLess
          </span>
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-zinc-400">
            <Link href="#platform" className="text-white border-b-2 border-white pb-1">Platform</Link>
            <Link href="#features" className="hover:text-white transition-colors">How it works</Link>
            <Link href="/signup" className="hover:text-white transition-colors">For businesses</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="bg-white hover:bg-zinc-200 text-black text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </header>

        {/* Hero Central Panel */}
        <section id="platform" className="max-w-6xl mx-auto px-6 pt-16 flex flex-col lg:flex-row items-center justify-between gap-12 z-10 relative">
          <div className="text-left space-y-6 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800">
              Virtual queues for your business
            </span>
            <h1 className="text-5xl md:text-6xl font-heading font-extrabold tracking-tight leading-tight text-white">
              Go QueueLess.
            </h1>
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed max-w-lg">
              Let customers join from their phones, follow their place in line, and get called when it’s their turn. Your team manages the queue from one dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/signup"
                className="bg-white hover:bg-zinc-250 text-black font-bold text-xs px-6 py-3 rounded-lg text-center transition-all shadow-md cursor-pointer"
              >
                Create a business account
              </Link>
              <Link
                href="#features"
                className="bg-black hover:bg-zinc-900 border border-zinc-800 text-white font-semibold text-xs px-6 py-3 rounded-lg text-center transition-all cursor-pointer"
              >
                Explore how it works
              </Link>
            </div>
          </div>

          {/* Product highlights */}
          <div className="w-full lg:w-auto space-y-6 text-left shrink-0">
            <div className="border-t border-zinc-800 pt-4 max-w-[240px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-550 block">For customers</span>
              <span className="text-xl font-heading font-extrabold text-white block mt-1">Join by QR</span>
              <span className="text-[10px] text-zinc-500 mt-1 block">No app or customer account required.</span>
            </div>

            <div className="border-t border-zinc-800 pt-4 max-w-[240px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-550 block">For staff</span>
              <span className="text-xl font-heading font-extrabold text-white block mt-1">One queue view</span>
              <span className="text-[10px] text-zinc-500 mt-1 block">Call the next customer and update their status.</span>
            </div>
          </div>
        </section>

        {/* 2. Monitor Mockup Canvas */}
        <div className="max-w-4xl mx-auto px-6 mt-16 z-10 relative">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-2xl relative">
            {/* Monitor Outer frame */}
            <div className="bg-zinc-900 border border-zinc-850 rounded-xl overflow-hidden shadow-inner aspect-[16/10] flex flex-col">
              {/* Fake dashboard window */}
              <div className="bg-zinc-950 flex-1 flex flex-col text-left p-4 space-y-4 font-mono text-[9px] text-zinc-400 select-none">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2 gap-2">
                  <span className="font-bold text-white">QUEUELESS // STAFF DASHBOARD</span>
                  <span className="text-zinc-650">SAMPLE PREVIEW</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-white">
                  <div className="bg-zinc-900/60 p-2 border border-zinc-850 rounded">
                    <span>QUEUES</span>
                    <span className="text-lg font-bold block text-white mt-1">2</span>
                  </div>
                  <div className="bg-zinc-900/60 p-2 border border-zinc-850 rounded">
                    <span>WAITING</span>
                    <span className="text-lg font-bold block text-white mt-1">5</span>
                  </div>
                  <div className="bg-zinc-900/60 p-2 border border-zinc-850 rounded">
                    <span>CALLED</span>
                    <span className="text-lg font-bold block text-white mt-1">1</span>
                  </div>
                  <div className="bg-zinc-900/60 p-2 border border-zinc-850 rounded">
                    <span>COMPLETED</span>
                    <span className="text-lg font-bold block text-white mt-1">8</span>
                  </div>
                </div>
                {/* Illustrative queue preview; the values above are sample data. */}
                <div className="flex-1 bg-zinc-900/30 border border-zinc-900 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-white font-bold pb-1 border-b border-zinc-900">
                    <span>QUEUE STATUS</span>
                    <span>EXAMPLE</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900/50 pb-1">
                    <span>Queue</span>
                    <span>Section</span>
                    <span>Status</span>
                    <span>Waiting</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Consultation</span>
                    <span>Front desk</span>
                    <span className="text-emerald-500">Active</span>
                    <span>3</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Pick-up</span>
                    <span>Counter 2</span>
                    <span className="text-emerald-500">Active</span>
                    <span>2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Monitor Base stand styling */}
          <div className="w-32 h-6 bg-zinc-800 mx-auto rounded-b border-x border-b border-zinc-750 shadow-md" />
          <div className="w-48 h-2 bg-zinc-900 mx-auto rounded-t border-t border-x border-zinc-800" />
        </div>
      </div>

      {/* 3. LIGHT BACKGROUND FEATURES SECTION */}
      <section id="features" className="max-w-6xl mx-auto w-full px-6 py-20 text-center space-y-12">
        <div className="space-y-3 max-w-2xl mx-auto text-left md:text-center">
          <h2 className="text-3xl font-heading font-extrabold tracking-tight text-foreground">
            A clearer way to manage the line
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Customers can wait wherever they’re comfortable while your team keeps the line moving from the staff dashboard.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border p-6 rounded-2xl text-left space-y-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground">
              <QrCode className="size-5" />
            </div>
            <h3 className="font-heading font-bold text-foreground text-lg">
              QR check-in
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Share or display a queue QR code. Customers open the join form in their browser and receive a private tracking link.
            </p>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl text-left space-y-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground">
              <Shield className="size-5" />
            </div>
            <h3 className="font-heading font-bold text-foreground text-lg">
              Staff queue controls
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Manage queues and staff from your business dashboard, with access scoped to each business account.
            </p>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl text-left space-y-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground">
              <RefreshCw className="size-5 animate-spin-slow" />
            </div>
            <h3 className="font-heading font-bold text-foreground text-lg">
              Status updates
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Customers can check their position and status as the team calls and serves people in the queue.
            </p>
          </div>
        </div>
      </section>

      {/* 5. LANDING FOOTER */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-8 text-left text-xs">
          <div className="space-y-3">
            <span className="text-base font-heading font-extrabold text-foreground">
              QueueLess
            </span>
            <p className="text-muted-foreground max-w-xs leading-relaxed">
              © {new Date().getFullYear()} QueueLess. Virtual queue management for businesses and their customers.
            </p>
          </div>

          <div className="flex items-start gap-6 font-semibold">
            <Link href="/login" className="text-muted-foreground hover:text-foreground">Log in</Link>
            <Link href="/signup" className="text-muted-foreground hover:text-foreground">Create an account</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
