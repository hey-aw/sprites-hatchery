import { neonAuthMiddleware } from "@neondatabase/neon-js/auth/next/server";

export default neonAuthMiddleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: ["/app/:path*", "/api/:path*"],
};
