import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import JoinForm from "@/components/join-form";
import ThemeToggle from "@/components/theme-toggle";

interface PublicQueuePageProps {
  params: Promise<{
    businessSlug: string;
    queueSlug: string;
  }>;
}

export default async function PublicQueuePage({ params }: PublicQueuePageProps) {
  const { businessSlug, queueSlug } = await params;

  // Fetch the queue and its parent business, ensuring neither is soft-deleted
  const queue = await prisma.queue.findFirst({
    where: {
      slug: queueSlug,
      deletedAt: null,
      business: {
        slug: businessSlug,
        deletedAt: null,
      },
    },
    include: {
      business: true,
    },
  });

  if (!queue) {
    notFound();
  }

  // Handle suspended business lockout
  if (queue.business.status === "SUSPENDED") {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-6 relative overflow-hidden select-none">
        {/* Theme Toggle Container in top right */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        {/* Sleek light grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm text-center space-y-4 z-10 relative">
          <h1 className="text-2xl font-heading font-bold text-destructive">Temporarily Unavailable</h1>
          <p className="text-muted-foreground text-sm">
            This business is currently suspended. Please contact business administration for more details.
          </p>
        </div>
      </main>
    );
  }

  // 1. Proactive Capacity check
  let isAtCapacity = false;
  if (queue.maxCapacity !== null) {
    const activeCount = await prisma.queueEntry.count({
      where: { queueId: queue.id, status: "WAITING" },
    });
    isAtCapacity = activeCount >= queue.maxCapacity;
  }

  // 2. Proactive Working hours check (Queue-level schedule takes precedence over Business fallback)
  let isOutsideHours = false;
  const whStart = queue.workingHoursStart ?? queue.business.workingHoursStart;
  const whEnd = queue.workingHoursEnd ?? queue.business.workingHoursEnd;

  if (whStart && whEnd) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentTime = `${hours}:${minutes}`;

    if (currentTime < whStart || currentTime > whEnd) {
      isOutsideHours = true;
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-6 relative overflow-hidden select-none">
      {/* Theme Toggle Container in top right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      {/* Sleek light grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      {/* Subtle minimalist background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm text-center space-y-6 z-10 relative">
        <div>
          <span className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground font-bold bg-muted border border-border px-3 py-1 rounded-full">
            Virtual Line
          </span>
          <h1 className="text-3xl font-heading font-extrabold text-foreground mt-4 tracking-tight">
            {queue.business.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome to our queue registration page</p>
        </div>

        <div className="bg-muted/30 border border-border rounded-xl p-6 text-left space-y-4">
          <div>
            <span className="text-[10px] font-heading text-muted-foreground block font-bold uppercase tracking-wider">Queue Name</span>
            <span className="text-lg font-bold text-foreground">{queue.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-heading text-muted-foreground block font-bold uppercase tracking-wider">Status</span>
              <span className={`inline-flex items-center gap-1.5 text-sm font-bold mt-0.5 ${
                queue.status === "OPEN" && !isAtCapacity && !isOutsideHours ? "text-emerald-600" : "text-amber-600"
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  queue.status === "OPEN" && !isAtCapacity && !isOutsideHours ? "bg-emerald-500 animate-pulse" : "bg-amber-550"
                }`} />
                {queue.status === "OPEN" && !isAtCapacity && !isOutsideHours ? "OPEN" : "CLOSED"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-heading text-muted-foreground block font-bold uppercase tracking-wider">Est. Wait</span>
              <span className="text-sm font-bold text-foreground mt-0.5">
                {queue.avgServiceTimeMin} min / person
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          {queue.status !== "OPEN" ? (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs px-4 py-4 rounded-xl font-medium">
              ⚠️ This queue is currently closed. Registration is unavailable.
            </div>
          ) : isAtCapacity ? (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs px-4 py-4 rounded-xl font-medium">
              ⚠️ This queue is closed because it has reached its maximum capacity.
            </div>
          ) : isOutsideHours ? (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-650 text-xs px-4 py-4 rounded-xl font-medium">
              ⚠️ This queue is closed outside scheduled working hours ({whStart} - {whEnd}).
            </div>
          ) : (
            <JoinForm queueId={queue.id} />
          )}
        </div>
      </div>
    </main>
  );
}
