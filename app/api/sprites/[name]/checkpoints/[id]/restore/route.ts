import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import { sql } from "@/lib/db";
import { getSpritesClient } from "@/lib/sprites-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; id: string }> }
) {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, id } = await params;

  // Verify ownership
  const [sprite] = await sql`
    SELECT s.*
    FROM sprites s
    JOIN projects p ON s.project_id = p.id
    WHERE s.sprite_name = ${name} AND p.owner_user_id = ${user.id}
  `;

  if (!sprite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await getSpritesClient().restoreCheckpoint(name, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore checkpoint" },
      { status: 500 }
    );
  }
}
