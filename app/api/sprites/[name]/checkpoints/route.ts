import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { getSpritesClient } from "@/lib/sprites-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;

  try {
    const client = await getSpritesClient(request);
    const checkpoints = await client.listCheckpoints(name);
    return NextResponse.json(checkpoints);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list checkpoints" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;
  const body = await request.json();
  const { comment } = body;

  try {
    const client = await getSpritesClient(request);
    const result = await client.createCheckpoint(
      name,
      comment || "Checkpoint: manual"
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkpoint" },
      { status: 500 }
    );
  }
}
