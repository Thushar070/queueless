import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuditLogService } from "@/lib/services/audit-log-service";

/**
 * GET /api/admin/audit-logs
 * Retrieve platform-wide audit logs with filters and pagination
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const actorId = searchParams.get("actorId") || undefined;
    const action = searchParams.get("action") || undefined;
    const targetType = searchParams.get("targetType") || undefined;
    const targetBusinessId = searchParams.get("targetBusinessId") || undefined;

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const result = await AuditLogService.getPlatformLogs({
      startDate,
      endDate,
      actorId,
      action,
      targetType,
      targetBusinessId,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to retrieve platform audit logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
