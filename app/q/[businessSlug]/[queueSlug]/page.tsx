import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import JoinForm from "@/components/join-form";

interface PublicQueuePageProps {
  params: Promise<{
    businessSlug: string;
    queueSlug: string;
  }>;
}

export default async function PublicQueuePage({ params }: PublicQueuePageProps) {
  const { businessSlug, queueSlug } = await params;

  // Fetch the queue and its parent business, ensuring it's not soft-deleted
  const queue = await prisma.queue.findFirst({
    where: {
      slug: queueSlug,
      deletedAt: null,
      business: {
        slug: businessSlug,
      },
    },
    include: {
      business: true,
    },
  });

  if (!queue) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-6 relative overflow-hidden select-none">
      {/* Sleek B&W grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      {/* Subtle minimalist background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl p-8 backdrop-blur-md shadow-2xl text-center space-y-6 z-10 relative">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-300 font-bold bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
            Virtual Line
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-4 tracking-tight">
            {queue.business.name}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Welcome to our queue registration page</p>
        </div>

        <div className="bg-black border border-zinc-900 rounded-xl p-6 text-left space-y-4">
          <div>
            <span className="text-xs text-zinc-550 block font-semibold uppercase tracking-wider">Queue Name</span>
            <span className="text-lg font-bold text-zinc-200">{queue.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-zinc-550 block font-semibold uppercase tracking-wider">Status</span>
              <span className={`inline-flex items-center gap-1.5 text-sm font-bold mt-0.5 ${
                queue.status === "OPEN" ? "text-emerald-400" : "text-amber-400"
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  queue.status === "OPEN" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`} />
                {queue.status}
              </span>
            </div>
            <div>
              <span className="text-xs text-zinc-550 block font-semibold uppercase tracking-wider">Est. Wait</span>
              <span className="text-sm font-bold text-zinc-200 mt-0.5">
                {queue.avgServiceTimeMin} min / person
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-900">
          {queue.status === "OPEN" ? (
            <JoinForm queueId={queue.id} />
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-4 rounded-xl font-medium">
              ⚠️ This queue is currently closed. Registration is unavailable.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
