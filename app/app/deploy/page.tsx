"use client";

import Link from "next/link";
import { useState } from "react";
import { getStoredToken } from "@/lib/auth/client";

export default function DeployPage() {
  const [deploySpriteName, setDeploySpriteName] = useState("sprite-hatchery");
  const [deployUrlAuth, setDeployUrlAuth] = useState<"sprite" | "public">("sprite");
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployConflict, setDeployConflict] = useState(false);
  const [deployLogs, setDeployLogs] = useState<
    Array<{ step: string; stdout?: string; stderr?: string }> | null
  >(null);
  const [deployEvents, setDeployEvents] = useState<string[]>([]);
  const [deploySuccess, setDeploySuccess] = useState<{
    sprite: { name: string; url: string; status: string };
    next_steps: string[];
  } | null>(null);

  const runDeploy = async (useExisting: boolean) => {
    setDeployLoading(true);
    setDeployError(null);
    setDeploySuccess(null);
    setDeployConflict(false);
    setDeployLogs(null);
    setDeployEvents([]);

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
          "x-deploy-stream": "1",
        },
        body: JSON.stringify({
          sprite_name: deploySpriteName,
          sprites_token: token,
          url_auth: deployUrlAuth,
          use_existing: useExisting,
        }),
      });

      if (!response.body) {
        throw new Error("Deploy stream unavailable");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleEvent = (event: string, data: string) => {
        if (event === "step") {
          setDeployEvents((prev) => [...prev, data]);
          return;
        }
        if (event === "done") {
          const parsed = JSON.parse(data);
          if (parsed.logs) {
            setDeployLogs(parsed.logs);
          }
          // Ensure sprite data is available
          if (parsed.sprite) {
            setDeploySuccess(parsed);
          } else {
            // Fallback: try to construct from available data
            setDeploySuccess({
              ...parsed,
              sprite: parsed.sprite || {
                name: deploySpriteName,
                url: `https://${deploySpriteName}-hrn5.sprites.app`,
                status: "running",
              },
            });
          }
          return;
        }
        if (event === "error") {
          const parsed = JSON.parse(data);
          if (parsed.logs) {
            setDeployLogs(parsed.logs);
          }
          if (parsed.code === "SPRITE_EXISTS") {
            setDeployError(parsed.error || "Sprite already exists");
            setDeployConflict(true);
            return;
          }
          setDeployError(parsed.error || "Deployment failed");
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const lines = part.split("\n");
          const eventLine = lines.find((line) => line.startsWith("event: "));
          const dataLine = lines.find((line) => line.startsWith("data: "));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.replace("event: ", "").trim();
          const payload = dataLine.replace("data: ", "").trim();
          handleEvent(event, payload);
        }
      }
      // Don't clear the sprite name on success - allow re-deploy
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "Deployment failed");
    } finally {
      setDeployLoading(false);
    }
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    await runDeploy(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/app"
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Back to Sprites
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Deploy Sprite Hatchery</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Create your own personal sprite hatchery with sprite management and a mobile-friendly
          console. Name the sprite and we will create the sprite, clone the repo and install the
          server, and add autostart. When finished, you can log in with your authentication key
          which will be stored in your browser.
        </p>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold mb-4">Deployment Details</h2>
        <form onSubmit={handleDeploy} className="space-y-4">
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="sprite-name" className="block text-sm font-medium mb-2">
                Sprite Name
              </label>
              <input
                id="sprite-name"
                type="text"
                value={deploySpriteName}
                onChange={(e) => {
                  setDeploySpriteName(e.target.value);
                  setDeployConflict(false);
                }}
                placeholder="my-sprite-hatchery"
                pattern="[a-z0-9-]+"
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={deployLoading}
              />
              <p className="text-xs text-zinc-500 mt-1">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Access:
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="url-auth"
                    value="sprite"
                    checked={deployUrlAuth === "sprite"}
                    onChange={(e) => setDeployUrlAuth(e.target.value as "sprite" | "public")}
                    disabled={deployLoading}
                    className="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    Organization-based
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="url-auth"
                    value="public"
                    checked={deployUrlAuth === "public"}
                    onChange={(e) => setDeployUrlAuth(e.target.value as "sprite" | "public")}
                    disabled={deployLoading}
                    className="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Public</span>
                </label>
              </div>
              <p className="text-xs text-zinc-500">
                Organization-based URLs require Sprites authentication.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={deployLoading || !deploySpriteName}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deployLoading ? "Deploying..." : "Deploy"}
              </button>
            </div>
          </div>
        </form>

        {deployConflict && (
          <div className="mt-3 flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
            <span>Use the existing sprite instead?</span>
            <button
              type="button"
              onClick={() => runDeploy(true)}
              disabled={deployLoading}
              className="px-3 py-1.5 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50"
            >
              Deploy to existing
            </button>
          </div>
        )}

        {deployError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{deployError}</p>
          </div>
        )}

        {deployEvents.length > 0 && (
          <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Deployment Progress
            </p>
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
              {deployEvents.map((event, idx) => (
                <div key={`${event}-${idx}`}>{event}</div>
              ))}
            </div>
          </div>
        )}

        {deploySuccess && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3 text-lg">
              Deployment Successful!
            </h3>
            <div className="space-y-3 text-sm text-green-700 dark:text-green-300">
              {deploySuccess.sprite ? (
                <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded border border-green-200 dark:border-green-800">
                  <p className="mb-2">
                    <strong>Sprite:</strong> {deploySuccess.sprite.name}
                  </p>
                  {deploySuccess.sprite.status && (
                    <p className="mb-2">
                      <strong>Status:</strong> {deploySuccess.sprite.status}
                    </p>
                  )}
                  {deploySuccess.sprite.url && (
                    <>
                      <p className="mb-2">
                        <strong>URL:</strong>
                      </p>
                      <a
                        href={deploySuccess.sprite.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-3 py-2 bg-white dark:bg-zinc-800 rounded border border-green-300 dark:border-green-700 text-green-900 dark:text-green-100 font-mono text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors break-all"
                      >
                        {deploySuccess.sprite.url}
                      </a>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-green-800 dark:text-green-200">
                  Deployment completed successfully. Check your sprites list for the new deployment.
                </p>
              )}
              {deploySuccess.next_steps && deploySuccess.next_steps.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium mb-2">Next Steps:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {deploySuccess.next_steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800">
                <button
                  type="button"
                  onClick={() => runDeploy(true)}
                  disabled={deployLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {deployLoading ? "Re-deploying..." : "Re-deploy"}
                </button>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Re-deploy to update the sprite with the latest code and configuration.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
