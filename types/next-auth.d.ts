import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      businessId: string | null;
      role: string;
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    businessId: string | null;
    role: string;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    businessId: string | null;
    role: string;
    mustChangePassword?: boolean;
  }
}
