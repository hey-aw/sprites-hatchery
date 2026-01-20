import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await sql`
    SELECT * FROM projects
    WHERE owner_user_id = ${user.id}
    ORDER BY created_at DESC
  `;

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, repo_url, default_branch } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  const [project] = await sql`
    INSERT INTO projects (owner_user_id, name, repo_url, default_branch)
    VALUES (${user.id}, ${name}, ${repo_url || null}, ${default_branch || "main"})
    RETURNING *
  `;

  return NextResponse.json(project, { status: 201 });
}
