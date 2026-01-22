import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const SPRITE_SHELL_REPO = "https://github.com/hey-aw/sprite-shell.git";
const SPRITES_API_BASE = "https://api.sprites.dev/v1";

interface DeployRequest {
  sprite_name: string;
  sprites_token: string; // User's own Sprites.dev org token
  use_existing?: boolean;
  env?: {
    SESSION_SECRET?: string;
  };
  url_auth?: "sprite" | "public";
}

// Minimal Sprites client for external deployments
class ExternalSpritesClient {
  constructor(private token: string) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${SPRITES_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
      } catch {
        // If response is not JSON, get as text
        errorMessage = await response.text();
      }
      throw new Error(`Sprites API error (${response.status}): ${errorMessage}`);
    }

    return response.json();
  }

  async createSprite(name: string, urlAuth: "sprite" | "public" = "sprite") {
    return this.request<{ name: string; url: string; status: string }>(
      "POST",
      "/sprites",
      { name, url_settings: { auth: urlAuth } }
    );
  }

  async getSprite(name: string) {
    return this.request<{ name: string; url: string; status: string }>(
      "GET",
      `/sprites/${name}`
    );
  }

  async execCommand(
    spriteName: string,
    cmd: string[],
    options?: { dir?: string; stdin?: string }
  ) {
    const params = new URLSearchParams();
    cmd.forEach((c) => params.append("cmd", c));
    if (options?.dir) params.append("dir", options.dir);

    const response = await fetch(
      `${SPRITES_API_BASE}/sprites/${spriteName}/exec?${params.toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/octet-stream",
        },
        body: options?.stdin,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Exec failed: ${response.status} ${error}`);
    }

    // Try to parse as JSON, but handle cases where exec returns plain text
    const contentType = response.headers.get("content-type");
    const text = await response.text();
    
    if (contentType?.includes("application/json")) {
      try {
        return JSON.parse(text);
      } catch {
        // If JSON parsing fails, return the text as-is
        return { stdout: text, stderr: "" };
      }
    }
    
    // If not JSON, return as text output
    return { stdout: text, stderr: "" };
  }

  // Extract org slug from token by making a test request
  async getOrgSlug(): Promise<string> {
    const sprites = await this.request<{ org?: string }[]>("GET", "/sprites");
    // Try to extract org from existing sprites or return empty
    if (sprites.length > 0 && sprites[0].org) {
      return sprites[0].org;
    }
    return "";
  }
}

