"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { jobPreferences, userProfiles, userSettings } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

const settingsSchema = z.object({
  resumeText: z.string().max(20000),
  desiredRoles: z.string().max(2000),
  locations: z.string().max(2000),
  remotePreference: z.enum(["remote", "hybrid", "onsite", "no_preference"]),
  salaryMin: z.string().optional(),
  industries: z.string().max(2000),
  mustHaves: z.string().max(4000),
  dealbreakers: z.string().max(4000),
  watchTargets: z.string().max(2000),
  matchThreshold: z.coerce.number().int().min(0).max(100),
  emailFrequency: z.enum(["daily", "every_3_days", "weekly", "paused"]),
});

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export type SaveSettingsResult = { ok: true } | { ok: false; error: string };

export async function saveSettings(
  _prev: SaveSettingsResult | null,
  formData: FormData,
): Promise<SaveSettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const parsed = settingsSchema.safeParse({
    resumeText: formData.get("resumeText") ?? "",
    desiredRoles: formData.get("desiredRoles") ?? "",
    locations: formData.get("locations") ?? "",
    remotePreference: formData.get("remotePreference") ?? "no_preference",
    salaryMin: formData.get("salaryMin") ?? "",
    industries: formData.get("industries") ?? "",
    mustHaves: formData.get("mustHaves") ?? "",
    dealbreakers: formData.get("dealbreakers") ?? "",
    watchTargets: formData.get("watchTargets") ?? "",
    matchThreshold: formData.get("matchThreshold") ?? "60",
    emailFrequency: formData.get("emailFrequency") ?? "weekly",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const data = parsed.data;
  const salaryMin = data.salaryMin ? Number.parseInt(data.salaryMin, 10) : null;

  await db.transaction(async (tx) => {
    await tx
      .update(userProfiles)
      .set({ resumeText: data.resumeText, resumeUpdatedAt: new Date() })
      .where(eq(userProfiles.userId, user.id));

    await tx
      .update(jobPreferences)
      .set({
        desiredRoles: splitList(data.desiredRoles),
        locations: splitList(data.locations),
        remotePreference: data.remotePreference,
        salaryMin: Number.isFinite(salaryMin) ? salaryMin : null,
        industries: splitList(data.industries),
        mustHaves: data.mustHaves,
        dealbreakers: data.dealbreakers,
        watchTargets: splitList(data.watchTargets),
        updatedAt: new Date(),
      })
      .where(eq(jobPreferences.userId, user.id));

    await tx
      .update(userSettings)
      .set({
        matchThreshold: data.matchThreshold,
        emailFrequency: data.emailFrequency,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, user.id));
  });

  revalidatePath("/dashboard/settings");
  return { ok: true };
}
