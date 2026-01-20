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

  constructor() {
    if (!process.env.SETUP_SPRITE_TOKEN) {
      throw new Error("SETUP_SPRITE_TOKEN environment variable is not set");
    }
    this.token = process.env.SETUP_SPRITE_TOKEN;
    this.org = process.env.SPRITES_ORG || "";
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

let _spritesClient: SpritesClient | null = null;

export function getSpritesClient(): SpritesClient {
  if (!_spritesClient) {
    _spritesClient = new SpritesClient();
  }
  return _spritesClient;
}
