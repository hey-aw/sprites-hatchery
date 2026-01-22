import Link from "next/link";
import { getAuthUserFromHeaders } from "@/lib/auth/server";
import { SpriteDetail } from "./sprite-detail";

export default async function SpritePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const user = await getAuthUserFromHeaders();
  if (!user) {
    return null;
  }

  const { name } = await params;
  return <SpriteDetail spriteName={name} />;
}
