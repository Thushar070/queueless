import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QueueEntryStatus } from "@prisma/client";
import StaffQueueDashboard from "@/components/staff-queue-dashboard";

interface QueueDetailPageProps {
  params: Promise<{
    queueId: string;
  }>;
}

export default async function QueueDetailPage({ params }: QueueDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    redirect("/login");
  }

  const { queueId } = await params;

  // 1. Fetch queue and verify business ownership
  const queue = await prisma.queue.findFirst({
    where: {
      id: queueId,
      businessId: session.user.businessId,
      deletedAt: null,
    },
  });

  if (!queue) {
    notFound();
  }

  // 2. Fetch initial active entries (WAITING, CALLED, SERVING)
  const entries = await prisma.queueEntry.findMany({
    where: {
      queueId,
      status: {
        in: [
          QueueEntryStatus.WAITING,
          QueueEntryStatus.CALLED,
          QueueEntryStatus.SERVING,
        ],
      },
    },
    orderBy: [
      { position: "asc" },
      { joinedAt: "asc" },
    ],
  });

  // Serialize initial entries to avoid prop transfer warnings (e.g. converting Dates to string)
  const serializedEntries = entries.map((entry) => ({
    id: entry.id,
    customerName: entry.customerName,
    customerPhone: entry.customerPhone,
    customerEmail: entry.customerEmail,
    position: entry.position,
    status: entry.status,
    joinedAt: entry.joinedAt.toISOString(),
    calledAt: entry.calledAt ? entry.calledAt.toISOString() : null,
    servingAt: entry.servingAt ? entry.servingAt.toISOString() : null,
  }));

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Simple Navigation back to Queues */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/queues"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            ← Back to Queues List
          </Link>
        </div>

        <StaffQueueDashboard
          queueId={queueId}
          queueName={queue.name}
          initialEntries={serializedEntries}
          supabaseUrl={supabaseUrl}
          supabaseAnonKey={supabaseAnonKey}
        />
      </div>
    </main>
  );
}
