import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Redirects away unless the signed-in user is the configured admin. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!user || !adminEmail || user.email?.toLowerCase() !== adminEmail) {
    redirect("/dashboard");
  }

  return user;
}
