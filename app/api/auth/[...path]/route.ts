// Auth routes are handled by specific route files:
// - /api/auth/token - POST to validate and store token, GET to retrieve token
// - /api/auth/signout - Sign out
// - /api/auth/user - Get current user

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
