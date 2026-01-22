import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getAuthUserFromHeaders } from "@/lib/auth/server";
import { jwtVerify } from "jose";

const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-in-production";
const secret = new TextEncoder().encode(SESSION_SECRET);

async function getAuthUserFromRequest(request: NextRequest) {
  const sessionCookie = request.cookies.get("sprites_session");
  
  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(sessionCookie.value, secret);
    return {
      id: payload.user_id as string,
      org: payload.org as string,
    };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle root path redirect
  if (pathname === "/") {
    const user = await getAuthUserFromRequest(request);
    if (user) {
      return NextResponse.redirect(new URL("/app", request.url));
    } else {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }
  }

  // Skip auth for public routes
  const publicPaths = ["/auth", "/api/auth"];
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  // Try to get from Authorization header first (API routes), then fallback to session cookie
  let user = await getAuthUser(request);
  if (!user) {
    // For server components, check session cookie
    user = await getAuthUserFromRequest(request);
  }
  
  if (!user) {
    const loginUrl = new URL("/auth/sign-in", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app/:path*", "/api/:path*"],
};
