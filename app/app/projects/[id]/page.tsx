import Link from "next/link";
import { sql } from "@/lib/db";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import { notFound } from "next/navigation";

async function getProject(id: string, userId: string) {
  const [project] = await sql`
    SELECT * FROM projects
    WHERE id = ${id} AND owner_user_id = ${userId}
  `;
  return project;
}

async function getSprites(projectId: string) {
  return sql`
    SELECT * FROM sprites
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
  `;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await neonAuth();
  if (!user) {
    return null;
  }

  const { id } = await params;
  const project = await getProject(id, user.id);

  if (!project) {
    notFound();
  }

  const sprites = await getSprites(id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/app"
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4 inline-block"
        >
          ← Back to Projects
        </Link>
        <div className="flex justify-between items-center mt-4">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.repo_url && (
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                {project.repo_url}
              </p>
            )}
          </div>
          <Link
            href={`/app/projects/${id}/sprites/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Sprite
          </Link>
        </div>
      </div>

      {sprites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            No sprites yet. Create your first sprite for this project.
          </p>
          <Link
            href={`/app/projects/${id}/sprites/new`}
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Sprite
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sprites.map((sprite: any) => (
            <Link
              key={sprite.id}
              href={`/app/sprites/${sprite.sprite_name}`}
              className="block p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{sprite.sprite_name}</h2>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    sprite.status === "running"
                      ? "bg-green-500"
                      : sprite.status === "cold"
                      ? "bg-gray-500"
                      : "bg-yellow-500"
                  }`}
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-400 capitalize">
                  {sprite.status}
                </span>
              </div>
              {sprite.url && (
                <p className="text-xs text-zinc-500 truncate">{sprite.url}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
