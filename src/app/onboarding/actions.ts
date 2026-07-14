"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { persistSettings, type PersistSettingsResult } from "@/lib/persistSettings";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(formData: FormData): Promise<PersistSettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const result = await persistSettings(user.id, formData);
  if (!result.ok) return result;

  await db
    .update(userSettings)
    .set({ onboardedAt: new Date() })
    .where(eq(userSettings.userId, user.id));

  return result;
}
