"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { MobileKeyBar } from "./mobile-keybar";

interface TerminalProps {
  spriteName: string;
  onClose?: () => void;
}

export function Terminal({ spriteName, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    if (!terminalRef.current || !terminalInstanceRef.current) return;

    try {
      const term = terminalInstanceRef.current;
      const fitAddon = fitAddonRef.current;
      if (!fitAddon) return;

      fitAddon.fit();
      const cols = term.cols;
      const rows = term.rows;

      // Get token from localStorage
      const { getStoredToken } = await import("@/lib/auth/client");
      const token = getStoredToken();
      
      if (!token) {
        throw new Error("Not authenticated - please sign in");
      }

      // Connect via our proxy endpoint with token
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = process.env.NEXT_PUBLIC_WS_PROXY_PORT || "3001";
      const wsUrl = `${protocol}//${host}:${port}?sprite=${encodeURIComponent(spriteName)}&cols=${cols}&rows=${rows}&token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log("WebSocket connected");
      };

      // Helper to check if data is a JSON control message
      const isControlMessage = (text: string): boolean => {
        try {
          const msg = JSON.parse(text);
          if (msg.type === "session_info") {
            console.log("Session info:", msg);
            // Send resize after session established
            const cols = term.cols;
            const rows = term.rows;
            if (cols > 0 && rows > 0) {
              ws.send(JSON.stringify({ type: "resize", cols, rows }));
            }
            return true;
          }
          if (msg.error) {
            console.error("Session error:", msg.error);
            return true;
          }
        } catch {
          // Not JSON
        }
        return false;
      };

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          if (!isControlMessage(event.data)) {
            term.write(event.data);
          }
        } else if (event.data instanceof Blob) {
          event.data.arrayBuffer().then((buf) => {
            const text = new TextDecoder().decode(buf);
            // Check if it looks like JSON (starts with {)
            if (text.startsWith("{") && isControlMessage(text)) {
              return;
            }
            term.write(new Uint8Array(buf));
          });
        } else {
          const buf = new Uint8Array(event.data);
          const text = new TextDecoder().decode(buf);
          if (text.startsWith("{") && isControlMessage(text)) {
            return;
          }
          term.write(buf);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setError("Connection error");
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt to reconnect after a delay
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      wsRef.current = ws;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace",
      theme: {
        background: "#000000",
        foreground: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    terminalInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initial fit
    fitAddon.fit();

    // Connect
    connect();

    // Handle resize
    const handleResize = () => {
      if (fitAddon && term && wsRef.current?.readyState === WebSocket.OPEN) {
        fitAddon.fit();
        const cols = term.cols;
        const rows = term.rows;
        wsRef.current.send(
          JSON.stringify({
            type: "resize",
            cols,
            rows,
          })
        );
      }
    };

    window.addEventListener("resize", handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      term.dispose();
    };
  }, [spriteName]);

  const handleKeyPress = (code: string, modifiers?: { ctrl?: boolean; alt?: boolean }) => {
    if (!terminalInstanceRef.current || !wsRef.current) return;

    let data = code;
    if (modifiers?.ctrl) {
      // Apply Ctrl modifier (subtract 64 from char code for Ctrl+key)
      if (code.length === 1) {
        const charCode = code.charCodeAt(0);
        data = String.fromCharCode(charCode & 0x1f);
      }
    }
    if (modifiers?.alt) {
      // Alt modifier handling
      data = "\x1b" + data;
    }

    wsRef.current.send(data);
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="flex items-center justify-between p-2 bg-zinc-900 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-zinc-300">{spriteName}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded"
          >
            Close
          </button>
        )}
      </div>
      {error && (
        <div className="p-2 bg-red-900 text-red-100 text-sm">{error}</div>
      )}
      <div
        ref={terminalRef}
        className="flex-1"
        style={{ paddingBottom: "80px" }}
      />
      <MobileKeyBar onKeyPress={handleKeyPress} />
    </div>
  );
}
