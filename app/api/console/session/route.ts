import { NextRequest, NextResponse } from "next/server";
import { EncryptJWT } from "jose";
import { randomUUID } from "crypto";
import { getAuthUser, getSpritesTokenFromRequest } from "@/lib/auth/server";

const TERMINAL_SESSION_SECRET =
  process.env.TERMINAL_SESSION_SECRET ||
  process.env.SESSION_SECRET ||
  "change-me-in-production";
const terminalSecret = new TextEncoder().encode(TERMINAL_SESSION_SECRET.padEnd(32, "0").slice(0, 32));

const SESSION_TTL_SECONDS = 60;

function createSessionId(): string {
  return randomUUID();
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spritesToken = getSpritesTokenFromRequest(request);
  if (!spritesToken) {
    return NextResponse.json(
      { error: "Missing bearer token" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { sprite?: string };
  const spriteName = typeof body.sprite === "string" ? body.sprite.trim() : "";

  if (!spriteName) {
    return NextResponse.json(
      { error: "Sprite name is required" },
      { status: 400 }
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const jti = createSessionId();
  const sessionToken = await new EncryptJWT({
    sub: user.id,
    org: user.org,
    sprite: spriteName,
    sprites_token: spritesToken,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .setJti(jti)
    .encrypt(terminalSecret);

  return NextResponse.json({
    token: sessionToken,
    expiresIn: SESSION_TTL_SECONDS,
  });
}
