import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PhoneVerificationService } from "@/lib/services/phone-verification-service";
import { z } from "zod";

const verifySchema = z.object({
  code: z.string().length(6, "Verification code must be exactly 6 digits").regex(/^\d+$/, "Code must contain digits only"),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { code } = result.data;
    const verificationResult = await PhoneVerificationService.verifyOtp(
      session.user.businessId,
      code,
      session.user.id
    );

    if (!verificationResult.success) {
      return NextResponse.json({ error: verificationResult.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to verify OTP:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
