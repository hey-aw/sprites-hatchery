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
  
  // Deploy form state
  const [deploySpriteName, setDeploySpriteName] = useState("sprite-manager");
  const [deployUrlAuth, setDeployUrlAuth] = useState<"sprite" | "public">("sprite");
  const [deployUseExisting, setDeployUseExisting] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deploySuccess, setDeploySuccess] = useState<{
    sprite: { name: string; url: string; status: string };
    next_steps: string[];
  } | null>(null);

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

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeployLoading(true);
    setDeployError(null);
    setDeploySuccess(null);

    const token = getStoredToken();
    if (!token) {
      setDeployError("Not authenticated");
      setDeployLoading(false);
      return;
    }

    // Validate sprite name format
    if (!/^[a-z0-9-]+$/.test(deploySpriteName)) {
      setDeployError("Sprite name must contain only lowercase letters, numbers, and hyphens");
      setDeployLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sprite_name: deploySpriteName,
          sprites_token: token,
          url_auth: deployUrlAuth,
          use_existing: deployUseExisting,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Deployment failed");
      }

      setDeploySuccess(data);
      setDeploySpriteName("");
      // Refresh sprites list to show the new sprite
      await fetchSprites();
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "Deployment failed");
    } finally {
      setDeployLoading(false);
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
      </div>

      {/* Deploy Form */}
      <div className="mb-8 p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold mb-4">Deploy New Sprite Manager</h2>
        <form onSubmit={handleDeploy} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="sprite-name" className="block text-sm font-medium mb-2">
                Sprite Name
              </label>
              <input
                id="sprite-name"
                type="text"
                value={deploySpriteName}
                onChange={(e) => setDeploySpriteName(e.target.value)}
                placeholder="my-sprite-manager"
                pattern="[a-z0-9-]+"
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={deployLoading}
              />
              <p className="text-xs text-zinc-500 mt-1">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Access:
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="url-auth"
                      value="sprite"
                      checked={deployUrlAuth === "sprite"}
                      onChange={(e) => setDeployUrlAuth(e.target.value as "sprite" | "public")}
                      disabled={deployLoading || deployUseExisting}
                      className="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      Private
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="url-auth"
                      value="public"
                      checked={deployUrlAuth === "public"}
                      onChange={(e) => setDeployUrlAuth(e.target.value as "sprite" | "public")}
                      disabled={deployLoading || deployUseExisting}
                      className="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      Public (BYO Key)
                    </span>
                  </label>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deployUseExisting}
                  onChange={(e) => setDeployUseExisting(e.target.checked)}
                  disabled={deployLoading}
                  className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  Use existing sprite
                </span>
              </label>
              <button
                type="submit"
                disabled={deployLoading || !deploySpriteName}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deployLoading ? "Deploying..." : "Deploy"}
              </button>
            </div>
          </div>
          {deployUseExisting && (
            <p className="text-xs text-zinc-500">
              Access settings are unchanged for existing sprites.
            </p>
          )}
        </form>

        {deployError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{deployError}</p>
          </div>
        )}

        {deploySuccess && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              Deployment Successful!
            </h3>
            <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
              <p>
                <strong>Sprite:</strong> {deploySuccess.sprite.name}
              </p>
              <p>
                <strong>URL:</strong>{" "}
                <a
                  href={deploySuccess.sprite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  {deploySuccess.sprite.url}
                </a>
              </p>
              <p>
                <strong>Status:</strong> {deploySuccess.sprite.status}
              </p>
              {deploySuccess.next_steps && deploySuccess.next_steps.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium mb-1">Next Steps:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {deploySuccess.next_steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
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
                <p className="text-xs text-zinc-500 truncate">{sprite.url}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
