import { Terminal } from "@/components/terminal";
import { sql } from "@/lib/db";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import { notFound } from "next/navigation";

async function getSprite(name: string, userId: string) {
  const [sprite] = await sql`
    SELECT s.*
    FROM sprites s
    JOIN projects p ON s.project_id = p.id
    WHERE s.sprite_name = ${name} AND p.owner_user_id = ${userId}
  `;
  return sprite;
}

export default async function TerminalPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { user } = await neonAuth();
  if (!user) {
    return null;
  }

  const { name } = await params;
  const sprite = await getSprite(name, user.id);

  if (!sprite) {
    notFound();
  }

  return (
    <div className="h-screen">
      <Terminal spriteName={name} />
    </div>
  );
}
