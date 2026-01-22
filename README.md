# Sprite Manager

A self-hosted Next.js application for managing Sprites with mobile-friendly ui to create Sprites and run cli tools (Claude Code, Gemini CLI, CODEX CLI), and manage checkpoints.

## Features

- **Authentication**: Bring Your Own Key (BYO Key) - users enter their Sprites API token directly
- **Project Management**: Create and manage projects with repository URLs
- **Sprite Management**: Create, initialize, and manage Sprites via Sprites API
- **Terminal Access**: In-browser terminal with mobile-friendly key bar
- **Checkpoints**: Create and restore checkpoints for fast resets
- **No Database Required**: Uses Sprites API directly - no database setup needed!

## Setup

### Prerequisites

1. A Sprites.dev account
2. A Sprites API token (get it from [sprites.dev/dashboard](https://sprites.dev/dashboard))

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Session secret (generate a random string)
SESSION_SECRET=your-random-secret

# Sprites API (for server-side operations, optional)
SETUP_SPRITE_TOKEN=your-sprites-token
SETUP_SPRITE_ORG=your-org-slug

# WebSocket Proxy (optional - defaults to 3001)
WS_PROXY_PORT=3001
```

**Note**: Users will enter their own Sprites API token when signing in. The `SETUP_SPRITE_TOKEN` is only needed for server-side operations like the deploy API.

## Local Development & Testing

### Prerequisites

1. **Sprites API Token**: Get from [sprites.dev/dashboard](https://sprites.dev/dashboard)

### Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Create .env.local file
cat > .env.local << EOF
SESSION_SECRET=$(openssl rand -hex 32)
WS_PROXY_PORT=3001
EOF

# 3. Start both servers (Next.js + WebSocket proxy)
pnpm dev:all
```

This will start:
- **Next.js dev server** on `http://localhost:3000`
- **WebSocket proxy** on `ws://localhost:3001`

### Manual Start (Separate Terminals)

If you prefer to run servers separately:

```bash
# Terminal 1: Next.js dev server
pnpm dev

# Terminal 2: WebSocket proxy
pnpm dev:proxy
```

### Testing the App

1. **Open the app**: Visit `http://localhost:3000`
2. **Sign in**: Enter your Sprites API token (from [sprites.dev/dashboard](https://sprites.dev/dashboard))
3. **Create a project**: Click "New Project" and add a project
4. **Create a sprite**: Add a sprite to your project
5. **Open terminal**: Click on a sprite to open the in-browser terminal

### Troubleshooting

**WebSocket proxy not connecting?**
- Check that port 3001 is available: `lsof -i :3001`
- Verify `WS_PROXY_PORT=3001` in `.env.local`
- Check browser console for WebSocket errors

**Token validation fails?**
- Ensure your Sprites API token is valid
- Token should start with `spr_` or similar
- Get a fresh token from [sprites.dev/dashboard](https://sprites.dev/dashboard)

## Production

```bash
# Build Next.js app
pnpm build

# Start Next.js app
pnpm start

# Start WebSocket proxy (in another process)
pnpm tsx server/ws-proxy.ts
```

## Architecture

- **Next.js App** (port 3000): Main application with API routes
- **WebSocket Proxy** (port 3001): Bridges browser WebSocket connections to Sprites exec API with user's token
- **BYO Key Auth**: Users enter their Sprites API token directly - no OAuth setup needed
- **Sprites API**: Creates and manages Sprites, checkpoints, and exec sessions - all data stored in Sprites
- **Organization-based**: Sprites are organized by organization (from your Sprites API token)

## Deploy to a Sprite

This app is designed to run inside its own control-plane Sprite, which simplifies deployment since both the Next.js app and WebSocket relay can run together.

### One-Click API Deploy

Anyone with a [Sprites.dev](https://sprites.dev) account can deploy their own instance:

```bash
curl -X POST https://sprite-shell.sprites.app/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "sprite_name": "my-sprite-manager",
    "sprites_token": "YOUR_SPRITES_DEV_TOKEN"
  }'
```

This will:

1. Create a new Sprite in **your** Sprites.dev account
2. Clone and install sprite-shell
3. Build the Next.js app
4. Return your Sprite URL and next steps

**No external dependencies needed!** All data is stored in Sprites, and users authenticate by entering their Sprites API token.

Get your `sprites_token` from the [Sprites.dev dashboard](https://sprites.dev). View API docs at `GET /api/deploy`.

### Manual Deploy

1. **Create a Sprite** at [sprites.dev](https://sprites.dev) or via the API

2. **Clone the repository** inside your Sprite:

   ```bash
   git clone https://github.com/hey-aw/sprite-shell.git
   cd sprite-shell
   ```

3. **Install dependencies**:

   ```bash
   pnpm install
   ```

4. **Configure environment** - create `.env.local`:

   ```env
   SESSION_SECRET=your-random-secret
   SETUP_SPRITE_TOKEN=your-org-token
   SETUP_SPRITE_ORG=your-org-slug
   ```

5. **Build and start**:

   ```bash
   pnpm build
   pnpm start
   # In another terminal:
   pnpm tsx server/ws-proxy.ts
   ```

7. **Configure Sprite ports** - expose both ports in your Sprite config:
   - Port 3000 → Next.js app (main traffic)
   - Port 3001 → WebSocket proxy (terminal connections)

### Why Deploy to a Sprite?

- **Single deployment**: Next.js and WebSocket proxy run together
- **Persistent process**: Long-running WebSocket connections are supported
- **Custom domain**: Access via `https://<sprite-name>.sprites.app`
- **Self-managed**: Full control over the runtime environment
- **Zero external dependencies**: Everything runs in the Fly.io ecosystem
- **No database needed**: All data is stored in Sprites API

### Authentication

Users sign in by entering their Sprites API token:

1. Get your token from the [Sprites.dev dashboard](https://sprites.dev/dashboard)
2. Visit the app and enter your token on the sign-in page
3. The token is validated and stored in a session cookie
4. All Sprites API calls use your token automatically

**Privacy & Security**: Your token is stored locally in your browser's localStorage and persists across sessions. It is only shared with the Sprites API server and is never stored in our database or shared with third parties.

**No OAuth setup required!** Users just need their Sprites API token.

## License

MIT
