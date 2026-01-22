import { WebSocketServer, WebSocket } from "ws";
import { parse } from "url";

const PORT = parseInt(process.env.WS_PROXY_PORT || "3001", 10);
const SPRITES_WS_BASE = "wss://api.sprites.dev/v1";

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket proxy server listening on port ${PORT}`);

wss.on("connection", async (clientWs: WebSocket, req) => {
  const url = parse(req.url || "", true);
  const spriteName = url.query?.sprite as string;
  const cols = parseInt(url.query?.cols as string || "80", 10);
  const rows = parseInt(url.query?.rows as string || "24", 10);
  const token = url.query?.token as string;

  if (!spriteName) {
    clientWs.close(1008, "Missing sprite parameter");
    return;
  }

  if (!token) {
    clientWs.close(1008, "Missing token");
    return;
  }

  // Connect to Sprites exec WebSocket
  const spritesUrl = `${SPRITES_WS_BASE}/sprites/${spriteName}/exec?cmd=/bin/bash&tty=true&cols=${cols}&rows=${rows}`;
  
  const spritesWs = new WebSocket(spritesUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  spritesWs.on("open", () => {
    console.log(`Connected to Sprites exec for ${spriteName}`);
  });

  spritesWs.on("message", (data: Buffer) => {
    // Forward messages from Sprites to client
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });

  spritesWs.on("error", (error) => {
    console.error("Sprites WebSocket error:", error);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, "Sprites connection error");
    }
  });

  spritesWs.on("close", () => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
  });

  // Forward messages from client to Sprites
  clientWs.on("message", (data: Buffer) => {
    // Check if it's a JSON control message (like resize)
    try {
      const text = data.toString();
      const message = JSON.parse(text);
      if (message.type === "resize") {
        // Forward resize message to Sprites
        spritesWs.send(JSON.stringify(message));
        return;
      }
    } catch {
      // Not JSON, treat as binary data
    }

    // Forward binary data to Sprites
    if (spritesWs.readyState === WebSocket.OPEN) {
      spritesWs.send(data);
    }
  });

  clientWs.on("error", (error) => {
    console.error("Client WebSocket error:", error);
    spritesWs.close();
  });

  clientWs.on("close", () => {
    spritesWs.close();
  });
});
