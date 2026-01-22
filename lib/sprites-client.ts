const SPRITES_API_BASE = "https://api.sprites.dev/v1";

interface Sprite {
  id: string;
  name: string;
  url: string;
  status: string;
  created_at: string;
}

interface Checkpoint {
  id: string;
  create_time: string;
  comment?: string;
}

interface ExecResponse {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export class SpritesClient {
  private token: string;
  private org: string;

  constructor(token?: string, org?: string) {
    // If token is provided, use it; otherwise try to get from session
    if (token) {
      this.token = token;
      this.org = org || "";
    } else {
      // Fallback to env var for backward compatibility (e.g., deploy route)
      if (!process.env.SETUP_SPRITE_TOKEN) {
        throw new Error("Token must be provided or SETUP_SPRITE_TOKEN must be set");
      }
      this.token = process.env.SETUP_SPRITE_TOKEN;
      this.org = process.env.SPRITES_ORG || "";
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${SPRITES_API_BASE}${path}`;
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sprites API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  async createSprite(
    name: string,
    urlAuth: "sprite" | "public" = "sprite"
  ): Promise<Sprite> {
    return this.request<Sprite>("POST", "/sprites", {
      name,
      url_settings: {
        auth: urlAuth,
      },
    });
  }

  async listSprites(): Promise<Sprite[]> {
    return this.request<Sprite[]>("GET", "/sprites");
  }

  async getSprite(name: string): Promise<Sprite> {
    return this.request<Sprite>("GET", `/sprites/${name}`);
  }

  async deleteSprite(name: string): Promise<void> {
    await this.request<void>("DELETE", `/sprites/${name}`);
  }

  async createCheckpoint(
    spriteName: string,
    comment?: string
  ): Promise<{ checkpoint_id: string }> {
    // The checkpoint endpoint returns NDJSON stream
    const url = `${SPRITES_API_BASE}/sprites/${spriteName}/checkpoint`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sprites API error: ${response.status} ${error}`);
    }

    // Parse NDJSON stream
    const text = await response.text();
    const lines = text.trim().split("\n");
    let checkpointId: string | undefined;

    for (const line of lines) {
      if (!line) continue;
      const data = JSON.parse(line);
      if (data.type === "complete") {
        // Extract checkpoint ID from message like "Checkpoint v8 created"
        const match = data.data?.match(/Checkpoint\s+(v\d+)/);
        if (match) {
          checkpointId = match[1];
        }
      }
    }

    if (!checkpointId) {
      throw new Error("Failed to extract checkpoint ID from response");
    }

    return { checkpoint_id: checkpointId };
  }

  async listCheckpoints(spriteName: string): Promise<Checkpoint[]> {
    return this.request<Checkpoint[]>(
      "GET",
      `/sprites/${spriteName}/checkpoints`
    );
  }

  async restoreCheckpoint(
    spriteName: string,
    checkpointId: string
  ): Promise<void> {
    // Restore endpoint returns NDJSON stream
    const url = `${SPRITES_API_BASE}/sprites/${spriteName}/checkpoints/${checkpointId}/restore`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sprites API error: ${response.status} ${error}`);
    }

    // Consume the stream
    await response.text();
  }

  async execCommand(
    spriteName: string,
    cmd: string[],
    options?: {
      stdin?: string;
      env?: Record<string, string>;
      dir?: string;
    }
  ): Promise<ExecResponse> {
    const params = new URLSearchParams();
    cmd.forEach((c) => params.append("cmd", c));
    if (options?.dir) {
      params.append("dir", options.dir);
    }
    if (options?.stdin !== undefined) {
      params.append("stdin", "true");
    }
    if (options?.env) {
      Object.entries(options.env).forEach(([key, value]) => {
        params.append("env", `${key}=${value}`);
      });
    }

    const url = `${SPRITES_API_BASE}/sprites/${spriteName}/exec?${params.toString()}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/octet-stream",
      },
      body: options?.stdin,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sprites API error: ${response.status} ${error}`);
    }

    return response.json();
  }
}

/**
 * Get a SpritesClient instance using the token from the request
 * This should be used in API routes where we have access to the request
 */
export async function getSpritesClient(request: { headers: { get: (name: string) => string | null } }): Promise<SpritesClient> {
  // Extract token from request headers
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Not authenticated - missing token in Authorization header");
  }
  
  const token = authHeader.substring(7);
  
  // Get org by validating token
  const { validateToken } = await import("./auth/token-auth");
  const validation = await validateToken(token);
  if (!validation.valid) {
    throw new Error("Invalid token");
  }
  
  return new SpritesClient(token, validation.org || "");
}

/**
 * Get a SpritesClient for server components
 * Server components should use API routes instead, but this helper can be used
 * if you have the token available (e.g., from a cookie or env var)
 */
export async function getSpritesClientForServer(token?: string): Promise<SpritesClient | null> {
  if (!token) {
    // Try to get from session - but session doesn't have full token
    // Server components should use API routes instead
    return null;
  }
  
  const { validateToken } = await import("./auth/token-auth");
  const validation = await validateToken(token);
  if (!validation.valid) {
    return null;
  }
  
  return new SpritesClient(token, validation.org || "");
}

/**
 * Get a SpritesClient instance using a provided token
 * Useful for external operations or when token is already available
 */
export function createSpritesClient(token: string, org?: string): SpritesClient {
  return new SpritesClient(token, org);
}
