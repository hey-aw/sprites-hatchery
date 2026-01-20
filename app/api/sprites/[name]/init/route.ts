import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import { sql } from "@/lib/db";
import { getSpritesClient } from "@/lib/sprites-client";

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
    SELECT s.*, p.repo_url, p.default_branch
    FROM sprites s
    JOIN projects p ON s.project_id = p.id
    WHERE s.sprite_name = ${name} AND p.owner_user_id = ${user.id}
  `;

  if (!sprite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { clone_repo } = body;

  try {
    const client = getSpritesClient();
    // Install common dev tools
    await client.execCommand(name, ["apt-get", "update"]);
    await client.execCommand(name, [
      "apt-get",
      "install",
      "-y",
      "git",
      "curl",
      "build-essential",
    ]);

    // Clone repo if provided
    if (clone_repo && sprite.repo_url) {
      await client.execCommand(name, [
        "git",
        "clone",
        sprite.repo_url,
        ".",
      ], {
        dir: "/home",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Init failed" },
      { status: 500 }
    );
  }
}
