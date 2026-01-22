"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to sign-in page for any auth path that's not explicitly handled
    router.replace("/auth/sign-in");
  }, [router]);

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Redirecting...</p>
        </div>
      </div>
    </main>
  );
}
