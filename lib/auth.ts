import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/crypto";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder-client-secret",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 1. Search in Staff table first
        const staff = await prisma.staff.findUnique({
          where: { email: credentials.email },
        });

        if (staff) {
          if (!staff.passwordHash) {
            return null; // Google-only account
          }
          const isValid = await comparePassword(credentials.password, staff.passwordHash);
          if (isValid) {
            return {
              id: staff.id,
              name: staff.name,
              email: staff.email,
              role: staff.role, // e.g. "BUSINESS_OWNER" | "STAFF"
              businessId: staff.businessId,
            };
          }
        }

        // 2. Search in SuperAdmin table
        const admin = await prisma.superAdmin.findUnique({
          where: { email: credentials.email },
        });

        if (admin) {
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
        if (!user.email) {
          return false;
        }

        // Allow Google login. If they don't have a staff/admin record, they will have no businessId
        // and will be redirected to /signup/business to complete onboarding.
        return true;
      }
      return true;
    },
    async jwt({ token }) {
      // Whenever a token is generated/refreshed, resolve the user's role and businessId from the DB.
      // This enforces database as the single source of truth (Rule 7).
      if (token.email) {
        const staff = await prisma.staff.findUnique({
          where: { email: token.email },
        });

        if (staff) {
          token.id = staff.id;
          token.role = staff.role;
          token.businessId = staff.businessId;
        } else {
          const admin = await prisma.superAdmin.findUnique({
            where: { email: token.email },
          });
          if (admin) {
            token.id = admin.id;
            token.role = "SUPER_ADMIN";
            token.businessId = null;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.businessId = token.businessId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
