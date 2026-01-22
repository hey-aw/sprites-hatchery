import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { getSpritesClient } from "@/lib/sprites-client";

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
  const { clone_repo, repo_url } = body;

  try {
    const client = await getSpritesClient(request);
    // Install common dev tools
    await client.execCommand(name, ["apt-get", "update"]);
    await client.execCommand(name, [
      "apt-get",
      "install",
      "-y",
      "git",
      "curl",
      "build-essential",
    ]);

    // Clone repo if provided
    if (clone_repo && repo_url) {
      await client.execCommand(name, [
        "git",
        "clone",
        repo_url,
        ".",
      ], {
        dir: "/home",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Init failed" },
      { status: 500 }
    );
  }
}
