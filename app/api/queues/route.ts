import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QueueService } from "@/lib/services/queue-service";
import { ZodError } from "zod";

/**
 * GET /api/queues
 * Retrieves all queues for the authenticated user's business.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const queues = await QueueService.getQueues(session.user.businessId);
    return NextResponse.json(queues);
  } catch (error) {
    console.error("Failed to fetch queues:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/queues
 * Creates a new queue for the authenticated user's business.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newQueue = await QueueService.createQueue(session.user.businessId, body);

    return NextResponse.json(newQueue, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create queue:", error);
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
