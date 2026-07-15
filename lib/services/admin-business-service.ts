import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export interface PaginatedBusinesses {
  businesses: Array<{
    id: string;
    name: string;
    slug: string;
    email: string | null;
    status: string;
    deletedAt: Date | null;
    createdAt: Date;
    _count: {
      staff: number;
      queues: number;
    };
  }>;
  total: number;
  pages: number;
}

export class AdminBusinessService {
  /**
   * List all businesses (both active and suspended, excluding soft-deleted ones) with pagination
   */
  static async listBusinesses(page = 1, limit = 10): Promise<PaginatedBusinesses> {
    const skip = (page - 1) * limit;

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              staff: true,
              queues: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.business.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    return {
      businesses,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Suspend a business and create an AuditLog entry
   */
  static async suspendBusiness(businessId: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const business = await tx.business.update({
        where: { id: businessId },
        data: { status: "SUSPENDED" },
      });

      await tx.auditLog.create({
        data: {
          businessId: business.id,
          actorId,
          actorRole: "SUPER_ADMIN" as UserRole,
          action: "BUSINESS_SUSPENDED",
          targetType: "Business",
          targetId: business.id,
          metadata: { name: business.name, slug: business.slug },
        },
      });

      return business;
    });
  }

  /**
   * Reactivate a suspended business and create an AuditLog entry
   */
  static async reactivateBusiness(businessId: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const business = await tx.business.update({
        where: { id: businessId },
        data: { status: "ACTIVE" },
      });

      await tx.auditLog.create({
        data: {
          businessId: business.id,
          actorId,
          actorRole: "SUPER_ADMIN" as UserRole,
          action: "BUSINESS_REACTIVATED",
          targetType: "Business",
          targetId: business.id,
          metadata: { name: business.name, slug: business.slug },
        },
      });

      return business;
    });
  }

  /**
   * Soft-delete a business and create an AuditLog entry
   */
  static async deleteBusiness(businessId: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const business = await tx.business.update({
        where: { id: businessId },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          businessId: business.id,
          actorId,
          actorRole: "SUPER_ADMIN" as UserRole,
          action: "BUSINESS_DELETED",
          targetType: "Business",
          targetId: business.id,
          metadata: { name: business.name, slug: business.slug },
        },
      });

      return business;
    });
  }
}
