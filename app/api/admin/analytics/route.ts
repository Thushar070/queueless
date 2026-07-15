import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AnalyticsService } from "@/lib/services/analytics-service";

/**
 * GET /api/admin/analytics
 * Retrieve platform aggregate analytics metrics
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const metrics = await AnalyticsService.getPlatformMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to retrieve platform analytics:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
