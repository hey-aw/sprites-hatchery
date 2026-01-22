import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateToken } from "@/lib/auth/token-auth";
import { createHash } from "crypto";
import { SignJWT } from "jose";

const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-in-production";
const secret = new TextEncoder().encode(SESSION_SECRET);

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").substring(0, 16);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 }
    );
  }

  // Validate the token
  const validation = await validateToken(token);

  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error || "Invalid token" },
      { status: 401 }
    );
  }

  // Create a minimal session cookie for server-side access (just user_id and org, not the token)
  const tokenHash = hashToken(token);
  const session = await new SignJWT({
    user_id: tokenHash,
    org: validation.org || "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)) // 30 days
    .sign(secret);

  // Set minimal session cookie (for server components)
  const cookieStore = await cookies();
  cookieStore.set("sprites_session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  });

  // Return validation result - client will store full token in localStorage
  return NextResponse.json({
    success: true,
    org: validation.org || "",
  });
}
