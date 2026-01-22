"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") || "Authentication failed";

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-900 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-600">Authentication Error</h1>
          <p className="text-zinc-600 dark:text-zinc-400">{message}</p>
        </div>
        <Link
          href="/auth/sign-in"
          className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </Link>
      </div>
    </main>
  );
}
