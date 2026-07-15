import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface RouteContext {
  params: Promise<{ staffId: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId || session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId } = await context.params;

    if (staffId === session.user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    // Verify staff member belongs to the same business and is active
    const existing = await prisma.staff.findFirst({
      where: { id: staffId, businessId: session.user.businessId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Soft delete
    const deleted = await prisma.staff.update({
      where: { id: staffId },
      data: { deletedAt: new Date() },
    });

    // Write AuditLog for STAFF_REMOVED
    await prisma.auditLog.create({
      data: {
        businessId: session.user.businessId,
        actorId: session.user.id,
        actorRole: session.user.role as UserRole,
        action: "STAFF_REMOVED",
        targetType: "Staff",
        targetId: staffId,
        metadata: {
          name: deleted.name,
          email: deleted.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deleted: { id: deleted.id, name: deleted.name },
    });
  } catch (error: unknown) {
    console.error("Failed to delete staff member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
