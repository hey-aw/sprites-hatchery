import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import { sql } from "@/lib/db";
import { getSpritesClient } from "@/lib/sprites-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;

  // Check ownership via project
  const [sprite] = await sql`
    SELECT s.*, p.owner_user_id
    FROM sprites s
    JOIN projects p ON s.project_id = p.id
    WHERE s.sprite_name = ${name} AND p.owner_user_id = ${user.id}
  `;

  if (!sprite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch latest status from Sprites API
  try {
    const apiSprite = await getSpritesClient().getSprite(name);
    return NextResponse.json({
      ...sprite,
      status: apiSprite.status,
      url: apiSprite.url,
    });
  } catch (error) {
    return NextResponse.json(sprite);
  }
}
