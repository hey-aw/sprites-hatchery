import { WebSocketServer, WebSocket } from "ws";
import { verifyTicket } from "../lib/ticket";

const PORT = parseInt(process.env.WS_RELAY_PORT || "3001", 10);
const SETUP_SPRITE_TOKEN = process.env.SETUP_SPRITE_TOKEN;
const SPRITES_WS_BASE = "wss://api.sprites.dev/v1";

if (!SETUP_SPRITE_TOKEN) {
  console.error("SETUP_SPRITE_TOKEN environment variable is required");
  process.exit(1);
}

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket relay server listening on port ${PORT}`);

wss.on("connection", async (clientWs: WebSocket, req) => {
  const url = new URL(req.url || "", `http://localhost:${PORT}`);
  const ticketParam = url.searchParams.get("ticket");

  if (!ticketParam) {
    clientWs.close(1008, "Missing ticket parameter");
    return;
  }

  let ticket;
  try {
    ticket = await verifyTicket(ticketParam);
  } catch (error) {
    clientWs.close(1008, "Invalid ticket");
    return;
  }

  const { spriteName, sessionId, cols, rows } = ticket;

  // Connect to Sprites exec WebSocket
  const spritesUrl = sessionId
    ? `${SPRITES_WS_BASE}/sprites/${spriteName}/exec/${sessionId}`
    : `${SPRITES_WS_BASE}/sprites/${spriteName}/exec?cmd=/bin/bash&tty=true&cols=${cols}&rows=${rows}`;

  const spritesWs = new WebSocket(spritesUrl, {
    headers: {
      Authorization: `Bearer ${SETUP_SPRITE_TOKEN}`,
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
