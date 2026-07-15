import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSettingsSchema } from "@/lib/validation/settings";
import { UserRole } from "@prisma/client";
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json(business);
  } catch (error: unknown) {
    console.error("Failed to fetch business settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId || session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Normalize empty strings to null for nullable fields
    const normalized = {
      ...body,
      phone: body.phone === "" ? null : body.phone,
      workingHoursStart: body.workingHoursStart === "" ? null : body.workingHoursStart,
      workingHoursEnd: body.workingHoursEnd === "" ? null : body.workingHoursEnd,
    };

    const result = updateSettingsSchema.safeParse(normalized);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, phone, workingHoursStart, workingHoursEnd } = result.data;

    // Update business profile
    const updated = await prisma.business.update({
      where: { id: session.user.businessId },
      data: {
        name,
        phone: phone || null,
        workingHoursStart: workingHoursStart || null,
        workingHoursEnd: workingHoursEnd || null,
      },
    });

    // Write AuditLog for BUSINESS_SETTINGS_UPDATED
    await prisma.auditLog.create({
      data: {
        businessId: session.user.businessId,
        actorId: session.user.id,
        actorRole: session.user.role as UserRole,
        action: "BUSINESS_SETTINGS_UPDATED",
        targetType: "Business",
        targetId: session.user.businessId,
        metadata: {
          name,
          phone,
          workingHoursStart,
          workingHoursEnd,
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Failed to update business settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
