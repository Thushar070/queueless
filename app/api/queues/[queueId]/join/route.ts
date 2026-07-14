import { NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue-service";
import { ZodError } from "zod";
import { joinInputSchema } from "@/lib/validation/join";

interface RouteContext {
  params: Promise<{ queueId: string }>;
}

/**
 * POST /api/queues/[queueId]/join
 * Public endpoint to join a virtual queue.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { queueId } = await context.params;
    const body = await request.json();

    const validated = joinInputSchema.parse(body);

    const entry = await QueueService.joinQueue(queueId, {
      customerName: validated.customerName,
      customerPhone: validated.customerPhone,
      customerEmail: validated.customerEmail || null,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to join queue:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    // Check for duplicate or capacity errors
    if (message === "You are already in this queue" || message === "Queue capacity limit has been reached" || message === "Queue is closed") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
