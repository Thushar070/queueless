import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // 1. Guard for /admin/* -> Requires SUPER_ADMIN role
    if (pathname.startsWith("/admin")) {
      if (token?.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // 2. Guard for /dashboard/* -> Requires authenticated session with a businessId
    if (pathname.startsWith("/dashboard")) {
      if (token?.role !== "BUSINESS_OWNER" && token?.role !== "STAFF") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (!token?.businessId) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
