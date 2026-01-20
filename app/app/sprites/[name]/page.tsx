import Link from "next/link";
import { sql } from "@/lib/db";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import { notFound } from "next/navigation";
import { SpriteActions } from "@/components/sprite-actions";

async function getSprite(name: string, userId: string) {
  const [sprite] = await sql`
    SELECT s.*, p.name as project_name, p.id as project_id
    FROM sprites s
    JOIN projects p ON s.project_id = p.id
    WHERE s.sprite_name = ${name} AND p.owner_user_id = ${userId}
  `;
  return sprite;
}

async function getCheckpoints(spriteName: string) {
  return sql`
    SELECT * FROM checkpoints
    WHERE sprite_name = ${spriteName}
    ORDER BY created_at DESC
  `;
}

export default async function SpritePage({
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

  const checkpoints = await getCheckpoints(name);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href={`/app/projects/${(sprite as any).project_id}`}
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4 inline-block"
        >
          ← Back to Project
        </Link>
        <div className="flex justify-between items-center mt-4">
          <div>
            <h1 className="text-3xl font-bold">{(sprite as any).sprite_name}</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Project: {(sprite as any).project_name}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <SpriteActions spriteName={name} checkpoints={checkpoints as any[]} />
        </div>

        {checkpoints.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Checkpoints</h2>
            <div className="space-y-2">
              {checkpoints.map((cp: any) => (
                <div
                  key={cp.id}
                  className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded"
                >
                  <div>
                    <span className="font-mono text-sm">{cp.checkpoint_id}</span>
                    {cp.label && (
                      <span className="ml-2 text-xs text-zinc-500">
                        ({cp.label})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(cp.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
