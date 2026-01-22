import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { getSpritesClient } from "@/lib/sprites-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, id } = await params;

  try {
    const client = await getSpritesClient(request);
    await client.restoreCheckpoint(name, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore checkpoint" },
      { status: 500 }
    );
  }
}