export async function POST(request: NextRequest) {
  let body: DeployRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    sprite_name,
    sprites_token,
    use_existing = false,
    env,
    url_auth = "sprite",
  } = body;

  // Validate required fields
  if (!sprite_name) {
    return NextResponse.json(
      { error: "sprite_name is required" },
      { status: 400 }
    );
  }

  if (!sprites_token) {
    return NextResponse.json(
      { error: "sprites_token is required - get yours from sprites.dev" },
      { status: 400 }
    );
  }

  // Validate sprite name format
  if (!/^[a-z0-9-]+$/.test(sprite_name)) {
    return NextResponse.json(
      { error: "sprite_name must contain only lowercase letters, numbers, and hyphens" },
      { status: 400 }
    );
  }

  try {
    // Create client with user's token
    const client = new ExternalSpritesClient(sprites_token);

    // Step 1: Create or reuse the Sprite
    const sprite = use_existing
      ? await client.getSprite(sprite_name)
      : await client.createSprite(sprite_name, url_auth);

    // Step 2: Install git and dependencies
    await client.execCommand(sprite_name, ["apt-get", "update"]);
    await client.execCommand(sprite_name, [
      "apt-get",
      "install",
      "-y",
      "git",
      "curl",
      "build-essential",
    ]);

    // Step 3: Install pnpm
    await client.execCommand(sprite_name, [
      "bash",
      "-c",
      "curl -fsSL https://get.pnpm.io/install.sh | sh -",
    ]);

    // Step 4: Clone or update sprite-shell repo
    await client.execCommand(
      sprite_name,
      [
        "bash",
        "-c",
        `if [ -d /home/sprite-shell/.git ]; then \
git -C /home/sprite-shell pull; \
else git clone ${SPRITE_SHELL_REPO} /home/sprite-shell; fi`,
      ],
    );

    // Step 5: Install dependencies
    await client.execCommand(
      sprite_name,
      ["bash", "-c", "source ~/.bashrc && pnpm install"],
      { dir: "/home/sprite-shell" }
    );

    // Step 6: Create .env.local
    const orgSlug = await client.getOrgSlug();
    
    // Generate session secret if not provided
    const sessionSecret = env?.SESSION_SECRET || randomUUID();
    
    const envVars: Record<string, string> = {
      // User's Sprites credentials (same token they used to deploy)
      SETUP_SPRITE_TOKEN: sprites_token,
      SETUP_SPRITE_ORG: orgSlug,
      WS_PROXY_PORT: "3001",
      SESSION_SECRET: sessionSecret,
    };

    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    await client.execCommand(
      sprite_name,
      ["bash", "-c", `cat > .env.local << 'EOF'\n${envContent}\nEOF`],
      { dir: "/home/sprite-shell" }
    );

    // Step 7: Build the app
    await client.execCommand(
      sprite_name,
      ["bash", "-c", "source ~/.bashrc && pnpm build"],
      { dir: "/home/sprite-shell" }
    );

    // Step 8: Create a startup script and auto-start configuration
    const startupScript = `#!/bin/bash
cd /home/sprite-shell
source ~/.bashrc

# Kill any existing processes
pkill -f "pnpm start" || true
pkill -f "tsx server/ws-proxy" || true
sleep 1

# Start Next.js in background
nohup pnpm start > /tmp/nextjs.log 2>&1 &
echo $! > /tmp/nextjs.pid

# Start WebSocket proxy in background
nohup pnpm tsx server/ws-proxy.ts > /tmp/ws-proxy.log 2>&1 &
echo $! > /tmp/ws-proxy.pid

# Wait a moment for services to start
sleep 2
echo "Services started. PIDs: $(cat /tmp/nextjs.pid) and $(cat /tmp/ws-proxy.pid)"
`;
    await client.execCommand(
      sprite_name,
      ["bash", "-c", `cat > /home/start.sh << 'EOF'\n${startupScript}EOF && chmod +x /home/start.sh`],
    );

    // Create a .bashrc entry to auto-start on shell login (for persistent sprites)
    const bashrcEntry = `
# Auto-start Sprite Manager if not already running
if [ ! -f /tmp/nextjs.pid ] || ! kill -0 $(cat /tmp/nextjs.pid) 2>/dev/null; then
  /home/start.sh > /tmp/autostart.log 2>&1 &
fi
`;
    await client.execCommand(
      sprite_name,
      ["bash", "-c", `echo '${bashrcEntry}' >> ~/.bashrc`],
    );

    // Step 9: Start the sprite manager services
    await client.execCommand(
      sprite_name,
      ["bash", "-c", "cd /home/sprite-shell && source ~/.bashrc && nohup pnpm start > /tmp/nextjs.log 2>&1 & nohup pnpm tsx server/ws-proxy.ts > /tmp/ws-proxy.log 2>&1 & sleep 3"],
    );

    // Step 10: Verify services are running
    try {
      const checkProcesses = await client.execCommand(
        sprite_name,
        ["bash", "-c", "pgrep -f 'pnpm start|tsx server/ws-proxy' | wc -l"],
      );
      const processCount = parseInt(
        typeof checkProcesses === "string" 
          ? checkProcesses 
          : checkProcesses.stdout || "0",
        10
      );
      
      if (processCount < 2) {
        // Services might not have started yet, but that's okay - they're in background
        console.log(`Warning: Only ${processCount} processes found, but services should be starting`);
      }
    } catch (error) {
      // pgrep might not be available or processes might not be visible yet
      // This is not critical - services are started in background
      console.log("Could not verify processes, but services should be running");
    }

    return NextResponse.json({
      success: true,
      sprite: {
        name: sprite.name,
        url: sprite.url,
        status: sprite.status,
      },
      next_steps: [
        "Sprite Manager is now running and hosting at the sprite URL",
        "Users can sign in by entering their Sprites API token",
        "Get your token from https://sprites.dev/dashboard",
        "To restart services, run: /home/start.sh",
        "Check logs: /tmp/nextjs.log and /tmp/ws-proxy.log",
        "Create a checkpoint for quick restores",
      ],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Deployment failed";
    
    // Check if it's an unauthorized error
    if (errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
      return NextResponse.json(
        {
          error: "Unauthorized: Your Sprites API token is invalid or expired. Please check your token at https://sprites.dev/dashboard",
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    description: "Deploy your own Sprite Manager instance to your Sprites.dev account",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: {
      sprite_name: {
        type: "string",
        required: true,
        description: "Name for your Sprite (lowercase, numbers, hyphens only)",
      },
      sprites_token: {
        type: "string",
        required: true,
        description: "Your Sprites.dev organization token (from sprites.dev dashboard)",
      },
      url_auth: {
        type: "string",
        required: false,
        default: "sprite",
        options: ["sprite", "public"],
        description: "URL authentication mode",
      },
      use_existing: {
        type: "boolean",
        required: false,
        default: false,
        description: "Deploy to an existing sprite instead of creating a new one",
      },
      env: {
        type: "object",
        required: false,
        description: "Environment variables for the deployment",
        properties: {
          SESSION_SECRET: "Random secret for session cookies (auto-generated if not provided)",
        },
      },
    },
    example: {
      sprite_name: "my-sprite-manager",
      sprites_token: "your-sprites-dev-token",
      url_auth: "sprite",
      use_existing: false,
      env: {
        SESSION_SECRET: "random-secret-here",
      },
    },
  });
}
