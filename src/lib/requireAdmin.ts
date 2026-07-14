import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/getCurrentUser";

/** Redirects away unless the signed-in user is the configured admin. */
export async function requireAdmin() {
  const user = await getCurrentUser();

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!user || !adminEmail || user.email?.toLowerCase() !== adminEmail) {
    redirect("/dashboard");
  }

  return user;
}
