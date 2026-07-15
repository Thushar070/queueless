import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/crypto";
import { createStaffSchema } from "@/lib/validation/staff";
import { UserRole } from "@prisma/client";
import crypto from "crypto";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId || session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findMany({
      where: {
        businessId: session.user.businessId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(staff);
  } catch (error: unknown) {
    console.error("Failed to fetch staff list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId || session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createStaffSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, role } = result.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already registered
    const existing = await prisma.staff.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.deletedAt === null) {
        return NextResponse.json({ error: "Email is already registered" }, { status: 400 });
      }
      return NextResponse.json(
        { error: "Email is already in use by a deleted/inactive staff account" },
        { status: 400 }
      );
    }

    // Generate random temporary password
    const tempPassword = crypto.randomBytes(6).toString("hex");
    const passwordHash = await hashPassword(tempPassword);

    const newStaff = await prisma.staff.create({
      data: {
        businessId: session.user.businessId,
        name,
        email: normalizedEmail,
        role: role as UserRole,
        passwordHash,
        mustChangePassword: true,
      },
    });

    // Write AuditLog for STAFF_CREATED
    await prisma.auditLog.create({
      data: {
        businessId: session.user.businessId,
        actorId: session.user.id,
        actorRole: session.user.role as UserRole,
        action: "STAFF_CREATED",
        targetType: "Staff",
        targetId: newStaff.id,
        metadata: {
          name,
          email,
          role,
        },
      },
    });

    return NextResponse.json(
      {
        id: newStaff.id,
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        mustChangePassword: newStaff.mustChangePassword,
        tempPassword, // Returned once on-screen
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Failed to create staff member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
