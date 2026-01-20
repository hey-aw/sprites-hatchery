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
    const checkpoints = await getSpritesClient().listCheckpoints(name);
    return NextResponse.json(checkpoints);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list checkpoints" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;

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

  const body = await request.json();
  const { label, comment } = body;

  try {
    const result = await getSpritesClient().createCheckpoint(
      name,
      comment || `Checkpoint: ${label || "manual"}`
    );

    // Cache in database
    await sql`
      INSERT INTO checkpoints (sprite_name, checkpoint_id, label)
      VALUES (${name}, ${result.checkpoint_id}, ${label || null})
      ON CONFLICT (sprite_name, checkpoint_id) DO UPDATE
      SET label = COALESCE(${label || null}, checkpoints.label)
    `;

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkpoint" },
      { status: 500 }
    );
  }
}
