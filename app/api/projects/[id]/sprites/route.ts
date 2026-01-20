import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import { sql } from "@/lib/db";
import { getSpritesClient } from "@/lib/sprites-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [project] = await sql`
    SELECT * FROM projects
    WHERE id = ${id} AND owner_user_id = ${user.id}
  `;

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const { sprite_name, url_auth } = body;

  if (!sprite_name) {
    return NextResponse.json(
      { error: "Sprite name is required" },
      { status: 400 }
    );
  }

  try {
    // Create sprite via Sprites API
    const sprite = await getSpritesClient().createSprite(
      sprite_name,
      url_auth || "sprite"
    );

    // Store in database
    const [dbSprite] = await sql`
      INSERT INTO sprites (project_id, sprite_name, org, status, url)
      VALUES (${id}, ${sprite.name}, ${process.env.SPRITES_ORG || ""}, ${sprite.status}, ${sprite.url})
      RETURNING *
    `;

    return NextResponse.json(dbSprite, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create sprite" },
      { status: 500 }
    );
  }
}
