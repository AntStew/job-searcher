"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export type LoginResult = { ok: true; sentSetupLink?: boolean } | { ok: false; error: string };

const UNKNOWN_USER_MESSAGE =
  "who r u???? Ask Anthony (antstew1161@gmail.com) for access if u want to use";

/**
 * Invite-only: only emails that already have an account (created by the
 * admin's invite) may sign in. Checked here for a friendly message, and
 * backstopped by disabling public signup in the Supabase project itself.
 */
async function isInvited(email: string): Promise<boolean> {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  return !!existing;
}

function cleanEmail(formData: FormData): string {
  return String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
}

export async function signInWithPassword(
  _prev: LoginResult | null,
  formData: FormData,
): Promise<LoginResult> {
  const email = cleanEmail(formData);
  const password = String(formData.get("password") ?? "");

  if (!email) return { ok: false, error: "Enter your email address." };
  if (!password) return { ok: false, error: "Enter your password." };
  if (!(await isInvited(email))) return { ok: false, error: UNKNOWN_USER_MESSAGE };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      ok: false,
      error:
        error.message === "Invalid login credentials"
          ? "Wrong email or password. Never set a password? Use the link below to make one."
          : error.message,
    };
  }

  redirect("/dashboard");
}

/**
 * Emails a one-time link that lands the user on /set-password. Doubles as
 * first-time password setup (accounts created by invite have no password)
 * and forgot-password recovery.
 */
export async function sendPasswordSetupLink(
  _prev: LoginResult | null,
  formData: FormData,
): Promise<LoginResult> {
  const email = cleanEmail(formData);

  if (!email) return { ok: false, error: "Enter your email address first." };
  if (!(await isInvited(email))) return { ok: false, error: UNKNOWN_USER_MESSAGE };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.APP_BASE_URL}/auth/confirm?next=/set-password`,
  });

  if (error) return { ok: false, error: error.message };

  return { ok: true, sentSetupLink: true };
}
