import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import { sql } from "@/lib/db";

export async function GET(
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const [project] = await sql`
    UPDATE projects
    SET 
      name = COALESCE(${body.name}, name),
      repo_url = COALESCE(${body.repo_url}, repo_url),
      default_branch = COALESCE(${body.default_branch}, default_branch),
      updated_at = now()
    WHERE id = ${id} AND owner_user_id = ${user.id}
    RETURNING *
  `;

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await sql`
    DELETE FROM projects
    WHERE id = ${id} AND owner_user_id = ${user.id}
  `;

  return NextResponse.json({ success: true });
}
