import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import { sql } from "@/lib/db";
import { signTicket } from "@/lib/ticket";

export async function POST(request: NextRequest) {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sprite_name, session_id, cols, rows } = body;

  if (!sprite_name) {
    return NextResponse.json(
      { error: "sprite_name is required" },
      { status: 400 }
    );
  }

  // Verify ownership
  const [sprite] = await sql`
    SELECT s.*
    FROM sprites s
    JOIN projects p ON s.project_id = p.id
    WHERE s.sprite_name = ${sprite_name} AND p.owner_user_id = ${user.id}
  `;

  if (!sprite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ticket = await signTicket({
    spriteName: sprite_name,
    sessionId: session_id,
    cols: cols || 80,
    rows: rows || 24,
  });

  return NextResponse.json({ ticket });
}
