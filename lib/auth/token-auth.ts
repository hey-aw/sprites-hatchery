import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-in-production";
const SPRITES_API_BASE = "https://api.sprites.dev/v1";

export interface TokenSession {
  sprites_token: string;
  org: string;
  token_hash: string; // Hash of token for user identification
  created_at: number;
}

const secret = new TextEncoder().encode(SESSION_SECRET);

/**
 * Validate a Sprites API token by making a test request
 */
export async function validateToken(token: string): Promise<{
  valid: boolean;
  org?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${SPRITES_API_BASE}/sprites`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { valid: false, error: "Invalid token" };
      }
      return { valid: false, error: `API error: ${response.status}` };
    }

    const sprites = await response.json();
    // Extract org from first sprite if available, or use empty string
    const org = (Array.isArray(sprites) && sprites.length > 0 && sprites[0].org) 
      ? sprites[0].org 
      : "";

    return { valid: true, org };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

/**
 * Create a hash of the token for user identification
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").substring(0, 16);
}

/**
 * Create a session with the Sprites token
 */
export async function createSession(token: string, org: string): Promise<string> {
  const tokenHash = hashToken(token);
  const createdAt = Date.now();

  const session = await new SignJWT({
    sprites_token: token,
    org,
    token_hash: tokenHash,
    created_at: createdAt,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((createdAt + 30 * 24 * 60 * 60 * 1000) / 1000)) // 30 days
    .sign(secret);

  return session;
}

/**
 * Get the current session
 */
export async function getSession(): Promise<TokenSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("sprites_session");

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(sessionCookie.value, secret);
    return payload as unknown as TokenSession;
  } catch {
    return null;
  }
}

/**
 * Delete the current session
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("sprites_session");
}

/**
 * Get the Sprites token from the session
 */
export async function getSpritesToken(): Promise<string | null> {
  const session = await getSession();
  return session?.sprites_token || null;
}
