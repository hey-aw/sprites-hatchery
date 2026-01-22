import { redirect } from "next/navigation";

export default async function AccountPage() {
  // Redirect to app - account management can be done via Fly.io dashboard
  redirect("/app");
}
