"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/client";
import { SpriteActions } from "@/components/sprite-actions";

export function SpriteDetail({ spriteName }: { spriteName: string }) {
  const [sprite, setSprite] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const token = getStoredToken();
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      try {
        // Fetch sprite
        const spriteResponse = await fetch(`/api/sprites/${spriteName}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!spriteResponse.ok) {
          if (spriteResponse.status === 404) {
            setError("Sprite not found");
          } else {
            throw new Error("Failed to load sprite");
          }
          setLoading(false);
          return;
        }

        const spriteData = await spriteResponse.json();
        setSprite(spriteData);

        // Fetch checkpoints
        try {
          const checkpointsResponse = await fetch(
            `/api/sprites/${spriteName}/checkpoints`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (checkpointsResponse.ok) {
            const checkpointsData = await checkpointsResponse.json();
            setCheckpoints(checkpointsData);
          }
        } catch (err) {
          // Checkpoints might fail, but we can still show the sprite
          console.error("Failed to load checkpoints:", err);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sprite");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [spriteName]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400">Loading sprite...</p>
        </div>
      </div>
    );
  }

  if (error || !sprite) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">
            {error || "Sprite not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/app"
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4 inline-block"
        >
          ← Back to Sprites
        </Link>
        <div className="flex justify-between items-center mt-4">
          <div>
            <h1 className="text-3xl font-bold">{sprite.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  sprite.status === "running"
                    ? "bg-green-500"
                    : sprite.status === "cold"
                    ? "bg-gray-500"
                    : "bg-yellow-500"
                }`}
              />
              <p className="text-zinc-600 dark:text-zinc-400 capitalize">
                {sprite.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <SpriteActions spriteName={spriteName} checkpoints={checkpoints} />
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
                    <span className="font-mono text-sm">{cp.id}</span>
                    {cp.comment && (
                      <span className="ml-2 text-xs text-zinc-500">
                        ({cp.comment})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(cp.create_time).toLocaleDateString()}
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
