import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-in-production";
const secret = new TextEncoder().encode(SESSION_SECRET);

export interface AuthUser {
  id: string; // token_hash for identification
  org: string;
}

/**
 * Extract token from Authorization header
 */
function getTokenFromHeaders(headers: Headers): string | null {
  const authHeader = headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Get the current authenticated user from the request (for API routes)
 * Returns null if not authenticated
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = getTokenFromHeaders(request.headers);
  if (!token) {
    // Fallback to session cookie for server-side access
    return getAuthUserFromSession();
  }

  // For API routes, we need to validate the token
  const { validateToken } = await import("./token-auth");
  const validation = await validateToken(token);
  if (!validation.valid) {
    return null;
  }

  const { createHash } = await import("crypto");
  const hashToken = (t: string) => createHash("sha256").update(t).digest("hex").substring(0, 16);

  return {
    id: hashToken(token),
    org: validation.org || "",
  };
}

/**
 * Get the current authenticated user from session cookie (for server components)
 * Returns null if not authenticated
 */
async function getAuthUserFromSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("sprites_session");

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

/**
 * Get the current authenticated user (for server components)
 * Returns null if not authenticated
 */
export async function getAuthUserFromHeaders(): Promise<AuthUser | null> {
  return getAuthUserFromSession();
}

/**
 * Get the Sprites API token from the request
 * This can be used to make authenticated requests to Sprites APIs
 */
export function getSpritesTokenFromRequest(request: NextRequest): string | null {
  return getTokenFromHeaders(request.headers);
}
