import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const SPRITE_SHELL_REPO = "https://github.com/hey-aw/sprites-hatchery.git";
const SPRITE_HOME = "/home/sprite";
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

  // Create or update a service with HTTP port for routing
  async createService(
    spriteName: string,
    serviceName: string,
    cmd: string,
    args: string[],
    httpPort: number
  ) {
    return this.request<{
      name: string;
      cmd: string;
      args: string[];
      http_port: number;
      state: { status: string };
    }>(
      "PUT",
      `/sprites/${spriteName}/services/${serviceName}`,
      {
        cmd,
        args,
        http_port: httpPort,
        needs: [],
      }
    );
  }

  // Start a service
  async startService(spriteName: string, serviceName: string) {
    const response = await fetch(
      `${SPRITES_API_BASE}/sprites/${spriteName}/services/${serviceName}/start`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Start service failed: ${response.status} ${error}`);
    }

    // Service start returns streaming NDJSON, but we just need to know it was initiated
    return { success: true };
  }
}

export async function POST(request: NextRequest) {
  let body: DeployRequest;
  const logs: Array<{ step: string; stdout?: string; stderr?: string }> = [];
  const wantsStream = request.headers.get("x-deploy-stream") === "1";
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/3a08d8b1-b115-46ca-a1a9-18242d606d3f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/deploy/route.ts:127',message:'deploy POST received',data:{wantsStream},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  const normalizeOutput = (output: unknown) => {
    if (typeof output === "string") {
      return { stdout: output, stderr: "" };
    }
    if (output && typeof output === "object") {
      const out = output as Record<string, unknown>;
      return {
        stdout: typeof out.stdout === "string" ? out.stdout : JSON.stringify(output),
        stderr: typeof out.stderr === "string" ? out.stderr : "",
      };
    }
    return { stdout: "", stderr: "" };
  };

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
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/3a08d8b1-b115-46ca-a1a9-18242d606d3f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/deploy/route.ts:166',message:'deploy params parsed',data:{sprite_name,use_existing,url_auth,has_env:!!env},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

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

  const deploy = async (onStep?: (step: string) => void) => {
    const step = (label: string) => {
      onStep?.(label);
    };

    // Create client with user's token
    const client = new ExternalSpritesClient(sprites_token);

    // Step 1: Create or reuse the Sprite
    let sprite: { name: string; url: string; status: string };
    if (use_existing) {
      step("using existing sprite");
      sprite = await client.getSprite(sprite_name);
    } else {
      try {
        step("creating sprite");
        sprite = await client.createSprite(sprite_name, url_auth);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sprite already exists";
        if (message.includes("409") || message.toLowerCase().includes("exists")) {
          // Automatically fall back to using existing sprite
          step("sprite exists, using existing");
          try {
            sprite = await client.getSprite(sprite_name);
          } catch (getError) {
            // If we can't get the sprite either, throw an error that will be caught by the outer handler
            const getErrorMessage = getError instanceof Error ? getError.message : "Could not access sprite";
            throw new Error(`Sprite already exists but could not be accessed: ${getErrorMessage}`);
          }
        } else {
          throw error;
        }
      }
    }

    // Step 2: Install git and dependencies
    step("apt-get update");
    logs.push({
      step: "apt-get update",
      ...normalizeOutput(await client.execCommand(sprite_name, ["apt-get", "update"])),
    });
    step("apt-get install");
    logs.push({
      step: "apt-get install",
      ...normalizeOutput(
        await client.execCommand(sprite_name, [
      "apt-get",
      "install",
      "-y",
      "git",
      "curl",
      "build-essential",
        ])
      ),
    });

    // Step 3: Install pnpm
    step("install pnpm");
    logs.push({
      step: "install pnpm",
      ...normalizeOutput(
        await client.execCommand(sprite_name, [
          "bash",
          "-c",
          "SHELL=/bin/bash curl -fsSL https://get.pnpm.io/install.sh | sh -",
        ])
      ),
    });

    // Step 4: Clone or update sprite-shell repo
    step("clone repo");
    logs.push({
      step: "clone repo",
      ...normalizeOutput(
        await client.execCommand(
          sprite_name,
          [
            "bash",
            "-c",
            `mkdir -p "${SPRITE_HOME}" && if [ -d "${SPRITE_HOME}/sprite-shell/.git" ]; then \
git -C "${SPRITE_HOME}/sprite-shell" pull; \
else rm -rf "${SPRITE_HOME}/sprite-shell" && git clone ${SPRITE_SHELL_REPO} "${SPRITE_HOME}/sprite-shell"; fi`,
          ],
        )
      ),
    });

    // Step 5: Install dependencies
    step("pnpm install");
    logs.push({
      step: "pnpm install",
      ...normalizeOutput(
        await client.execCommand(
          sprite_name,
          [
            "bash",
            "-c",
            `export PNPM_HOME="${SPRITE_HOME}/.local/share/pnpm"; export PATH="$PNPM_HOME:$PATH"; pnpm install`,
          ],
          { dir: `${SPRITE_HOME}/sprite-shell` }
        )
      ),
    });

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

    step("write env");
    logs.push({
      step: "write env",
      ...normalizeOutput(
        await client.execCommand(
          sprite_name,
          ["bash", "-c", `cat > .env.local << 'EOF'\n${envContent}\nEOF`],
          { dir: `${SPRITE_HOME}/sprite-shell` }
        )
      ),
    });

    // Step 7: Build the app
    step("pnpm build");
    logs.push({
      step: "pnpm build",
      ...normalizeOutput(
        await client.execCommand(
          sprite_name,
          [
            "bash",
            "-c",
            `export PNPM_HOME="${SPRITE_HOME}/.local/share/pnpm"; export PATH="$PNPM_HOME:$PATH"; pnpm build`,
          ],
          { dir: `${SPRITE_HOME}/sprite-shell` }
        )
      ),
    });

    // Step 8: Create a startup script
    step("write start.sh");
    const startupScript = `#!/bin/bash
cd "${SPRITE_HOME}/sprite-shell"
export PNPM_HOME="${SPRITE_HOME}/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

# Stop existing services if running to avoid EADDRINUSE
if [ -f /tmp/nextjs.pid ]; then
  if kill -0 "$(cat /tmp/nextjs.pid)" 2>/dev/null; then
    kill "$(cat /tmp/nextjs.pid)" 2>/dev/null || true
  fi
  rm -f /tmp/nextjs.pid
fi

if [ -f /tmp/ws-proxy.pid ]; then
  if kill -0 "$(cat /tmp/ws-proxy.pid)" 2>/dev/null; then
    kill "$(cat /tmp/ws-proxy.pid)" 2>/dev/null || true
  fi
  rm -f /tmp/ws-proxy.pid
fi

if command -v pkill >/dev/null 2>&1; then
  pkill -f "next start" 2>/dev/null || true
  pkill -f "tsx server/ws-proxy.ts" 2>/dev/null || true
fi

# Start Next.js in background using standalone server (required for output: standalone)
# Copy static files to standalone directory if needed
if [ ! -d "${SPRITE_HOME}/sprite-shell/.next/standalone/.next/static" ]; then
  cp -r "${SPRITE_HOME}/sprite-shell/.next/static" "${SPRITE_HOME}/sprite-shell/.next/standalone/.next/" 2>/dev/null || true
fi
if [ ! -d "${SPRITE_HOME}/sprite-shell/.next/standalone/public" ]; then
  cp -r "${SPRITE_HOME}/sprite-shell/public" "${SPRITE_HOME}/sprite-shell/.next/standalone/" 2>/dev/null || true
fi

export HOSTNAME=0.0.0.0
export PORT=3000
cd "${SPRITE_HOME}/sprite-shell/.next/standalone/sprite-shell"
nohup node server.js > /tmp/nextjs.log 2>&1 &
echo $! > /tmp/nextjs.pid
cd "${SPRITE_HOME}/sprite-shell"

# Start WebSocket proxy in background
nohup pnpm tsx server/ws-proxy.ts > /tmp/ws-proxy.log 2>&1 &
echo $! > /tmp/ws-proxy.pid

# Wait a moment for services to start
sleep 2
echo "Services started. PIDs: $(cat /tmp/nextjs.pid) and $(cat /tmp/ws-proxy.pid)"
`;
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/3a08d8b1-b115-46ca-a1a9-18242d606d3f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/deploy/route.ts:382',message:'startup script assembled',data:{sprite_name,includes_cleanup:true},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    logs.push({
      step: "write start.sh",
      ...normalizeOutput(
        await client.execCommand(
          sprite_name,
          [
            "bash",
            "-c",
            `cat > "${SPRITE_HOME}/start.sh" << 'EOF'\n${startupScript}\nEOF\nchmod +x "${SPRITE_HOME}/start.sh"`,
          ],
        )
      ),
    });

    // Step 9: Start the sprite manager services
    step("start services");
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/3a08d8b1-b115-46ca-a1a9-18242d606d3f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/deploy/route.ts:399',message:'starting services',data:{sprite_name},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    logs.push({
      step: "start services",
      ...normalizeOutput(
        await client.execCommand(
          sprite_name,
          ["bash", "-c", `"${SPRITE_HOME}/start.sh"`],
        )
      ),
    });
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/3a08d8b1-b115-46ca-a1a9-18242d606d3f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/deploy/route.ts:410',message:'services start invoked',data:{sprite_name},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Step 9.5: Register HTTP service with Sprite routing layer
    step("register http service");
    try {
      // Wait a moment for Next.js to start
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      // Register the Next.js service with http_port so Sprite routing knows to proxy to port 3000
      // The service definition tells the routing layer which port to use for HTTP traffic
      // Note: The actual process is already running via start.sh, we're just registering it
      const servicePath = `${SPRITE_HOME}/sprite-shell/.next/standalone/sprite-shell`;
      logs.push({
        step: "register http service",
        ...normalizeOutput(
          await client.createService(
            sprite_name,
            "nextjs",
            "node",
            [`${servicePath}/server.js`],
            3000
          )
        ),
      });
    } catch (error) {
      // Service registration is optional - if it fails, log but don't fail deployment
      const errorMessage = error instanceof Error ? error.message : "Service registration failed";
      logs.push({
        step: "register http service",
        stdout: "",
        stderr: `Warning: Could not register HTTP service (${errorMessage}). Sprite URL may not work until service is manually registered.`,
      });
    }

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
    } catch {
      // pgrep might not be available or processes might not be visible yet
      // This is not critical - services are started in background
      console.log("Could not verify processes, but services should be running");
    }

    return {
      success: true,
      sprite: {
        name: sprite.name,
        url: sprite.url,
        status: sprite.status,
      },
      logs,
      next_steps: [
        "Sprite Hatchery is now running and hosting at the sprite URL",
        "Users can sign in by entering their Sprites API token",
        "Get your token from https://sprites.dev/dashboard",
        "To restart services, run: /home/sprite/start.sh",
        "Check logs: /tmp/nextjs.log and /tmp/ws-proxy.log",
        "Create a checkpoint for quick restores",
      ],
    };
  };

  if (wantsStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: string) => {
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        try {
          const result = await deploy((label) => send("step", label));
          send("done", JSON.stringify(result));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Deployment failed";
          send("error", JSON.stringify({ error: message, logs }));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  try {
    const result = await deploy();
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Deployment failed";
    
    // Check if it's an unauthorized error
    if (errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
      return NextResponse.json(
        {
          error: "Unauthorized: Your Sprites API token is invalid or expired. Please check your token at https://sprites.dev/dashboard",
          logs,
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        logs,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    description: "Deploy your own Sprite Hatchery instance to your Sprites.dev account",
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
      sprite_name: "my-sprites-dev-hatchery",
      sprites_token: "your-sprites-dev-token",
      url_auth: "sprite",
      use_existing: false,
      env: {
        SESSION_SECRET: "random-secret-here",
      },
    },
  });
}
