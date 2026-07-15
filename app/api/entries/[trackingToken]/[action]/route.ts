import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QueueService } from "@/lib/services/queue-service";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface RouteContext {
  params: Promise<{
    trackingToken: string;
    action: string;
  }>;
}

/**
 * POST /api/entries/[trackingToken]/[action]
 * Staff-only actions on specific queue entries: call, skip, cancel, serving, complete, move-to-top.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId || !session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trackingToken, action } = await context.params;
    const actor = { id: session.user.id, role: session.user.role as UserRole };
    const businessId = session.user.businessId;

    // 1. Fetch entry first by id or trackingToken to verify businessId and obtain queueId
    const entry = await prisma.queueEntry.findFirst({
      where: {
        OR: [
          { id: trackingToken },
          { trackingToken: trackingToken },
        ],
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Queue entry not found" }, { status: 404 });
    }

    if (entry.businessId !== businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const queueId = entry.queueId;
    let result;

    // 2. Delegate to the correct service method based on action, using the entry primary key ID
    switch (action) {
      case "call":
        result = await QueueService.callSpecificEntry(businessId, queueId, entry.id, actor);
        break;
      case "skip":
        result = await QueueService.skipEntry(businessId, queueId, entry.id, actor);
        break;
      case "cancel":
        result = await QueueService.cancelEntryByStaff(businessId, queueId, entry.id, actor);
        break;
      case "serving":
        result = await QueueService.startServingEntry(businessId, queueId, entry.id, actor);
        break;
      case "complete":
        result = await QueueService.completeServingEntry(businessId, queueId, entry.id, actor);
        break;
      case "move-to-top":
        result = await QueueService.moveToTop(businessId, queueId, entry.id, actor);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Staff entry action failed:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    if (
      message.includes("not found") ||
      message.includes("cannot be") ||
      message.includes("only allowed") ||
      message.includes("Unauthorized") ||
      message.includes("Invalid transition")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
