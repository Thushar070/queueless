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

export interface GetPlatformAuditLogsInput {
  startDate?: Date;
  endDate?: Date;
  actorId?: string;
  action?: string;
  targetType?: string;
  targetBusinessId?: string;
  page?: number;
  limit?: number;
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

    // Fetch actor details (Staff names/emails and SuperAdmin emails) efficiently
    const staffIds = rawLogs
      .filter((l) => l.actorRole !== "SUPER_ADMIN")
      .map((l) => l.actorId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const adminIds = rawLogs
      .filter((l) => l.actorRole === "SUPER_ADMIN")
      .map((l) => l.actorId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const uniqueStaffIds = Array.from(new Set(staffIds));
    const uniqueAdminIds = Array.from(new Set(adminIds));

    const [staffMembers, adminMembers] = await Promise.all([
      uniqueStaffIds.length > 0
        ? prisma.staff.findMany({
            where: { id: { in: uniqueStaffIds } },
            select: { id: true, name: true, email: true },
          })
        : [],
      uniqueAdminIds.length > 0
        ? prisma.superAdmin.findMany({
            where: { id: { in: uniqueAdminIds } },
            select: { id: true, email: true },
          })
        : [],
    ]);

    const staffMap = new Map(staffMembers.map((s) => [s.id, s]));
    const adminMap = new Map(adminMembers.map((a) => [a.id, a]));

    const logs = rawLogs.map((log) => {
      let actorName = "System";
      let actorEmail = "system@queueless.com";

      if (log.actorRole === "SUPER_ADMIN") {
        const admin = log.actorId ? adminMap.get(log.actorId) : null;
        actorName = "Super Admin";
        actorEmail = admin?.email || "admin@queueless.com";
      } else if (log.actorId) {
        const staff = staffMap.get(log.actorId);
        if (staff) {
          actorName = staff.name;
          actorEmail = staff.email;
        }
      }

      return {
        id: log.id,
        businessId: log.businessId,
        actorId: log.actorId,
        actorRole: log.actorRole,
        actorName,
        actorEmail,
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

  static async getPlatformLogs(params: GetPlatformAuditLogsInput): Promise<PaginatedAuditLogs> {
    const {
      startDate,
      endDate,
      actorId,
      action,
      targetType,
      targetBusinessId,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    const whereClause: Prisma.AuditLogWhereInput = {};

    if (targetBusinessId) {
      whereClause.businessId = targetBusinessId;
    }

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

    const [total, rawLogs] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Fetch actor details
    const staffIds = rawLogs
      .filter((l) => l.actorRole !== "SUPER_ADMIN")
      .map((l) => l.actorId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const adminIds = rawLogs
      .filter((l) => l.actorRole === "SUPER_ADMIN")
      .map((l) => l.actorId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const uniqueStaffIds = Array.from(new Set(staffIds));
    const uniqueAdminIds = Array.from(new Set(adminIds));

    const [staffMembers, adminMembers] = await Promise.all([
      uniqueStaffIds.length > 0
        ? prisma.staff.findMany({
            where: { id: { in: uniqueStaffIds } },
            select: { id: true, name: true, email: true },
          })
        : [],
      uniqueAdminIds.length > 0
        ? prisma.superAdmin.findMany({
            where: { id: { in: uniqueAdminIds } },
            select: { id: true, email: true },
          })
        : [],
    ]);

    const staffMap = new Map(staffMembers.map((s) => [s.id, s]));
    const adminMap = new Map(adminMembers.map((a) => [a.id, a]));

    const logs = rawLogs.map((log) => {
      let actorName = "System";
      let actorEmail = "system@queueless.com";

      if (log.actorRole === "SUPER_ADMIN") {
        const admin = log.actorId ? adminMap.get(log.actorId) : null;
        actorName = "Super Admin";
        actorEmail = admin?.email || "admin@queueless.com";
      } else if (log.actorId) {
        const staff = staffMap.get(log.actorId);
        if (staff) {
          actorName = staff.name;
          actorEmail = staff.email;
        }
      }

      return {
        id: log.id,
        businessId: log.businessId,
        actorId: log.actorId,
        actorRole: log.actorRole,
        actorName,
        actorEmail,
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
