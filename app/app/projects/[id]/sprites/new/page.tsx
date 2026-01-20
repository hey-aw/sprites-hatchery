"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewSpritePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setProjectId(p.id));
  }, [params]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!projectId) return;

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      sprite_name: formData.get("sprite_name") as string,
      url_auth: formData.get("url_auth") as "sprite" | "public",
    };

    try {
      const response = await fetch(`/api/projects/${projectId}/sprites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create sprite");
      }

      const sprite = await response.json();
      router.push(`/app/sprites/${sprite.sprite_name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sprite");
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Create Sprite</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="sprite_name"
            className="block text-sm font-medium mb-2"
          >
            Sprite Name *
          </label>
          <input
            type="text"
            id="sprite_name"
            name="sprite_name"
            required
            pattern="[a-z0-9-]+"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Lowercase letters, numbers, and hyphens only
          </p>
        </div>

        <div>
          <label
            htmlFor="url_auth"
            className="block text-sm font-medium mb-2"
          >
            URL Authentication
          </label>
          <select
            id="url_auth"
            name="url_auth"
            defaultValue="sprite"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900"
          >
            <option value="sprite">Sprite Auth (default)</option>
            <option value="public">Public</option>
          </select>
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Sprite"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
