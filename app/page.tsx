import { redirect } from "next/navigation";
import { getAuthUserFromHeaders } from "@/lib/auth/server";

export default async function Home() {
  const user = await getAuthUserFromHeaders();
  
  // Always redirect - authenticated users go to app, others to sign-in
  redirect(user ? "/app" : "/auth/sign-in");
}
