"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/requireAdmin";

export type InviteResult = { ok: true } | { ok: false; error: string };

export async function inviteUser(
  _prev: InviteResult | null,
  formData: FormData,
): Promise<InviteResult> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    return { ok: false, error: "Enter an email address." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.APP_BASE_URL}/auth/confirm`,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function setAdminLock(userId: string, locked: boolean) {
  await requireAdmin();

  await db
    .update(userSettings)
    .set(
      locked
        ? { adminLocked: true, emailFrequency: "paused" }
        : { adminLocked: false },
    )
    .where(eq(userSettings.userId, userId));

  revalidatePath("/admin");
}
