# Sprite Manager

A self-hosted Next.js application for managing Sprites with mobile-friendly ui to create Sprites and run cli tools (Claude Code, Gemini CLI, CODEX CLI), and manage checkpoints.

## Features

- **Authentication**: Neon Auth with GitHub OAuth provider
- **Project Management**: Create and manage projects with repository URLs
- **Sprite Management**: Create, initialize, and manage Sprites via Sprites API
- **Terminal Access**: In-browser terminal with mobile-friendly key bar
- **Checkpoints**: Create and restore checkpoints for fast resets

## Setup

### Prerequisites

1. A Neon account with a project (this app creates its own project)
2. A Sprites.dev account with an organization token
3. A GitHub OAuth App (for authentication)

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Neon Auth (from Neon Console after enabling Auth)
NEON_AUTH_BASE_URL=https://ep-xxx.neon.tech/neondb/auth

# Neon Postgres
DATABASE_URL=postgresql://...

# Sprites API
SETUP_SPRITE_TOKEN=...
SETUP_SPRITE_ORG=your-org-slug

# WebSocket Relay
WS_RELAY_PORT=3001
WS_TICKET_SECRET=... # Random secret for signing WebSocket tickets
```

### Database Setup

The database schema is automatically created when you first run the app. The tables include:

- `projects` - User projects
- `sprites` - Sprites associated with projects
- `checkpoints` - Checkpoint cache for UI display

### GitHub OAuth Setup

1. Create a GitHub OAuth App at https://github.com/settings/developers
2. Set the callback URL to: `https://<your-sprite-name>.sprites.app/auth/oauth/github`
3. Configure the credentials in Neon Console: Project > Auth > OAuth Providers > GitHub

## Development

```bash
# Install dependencies
pnpm install

# Run Next.js dev server
pnpm dev

# Run WebSocket relay server (in another terminal)
pnpm dev:relay

# Or run both together
pnpm dev:all
```

## Production

```bash
# Build Next.js app
pnpm build

# Start Next.js app
pnpm start

# Start WebSocket relay (in another process)
pnpm start:relay

# Or run both together
pnpm start:all
```

## Architecture

- **Next.js App** (port 3000): Main application with API routes
- **WebSocket Relay** (port 3001): Bridges browser WebSocket connections to Sprites exec WebSocket
- **Neon Postgres**: Stores projects, sprites, and checkpoint metadata
- **Neon Auth**: Handles authentication and user sessions
- **Sprites API**: Creates and manages Sprites, checkpoints, and exec sessions

## Running in a Sprite

This app is designed to run inside its own control-plane Sprite. The Sprite will:

- Serve the Next.js app at `https://<sprite-name>.sprites.app`
- Proxy both ports 3000 (Next.js) and 3001 (WebSocket relay)
- Keep the Sprite active while users are connected

## License

MIT
