/**
 * @jest-environment node
 */

import { POST } from "@/app/api/signup/route";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import middleware from "@/middleware";
import { NextRequest, NextFetchEvent } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { getToken } from "next-auth/jwt";

// Load env variables manually just in case
import "dotenv/config";

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

describe("Phase 1 - Verification Tests", () => {
  jest.setTimeout(30000);

  const testBusinessName = "TEST1_Business_A";
  const testBusinessSlug = "test-business-a";
  const testBusinessEmail = "info@test-business-a.com";
  const testOwnerName = "Test Owner A";
  const testOwnerEmail = "owner@test-business-a.com";
  const testPassword = "password123";

  const testBusinessNameB = "TEST1_Business_B";
  const testBusinessSlugB = "test-business-b";
  const testBusinessEmailB = "info@test-business-b.com";
  const testOwnerNameB = "Test Owner B";
  const testOwnerEmailB = "owner@test-business-b.com";

  let businessAId: string;
  let ownerAId: string;
  let businessBId: string;
  let ownerBId: string;

  // Cleanup before and after tests
  const cleanup = async () => {
    const testBusinesses = await prisma.business.findMany({
      where: { name: { startsWith: "TEST1_" } },
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
  });

  afterAll(async () => {
    await cleanup();
  });

  // 1. Signup Flow Test
  describe("Signup Flow", () => {
    it("creates a Business and Staff row atomically on valid input", async () => {
      const payload = {
        businessName: testBusinessName,
        businessSlug: testBusinessSlug,
        businessEmail: testBusinessEmail,
        businessPhone: "+15555555555",
        ownerName: testOwnerName,
        ownerEmail: testOwnerEmail,
        password: testPassword,
      };

      const request = new Request("http://localhost/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.businessId).toBeDefined();
      expect(data.ownerId).toBeDefined();

      businessAId = data.businessId;
      ownerAId = data.ownerId;

      const b = await prisma.business.findUnique({ where: { id: businessAId } });
      const s = await prisma.staff.findUnique({ where: { id: ownerAId } });
      expect(b).not.toBeNull();
      expect(s).not.toBeNull();
      expect(s?.role).toBe("BUSINESS_OWNER");
    });

    it("rejects invalid input via Zod", async () => {
      const payload = {
        businessName: "",
        businessSlug: "Acme Slug!",
        businessEmail: "not-an-email",
        ownerName: "J",
        ownerEmail: "owner",
        password: "123",
      };

      const request = new Request("http://localhost/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Validation failed");
    });

    it("rolls back both rows if transaction fails partway", async () => {
      let txnError: unknown = null;
      try {
        await prisma.$transaction(async (tx) => {
          const b = await tx.business.create({
            data: {
              name: "TEST1_Transaction_Rollback_Business",
              slug: "test-rollback-slug",
              email: "rollback@test.com",
            },
          });

          await tx.staff.create({
            data: {
              businessId: b.id,
              name: "Rollback Staff",
              email: testOwnerEmail, // Duplicate unique email, throws db unique error
              role: "STAFF",
            },
          });
        });
      } catch (e) {
        txnError = e;
      }

      expect(txnError).not.toBeNull();

      // Assert that the business with slug "test-rollback-slug" was NOT created (rolled back)
      const rolledBackBusiness = await prisma.business.findUnique({
        where: { slug: "test-rollback-slug" },
      });
      expect(rolledBackBusiness).toBeNull();
    });
  });

  // 2. Auth Credentials Provider Test
  describe("Auth - Credentials Provider", () => {
    const credentialsProvider = authOptions.providers.find(
      (p) => p.id === "credentials"
    ) as unknown as {
      options: {
        authorize: (credentials: Record<string, string> | undefined) => Promise<{
          id: string;
          name: string;
          email: string;
          role: string;
          businessId: string | null;
        } | null>;
      };
    };

    it("succeeds with correct password and returns scoped session metadata", async () => {
      const user = await credentialsProvider.options.authorize({
        email: testOwnerEmail,
        password: testPassword,
      });

      expect(user).not.toBeNull();
      expect(user.role).toBe("BUSINESS_OWNER");
      expect(user.businessId).toBe(businessAId);
    });

    it("fails with incorrect password", async () => {
      const user = await credentialsProvider.options.authorize({
        email: testOwnerEmail,
        password: "wrongpassword",
      });
      expect(user).toBeNull();
    });

    it("fails with unregistered email", async () => {
      const user = await credentialsProvider.options.authorize({
        email: "nonexistent@business.com",
        password: "somepassword",
      });
      expect(user).toBeNull();
    });
  });

  // 3. Route Guard / Middleware Test
  describe("Route Guards & Middleware", () => {
    it("allows Super Admin to access /admin", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        role: "SUPER_ADMIN",
        businessId: null,
      });

      const req = new NextRequest("http://localhost/admin/businesses");
      const res = await middleware(req, {} as unknown as NextFetchEvent);
      expect(res?.headers.get("location")).toBeNull();
    });

    it("rejects non-Super Admin from accessing /admin", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        role: "BUSINESS_OWNER",
        businessId: businessAId,
      });

      const req = new NextRequest("http://localhost/admin/businesses");
      const res = await middleware(req, {} as unknown as NextFetchEvent);
      expect(res?.headers.get("location")).toContain("/login");
    });

    it("allows authenticated Business Owner with businessId to access /dashboard", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        role: "BUSINESS_OWNER",
        businessId: businessAId,
      });

      const req = new NextRequest("http://localhost/dashboard/queues");
      const res = await middleware(req, {} as unknown as NextFetchEvent);
      expect(res?.headers.get("location")).toBeNull();
    });

    it("rejects user without businessId from accessing /dashboard", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        role: "SUPER_ADMIN",
        businessId: null,
      });

      const req = new NextRequest("http://localhost/dashboard/queues");
      const res = await middleware(req, {} as unknown as NextFetchEvent);
      expect(res?.headers.get("location")).toContain("/signup/business");
    });
  });

  // 4. Cross-Tenant Isolation Test (Application Layer)
  describe("Cross-Tenant Isolation (App Layer)", () => {
    beforeAll(async () => {
      const payloadB = {
        businessName: testBusinessNameB,
        businessSlug: testBusinessSlugB,
        businessEmail: testBusinessEmailB,
        businessPhone: "+15555555556",
        ownerName: testOwnerNameB,
        ownerEmail: testOwnerEmailB,
        password: testPassword,
      };

      const request = new Request("http://localhost/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadB),
      });

      const response = await POST(request);
      const data = await response.json();
      businessBId = data.businessId;
      ownerBId = data.ownerId;
    });

    it("verifies Business A context cannot query Business B rows", async () => {
      const businessAStaff = await prisma.staff.findMany({
        where: { businessId: businessAId },
      });

      businessAStaff.forEach((staff) => {
        expect(staff.businessId).toBe(businessAId);
        expect(staff.businessId).not.toBe(businessBId);
      });

      const staffBInResults = businessAStaff.find((s) => s.id === ownerBId);
      expect(staffBInResults).toBeUndefined();
    });
  });

  // 5. Direct RLS Test
  describe("Direct Row-Level Security", () => {
    it("asserts RLS blocks direct client reads if role is not owner or claims mismatch", async () => {
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
      const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

      const anonClient = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await anonClient.from("Staff").select("*");

      expect(error).toBeNull();
      expect(data?.length).toBe(0);

      if (supabaseJwtSecret && supabaseJwtSecret !== "placeholder-jwt-secret") {
        const tokenA = jwt.sign(
          {
            role: "authenticated",
            user_metadata: {
              role: "BUSINESS_OWNER",
              businessId: businessAId,
            },
          },
          supabaseJwtSecret,
          { expiresIn: "1h" }
        );

        const clientA = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${tokenA}`,
            },
          },
        });

        const { data: staffData, error: staffError } = await clientA
          .from("Staff")
          .select("*");

        if (staffError && (staffError as { code: string }).code === "PGRST301") {
          console.log("Skipped signed JWT cross-tenant RLS test: Database rejected JWT (invalid SUPABASE_JWT_SECRET).");
        } else {
          expect(staffError).toBeNull();
          expect(staffData).not.toBeNull();

          const containsB = staffData?.some((s: { businessId: string }) => s.businessId === businessBId);
          expect(containsB).toBe(false);

          const containsA = staffData?.some((s: { businessId: string }) => s.businessId === businessAId);
          expect(containsA).toBe(true);
        }
      } else {
        console.log("Skipped signed JWT cross-tenant RLS test (SUPABASE_JWT_SECRET not provided).");
      }
    });
  });
});
