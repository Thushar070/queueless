import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { HermesRelayService } from "./hermes-relay-service";

export class PhoneVerificationService {
  /**
   * Generates a 6-digit OTP, hashes it, stores it, and sends it via HermesRelayService.
   * Enforces a rate limit of max 3 sends per hour per phone number.
   */
  static async requestOtp(businessId: string, rawPhone: string): Promise<{ success: boolean; error?: string }> {
    const normalizedPhone = HermesRelayService.validateAndNormalizePhone(rawPhone);
    if (!normalizedPhone) {
      return { success: false, error: "Invalid Indian phone number format." };
    }

    try {
      // Enforce rate limit: max 3 sends/hour per phone
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentSendsCount = await prisma.phoneVerification.count({
        where: {
          phone: normalizedPhone,
          createdAt: { gte: oneHourAgo },
        },
      });

      if (recentSendsCount >= 3) {
        return {
          success: false,
          error: "Too many verification requests. You can request up to 3 codes per hour. Please try again later.",
        };
      }

      // Generate 6-digit OTP code (100000 - 999999)
      const code = crypto.randomInt(100000, 1000000).toString();
      const codeHash = crypto.createHash("sha256").update(code).digest("hex");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      // Save PhoneVerification record in DB
      await prisma.phoneVerification.create({
        data: {
          businessId,
          phone: normalizedPhone,
          codeHash,
          expiresAt,
        },
      });

      // Send the SMS message
      const messageText = `Your QueueLess verification code is ${code}. Expires in 10 minutes.`;
      const result = await HermesRelayService.sendSms(normalizedPhone, messageText);

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to deliver SMS. Please try again.",
        };
      }

      return { success: true };
    } catch (error: unknown) {
      console.error("[PhoneVerificationService] Error requesting OTP:", error);
      return { success: false, error: "Internal server error during OTP request." };
    }
  }

  /**
   * Verifies an OTP code for a business.
   * Enforces attempt limits (max 5 verification attempts per OTP).
   * Performs constant-time comparison.
   * On success, marks the business as verified and logs the audit log in a transaction.
   */
  static async verifyOtp(
    businessId: string,
    code: string,
    actorId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find the latest unexpired phone verification for this business
      const latestVerification = await prisma.phoneVerification.findFirst({
        where: {
          businessId,
          expiresAt: { gte: new Date() },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!latestVerification) {
        return {
          success: false,
          error: "No active verification code found. Please request a new code.",
        };
      }

      // Enforce attempt limits: max 5 verify attempts per OTP
      if (latestVerification.attempts >= 5) {
        return {
          success: false,
          error: "Maximum verification attempts exceeded. Please request a new code.",
        };
      }

      // Increment attempt count in database
      const updatedVerification = await prisma.phoneVerification.update({
        where: { id: latestVerification.id },
        data: {
          attempts: { increment: 1 },
        },
      });

      // Constant-time hash comparison
      const incomingHash = crypto.createHash("sha256").update(code).digest("hex");
      const expectedHash = latestVerification.codeHash;

      const expectedBuffer = Buffer.from(expectedHash, "hex");
      const incomingBuffer = Buffer.from(incomingHash, "hex");

      const isMatch =
        expectedBuffer.length === incomingBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, incomingBuffer);

      if (!isMatch) {
        const remaining = 5 - updatedVerification.attempts;
        return {
          success: false,
          error: `Incorrect code. ${remaining} attempts remaining.`,
        };
      }

      // Successfully verified. Mark business as verified and write audit log in a transaction
      await prisma.$transaction(async (tx) => {
        // Update Business
        await tx.business.update({
          where: { id: businessId },
          data: {
            phone: latestVerification.phone,
            phoneVerifiedAt: new Date(),
          },
        });

        // Write AuditLog
        await tx.auditLog.create({
          data: {
            businessId,
            actorId,
            actorRole: "BUSINESS_OWNER",
            action: "PHONE_VERIFIED",
            targetType: "Business",
            targetId: businessId,
            metadata: { phone: latestVerification.phone },
          },
        });

        // Expire the verification record immediately
        await tx.phoneVerification.update({
          where: { id: latestVerification.id },
          data: { expiresAt: new Date() },
        });
      });

      return { success: true };
    } catch (error: unknown) {
      console.error("[PhoneVerificationService] Error verifying OTP:", error);
      return { success: false, error: "Internal server error during verification." };
    }
  }
}
