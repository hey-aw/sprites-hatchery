"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/auth/client";

export function SpritesList({ org }: { org: string }) {
  const router = useRouter();
  const [sprites, setSprites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createUrlAuth, setCreateUrlAuth] = useState<"sprite" | "public">("sprite");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const fetchSprites = async () => {
    const token = getStoredToken();
    if (!token) {
      // Check if there's a valid session via API
      try {
        const userResponse = await fetch("/api/auth/user");
        if (userResponse.ok) {
          // User has a session but no token in localStorage - redirect to sign-in
          router.push("/auth/sign-in");
          return;
        }
      } catch {
        // API call failed, continue to redirect
      }
      // No session either - redirect to sign-in
      router.push("/auth/sign-in");
      return;
    }

    try {
      const response = await fetch("/api/sprites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid, redirect to sign-in
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to load sprites");
      }

      const data = await response.json();
      const spritesData = Array.isArray(data) ? data : data?.sprites;
      if (!Array.isArray(spritesData)) {
        throw new Error("Invalid sprites payload");
      }
      setSprites(spritesData);
      setLoading(false);
    } catch (err) {
      // Only set error if we're not redirecting
      if (err instanceof Error && !err.message.includes("redirect")) {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSprites();
  }, [router]);

  const handleCreateSprite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);

    const token = getStoredToken();
    if (!token) {
      router.push("/auth/sign-in");
      setCreateLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/sprites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createName,
          url_auth: createUrlAuth,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error(payload?.error || "Failed to create sprite");
      }

      const sprite = payload;
      if (sprite?.name) {
        setSprites((prev) => {
          const withoutDuplicate = prev.filter((existing) => existing.name !== sprite.name);
          return [sprite, ...withoutDuplicate];
        });
      }

      const createdName = sprite?.name || createName;
      setCreateSuccess(`Created ${createdName}. Redirecting...`);
      router.refresh();
      router.push(`/app/sprites/${createdName}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create sprite");
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400">Loading sprites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Sprites</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Organization: {org}</p>
        </div>
        <Link
          href="/app/deploy"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Deploy Sprite Hatchery
        </Link>
      </div>

      <div className="mb-8 p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold mb-4">Create Sprite</h2>
        <form onSubmit={handleCreateSprite} className="space-y-4">
          <div>
            <label htmlFor="create-sprite-name" className="block text-sm font-medium mb-2">
              Sprite Name
            </label>
            <input
              id="create-sprite-name"
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="my-sprite"
              pattern="[a-z0-9-]+"
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={createLoading}
              spellCheck={false}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div>
            <label htmlFor="create-url-auth" className="block text-sm font-medium mb-2">
              URL Auth (optional)
            </label>
            <select
              id="create-url-auth"
              value={createUrlAuth}
              onChange={(e) => setCreateUrlAuth(e.target.value as "sprite" | "public")}
              disabled={createLoading}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sprite">sprite</option>
              <option value="public">public</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={createLoading || !createName}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createLoading ? "Creating..." : "Create Sprite"}
            </button>
          </div>
        </form>

        {createError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {createError}
          </div>
        )}

        {createSuccess && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
            {createSuccess}
          </div>
        )}
      </div>

      {sprites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            No sprites yet. Create your first sprite to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sprites.map((sprite: any) => (
            <Link
              key={sprite.name}
              href={`/app/sprites/${sprite.name}`}
              className="block p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{sprite.name}</h2>
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
                <p className="text-sm text-zinc-600 dark:text-zinc-400 capitalize">
                  {sprite.status}
                </p>
              </div>
              {sprite.url && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    window.open(sprite.url, "_blank", "noopener,noreferrer");
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block cursor-pointer"
                >
                  {sprite.url}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
