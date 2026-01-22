import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { getSpritesClient } from "@/lib/sprites-client";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getSpritesClient(request);
    const sprites = await client.listSprites();
    return NextResponse.json(sprites);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list sprites" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, url_auth } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Sprite name is required" },
      { status: 400 }
    );
  }

  try {
    const client = await getSpritesClient(request);
    const sprite = await client.createSprite(name, url_auth || "sprite");
    return NextResponse.json(sprite, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create sprite" },
      { status: 500 }
    );
  }
}
