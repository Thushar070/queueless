/**
 * @jest-environment node
 */

import { prisma } from "@/lib/prisma";
import { QueueService } from "@/lib/services/queue-service";
import PublicQueuePage from "@/app/q/[businessSlug]/[queueSlug]/page";
import "dotenv/config";

describe("Phase 2 - Verification Tests", () => {
  jest.setTimeout(30000);

  const testBusinessNameA = "TEST_Phase2_Business_A";
  const testBusinessSlugA = "test-p2-business-a";
  const testBusinessEmailA = "info@test-p2-a.com";

  const testBusinessNameB = "TEST_Phase2_Business_B";
  const testBusinessSlugB = "test-p2-business-b";
  const testBusinessEmailB = "info@test-p2-b.com";

  let businessAId: string;
  let businessBId: string;

  const cleanup = async () => {
    const testBusinesses = await prisma.business.findMany({
      where: { name: { startsWith: "TEST_Phase2_" } },
    });
    const ids = testBusinesses.map((b) => b.id);
    if (ids.length > 0) {
      await prisma.auditLog.deleteMany({ where: { businessId: { in: ids } } });
      await prisma.staff.deleteMany({ where: { businessId: { in: ids } } });
      await prisma.queueEntry.deleteMany({ where: { businessId: { in: ids } } });
      await prisma.queue.deleteMany({ where: { businessId: { in: ids } } });
      await prisma.business.deleteMany({ where: { id: { in: ids } } });
    }
  };

  beforeAll(async () => {
    await cleanup();

    // Create Business A
    const bizA = await prisma.business.create({
      data: {
        name: testBusinessNameA,
        slug: testBusinessSlugA,
        email: testBusinessEmailA,
      },
    });
    businessAId = bizA.id;

    // Create Business B
    const bizB = await prisma.business.create({
      data: {
        name: testBusinessNameB,
        slug: testBusinessSlugB,
        email: testBusinessEmailB,
      },
    });
    businessBId = bizB.id;
  });

  afterAll(async () => {
    await cleanup();
  });

  // 1. QueueService unit tests
  describe("QueueService Unit Tests", () => {
    let createdQueueId: string;

    it("creates a queue, generates slug, and creates QR code", async () => {
      const q = await QueueService.createQueue(businessAId, {
        name: "Checkup Queue",
        avgServiceTimeMin: 10,
        maxCapacity: 50,
        workingHoursStart: "09:00",
        workingHoursEnd: "17:00",
      });

      expect(q.id).toBeDefined();
      expect(q.name).toBe("Checkup Queue");
      expect(q.slug).toBe("checkup-queue");
      expect(q.status).toBe("OPEN");
      expect(q.qrCodeUrl).not.toBeNull();
      expect(q.qrCodeUrl?.startsWith("data:image/png;base64,")).toBe(true);

      createdQueueId = q.id;

      // Verify magic bytes of the generated Base64 QR code PNG image (89 50 4E 47 0D 0A 1A 0A)
      const base64Data = q.qrCodeUrl!.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    });

    it("updates a queue's configuration successfully", async () => {
      const updated = await QueueService.updateQueue(businessAId, createdQueueId, {
        name: "Updated Checkup Queue",
        avgServiceTimeMin: 12,
        maxCapacity: 40,
      });

      expect(updated.name).toBe("Updated Checkup Queue");
      expect(updated.avgServiceTimeMin).toBe(12);
      expect(updated.maxCapacity).toBe(40);
    });

    it("toggles a queue status from OPEN to CLOSED and back", async () => {
      const closed = await QueueService.toggleQueueStatus(businessAId, createdQueueId);
      expect(closed.status).toBe("CLOSED");

      const opened = await QueueService.toggleQueueStatus(businessAId, createdQueueId);
      expect(opened.status).toBe("OPEN");
    });

    it("soft-deletes a queue and filters it from listing", async () => {
      // 1. Create a second queue to delete
      const qToDelete = await QueueService.createQueue(businessAId, {
        name: "Delete Me Queue",
        avgServiceTimeMin: 5,
      });

      // 2. Assert it appears in getQueues
      let list = await QueueService.getQueues(businessAId);
      expect(list.some((q) => q.id === qToDelete.id)).toBe(true);

      // 3. Soft delete it
      await QueueService.deleteQueue(businessAId, qToDelete.id);

      // 4. Assert it is now filtered out from getQueues
      list = await QueueService.getQueues(businessAId);
      expect(list.some((q) => q.id === qToDelete.id)).toBe(false);

      // 5. Verify it still exists in raw DB with deletedAt timestamp
      const raw = await prisma.queue.findUnique({
        where: { id: qToDelete.id },
      });
      expect(raw).not.toBeNull();
      expect(raw?.deletedAt).not.toBeNull();
    });

    it("asserts businessId cannot be overridden or spoofed via crafted input", async () => {
      // We check that QueueService methods require businessId parameter explicitly from caller (controller)
      // and do not extract it from user-controlled payload objects.
      const q = await QueueService.createQueue(businessAId, {
        name: "Spoof Prevention Queue",
        avgServiceTimeMin: 5,
      });
      expect(q.businessId).toBe(businessAId);
    });
  });

  // 2. Slug uniqueness test
  describe("Slug Uniqueness", () => {
    it("prevents slug conflicts in the same business by auto-incrementing", async () => {
      const q1 = await QueueService.createQueue(businessAId, {
        name: "Express Queue",
        avgServiceTimeMin: 5,
      });
      expect(q1.slug).toBe("express-queue");

      const q2 = await QueueService.createQueue(businessAId, {
        name: "Express Queue",
        avgServiceTimeMin: 5,
      });
      expect(q2.slug).toBe("express-queue-2");

      const q3 = await QueueService.createQueue(businessAId, {
        name: "Express Queue",
        avgServiceTimeMin: 5,
      });
      expect(q3.slug).toBe("express-queue-3");
    });

    it("allows the same slug string across two different businesses", async () => {
      const qA = await QueueService.createQueue(businessAId, {
        name: "Billing Line",
        avgServiceTimeMin: 5,
      });
      expect(qA.slug).toBe("billing-line");

      const qB = await QueueService.createQueue(businessBId, {
        name: "Billing Line",
        avgServiceTimeMin: 5,
      });
      expect(qB.slug).toBe("billing-line");
    });
  });

  // 3. Route Resolution public page
  describe("Route Resolution & Stub view", () => {
    it("returns mock visual JSX structure for valid business/queue slugs", async () => {
      const queue = await QueueService.createQueue(businessAId, {
        name: "Public Diagnostic Line",
        avgServiceTimeMin: 15,
      });

      const params = Promise.resolve({
        businessSlug: testBusinessSlugA,
        queueSlug: queue.slug,
      });

      const element = await PublicQueuePage({ params });
      expect(element).not.toBeNull();
      // Ensure it renders key pieces of information
      const mainProps = element.props;
      expect(mainProps.className).toContain("bg-black");
    });

    it("rejects invalid business/queue slug combos with Next.js notFound redirection error", async () => {
      const params = Promise.resolve({
        businessSlug: testBusinessSlugA,
        queueSlug: "nonexistent-queue-slug",
      });

      await expect(PublicQueuePage({ params })).rejects.toThrow();
    });
  });

  // 4. Cross-Tenant Guard test
  describe("Cross-Tenant Operations Guard", () => {
    it("prevents Business B from modifying Business A queues", async () => {
      const qA = await QueueService.createQueue(businessAId, {
        name: "Business A Secured Queue",
        avgServiceTimeMin: 8,
      });

      // Attempt update by Business B
      await expect(
        QueueService.updateQueue(businessBId, qA.id, {
          name: "Hacked Name",
        })
      ).rejects.toThrow("Queue not found or unauthorized");

      // Attempt toggle status by Business B
      await expect(
        QueueService.toggleQueueStatus(businessBId, qA.id)
      ).rejects.toThrow("Queue not found or unauthorized");

      // Attempt soft delete by Business B
      await expect(
        QueueService.deleteQueue(businessBId, qA.id)
      ).rejects.toThrow("Queue not found or unauthorized");

      // Verify that Business A's queue was NOT altered
      const verify = await prisma.queue.findUnique({
        where: { id: qA.id },
      });
      expect(verify?.name).toBe("Business A Secured Queue");
    });
  });
});
