import { getAuthUserFromHeaders } from "@/lib/auth/server";
import { SpritesList } from "./sprites-list";

export default async function DashboardPage() {
  const user = await getAuthUserFromHeaders();
  if (!user) {
    return null;
  }

  return <SpritesList org={user.org} />;
}
