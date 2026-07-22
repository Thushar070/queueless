import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/crypto";

export async function findStaffOrAdminByEmail(email: string | null | undefined) {
  if (!email || typeof email !== "string" || !email.trim()) {
    return null;
  }
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const staff = await prisma.staff.findUnique({
      where: { email: normalizedEmail },
      include: { business: true },
    });
    if (staff) {
      return { type: "staff" as const, data: staff };
    }

    const admin = await prisma.superAdmin.findUnique({
      where: { email: normalizedEmail },
    });
    if (admin) {
      return { type: "admin" as const, data: admin };
    }
  } catch (error) {
    console.error("Database lookup failed for email:", normalizedEmail, error);
    throw new Error("Database query failed");
  }

  return null;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder-client-secret",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }
        try {
          const record = await findStaffOrAdminByEmail(credentials.email);
          if (record?.type === "staff" && !record.data.deletedAt) {
            const staff = record.data;
            if (!staff.passwordHash) {
              return null; // Google-only account
            }
            const isValid = await comparePassword(credentials.password, staff.passwordHash);
            if (isValid) {
              return {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                role: staff.role,
                businessId: staff.businessId,
                mustChangePassword: staff.mustChangePassword,
              };
            }
          } else if (record?.type === "admin") {
            const admin = record.data;
            const isValid = await comparePassword(credentials.password, admin.passwordHash);
            if (isValid) {
              return {
                id: admin.id,
                name: "Super Admin",
                email: admin.email,
                role: "SUPER_ADMIN",
                businessId: null,
              };
            }
          }
        } catch (error) {
          console.error("Error in credentials authorize query:", error);
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          if (!user?.email) return false;
          const record = await findStaffOrAdminByEmail(user.email);
          if (record?.type === "staff" && record.data.deletedAt) {
            return false; // Block Google login if staff member is soft-deleted
          }
          return true;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          // Allow sign-in attempt to proceed to jwt callback rather than hard-blocking with AccessDenied on transient DB query error
          return true;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // If logging in via Credentials, populate mustChangePassword from user object
      if (user) {
        token.mustChangePassword = user.mustChangePassword;
      }

      // Whenever a token is generated/refreshed, resolve the user's role and businessId from the DB.
      // This enforces database as the single source of truth (Rule 7).
      if (token.email) {
        try {
          const record = await findStaffOrAdminByEmail(token.email);
          if (record?.type === "staff" && !record.data.deletedAt) {
            token.id = record.data.id;
            token.role = record.data.role;
            token.businessId = record.data.businessId;
            token.mustChangePassword = record.data.mustChangePassword;
            token.profileCompleted = record.data.business?.profileCompleted ?? false;
            token.phoneVerified = !!record.data.business?.phoneVerifiedAt;
          } else if (record?.type === "admin") {
            token.id = record.data.id;
            token.role = "SUPER_ADMIN";
            token.businessId = null;
            token.mustChangePassword = false;
            token.profileCompleted = true;
            token.phoneVerified = true;
          } else {
            // For new users signing in via OAuth who do not have a DB record yet,
            // default role to BUSINESS_OWNER so they can complete business registration at /signup/business.
            token.id = (token.sub as string) || token.id || "";
            token.role = (token.role as string) || "BUSINESS_OWNER";
            token.businessId = token.businessId || null;
            token.mustChangePassword = false;
            token.profileCompleted = false;
            token.phoneVerified = false;
          }
        } catch (error) {
          console.error("Error in jwt callback database query:", error);
          // Do not overwrite existing token parameters, fail gracefully by returning current token
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.businessId = token.businessId;
        session.user.mustChangePassword = token.mustChangePassword;
        session.user.profileCompleted = token.profileCompleted;
        session.user.phoneVerified = token.phoneVerified;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
