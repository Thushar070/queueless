import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QueueService } from "@/lib/services/queue-service";
import { UserRole } from "@prisma/client";

interface RouteContext {
  params: Promise<{ queueId: string }>;
}

/**
 * POST /api/queues/[queueId]/call-next
 * Guardo/staff endpoint to call the next WAITING customer.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId || !session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { queueId } = await context.params;
    const actor = { id: session.user.id, role: session.user.role as UserRole };

    const updatedEntry = await QueueService.callNextEntry(
      session.user.businessId,
      queueId,
      actor
    );

    return NextResponse.json(updatedEntry);
  } catch (error: unknown) {
    console.error("Failed to call next entry:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Queue not found or unauthorized") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "No customer in the queue") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
