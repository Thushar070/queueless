import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * POST /api/signup/business
 * Creates a business and associates it with the authenticated OAuth user.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, slug } = await request.json();
    if (!name || !slug) {
      return NextResponse.json({ error: "Business name and slug are required" }, { status: 400 });
    }

    // Clean slug: lowercase, dash-separated, alphanumeric
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!cleanSlug) {
      return NextResponse.json({ error: "Invalid business slug" }, { status: 400 });
    }

    // Check if slug is already taken
    const existingBusiness = await prisma.business.findUnique({
      where: { slug: cleanSlug },
    });
    if (existingBusiness) {
      return NextResponse.json({ error: "This business URL slug is already taken" }, { status: 400 });
    }

    const userEmail = session.user.email;

    // Check if user already has a staff association
    const existingStaff = await prisma.staff.findUnique({
      where: { email: userEmail },
    });
    if (existingStaff) {
      return NextResponse.json({ error: "Your account is already associated with a business" }, { status: 400 });
    }

    // Create Business and link user as BUSINESS_OWNER
    const result = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: name.trim(),
          slug: cleanSlug,
          email: userEmail,
        },
      });

      const staff = await tx.staff.create({
        data: {
          email: userEmail,
          name: session.user.name || userEmail.split("@")[0],
          role: UserRole.BUSINESS_OWNER,
          businessId: business.id,
        },
      });

      return { business, staff };
    });

    return NextResponse.json({ success: true, businessId: result.business.id });
  } catch (error: unknown) {
    console.error("Failed to onboard business:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
