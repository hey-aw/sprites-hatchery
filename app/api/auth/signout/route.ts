import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  // Clear session cookie
  const cookieStore = await cookies();
  cookieStore.delete("sprites_session");
  return NextResponse.json({ success: true });
}
