import { prisma } from "@/lib/prisma";
import { QueueEntryStatus } from "@prisma/client";

export interface AnalyticsMetrics {
  servedTodayCount: number;
  averageWaitTimeMin: number;
  activeQueueLengths: Array<{ queueId: string; queueName: string; length: number }>;
  cancellationRate: number;
  peakHoursHistogram: Array<{ hour: number; count: number }>;
  averageServiceDurationMin: number;
}

export class AnalyticsService {
  static async getMetrics(businessId: string): Promise<AnalyticsMetrics> {
    // 1. Customers served today (completedAt >= UTC midnight today)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const servedTodayCount = await prisma.queueEntry.count({
      where: {
        businessId,
        status: QueueEntryStatus.COMPLETED,
        completedAt: { gte: today },
      },
    });

    // 2. Average wait time (joinedAt -> calledAt for called/completed/serving/skipped entries)
    // Using raw PostgreSQL query to calculate average difference in minutes efficiently
    const waitTimeResult = await prisma.$queryRaw<Array<{ avg_wait_min: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("calledAt" - "joinedAt")) / 60) as avg_wait_min
      FROM "QueueEntry"
      WHERE "businessId" = ${businessId} AND "calledAt" IS NOT NULL
    `;
    const averageWaitTimeMin = waitTimeResult[0]?.avg_wait_min 
      ? Math.round(Number(waitTimeResult[0].avg_wait_min) * 10) / 10 
      : 0;

    // 3. Active queue length per queue (live WAITING count)
    const activeLengthsRaw = await prisma.queue.findMany({
      where: {
        businessId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        entries: {
          where: { status: QueueEntryStatus.WAITING },
          select: { id: true },
        },
      },
    });

    const activeQueueLengths = activeLengthsRaw.map((q) => ({
      queueId: q.id,
      queueName: q.name,
      length: q.entries.length,
    }));

    // 4. Cancellation rate: CANCELLED / (CANCELLED + COMPLETED + SKIPPED)
    const statusCounts = await prisma.queueEntry.groupBy({
      by: ["status"],
      where: {
        businessId,
        status: {
          in: [
            QueueEntryStatus.CANCELLED,
            QueueEntryStatus.COMPLETED,
            QueueEntryStatus.SKIPPED,
          ],
        },
      },
      _count: {
        status: true,
      },
    });

    let cancelledCount = 0;
    let totalTerminalCount = 0;

    for (const item of statusCounts) {
      const count = item._count.status;
      if (item.status === QueueEntryStatus.CANCELLED) {
        cancelledCount = count;
      }
      totalTerminalCount += count;
    }

    const cancellationRate = totalTerminalCount > 0 
      ? Math.round((cancelledCount / totalTerminalCount) * 1000) / 10 
      : 0; // percentage rounded to 1 decimal place

    // 5. Peak hours histogram (joinedAt grouped by hour-of-day in UTC)
    const histogramRaw = await prisma.$queryRaw<Array<{ hour: number | string; count: bigint | number }>>`
      SELECT EXTRACT(HOUR FROM "joinedAt" AT TIME ZONE 'UTC') as hour, COUNT(*)::bigint as count
      FROM "QueueEntry"
      WHERE "businessId" = ${businessId}
      GROUP BY hour
      ORDER BY hour ASC
    `;

    // Map into 24-hour slots
    const peakHoursHistogram = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0,
    }));

    for (const item of histogramRaw) {
      const h = Number(item.hour);
      const c = Number(item.count);
      if (h >= 0 && h < 24) {
        peakHoursHistogram[h].count = c;
      }
    }

    // 6. Average service duration (servingAt -> completedAt for completed entries)
    const serviceResult = await prisma.$queryRaw<Array<{ avg_service_min: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "servingAt")) / 60) as avg_service_min
      FROM "QueueEntry"
      WHERE "businessId" = ${businessId} AND "status" = 'COMPLETED' AND "completedAt" IS NOT NULL AND "servingAt" IS NOT NULL
    `;
    const averageServiceDurationMin = serviceResult[0]?.avg_service_min 
      ? Math.round(Number(serviceResult[0].avg_service_min) * 10) / 10 
      : 0;

    return {
      servedTodayCount,
      averageWaitTimeMin,
      activeQueueLengths,
      cancellationRate,
      peakHoursHistogram,
      averageServiceDurationMin,
    };
  }
}
