import QRCode from "qrcode";
import crypto from "crypto";
import { Prisma, QueueEntryStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createQueueSchema,
  updateQueueSchema,
  CreateQueueInput,
  UpdateQueueInput,
} from "@/lib/validation/queue";
import { QueueEntryService } from "./queue-entry-service";
import { NotificationService } from "./notification-service";

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
  static async toggleQueueStatus(
    businessId: string,
    queueId: string,
    actor: { id: string | null; role: UserRole | null } = { id: null, role: null }
  ) {
    // Verify ownership
    const existing = await prisma.queue.findFirst({
      where: { id: queueId, businessId },
    });
    if (!existing) {
      throw new Error("Queue not found or unauthorized");
    }

    const newStatus = existing.status === "OPEN" ? "CLOSED" : "OPEN";

    const updatedQueue = await prisma.queue.update({
      where: { id: queueId },
      data: { status: newStatus },
    });

    if (newStatus === "CLOSED") {
      await this.massCancelWaitingEntries(queueId, actor);
    }

    return updatedQueue;
  }

  /**
   * Soft-deletes a queue by setting its deletedAt timestamp.
   */
  static async deleteQueue(
    businessId: string,
    queueId: string,
    actor: { id: string | null; role: UserRole | null } = { id: null, role: null }
  ) {
    // Verify ownership
    const existing = await prisma.queue.findFirst({
      where: { id: queueId, businessId },
    });
    if (!existing) {
      throw new Error("Queue not found or unauthorized");
    }

    const updated = await prisma.queue.update({
      where: { id: queueId },
      data: { deletedAt: new Date() },
    });

    await this.massCancelWaitingEntries(queueId, actor);

    return updated;
  }

  /**
   * Mass cancels all WAITING entries for a queue and schedules QUEUE_CANCELLED notifications.
   */
  static async massCancelWaitingEntries(
    queueId: string,
    actor: { id: string | null; role: UserRole | null }
  ): Promise<void> {
    const cancelledEntryIds: string[] = [];

    await this.withQueueLock(queueId, async (tx) => {
      const waitingEntries = await tx.queueEntry.findMany({
        where: {
          queueId,
          status: QueueEntryStatus.WAITING,
        },
      });

      for (const entry of waitingEntries) {
        await QueueEntryService.transition(
          entry.id,
          QueueEntryStatus.CANCELLED,
          actor,
          tx
        );
        cancelledEntryIds.push(entry.id);
      }
    });

    for (const entryId of cancelledEntryIds) {
      NotificationService.sendNotification(entryId, "QUEUE_CANCELLED").catch((err) => {
        console.error("Async QUEUE_CANCELLED notification trigger failed:", err);
      });
    }
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

  /**
   * Serializes all queue entry position mutations by acquiring a row lock on the parent Queue
   * and the WAITING entries, then recalculates positions sequentially (1..N).
   */
  static async withQueueLock<T>(
    queueId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    const notifyThreeAwayIds: string[] = [];

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Lock the parent Queue row to serialize operations on empty queues
        await tx.$executeRaw`
          SELECT id FROM "Queue" WHERE id = ${queueId} FOR UPDATE
        `;

        // 2. Lock WAITING entries
        await tx.$executeRaw`
          SELECT id FROM "QueueEntry" WHERE "queueId" = ${queueId} AND status = 'WAITING' FOR UPDATE
        `;

        // 3. Execute the payload mutation
        const res = await fn(tx);

        // 4. Recalculate positions for all remaining WAITING rows sequentially (1..N)
        const activeEntries = await tx.queueEntry.findMany({
          where: {
            queueId,
            status: QueueEntryStatus.WAITING,
          },
          orderBy: [
            { position: "asc" },
            { joinedAt: "asc" },
          ],
        });

        for (let i = 0; i < activeEntries.length; i++) {
          const newPos = i + 1;
          const oldPos = activeEntries[i].position;

          if (newPos === 3 && oldPos > 3 && !activeEntries[i].threeAwayNotifiedAt) {
            notifyThreeAwayIds.push(activeEntries[i].id);
          }

          if (activeEntries[i].position !== newPos) {
            await tx.queueEntry.update({
               where: { id: activeEntries[i].id },
               data: { position: newPos },
            });
          }
        }

        return res;
      },
      {
        maxWait: 25000, // 25 seconds wait time for connection pool
        timeout: 45000, // 45 seconds transaction timeout
      }
    );

    // Asynchronously send THREE_AWAY notifications after transaction commits
    for (const entryId of notifyThreeAwayIds) {
      NotificationService.sendNotification(entryId, "THREE_AWAY").catch((err) => {
        console.error("Async THREE_AWAY notification trigger failed:", err);
      });
    }

    return result;
  }

  /**
   * Joins a customer to a queue, enforcing duplicate prevention rules under the serialization lock.
   */
  static getCurrentTime(): Date {
    return new Date();
  }

  static async joinQueue(
    queueId: string,
    input: { customerName: string; customerPhone: string; customerEmail?: string | null }
  ) {
    // A. Pre-check capacity and working-hours schedule before taking the lock
    const queueConfig = await prisma.queue.findFirst({
      where: { id: queueId, deletedAt: null },
      include: { business: true },
    });

    if (!queueConfig) {
      throw new Error("Queue not found");
    }

    if (queueConfig.status !== "OPEN") {
      throw new Error("Queue is closed");
    }

    // 1. Pre-check Capacity Limits
    if (queueConfig.maxCapacity !== null) {
      const activeCount = await prisma.queueEntry.count({
        where: { queueId, status: QueueEntryStatus.WAITING },
      });
      if (activeCount >= queueConfig.maxCapacity) {
        throw new Error("closed (at capacity)");
      }
    }

    // 2. Pre-check Working Hours schedule (Queue-level takes precedence, fall back to Business-level)
    const whStart = queueConfig.workingHoursStart ?? queueConfig.business.workingHoursStart;
    const whEnd = queueConfig.workingHoursEnd ?? queueConfig.business.workingHoursEnd;

    if (whStart && whEnd) {
      const now = this.getCurrentTime();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${hours}:${minutes}`;

      if (currentTime < whStart || currentTime > whEnd) {
        throw new Error("closed (outside hours)");
      }
    }

    const entry = await this.withQueueLock(queueId, async (tx) => {
      // 1. Verify Queue exists and is open
      const queue = await tx.queue.findFirst({
        where: { id: queueId, deletedAt: null },
      });
      if (!queue) {
        throw new Error("Queue not found");
      }
      if (queue.status !== "OPEN") {
        throw new Error("Queue is closed");
      }

      // 2. Check for active duplicate joins (same phone OR same email)
      const duplicateConditions: Prisma.QueueEntryScalarWhereWithAggregatesInput[] = [
        { customerPhone: input.customerPhone },
      ];
      if (input.customerEmail) {
        duplicateConditions.push({ customerEmail: input.customerEmail });
      }

      const duplicate = await tx.queueEntry.findFirst({
        where: {
          queueId,
          status: QueueEntryStatus.WAITING,
          OR: duplicateConditions,
        },
      });

      if (duplicate) {
        throw new Error("You are already in this queue");
      }

      // 3. Check for capacity limits under transaction
      if (queue.maxCapacity !== null) {
        const currentCount = await tx.queueEntry.count({
          where: { queueId, status: QueueEntryStatus.WAITING },
        });
        if (currentCount >= queue.maxCapacity) {
          throw new Error("closed (at capacity)");
        }
      }

      // 4. Generate token and find next position
      const trackingToken = crypto.randomUUID();
      const currentCountForPosition = await tx.queueEntry.count({
        where: { queueId, status: QueueEntryStatus.WAITING },
      });

      // 5. Insert new queue entry (position is naturally last, will be re-verified by recalculate)
      return await tx.queueEntry.create({
        data: {
          queueId,
          businessId: queue.businessId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail || null,
          position: currentCountForPosition + 1,
          status: QueueEntryStatus.WAITING,
          trackingToken,
        },
      });
    });

    // Send JOINED notification asynchronously after transaction commits
    NotificationService.sendNotification(entry.id, "JOINED").catch((err) => {
      console.error("Async JOINED notification trigger failed:", err);
    });

    return entry;
  }

  /**
   * Customer self-cancels from the queue. Only allowed if status is WAITING.
   */
  static async cancelEntry(trackingToken: string) {
    // 1. Retrieve entry first to get queueId
    const entry = await prisma.queueEntry.findUnique({
      where: { trackingToken },
    });

    if (!entry) {
      throw new Error("Queue entry not found");
    }

    if (entry.status !== QueueEntryStatus.WAITING) {
      throw new Error("Self-cancellation is only allowed while WAITING");
    }

    // 2. Perform transition and position updates under lock
    return await this.withQueueLock(entry.queueId, async (tx) => {
      return await QueueEntryService.transition(
        entry.id,
        QueueEntryStatus.CANCELLED,
        { id: null, role: null }, // Customer is actor
        tx
      );
    });
  }

  /**
   * Staff calls the next WAITING entry (repositioning other entries).
   */
  static async callNextEntry(
    businessId: string,
    queueId: string,
    actor: { id: string; role: UserRole }
  ) {
    const entry = await this.withQueueLock(queueId, async (tx) => {
      // 1. Verify queue ownership
      const queue = await tx.queue.findFirst({
        where: { id: queueId, businessId, deletedAt: null },
      });
      if (!queue) {
        throw new Error("Queue not found or unauthorized");
      }

      // 2. Find WAITING entry with the lowest position
      const nextEntry = await tx.queueEntry.findFirst({
        where: { queueId, status: QueueEntryStatus.WAITING },
        orderBy: { position: "asc" },
      });

      if (!nextEntry) {
        throw new Error("No customer in the queue");
      }

      return await QueueEntryService.transition(
        nextEntry.id,
        QueueEntryStatus.CALLED,
        actor,
        tx
      );
    });

    // Send YOUR_TURN notification asynchronously after transaction commits
    NotificationService.sendNotification(entry.id, "YOUR_TURN").catch((err) => {
      console.error("Async YOUR_TURN notification trigger failed:", err);
    });

    return entry;
  }

  /**
   * Staff calls a specific WAITING entry out of order.
   */
  static async callSpecificEntry(
    businessId: string,
    queueId: string,
    entryId: string,
    actor: { id: string; role: UserRole }
  ) {
    const entry = await this.withQueueLock(queueId, async (tx) => {
      // 1. Verify queue ownership
      const queue = await tx.queue.findFirst({
        where: { id: queueId, businessId, deletedAt: null },
      });
      if (!queue) {
        throw new Error("Queue not found or unauthorized");
      }

      // 2. Verify entry exists and belongs to this queue/business and is WAITING
      const entry = await tx.queueEntry.findFirst({
        where: { id: entryId, queueId, businessId, status: QueueEntryStatus.WAITING },
      });
      if (!entry) {
        throw new Error("Queue entry not found or not WAITING");
      }

      return await QueueEntryService.transition(
        entryId,
        QueueEntryStatus.CALLED,
        actor,
        tx
      );
    });

    // Send YOUR_TURN notification asynchronously after transaction commits
    NotificationService.sendNotification(entry.id, "YOUR_TURN").catch((err) => {
      console.error("Async YOUR_TURN notification trigger failed:", err);
    });

    return entry;
  }

  /**
   * Staff updates an entry state to SERVING.
   */
  static async startServingEntry(
    businessId: string,
    queueId: string,
    entryId: string,
    actor: { id: string; role: UserRole }
  ) {
    return await this.withQueueLock(queueId, async (tx) => {
      // 1. Verify entry ownership and correct state (must be CALLED)
      const entry = await tx.queueEntry.findFirst({
        where: { id: entryId, queueId, businessId, status: QueueEntryStatus.CALLED },
      });
      if (!entry) {
        throw new Error("Queue entry not found or not CALLED");
      }

      return await QueueEntryService.transition(
        entryId,
        QueueEntryStatus.SERVING,
        actor,
        tx
      );
    });
  }

  /**
   * Staff updates an entry state to COMPLETED.
   */
  static async completeServingEntry(
    businessId: string,
    queueId: string,
    entryId: string,
    actor: { id: string; role: UserRole }
  ) {
    return await this.withQueueLock(queueId, async (tx) => {
      // 1. Verify entry ownership and correct state (must be SERVING)
      const entry = await tx.queueEntry.findFirst({
        where: { id: entryId, queueId, businessId, status: QueueEntryStatus.SERVING },
      });
      if (!entry) {
        throw new Error("Queue entry not found or not SERVING");
      }

      return await QueueEntryService.transition(
        entryId,
        QueueEntryStatus.COMPLETED,
        actor,
        tx
      );
    });
  }

  /**
   * Staff skips a WAITING entry (repositioning other entries).
   */
  static async skipEntry(
    businessId: string,
    queueId: string,
    entryId: string,
    actor: { id: string; role: UserRole }
  ) {
    return await this.withQueueLock(queueId, async (tx) => {
      // 1. Verify entry ownership and correct state (must be WAITING)
      const entry = await tx.queueEntry.findFirst({
        where: { id: entryId, queueId, businessId, status: QueueEntryStatus.WAITING },
      });
      if (!entry) {
        throw new Error("Queue entry not found or not WAITING");
      }

      return await QueueEntryService.transition(
        entryId,
        QueueEntryStatus.SKIPPED,
        actor,
        tx
      );
    });
  }

  /**
   * Staff cancels a called or waiting entry.
   */
  static async cancelEntryByStaff(
    businessId: string,
    queueId: string,
    entryId: string,
    actor: { id: string; role: UserRole }
  ) {
    return await this.withQueueLock(queueId, async (tx) => {
      // 1. Verify entry ownership and state (can be WAITING or CALLED)
      const entry = await tx.queueEntry.findFirst({
        where: {
          id: entryId,
          queueId,
          businessId,
          status: { in: [QueueEntryStatus.WAITING, QueueEntryStatus.CALLED] },
        },
      });
      if (!entry) {
        throw new Error("Queue entry not found or cannot be cancelled by staff");
      }

      return await QueueEntryService.transition(
        entryId,
        QueueEntryStatus.CANCELLED,
        actor,
        tx
      );
    });
  }

  /**
   * Staff moves a WAITING entry to position 1, shifting all others.
   */
  static async moveToTop(
    businessId: string,
    queueId: string,
    entryId: string,
    actor?: { id: string; role: UserRole }
  ) {
    return await this.withQueueLock(queueId, async (tx) => {
      const entry = await tx.queueEntry.findFirst({
        where: { id: entryId, queueId, businessId, status: QueueEntryStatus.WAITING },
      });
      if (!entry) {
        throw new Error("Entry not found or not WAITING");
      }

      const otherWaiting = await tx.queueEntry.findMany({
        where: {
          queueId,
          status: QueueEntryStatus.WAITING,
          id: { not: entryId },
        },
        orderBy: {
          joinedAt: "asc",
        },
      });

      // Update target entry to position 1
      await tx.queueEntry.update({
        where: { id: entryId },
        data: { position: 1 },
      });

      // Shift others
      for (let i = 0; i < otherWaiting.length; i++) {
        await tx.queueEntry.update({
          where: { id: otherWaiting[i].id },
          data: { position: i + 2 },
        });
      }

      // Record AuditLog manual override
      await tx.auditLog.create({
        data: {
          businessId,
          actorId: actor?.id || "SYSTEM",
          actorRole: actor?.role || UserRole.STAFF,
          action: "QUEUE_ENTRY_MOVE_TO_TOP",
          targetType: "QueueEntry",
          targetId: entryId,
          metadata: {
            previousPosition: entry.position,
            newPosition: 1,
          },
        },
      });

      return entry;
    });
  }
}
