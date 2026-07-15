import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AnalyticsService } from "@/lib/services/analytics-service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metrics = await AnalyticsService.getMetrics(session.user.businessId);
    return NextResponse.json(metrics);
  } catch (error: unknown) {
    console.error("Failed to fetch analytics metrics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
