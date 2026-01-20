"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SpriteActionsProps {
  spriteName: string;
  checkpoints: Array<{ checkpoint_id: string; label?: string }>;
}

export function SpriteActions({ spriteName, checkpoints }: SpriteActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: string, data?: any) => {
    setLoading(action);
    setError(null);

    try {
      let endpoint = "";
      let method = "POST";

      switch (action) {
        case "init":
          endpoint = `/api/sprites/${spriteName}/init`;
          break;
        case "checkpoint":
          endpoint = `/api/sprites/${spriteName}/checkpoints`;
          break;
        case "restore":
          endpoint = `/api/sprites/${spriteName}/checkpoints/${data.checkpointId}/restore`;
          break;
        default:
          return;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Action failed");
      }

      if (action === "restore" || action === "checkpoint") {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  };

  const cleanCheckpoint = checkpoints.find((cp) => cp.label === "clean");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => router.push(`/app/sprites/${spriteName}/terminal`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Open Terminal
        </button>
        <button
          onClick={() => handleAction("init", { clone_repo: true })}
          disabled={loading === "init"}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading === "init" ? "Initializing..." : "Initialize & Clone Repo"}
        </button>
        <button
          onClick={() => handleAction("checkpoint", { label: "clean" })}
          disabled={loading === "checkpoint"}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {loading === "checkpoint" ? "Creating..." : "Create Clean Checkpoint"}
        </button>
        {cleanCheckpoint && (
          <button
            onClick={() => handleAction("restore", { checkpointId: cleanCheckpoint.checkpoint_id })}
            disabled={loading === "restore"}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {loading === "restore" ? "Restoring..." : "Start Clean"}
          </button>
        )}
      </div>
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
