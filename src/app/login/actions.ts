"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export type SendMagicLinkResult = { ok: true } | { ok: false; error: string };

const UNKNOWN_USER_MESSAGE =
  "who r u???? Ask Anthony (antstew1161@gmail.com) for access if u want to use";

export async function sendMagicLink(
  _prev: SendMagicLinkResult | null,
  formData: FormData,
): Promise<SendMagicLinkResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    return { ok: false, error: "Enter your email address." };
  }

  // Invite-only: only emails that already have an account (created by the
  // admin's invite) may sign in. Checked here for a friendly message, and
  // backstopped by disabling public signup in the Supabase project itself.
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (!existing) {
    return { ok: false, error: UNKNOWN_USER_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.APP_BASE_URL}/auth/confirm`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
