import Link from "next/link";
import { sql } from "@/lib/db";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";

async function getProjects(userId: string) {
  return sql`
    SELECT p.*, COUNT(s.id) as sprite_count
    FROM projects p
    LEFT JOIN sprites s ON s.project_id = p.id
    WHERE p.owner_user_id = ${userId}
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
}

export default async function DashboardPage() {
  const { user } = await neonAuth();
  if (!user) {
    return null;
  }

  const projects = await getProjects(user.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Link
          href="/app/projects/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            No projects yet. Create your first project to get started.
          </p>
          <Link
            href="/app/projects/new"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <Link
              key={project.id}
              href={`/app/projects/${project.id}`}
              className="block p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{project.name}</h2>
              {project.repo_url && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 truncate">
                  {project.repo_url}
                </p>
              )}
              <p className="text-sm text-zinc-500">
                {project.sprite_count || 0} sprite{project.sprite_count !== 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
