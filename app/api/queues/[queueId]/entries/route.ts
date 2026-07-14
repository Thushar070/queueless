import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QueueEntryStatus } from "@prisma/client";

interface RouteContext {
  params: Promise<{ queueId: string }>;
}

/**
 * GET /api/queues/[queueId]/entries
 * Guarded/staff endpoint to fetch active queue entries (WAITING, CALLED, SERVING).
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { queueId } = await context.params;

    // Verify queue ownership
    const queue = await prisma.queue.findFirst({
      where: { id: queueId, businessId: session.user.businessId, deletedAt: null },
    });
    if (!queue) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

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
        { status: "desc" }, // Put SERVING/CALLED at specific visual orders if needed, but client will filter them.
        { position: "asc" },
        { joinedAt: "asc" },
      ],
    });

    return NextResponse.json(entries);
  } catch (error: unknown) {
    console.error("Failed to fetch active entries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
