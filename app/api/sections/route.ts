import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const sectionSchema = z.object({
  name: z.string().min(2, "Section name must be at least 2 characters").max(100),
});

/**
 * GET /api/sections
 * Retrieves all sections for the authenticated user's business.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sections = await prisma.section.findMany({
      where: { businessId: session.user.businessId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(sections);
  } catch (error) {
    console.error("Failed to fetch sections:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/sections
 * Creates a new section for the authenticated user's business.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = sectionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = result.data;

    // Check if a section with the same name already exists in this business
    const existing = await prisma.section.findUnique({
      where: {
        businessId_name: {
          businessId: session.user.businessId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A section with this name already exists" },
        { status: 400 }
      );
    }

    const newSection = await prisma.section.create({
      data: {
        businessId: session.user.businessId,
        name: name.trim(),
      },
    });

    return NextResponse.json(newSection, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create section:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
