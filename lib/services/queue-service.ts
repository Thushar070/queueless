import QRCode from "qrcode";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createQueueSchema,
  updateQueueSchema,
  CreateQueueInput,
  UpdateQueueInput,
} from "@/lib/validation/queue";

export class QueueService {
  /**
   * Helper to slugify a string.
   */
  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Generates a unique slug for a queue within a business, taking soft and hard deleted rows into account
   * to avoid database unique constraint violations.
   */
  private static async generateUniqueSlug(
    tx: Prisma.TransactionClient,
    businessId: string,
    name: string
  ): Promise<string> {
    let baseSlug = this.slugify(name);
    if (baseSlug === "") {
      baseSlug = "queue";
    }
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const existing = await tx.queue.findFirst({
        where: { businessId, slug },
      });
      if (!existing) {
        break;
      }
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    return slug;
  }

  /**
   * Creates a new queue, generates its unique slug and its QR code, and saves it.
   */
  static async createQueue(businessId: string, input: CreateQueueInput) {
    // 1. Validate Input
    const validated = createQueueSchema.parse(input);

    // 2. Fetch business details for slug routing
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      throw new Error("Business not found");
    }

    return await prisma.$transaction(async (tx) => {
      // 3. Generate unique slug
      const slug = await this.generateUniqueSlug(tx, businessId, validated.name);

      // 4. Generate QR code
      const domain = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const qrUrl = `${domain}/q/${business.slug}/${slug}`;
      const qrCodeUrl = await QRCode.toDataURL(qrUrl);

      // 5. Save to database
      return await tx.queue.create({
        data: {
          businessId,
          name: validated.name,
          slug,
          avgServiceTimeMin: validated.avgServiceTimeMin,
          maxCapacity: validated.maxCapacity ?? null,
          workingHoursStart: validated.workingHoursStart || null,
          workingHoursEnd: validated.workingHoursEnd || null,
          qrCodeUrl,
          status: "OPEN",
        },
      });
    });
  }

  /**
   * Updates an existing queue. If the name changes, we do NOT automatically regenerate the slug
   * to avoid breaking printed/existing QR codes, unless explicitly requested.
   */
  static async updateQueue(businessId: string, queueId: string, input: UpdateQueueInput) {
    const validated = updateQueueSchema.parse(input);

    // Verify ownership
    const existing = await prisma.queue.findFirst({
      where: { id: queueId, businessId },
    });
    if (!existing) {
      throw new Error("Queue not found or unauthorized");
    }

    return await prisma.queue.update({
      where: { id: queueId },
      data: {
        name: validated.name,
        avgServiceTimeMin: validated.avgServiceTimeMin,
        maxCapacity: validated.maxCapacity !== undefined ? validated.maxCapacity : undefined,
        workingHoursStart:
          validated.workingHoursStart !== undefined ? validated.workingHoursStart || null : undefined,
        workingHoursEnd:
          validated.workingHoursEnd !== undefined ? validated.workingHoursEnd || null : undefined,
      },
    });
  }

  /**
   * Toggles the queue status between OPEN and CLOSED.
   */
  static async toggleQueueStatus(businessId: string, queueId: string) {
    // Verify ownership
    const existing = await prisma.queue.findFirst({
      where: { id: queueId, businessId },
    });
    if (!existing) {
      throw new Error("Queue not found or unauthorized");
    }

    const newStatus = existing.status === "OPEN" ? "CLOSED" : "OPEN";

    return await prisma.queue.update({
      where: { id: queueId },
      data: { status: newStatus },
    });
  }

  /**
   * Soft-deletes a queue by setting its deletedAt timestamp.
   */
  static async deleteQueue(businessId: string, queueId: string) {
    // Verify ownership
    const existing = await prisma.queue.findFirst({
      where: { id: queueId, businessId },
    });
    if (!existing) {
      throw new Error("Queue not found or unauthorized");
    }

    return await prisma.queue.update({
      where: { id: queueId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Retrieves all non-deleted queues for a business.
   */
  static async getQueues(businessId: string) {
    return await prisma.queue.findMany({
      where: {
        businessId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Regenerates a queue's QR code. Useful if the domain configuration or slug changes.
   */
  static async regenerateQrCode(businessId: string, queueId: string) {
    const queue = await prisma.queue.findFirst({
      where: { id: queueId, businessId },
      include: { business: true },
    });
    if (!queue) {
      throw new Error("Queue not found or unauthorized");
    }

    const domain = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const qrUrl = `${domain}/q/${queue.business.slug}/${queue.slug}`;
    const qrCodeUrl = await QRCode.toDataURL(qrUrl);

    return await prisma.queue.update({
      where: { id: queueId },
      data: { qrCodeUrl },
    });
  }
}
