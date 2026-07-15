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
      if (token?.role === "SUPER_ADMIN" && token?.email) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      if (!token?.businessId) {
        return NextResponse.redirect(new URL("/signup/business", req.url));
      }
      if (token?.role !== "BUSINESS_OWNER" && token?.role !== "STAFF") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (token?.profileCompleted === false) {
        return NextResponse.redirect(new URL("/onboarding/profile", req.url));
      }
    }

    // 3. Guard for /onboarding/* -> Requires businessId
    if (pathname.startsWith("/onboarding")) {
      if (!token?.businessId) {
        return NextResponse.redirect(new URL("/signup/business", req.url));
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
  matcher: ["/dashboard/:path*", "/admin/:path*", "/onboarding/:path*"],
};
