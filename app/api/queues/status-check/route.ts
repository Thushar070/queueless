import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/queues/status-check?token=[trackingToken]
 * Public endpoint to poll queue entry status.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing tracking token" }, { status: 400 });
    }

    const entry = await prisma.queueEntry.findUnique({
      where: { trackingToken: token },
    });

    if (!entry) {
      return NextResponse.json({ error: "Queue entry not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: entry.status,
      position: entry.position,
    });
  } catch (error: unknown) {
    console.error("Status check failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
