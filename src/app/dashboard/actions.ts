"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { THRESHOLD_PRESETS } from "@/lib/matchThreshold";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setMatchThreshold(value: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const allowed = THRESHOLD_PRESETS.some((preset) => preset.value === value);
  if (!allowed) {
    return { ok: false as const, error: "Pick Broad, Balanced, or Strict." };
  }

  await db
    .update(userSettings)
    .set({ matchThreshold: value, updatedAt: new Date() })
    .where(eq(userSettings.userId, user.id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}
