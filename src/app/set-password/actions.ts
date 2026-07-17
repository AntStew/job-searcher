"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SetPasswordResult = { ok: false; error: string } | null;

export async function setPassword(
  _prev: SetPasswordResult,
  formData: FormData,
): Promise<SetPasswordResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { ok: false, error: "Pick a password with at least 8 characters." };
  }
  if (password !== confirm) {
    return { ok: false, error: "Those two passwords don't match — try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Setup links expire quickly; send them back for a fresh one.
    redirect("/login");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, error: error.message };
  }

  redirect("/dashboard");
}
