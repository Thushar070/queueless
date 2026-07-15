import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QueueService } from "@/lib/services/queue-service";
import { ZodError } from "zod";
import { UserRole } from "@prisma/client";

interface RouteContext {
  params: Promise<{ queueId: string }>;
}

/**
 * PATCH /api/queues/[queueId]
 * Updates queue details or status.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { queueId } = await context.params;
    const body = await request.json();

    if (body.action === "toggle") {
      const updated = await QueueService.toggleQueueStatus(
        session.user.businessId,
        queueId,
        { id: session.user.id, role: session.user.role as UserRole }
      );
      return NextResponse.json(updated);
    }

    if (body.action === "regenerate-qr") {
      const updated = await QueueService.regenerateQrCode(session.user.businessId, queueId);
      return NextResponse.json(updated);
    }

    const updated = await QueueService.updateQueue(session.user.businessId, queueId, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error(`Failed to update queue:`, error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/queues/[queueId]
 * Soft-deletes a queue.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { queueId } = await context.params;
    const deleted = await QueueService.deleteQueue(
      session.user.businessId,
      queueId,
      { id: session.user.id, role: session.user.role as UserRole }
    );

    return NextResponse.json(deleted);
  } catch (error: unknown) {
    console.error(`Failed to delete queue:`, error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
