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
            <Link href="#" className="text-white border-b-2 border-white pb-1">Platform</Link>
            <Link href="#" className="hover:text-white transition-colors">Solutions</Link>
            <Link href="#" className="hover:text-white transition-colors">Pricing</Link>
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
        <div className="max-w-6xl mx-auto px-6 pt-16 flex flex-col lg:flex-row items-center justify-between gap-12 z-10 relative">
          <div className="text-left space-y-6 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800">
              System v4.0 Active
            </span>
            <h1 className="text-5xl md:text-6xl font-heading font-extrabold tracking-tight leading-tight text-white">
              Go QueueLess.
            </h1>
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed max-w-lg">
              Engineered for enterprise scale. Achieve frictionless efficiency with an automated visitor flow system that eliminates physical wait times and maximizes operational throughput.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/signup"
                className="bg-white hover:bg-zinc-250 text-black font-bold text-xs px-6 py-3 rounded-lg text-center transition-all shadow-md cursor-pointer"
              >
                Deploy Infrastructure
              </Link>
              <Link
                href="/login"
                className="bg-black hover:bg-zinc-900 border border-zinc-800 text-white font-semibold text-xs px-6 py-3 rounded-lg text-center transition-all cursor-pointer"
              >
                View Documentation
              </Link>
            </div>
          </div>

          {/* Stats indicators on Hero */}
          <div className="w-full lg:w-auto space-y-6 text-left shrink-0">
            <div className="border-t border-zinc-800 pt-4 max-w-[240px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-550 block">Throughput</span>
              <span className="text-3xl font-heading font-extrabold text-white block mt-1">+94%</span>
              <span className="text-[10px] text-zinc-500 mt-1 block">Increase in hourly capacity during peak loads.</span>
            </div>

            <div className="border-t border-zinc-800 pt-4 max-w-[240px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-550 block">Latency</span>
              <span className="text-3xl font-heading font-extrabold text-white block mt-1">&lt;12ms</span>
              <span className="text-[10px] text-zinc-500 mt-1 block">Average update speed for global sync nodes.</span>
            </div>
          </div>
        </div>

        {/* 2. Monitor Mockup Canvas */}
        <div className="max-w-4xl mx-auto px-6 mt-16 z-10 relative">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-2xl relative">
            {/* Monitor Outer frame */}
            <div className="bg-zinc-900 border border-zinc-850 rounded-xl overflow-hidden shadow-inner aspect-[16/10] flex flex-col">
              {/* Fake dashboard window */}
              <div className="bg-zinc-950 flex-1 flex flex-col text-left p-4 space-y-4 font-mono text-[9px] text-zinc-400 select-none">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="font-bold text-white">QUEUELESS // FRICTIONLESS EFFICIENCY</span>
                  <span className="text-zinc-650">SYSTEM_ONLINE_200_OK</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-white">
                  <div className="bg-zinc-900/60 p-2 border border-zinc-850 rounded">
                    <span>ACTIVE QUEUES</span>
                    <span className="text-lg font-bold block text-white mt-1">48</span>
                  </div>
                  <div className="bg-zinc-900/60 p-2 border border-zinc-850 rounded">
                    <span>AVG. WAIT TIME</span>
                    <span className="text-lg font-bold block text-white mt-1">3m 12s</span>
                  </div>
                  <div className="bg-zinc-900/60 p-2 border border-zinc-850 rounded">
                    <span>SERVICE LEVEL</span>
                    <span className="text-lg font-bold block text-white mt-1">96.7%</span>
                  </div>
                  <div className="bg-zinc-900/60 p-2 border border-zinc-850 rounded">
                    <span>DROP RATE</span>
                    <span className="text-lg font-bold block text-white mt-1">1.1%</span>
                  </div>
                </div>
                {/* Fake line charts / entries list illustration */}
                <div className="flex-1 bg-zinc-900/30 border border-zinc-900 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-white font-bold pb-1 border-b border-zinc-900">
                    <span>LIVE QUEUE FEED</span>
                    <span>UPDATES_ACTIVE</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900/50 pb-1">
                    <span>Queue ID</span>
                    <span>Location</span>
                    <span>Status</span>
                    <span>Wait Time</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Queueless</span>
                    <span>Service Aisle</span>
                    <span className="text-emerald-500">Active</span>
                    <span>04:12</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Queueless</span>
                    <span>Service Aisle</span>
                    <span className="text-emerald-500">Active</span>
                    <span>06:45</span>
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
      <section className="max-w-6xl mx-auto w-full px-6 py-20 text-center space-y-12">
        <div className="space-y-3 max-w-2xl mx-auto text-left md:text-center">
          <h2 className="text-3xl font-heading font-extrabold tracking-tight text-foreground">
            Built for High-Pressure Environments
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our architecture prioritizes data clarity and systematic order, ensuring your staff remains in absolute control.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border p-6 rounded-2xl text-left space-y-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground">
              <QrCode className="size-5" />
            </div>
            <h3 className="font-heading font-bold text-foreground text-lg">
              Smart QR
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dynamic entry points that adapt to load capacity and tenant-specific rules automatically.
            </p>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl text-left space-y-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground">
              <Shield className="size-5" />
            </div>
            <h3 className="font-heading font-bold text-foreground text-lg">
              Tenant Isolation
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cryptographically separated environments for enterprise clients with zero cross-pollination of data.
            </p>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl text-left space-y-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground">
              <RefreshCw className="size-5 animate-spin-slow" />
            </div>
            <h3 className="font-heading font-bold text-foreground text-lg">
              Real-time Updates
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Low-latency websocket architecture providing millisecond-level precision across all devices.
            </p>
          </div>
        </div>
      </section>

      {/* 4. GRAY STATISTICS BANNER */}
      <div className="bg-muted/50 border-y border-border py-10 select-none">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <span className="text-3xl font-heading font-extrabold text-foreground block">500M+</span>
            <span className="text-[9px] font-heading font-bold uppercase tracking-wider text-muted-foreground mt-1 block">Visitors Served</span>
          </div>
          <div>
            <span className="text-3xl font-heading font-extrabold text-foreground block">99.99%</span>
            <span className="text-[9px] font-heading font-bold uppercase tracking-wider text-muted-foreground mt-1 block">Uptime Record</span>
          </div>
          <div>
            <span className="text-3xl font-heading font-extrabold text-foreground block">120+</span>
            <span className="text-[9px] font-heading font-bold uppercase tracking-wider text-muted-foreground mt-1 block">Global Regions</span>
          </div>
          <div>
            <span className="text-3xl font-heading font-extrabold text-foreground block">&lt;1s</span>
            <span className="text-[9px] font-heading font-bold uppercase tracking-wider text-muted-foreground mt-1 block">Sync Latency</span>
          </div>
        </div>
      </div>

      {/* 5. LANDING FOOTER */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-8 text-left text-xs">
          <div className="space-y-3">
            <span className="text-base font-heading font-extrabold text-foreground">
              QueueLess
            </span>
            <p className="text-muted-foreground max-w-xs leading-relaxed">
              © {new Date().getFullYear()} QueueLess Inc. Frictionless Efficiency. Enterprise-grade waiting list infrastructure for a world that can&apos;t wait.
            </p>
          </div>

          <div className="flex gap-16">
            <div className="space-y-3">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-foreground">Legal</span>
              <ul className="space-y-2 text-muted-foreground font-medium">
                <li><Link href="#" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-foreground">Terms of Service</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-foreground">Connect</span>
              <ul className="space-y-2 text-muted-foreground font-medium">
                <li><Link href="#" className="hover:text-foreground">Security</Link></li>
                <li><Link href="#" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
