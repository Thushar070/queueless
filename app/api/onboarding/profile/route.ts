import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { HermesRelayService } from "@/lib/services/hermes-relay-service";

const profileSchema = z.object({
  phone: z.string().refine((val) => {
    return HermesRelayService.validateAndNormalizePhone(val) !== null;
  }, {
    message: "Invalid Indian mobile number. Must be a 10-digit number starting with 6-9, optionally prefixed with +91 or 91.",
  }),
  address: z.string().min(5, "Address must be at least 5 characters").max(200),
  category: z.string().min(2, "Category must be at least 2 characters").max(50),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId || session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = profileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { phone, address, category } = result.data;
    const normalizedPhone = HermesRelayService.validateAndNormalizePhone(phone)!;

    // Update the business profile details
    await prisma.business.update({
      where: { id: session.user.businessId },
      data: {
        phone: normalizedPhone,
        address: address.trim(),
        category: category.trim(),
        profileCompleted: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to complete onboarding profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
