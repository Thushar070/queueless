import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/validation/signup";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/crypto";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const {
      businessName,
      businessSlug,
      businessEmail,
      businessPhone,
      ownerName,
      ownerEmail,
      password,
    } = result.data;

    const normalizedOwnerEmail = ownerEmail.trim().toLowerCase();
    const normalizedBusinessEmail = businessEmail.trim().toLowerCase();

    // 1. Check for email uniqueness in Staff table
    const existingStaff = await prisma.staff.findUnique({
      where: { email: normalizedOwnerEmail },
    });
    if (existingStaff) {
      return NextResponse.json(
        { error: "Owner email is already registered" },
        { status: 400 }
      );
    }

    // 2. Check for slug uniqueness in Business table
    const existingSlug = await prisma.business.findUnique({
      where: { slug: businessSlug },
    });
    if (existingSlug) {
      return NextResponse.json(
        { error: "Business slug is already taken" },
        { status: 400 }
      );
    }

    // 3. Check for business email uniqueness
    const existingBusinessEmail = await prisma.business.findUnique({
      where: { email: normalizedBusinessEmail },
    });
    if (existingBusinessEmail) {
      return NextResponse.json(
        { error: "Business email is already registered" },
        { status: 400 }
      );
    }

    // 4. Hash the owner's password
    const passwordHash = await hashPassword(password);

    // 5. Execute transaction atomically
    const { business, owner } = await prisma.$transaction(async (tx) => {
      const businessCreated = await tx.business.create({
        data: {
          name: businessName,
          slug: businessSlug,
          email: normalizedBusinessEmail,
          phone: businessPhone || null,
          status: "ACTIVE",
        },
      });

      const ownerCreated = await tx.staff.create({
        data: {
          businessId: businessCreated.id,
          name: ownerName,
          email: normalizedOwnerEmail,
          passwordHash,
          role: "BUSINESS_OWNER",
        },
      });

      return { business: businessCreated, owner: ownerCreated };
    });

    return NextResponse.json(
      {
        message: "Business and owner successfully registered",
        businessId: business.id,
        ownerId: owner.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A record with this slug or email already exists" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
