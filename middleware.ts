import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(_req) {
    // If we get here, user is authenticated or on a public route
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes
        if (pathname === "/") return true;
        if (pathname.startsWith("/api/auth")) return true;

        // Admin-only routes
        if (pathname.startsWith("/admin")) return token?.isAdmin === true;
        if (pathname.startsWith("/api/admin")) return true;

        // For API routes, let them handle their own 401 responses
        // Don't redirect to signin page
        if (pathname.startsWith("/api/")) {
          return true; // Let API routes handle auth themselves
        }

        // Everything else requires auth
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Protect all routes except Next.js internals/static assets.
     * Auth itself is allowed by callback above.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
