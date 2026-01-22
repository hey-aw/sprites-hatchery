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
