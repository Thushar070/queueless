import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface GetAuditLogsInput {
  businessId: string;
  startDate?: Date;
  endDate?: Date;
  actorId?: string;
  action?: string;
  targetType?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  logs: Array<{
    id: string;
    businessId: string | null;
    actorId: string | null;
    actorRole: UserRole | null;
    actorName: string;
    actorEmail: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }>;
  total: number;
  pages: number;
}

export class AuditLogService {
  static async getLogs(params: GetAuditLogsInput): Promise<PaginatedAuditLogs> {
    const {
      businessId,
      startDate,
      endDate,
      actorId,
      action,
      targetType,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    // Build Prisma query filters
    const whereClause: Prisma.AuditLogWhereInput = {
      businessId,
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = startDate;
      }
      if (endDate) {
        whereClause.createdAt.lte = endDate;
      }
    }

    if (actorId) {
      whereClause.actorId = actorId;
    }

    if (action) {
      whereClause.action = action;
    }

    if (targetType) {
      whereClause.targetType = targetType;
    }

    // Run count and findMany concurrently
    const [total, rawLogs] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Fetch actor details (Staff names/emails) efficiently in a single query
    const staffIds = rawLogs
      .map((l) => l.actorId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const uniqueStaffIds = Array.from(new Set(staffIds));

    const staffMembers = uniqueStaffIds.length > 0
      ? await prisma.staff.findMany({
          where: { id: { in: uniqueStaffIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    const staffMap = new Map(staffMembers.map((s) => [s.id, s]));

    const logs = rawLogs.map((log) => {
      const staff = log.actorId ? staffMap.get(log.actorId) : null;
      return {
        id: log.id,
        businessId: log.businessId,
        actorId: log.actorId,
        actorRole: log.actorRole,
        actorName: staff?.name || "System",
        actorEmail: staff?.email || "system@queueless.com",
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        metadata: log.metadata,
        createdAt: log.createdAt,
      };
    });

    return {
      logs,
      total,
      pages: Math.ceil(total / limit),
    };
  }
}
