import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSectionSchema = z.object({
  name: z.string().min(2, "Section name must be at least 2 characters").max(100),
});

/**
 * PATCH /api/sections/[sectionId]
 * Renames a section.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sectionId } = await params;
    const body = await request.json();
    const result = updateSectionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = result.data;

    // Verify ownership and check duplicate name
    const existing = await prisma.section.findFirst({
      where: { id: sectionId, businessId: session.user.businessId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const duplicate = await prisma.section.findFirst({
      where: {
        businessId: session.user.businessId,
        name: name.trim(),
        id: { not: sectionId },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "A section with this name already exists" },
        { status: 400 }
      );
    }

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: { name: name.trim() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update section:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/sections/[sectionId]
 * Deletes a section and disassociates it from all queues.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sectionId } = await params;

    // Verify ownership
    const existing = await prisma.section.findFirst({
      where: { id: sectionId, businessId: session.user.businessId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Execute disassociation and deletion atomically
    await prisma.$transaction(async (tx) => {
      // 1. Set sectionId = null on all queues in this section
      await tx.queue.updateMany({
        where: { sectionId },
        data: { sectionId: null },
      });

      // 2. Delete the section
      await tx.section.delete({
        where: { id: sectionId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete section:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
