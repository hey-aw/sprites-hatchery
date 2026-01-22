"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitToken } from "@/lib/auth/client";

export default function SignInPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await submitToken(token);
      if (result.success) {
        router.push("/app");
      } else {
        setError(result.error || "Failed to validate token");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Sprite Hatchery</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Enter your Sprites API token to continue
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Get your token from the{" "}
            <a
              href="https://sprites.dev/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Sprites.dev dashboard
            </a>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="token"
              className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300"
            >
              Sprites API Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your Sprites API token"
              required
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-600 dark:text-blue-400">
            <p className="font-medium mb-1">Privacy & Security</p>
            <p className="text-xs">
              Your token is stored locally in your browser localStorage and persists across sessions.
              It is only shared with the Sprites API server and is never stored in our database or shared with third parties.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Validating..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
