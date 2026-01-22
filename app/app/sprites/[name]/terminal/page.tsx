import { Terminal } from "@/components/terminal";
import { getAuthUserFromHeaders } from "@/lib/auth/server";

export default async function TerminalPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const user = await getAuthUserFromHeaders();
  if (!user) {
    return null;
  }

  const { name } = await params;

  return (
    <div className="h-screen">
      <Terminal spriteName={name} />
    </div>
  );
}
