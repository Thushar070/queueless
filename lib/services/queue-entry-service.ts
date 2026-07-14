import { Prisma, QueueEntryStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class StateTransitionError extends Error {
  constructor(public from: QueueEntryStatus, public to: QueueEntryStatus) {
    super(`State transition from ${from} to ${to} is illegal`);
    this.name = "StateTransitionError";
  }
}

const legalTransitions: Record<QueueEntryStatus, Set<QueueEntryStatus>> = {
  WAITING: new Set([QueueEntryStatus.CALLED, QueueEntryStatus.SKIPPED, QueueEntryStatus.CANCELLED]),
  CALLED: new Set([QueueEntryStatus.SERVING, QueueEntryStatus.CANCELLED]),
  SERVING: new Set([QueueEntryStatus.COMPLETED]),
  COMPLETED: new Set([]),
  SKIPPED: new Set([]),
  CANCELLED: new Set([]),
};

export class QueueEntryService {
  /**
   * Enforces status transition of a QueueEntry, setting corresponding timestamps and
   * creating a matched AuditLog within the same transaction.
   */
  static async transition(
    queueEntryId: string,
    toStatus: QueueEntryStatus,
    actor: { id: string | null; role: UserRole | null },
    txClient?: Prisma.TransactionClient
  ) {

    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Fetch current entry
      const entry = await tx.queueEntry.findUnique({
        where: { id: queueEntryId },
      });

      if (!entry) {
        throw new Error("Queue entry not found");
      }

      const fromStatus = entry.status;

      // 2. Validate transition
      const allowed = legalTransitions[fromStatus];
      if (!allowed || !allowed.has(toStatus)) {
        throw new StateTransitionError(fromStatus, toStatus);
      }

      // 3. Map timestamp field
      const updateData: Prisma.QueueEntryUpdateInput = { status: toStatus };
      const now = new Date();
      if (toStatus === QueueEntryStatus.CALLED) {
        updateData.calledAt = now;
        updateData.position = 0; // Move out of active position
      } else if (toStatus === QueueEntryStatus.SERVING) {
        updateData.servingAt = now;
        updateData.position = 0;
      } else if (toStatus === QueueEntryStatus.COMPLETED) {
        updateData.completedAt = now;
        updateData.position = 0;
      } else if (toStatus === QueueEntryStatus.CANCELLED) {
        updateData.cancelledAt = now;
        updateData.position = 0;
      } else if (toStatus === QueueEntryStatus.SKIPPED) {
        updateData.position = 0;
      }

      // 4. Update the QueueEntry status and timestamp
      const updatedEntry = await tx.queueEntry.update({
        where: { id: queueEntryId },
        data: updateData,
      });

      // 5. Create the AuditLog entry
      const actionStr = `QUEUE_ENTRY_${toStatus}`;
      await tx.auditLog.create({
        data: {
          businessId: entry.businessId,
          actorId: actor.id,
          actorRole: actor.role,
          action: actionStr,
          targetType: "QueueEntry",
          targetId: queueEntryId,
          metadata: {
            from: fromStatus,
            to: toStatus,
          },
        },
      });

      return updatedEntry;
    };

    if (txClient) {
      return await execute(txClient);
    } else {
      return await prisma.$transaction(
        async (tx) => {
          return await execute(tx);
        },
        {
          maxWait: 25000,
          timeout: 45000,
        }
      );
    }
  }
}
