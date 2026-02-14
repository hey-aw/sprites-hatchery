import { WebSocketServer, WebSocket } from "ws";
import { parse } from "url";
import { jwtDecrypt, JWTPayload } from "jose";

const PORT = parseInt(process.env.WS_PROXY_PORT || "3001", 10);
const SPRITES_WS_BASE = "wss://api.sprites.dev/v1";
const TERMINAL_SESSION_SECRET =
  process.env.TERMINAL_SESSION_SECRET ||
  process.env.SESSION_SECRET ||
  "change-me-in-production";
const terminalSecret = new TextEncoder().encode(TERMINAL_SESSION_SECRET.padEnd(32, "0").slice(0, 32));

const usedSessionTokens = new Map<string, number>();

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket proxy server listening on port ${PORT}`);

function cleanupUsedSessions() {
  const now = Date.now();
  for (const [jti, expiresAt] of usedSessionTokens.entries()) {
    if (expiresAt <= now) {
      usedSessionTokens.delete(jti);
    }
  }
}

function closeWithPolicyViolation(clientWs: WebSocket, reason: string) {
  clientWs.close(1008, reason);
}

interface TerminalSessionClaims extends JWTPayload {
  sprite?: string;
  sprites_token?: string;
}

async function verifyTerminalSessionToken(token: string): Promise<{
  valid: boolean;
  reason?: string;
  payload?: TerminalSessionClaims;
}> {
  cleanupUsedSessions();

  try {
    const { payload } = await jwtDecrypt(token, terminalSecret, {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });

    const claims = payload as TerminalSessionClaims;
    if (!claims.jti || typeof claims.jti !== "string") {
      return { valid: false, reason: "Session token missing id" };
    }

    if (usedSessionTokens.has(claims.jti)) {
      return { valid: false, reason: "Session token already used" };
    }

    if (!claims.sprite || typeof claims.sprite !== "string") {
      return { valid: false, reason: "Session token missing sprite" };
    }

    if (!claims.sprites_token || typeof claims.sprites_token !== "string") {
      return { valid: false, reason: "Session token missing auth" };
    }

    const expMs = typeof claims.exp === "number" ? claims.exp * 1000 : Date.now() + 60_000;
    usedSessionTokens.set(claims.jti, expMs);

    return { valid: true, payload: claims };
  } catch {
    return { valid: false, reason: "Invalid or expired session token" };
  }
}

wss.on("connection", async (clientWs: WebSocket, req) => {
  const url = parse(req.url || "", true);
  const spriteName = url.query?.sprite as string;
  const cols = parseInt((url.query?.cols as string) || "80", 10);
  const rows = parseInt((url.query?.rows as string) || "24", 10);
  const sessionToken = url.query?.session as string;

  if (!spriteName) {
    closeWithPolicyViolation(clientWs, "Missing sprite parameter");
    return;
  }

  if (!sessionToken) {
    closeWithPolicyViolation(clientWs, "Missing terminal session token");
    return;
  }

  const validation = await verifyTerminalSessionToken(sessionToken);
  if (!validation.valid || !validation.payload) {
    closeWithPolicyViolation(clientWs, validation.reason || "Invalid terminal session token");
    return;
  }

  if (validation.payload.sprite !== spriteName) {
    closeWithPolicyViolation(clientWs, "Session token sprite mismatch");
    return;
  }

  const spritesBearerToken = validation.payload.sprites_token;

  const spritesUrl = `${SPRITES_WS_BASE}/sprites/${spriteName}/exec?cmd=/bin/bash&tty=true&cols=${cols}&rows=${rows}`;

  const spritesWs = new WebSocket(spritesUrl, {
    headers: {
      Authorization: `Bearer ${spritesBearerToken}`,
    },
  });

  spritesWs.on("open", () => {
    console.log(`Connected to Sprites exec for sprite=${spriteName}`);
  });

  spritesWs.on("message", (data: Buffer) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });

  spritesWs.on("error", (error) => {
    console.error(`Sprites WebSocket error for sprite=${spriteName}:`, error.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, "Sprites connection error");
    }
  });

  spritesWs.on("close", (code, reason) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code || 1000, reason.toString() || "Sprites connection closed");
    }
  });

  clientWs.on("message", (data: Buffer) => {
    try {
      const text = data.toString();
      const message = JSON.parse(text);
      if (message.type === "resize") {
        spritesWs.send(JSON.stringify(message));
        return;
      }
    } catch {
      // Non-control data; forward as-is.
    }

    if (spritesWs.readyState === WebSocket.OPEN) {
      spritesWs.send(data);
    }
  });

  clientWs.on("error", (error) => {
    console.error(`Client WebSocket error for sprite=${spriteName}:`, error.message);
    spritesWs.close();
  });

  clientWs.on("close", () => {
    spritesWs.close();
  });
});
