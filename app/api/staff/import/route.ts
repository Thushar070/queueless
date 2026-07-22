import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/crypto";
import { UserRole } from "@prisma/client";
import { createStaffSchema } from "@/lib/validation/staff";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId || session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileContent = await file.text();
    const lines = fileContent.split(/\r?\n/);

    if (lines.length <= 1) {
      return NextResponse.json({ error: "CSV file is empty or missing headers" }, { status: 400 });
    }

    // Parse headers: expects "name,email,role" or similar order
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf("name");
    const emailIdx = headers.indexOf("email");
    const roleIdx = headers.indexOf("role");

    if (nameIdx === -1 || emailIdx === -1 || roleIdx === -1) {
      return NextResponse.json(
        { error: 'CSV must contain "name", "email", and "role" columns' },
        { status: 400 }
      );
    }

    const results: Array<{ row: number; name?: string; email?: string; status: "success" | "error"; error?: string }> = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // skip empty lines

      // Handle simple CSV splitting (naive split by comma, ignoring nested commas for simplicity as per requirements)
      const cols = line.split(",").map((c) => c.trim());

      // If columns count doesn't match headers, flag error
      if (cols.length < headers.length) {
        results.push({
          row: i + 1,
          status: "error",
          error: "Incomplete row columns",
        });
        errorCount++;
        continue;
      }

      const name = cols[nameIdx];
      const email = cols[emailIdx];
      const role = cols[roleIdx]?.toUpperCase();

      // Validate inputs using our Zod schema
      const parseResult = createStaffSchema.safeParse({ name, email, role });
      if (!parseResult.success) {
        const fieldErrors = parseResult.error.flatten().fieldErrors;
        const msg = Object.entries(fieldErrors)
          .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
          .join("; ");
        results.push({
          row: i + 1,
          name,
          email,
          status: "error",
          error: msg,
        });
        errorCount++;
        continue;
      }

      const normalizedEmail = email.trim().toLowerCase();

      try {
        // Reuse staff creation logic & duplicate email checks
        const existing = await prisma.staff.findUnique({
          where: { email: normalizedEmail },
        });

        if (existing) {
          results.push({
            row: i + 1,
            name,
            email: normalizedEmail,
            status: "error",
            error: existing.deletedAt === null 
              ? "Email is already registered" 
              : "Email is already in use by a deleted/inactive staff account",
          });
          errorCount++;
          continue;
        }

        // Generate random temporary password
        const tempPassword = crypto.randomBytes(6).toString("hex");
        const passwordHash = await hashPassword(tempPassword);

        // Save inside a transaction client to write audit logs atomically
        const newStaff = await prisma.$transaction(async (tx) => {
          const staffCreated = await tx.staff.create({
            data: {
              businessId: session.user.businessId!,
              name,
              email: normalizedEmail,
              role: role as UserRole,
              passwordHash,
              mustChangePassword: true,
            },
          });

          await tx.auditLog.create({
            data: {
              businessId: session.user.businessId,
              actorId: session.user.id,
              actorRole: session.user.role as UserRole,
              action: "STAFF_CREATED",
              targetType: "Staff",
              targetId: staffCreated.id,
              metadata: {
                name,
                email: normalizedEmail,
                role,
                imported: true,
              },
            },
          });

          return staffCreated;
        });

        results.push({
          row: i + 1,
          name: newStaff.name,
          email: newStaff.email,
          status: "success",
        });
        successCount++;
      } catch (rowErr: unknown) {
        console.error(`Error importing row ${i + 1}:`, rowErr);
        const errMsg = rowErr instanceof Error ? rowErr.message : "Database write error";
        results.push({
          row: i + 1,
          name,
          email: normalizedEmail,
          status: "error",
          error: errMsg,
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: successCount + errorCount,
        success: successCount,
        errors: errorCount,
      },
      details: results,
    });
  } catch (error: unknown) {
    console.error("Failed to parse and import staff CSV:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
