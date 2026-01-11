import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;

      // Public routes
      if (pathname === "/") return true;
      if (pathname.startsWith("/api/auth")) return true;
      if (pathname.startsWith("/admin")) return true;
      if (pathname.startsWith("/api/admin")) return true;

      // Everything else requires auth
      return !!token;
    },
  },
});

export const config = {
  matcher: [
    /*
     * Protect all routes except Next.js internals/static assets.
     * Auth itself is allowed by callback above.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
