import { redirect } from "next/navigation";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";

export default async function Home() {
  const { user } = await neonAuth();
  if (user) {
    redirect("/app");
  } else {
    redirect("/auth/sign-in");
  }
}
