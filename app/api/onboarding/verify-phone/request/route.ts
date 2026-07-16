import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PhoneVerificationService } from "@/lib/services/phone-verification-service";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
    });

    if (!business || !business.phone) {
      return NextResponse.json({ error: "Business phone number is not configured. Please complete your profile first." }, { status: 400 });
    }

    const result = await PhoneVerificationService.requestOtp(session.user.businessId, business.phone);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to request OTP:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
