import { NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue-service";

interface RouteContext {
  params: Promise<{ trackingToken: string }>;
}

/**
 * POST /api/entries/[trackingToken]/cancel
 * Public self-cancellation endpoint for customers.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { trackingToken } = await context.params;

    const updated = await QueueService.cancelEntry(trackingToken);

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Failed to cancel entry:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Queue entry not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Self-cancellation is only allowed while WAITING" || message.includes("illegal")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
