import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QueueService } from "@/lib/services/queue-service";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface RouteContext {
  params: Promise<{ trackingToken: string }>;
}

/**
 * POST /api/entries/[trackingToken]/cancel
 * Supports both public self-cancellation (customers) and authenticated staff cancellation.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { trackingToken } = await context.params;

    // Fetch the entry first to verify boundaries
    const entry = await prisma.queueEntry.findUnique({
      where: { id: trackingToken },
    });

    if (!entry) {
      return NextResponse.json({ error: "Queue entry not found" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);

    if (session?.user?.businessId && session?.user?.id && session?.user?.role) {
      // 1. Authenticated staff cancellation path
      if (entry.businessId !== session.user.businessId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const actor = { id: session.user.id, role: session.user.role as UserRole };
      const updated = await QueueService.cancelEntryByStaff(
        session.user.businessId,
        entry.queueId,
        trackingToken,
        actor
      );

      return NextResponse.json(updated);
    }

    // 2. Public self-cancellation path (Customer)
    if (entry.status !== "WAITING") {
      return NextResponse.json(
        { error: "Self-cancellation is only allowed while WAITING" },
        { status: 400 }
      );
    }

    const updated = await QueueService.cancelEntry(trackingToken);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Failed to cancel entry:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
