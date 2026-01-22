import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { getSpritesClient } from "@/lib/sprites-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;

  try {
    const client = await getSpritesClient(request);
    const sprite = await client.getSprite(name);
    return NextResponse.json(sprite);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get sprite" },
      { status: 500 }
    );
  }
}
