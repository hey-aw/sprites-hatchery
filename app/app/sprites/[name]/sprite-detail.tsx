"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth/client";
import { SpriteActions } from "@/components/sprite-actions";


interface SpriteDetailData {
  name: string;
  status: string;
}

interface SpriteCheckpoint {
  id: string;
  create_time: string;
  comment?: string;
}
interface SshInfo {
  available: boolean;
  host?: string;
  username?: string;
  port?: number;
  message?: string;
}

function CopyableCommand({
  label,
  command,
}: {
  label: string;
  command: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="flex gap-2 items-center">
        <code className="block flex-1 p-3 bg-zinc-100 dark:bg-zinc-800 rounded text-sm overflow-x-auto">
          {command}
        </code>
        <button
          onClick={copy}
          className="px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function SpriteDetail({ spriteName }: { spriteName: string }) {
  const [sprite, setSprite] = useState<SpriteDetailData | null>(null);
  const [checkpoints, setCheckpoints] = useState<SpriteCheckpoint[]>([]);
  const [sshInfo, setSshInfo] = useState<SshInfo | null>(null);
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

        try {
          const sshResponse = await fetch(`/api/sprites/${spriteName}/ssh`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (sshResponse.ok) {
            const sshData = await sshResponse.json();
            setSshInfo(sshData);
          }
        } catch (err) {
          console.error("Failed to load SSH info:", err);
        }

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

  const hasSsh =
    sshInfo?.available && sshInfo.host && sshInfo.username && sshInfo.port;
  const sshCommand = hasSsh
    ? `ssh ${sshInfo.username}@${sshInfo.host} -p ${sshInfo.port}`
    : null;

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
          <h2 className="text-xl font-semibold mb-2">SSH from Terminal app</h2>
          {sshCommand ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Prefer native SSH for the best keyboard and keychain integration.
              </p>
              <CopyableCommand label="macOS Terminal" command={sshCommand} />
              <div className="space-y-2">
                <CopyableCommand
                  label="iOS Prompt"
                  command={sshCommand}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  In Prompt, add your private key under Keys first, then create a
                  host entry with this same hostname, username, and port.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {sshInfo?.message ||
                  "SSH details are unavailable. Initialize sprite first, then refresh."}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <SpriteActions spriteName={spriteName} checkpoints={checkpoints} />
        </div>

        {checkpoints.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Checkpoints</h2>
            <div className="space-y-2">
              {checkpoints.map((cp) => (
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
