"use client";

import React from "react";

interface MobileKeyBarProps {
  onKeyPress: (code: string, modifiers?: { ctrl?: boolean; alt?: boolean }) => void;
  onPaste?: () => void;
}

type MobileKey =
  | { label: string; code: string; modifier?: false }
  | { label: string; modifier: true; key: "ctrl" | "alt" }
  | { label: string; action: "paste" };

const MOBILE_KEYS: MobileKey[] = [
  { label: "Esc", code: "\x1b" },
  { label: "Tab", code: "\t" },
  { label: "Ctrl", modifier: true, key: "ctrl" },
  { label: "Alt", modifier: true, key: "alt" },
  { label: "↑", code: "\x1b[A" },
  { label: "↓", code: "\x1b[B" },
  { label: "←", code: "\x1b[D" },
  { label: "→", code: "\x1b[C" },
  { label: "Paste", action: "paste" },
];

export function MobileKeyBar({ onKeyPress, onPaste }: MobileKeyBarProps) {
  const [modifiers, setModifiers] = React.useState<{
    ctrl?: boolean;
    alt?: boolean;
  }>({});

  const handleKeyClick = (key: MobileKey) => {
    if ("modifier" in key && key.modifier) {
      setModifiers((prev) => ({
        ...prev,
        [key.key]: !prev[key.key],
      }));
    } else if ("action" in key && key.action === "paste") {
      onPaste?.();
    } else if ("code" in key) {
      onKeyPress(key.code, modifiers);
    }
  };

  return (
    <div className="flex-shrink-0 bg-zinc-900 border-t border-zinc-700 p-2 pb-[max(8px,env(safe-area-inset-bottom))]">
      <div className="flex gap-2 flex-wrap justify-center">
        {MOBILE_KEYS.map((key, idx) => (
          <button
            key={idx}
            onClick={() => handleKeyClick(key)}
            className={`px-3 py-2 rounded text-sm font-mono ${
              "modifier" in key && key.modifier && modifiers[key.key]
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
