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

  // Use fixed positioning to escape the layout and fill the viewport
  // The Terminal component handles visual viewport tracking for soft keyboard
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <Terminal spriteName={name} />
    </div>
  );
}
