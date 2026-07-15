import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminBusinessService } from "@/lib/services/admin-business-service";

/**
 * GET /api/admin/businesses
 * List all businesses with pagination
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await AdminBusinessService.listBusinesses(page, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to list businesses:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * POST /api/admin/businesses
 * Trigger administrative actions: suspend, reactivate, or delete
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { businessId, action } = body;

    if (!businessId || !action) {
      return NextResponse.json({ error: "Missing businessId or action" }, { status: 400 });
    }

    let result;
    const actorId = session.user.id;

    switch (action) {
      case "suspend":
        result = await AdminBusinessService.suspendBusiness(businessId, actorId);
        break;
      case "reactivate":
        result = await AdminBusinessService.reactivateBusiness(businessId, actorId);
        break;
      case "delete":
        result = await AdminBusinessService.deleteBusiness(businessId, actorId);
        break;
      default:
        return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to perform admin business action:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
