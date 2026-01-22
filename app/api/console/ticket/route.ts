import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // This endpoint is no longer needed - terminal connects directly to Sprites API
  // Keeping for backwards compatibility but returning error
  return NextResponse.json(
    { error: "This endpoint is deprecated. Terminal connects directly to Sprites API." },
    { status: 410 }
  );
}
